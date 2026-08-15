using System;
using EduFlow.Core.Enums;

namespace EduFlow.Core.Events;

public record XpEarnedEvent(
    Guid StudentId, 
    XpSourceType SourceType, 
    Guid SourceId, 
    int XpAmount, 
    int NewTotalXp, 
    int CurrentLevel
);

public record LevelUpEvent(
    Guid StudentId, 
    int OldLevel, 
    int NewLevel, 
    string LevelName, 
    int BonusCoins
);

public record BadgeUnlockedEvent(
    Guid StudentId, 
    string BadgeId, 
    string BadgeTitle, 
    int XpBonus
);

public record StreakUpdatedEvent(
    Guid StudentId, 
    int CurrentStreak, 
    int LongestStreak, 
    bool IsMilestone
);

public record QuizCompletedEvent(
    Guid StudentId, 
    Guid QuizId, 
    int Score, 
    int MaxScore, 
    bool Passed, 
    int XpEarned
);

public record ChallengeCompletedEvent(
    Guid StudentId, 
    Guid ChallengeId, 
    int XpEarned, 
    int CoinsEarned, 
    DifficultyLevel Difficulty
);
