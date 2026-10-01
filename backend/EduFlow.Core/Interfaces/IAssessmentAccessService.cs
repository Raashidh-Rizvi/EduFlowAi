using System;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Entities;

namespace EduFlow.Core.Interfaces;

/// <summary>Why a learner may not start or submit an attempt.</summary>
public enum AttemptDenialReason
{
    None,
    NotEnrolled,
    NotPublished,
    Closed,
    AttemptLimitReached,
    AttemptNotFound,
    AttemptNotOpen
}

/// <param name="AttemptsUsed">Non-cancelled attempts the student already has for this assessment.</param>
/// <param name="AttemptsAllowed">Configured limit; 0 or less means unlimited.</param>
public record AttemptEligibility(
    AttemptDenialReason Reason,
    string Message,
    int AttemptsUsed,
    int AttemptsAllowed)
{
    public bool IsAllowed => Reason == AttemptDenialReason.None;
}

/// <summary>
/// Server-side authority for who may see an assessment and who may attempt it.
/// Identity always comes from the authenticated caller, never from the request body.
/// </summary>
public interface IAssessmentAccessService
{
    /// <summary>True for an Admin or the instructor who owns the assessment's course.</summary>
    Task<bool> CanManageCourseAsync(Guid courseId, Guid userId, string role, CancellationToken ct = default);

    /// <summary>
    /// True when the caller may view a course's learner-facing assessments: managers,
    /// or students whose enrollment grants access and whose payment gate is satisfied.
    /// </summary>
    Task<bool> HasLearnerAccessAsync(Guid courseId, Guid userId, string role, CancellationToken ct = default);

    /// <summary>
    /// Evaluates, in order: enrollment, published status, availability window and, when
    /// <paramref name="startsNewAttempt"/> is true, the attempt limit.
    /// </summary>
    Task<AttemptEligibility> CheckAttemptEligibilityAsync(
        Assessment assessment, Guid studentId, bool startsNewAttempt = true, CancellationToken ct = default);
}
