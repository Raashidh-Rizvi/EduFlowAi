using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace EduFlow.Api.Controllers;

/// <summary>
/// Instructor-scoped dashboard API.
///
/// SECURITY CONTRACT: every query in this controller is filtered by the authenticated
/// user's id (taken from the JWT). An Instructor therefore only ever sees their own
/// courses, rosters, enrollment requests and reviews. Admin callers are deliberately
/// un-scoped so platform staff can inspect everything. There is no request parameter
/// anywhere in this controller that can widen an instructor's visibility.
/// </summary>
[ApiController]
[Route("api/instructor")]
[Authorize(Roles = "Instructor,Admin")]
public class InstructorController : BaseApiController
{
    private readonly IRatingService _ratingService;
    private readonly IPaymentVerificationService? _paymentVerificationService;

    public InstructorController(
        ApplicationDbContext dbContext,
        IRatingService ratingService,
        IPaymentVerificationService? paymentVerificationService = null) : base(dbContext)
    {
        _ratingService = ratingService;
        _paymentVerificationService = paymentVerificationService;
    }

    /// <summary>
    /// The instructor id to scope queries to, or null when an Admin calls the endpoint
    /// (Admins legitimately see the whole platform).
    /// </summary>
    private Guid? ScopeInstructorId
    {
        get
        {
            var (userId, role) = GetCurrentUser();
            if (userId == Guid.Empty) return Guid.Empty; // unauthenticated => scope to nothing
            if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase)) return null;
            return userId;
        }
    }

    private IQueryable<Course> ScopedCourses()
    {
        var scope = ScopeInstructorId;
        var query = DbContext.Courses.AsQueryable();
        return scope.HasValue ? query.Where(c => c.InstructorId == scope.Value) : query;
    }

    // -------------------------------------------------------------------------
    // DASHBOARD
    // -------------------------------------------------------------------------

    /// <summary>Aggregated KPIs for the logged-in instructor's personal dashboard.</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var (userId, role) = GetCurrentUser();
        if (userId == Guid.Empty) return Unauthorized(new { message = "Authenticated instructor required." });

        var isAdmin = role.Equals("Admin", StringComparison.OrdinalIgnoreCase);

        var courses = await ScopedCourses().AsNoTracking().ToListAsync();
        var courseIds = courses.Select(c => c.Id).ToList();

        var enrollments = courseIds.Count > 0
            ? await DbContext.Enrollments.AsNoTracking()
                .Where(e => courseIds.Contains(e.CourseId))
                .ToListAsync()
            : new List<Enrollment>();

        var activeEnrollments = enrollments.Where(e => e.Status == EnrollmentStatus.Active).ToList();
        var pendingEnrollments = enrollments.Where(e => e.Status == EnrollmentStatus.Pending).ToList();

        var moduleCount = await DbContext.Modules.AsNoTracking()
            .CountAsync(m => courseIds.Contains(m.CourseId));

        var lessonCourseIds = await DbContext.Modules.AsNoTracking()
            .Where(m => courseIds.Contains(m.CourseId))
            .Select(m => m.Id)
            .ToListAsync();
        var lessonCount = await DbContext.Lessons.AsNoTracking()
            .CountAsync(l => lessonCourseIds.Contains(l.ModuleId));

        // Documented calculation: approved reviews on PUBLISHED courses only,
        // summed then divided by their count (see docs/current/RATINGS_AND_REVIEWS.md).
        var rating = await _ratingService.GetRatingSummaryForCoursesAsync(
            courses.Where(c => c.IsPublished).Select(c => c.Id).ToList());

        var stats = new InstructorDashboardStatsDto(
            TotalCourses: courses.Count,
            PublishedCourses: courses.Count(c => c.IsPublished),
            DraftCourses: courses.Count(c => !c.IsPublished),
            EnrolledStudents: activeEnrollments.Select(e => e.StudentId).Distinct().Count(),
            PendingEnrollmentRequests: pendingEnrollments.Count,
            AverageRating: rating.AverageRating,
            TotalReviews: rating.ReviewCount,
            TotalModules: moduleCount,
            TotalLessons: lessonCount,
            TotalStudents: activeEnrollments.Select(e => e.StudentId).Distinct().Count()
        );

        return Ok(new
        {
            stats,
            instructor = await BuildProfileAsync(userId, isAdmin),
            courses = await BuildCourseCardsAsync(courses, enrollments),
            recentReviews = (await GetReviewsInternalAsync(courseIds, 5)).Select(r => new
            {
                r.Id, r.CourseId, r.CourseTitle, r.StudentName, r.Rating, r.Comment, r.CreatedAt
            }),
            recentEnrollmentRequests = pendingEnrollments
                .OrderByDescending(e => e.CreatedAt)
                .Take(5)
                .Select(e => new { e.Id, e.CourseId, e.StudentId, e.CreatedAt })
        });
    }

    // -------------------------------------------------------------------------
    // MY COURSES (ownership scoped)
    // -------------------------------------------------------------------------

    /// <summary>Only the courses owned by the authenticated instructor.</summary>
    [HttpGet("courses")]
    public async Task<IActionResult> GetMyCourses()
    {
        if (ScopeInstructorId == Guid.Empty) return Unauthorized(new { message = "Authenticated instructor required." });

        var courses = await ScopedCourses()
            .Include(c => c.Instructor)
            .AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var courseIds = courses.Select(c => c.Id).ToList();
        var enrollments = courseIds.Count > 0
            ? await DbContext.Enrollments.AsNoTracking()
                .Where(e => courseIds.Contains(e.CourseId))
                .ToListAsync()
            : new List<Enrollment>();

        return Ok(await BuildCourseCardsAsync(courses, enrollments));
    }

    /// <summary>Detail view of a single owned course. 403 for any other instructor's course.</summary>
    [HttpGet("courses/{id:guid}")]
    public async Task<IActionResult> GetMyCourseById(Guid id)
    {
        if (!await IsCourseOwnerOrAdmin(id))
        {
            return Forbid();
        }

        var course = await ScopedCourses()
            .Include(c => c.Instructor)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null) return NotFound(new { message = "Course not found." });

        var enrollments = await DbContext.Enrollments.AsNoTracking()
            .Where(e => e.CourseId == id)
            .ToListAsync();

        var cards = await BuildCourseCardsAsync(new List<Course> { course }, enrollments);
        return Ok(cards.FirstOrDefault());
    }

    // -------------------------------------------------------------------------
    // ENROLLMENT REQUESTS
    // -------------------------------------------------------------------------

    /// <summary>
    /// Enrollment requests across the instructor's own courses, filterable by lifecycle
    /// status, course and student search text. Grouped by course by the client using the
    /// companion <c>summary</c> endpoint.
    /// </summary>
    /// <param name="status">all (default) | pending | approved | rejected | cancelled</param>
    [HttpGet("enrollment-requests")]
    public async Task<IActionResult> GetEnrollmentRequests(
        [FromQuery] string? status = null,
        [FromQuery] Guid? courseId = null,
        [FromQuery] string? search = null)
    {
        if (ScopeInstructorId == Guid.Empty) return Unauthorized(new { message = "Authenticated instructor required." });

        var courseIds = await ScopedCourses().Select(c => c.Id).ToListAsync();
        if (courseId.HasValue && !courseIds.Contains(courseId.Value))
        {
            // Never let a course filter widen visibility beyond the caller's own courses.
            return Forbid();
        }
        if (courseId.HasValue) courseIds = courseIds.Where(id => id == courseId.Value).ToList();

        if (courseIds.Count == 0) return Ok(new List<EnrollmentRequestDto>());

        var query = DbContext.Enrollments.AsNoTracking()
            .Where(e => courseIds.Contains(e.CourseId));

        var statuses = ResolveStatusFilter(status);
        if (statuses != null) query = query.Where(e => statuses.Contains(e.Status));

        var requests = await query
            .Include(e => e.Course)
            .Include(e => e.Student)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            requests = requests.Where(e =>
                (e.Student != null && e.Student.FullName.ToLowerInvariant().Contains(term)) ||
                (e.Student != null && e.Student.Email.ToLowerInvariant().Contains(term)) ||
                (e.Course != null && e.Course.Title.ToLowerInvariant().Contains(term)) ||
                (e.Course != null && e.Course.Code.ToLowerInvariant().Contains(term)))
                .ToList();
        }

        return Ok(requests.Select(MapRequest));
    }

    /// <summary>Badge counts plus a per-course rollup for the Enrollment Requests screen.</summary>
    [HttpGet("enrollment-requests/summary")]
    public async Task<IActionResult> GetEnrollmentRequestSummary()
    {
        if (ScopeInstructorId == Guid.Empty) return Unauthorized(new { message = "Authenticated instructor required." });

        var courses = await ScopedCourses().AsNoTracking().ToListAsync();
        var courseIds = courses.Select(c => c.Id).ToList();
        if (courseIds.Count == 0)
        {
            return Ok(new EnrollmentRequestSummaryDto(0, 0, 0, 0, 0, new List<EnrollmentRequestCourseGroupDto>()));
        }

        var requests = await DbContext.Enrollments.AsNoTracking()
            .Where(e => courseIds.Contains(e.CourseId))
            .Select(e => new { e.CourseId, e.Status })
            .ToListAsync();

        var groups = courses.Select(c =>
        {
            var rows = requests.Where(r => r.CourseId == c.Id).ToList();
            return new EnrollmentRequestCourseGroupDto(
                c.Id,
                c.Code,
                c.Title,
                rows.Count(r => r.Status == EnrollmentStatus.Pending),
                rows.Count(r => r.Status == EnrollmentStatus.Active || r.Status == EnrollmentStatus.Completed),
                rows.Count(r => r.Status == EnrollmentStatus.Rejected),
                rows.Count(r => r.Status == EnrollmentStatus.Cancelled)
            );
        }).OrderByDescending(g => g.Pending).ThenBy(g => g.CourseCode).ToList();

        return Ok(new EnrollmentRequestSummaryDto(
            Pending: requests.Count(r => r.Status == EnrollmentStatus.Pending),
            Approved: requests.Count(r => r.Status == EnrollmentStatus.Active || r.Status == EnrollmentStatus.Completed),
            Rejected: requests.Count(r => r.Status == EnrollmentStatus.Rejected),
            Cancelled: requests.Count(r => r.Status == EnrollmentStatus.Cancelled),
            Total: requests.Count,
            Courses: groups
        ));
    }

    /// <summary>
    /// Approves a pending enrollment on one of the instructor's own courses.
    ///
    /// SECURITY: ownership is resolved server-side from the JWT — a student caller is rejected
    /// by the role gate, and an instructor can only ever reach enrollments of courses they own.
    /// The whole decision (status flip + reviewer audit fields + student notification) runs in a
    /// single database transaction, and payment verification is re-checked so approval can never
    /// bypass a required payment.
    /// </summary>
    [HttpPost("enrollment-requests/{enrollmentId:guid}/approve")]
    public async Task<IActionResult> ApproveEnrollmentRequest(Guid enrollmentId, [FromBody] EnrollmentDecisionRequest? request)
    {
        var (userId, role) = GetCurrentUser();
        if (userId == Guid.Empty) return Unauthorized(new { message = "Authenticated instructor required." });

        var enrollment = await DbContext.Enrollments
            .Include(e => e.Course)
            .FirstOrDefaultAsync(e => e.Id == enrollmentId);

        if (enrollment == null) return NotFound(new { message = "Enrollment request not found." });

        if (!await IsCourseOwnerOrAdmin(enrollment.CourseId)) return Forbid();

        if (enrollment.StudentId == userId && !role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        if (enrollment.Status != EnrollmentStatus.Pending)
        {
            return Conflict(new
            {
                message = $"Only pending requests can be approved. This request is {enrollment.Status.ToApiLabel()}.",
                status = enrollment.Status.ToApiLabel()
            });
        }

        var payment = await ResolvePaymentGate().VerifyAsync(enrollment.CourseId, enrollment.StudentId);
        if (!payment.IsSatisfied)
        {
            return StatusCode(StatusCodes.Status402PaymentRequired, new
            {
                message = payment.Reason,
                requiresPayment = payment.RequiresPayment
            });
        }

        // The status flip, the reviewer audit fields and the student notification must commit
        // together, and the whole unit has to run inside the execution strategy: starting the
        // transaction outside IExecutionStrategy.ExecuteAsync is incompatible with the
        // EnableRetryOnFailure strategy configured for Npgsql and always throws.
        var result = await DbContext.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = DbContext.Database.IsRelational()
                ? await DbContext.Database.BeginTransactionAsync()
                : null;

            enrollment.Status = EnrollmentStatus.Active;
            enrollment.ReviewedAt = DateTime.UtcNow;
            enrollment.ReviewedByInstructorId = userId;
            enrollment.ReviewNotes = string.IsNullOrWhiteSpace(request?.Notes) ? "Approved by instructor." : request.Notes.Trim();
            enrollment.UpdatedAt = DateTime.UtcNow;

            DbContext.Notifications.Add(new Notification
            {
                UserId = enrollment.StudentId,
                Title = "Enrollment Approved",
                Message = $"Your enrollment request for '{enrollment.Course?.Title}' was approved. You can start learning now.",
                Type = "EnrollmentApproved"
            });

            await DbContext.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();

            return new
            {
                message = "Enrollment approved.",
                enrollmentId = enrollment.Id,
                status = enrollment.Status.ToString(),
                statusLabel = enrollment.Status.ToApiLabel()
            };
        });

        return Ok(result);
    }

    /// <summary>Rejects a pending enrollment on one of the instructor's own courses.</summary>
    [HttpPost("enrollment-requests/{enrollmentId:guid}/reject")]
    [HttpPost("enrollment-requests/{enrollmentId:guid}/decline")]
    public async Task<IActionResult> RejectEnrollmentRequest(Guid enrollmentId, [FromBody] EnrollmentDecisionRequest? request)
    {
        var (userId, role) = GetCurrentUser();
        if (userId == Guid.Empty) return Unauthorized(new { message = "Authenticated instructor required." });

        var enrollment = await DbContext.Enrollments
            .Include(e => e.Course)
            .FirstOrDefaultAsync(e => e.Id == enrollmentId);

        if (enrollment == null) return NotFound(new { message = "Enrollment request not found." });

        if (!await IsCourseOwnerOrAdmin(enrollment.CourseId)) return Forbid();

        if (enrollment.StudentId == userId && !role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        if (enrollment.Status != EnrollmentStatus.Pending)
        {
            return Conflict(new
            {
                message = $"Only pending requests can be rejected. This request is {enrollment.Status.ToApiLabel()}.",
                status = enrollment.Status.ToApiLabel()
            });
        }

        // Same reason as ApproveEnrollmentRequest: the transaction has to live inside the
        // execution strategy because EnableRetryOnFailure forbids user-initiated transactions
        // that are started outside IExecutionStrategy.ExecuteAsync.
        var result = await DbContext.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = DbContext.Database.IsRelational()
                ? await DbContext.Database.BeginTransactionAsync()
                : null;

            enrollment.Status = EnrollmentStatus.Rejected;
            enrollment.ReviewedAt = DateTime.UtcNow;
            enrollment.ReviewedByInstructorId = userId;
            enrollment.ReviewNotes = string.IsNullOrWhiteSpace(request?.Notes) ? "Rejected by instructor." : request.Notes.Trim();
            enrollment.UpdatedAt = DateTime.UtcNow;

            DbContext.Notifications.Add(new Notification
            {
                UserId = enrollment.StudentId,
                Title = "Enrollment Request Declined",
                Message = $"Your enrollment request for '{enrollment.Course?.Title}' was declined. {enrollment.ReviewNotes}",
                Type = "EnrollmentRejected"
            });

            await DbContext.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();

            return new
            {
                message = "Enrollment request rejected.",
                enrollmentId = enrollment.Id,
                status = enrollment.Status.ToString(),
                statusLabel = enrollment.Status.ToApiLabel()
            };
        });

        return Ok(result);
    }

    private IPaymentVerificationService ResolvePaymentGate()
        => _paymentVerificationService ?? new PaymentVerificationService(DbContext);

    private static EnrollmentRequestDto MapRequest(Enrollment e) => new(
        e.Id,
        e.CourseId,
        e.Course?.Code ?? string.Empty,
        e.Course?.Title ?? string.Empty,
        e.StudentId,
        e.Student?.FullName ?? "Student",
        e.Student?.Email ?? string.Empty,
        e.Status.ToString(),
        e.ProgressPercentage,
        e.RequestedAt ?? e.CreatedAt,
        e.Student?.AvatarUrl,
        e.Status.ToApiLabel(),
        e.ReviewedAt,
        e.ReviewNotes,
        BuildStudentProfileSummary(e.Student)
    );

    private static string BuildStudentProfileSummary(User? student)
    {
        if (student == null) return "Student profile unavailable";
        var joined = student.CreatedAt.ToUniversalTime().ToString("MMM yyyy");
        return $"Joined {joined}" + (student.IsActive ? " · Active account" : " · Inactive account");
    }

    private static HashSet<EnrollmentStatus>? ResolveStatusFilter(string? status)
    {
        return status?.Trim().ToLowerInvariant() switch
        {
            null or "" or "all" => null,
            "pending" => new HashSet<EnrollmentStatus> { EnrollmentStatus.Pending },
            "approved" => new HashSet<EnrollmentStatus> { EnrollmentStatus.Active, EnrollmentStatus.Completed },
            "rejected" => new HashSet<EnrollmentStatus> { EnrollmentStatus.Rejected },
            "cancelled" or "canceled" => new HashSet<EnrollmentStatus> { EnrollmentStatus.Cancelled },
            _ => null
        };
    }

    // -------------------------------------------------------------------------
    // MY STUDENTS
    // -------------------------------------------------------------------------

    /// <summary>Every student enrolled (or pending) in the instructor's own courses.</summary>
    [HttpGet("students")]
    public async Task<IActionResult> GetMyStudents()
    {
        if (ScopeInstructorId == Guid.Empty) return Unauthorized(new { message = "Authenticated instructor required." });

        var courseIds = await ScopedCourses().Select(c => c.Id).ToListAsync();

        var enrollments = await DbContext.Enrollments.AsNoTracking()
            .Where(e => courseIds.Contains(e.CourseId)
                && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Pending))
            .Include(e => e.Course)
            .Include(e => e.Student)
            .OrderBy(e => e.Student!.FullName)
            .ToListAsync();

        return Ok(enrollments.Select(e => new InstructorStudentDto(
            e.StudentId,
            e.Student?.FullName ?? "Student",
            e.Student?.Email ?? string.Empty,
            e.Student?.AvatarUrl,
            e.CourseId,
            e.Course?.Code ?? string.Empty,
            e.Course?.Title ?? string.Empty,
            e.ProgressPercentage,
            e.Status.ToString(),
            e.CreatedAt
        )));
    }

    // -------------------------------------------------------------------------
    // REVIEWS
    // -------------------------------------------------------------------------

    /// <summary>Reviews left on the instructor's own courses.</summary>
    [HttpGet("reviews")]
    public async Task<IActionResult> GetMyReviews()
    {
        if (ScopeInstructorId == Guid.Empty) return Unauthorized(new { message = "Authenticated instructor required." });

        var courseIds = await ScopedCourses().Select(c => c.Id).ToListAsync();
        return Ok(await GetReviewsInternalAsync(courseIds, null));
    }

    private async Task<List<CourseReviewDto>> GetReviewsInternalAsync(List<Guid> courseIds, int? take)
    {
        if (courseIds.Count == 0) return new List<CourseReviewDto>();

        IQueryable<CourseReview> query = DbContext.CourseReviews.AsNoTracking()
            .Where(r => courseIds.Contains(r.CourseId))
            .Include(r => r.Student)
            .Include(r => r.Course)
            .OrderByDescending(r => r.CreatedAt);

        if (take.HasValue)
        {
            query = query.Take(take.Value);
        }

        var reviews = await query.ToListAsync();

        return reviews.Select(r => new CourseReviewDto(
            r.Id,
            r.CourseId,
            r.Course?.Code ?? string.Empty,
            r.Course?.Title ?? string.Empty,
            r.StudentId,
            r.Student?.FullName ?? "Student",
            r.Student?.AvatarUrl,
            r.Rating,
            r.Comment,
            r.CreatedAt,
            r.Status.ToString(),
            r.UpdatedAt,
            r.Course?.InstructorId
        )).ToList();
    }

    // -------------------------------------------------------------------------
    // PROFILE
    // -------------------------------------------------------------------------

    /// <summary>The authenticated instructor's own profile.</summary>
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var (userId, role) = GetCurrentUser();
        if (userId == Guid.Empty) return Unauthorized(new { message = "Authenticated instructor required." });

        return Ok(await BuildProfileAsync(userId, role.Equals("Admin", StringComparison.OrdinalIgnoreCase)));
    }

    // -------------------------------------------------------------------------
    // PRIVATE HELPERS
    // -------------------------------------------------------------------------

    private async Task<InstructorProfileDto> BuildProfileAsync(Guid userId, bool isAdmin)
    {
        var user = await DbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        var courses = await ScopedCourses().AsNoTracking().ToListAsync();
        var courseIds = courses.Select(c => c.Id).ToList();

        var students = courseIds.Count > 0
            ? await DbContext.Enrollments.AsNoTracking()
                .Where(e => courseIds.Contains(e.CourseId) && e.Status == EnrollmentStatus.Active)
                .Select(e => e.StudentId)
                .Distinct()
                .CountAsync()
            : 0;

        // Same documented calculation as everywhere else: approved reviews on
        // PUBLISHED courses only (see docs/current/RATINGS_AND_REVIEWS.md).
        var rating = await _ratingService.GetRatingSummaryForCoursesAsync(
            courses.Where(c => c.IsPublished).Select(c => c.Id).ToList());

        return new InstructorProfileDto(
            userId,
            user?.FullName ?? string.Empty,
            user?.Email ?? string.Empty,
            user?.AvatarUrl,
            isAdmin ? "Admin" : "Instructor",
            user?.CreatedAt ?? DateTime.UtcNow,
            courses.Count,
            courses.Count(c => c.IsPublished),
            students,
            rating.AverageRating
        );
    }

    private async Task<List<InstructorCourseDto>> BuildCourseCardsAsync(List<Course> courses, List<Enrollment> enrollments)
    {
        if (courses.Count == 0) return new List<InstructorCourseDto>();

        var courseIds = courses.Select(c => c.Id).ToList();

        var modules = await DbContext.Modules.AsNoTracking()
            .Where(m => courseIds.Contains(m.CourseId))
            .Select(m => new { m.Id, m.CourseId })
            .ToListAsync();

        var moduleIds = modules.Select(m => m.Id).ToList();

        var lessonCountsByModule = new Dictionary<Guid, int>();
        if (moduleIds.Count > 0)
        {
            var lessons = await DbContext.Lessons.AsNoTracking()
                .Where(l => moduleIds.Contains(l.ModuleId))
                .Select(l => new { l.Id, l.ModuleId })
                .ToListAsync();

            lessonCountsByModule = lessons
                .GroupBy(l => l.ModuleId)
                .ToDictionary(g => g.Key, g => g.Count());
        }

        var lessonCounts = modules
            .GroupBy(m => m.CourseId)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(m => lessonCountsByModule.GetValueOrDefault(m.Id, 0)));

        var quizCounts = new Dictionary<Guid, int>();
        var assessments = await DbContext.Assessments.AsNoTracking()
            .Where(a => courseIds.Contains(a.CourseId))
            .Select(a => new { a.Id, a.CourseId })
            .ToListAsync();
        foreach (var group in assessments.GroupBy(a => a.CourseId))
        {
            quizCounts[group.Key] = group.Count();
        }

        var moduleCounts = modules
            .GroupBy(m => m.CourseId)
            .ToDictionary(g => g.Key, g => g.Count());

        var ownerIds = courses.Select(c => c.InstructorId).Distinct().ToList();
        var instructorNames = await DbContext.Users.AsNoTracking()
            .Where(u => ownerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => new { u.FullName, u.Email });

        var result = new List<InstructorCourseDto>();
        foreach (var c in courses)
        {
            var courseEnrollments = enrollments.Where(e => e.CourseId == c.Id).ToList();
            instructorNames.TryGetValue(c.InstructorId, out var owner);

            result.Add(new InstructorCourseDto(
                c.Id,
                c.Code,
                c.Title,
                c.Description,
                c.Category,
                c.ThumbnailUrl,
                c.Difficulty.ToString(),
                string.IsNullOrWhiteSpace(c.Status) ? (c.IsPublished ? "Published" : "Draft") : c.Status,
                c.IsPublished,
                c.DurationHours,
                c.Price,
                c.IsFree,
                c.Term,
                c.InstructorId,
                owner?.FullName ?? "Instructor",
                owner?.Email,
                courseEnrollments.Count(e => e.Status == EnrollmentStatus.Active),
                courseEnrollments.Count(e => e.Status == EnrollmentStatus.Pending),
                c.AverageRating,
                c.RatingCount,
                moduleCounts.GetValueOrDefault(c.Id, 0),
                lessonCounts.GetValueOrDefault(c.Id, 0),
                quizCounts.GetValueOrDefault(c.Id, 0),
                c.CreatedAt
            ));
        }

        return result;
    }
}
