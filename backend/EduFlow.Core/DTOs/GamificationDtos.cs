using System;
using System.Collections.Generic;
using EduFlow.Core.Enums;

namespace EduFlow.Core.DTOs;

public record GamificationProfileDto(
    Guid StudentId,
    string StudentName,
    int TotalXp,
    int CurrentLevel,
    string LevelName,
    int MinXpForCurrentLevel,
    int MaxXpForNextLevel,
    int XpProgressInCurrentLevel,
    int XpRequiredForNextLevel,
    int Coins,
    int CurrentStreak,
    int LongestStreak,
    int FreezeTokensAvailable,
    int BadgesCount,
    List<BadgeDto> RecentBadges,
    List<DailyChallengeDto> ActiveDailyMissions
);

public record XpTransactionDto(
    Guid Id,
    XpSourceType SourceType,
    int XpAmount,
    string Description,
    DateTime CreatedAt
);

public record BadgeDto(
    string Id,
    string Title,
    string Description,
    string IconUrl,
    BadgeCategory Category,
    int XpBonus,
    bool IsUnlocked,
    DateTime? UnlockedAt
);

public record DailyChallengeDto(
    Guid ChallengeId,
    string Title,
    string Description,
    DifficultyLevel Difficulty,
    ChallengeType Type,
    int XpReward,
    int CoinReward,
    int TimeLimitMinutes,
    ChallengeStatus Status,
    DateTime ExpiresAt
);

public record DailyMissionDto(
    Guid Id,
    string MissionKey,
    string Title,
    string Description,
    int CurrentCount,
    int TargetCount,
    bool IsCompleted,
    int RewardXp,
    int RewardCoins,
    bool Claimed
);

public record ClaimDailyGrandMissionResponseDto(
    bool Success,
    string Message,
    int XpAwarded,
    int CoinsAwarded,
    int NewTotalXp,
    int NewCoins
);

public record SkillMasteryDto(
    Guid? TopicId,
    string TopicName,
    string SkillName,
    int MasteryPercentage,
    int TotalAttempts,
    int CorrectAttempts,
    DateTime LastAssessedAt,
    string StatusColor // "green" | "yellow" | "red"
);

public record TopicMasteryMatrixDto(
    Guid StudentId,
    List<SkillMasteryDto> Skills,
    SkillMasteryDto? WeakestSkill,
    SkillMasteryDto? StrongestSkill,
    double OverallMasteryPercent
);

public record PersonalBestDto(
    Guid AssessmentId,
    string AssessmentTitle,
    int BestScorePercent,
    int BestTimeSeconds,
    DateTime AchievedAt
);

public record NextBestActionDto(
    string ActionType, // TAKE_REMEDIATION_QUIZ, TAKE_BOSS_CHALLENGE, WATCH_LESSON, REVIEW_TOPIC, DO_CHALLENGE, REST
    string Title,
    string Description,
    string TargetTopic,
    string Reason,
    int EstimatedTimeMinutes,
    int RewardXp,
    Guid? LinkedScopeId,
    string LinkedScopeType // "Topic" | "Module" | "Course"
);

public record QuizXpBreakdownDto(
    int BaseXp,
    int DifficultyBonus,
    int PassBonus,
    int HighScoreBonus,
    int StreakBonus,
    int ImprovementBonus,
    int TotalXpEarned,
    int CoinsEarned,
    bool IsPersonalBest,
    int PreviousBestScorePercent,
    int CurrentScorePercent
);

public record QuizRewardResultDto(
    bool Passed,
    int ScorePercent,
    QuizXpBreakdownDto XpBreakdown,
    int NewTotalXp,
    int NewLevel,
    string LevelName,
    int NewCoins,
    bool LevelUpOccurred,
    List<string> UnlockedBadges,
    List<SkillMasteryDto> MasteryUpdates
);

public record StudentGameDashboardDto(
    GamificationProfileDto Profile,
    List<DailyMissionDto> DailyMissions,
    bool CanClaimGrandReward,
    int GrandRewardXp,
    int GrandRewardCoins,
    bool GrandRewardClaimed,
    TopicMasteryMatrixDto MasteryMatrix,
    NextBestActionDto NextBestAction,
    List<PersonalBestDto> PersonalBests,
    List<LeaderboardEntryDto> TopLeaderboard,
    int StudentRank
);

public record SubmitChallengeRequest(
    Guid ChallengeId,
    List<ChallengeAnswerItem> Answers
);

public record ChallengeAnswerItem(
    int QuestionIndex,
    string SelectedAnswer
);

public record ChallengeResultDto(
    bool Passed,
    int ScorePercent,
    int XpEarned,
    int CoinsEarned,
    int NewTotalXp,
    int NewLevel,
    bool LevelUpOccurred,
    List<string> UnlockedBadges
);

public record LeaderboardEntryDto(
    int Rank,
    Guid StudentId,
    string StudentName,
    string? AvatarUrl,
    int ScoreXp,
    int Level,
    int Streak,
    bool IsCurrentStudent = false
);

public record SquadMemberDto(
    Guid StudentId,
    string StudentName,
    string? AvatarUrl,
    TeamRole Role,
    int TotalXp,
    DateTime JoinedAt
);

public record SquadDto(
    Guid Id,
    string Name,
    string Description,
    string? AvatarUrl,
    Guid LeaderId,
    string LeaderName,
    int MemberCount,
    int CombinedXp,
    List<SquadMemberDto> Members,
    DateTime CreatedAt
);

public record SquadLeaderboardEntryDto(
    int Rank,
    Guid SquadId,
    string Name,
    string? AvatarUrl,
    int MemberCount,
    int CombinedXp
);

public record CreateSquadRequest(
    string Name,
    string? Description
);

public record SquadActionResultDto(
    bool Success,
    string Message,
    SquadDto? Squad
);
