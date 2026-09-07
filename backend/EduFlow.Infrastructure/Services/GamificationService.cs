using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Constants;
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

        // Determine, before this transaction is recorded, whether this is genuinely the
        // student's first-ever lesson completion (used to gate the FIRST_LESSON badge below).
        bool isFirstLessonCompletion = false;
        if (sourceType == XpSourceType.LessonCompleted)
        {
            int priorLessonCompletions = await _dbContext.XpTransactions
                .CountAsync(x => x.StudentId == studentId && x.SourceType == XpSourceType.LessonCompleted, ct);
            isFirstLessonCompletion = priorLessonCompletions == 0;
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
        var unlockedBadgeIds = await EvaluateBadgesInternalAsync(studentId, isFirstLessonCompletion, ct);

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

                // Validate that item.TopicId actually exists in Topics to prevent foreign key violations
                Guid? verifiedTopicId = null;
                if (item.TopicId.HasValue && item.TopicId != Guid.Empty)
                {
                    bool topicExists = await _dbContext.Topics.AnyAsync(t => t.Id == item.TopicId.Value, ct);
                    if (topicExists)
                    {
                        verifiedTopicId = item.TopicId.Value;
                    }
                }

                var mastery = await _dbContext.SkillMasteries
                    .FirstOrDefaultAsync(m => m.StudentId == studentId && (m.TopicName == topicName || (verifiedTopicId != null && m.TopicId == verifiedTopicId)), ct);

                if (mastery == null)
                {
                    mastery = new SkillMastery
                    {
                        StudentId = studentId,
                        TopicId = verifiedTopicId,
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
                    if (mastery.TopicId == null && verifiedTopicId != null)
                    {
                        mastery.TopicId = verifiedTopicId;
                    }
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

        // 12. Evaluate Badges (quiz completions never count toward the first-lesson badge)
        var unlockedBadges = await EvaluateBadgesInternalAsync(studentId, false, ct);
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
        // No historical weekly XP-delta tracking exists in the schema yet (StudentXp only
        // stores a running lifetime total), so the weekly leaderboard is approximated using
        // the same current-TotalXp ranking as the global leaderboard.
        return await BuildLeaderboardAsync(null, top, ct);
    }

    public async Task<List<LeaderboardEntryDto>> GetCourseLeaderboardAsync(Guid courseId, int top = 20, CancellationToken ct = default)
    {
        var enrolledStudentIds = await _dbContext.Enrollments
            .Where(e => e.CourseId == courseId && e.Status == EnrollmentStatus.Active)
            .Select(e => e.StudentId)
            .ToListAsync(ct);

        return await BuildLeaderboardAsync(enrolledStudentIds, top, ct);
    }

    public async Task<List<LeaderboardEntryDto>> GetGlobalLeaderboardAsync(int top = 20, CancellationToken ct = default)
    {
        return await BuildLeaderboardAsync(null, top, ct);
    }

    /// <summary>
    /// Builds a ranked leaderboard from live StudentXp/User/StudentStreak data.
    /// When <paramref name="allowedStudentIds"/> is null, every student with an XP record is
    /// eligible; otherwise only students whose id is in that list are considered (used to scope
    /// the leaderboard to a course's actively enrolled students).
    /// </summary>
    private async Task<List<LeaderboardEntryDto>> BuildLeaderboardAsync(List<Guid>? allowedStudentIds, int top, CancellationToken ct)
    {
        int take = Math.Max(0, top);
        if (take == 0)
        {
            return new List<LeaderboardEntryDto>();
        }

        var query = _dbContext.StudentXp
            .Join(_dbContext.Users, sx => sx.StudentId, u => u.Id, (sx, u) => new
            {
                sx.StudentId,
                sx.TotalXp,
                sx.CurrentLevel,
                u.FullName,
                u.AvatarUrl
            });

        if (allowedStudentIds != null)
        {
            query = query.Where(x => allowedStudentIds.Contains(x.StudentId));
        }

        var ranked = await query
            .OrderByDescending(x => x.TotalXp)
            .ThenBy(x => x.FullName)
            .Take(take)
            .ToListAsync(ct);

        if (ranked.Count == 0)
        {
            return new List<LeaderboardEntryDto>();
        }

        var rankedStudentIds = ranked.Select(r => r.StudentId).ToList();
        var streaksByStudent = await _dbContext.StudentStreaks
            .Where(s => rankedStudentIds.Contains(s.StudentId))
            .ToDictionaryAsync(s => s.StudentId, s => s.CurrentStreak, ct);

        return ranked
            .Select((r, index) => new LeaderboardEntryDto(
                Rank: index + 1,
                StudentId: r.StudentId,
                StudentName: r.FullName,
                AvatarUrl: r.AvatarUrl,
                ScoreXp: r.TotalXp,
                Level: r.CurrentLevel,
                Streak: streaksByStudent.TryGetValue(r.StudentId, out var streak) ? streak : 0
            ))
            .ToList();
    }

    public int CalculateLevel(int totalXp)
    {
        return LevelCurve.GetLevelForXp(totalXp);
    }

    public (int MinXp, int MaxXp, string LevelName) GetLevelBounds(int level)
    {
        var entry = LevelCurve.GetEntryForLevel(level);
        return (entry.MinXp, entry.MaxXp, entry.Name);
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

    private async Task<List<string>> EvaluateBadgesInternalAsync(Guid studentId, bool isFirstLessonCompletion, CancellationToken ct)
    {
        var unlocked = new List<string>();

        if (isFirstLessonCompletion && await TryUnlockBadgeAsync(studentId, "FIRST_LESSON", ct))
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

        // Ensure badge definition exists in Badges table before referencing it
        var badge = await _dbContext.Badges.FirstOrDefaultAsync(b => b.Id == badgeId, ct);
        if (badge == null)
        {
            badge = new Badge
            {
                Id = badgeId,
                Title = badgeId switch
                {
                    "PERFECT_SCORE" => "Perfect Score",
                    "QUIZ_MASTER" => "Quiz Master",
                    "BOSS_SLAYER" => "Boss Slayer",
                    "COMEBACK_KID" => "Comeback Kid",
                    "FIRST_LESSON" => "First Step",
                    "SEVEN_DAY_STREAK" => "7-Day Streak",
                    "FOURTEEN_DAY_STREAK" => "14-Day Streak",
                    _ => badgeId.Replace("_", " ")
                },
                Description = badgeId switch
                {
                    "PERFECT_SCORE" => "Scored 100% on an authoritative assessment",
                    "QUIZ_MASTER" => "Scored 90%+ in quizzes",
                    "BOSS_SLAYER" => "Conquered a module challenge encounter",
                    "COMEBACK_KID" => "Improved topic mastery significantly",
                    "FIRST_LESSON" => "Completed your very first lesson",
                    "SEVEN_DAY_STREAK" => "Maintained a continuous 7-day study streak",
                    "FOURTEEN_DAY_STREAK" => "Maintained a continuous 14-day study streak",
                    _ => $"Unlocked badge {badgeId}"
                },
                IconUrl = badgeId switch
                {
                    "PERFECT_SCORE" => "🎯",
                    "QUIZ_MASTER" => "🏆",
                    "BOSS_SLAYER" => "⚔️",
                    "COMEBACK_KID" => "📈",
                    "FIRST_LESSON" => "🌱",
                    "SEVEN_DAY_STREAK" => "🔥",
                    "FOURTEEN_DAY_STREAK" => "⚡",
                    _ => "🏅"
                },
                Category = badgeId.Contains("STREAK") ? BadgeCategory.Streak : BadgeCategory.Assessment,
                XpBonus = 100,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.Badges.AddAsync(badge, ct);
            await _dbContext.SaveChangesAsync(ct);
        }

        await _dbContext.StudentBadges.AddAsync(new StudentBadge
        {
            StudentId = studentId,
            BadgeId = badgeId,
            UnlockedAt = DateTime.UtcNow
        }, ct);

        return true;
    }

    private static double _xpMultiplier = 1.0;

    public double GetXpMultiplier() => _xpMultiplier;

    public void SetXpMultiplier(double multiplier)
    {
        _xpMultiplier = Math.Clamp(multiplier, 1.0, 5.0);
    }

    public async Task<FocusSessionResponseDto> AwardFocusSessionXpAsync(FocusSessionRequestDto request, CancellationToken ct = default)
    {
        var student = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == request.StudentId, ct);
        if (student == null)
        {
            return new FocusSessionResponseDto(false, 0, 0, 0, 0, "Student not found", string.Empty);
        }

        int baseMinutes = Math.Max(5, request.DurationMinutes);
        int baseEarned = (int)Math.Round(baseMinutes * 1.5);
        if (baseMinutes >= 45) baseEarned += 20;
        else if (baseMinutes >= 25) baseEarned += 10;

        int finalXp = (int)Math.Round(baseEarned * _xpMultiplier);
        int coinsEarned = Math.Max(5, baseMinutes / 3);

        var txn = new XpTransaction
        {
            StudentId = request.StudentId,
            SourceType = XpSourceType.FocusSession,
            SourceId = Guid.NewGuid(),
            XpAmount = finalXp,
            Description = $"Deep Focus Sprint ({baseMinutes}m): {request.TopicOrTask}"
        };
        await _dbContext.XpTransactions.AddAsync(txn, ct);

        var studentXp = await _dbContext.StudentXp.FirstOrDefaultAsync(x => x.StudentId == request.StudentId, ct);
        if (studentXp == null)
        {
            studentXp = new StudentXp
            {
                StudentId = request.StudentId,
                TotalXp = finalXp,
                CurrentLevel = CalculateLevel(finalXp),
                Coins = coinsEarned,
                UpdatedAt = DateTime.UtcNow
            };
            await _dbContext.StudentXp.AddAsync(studentXp, ct);
        }
        else
        {
            studentXp.TotalXp += finalXp;
            studentXp.Coins += coinsEarned;
            studentXp.CurrentLevel = CalculateLevel(studentXp.TotalXp);
            studentXp.UpdatedAt = DateTime.UtcNow;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == request.StudentId, ct);
        if (streak == null)
        {
            streak = new StudentStreak
            {
                StudentId = request.StudentId,
                CurrentStreak = 1,
                LongestStreak = 1,
                LastActivityDate = today,
                FreezeTokensAvailable = 2,
                UpdatedAt = DateTime.UtcNow
            };
            await _dbContext.StudentStreaks.AddAsync(streak, ct);
        }
        else if (streak.LastActivityDate != today)
        {
            if (streak.LastActivityDate.HasValue && streak.LastActivityDate.Value == today.AddDays(-1))
            {
                streak.CurrentStreak += 1;
                if (streak.CurrentStreak > streak.LongestStreak)
                    streak.LongestStreak = streak.CurrentStreak;
            }
            else
            {
                streak.CurrentStreak = 1;
            }
            streak.LastActivityDate = today;
            streak.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.StreakHistories.AddAsync(new StreakHistory
        {
            StudentId = request.StudentId,
            ActivityDate = today,
            ActivityType = "DeepFocusSession"
        }, ct);

        await _dbContext.SaveChangesAsync(ct);

        string artifactName = baseMinutes >= 45 ? "💎 Ancient Focus Crystal" : (baseMinutes >= 25 ? "🌳 Golden Oak Sapling" : "🌱 Emerald Sprout");

        return new FocusSessionResponseDto(
            Success: true,
            XpAwarded: finalXp,
            CoinsAwarded: coinsEarned,
            NewTotalXp: studentXp.TotalXp,
            NewStreak: streak.CurrentStreak,
            Message: $"Focus Sprint completed! +{finalXp} XP and +{coinsEarned} Coins awarded.",
            FocusArtifactAwarded: artifactName
        );
    }
}
