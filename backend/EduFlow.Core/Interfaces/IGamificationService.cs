using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Enums;

namespace EduFlow.Core.Interfaces;

public interface IGamificationService
{
    Task<ChallengeResultDto> AwardXpAsync(Guid studentId, XpSourceType sourceType, Guid sourceId, int xpAmount, string description, CancellationToken ct = default);
    Task<QuizRewardResultDto> CalculateAndAwardQuizRewardAsync(
        Guid studentId, 
        Guid assessmentId, 
        int scorePercent, 
        int timeSpentSeconds, 
        DifficultyLevel difficulty, 
        QuizScopeType scopeType, 
        List<(Guid? TopicId, string TopicName, string SkillName, bool IsCorrect)> questionOutcomes,
        CancellationToken ct = default
    );
    Task<StudentGameDashboardDto> GetStudentDashboardAsync(Guid studentId, CancellationToken ct = default);
    Task<TopicMasteryMatrixDto> GetSkillMasteryMatrixAsync(Guid studentId, CancellationToken ct = default);
    Task<ClaimDailyGrandMissionResponseDto> ClaimDailyMissionGrandRewardAsync(Guid studentId, CancellationToken ct = default);
    Task<GamificationProfileDto> GetStudentProfileAsync(Guid studentId, CancellationToken ct = default);
    Task<List<XpTransactionDto>> GetStudentXpLedgerAsync(Guid studentId, int limit = 50, CancellationToken ct = default);
    Task<List<BadgeDto>> GetAllBadgesAsync(Guid? studentId = null, CancellationToken ct = default);
    Task<bool> UseStreakFreezeAsync(Guid studentId, CancellationToken ct = default);
    Task<List<LeaderboardEntryDto>> GetWeeklyLeaderboardAsync(int top = 20, CancellationToken ct = default);
    Task<List<LeaderboardEntryDto>> GetCourseLeaderboardAsync(Guid courseId, int top = 20, CancellationToken ct = default);
    Task<List<LeaderboardEntryDto>> GetGlobalLeaderboardAsync(int top = 20, CancellationToken ct = default);
    int CalculateLevel(int totalXp);
    (int MinXp, int MaxXp, string LevelName) GetLevelBounds(int level);
}
