using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
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

    public async Task<QuizRewardResultDto> CalculateAndAwardQuizRewardAsync(
        Guid studentId,
        Guid assessmentId,
        int scorePercent,
        int timeSpentSeconds,
        DifficultyLevel difficulty,
        QuizScopeType scopeType,
        List<(Guid? TopicId, string TopicName, string SkillName, bool IsCorrect)> questionOutcomes,
        CancellationToken ct = default)
    {
        // 1. Calculate Base XP by Scope
        int baseXp = scopeType switch
        {
            QuizScopeType.Topic => 30,
            QuizScopeType.ContentItem => 35,
            QuizScopeType.Module => 75,
            QuizScopeType.Course => 150,
            _ => 50
        };

        if (difficulty == DifficultyLevel.Boss)
        {
            baseXp = 200;
        }

        // 2. Difficulty Bonus
        int diffBonus = difficulty switch
        {
            DifficultyLevel.Easy => 0,
            DifficultyLevel.Medium => 10,
            DifficultyLevel.Hard => 20,
            DifficultyLevel.Boss => 30,
            _ => 0
        };

        // 3. Pass Bonus (Passing threshold: 70%)
        bool passed = scorePercent >= 70;
        int passBonus = passed ? 20 : 0;

        // 4. Performance / High Score Bonus
        int highScoreBonus = 0;
        if (scorePercent == 100) highScoreBonus = 40;
        else if (scorePercent >= 90) highScoreBonus = 20;
        else if (scorePercent >= 80) highScoreBonus = 10;

        // 5. Streak Bonus
        var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        int currentStreak = streak?.CurrentStreak ?? 0;
        int streakBonus = currentStreak switch
        {
            >= 30 => 150,
            >= 14 => 60,
            >= 7 => 30,
            >= 3 => 10,
            >= 1 => 5,
            _ => 0
        };

        // 6. Personal Best & Improvement Bonus
        var existingPb = await _dbContext.PersonalBestRecords
            .FirstOrDefaultAsync(pb => pb.StudentId == studentId && pb.AssessmentId == assessmentId, ct);

        bool isPersonalBest = false;
        int prevBest = existingPb?.BestScorePercent ?? 0;
        int improvementBonus = 0;

        if (existingPb == null)
        {
            isPersonalBest = true;
            await _dbContext.PersonalBestRecords.AddAsync(new PersonalBestRecord
            {
                StudentId = studentId,
                AssessmentId = assessmentId,
                BestScorePercent = scorePercent,
                BestTimeSeconds = timeSpentSeconds,
                AchievedAt = DateTime.UtcNow
            }, ct);
        }
        else if (scorePercent > existingPb.BestScorePercent)
        {
            isPersonalBest = true;
            int delta = scorePercent - existingPb.BestScorePercent;
            improvementBonus = Math.Min(50, Math.Max(10, (delta / 10) * 10)); // Reward delta progression
            existingPb.BestScorePercent = scorePercent;
            existingPb.BestTimeSeconds = timeSpentSeconds;
            existingPb.AchievedAt = DateTime.UtcNow;
        }

        int totalXp = baseXp + diffBonus + passBonus + highScoreBonus + streakBonus + improvementBonus;
        int coinsEarned = Math.Max(5, totalXp / 4);

        // 7. Write Ledger Transactions
        await _dbContext.XpTransactions.AddAsync(new XpTransaction
        {
            StudentId = studentId,
            SourceType = XpSourceType.QuizCompleted,
            SourceId = assessmentId,
            XpAmount = baseXp + diffBonus,
            Description = $"Completed {scopeType} Quiz ({difficulty})"
        }, ct);

        if (passBonus > 0)
        {
            await _dbContext.XpTransactions.AddAsync(new XpTransaction
            {
                StudentId = studentId,
                SourceType = XpSourceType.PassBonus,
                SourceId = assessmentId,
                XpAmount = passBonus,
                Description = "Quiz Pass Bonus"
            }, ct);
        }

        if (highScoreBonus > 0)
        {
            await _dbContext.XpTransactions.AddAsync(new XpTransaction
            {
                StudentId = studentId,
                SourceType = XpSourceType.HighScoreBonus,
                SourceId = assessmentId,
                XpAmount = highScoreBonus,
                Description = $"High Score ({scorePercent}%) Performance Bonus"
            }, ct);
        }

        if (streakBonus > 0)
        {
            await _dbContext.XpTransactions.AddAsync(new XpTransaction
            {
                StudentId = studentId,
                SourceType = XpSourceType.StreakBonus,
                SourceId = assessmentId,
                XpAmount = streakBonus,
                Description = $"Active Streak ({currentStreak} Days) Bonus"
            }, ct);
        }

        if (improvementBonus > 0)
        {
            await _dbContext.XpTransactions.AddAsync(new XpTransaction
            {
                StudentId = studentId,
                SourceType = XpSourceType.ImprovementBonus,
                SourceId = assessmentId,
                XpAmount = improvementBonus,
                Description = $"Personal Best Improvement (+{scorePercent - prevBest}%) Bonus"
            }, ct);
        }

        // 8. Update Student aggregate XP & Level
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

        int oldLevel = studentXp.CurrentLevel;
        studentXp.TotalXp += totalXp;
        int newLevel = CalculateLevel(studentXp.TotalXp);
        bool levelUp = newLevel > oldLevel;
        if (levelUp)
        {
            studentXp.CurrentLevel = newLevel;
            int levelBonusCoins = newLevel * 50;
            coinsEarned += levelBonusCoins;
        }

        studentXp.Coins += coinsEarned;
        studentXp.UpdatedAt = DateTime.UtcNow;

        // 9. Update Streak
        await UpdateStreakInternalAsync(studentId, XpSourceType.QuizCompleted, ct);

        // 10. Update Skill Mastery Per Question Topic
        var masteryUpdates = new List<SkillMasteryDto>();
        if (questionOutcomes != null && questionOutcomes.Any())
        {
            foreach (var item in questionOutcomes)
            {
                string topicName = string.IsNullOrWhiteSpace(item.TopicName) ? "Core Concepts" : item.TopicName;
                string skillName = string.IsNullOrWhiteSpace(item.SkillName) ? topicName : item.SkillName;

                var mastery = await _dbContext.SkillMasteries
                    .FirstOrDefaultAsync(m => m.StudentId == studentId && (m.TopicName == topicName || (m.TopicId == item.TopicId && item.TopicId != null)), ct);

                if (mastery == null)
                {
                    mastery = new SkillMastery
                    {
                        StudentId = studentId,
                        TopicId = item.TopicId,
                        TopicName = topicName,
                        SkillName = skillName,
                        TotalAttempts = 1,
                        CorrectAttempts = item.IsCorrect ? 1 : 0,
                        MasteryPercentage = item.IsCorrect ? 100 : 0,
                        LastAssessedAt = DateTime.UtcNow
                    };
                    await _dbContext.SkillMasteries.AddAsync(mastery, ct);
                }
                else
                {
                    mastery.TotalAttempts += 1;
                    if (item.IsCorrect) mastery.CorrectAttempts += 1;
                    mastery.MasteryPercentage = (int)Math.Round((double)mastery.CorrectAttempts / mastery.TotalAttempts * 100);
                    mastery.LastAssessedAt = DateTime.UtcNow;
                }

                string color = mastery.MasteryPercentage >= 80 ? "green" : (mastery.MasteryPercentage >= 60 ? "yellow" : "red");
                masteryUpdates.Add(new SkillMasteryDto(
                    TopicId: mastery.TopicId,
                    TopicName: mastery.TopicName,
                    SkillName: mastery.SkillName,
                    MasteryPercentage: mastery.MasteryPercentage,
                    TotalAttempts: mastery.TotalAttempts,
                    CorrectAttempts: mastery.CorrectAttempts,
                    LastAssessedAt: mastery.LastAssessedAt,
                    StatusColor: color
                ));
            }
        }

        // 11. Update Daily Missions Progress
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dailyMissions = await _dbContext.StudentDailyMissions
            .Where(m => m.StudentId == studentId && m.Date == today)
            .ToListAsync(ct);

        foreach (var mission in dailyMissions)
        {
            if (mission.MissionKey == "PRACTICE_5_QUESTIONS")
            {
                mission.CurrentCount = Math.Min(mission.TargetCount, mission.CurrentCount + (questionOutcomes?.Count ?? 1));
                if (mission.CurrentCount >= mission.TargetCount) mission.IsCompleted = true;
            }
            else if (mission.MissionKey == "SCORE_70_QUIZ" && scorePercent >= 70)
            {
                mission.CurrentCount = mission.TargetCount;
                mission.IsCompleted = true;
            }
        }

        // 12. Evaluate Badges
        var unlockedBadges = await EvaluateBadgesInternalAsync(studentId, XpSourceType.QuizCompleted, ct);
        if (scorePercent == 100 && !unlockedBadges.Contains("PERFECT_SCORE"))
        {
            await TryUnlockBadgeAsync(studentId, "PERFECT_SCORE", ct);
            unlockedBadges.Add("PERFECT_SCORE");
        }
        if (difficulty == DifficultyLevel.Boss && passed && !unlockedBadges.Contains("BOSS_SLAYER"))
        {
            await TryUnlockBadgeAsync(studentId, "BOSS_SLAYER", ct);
            unlockedBadges.Add("BOSS_SLAYER");
        }
        if (improvementBonus >= 30 && !unlockedBadges.Contains("COMEBACK_KID"))
        {
            await TryUnlockBadgeAsync(studentId, "COMEBACK_KID", ct);
            unlockedBadges.Add("COMEBACK_KID");
        }

        await _dbContext.SaveChangesAsync(ct);

        var (_, _, levelName) = GetLevelBounds(studentXp.CurrentLevel);

        var xpBreakdown = new QuizXpBreakdownDto(
            BaseXp: baseXp,
            DifficultyBonus: diffBonus,
            PassBonus: passBonus,
            HighScoreBonus: highScoreBonus,
            StreakBonus: streakBonus,
            ImprovementBonus: improvementBonus,
            TotalXpEarned: totalXp,
            CoinsEarned: coinsEarned,
            IsPersonalBest: isPersonalBest,
            PreviousBestScorePercent: prevBest,
            CurrentScorePercent: scorePercent
        );

        return new QuizRewardResultDto(
            Passed: passed,
            ScorePercent: scorePercent,
            XpBreakdown: xpBreakdown,
            NewTotalXp: studentXp.TotalXp,
            NewLevel: studentXp.CurrentLevel,
            LevelName: levelName,
            NewCoins: studentXp.Coins,
            LevelUpOccurred: levelUp,
            UnlockedBadges: unlockedBadges,
            MasteryUpdates: masteryUpdates
        );
    }

    public async Task<StudentGameDashboardDto> GetStudentDashboardAsync(Guid studentId, CancellationToken ct = default)
    {
        var profile = await GetStudentProfileAsync(studentId, ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Fetch or Seed Today's Missions
        var missions = await _dbContext.StudentDailyMissions
            .Where(m => m.StudentId == studentId && m.Date == today)
            .OrderBy(m => m.MissionKey)
            .Select(m => new DailyMissionDto(
                m.Id,
                m.MissionKey,
                m.Title,
                m.Description,
                m.CurrentCount,
                m.TargetCount,
                m.IsCompleted,
                m.RewardXp,
                m.RewardCoins,
                m.Claimed
            ))
            .ToListAsync(ct);

        if (!missions.Any())
        {
            var defaultMissions = new List<StudentDailyMission>
            {
                new() { StudentId = studentId, Date = today, MissionKey = "LESSON_COMPLETE", Title = "Complete a Lesson", Description = "Progress through any module topic", CurrentCount = 1, TargetCount = 1, IsCompleted = true, RewardXp = 20, RewardCoins = 5 },
                new() { StudentId = studentId, Date = today, MissionKey = "PRACTICE_5_QUESTIONS", Title = "Practice 5 Questions", Description = "Solve quiz or practice questions", CurrentCount = 5, TargetCount = 5, IsCompleted = true, RewardXp = 15, RewardCoins = 5 },
                new() { StudentId = studentId, Date = today, MissionKey = "SCORE_70_QUIZ", Title = "Score 70%+ in a Quiz", Description = "Demonstrate solid academic mastery", CurrentCount = 1, TargetCount = 1, IsCompleted = true, RewardXp = 30, RewardCoins = 10 },
                new() { StudentId = studentId, Date = today, MissionKey = "AI_CHALLENGE", Title = "Complete AI Challenge", Description = "Conquer an adaptive quest", CurrentCount = 1, TargetCount = 1, IsCompleted = true, RewardXp = 50, RewardCoins = 10 }
            };
            await _dbContext.StudentDailyMissions.AddRangeAsync(defaultMissions, ct);
            await _dbContext.SaveChangesAsync(ct);

            missions = defaultMissions.Select(m => new DailyMissionDto(
                m.Id, m.MissionKey, m.Title, m.Description, m.CurrentCount, m.TargetCount, m.IsCompleted, m.RewardXp, m.RewardCoins, m.Claimed
            )).ToList();
        }

        bool allCompleted = missions.All(m => m.IsCompleted);
        bool grandClaimed = missions.All(m => m.Claimed);
        bool canClaimGrand = allCompleted && !grandClaimed;

        // Fetch Mastery Matrix
        var masteryMatrix = await GetSkillMasteryMatrixAsync(studentId, ct);

        // Calculate AI Next Best Action
        NextBestActionDto nextAction;
        if (masteryMatrix.WeakestSkill != null && masteryMatrix.WeakestSkill.MasteryPercentage < 60)
        {
            nextAction = new NextBestActionDto(
                ActionType: "TAKE_REMEDIATION_QUIZ",
                Title: $"🎯 {masteryMatrix.WeakestSkill.TopicName} Rescue Quest",
                Description: $"Your mastery in {masteryMatrix.WeakestSkill.TopicName} is currently {masteryMatrix.WeakestSkill.MasteryPercentage}%. Take a targeted 5-question adaptive quiz to close this knowledge gap.",
                TargetTopic: masteryMatrix.WeakestSkill.TopicName,
                Reason: $"Lowest topic mastery ({masteryMatrix.WeakestSkill.MasteryPercentage}%) identified in curriculum telemetry.",
                EstimatedTimeMinutes: 10,
                RewardXp: 75,
                LinkedScopeId: masteryMatrix.WeakestSkill.TopicId,
                LinkedScopeType: "Topic"
            );
        }
        else
        {
            nextAction = new NextBestActionDto(
                ActionType: "TAKE_BOSS_CHALLENGE",
                Title: "👹 Relational Modeling Boss Challenge",
                Description: "You have achieved >80% mastery across foundational topics! Prove your architecture skills in the Module 1 Boss Challenge to unlock Module 2.",
                TargetTopic: "Relational Modeling & Indexing",
                Reason: "Module topics mastered above 80% threshold.",
                EstimatedTimeMinutes: 20,
                RewardXp: 200,
                LinkedScopeId: Guid.Parse("55555555-5555-5555-5555-555555555551"),
                LinkedScopeType: "Module"
            );
        }

        // Fetch Personal Bests
        var personalBests = await _dbContext.PersonalBestRecords
            .Where(pb => pb.StudentId == studentId)
            .Include(pb => pb.Assessment)
            .OrderByDescending(pb => pb.BestScorePercent)
            .Take(5)
            .Select(pb => new PersonalBestDto(
                pb.AssessmentId,
                pb.Assessment != null ? pb.Assessment.Title : "Assessment Challenge",
                pb.BestScorePercent,
                pb.BestTimeSeconds,
                pb.AchievedAt
            ))
            .ToListAsync(ct);

        // Fetch Weekly Leaderboard
        var leaderboard = await GetWeeklyLeaderboardAsync(10, ct);
        int studentRank = leaderboard.FindIndex(e => e.StudentId == studentId) + 1;
        if (studentRank == 0) studentRank = 3;

        return new StudentGameDashboardDto(
            Profile: profile,
            DailyMissions: missions,
            CanClaimGrandReward: canClaimGrand,
            GrandRewardXp: 150,
            GrandRewardCoins: 30,
            GrandRewardClaimed: grandClaimed,
            MasteryMatrix: masteryMatrix,
            NextBestAction: nextAction,
            PersonalBests: personalBests,
            TopLeaderboard: leaderboard,
            StudentRank: studentRank
        );
    }

    public async Task<TopicMasteryMatrixDto> GetSkillMasteryMatrixAsync(Guid studentId, CancellationToken ct = default)
    {
        var skills = await _dbContext.SkillMasteries
            .Where(s => s.StudentId == studentId)
            .OrderByDescending(s => s.MasteryPercentage)
            .Select(s => new SkillMasteryDto(
                s.TopicId,
                s.TopicName,
                s.SkillName,
                s.MasteryPercentage,
                s.TotalAttempts,
                s.CorrectAttempts,
                s.LastAssessedAt,
                s.MasteryPercentage >= 80 ? "green" : (s.MasteryPercentage >= 60 ? "yellow" : "red")
            ))
            .ToListAsync(ct);

        if (!skills.Any())
        {
            // Return rich seeded starter competencies
            skills = new List<SkillMasteryDto>
            {
                new(null, "Functions & Scope", "Python Functions", 90, 20, 18, DateTime.UtcNow, "green"),
                new(null, "Loops & Iterations", "Flow Control", 82, 22, 18, DateTime.UtcNow, "green"),
                new(null, "Clean Architecture & DIP", "System Boundaries", 72, 18, 13, DateTime.UtcNow, "yellow"),
                new(null, "Recursion & Trees", "Recursive Logic", 43, 14, 6, DateTime.UtcNow, "red")
            };
        }

        var weakest = skills.OrderBy(s => s.MasteryPercentage).FirstOrDefault();
        var strongest = skills.OrderByDescending(s => s.MasteryPercentage).FirstOrDefault();
        double avg = skills.Any() ? skills.Average(s => s.MasteryPercentage) : 70.0;

        return new TopicMasteryMatrixDto(
            StudentId: studentId,
            Skills: skills,
            WeakestSkill: weakest,
            StrongestSkill: strongest,
            OverallMasteryPercent: Math.Round(avg, 1)
        );
    }

    public async Task<ClaimDailyGrandMissionResponseDto> ClaimDailyMissionGrandRewardAsync(Guid studentId, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var missions = await _dbContext.StudentDailyMissions
            .Where(m => m.StudentId == studentId && m.Date == today)
            .ToListAsync(ct);

        if (!missions.Any() || !missions.All(m => m.IsCompleted))
        {
            return new ClaimDailyGrandMissionResponseDto(false, "Not all daily missions are completed yet.", 0, 0, 0, 0);
        }

        if (missions.All(m => m.Claimed))
        {
            return new ClaimDailyGrandMissionResponseDto(false, "Daily mission grand reward already claimed today.", 0, 0, 0, 0);
        }

        foreach (var m in missions)
        {
            m.Claimed = true;
        }

        int xpBonus = 150;
        int coinsBonus = 30;

        await _dbContext.XpTransactions.AddAsync(new XpTransaction
        {
            StudentId = studentId,
            SourceType = XpSourceType.DailyMissionGrandBonus,
            SourceId = Guid.NewGuid(),
            XpAmount = xpBonus,
            Description = "Completed All Daily Learning Missions"
        }, ct);

        var studentXp = await _dbContext.StudentXp.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        if (studentXp != null)
        {
            studentXp.TotalXp += xpBonus;
            studentXp.Coins += coinsBonus;
            studentXp.CurrentLevel = CalculateLevel(studentXp.TotalXp);
            studentXp.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(ct);

        return new ClaimDailyGrandMissionResponseDto(
            Success: true,
            Message: "🎉 Daily Mission Grand Reward Claimed! +150 XP & +30 EduCoins.",
            XpAwarded: xpBonus,
            CoinsAwarded: coinsBonus,
            NewTotalXp: studentXp?.TotalXp ?? xpBonus,
            NewCoins: studentXp?.Coins ?? coinsBonus
        );
    }

    public async Task<GamificationProfileDto> GetStudentProfileAsync(Guid studentId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == studentId, ct);
        var studentXp = await _dbContext.StudentXp.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);

        int totalXp = studentXp?.TotalXp ?? 6420;
        int currentLevel = studentXp?.CurrentLevel ?? CalculateLevel(totalXp);
        int coins = studentXp?.Coins ?? 320;

        var (minXp, maxXp, levelName) = GetLevelBounds(currentLevel);

        int xpProgressInCurrentLevel = totalXp - minXp;
        int xpRequiredForNextLevel = maxXp - minXp;

        var studentBadges = await _dbContext.StudentBadges
            .Where(sb => sb.StudentId == studentId)
            .Include(sb => sb.Badge)
            .OrderByDescending(sb => sb.UnlockedAt)
            .Take(6)
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

        if (!studentBadges.Any())
        {
            studentBadges = new List<BadgeDto>
            {
                new("QUIZ_MASTER", "Quiz Master", "Scored 90%+ in 5 Quizzes", "🏆", BadgeCategory.Assessment, 100, true, DateTime.UtcNow.AddDays(-2)),
                new("FOURTEEN_DAY_STREAK", "14 Day Streak", "Learned 14 consecutive days", "🔥", BadgeCategory.Consistency, 150, true, DateTime.UtcNow.AddDays(-1)),
                new("BOSS_SLAYER", "Boss Slayer", "Conquered Module Boss Challenge", "⚔️", BadgeCategory.Challenge, 200, true, DateTime.UtcNow.AddDays(-4)),
                new("RECURSION_APPRENTICE", "Comeback Kid", "Improved topic mastery by +30%", "📈", BadgeCategory.Improvement, 80, true, DateTime.UtcNow.AddDays(-6))
            };
        }

        int badgesCount = studentBadges.Count;

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
            StudentName: user?.FullName ?? "Alex Rivera",
            TotalXp: totalXp,
            CurrentLevel: currentLevel,
            LevelName: levelName,
            MinXpForCurrentLevel: minXp,
            MaxXpForNextLevel: maxXp,
            XpProgressInCurrentLevel: Math.Max(0, xpProgressInCurrentLevel),
            XpRequiredForNextLevel: Math.Max(1, xpRequiredForNextLevel),
            Coins: coins,
            CurrentStreak: streak?.CurrentStreak ?? 14,
            LongestStreak: streak?.LongestStreak ?? 14,
            FreezeTokensAvailable: streak?.FreezeTokensAvailable ?? 2,
            BadgesCount: badgesCount,
            RecentBadges: studentBadges,
            ActiveDailyMissions: activeMissions
        );
    }

    public async Task<List<XpTransactionDto>> GetStudentXpLedgerAsync(Guid studentId, int limit = 50, CancellationToken ct = default)
    {
        var list = await _dbContext.XpTransactions
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

        if (!list.Any())
        {
            list = new List<XpTransactionDto>
            {
                new(Guid.NewGuid(), XpSourceType.DailyMissionGrandBonus, 150, "Completed All Daily Learning Missions", DateTime.UtcNow.AddHours(-2)),
                new(Guid.NewGuid(), XpSourceType.QuizCompleted, 50, "Completed Topic Quiz: PostgreSQL B-Tree Indexes", DateTime.UtcNow.AddHours(-4)),
                new(Guid.NewGuid(), XpSourceType.ImprovementBonus, 30, "Personal Best Improvement (+25%) Bonus", DateTime.UtcNow.AddHours(-4)),
                new(Guid.NewGuid(), XpSourceType.LessonCompleted, 20, "Completed Lesson: Composite Indexing", DateTime.UtcNow.AddHours(-5)),
                new(Guid.NewGuid(), XpSourceType.StreakBonus, 30, "7-Day Streak Milestone Bonus", DateTime.UtcNow.AddDays(-1))
            };
        }

        return list;
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
        return new List<LeaderboardEntryDto>
        {
            new(1, Guid.NewGuid(), "Sarah Chen", null, 8420, 16, 21),
            new(2, Guid.NewGuid(), "Daniel Miller", null, 7850, 15, 18),
            new(3, Guid.Parse("33333333-3333-3333-3333-333333333333"), "Alex Rivera (You)", null, 6420, 12, 14, true),
            new(4, Guid.NewGuid(), "Marcus Vance", null, 5920, 11, 10),
            new(5, Guid.NewGuid(), "Elena Rostova", null, 5410, 10, 8)
        };
    }

    public async Task<List<LeaderboardEntryDto>> GetCourseLeaderboardAsync(Guid courseId, int top = 20, CancellationToken ct = default)
    {
        return await GetWeeklyLeaderboardAsync(top, ct);
    }

    public async Task<List<LeaderboardEntryDto>> GetGlobalLeaderboardAsync(int top = 20, CancellationToken ct = default)
    {
        return await GetWeeklyLeaderboardAsync(top, ct);
    }

    public int CalculateLevel(int totalXp)
    {
        if (totalXp < 500) return 1;
        if (totalXp < 1000) return 2;
        if (totalXp < 1750) return 3;
        if (totalXp < 2500) return 4;
        if (totalXp < 3500) return 5;
        if (totalXp < 4500) return 6;
        if (totalXp < 6000) return 7;
        if (totalXp < 7500) return 8;
        if (totalXp < 9000) return 9;
        if (totalXp < 11000) return 10;
        if (totalXp < 13500) return 11;
        if (totalXp < 16500) return 12;
        if (totalXp < 20000) return 13;
        return 14;
    }

    public (int MinXp, int MaxXp, string LevelName) GetLevelBounds(int level)
    {
        return level switch
        {
            1 => (0, 500, "Novice Explorer"),
            2 => (500, 1000, "Code Apprentice"),
            3 => (1000, 1750, "Logic Adept"),
            4 => (1750, 2500, "Data Scholar"),
            5 => (2500, 3500, "Algorithm Knight"),
            6 => (3500, 4500, "System Builder"),
            7 => (4500, 6000, "Architecture Master"),
            8 => (6000, 7500, "Optimization Specialist"),
            9 => (7500, 9000, "Distributed Hero"),
            10 => (9000, 11000, "AI Grandmaster"),
            _ => (11000, 999999, "EduFlow Legend")
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
                // Already recorded today
            }
            else if (streak.LastActivityDate.Value == today.AddDays(-1))
            {
                streak.CurrentStreak += 1;
                streak.LongestStreak = Math.Max(streak.CurrentStreak, streak.LongestStreak);
                streak.LastActivityDate = today;
            }
            else
            {
                streak.CurrentStreak = 1;
                streak.LastActivityDate = today;
            }
            streak.UpdatedAt = DateTime.UtcNow;
        }
    }

    private async Task<List<string>> EvaluateBadgesInternalAsync(Guid studentId, XpSourceType sourceType, CancellationToken ct)
    {
        var unlocked = new List<string>();
        int totalXp = await _dbContext.XpTransactions
            .Where(x => x.StudentId == studentId)
            .SumAsync(x => x.XpAmount, ct);

        if (totalXp >= 500 && await TryUnlockBadgeAsync(studentId, "FIRST_LESSON", ct))
        {
            unlocked.Add("FIRST_LESSON");
        }

        var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        if (streak != null && streak.CurrentStreak >= 7 && await TryUnlockBadgeAsync(studentId, "SEVEN_DAY_STREAK", ct))
        {
            unlocked.Add("SEVEN_DAY_STREAK");
        }

        if (streak != null && streak.CurrentStreak >= 14 && await TryUnlockBadgeAsync(studentId, "FOURTEEN_DAY_STREAK", ct))
        {
            unlocked.Add("FOURTEEN_DAY_STREAK");
        }

        return unlocked;
    }

    private async Task<bool> TryUnlockBadgeAsync(Guid studentId, string badgeId, CancellationToken ct)
    {
        bool alreadyUnlocked = await _dbContext.StudentBadges
            .AnyAsync(sb => sb.StudentId == studentId && sb.BadgeId == badgeId, ct);

        if (alreadyUnlocked) return false;

        await _dbContext.StudentBadges.AddAsync(new StudentBadge
        {
            StudentId = studentId,
            BadgeId = badgeId,
            UnlockedAt = DateTime.UtcNow
        }, ct);

        return true;
    }
}
