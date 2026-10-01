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
using EduFlow.Infrastructure.Services.Gamification;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

public class GamificationService : IGamificationService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly GamificationRuleSet _rules;
    private readonly PointsLedger _ledger;
    private readonly AchievementService _achievements;

    /// <summary>Convenience constructor (tests, simple hosts): builds its collaborators on the same context.</summary>
    public GamificationService(ApplicationDbContext dbContext)
        : this(dbContext, new GamificationRuleSet(dbContext))
    {
    }

    private GamificationService(ApplicationDbContext dbContext, GamificationRuleSet rules)
        : this(dbContext, rules, new PointsLedger(dbContext, rules))
    {
    }

    private GamificationService(ApplicationDbContext dbContext, GamificationRuleSet rules, PointsLedger ledger)
        : this(dbContext, rules, ledger, new AchievementService(dbContext, ledger))
    {
    }

    public GamificationService(ApplicationDbContext dbContext, GamificationRuleSet rules, PointsLedger ledger, AchievementService achievements)
    {
        _dbContext = dbContext;
        _rules = rules;
        _ledger = ledger;
        _achievements = achievements;
    }

    /// <summary>
    /// Pays an activity reward (lesson, challenge...). Idempotent per (student, source): the
    /// same lesson or challenge never pays twice.
    /// </summary>
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

        int divisor = Math.Max(1, await _rules.GetIntAsync(GamificationRuleKeys.ActivityCoinsPerXpDivisor, ct));
        var result = await _ledger.GrantAsync(studentId, new[]
        {
            new LedgerEntry(sourceType, sourceId, xpAmount, Math.Max(1, xpAmount / divisor), description, $"{sourceType}:{sourceId}")
        }, ct);

        await UpdateStreakInternalAsync(studentId, sourceType, ct);

        string? missionKey = sourceType switch
        {
            XpSourceType.LessonCompleted => MissionLesson,
            XpSourceType.DailyChallenge or XpSourceType.AiAdaptiveChallenge => MissionChallenge,
            _ => null
        };
        if (missionKey != null)
        {
            await AdvanceMissionAsync(studentId, missionKey, 1, ct);
        }

        // Achievements are measured from saved LMS records.
        await _dbContext.SaveChangesAsync(ct);
        var unlockedBadgeIds = await _achievements.EvaluateAsync(studentId, ct);
        await _dbContext.SaveChangesAsync(ct);

        var profile = await _dbContext.StudentXp.AsNoTracking().FirstAsync(s => s.StudentId == studentId, ct);
        return new ChallengeResultDto(
            Passed: true,
            ScorePercent: 100,
            XpEarned: result.Written.Where(e => e.SourceType == sourceType).Sum(e => e.Xp),
            CoinsEarned: result.CoinsAwarded,
            NewTotalXp: profile.TotalXp,
            NewLevel: profile.CurrentLevel,
            LevelUpOccurred: result.LevelUp,
            UnlockedBadges: unlockedBadgeIds
        );
    }

    /// <summary>
    /// Rewards an evaluated attempt using the persisted rules. Completion, pass, high-score tier
    /// and streak bonuses are paid once per assessment; an improvement bonus is paid when the
    /// attempt sets a new personal best.
    /// </summary>
    public async Task<QuizRewardResultDto> CalculateAndAwardQuizRewardAsync(
        Guid studentId,
        Guid assessmentId,
        int scorePercent,
        bool passed,
        int timeSpentSeconds,
        DifficultyLevel difficulty,
        QuizScopeType scopeType,
        List<(Guid? TopicId, string TopicName, string SkillName, bool IsCorrect)> questionOutcomes,
        CancellationToken ct = default,
        Guid? attemptId = null,
        Guid? courseId = null)
    {
        var entries = new List<LedgerEntry>();
        var awardId = attemptId ?? Guid.NewGuid();

        // 1. Completion: base XP by placement (or the Boss base) plus the difficulty bonus.
        int baseXp = difficulty == DifficultyLevel.Boss
            ? await _rules.GetIntAsync(GamificationRuleKeys.QuizBaseBoss, ct)
            : await _rules.GetIntAsync(scopeType switch
            {
                QuizScopeType.Topic => GamificationRuleKeys.QuizBaseTopic,
                QuizScopeType.ContentItem => GamificationRuleKeys.QuizBaseContentItem,
                QuizScopeType.Course => GamificationRuleKeys.QuizBaseCourse,
                _ => GamificationRuleKeys.QuizBaseModule
            }, ct);
        int diffBonus = await _rules.GetIntAsync(difficulty switch
        {
            DifficultyLevel.Easy => GamificationRuleKeys.QuizDifficultyEasy,
            DifficultyLevel.Hard => GamificationRuleKeys.QuizDifficultyHard,
            DifficultyLevel.Boss => GamificationRuleKeys.QuizDifficultyBoss,
            _ => GamificationRuleKeys.QuizDifficultyMedium
        }, ct);
        string completionKey = $"quiz-completed:{assessmentId}";
        bool isFirstCompletion = !await _ledger.WasPaidAsync(studentId, completionKey, ct);
        entries.Add(new LedgerEntry(XpSourceType.QuizCompleted, assessmentId, baseXp + diffBonus, 0,
            $"Completed {scopeType} assessment ({difficulty})", completionKey));

        // 2. Pass bonus (pass/fail is decided by the assessment's own passing score).
        if (passed)
        {
            entries.Add(new LedgerEntry(XpSourceType.PassBonus, assessmentId,
                await _rules.GetIntAsync(GamificationRuleKeys.QuizPassBonus, ct), 0,
                "Assessment pass bonus", $"quiz-passed:{assessmentId}"));
        }

        // 3. Personal best and improvement.
        var existingPb = await _dbContext.PersonalBestRecords
            .FirstOrDefaultAsync(pb => pb.StudentId == studentId && pb.AssessmentId == assessmentId, ct);
        bool isPersonalBest = existingPb == null || scorePercent > existingPb.BestScorePercent;
        int prevBest = existingPb?.BestScorePercent ?? 0;
        if (existingPb == null)
        {
            _dbContext.PersonalBestRecords.Add(new PersonalBestRecord
            {
                StudentId = studentId,
                AssessmentId = assessmentId,
                BestScorePercent = scorePercent,
                BestTimeSeconds = timeSpentSeconds,
                AchievedAt = DateTime.UtcNow
            });
        }
        else if (isPersonalBest)
        {
            int min = await _rules.GetIntAsync(GamificationRuleKeys.QuizImprovementMin, ct);
            int max = await _rules.GetIntAsync(GamificationRuleKeys.QuizImprovementMax, ct);
            int improvement = Math.Min(max, Math.Max(min, (scorePercent - prevBest) / 10 * 10));
            entries.Add(new LedgerEntry(XpSourceType.ImprovementBonus, assessmentId, improvement, 0,
                $"Personal best improvement (+{scorePercent - prevBest}%)", $"quiz-improvement:{awardId}"));
            existingPb.BestScorePercent = scorePercent;
            existingPb.BestTimeSeconds = timeSpentSeconds;
            existingPb.AchievedAt = DateTime.UtcNow;
        }

        // 4. High-score tier (highest tier reached; each tier pays once per assessment).
        if (isPersonalBest)
        {
            var tiers = new[]
            {
                ("perfect", GamificationRuleKeys.QuizHighScorePerfectThreshold, GamificationRuleKeys.QuizHighScorePerfectXp),
                ("excellent", GamificationRuleKeys.QuizHighScoreExcellentThreshold, GamificationRuleKeys.QuizHighScoreExcellentXp),
                ("great", GamificationRuleKeys.QuizHighScoreGreatThreshold, GamificationRuleKeys.QuizHighScoreGreatXp)
            };
            foreach (var (name, thresholdKey, xpKey) in tiers)
            {
                if (scorePercent >= await _rules.GetAsync(thresholdKey, ct))
                {
                    entries.Add(new LedgerEntry(XpSourceType.HighScoreBonus, assessmentId, await _rules.GetIntAsync(xpKey, ct), 0,
                        $"High score ({scorePercent}%) bonus", $"quiz-high-score:{assessmentId}:{name}"));
                    break;
                }
            }
        }

        // 5. Streak bonus, paid with the first completion of the assessment.
        var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        int currentStreak = streak?.CurrentStreak ?? 0;
        if (isFirstCompletion)
        {
            foreach (var (daysKey, xpKey) in GamificationRuleKeys.StreakTiers)
            {
                if (currentStreak >= await _rules.GetAsync(daysKey, ct))
                {
                    entries.Add(new LedgerEntry(XpSourceType.StreakBonus, assessmentId, await _rules.GetIntAsync(xpKey, ct), 0,
                        $"Active streak ({currentStreak} days) bonus", $"quiz-streak:{assessmentId}"));
                    break;
                }
            }
        }

        // Coins follow the XP this attempt actually earns: they ride on the first entry that has
        // not been paid before, so there is no separate coin row to double-count.
        var unpaid = new List<LedgerEntry>();
        foreach (var entry in entries)
        {
            if (!await _ledger.WasPaidAsync(studentId, entry.IdempotencyKey, ct)) unpaid.Add(entry);
        }
        int newXp = unpaid.Sum(e => e.Xp);
        if (newXp > 0)
        {
            int divisor = Math.Max(1, await _rules.GetIntAsync(GamificationRuleKeys.QuizCoinsPerXpDivisor, ct));
            int minimum = await _rules.GetIntAsync(GamificationRuleKeys.QuizCoinsMinimum, ct);
            unpaid[0] = unpaid[0] with { Coins = Math.Max(minimum, newXp / divisor) };
        }

        var granted = await _ledger.GrantAsync(studentId, unpaid, ct);
        int xpEarned = granted.Written.Where(e => e.SourceType != XpSourceType.LevelUp).Sum(e => e.Xp);
        int coinsEarned = granted.CoinsAwarded;

        await UpdateStreakInternalAsync(studentId, XpSourceType.QuizCompleted, ct);
        var masteryUpdates = await UpdateMasteryAsync(studentId, courseId, questionOutcomes, ct);

        int practiceCount = questionOutcomes?.Count ?? 0;
        await AdvanceMissionAsync(studentId, MissionPractice, practiceCount, ct);
        if (scorePercent >= await _rules.GetAsync(GamificationRuleKeys.MissionScoreThreshold, ct))
        {
            await AdvanceMissionAsync(studentId, MissionScore, int.MaxValue, ct);
        }

        await _dbContext.SaveChangesAsync(ct);
        var unlockedBadges = await _achievements.EvaluateAsync(studentId, ct);
        await _dbContext.SaveChangesAsync(ct);

        var profile = await _dbContext.StudentXp.AsNoTracking().FirstAsync(s => s.StudentId == studentId, ct);
        var (_, _, levelName) = GetLevelBounds(profile.CurrentLevel);
        int Paid(XpSourceType type) => granted.Written.Where(e => e.SourceType == type).Sum(e => e.Xp);

        return new QuizRewardResultDto(
            Passed: passed,
            ScorePercent: scorePercent,
            XpBreakdown: new QuizXpBreakdownDto(
                BaseXp: Paid(XpSourceType.QuizCompleted),
                DifficultyBonus: 0,
                PassBonus: Paid(XpSourceType.PassBonus),
                HighScoreBonus: Paid(XpSourceType.HighScoreBonus),
                StreakBonus: Paid(XpSourceType.StreakBonus),
                ImprovementBonus: Paid(XpSourceType.ImprovementBonus),
                TotalXpEarned: xpEarned,
                CoinsEarned: coinsEarned,
                IsPersonalBest: isPersonalBest,
                PreviousBestScorePercent: prevBest,
                CurrentScorePercent: scorePercent),
            NewTotalXp: profile.TotalXp,
            NewLevel: profile.CurrentLevel,
            LevelName: levelName,
            NewCoins: profile.Coins,
            LevelUpOccurred: granted.LevelUp,
            UnlockedBadges: unlockedBadges,
            MasteryUpdates: masteryUpdates
        );
    }

    /// <summary>Rewards completing every unit of a course (once per course).</summary>
    public async Task<ChallengeResultDto> AwardCourseCompletionAsync(Guid studentId, Guid courseId, CancellationToken ct = default)
    {
        var result = await _ledger.GrantAsync(studentId, new[]
        {
            new LedgerEntry(XpSourceType.CourseCompleted, courseId,
                await _rules.GetIntAsync(GamificationRuleKeys.CourseCompletedXp, ct),
                await _rules.GetIntAsync(GamificationRuleKeys.CourseCompletedCoins, ct),
                "Completed a course", $"course-completed:{courseId}")
        }, ct);
        await _dbContext.SaveChangesAsync(ct);
        var unlocked = await _achievements.EvaluateAsync(studentId, ct);
        await _dbContext.SaveChangesAsync(ct);

        var profile = await _dbContext.StudentXp.AsNoTracking().FirstAsync(s => s.StudentId == studentId, ct);
        return new ChallengeResultDto(true, 100, result.XpAwarded, result.CoinsAwarded, profile.TotalXp,
            profile.CurrentLevel, result.LevelUp, unlocked);
    }

    /// <summary>
    /// Mastery per (course, topic): questions answered in the course's assessments update the
    /// student's mastery for that topic (or, without a topic, the assessment).
    /// </summary>
    private async Task<List<SkillMasteryDto>> UpdateMasteryAsync(
        Guid studentId, Guid? courseId,
        List<(Guid? TopicId, string TopicName, string SkillName, bool IsCorrect)>? outcomes, CancellationToken ct)
    {
        var updates = new List<SkillMasteryDto>();
        if (outcomes == null || outcomes.Count == 0) return updates;

        foreach (var group in outcomes.GroupBy(o => (o.TopicId, TopicName: string.IsNullOrWhiteSpace(o.TopicName) ? "General" : o.TopicName)))
        {
            Guid? topicId = group.Key.TopicId.HasValue && await _dbContext.Topics.AnyAsync(t => t.Id == group.Key.TopicId.Value, ct)
                ? group.Key.TopicId
                : null;
            string topicName = group.Key.TopicName;

            var mastery = _dbContext.SkillMasteries.Local.FirstOrDefault(m => m.StudentId == studentId && m.CourseId == courseId
                    && (topicId != null ? m.TopicId == topicId : m.TopicName == topicName))
                ?? await _dbContext.SkillMasteries.FirstOrDefaultAsync(m => m.StudentId == studentId && m.CourseId == courseId
                    && (topicId != null ? m.TopicId == topicId : m.TopicId == null && m.TopicName == topicName), ct);
            if (mastery == null)
            {
                mastery = new SkillMastery
                {
                    StudentId = studentId,
                    CourseId = courseId,
                    TopicId = topicId,
                    TopicName = topicName,
                    SkillName = group.First().SkillName
                };
                _dbContext.SkillMasteries.Add(mastery);
            }

            mastery.TotalAttempts += group.Count();
            mastery.CorrectAttempts += group.Count(o => o.IsCorrect);
            mastery.MasteryPercentage = (int)Math.Round((double)mastery.CorrectAttempts / mastery.TotalAttempts * 100);
            mastery.LastAssessedAt = DateTime.UtcNow;

            updates.Add(new SkillMasteryDto(mastery.TopicId, mastery.TopicName, mastery.SkillName, mastery.MasteryPercentage,
                mastery.TotalAttempts, mastery.CorrectAttempts, mastery.LastAssessedAt,
                mastery.MasteryPercentage >= 80 ? "green" : (mastery.MasteryPercentage >= 60 ? "yellow" : "red")));
        }
        return updates;
    }

    public async Task<StudentGameDashboardDto> GetStudentDashboardAsync(Guid studentId, CancellationToken ct = default)
    {
        var profile = await GetStudentProfileAsync(studentId, ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Today's missions start at zero progress; only real LMS activity advances them.
        var missions = (await EnsureTodayMissionsAsync(studentId, ct))
            .OrderBy(m => m.MissionKey)
            .Select(m => new DailyMissionDto(
                m.Id, m.MissionKey, m.Title, m.Description, m.CurrentCount, m.TargetCount, m.IsCompleted, m.RewardXp, m.RewardCoins, m.Claimed
            ))
            .ToList();
        await _dbContext.SaveChangesAsync(ct);

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
                RewardXp: 0,
                LinkedScopeId: masteryMatrix.WeakestSkill.TopicId,
                LinkedScopeType: "Topic"
            );
        }
        else
        {
            // No weak skill on record: point the student at their next quiz without
            // inventing a target topic, module or reward.
            nextAction = new NextBestActionDto(
                ActionType: "TAKE_QUIZ",
                Title: "Keep learning",
                Description: masteryMatrix.Skills.Any()
                    ? "Your recorded skills are on track. Take your next course quiz to keep progressing."
                    : "Take a quiz in one of your courses to start tracking your skill mastery.",
                TargetTopic: null,
                Reason: masteryMatrix.Skills.Any()
                    ? "No recorded skill is below the remediation threshold."
                    : "No skill mastery has been recorded yet.",
                EstimatedTimeMinutes: 0,
                RewardXp: 0,
                LinkedScopeId: null,
                LinkedScopeType: null
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
        // 0 means "not in the top entries" rather than a fabricated position.
        int studentRank = leaderboard.FindIndex(e => e.StudentId == studentId) + 1;

        return new StudentGameDashboardDto(
            Profile: profile,
            DailyMissions: missions,
            CanClaimGrandReward: canClaimGrand,
            GrandRewardXp: await _rules.GetIntAsync(GamificationRuleKeys.MissionGrandXp, ct),
            GrandRewardCoins: await _rules.GetIntAsync(GamificationRuleKeys.MissionGrandCoins, ct),
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

        var weakest = skills.OrderBy(s => s.MasteryPercentage).FirstOrDefault();
        var strongest = skills.OrderByDescending(s => s.MasteryPercentage).FirstOrDefault();
        double avg = skills.Any() ? skills.Average(s => s.MasteryPercentage) : 0.0;

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

        var result = await _ledger.GrantAsync(studentId, new[]
        {
            new LedgerEntry(XpSourceType.DailyMissionGrandBonus, studentId,
                await _rules.GetIntAsync(GamificationRuleKeys.MissionGrandXp, ct),
                await _rules.GetIntAsync(GamificationRuleKeys.MissionGrandCoins, ct),
                "Completed all daily learning missions", $"mission-grand:{today:yyyy-MM-dd}")
        }, ct);
        await _dbContext.SaveChangesAsync(ct);

        return new ClaimDailyGrandMissionResponseDto(
            Success: true,
            Message: $"Daily mission reward claimed: +{result.XpAwarded} XP and +{result.CoinsAwarded} coins.",
            XpAwarded: result.XpAwarded,
            CoinsAwarded: result.CoinsAwarded,
            NewTotalXp: result.NewTotalXp,
            NewCoins: result.NewCoins
        );
    }

    public async Task<GamificationProfileDto> GetStudentProfileAsync(Guid studentId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == studentId, ct);
        var studentXp = await _dbContext.StudentXp.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);
        var streak = await _dbContext.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == studentId, ct);

        int totalXp = studentXp?.TotalXp ?? 0;
        int currentLevel = studentXp?.CurrentLevel ?? CalculateLevel(totalXp);
        int coins = studentXp?.Coins ?? 0;

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

        int badgesCount = await _dbContext.StudentBadges.CountAsync(sb => sb.StudentId == studentId, ct);

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
            StudentName: user?.FullName ?? string.Empty,
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
            FreezeTokensAvailable: streak?.FreezeTokensAvailable ?? new StudentStreak().FreezeTokensAvailable,
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
            .Where(e => e.CourseId == courseId && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed))
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

    private const string MissionLesson = "LESSON_COMPLETE";
    private const string MissionPractice = "PRACTICE_5_QUESTIONS";
    private const string MissionScore = "SCORE_70_QUIZ";
    private const string MissionChallenge = "AI_CHALLENGE";

    /// <summary>
    /// Returns today's mission rows for the student, creating them (tracked, unsaved) with
    /// zero progress and rule-defined rewards when they don't exist yet.
    /// </summary>
    private async Task<List<StudentDailyMission>> EnsureTodayMissionsAsync(Guid studentId, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var missions = await _dbContext.StudentDailyMissions
            .Where(m => m.StudentId == studentId && m.Date == today)
            .ToListAsync(ct);

        var pending = _dbContext.StudentDailyMissions.Local
            .Where(m => m.StudentId == studentId && m.Date == today && !missions.Contains(m))
            .ToList();
        missions.AddRange(pending);

        if (missions.Count > 0)
        {
            return missions;
        }

        int scoreThreshold = await _rules.GetIntAsync(GamificationRuleKeys.MissionScoreThreshold, ct);
        int practiceTarget = Math.Max(1, await _rules.GetIntAsync(GamificationRuleKeys.MissionPracticeTarget, ct));
        missions = new List<StudentDailyMission>
        {
            new() { StudentId = studentId, Date = today, MissionKey = MissionLesson, Title = "Complete a Lesson", Description = "Progress through any module topic", TargetCount = 1, RewardXp = await _rules.GetIntAsync(GamificationRuleKeys.MissionLessonXp, ct), RewardCoins = 0 },
            new() { StudentId = studentId, Date = today, MissionKey = MissionPractice, Title = $"Practice {practiceTarget} Questions", Description = "Solve quiz or practice questions", TargetCount = practiceTarget, RewardXp = await _rules.GetIntAsync(GamificationRuleKeys.MissionPracticeXp, ct), RewardCoins = 0 },
            new() { StudentId = studentId, Date = today, MissionKey = MissionScore, Title = $"Score {scoreThreshold}%+ in a Quiz", Description = "Demonstrate solid academic mastery", TargetCount = 1, RewardXp = await _rules.GetIntAsync(GamificationRuleKeys.MissionScoreXp, ct), RewardCoins = 0 },
            new() { StudentId = studentId, Date = today, MissionKey = MissionChallenge, Title = "Complete a Challenge", Description = "Conquer a course challenge", TargetCount = 1, RewardXp = await _rules.GetIntAsync(GamificationRuleKeys.MissionChallengeXp, ct), RewardCoins = 0 }
        };
        await _dbContext.StudentDailyMissions.AddRangeAsync(missions, ct);
        return missions;
    }

    /// <summary>Advances a mission; its reward is paid once, when it becomes complete.</summary>
    private async Task AdvanceMissionAsync(Guid studentId, string missionKey, int increment, CancellationToken ct)
    {
        if (increment <= 0) return;

        var mission = (await EnsureTodayMissionsAsync(studentId, ct)).FirstOrDefault(m => m.MissionKey == missionKey);
        if (mission == null || mission.IsCompleted) return;

        mission.CurrentCount = (int)Math.Min(mission.TargetCount, (long)mission.CurrentCount + increment);
        mission.IsCompleted = mission.CurrentCount >= mission.TargetCount;
        if (mission.IsCompleted && mission.RewardXp > 0)
        {
            await _ledger.GrantAsync(studentId, new[]
            {
                new LedgerEntry(XpSourceType.DailyMissionCompleted, studentId, mission.RewardXp, mission.RewardCoins,
                    $"Daily mission: {mission.Title}", $"mission:{mission.Date:yyyy-MM-dd}:{mission.MissionKey}")
            }, ct);
        }
    }

    public async Task<double> GetXpMultiplierAsync(CancellationToken ct = default)
        => (double)await _rules.GetAsync(GamificationRuleKeys.XpMultiplier, ct);

    /// <summary>
    /// Credits a focus session to the caller. The duration is client-reported, so it is clamped
    /// to the configured range and only a configured number of sessions per day earn XP.
    /// </summary>
    public async Task<FocusSessionResponseDto> AwardFocusSessionXpAsync(FocusSessionRequestDto request, CancellationToken ct = default)
    {
        if (!await _dbContext.Users.AnyAsync(u => u.Id == request.StudentId, ct))
        {
            return new FocusSessionResponseDto(false, 0, 0, 0, 0, "Student not found", string.Empty);
        }

        int minMinutes = await _rules.GetIntAsync(GamificationRuleKeys.FocusMinMinutes, ct);
        int maxMinutes = await _rules.GetIntAsync(GamificationRuleKeys.FocusMaxMinutes, ct);
        int minutes = Math.Clamp(request.DurationMinutes, minMinutes, Math.Max(minMinutes, maxMinutes));

        var todayStart = DateTime.UtcNow.Date;
        int sessionsToday = await _dbContext.XpTransactions.CountAsync(x => x.StudentId == request.StudentId
            && x.SourceType == XpSourceType.FocusSession && x.CreatedAt >= todayStart, ct);
        int dailyLimit = await _rules.GetIntAsync(GamificationRuleKeys.FocusDailySessionLimit, ct);

        int xpEarned = 0;
        int coinsEarned = 0;
        if (sessionsToday < dailyLimit)
        {
            decimal perMinute = await _rules.GetAsync(GamificationRuleKeys.FocusXpPerMinute, ct);
            int baseXp = (int)Math.Round(minutes * perMinute);
            if (minutes >= await _rules.GetIntAsync(GamificationRuleKeys.FocusLongThreshold, ct))
                baseXp += await _rules.GetIntAsync(GamificationRuleKeys.FocusLongBonus, ct);
            else if (minutes >= await _rules.GetIntAsync(GamificationRuleKeys.FocusMediumThreshold, ct))
                baseXp += await _rules.GetIntAsync(GamificationRuleKeys.FocusMediumBonus, ct);

            int divisor = Math.Max(1, await _rules.GetIntAsync(GamificationRuleKeys.ActivityCoinsPerXpDivisor, ct));
            var sessionId = Guid.NewGuid();
            var result = await _ledger.GrantAsync(request.StudentId, new[]
            {
                new LedgerEntry(XpSourceType.FocusSession, sessionId, baseXp, Math.Max(1, baseXp / divisor),
                    $"Focus session ({minutes}m): {request.TopicOrTask}", $"focus:{sessionId}")
            }, ct);
            xpEarned = result.Written.Where(e => e.SourceType == XpSourceType.FocusSession).Sum(e => e.Xp);
            coinsEarned = result.CoinsAwarded;
        }

        await UpdateStreakInternalAsync(request.StudentId, XpSourceType.FocusSession, ct);
        _dbContext.StreakHistories.Add(new StreakHistory
        {
            StudentId = request.StudentId,
            ActivityDate = DateOnly.FromDateTime(DateTime.UtcNow),
            ActivityType = "DeepFocusSession"
        });
        await _dbContext.SaveChangesAsync(ct);

        var profile = await _dbContext.StudentXp.AsNoTracking().FirstOrDefaultAsync(s => s.StudentId == request.StudentId, ct);
        var streak = await _dbContext.StudentStreaks.AsNoTracking().FirstOrDefaultAsync(s => s.StudentId == request.StudentId, ct);
        string artifactName = minutes >= 45 ? "💎 Ancient Focus Crystal" : (minutes >= 25 ? "🌳 Golden Oak Sapling" : "🌱 Emerald Sprout");

        return new FocusSessionResponseDto(
            Success: true,
            XpAwarded: xpEarned,
            CoinsAwarded: coinsEarned,
            NewTotalXp: profile?.TotalXp ?? 0,
            NewStreak: streak?.CurrentStreak ?? 0,
            Message: xpEarned > 0
                ? $"Focus session completed! +{xpEarned} XP and +{coinsEarned} Coins awarded."
                : $"Focus session recorded. The daily limit of {dailyLimit} rewarded sessions has been reached.",
            FocusArtifactAwarded: artifactName
        );
    }
}
