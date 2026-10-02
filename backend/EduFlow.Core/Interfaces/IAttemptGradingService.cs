using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Evaluation;

namespace EduFlow.Core.Interfaces;

/// <param name="Reward">XP awarded when the attempt became fully evaluated; null while marking is pending.</param>
public record GradedAttempt(
    Submission Attempt,
    IReadOnlyList<AnswerOutcome> Outcomes,
    AttemptMarks Marks,
    QuizRewardResultDto? Reward);

public enum ManualMarkError
{
    None,
    AttemptNotFound,
    AnswerNotFound,
    NotAllowed,
    MarksOutOfRange,
    ReasonRequired,
    AttemptNotSubmitted
}

public record ManualMarkResult(ManualMarkError Error, string Message, Submission? Attempt = null, AttemptMarks? Marks = null)
{
    public bool Succeeded => Error == ManualMarkError.None;
}

/// <summary>
/// Persists marking. Submission, mark calculation, attempt status and XP for a fully
/// evaluated attempt are committed in one transaction.
/// </summary>
public interface IAttemptGradingService
{
    /// <summary>
    /// Marks the answers, completes the attempt (Evaluated, or Evaluating while subjective
    /// answers await marking) and awards XP once the attempt is fully evaluated.
    /// </summary>
    Task<GradedAttempt> SubmitAsync(
        Assessment assessment,
        Submission attempt,
        bool isNewAttempt,
        IReadOnlyDictionary<Guid, string> answers,
        CancellationToken ct = default);

    /// <summary>
    /// Records an instructor's mark for one answer: the first mark of an answer awaiting review,
    /// or an override of an existing mark (which requires a reason). Every change is kept as a
    /// <see cref="MarkAdjustment"/> and audited.
    /// </summary>
    Task<ManualMarkResult> MarkAnswerAsync(
        Guid attemptId,
        Guid questionId,
        int awardedMarks,
        string? feedback,
        string? reason,
        Guid actorId,
        string actorRole,
        CancellationToken ct = default);
}
