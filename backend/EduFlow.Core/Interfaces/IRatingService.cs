using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Enums;

namespace EduFlow.Core.Interfaces;

/// <summary>
/// Single source of truth for every student-rating calculation in EduFlow.
///
/// CALCULATION METHOD (documented in docs/current/RATINGS_AND_REVIEWS.md):
///
///   Course average rating = round( sum(approved ratings of the course) / N, 2 )
///       where N = number of reviews of that course with Status == Approved.
///       N == 0 => average 0.0 (no rating is fabricated).
///
///   Instructor aggregate rating = round( sum over the instructor's PUBLISHED courses
///                                        of sum(approved ratings) / N_total, 2 )
///       i.e. the review-weighted mean (micro-average): each course's mean is weighted
///       by its approved review count, so a course with 1 review cannot out-weigh a
///       course with 40 reviews. Only published courses and approved reviews count.
///
/// The denormalized <c>Course.AverageRating</c> / <c>Course.RatingCount</c> columns are
/// always RECOMPUTED from the source review rows by <see cref="RecalculateCourseAsync"/>;
/// they are never incremented, so they cannot drift away from the real data.
/// </summary>
public interface IRatingService
{
    /// <summary>Approved-only rating summary for a single course, read from the review rows.</summary>
    Task<CourseRatingSummary> GetCourseSummaryAsync(Guid courseId, CancellationToken ct = default);

    /// <summary>Batch variant used by course-card lists. Unknown/empty ids yield <see cref="CourseRatingSummary.Empty"/>.</summary>
    Task<IReadOnlyDictionary<Guid, CourseRatingSummary>> GetCourseSummariesAsync(
        IReadOnlyCollection<Guid> courseIds, CancellationToken ct = default);

    /// <summary>
    /// Recomputes and persists the denormalized rating columns on a course from its
    /// approved reviews. Returns false when the course does not exist.
    /// </summary>
    Task<bool> RecalculateCourseAsync(Guid courseId, CancellationToken ct = default);

    /// <summary>Aggregate rating across the instructor's published courses only.</summary>
    Task<InstructorRatingSummary> GetInstructorSummaryAsync(Guid instructorId, CancellationToken ct = default);

    /// <summary>
    /// Aggregate rating (sum of approved ratings / count) restricted to an arbitrary
    /// set of courses. This is the primitive behind <see cref="GetInstructorSummaryAsync"/>,
    /// exposed so a scoped dashboard (e.g. an Admin viewing every course) can reuse the
    /// exact same calculation.
    /// </summary>
    Task<InstructorRatingSummary> GetRatingSummaryForCoursesAsync(
        IReadOnlyCollection<Guid> courseIds, CancellationToken ct = default);

    /// <summary>
    /// Evaluates the platform's review eligibility rules for one (student, course) pair.
    /// Rules are listed on <see cref="ReviewEligibilityResult"/> and in
    /// docs/current/RATINGS_AND_REVIEWS.md.
    /// </summary>
    Task<ReviewEligibilityResult> CheckReviewEligibilityAsync(
        Guid studentId, Guid courseId, CancellationToken ct = default);

    /// <summary>
    /// Moderation state a newly submitted (or newly edited) student review receives:
    /// <c>Pending</c> when administrative approval is required, otherwise <c>Approved</c>.
    /// </summary>
    ReviewStatus ResolveSubmittedStatus();
}
