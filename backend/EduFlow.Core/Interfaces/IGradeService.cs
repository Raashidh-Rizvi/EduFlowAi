using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;

namespace EduFlow.Core.Interfaces;

public record GradeBandInput(string Label, decimal MinPercentage);

public record AssessmentWeightInput(Guid AssessmentId, decimal? WeightPercent);

/// <param name="Bands">Custom bands for this course; null keeps the current policy.</param>
public record GradingConfigurationInput(
    AttemptScoringRule AttemptScoring,
    IReadOnlyList<AssessmentWeightInput> Weights,
    IReadOnlyList<GradeBandInput>? Bands = null);

public enum GradingError
{
    None,
    CourseNotFound,
    NotConfigured,
    InvalidWeights,
    InvalidBands,
    WeightsDoNotTotal100,
    UnknownGrade,
    ReasonRequired,
    ResultNotFound
}

public record GradingOperationResult(GradingError Error, string Message, IReadOnlyList<string>? Details = null)
{
    public static GradingOperationResult Ok(string message = "") => new(GradingError.None, message);
    public bool Succeeded => Error == GradingError.None;
}

/// <summary>
/// The single authority for course grades: weighted assessment results mapped through the
/// course's persisted grading policy. Course results are derived, never client-written.
/// </summary>
public interface IGradeService
{
    /// <summary>
    /// Recalculates and stages (does not save) the student's course result. Returns null when the
    /// course has no active grading configuration.
    /// </summary>
    Task<CourseResult?> RecalculateAsync(Guid courseId, Guid studentId, CancellationToken ct = default);

    /// <summary>Recalculates every student who is enrolled or has attempts in the course; saves.</summary>
    Task RecalculateCourseAsync(Guid courseId, CancellationToken ct = default);

    /// <summary>The course's configuration (creating a Draft one on the institution default if missing).</summary>
    Task<CourseGradingConfiguration?> GetOrCreateConfigurationAsync(Guid courseId, CancellationToken ct = default);

    /// <summary>Saves policy, attempt rule and weights. Draft weights may total less than 100.</summary>
    Task<GradingOperationResult> SaveConfigurationAsync(Guid courseId, GradingConfigurationInput input, Guid actorId, string actorRole, CancellationToken ct = default);

    /// <summary>Activates grading; requires weights totalling exactly 100.</summary>
    Task<GradingOperationResult> ActivateAsync(Guid courseId, Guid actorId, string actorRole, CancellationToken ct = default);

    /// <summary>Sets (or with a null grade, clears) a manual grade override. A reason is mandatory.</summary>
    Task<GradingOperationResult> OverrideGradeAsync(Guid courseId, Guid studentId, string? grade, string? reason, Guid actorId, string actorRole, CancellationToken ct = default);

    /// <summary>Validates a set of grade bands (non-empty, unique labels/thresholds, lowest band at 0).</summary>
    IReadOnlyList<string> ValidateBands(IReadOnlyList<GradeBandInput> bands);

    /// <summary>The label of the highest band whose minimum is at or below <paramref name="percentage"/>.</summary>
    string ResolveGrade(IEnumerable<GradeBand> bands, decimal percentage);
}
