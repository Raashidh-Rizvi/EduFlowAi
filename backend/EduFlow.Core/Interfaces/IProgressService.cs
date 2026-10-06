using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Entities;

namespace EduFlow.Core.Interfaces;

public record ModuleProgress(
    Guid ModuleId,
    string Title,
    int OrderIndex,
    int TotalContentItems,
    int CompletedContentItems,
    int TotalAssessments,
    int PassedAssessments,
    decimal Percentage,
    bool IsComplete);

public record CourseProgress(
    Guid CourseId,
    Guid StudentId,
    IReadOnlyList<ModuleProgress> Modules,
    int TotalUnits,
    int CompletedUnits,
    decimal Percentage,
    bool IsComplete);

/// <summary>
/// The single progress formula. A course's learning units are its published content items
/// and published assessments. A content item counts once the student has completed it; an
/// assessment counts once the student has an evaluated, passing attempt. Module and course
/// percentages are completed units over total units.
/// </summary>
public interface IProgressService
{
    /// <summary>Calculates progress from persisted activity (read-only).</summary>
    Task<CourseProgress> CalculateAsync(Guid courseId, Guid studentId, CancellationToken ct = default);

    /// <summary>
    /// Calculates progress for several courses with a fixed number of queries (read-only).
    /// Every requested course id is present in the result.
    /// </summary>
    Task<IReadOnlyDictionary<Guid, CourseProgress>> CalculateManyAsync(
        IReadOnlyCollection<Guid> courseIds, Guid studentId, CancellationToken ct = default);

    /// <summary>
    /// Recalculates progress and stages it on the student's enrollment (the cached
    /// ProgressPercentage, and completion once every unit is done). The caller saves.
    /// Returns null when the student has no enrollment in the course.
    /// </summary>
    Task<CourseProgress?> RefreshEnrollmentAsync(Guid courseId, Guid studentId, CancellationToken ct = default);

    /// <summary>
    /// Batch form of <see cref="RefreshEnrollmentAsync"/> for already-tracked enrollments of one
    /// student. Only enrollments whose cached progress or completion actually changes are
    /// modified, so a caller with nothing to stage issues no writes. The caller saves.
    /// Returns progress keyed by course id.
    /// </summary>
    Task<IReadOnlyDictionary<Guid, CourseProgress>> RefreshEnrollmentsAsync(
        Guid studentId, IReadOnlyCollection<Enrollment> enrollments, CancellationToken ct = default);
}
