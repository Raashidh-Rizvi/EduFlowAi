using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Events;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

public class GamificationService : IGamificationService
{
    private readonly ApplicationDbContext _dbContext;

    public GamificationService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ChallengeResultDto> AwardXpAsync(
        Guid studentId, 
        XpSourceType sourceType, 
        Guid sourceId, 
        int xpAmount, 
        string description, 
        CancellationToken ct = default)
    {
        if (xpAmount <= 0)
        {
            throw new ArgumentException("XP amount must be strictly positive.", nameof(xpAmount));
        }

        // 1. Record immutable transaction
        var transaction = new XpTransaction
        {
            StudentId = studentId,
            SourceType = sourceType,
            SourceId = sourceId,
            XpAmount = xpAmount,
            Description = description
        };
        await _dbContext.XpTransactions.AddAsync(transaction, ct);

        // 2. Fetch or create StudentXp aggregate cache
        var studentXp = await _dbContext.StudentXp.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        if (studentXp == null)
        {
            studentXp = new StudentXp
            {
                StudentId = studentId,
                TotalXp = 0,
                CurrentLevel = 1,
                Coins = 0
            };
            await _dbContext.StudentXp.AddAsync(studentXp, ct);
        }

        var oldLevel = studentXp.CurrentLevel;
        studentXp.TotalXp += xpAmount;
        var newLevel = CalculateLevel(studentXp.TotalXp);
        bool levelUp = newLevel > oldLevel;

        int bonusCoins = 0;
        if (levelUp)
        {
            studentXp.CurrentLevel = newLevel;
            bonusCoins = newLevel * 50;
            studentXp.Coins += bonusCoins;
        }

        // Award base coins for activities (e.g. 1 coin per 5 XP)
        studentXp.Coins += Math.Max(1, xpAmount / 5);
        studentXp.UpdatedAt = DateTime.UtcNow;

        // 3. Update Streak
        await UpdateStreakInternalAsync(studentId, sourceType, ct);

        // 4. Evaluate Badges
        var unlockedBadgeIds = await EvaluateBadgesInternalAsync(studentId, sourceType, ct);

        await _dbContext.SaveChangesAsync(ct);

        return new ChallengeResultDto(
            Passed: true,
            ScorePercent: 100,
            XpEarned: xpAmount,
            CoinsEarned: bonusCoins + Math.Max(1, xpAmount / 5),
            NewTotalXp: studentXp.TotalXp,
            NewLevel: studentXp.CurrentLevel,
            LevelUpOccurred: levelUp,
            UnlockedBadges: unlockedBadgeIds
        );
    }

    public async Task<GamificationProfileDto> GetStudentProfileAsync(Guid studentId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == studentId, ct);
        var studentXp = await _dbContext.StudentXp.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);

        int totalXp = studentXp?.TotalXp ?? 0;
        int currentLevel = studentXp?.CurrentLevel ?? 1;
        int coins = studentXp?.Coins ?? 0;

        var (minXp, maxXp, levelName) = GetLevelBounds(currentLevel);
        var (_, nextMaxXp, _) = GetLevelBounds(currentLevel + 1);

        int xpProgressInCurrentLevel = totalXp - minXp;
        int xpRequiredForNextLevel = maxXp - minXp;

        // Fetch recent badges
        var studentBadges = await _dbContext.StudentBadges
            .Where(sb => sb.StudentId == studentId)
            .Include(sb => sb.Badge)
            .OrderByDescending(sb => sb.UnlockedAt)
            .Take(5)
            .Select(sb => new BadgeDto(
                sb.BadgeId,
                sb.Badge != null ? sb.Badge.Title : sb.BadgeId,
                sb.Badge != null ? sb.Badge.Description : "",
                sb.Badge != null ? sb.Badge.IconUrl : "🏅",
                sb.Badge != null ? sb.Badge.Category : BadgeCategory.Learning,
                sb.Badge != null ? sb.Badge.XpBonus : 50,
                true,
                sb.UnlockedAt
            ))
            .ToListAsync(ct);

        int badgesCount = await _dbContext.StudentBadges.CountAsync(sb => sb.StudentId == studentId, ct);

        // Fetch active daily missions
        var activeMissions = await _dbContext.Challenges
            .Where(c => c.IsActive && c.Type == ChallengeType.DailyMission)
            .Take(3)
            .Select(c => new DailyChallengeDto(
                c.Id,
                c.Title,
                c.Description,
                c.Difficulty,
                c.Type,
                c.XpReward,
                c.CoinReward,
                c.TimeLimitMinutes,
                ChallengeStatus.InProgress,
                DateTime.UtcNow.Date.AddDays(1).AddSeconds(-1)
            ))
            .ToListAsync(ct);

        return new GamificationProfileDto(
            StudentId: studentId,
            StudentName: user?.FullName ?? "Explorer",
            TotalXp: totalXp,
            CurrentLevel: currentLevel,
            LevelName: levelName,
            MinXpForCurrentLevel: minXp,
            MaxXpForNextLevel: maxXp,
            XpProgressInCurrentLevel: Math.Max(0, xpProgressInCurrentLevel),
            XpRequiredForNextLevel: Math.Max(1, xpRequiredForNextLevel),
            Coins: coins,
            CurrentStreak: streak?.CurrentStreak ?? 0,
            LongestStreak: streak?.LongestStreak ?? 0,
            FreezeTokensAvailable: streak?.FreezeTokensAvailable ?? 2,
            BadgesCount: badgesCount,
            RecentBadges: studentBadges,
            ActiveDailyMissions: activeMissions
        );
    }

    public async Task<List<XpTransactionDto>> GetStudentXpLedgerAsync(Guid studentId, int limit = 50, CancellationToken ct = default)
    {
        return await _dbContext.XpTransactions
            .Where(x => x.StudentId == studentId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .Select(x => new XpTransactionDto(
                x.Id,
                x.SourceType,
                x.XpAmount,
                x.Description,
                x.CreatedAt
            ))
            .ToListAsync(ct);
    }

    public async Task<List<BadgeDto>> GetAllBadgesAsync(Guid? studentId = null, CancellationToken ct = default)
    {
        var allBadges = await _dbContext.Badges.OrderBy(b => b.Category).ToListAsync(ct);
        var unlockedBadgeMap = new Dictionary<string, DateTime>();

        if (studentId.HasValue)
        {
            var studentBadges = await _dbContext.StudentBadges
                .Where(sb => sb.StudentId == studentId.Value)
                .ToListAsync(ct);
            foreach (var sb in studentBadges)
            {
                unlockedBadgeMap[sb.BadgeId] = sb.UnlockedAt;
            }
        }

        return allBadges.Select(b => new BadgeDto(
            b.Id,
            b.Title,
            b.Description,
            b.IconUrl,
            b.Category,
            b.XpBonus,
            unlockedBadgeMap.ContainsKey(b.Id),
            unlockedBadgeMap.TryGetValue(b.Id, out var dt) ? dt : null
        )).ToList();
    }

    public async Task<bool> UseStreakFreezeAsync(Guid studentId, CancellationToken ct = default)
    {
        var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        if (streak == null || streak.FreezeTokensAvailable <= 0)
        {
            return false;
        }

        streak.FreezeTokensAvailable -= 1;
        streak.LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow);
        streak.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<LeaderboardEntryDto>> GetWeeklyLeaderboardAsync(int top = 20, CancellationToken ct = default)
    {
        var weekStart = DateTime.UtcNow.AddDays(-(int)DateTime.UtcNow.DayOfWeek);

        var topStudentIds = await _dbContext.XpTransactions
            .Where(x => x.CreatedAt >= weekStart)
            .GroupBy(x => x.StudentId)
            .Select(g => new { StudentId = g.Key, WeeklyXp = g.Sum(x => x.XpAmount) })
            .OrderByDescending(g => g.WeeklyXp)
            .Take(top)
            .ToListAsync(ct);

        var result = new List<LeaderboardEntryDto>();
        int rank = 1;

        foreach (var item in topStudentIds)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == item.StudentId, ct);
            var xp = await _dbContext.StudentXp.FirstOrDefaultAsync(u => u.StudentId == item.StudentId, ct);
            var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(u => u.StudentId == item.StudentId, ct);

            result.Add(new LeaderboardEntryDto(
                Rank: rank++,
                StudentId: item.StudentId,
                StudentName: user?.FullName ?? "Student",
                AvatarUrl: user?.AvatarUrl,
                ScoreXp: item.WeeklyXp,
                Level: xp?.CurrentLevel ?? 1,
                Streak: streak?.CurrentStreak ?? 0
            ));
        }

        return result;
    }

    public async Task<List<LeaderboardEntryDto>> GetCourseLeaderboardAsync(Guid courseId, int top = 20, CancellationToken ct = default)
    {
        var enrolledStudents = await _dbContext.Enrollments
            .Where(e => e.CourseId == courseId)
            .Select(e => e.StudentId)
            .ToListAsync(ct);

        var studentXpList = await _dbContext.StudentXp
            .Where(sx => enrolledStudents.Contains(sx.StudentId))
            .OrderByDescending(sx => sx.TotalXp)
            .Take(top)
            .ToListAsync(ct);

        var result = new List<LeaderboardEntryDto>();
        int rank = 1;

        foreach (var item in studentXpList)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == item.StudentId, ct);
            var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(u => u.StudentId == item.StudentId, ct);

            result.Add(new LeaderboardEntryDto(
                Rank: rank++,
                StudentId: item.StudentId,
                StudentName: user?.FullName ?? "Student",
                AvatarUrl: user?.AvatarUrl,
                ScoreXp: item.TotalXp,
                Level: item.CurrentLevel,
                Streak: streak?.CurrentStreak ?? 0
            ));
        }

        return result;
    }

    public async Task<List<LeaderboardEntryDto>> GetGlobalLeaderboardAsync(int top = 20, CancellationToken ct = default)
    {
        var topStudents = await _dbContext.StudentXp
            .OrderByDescending(s => s.TotalXp)
            .Take(top)
            .ToListAsync(ct);

        var result = new List<LeaderboardEntryDto>();
        int rank = 1;

        foreach (var item in topStudents)
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == item.StudentId, ct);
            var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(u => u.StudentId == item.StudentId, ct);

            result.Add(new LeaderboardEntryDto(
                Rank: rank++,
                StudentId: item.StudentId,
                StudentName: user?.FullName ?? "Student",
                AvatarUrl: user?.AvatarUrl,
                ScoreXp: item.TotalXp,
                Level: item.CurrentLevel,
                Streak: streak?.CurrentStreak ?? 0
            ));
        }

        return result;
    }

    public int CalculateLevel(int totalXp)
    {
        if (totalXp < 500) return 1;
        if (totalXp < 1500) return 2;
        if (totalXp < 3000) return 3;
        if (totalXp < 5000) return 4;
        if (totalXp < 8000) return 5;
        if (totalXp < 12000) return 6;
        if (totalXp < 20000) return 7;
        return 8;
    }

    public (int MinXp, int MaxXp, string LevelName) GetLevelBounds(int level)
    {
        return level switch
        {
            1 => (0, 500, "Novice Explorer"),
            2 => (500, 1500, "Code Apprentice"),
            3 => (1500, 3000, "Logic Adept"),
            4 => (3000, 5000, "Data Scholar"),
            5 => (5000, 8000, "Algorithm Knight"),
            6 => (8000, 12000, "Architecture Master"),
            7 => (12000, 20000, "AI Grandmaster"),
            _ => (20000, 999999, "EduFlow Legend")
        };
    }

    private async Task UpdateStreakInternalAsync(Guid studentId, XpSourceType sourceType, CancellationToken ct)
    {
        var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (streak == null)
        {
            streak = new StudentStreak
            {
                StudentId = studentId,
                CurrentStreak = 1,
                LongestStreak = 1,
                FreezeTokensAvailable = 2,
                LastActivityDate = today,
                UpdatedAt = DateTime.UtcNow
            };
            await _dbContext.StudentStreaks.AddAsync(streak, ct);
        }
        else
        {
            if (streak.LastActivityDate == null)
            {
                streak.CurrentStreak = 1;
                streak.LongestStreak = Math.Max(1, streak.LongestStreak);
                streak.LastActivityDate = today;
            }
            else if (streak.LastActivityDate.Value == today)
            {
                // Already recorded today, no streak increment
            }
            else if (streak.LastActivityDate.Value == today.AddDays(-1))
            {
                // Consecutive day
                streak.CurrentStreak += 1;
                streak.LongestStreak = Math.Max(streak.CurrentStreak, streak.LongestStreak);
                streak.LastActivityDate = today;
            }
            else
            {
                // Broken streak
                streak.CurrentStreak = 1;
                streak.LastActivityDate = today;
            }
            streak.UpdatedAt = DateTime.UtcNow;
        }

        // Add history log
        var history = new StreakHistory
        {
            StudentId = studentId,
            ActivityDate = today,
            ActivityType = sourceType.ToString()
        };
        await _dbContext.StreakHistories.AddAsync(history, ct);
    }

    private async Task<List<string>> EvaluateBadgesInternalAsync(Guid studentId, XpSourceType sourceType, CancellationToken ct)
    {
        var unlockedBadgeIds = new List<string>();
        var existingBadges = await _dbContext.StudentBadges
            .Where(sb => sb.StudentId == studentId)
            .Select(sb => sb.BadgeId)
            .ToListAsync(ct);

        // Rule 1: FIRST_LESSON
        if (sourceType == XpSourceType.LessonCompleted && !existingBadges.Contains("FIRST_LESSON"))
        {
            await UnlockBadgeAsync(studentId, "FIRST_LESSON", unlockedBadgeIds, ct);
        }

        // Rule 2: QUIZ_MASTER
        if (sourceType == XpSourceType.PerfectScore && !existingBadges.Contains("QUIZ_MASTER"))
        {
            await UnlockBadgeAsync(studentId, "QUIZ_MASTER", unlockedBadgeIds, ct);
        }

        // Rule 3: SEVEN_DAY_STREAK
        var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        if (streak != null && streak.CurrentStreak >= 7 && !existingBadges.Contains("SEVEN_DAY_STREAK"))
        {
            await UnlockBadgeAsync(studentId, "SEVEN_DAY_STREAK", unlockedBadgeIds, ct);
        }

        // Rule 4: CHALLENGE_CHAMPION
        if ((sourceType == XpSourceType.DailyChallenge || sourceType == XpSourceType.BossBattle) && !existingBadges.Contains("CHALLENGE_CHAMPION"))
        {
            var challengeCount = await _dbContext.XpTransactions
                .CountAsync(x => x.StudentId == studentId && (x.SourceType == XpSourceType.DailyChallenge || x.SourceType == XpSourceType.BossBattle), ct);
            if (challengeCount >= 5)
            {
                await UnlockBadgeAsync(studentId, "CHALLENGE_CHAMPION", unlockedBadgeIds, ct);
            }
        }

        return unlockedBadgeIds;
    }

    private async Task UnlockBadgeAsync(Guid studentId, string badgeId, List<string> unlockedList, CancellationToken ct)
    {
        var studentBadge = new StudentBadge
        {
            StudentId = studentId,
            BadgeId = badgeId,
            UnlockedAt = DateTime.UtcNow
        };
        await _dbContext.StudentBadges.AddAsync(studentBadge, ct);
        unlockedList.Add(badgeId);

        // Optional: add notification
        var notification = new Notification
        {
            UserId = studentId,
            Title = "🏆 Badge Unlocked!",
            Message = $"Congratulations! You've unlocked the '{badgeId}' badge!",
            Type = "BadgeUnlocked"
        };
        await _dbContext.Notifications.AddAsync(notification, ct);
    }
}
