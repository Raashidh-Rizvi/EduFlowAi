using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

/// <summary>
/// Public instructor profiles and the instructor's own profile editor.
///
/// SECURITY CONTRACT:
///   * Public endpoints are read-only and expose only published-course data plus the
///     profile fields the instructor chose to publish (never the email address).
///   * The editor endpoints are bound to the authenticated caller's id taken from the
///     JWT — there is no instructor id anywhere in the request, so an instructor can
///     only ever edit their own profile. Students are rejected by role; other
///     instructors can never reach someone else's row.
///   * Every aggregate shown here comes from <see cref="IRatingService"/>, so the
///     numbers match the course cards exactly.
/// </summary>
[ApiController]
[Route("api/instructors")]
public class InstructorsController : BaseApiController
{
    private readonly IRatingService _ratingService;

    public InstructorsController(ApplicationDbContext dbContext, IRatingService ratingService)
        : base(dbContext)
    {
        _ratingService = ratingService;
    }

    // -------------------------------------------------------------------------
    // PUBLIC DIRECTORY
    // -------------------------------------------------------------------------

    /// <summary>All active instructors with their public profile statistics.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetInstructors()
    {
        var instructors = await DbContext.Users.AsNoTracking()
            .Where(u => u.Role == UserRole.Instructor && u.IsActive)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var result = new List<InstructorListItemDto>();
        foreach (var user in instructors)
        {
            result.Add(await BuildListItemAsync(user));
        }

        return Ok(result);
    }

    /// <summary>One instructor's full public profile: bio, expertise, published courses and feedback.</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInstructorProfile(Guid id)
    {
        var user = await DbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null || !user.IsActive)
        {
            return NotFound(new { message = "Instructor not found." });
        }

        if (user.Role != UserRole.Instructor && user.Role != UserRole.Admin)
        {
            return NotFound(new { message = "Instructor not found." });
        }

        var (callerId, _) = GetCurrentUser();
        return Ok(await BuildPublicProfileAsync(user, callerId == user.Id));
    }

    /// <summary>Approved reviews left on the instructor's published courses.</summary>
    [HttpGet("{id:guid}/reviews")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInstructorReviews(Guid id, [FromQuery] int take = 20)
    {
        var userExists = await DbContext.Users.AsNoTracking()
            .AnyAsync(u => u.Id == id && u.IsActive);
        if (!userExists)
        {
            return NotFound(new { message = "Instructor not found." });
        }

        take = Math.Clamp(take, 1, 100);

        var reviews = await DbContext.CourseReviews.AsNoTracking()
            .Where(r => r.Status == ReviewStatus.Approved
                && r.Course != null
                && r.Course.InstructorId == id
                && r.Course.IsPublished)
            .Include(r => r.Student)
            .Include(r => r.Course)
            .OrderByDescending(r => r.CreatedAt)
            .Take(take)
            .ToListAsync();

        return Ok(reviews.Select(MapReview).ToList());
    }

    // -------------------------------------------------------------------------
    // OWN PROFILE EDITOR
    // -------------------------------------------------------------------------

    /// <summary>The authenticated instructor's own profile, shaped for the edit form.</summary>
    [HttpGet("me/profile")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetMyProfile()
    {
        var (userId, role) = GetCurrentUser();
        if (userId == Guid.Empty)
        {
            return Unauthorized(new { message = "Authenticated instructor required." });
        }

        var user = await DbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        var row = await DbContext.InstructorProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        return Ok(new
        {
            userId = user.Id,
            fullName = user.FullName,
            email = user.Email,
            avatarUrl = user.AvatarUrl,
            headline = row?.Headline ?? string.Empty,
            bio = row?.Bio ?? string.Empty,
            expertise = row?.Expertise ?? string.Empty,
            websiteUrl = row?.WebsiteUrl,
            linkedInUrl = row?.LinkedInUrl,
            stats = await BuildSummaryAsync(userId, role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        });
    }

    /// <summary>
    /// Updates the authenticated instructor's own public profile (name, profile image,
    /// headline, biography, expertise and links). All fields are optional; omitted
    /// fields are left unchanged so the client can send partial updates safely.
    /// </summary>
    [HttpPut("me/profile")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateInstructorProfileRequest request)
    {
        var (userId, _) = GetCurrentUser();
        if (userId == Guid.Empty)
        {
            return Unauthorized(new { message = "Authenticated instructor required." });
        }

        var user = await DbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        var error = ValidateProfileRequest(request);
        if (error != null)
        {
            return BadRequest(new { message = error });
        }

        if (!string.IsNullOrWhiteSpace(request.FullName))
        {
            user.FullName = request.FullName.Trim();
        }

        if (request.AvatarUrl != null)
        {
            var trimmed = request.AvatarUrl.Trim();
            user.AvatarUrl = string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

        var profile = await DbContext.InstructorProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            profile = new InstructorProfile { UserId = userId };
            await DbContext.InstructorProfiles.AddAsync(profile);
        }

        if (request.Headline != null) profile.Headline = request.Headline.Trim();
        if (request.Bio != null) profile.Bio = request.Bio.Trim();
        if (request.Expertise != null) profile.Expertise = NormalizeExpertise(request.Expertise);
        if (request.WebsiteUrl != null) profile.WebsiteUrl = NullIfEmpty(request.WebsiteUrl.Trim());
        if (request.LinkedInUrl != null) profile.LinkedInUrl = NullIfEmpty(request.LinkedInUrl.Trim());

        profile.UpdatedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await DbContext.SaveChangesAsync();

        return Ok(new { message = "Profile updated successfully." });
    }

    // -------------------------------------------------------------------------
    // PRIVATE HELPERS
    // -------------------------------------------------------------------------

    private static CourseReviewDto MapReview(CourseReview r) => new(
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
    );

    private static string? NullIfEmpty(string value) => string.IsNullOrWhiteSpace(value) ? null : value;

    /// <summary>Normalizes the comma-separated expertise list (trimmed, de-duplicated, capped).</summary>
    private static string NormalizeExpertise(string raw)
    {
        var tags = (raw ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(t => t.Length <= 60)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(12)
            .ToList();

        return string.Join(", ", tags);
    }

    /// <summary>Returns an error message, or null when the payload is valid.</summary>
    private static string? ValidateProfileRequest(UpdateInstructorProfileRequest request)
    {
        if (request == null) return "A profile payload is required.";

        if (request.FullName != null && string.IsNullOrWhiteSpace(request.FullName))
            return "Full name cannot be empty.";

        if (request.FullName != null && request.FullName.Trim().Length > 120)
            return "Full name must be 120 characters or fewer.";

        if (request.Headline != null && request.Headline.Trim().Length > 200)
            return "Headline must be 200 characters or fewer.";

        if (request.Bio != null && request.Bio.Trim().Length > 2000)
            return "Biography must be 2000 characters or fewer.";

        if (request.Expertise != null && request.Expertise.Length > 1000)
            return "Expertise must be 1000 characters or fewer.";

        if (request.AvatarUrl != null && !IsSafeMediaUrl(request.AvatarUrl))
            return "Profile image must be a relative upload path or an http(s) URL.";

        if (request.WebsiteUrl != null && !string.IsNullOrWhiteSpace(request.WebsiteUrl) && !IsSafeWebUrl(request.WebsiteUrl))
            return "Website URL must start with http:// or https://.";

        if (request.LinkedInUrl != null && !string.IsNullOrWhiteSpace(request.LinkedInUrl) && !IsSafeWebUrl(request.LinkedInUrl))
            return "LinkedIn URL must start with http:// or https://.";

        return null;
    }

    private static bool IsSafeWebUrl(string value)
    {
        var trimmed = value.Trim();
        return Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static bool IsSafeMediaUrl(string value)
    {
        var trimmed = value.Trim();
        if (string.IsNullOrWhiteSpace(trimmed)) return true;
        if (trimmed.StartsWith('/')) return !trimmed.StartsWith("//");
        return IsSafeWebUrl(trimmed);
    }

    private static List<string> SplitExpertise(string? raw)
        => (raw ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

    /// <summary>Distinct students with a verified (Active or Completed) enrollment in published courses.</summary>
    private async Task<int> GetStudentCountAsync(Guid instructorId)
    {
        var publishedIds = await DbContext.Courses.AsNoTracking()
            .Where(c => c.InstructorId == instructorId && c.IsPublished)
            .Select(c => c.Id)
            .ToListAsync();

        if (publishedIds.Count == 0) return 0;

        return await DbContext.Enrollments.AsNoTracking()
            .Where(e => publishedIds.Contains(e.CourseId)
                && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed))
            .Select(e => e.StudentId)
            .Distinct()
            .CountAsync();
    }

    /// <summary>Own-profile summary (all courses) — used by the edit screen.</summary>
    private async Task<InstructorProfileDto> BuildSummaryAsync(Guid userId, bool isAdmin)
    {
        var user = await DbContext.Users.AsNoTracking().FirstAsync(u => u.Id == userId);
        var courses = await DbContext.Courses.AsNoTracking()
            .Where(c => c.InstructorId == userId)
            .Select(c => new { c.IsPublished })
            .ToListAsync();

        var rating = await _ratingService.GetInstructorSummaryAsync(userId);

        return new InstructorProfileDto(
            user.Id,
            user.FullName,
            user.Email,
            user.AvatarUrl,
            isAdmin ? "Admin" : user.Role.ToString(),
            user.CreatedAt,
            courses.Count,
            courses.Count(c => c.IsPublished),
            await GetStudentCountAsync(userId),
            rating.AverageRating
        );
    }

    /// <summary>Directory row for the instructor listing.</summary>
    private async Task<InstructorListItemDto> BuildListItemAsync(User user)
    {
        var profileRow = await DbContext.InstructorProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == user.Id);

        var publishedCourseCount = await DbContext.Courses.AsNoTracking()
            .CountAsync(c => c.InstructorId == user.Id && c.IsPublished);

        var rating = await _ratingService.GetInstructorSummaryAsync(user.Id);

        return new InstructorListItemDto(
            user.Id,
            user.FullName,
            user.AvatarUrl,
            profileRow?.Headline ?? string.Empty,
            profileRow?.Bio ?? string.Empty,
            SplitExpertise(profileRow?.Expertise),
            publishedCourseCount,
            await GetStudentCountAsync(user.Id),
            rating.AverageRating,
            rating.ReviewCount
        );
    }

    /// <summary>Full public profile: identity, editable fields, published courses and feedback.</summary>
    private async Task<PublicInstructorProfileDto> BuildPublicProfileAsync(User user, bool isOwnProfile)
    {
        var profileRow = await DbContext.InstructorProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == user.Id);

        var allCourses = await DbContext.Courses.AsNoTracking()
            .Where(c => c.InstructorId == user.Id)
            .Select(c => new { c.Id, c.IsPublished })
            .ToListAsync();

        var publishedIds = allCourses.Where(c => c.IsPublished).Select(c => c.Id).ToList();

        var courses = await DbContext.Courses.AsNoTracking()
            .Where(c => c.InstructorId == user.Id && c.IsPublished)
            .Include(c => c.Modules)
                .ThenInclude(m => m.ContentItems)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var courseIds = courses.Select(c => c.Id).ToList();

        var enrollmentCounts = courseIds.Count == 0
            ? new Dictionary<Guid, int>()
            : (await DbContext.Enrollments.AsNoTracking()
                    .Where(e => courseIds.Contains(e.CourseId)
                        && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed))
                    .GroupBy(e => e.CourseId)
                    .Select(g => new { CourseId = g.Key, Count = g.Select(e => e.StudentId).Distinct().Count() })
                    .ToListAsync())
                .ToDictionary(x => x.CourseId, x => x.Count);

        var ratingSummaries = await _ratingService.GetCourseSummariesAsync(courseIds);
        var instructorRating = await _ratingService.GetInstructorSummaryAsync(user.Id);
        var studentCount = await GetStudentCountAsync(user.Id);

        var courseDtos = courses.Select(c =>
        {
            var ratingSummary = ratingSummaries.TryGetValue(c.Id, out var s) ? s : CourseRatingSummary.Empty;
            return new InstructorPublicCourseDto(
                c.Id,
                c.Code,
                c.Title,
                c.Description,
                c.Category,
                c.ThumbnailUrl,
                c.Difficulty.ToString(),
                string.IsNullOrWhiteSpace(c.Term) ? "Fall 2026" : c.Term,
                c.DurationHours,
                c.Price,
                c.IsFree,
                enrollmentCounts.GetValueOrDefault(c.Id, 0),
                ratingSummary.AverageRating,
                ratingSummary.ReviewCount,
                c.Modules.Count,
                c.Modules.Sum(m => m.ContentItems.Count)
            );
        }).ToList();

        var recentReviews = courseIds.Count == 0
            ? new List<CourseReviewDto>()
            : (await DbContext.CourseReviews.AsNoTracking()
                    .Where(r => courseIds.Contains(r.CourseId) && r.Status == ReviewStatus.Approved)
                    .Include(r => r.Student)
                    .Include(r => r.Course)
                    .OrderByDescending(r => r.CreatedAt)
                    .Take(6)
                    .ToListAsync())
                .Select(MapReview)
                .ToList();

        return new PublicInstructorProfileDto(
            user.Id,
            user.FullName,
            user.AvatarUrl,
            profileRow?.Headline ?? string.Empty,
            profileRow?.Bio ?? string.Empty,
            SplitExpertise(profileRow?.Expertise),
            profileRow?.WebsiteUrl,
            profileRow?.LinkedInUrl,
            user.CreatedAt,
            allCourses.Count,
            publishedIds.Count,
            studentCount,
            instructorRating.AverageRating,
            instructorRating.ReviewCount,
            courseDtos,
            recentReviews,
            isOwnProfile
        );
    }
}
