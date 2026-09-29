using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Core.Options;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EduFlow.Infrastructure.Services;

/// <summary>
/// Implements the rating calculation method documented on <see cref="IRatingService"/>
/// and in docs/current/RATINGS_AND_REVIEWS.md. It is the ONLY place in the application
/// that turns review rows into a number, so course cards, course details, instructor
/// profiles and dashboards can never disagree.
/// </summary>
public class RatingService : IRatingService
{
    private readonly ApplicationDbContext _db;
    private readonly bool _requireApproval;

    public RatingService(ApplicationDbContext db, IOptions<ReviewModerationOptions>? moderationOptions = null)
    {
        _db = db;
        _requireApproval = moderationOptions?.Value.RequireApproval ?? false;
    }

    /// <summary>True when new reviews must wait for administrative approval.</summary>
    public bool RequireApproval => _requireApproval;

    public async Task<CourseRatingSummary> GetCourseSummaryAsync(Guid courseId, CancellationToken ct = default)
    {
        var summaries = await GetCourseSummariesAsync(new[] { courseId }, ct);
        return summaries.TryGetValue(courseId, out var summary) ? summary : CourseRatingSummary.Empty;
    }

    public async Task<IReadOnlyDictionary<Guid, CourseRatingSummary>> GetCourseSummariesAsync(
        IReadOnlyCollection<Guid> courseIds, CancellationToken ct = default)
    {
        var ids = courseIds?.Distinct().ToList() ?? new List<Guid>();
        var result = ids.ToDictionary(id => id, _ => CourseRatingSummary.Empty);
        if (ids.Count == 0) return result;

        var grouped = await _db.CourseReviews.AsNoTracking()
            .Where(r => ids.Contains(r.CourseId) && r.Status == ReviewStatus.Approved)
            .GroupBy(r => r.CourseId)
            .Select(g => new
            {
                CourseId = g.Key,
                Count = g.Count(),
                Average = g.Average(r => (double)r.Rating)
            })
            .ToListAsync(ct);

        foreach (var row in grouped)
        {
            result[row.CourseId] = new CourseRatingSummary(Math.Round(row.Average, 2), row.Count);
        }

        return result;
    }

    public async Task<bool> RecalculateCourseAsync(Guid courseId, CancellationToken ct = default)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == courseId, ct);
        if (course == null) return false;

        var ratings = await _db.CourseReviews.AsNoTracking()
            .Where(r => r.CourseId == courseId && r.Status == ReviewStatus.Approved)
            .Select(r => r.Rating)
            .ToListAsync(ct);

        course.RatingCount = ratings.Count;
        course.AverageRating = ratings.Count > 0 ? Math.Round(ratings.Average(), 2) : 0.0;
        course.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<InstructorRatingSummary> GetInstructorSummaryAsync(Guid instructorId, CancellationToken ct = default)
    {
        if (instructorId == Guid.Empty) return InstructorRatingSummary.Empty;

        var publishedCourseIds = await _db.Courses.AsNoTracking()
            .Where(c => c.InstructorId == instructorId && c.IsPublished)
            .Select(c => c.Id)
            .ToListAsync(ct);

        return await GetRatingSummaryForCoursesAsync(publishedCourseIds, ct);
    }

    public async Task<InstructorRatingSummary> GetRatingSummaryForCoursesAsync(
        IReadOnlyCollection<Guid> courseIds, CancellationToken ct = default)
    {
        var ids = courseIds?.Distinct().ToList() ?? new List<Guid>();
        if (ids.Count == 0) return InstructorRatingSummary.Empty;

        // Approved reviews only — sum/count is exactly the review-weighted mean.
        var ratings = await _db.CourseReviews.AsNoTracking()
            .Where(r => ids.Contains(r.CourseId) && r.Status == ReviewStatus.Approved)
            .Select(r => r.Rating)
            .ToListAsync(ct);

        if (ratings.Count == 0) return InstructorRatingSummary.Empty;

        return new InstructorRatingSummary(Math.Round(ratings.Average(), 2), ratings.Count);
    }

    public async Task<ReviewEligibilityResult> CheckReviewEligibilityAsync(
        Guid studentId, Guid courseId, CancellationToken ct = default)
    {
        // R1 is enforced by the endpoint's [Authorize(Roles = "Student")] policy; this
        // method covers the data rules that must hold regardless of transport.
        if (studentId == Guid.Empty)
        {
            return ReviewEligibilityResult.Deny("A verified student identity is required to review a course.");
        }

        var course = await _db.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == courseId, ct);
        if (course == null)
        {
            return ReviewEligibilityResult.Deny("Course not found.");
        }

        if (!course.IsPublished)
        {
            return ReviewEligibilityResult.Deny("Only published courses can be reviewed.");
        }

        if (course.InstructorId == studentId)
        {
            return ReviewEligibilityResult.Deny("You cannot review your own course.");
        }

        var enrollment = await _db.Enrollments.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId, ct);

        if (enrollment == null)
        {
            return ReviewEligibilityResult.Deny("You must be enrolled in this course before you can review it.");
        }

        if (!enrollment.Status.GrantsAccess())
        {
            return ReviewEligibilityResult.Deny(
                $"Your enrollment is '{enrollment.Status}' and does not qualify for reviewing. " +
                "An Active or Completed enrollment is required.");
        }

        var existingReviewId = await _db.CourseReviews.AsNoTracking()
            .Where(r => r.CourseId == courseId && r.StudentId == studentId)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(ct);

        return existingReviewId == Guid.Empty
            ? ReviewEligibilityResult.Allow()
            : ReviewEligibilityResult.Allow(existingReviewId);
    }

    /// <summary>Status a newly submitted/edited student review receives.</summary>
    public ReviewStatus ResolveSubmittedStatus()
        => _requireApproval ? ReviewStatus.Pending : ReviewStatus.Approved;
}
