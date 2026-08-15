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
    int Streak
);
