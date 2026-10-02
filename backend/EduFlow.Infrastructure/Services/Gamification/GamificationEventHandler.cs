using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Enums;
using EduFlow.Core.Events;
using EduFlow.Core.Interfaces;

namespace EduFlow.Infrastructure.Services.Gamification;

/// <summary>
/// Gamification reacts to LMS events; it is never called directly by academic code. Each
/// handler pays through the idempotent points ledger, so replayed events never pay twice.
/// </summary>
public class GamificationEventHandler :
    IDomainEventHandler<AssessmentEvaluated>,
    IDomainEventHandler<LessonCompleted>,
    IDomainEventHandler<ChallengeCompleted>,
    IDomainEventHandler<CourseCompleted>
{
    private readonly IGamificationService _gamificationService;

    public GamificationEventHandler(IGamificationService gamificationService)
    {
        _gamificationService = gamificationService;
    }

    public async Task<object?> HandleAsync(AssessmentEvaluated e, CancellationToken ct = default)
        => await _gamificationService.CalculateAndAwardQuizRewardAsync(
            studentId: e.StudentId,
            assessmentId: e.AssessmentId,
            scorePercent: (int)System.Math.Round(e.Percentage),
            passed: e.Passed,
            timeSpentSeconds: e.TimeSpentSeconds,
            difficulty: e.Difficulty,
            scopeType: e.ScopeType,
            questionOutcomes: e.AnswerCorrectness.Select(c => (e.TopicId, e.AssessmentTitle, e.AssessmentTitle, c)).ToList(),
            ct: ct,
            attemptId: e.AttemptId,
            courseId: e.CourseId);

    public async Task<object?> HandleAsync(LessonCompleted e, CancellationToken ct = default)
        => e.XpReward > 0
            ? await _gamificationService.AwardXpAsync(e.StudentId, XpSourceType.LessonCompleted, e.ContentItemId,
                e.XpReward, $"Completed lesson: {e.Title}", ct)
            : null;

    public async Task<object?> HandleAsync(ChallengeCompleted e, CancellationToken ct = default)
        => e.XpReward > 0
            ? await _gamificationService.AwardXpAsync(e.StudentId, XpSourceType.DailyChallenge, e.ChallengeId,
                e.XpReward, $"Completed challenge: {e.Title}", ct)
            : null;

    public async Task<object?> HandleAsync(CourseCompleted e, CancellationToken ct = default)
        => await _gamificationService.AwardCourseCompletionAsync(e.StudentId, e.CourseId, ct);
}
