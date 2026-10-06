using System;
using System.Collections.Generic;
using EduFlow.Core.Enums;

namespace EduFlow.Core.Evaluation;

/// <summary>
/// Immutable copy of a question and its answer key exactly as it was when an answer was
/// marked. Stored with every submitted answer so results stay reproducible after edits.
/// </summary>
public sealed record QuestionSnapshot(
    Guid QuestionId,
    QuestionType Type,
    string Prompt,
    IReadOnlyList<string> Options,
    IReadOnlyList<string> CorrectAnswers,
    int MaxMarks,
    string Explanation,
    QuestionMarkingRules Rules);

/// <summary>Per-question marking configuration read from question metadata.</summary>
/// <param name="PartialCredit">Matching/MultipleSelect: award marks in proportion to correct parts.</param>
/// <param name="NumericTolerance">Numerical: maximum absolute difference still marked correct.</param>
public sealed record QuestionMarkingRules(bool PartialCredit = false, decimal NumericTolerance = 0m)
{
    public static QuestionMarkingRules Default { get; } = new();
}

/// <summary>Result of marking one answer. Marks are always within 0..MaxMarks.</summary>
public sealed record QuestionEvaluationResult(
    int AwardedMarks,
    int MaxMarks,
    bool IsCorrect,
    string Feedback,
    EvaluationMethod Method,
    AnswerEvaluationStatus Status)
{
    public static QuestionEvaluationResult Deterministic(int awarded, int max, string feedback)
        => new(Math.Clamp(awarded, 0, max), max, awarded >= max && max > 0, feedback,
            EvaluationMethod.Deterministic, AnswerEvaluationStatus.Evaluated);

    /// <summary>Subjective answers are never guessed: they wait for AI or instructor marking.</summary>
    public static QuestionEvaluationResult AwaitingReview(int max)
        => new(0, max, false, "Awaiting marking.", EvaluationMethod.Manual, AnswerEvaluationStatus.NeedsReview);
}

/// <summary>One evaluated answer within an attempt.</summary>
public sealed record AnswerOutcome(QuestionSnapshot Question, string StudentAnswer, QuestionEvaluationResult Result);

/// <summary>Marks for a whole attempt, derived only from its answer outcomes.</summary>
public sealed record AttemptMarks(int ObtainedMarks, int TotalMarks, double Percentage, int PendingReviewCount)
{
    public bool IsFullyEvaluated => PendingReviewCount == 0;
}
