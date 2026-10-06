using System;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Entities;

namespace EduFlow.Core.Interfaces;

/// <param name="Attempt">The open attempt, or null when <paramref name="Eligibility"/> denies it.</param>
/// <param name="IsNew">True when the attempt was created by this call and is not yet saved.</param>
public record AttemptResolution(Submission? Attempt, AttemptEligibility Eligibility, bool IsNew = false)
{
    public bool IsAllowed => Attempt != null && Eligibility.IsAllowed;
}

/// <summary>
/// Owns the attempt lifecycle (InProgress, Submitted, Evaluated). All eligibility rules
/// are delegated to <see cref="IAssessmentAccessService"/>.
/// </summary>
public interface IAttemptService
{
    /// <summary>Resumes the student's open attempt, or creates and saves a new one.</summary>
    Task<AttemptResolution> StartOrResumeAsync(Assessment assessment, Guid studentId, CancellationToken ct = default);

    /// <summary>
    /// Returns the attempt a submission completes: the given open attempt, the student's open
    /// attempt, or (for clients that never called /start) a new unsaved attempt.
    /// </summary>
    Task<AttemptResolution> ResolveForSubmissionAsync(Assessment assessment, Guid studentId, Guid? attemptId, CancellationToken ct = default);
}
