using System;
using System.Collections.Generic;

namespace EduFlow.Core.Constants;

/// <summary>
/// Keys of the persisted gamification rules and the values the GamificationRules table is
/// seeded with. Runtime code reads the table only; the defaults just initialize it.
/// </summary>
public static class GamificationRuleKeys
{
    // Assessment completion (paid once per student and assessment)
    public const string QuizBaseTopic = "quiz.base.topic";
    public const string QuizBaseContentItem = "quiz.base.content-item";
    public const string QuizBaseModule = "quiz.base.module";
    public const string QuizBaseCourse = "quiz.base.course";
    public const string QuizBaseBoss = "quiz.base.boss";
    public const string QuizDifficultyEasy = "quiz.difficulty.easy";
    public const string QuizDifficultyMedium = "quiz.difficulty.medium";
    public const string QuizDifficultyHard = "quiz.difficulty.hard";
    public const string QuizDifficultyBoss = "quiz.difficulty.boss";

    // Passing (once per assessment)
    public const string QuizPassBonus = "quiz.pass.bonus";

    // High-score tiers: threshold percentage and XP (once per assessment and tier)
    public const string QuizHighScorePerfectThreshold = "quiz.high-score.perfect.threshold";
    public const string QuizHighScorePerfectXp = "quiz.high-score.perfect.xp";
    public const string QuizHighScoreExcellentThreshold = "quiz.high-score.excellent.threshold";
    public const string QuizHighScoreExcellentXp = "quiz.high-score.excellent.xp";
    public const string QuizHighScoreGreatThreshold = "quiz.high-score.great.threshold";
    public const string QuizHighScoreGreatXp = "quiz.high-score.great.xp";

    // Streak bonus on first completion of an assessment: minimum streak days and XP
    public static readonly IReadOnlyList<(string DaysKey, string XpKey)> StreakTiers = new[]
    {
        ("quiz.streak.tier1.days", "quiz.streak.tier1.xp"),
        ("quiz.streak.tier2.days", "quiz.streak.tier2.xp"),
        ("quiz.streak.tier3.days", "quiz.streak.tier3.xp"),
        ("quiz.streak.tier4.days", "quiz.streak.tier4.xp"),
        ("quiz.streak.tier5.days", "quiz.streak.tier5.xp")
    };

    // Personal-best improvement bonus: XP per full 10 points of improvement, clamped
    public const string QuizImprovementMin = "quiz.improvement.min-xp";
    public const string QuizImprovementMax = "quiz.improvement.max-xp";

    // Coins
    public const string QuizCoinsPerXpDivisor = "coins.quiz.xp-divisor";
    public const string QuizCoinsMinimum = "coins.quiz.minimum";
    public const string ActivityCoinsPerXpDivisor = "coins.activity.xp-divisor";
    public const string LevelUpCoinsPerLevel = "coins.level-up.per-level";

    // Course completion
    public const string CourseCompletedXp = "course.completed.xp";
    public const string CourseCompletedCoins = "course.completed.coins";

    // Daily missions
    public const string MissionLessonXp = "mission.lesson.xp";
    public const string MissionPracticeXp = "mission.practice.xp";
    public const string MissionPracticeTarget = "mission.practice.target";
    public const string MissionScoreXp = "mission.score.xp";
    public const string MissionScoreThreshold = "mission.score.threshold";
    public const string MissionChallengeXp = "mission.challenge.xp";
    public const string MissionGrandXp = "mission.grand.xp";
    public const string MissionGrandCoins = "mission.grand.coins";

    // Focus sessions (duration is client-reported, so it is capped)
    public const string FocusXpPerMinute = "focus.xp-per-minute";
    public const string FocusMinMinutes = "focus.min-minutes";
    public const string FocusMaxMinutes = "focus.max-minutes";
    public const string FocusLongThreshold = "focus.long.threshold-minutes";
    public const string FocusLongBonus = "focus.long.bonus-xp";
    public const string FocusMediumThreshold = "focus.medium.threshold-minutes";
    public const string FocusMediumBonus = "focus.medium.bonus-xp";
    public const string FocusDailySessionLimit = "focus.daily-session-limit";

    // Platform-wide XP multiplier applied to every XP award
    public const string XpMultiplier = "xp.multiplier";

    public static readonly IReadOnlyList<(string Key, decimal Value, string Description)> Defaults = new[]
    {
        (QuizBaseTopic, 30m, "XP for first completing a topic-level assessment"),
        (QuizBaseContentItem, 35m, "XP for first completing a content-item assessment"),
        (QuizBaseModule, 75m, "XP for first completing a module-level assessment"),
        (QuizBaseCourse, 150m, "XP for first completing a course-level assessment"),
        (QuizBaseBoss, 200m, "XP for first completing a Boss-difficulty assessment (replaces the scope base)"),
        (QuizDifficultyEasy, 0m, "Extra XP for an Easy assessment"),
        (QuizDifficultyMedium, 10m, "Extra XP for a Medium assessment"),
        (QuizDifficultyHard, 20m, "Extra XP for a Hard assessment"),
        (QuizDifficultyBoss, 30m, "Extra XP for a Boss assessment"),
        (QuizPassBonus, 20m, "XP for first passing an assessment"),
        (QuizHighScorePerfectThreshold, 100m, "Score (%) for the perfect tier"),
        (QuizHighScorePerfectXp, 40m, "XP for reaching the perfect tier"),
        (QuizHighScoreExcellentThreshold, 90m, "Score (%) for the excellent tier"),
        (QuizHighScoreExcellentXp, 20m, "XP for reaching the excellent tier"),
        (QuizHighScoreGreatThreshold, 80m, "Score (%) for the great tier"),
        (QuizHighScoreGreatXp, 10m, "XP for reaching the great tier"),
        ("quiz.streak.tier1.days", 30m, "Streak days for tier 1"),
        ("quiz.streak.tier1.xp", 150m, "XP for tier 1 streak"),
        ("quiz.streak.tier2.days", 14m, "Streak days for tier 2"),
        ("quiz.streak.tier2.xp", 60m, "XP for tier 2 streak"),
        ("quiz.streak.tier3.days", 7m, "Streak days for tier 3"),
        ("quiz.streak.tier3.xp", 30m, "XP for tier 3 streak"),
        ("quiz.streak.tier4.days", 3m, "Streak days for tier 4"),
        ("quiz.streak.tier4.xp", 10m, "XP for tier 4 streak"),
        ("quiz.streak.tier5.days", 1m, "Streak days for tier 5"),
        ("quiz.streak.tier5.xp", 5m, "XP for tier 5 streak"),
        (QuizImprovementMin, 10m, "Minimum personal-best improvement XP"),
        (QuizImprovementMax, 50m, "Maximum personal-best improvement XP"),
        (QuizCoinsPerXpDivisor, 4m, "Assessment coins = XP / divisor"),
        (QuizCoinsMinimum, 5m, "Minimum coins for an assessment award"),
        (ActivityCoinsPerXpDivisor, 5m, "Lesson/challenge coins = XP / divisor (at least 1)"),
        (LevelUpCoinsPerLevel, 50m, "Coins on level-up = new level x value"),
        (CourseCompletedXp, 300m, "XP for completing every unit of a course"),
        (CourseCompletedCoins, 50m, "Coins for completing a course"),
        (MissionLessonXp, 20m, "XP for the daily 'complete a lesson' mission"),
        (MissionPracticeXp, 15m, "XP for the daily practice-questions mission"),
        (MissionPracticeTarget, 5m, "Questions answered for the practice mission"),
        (MissionScoreXp, 30m, "XP for the daily high-score mission"),
        (MissionScoreThreshold, 70m, "Score (%) needed for the high-score mission"),
        (MissionChallengeXp, 50m, "XP for the daily challenge mission"),
        (MissionGrandXp, 150m, "XP for claiming all daily missions"),
        (MissionGrandCoins, 30m, "Coins for claiming all daily missions"),
        (FocusXpPerMinute, 1.5m, "Focus session XP per minute"),
        (FocusMinMinutes, 5m, "Minimum minutes credited for a focus session"),
        (FocusMaxMinutes, 120m, "Maximum minutes credited for a focus session"),
        (FocusLongThreshold, 45m, "Minutes for the long-session bonus"),
        (FocusLongBonus, 20m, "Long-session bonus XP"),
        (FocusMediumThreshold, 25m, "Minutes for the medium-session bonus"),
        (FocusMediumBonus, 10m, "Medium-session bonus XP"),
        (FocusDailySessionLimit, 6m, "Focus sessions rewarded per day"),
        (XpMultiplier, 1m, "Platform-wide XP multiplier (1 = off)")
    };

    /// <summary>Deterministic seed id for a rule key (stable across environments).</summary>
    public static Guid SeedId(int index) => new($"6a0e1c00-0000-4000-8000-{index + 1:D12}");
}
