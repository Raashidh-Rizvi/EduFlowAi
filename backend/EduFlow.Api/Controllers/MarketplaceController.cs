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
/// Read-only public course marketplace: platform stats, categories, featured
/// instructors, the filterable/sortable/paginated course catalog and the full
/// course detail (curriculum, instructor profile, approved reviews).
///
/// SECURITY CONTRACT:
///   * Every endpoint is anonymous and exposes PUBLISHED courses only. Drafts
///     are never returned — a course id in the URL cannot un-publish a course.
///   * Only APPROVED reviews are surfaced, and only the student's display name
///     and avatar travel with a review (never the email address).
///   * Ratings are delegated to <see cref="IRatingService"/> so the storefront
///     shows exactly the same numbers as the course cards elsewhere.
/// </summary>
[ApiController]
[Route("api/marketplace")]
public class MarketplaceController : BaseApiController
{
    private readonly IRatingService _ratingService;

    public MarketplaceController(ApplicationDbContext dbContext, IRatingService ratingService)
        : base(dbContext)
    {
        _ratingService = ratingService;
    }

    // -------------------------------------------------------------------------
    // PLATFORM STATS
    // -------------------------------------------------------------------------

    /// <summary>Live counters for the hero and footer trust strip.</summary>
    [HttpGet("stats")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStats()
    {
        var publishedIds = await DbContext.Courses.AsNoTracking()
            .Where(c => c.IsPublished)
            .Select(c => c.Id)
            .ToListAsync();

        var instructorCount = await DbContext.Users.AsNoTracking()
            .CountAsync(u => u.Role == UserRole.Instructor && u.IsActive);

        var enrollmentCount = publishedIds.Count == 0
            ? 0
            : await DbContext.Enrollments.AsNoTracking()
                .CountAsync(e => publishedIds.Contains(e.CourseId)
                    && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed));

        var categoryCount = await DbContext.Courses.AsNoTracking()
            .Where(c => c.IsPublished)
            .Select(c => c.Category)
            .Distinct()
            .CountAsync();

        var rating = await _ratingService.GetRatingSummaryForCoursesAsync(publishedIds);

        return Ok(new MarketplaceStatsDto(
            publishedIds.Count,
            instructorCount,
            enrollmentCount,
            rating.AverageRating,
            rating.ReviewCount,
            categoryCount
        ));
    }

    // -------------------------------------------------------------------------
    // CATEGORIES
    // -------------------------------------------------------------------------

    /// <summary>Distinct categories of published courses, ranked by volume.</summary>
    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await DbContext.Courses.AsNoTracking()
            .Where(c => c.IsPublished)
            .GroupBy(c => c.Category)
            .Select(g => new MarketplaceCategoryDto(g.Key, g.Count()))
            .ToListAsync();

        return Ok(categories
            .OrderByDescending(c => c.CourseCount)
            .ThenBy(c => c.Name)
            .ToList());
    }

    // -------------------------------------------------------------------------
    // FEATURED INSTRUCTORS
    // -------------------------------------------------------------------------

    /// <summary>
    /// Instructors ranked by published courses, then learners, then rating.
    /// Stats are aggregated from published courses and approved reviews only.
    /// </summary>
    [HttpGet("instructors")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInstructors([FromQuery] int limit = 6)
    {
        limit = Math.Clamp(limit, 1, 24);

        var users = await DbContext.Users.AsNoTracking()
            .Where(u => u.Role == UserRole.Instructor && u.IsActive)
            .ToListAsync();

        if (users.Count == 0) return Ok(new List<MarketplaceInstructorDto>());

        var instructorIds = users.Select(u => u.Id).ToList();

        var profiles = await DbContext.InstructorProfiles.AsNoTracking()
            .Where(p => instructorIds.Contains(p.UserId))
            .ToListAsync();

        var publishedCourses = await DbContext.Courses.AsNoTracking()
            .Where(c => c.IsPublished && instructorIds.Contains(c.InstructorId))
            .Select(c => new { c.Id, c.InstructorId })
            .ToListAsync();

        var publishedIds = publishedCourses.Select(c => c.Id).ToList();

        // Enrolments: distinct students per instructor across their published courses.
        var enrollmentRows = publishedIds.Count == 0
            ? new List<(Guid InstructorId, Guid StudentId)>()
            : (await DbContext.Enrollments.AsNoTracking()
                    .Where(e => publishedIds.Contains(e.CourseId)
                        && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed))
                    .Select(e => new { e.CourseId, e.StudentId })
                    .ToListAsync())
                .Join(publishedCourses, e => e.CourseId, c => c.Id, (e, c) => (c.InstructorId, e.StudentId))
                .Distinct()
                .ToList();

        // Approved reviews across published courses, grouped by owning instructor.
        var reviewRows = publishedIds.Count == 0
            ? new List<(Guid InstructorId, int Rating)>()
            : (await DbContext.CourseReviews.AsNoTracking()
                    .Where(r => r.Status == ReviewStatus.Approved && publishedIds.Contains(r.CourseId))
                    .Select(r => new { r.CourseId, r.Rating })
                    .ToListAsync())
                .Join(publishedCourses, r => r.CourseId, c => c.Id, (r, c) => (c.InstructorId, r.Rating))
                .ToList();

        var result = new List<MarketplaceInstructorDto>();
        foreach (var user in users)
        {
            var profile = profiles.FirstOrDefault(p => p.UserId == user.Id);
            var courseCount = publishedCourses.Count(c => c.InstructorId == user.Id);
            var studentCount = enrollmentRows.Count(row => row.InstructorId == user.Id);
            var instructorRatings = reviewRows.Where(row => row.InstructorId == user.Id).Select(row => row.Rating).ToList();
            var averageRating = instructorRatings.Count > 0
                ? Math.Round(instructorRatings.Average(), 2)
                : 0.0;

            // Only instructors with published courses are marketplace-featured; the
            // catalogue is empty before anyone publishes, so fall back to everyone.
            if (courseCount == 0 && users.All(u => publishedCourses.All(c => c.InstructorId != u.Id)))
            {
                // keep — no instructor has published yet
            }
            else if (courseCount == 0)
            {
                continue;
            }

            result.Add(new MarketplaceInstructorDto(
                user.Id,
                user.FullName,
                user.AvatarUrl,
                "Instructor",
                profile?.Headline ?? string.Empty,
                profile?.Bio ?? string.Empty,
                SplitTags(profile?.Expertise),
                courseCount,
                studentCount,
                averageRating,
                instructorRatings.Count
            ));
        }

        result = result
            .OrderByDescending(r => r.CourseCount)
            .ThenByDescending(r => r.StudentCount)
            .ThenByDescending(r => r.AverageRating)
            .ThenBy(r => r.FullName)
            .Take(limit)
            .ToList();

        return Ok(result);
    }

    // -------------------------------------------------------------------------
    // COURSE CATALOG
    // -------------------------------------------------------------------------

    /// <summary>
    /// Published courses with search, category / level / price / instructor
    /// filters, sorting and paging. Response shape matches the storefront grid.
    /// </summary>
    [HttpGet("courses")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCourses(
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] string? level = null,
        [FromQuery] string? price = null,
        [FromQuery] string? instructor = null,
        [FromQuery] string? sort = "popular",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 9)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 48);

        var query = DbContext.Courses.AsNoTracking()
            .Where(c => c.IsPublished);

        var term = string.IsNullOrWhiteSpace(search) ? null : search.Trim().ToLower();
        if (term != null)
        {
            query = query.Where(c =>
                c.Title.ToLower().Contains(term)
                || c.Description.ToLower().Contains(term)
                || c.Category.ToLower().Contains(term)
                || c.Code.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(c => c.Category == category.Trim());
        }

        if (!string.IsNullOrWhiteSpace(level) && Enum.TryParse<DifficultyLevel>(level.Trim(), true, out var parsedLevel))
        {
            query = query.Where(c => c.Difficulty == parsedLevel);
        }

        if (string.Equals(price, "free", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(c => c.IsFree || c.Price == 0);
        }
        else if (string.Equals(price, "paid", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(c => !c.IsFree && c.Price > 0);
        }

        if (Guid.TryParse(instructor, out var instructorId))
        {
            query = query.Where(c => c.InstructorId == instructorId);
        }

        var courses = await query
            .Include(c => c.Instructor)
            .Include(c => c.Modules)
                .ThenInclude(m => m.Lessons)
            .AsNoTracking()
            .ToListAsync();

        var items = await ProjectAsync(courses);

        items = ApplySort(items, sort);

        var total = items.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var paged = items.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return Ok(new MarketplaceCoursePageDto(paged, total, page, pageSize, totalPages));
    }

    /// <summary>Full course detail: curriculum, instructor profile and approved reviews.</summary>
    [HttpGet("courses/{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCourseDetail(Guid id)
    {
        var course = await DbContext.Courses.AsNoTracking()
            .Include(c => c.Instructor)
            .Include(c => c.Modules.OrderBy(m => m.OrderIndex))
                .ThenInclude(m => m.Lessons.OrderBy(l => l.OrderIndex))
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        // Drafts are invisible to the public storefront, exactly like GET /api/courses/{id}.
        if (course == null || !course.IsPublished)
        {
            return NotFound(new { message = "Course not found." });
        }

        var item = (await ProjectAsync(new List<Course> { course })).First();

        var modules = course.Modules.Select(m => new MarketplaceModuleDto(
            m.Id,
            m.Title,
            m.Description ?? string.Empty,
            m.OrderIndex,
            DbContext.Assessments.AsNoTracking().Count(a => a.ModuleScopeId == m.Id),
            m.Lessons.Select(l => new MarketplaceLessonDto(
                l.Id,
                l.Title,
                l.OrderIndex,
                l.EstimatedMinutes
            )).ToList()
        )).ToList();

        var reviews = await DbContext.CourseReviews.AsNoTracking()
            .Where(r => r.CourseId == course.Id && r.Status == ReviewStatus.Approved)
            .Include(r => r.Student)
            .OrderByDescending(r => r.CreatedAt)
            .Take(30)
            .ToListAsync();

        var reviewDtos = reviews.Select(r => new MarketplaceReviewDto(
            r.Id,
            r.Student?.FullName ?? "Student",
            r.Student?.AvatarUrl,
            r.Rating,
            r.Comment ?? string.Empty,
            r.CreatedAt
        )).ToList();

        var instructor = await BuildInstructorAsync(course.InstructorId);

        return Ok(new MarketplaceCourseDetailDto(
            item.Id,
            item.Code,
            item.Title,
            item.Description,
            item.Category,
            item.ThumbnailUrl,
            item.Difficulty,
            item.Term,
            item.IsPublished,
            item.DurationHours,
            item.Price,
            item.IsFree,
            item.AverageRating,
            item.RatingCount,
            item.EnrollmentCount,
            item.ModuleCount,
            item.LessonCount,
            item.InstructorId,
            item.InstructorName,
            item.InstructorAvatarUrl,
            item.CreatedAt,
            item.UpdatedAt,
            modules,
            reviewDtos,
            instructor
        ));
    }

    /// <summary>Other published courses in the same category, best rated first.</summary>
    [HttpGet("courses/{id:guid}/similar")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSimilarCourses(Guid id, [FromQuery] string? category = null, [FromQuery] int limit = 4)
    {
        limit = Math.Clamp(limit, 1, 12);

        var query = DbContext.Courses.AsNoTracking()
            .Where(c => c.IsPublished && c.Id != id);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var sameCategory = query.Where(c => c.Category == category.Trim());
            var count = await sameCategory.CountAsync();
            query = count > 0 ? sameCategory : query;
        }

        var courses = await query
            .Include(c => c.Instructor)
            .Include(c => c.Modules)
                .ThenInclude(m => m.Lessons)
            .AsNoTracking()
            .Take(limit * 6)
            .ToListAsync();

        var items = ApplySort(await ProjectAsync(courses), "rating").Take(limit).ToList();

        return Ok(items);
    }

    // -------------------------------------------------------------------------
    // PRIVATE HELPERS
    // -------------------------------------------------------------------------

    /// <summary>
    /// Maps courses to card DTOs using batched, live aggregates (enrolments,
    /// lessons and approved-review ratings) so no card can show stale numbers.
    /// </summary>
    private async Task<List<MarketplaceCourseDto>> ProjectAsync(List<Course> courses)
    {
        if (courses.Count == 0) return new List<MarketplaceCourseDto>();

        var ids = courses.Select(c => c.Id).ToList();

        var enrollmentCounts = await DbContext.Enrollments.AsNoTracking()
            .Where(e => ids.Contains(e.CourseId)
                && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed))
            .GroupBy(e => e.CourseId)
            .Select(g => new { CourseId = g.Key, Count = g.Select(e => e.StudentId).Distinct().Count() })
            .ToDictionaryAsync(x => x.CourseId, x => x.Count);

        var ratings = await _ratingService.GetCourseSummariesAsync(ids);

        return courses.Select(c =>
        {
            var rating = ratings.TryGetValue(c.Id, out var summary) ? summary : CourseRatingSummary.Empty;
            var moduleCount = c.Modules?.Count ?? 0;
            var lessonCount = c.Modules?.Sum(m => m.Lessons?.Count ?? 0) ?? 0;

            return new MarketplaceCourseDto(
                c.Id,
                c.Code,
                c.Title,
                c.Description,
                c.Category,
                c.ThumbnailUrl,
                c.Difficulty.ToString(),
                string.IsNullOrWhiteSpace(c.Term) ? "Fall 2026" : c.Term,
                c.IsPublished,
                c.DurationHours,
                c.Price,
                c.IsFree,
                rating.AverageRating,
                rating.ReviewCount,
                enrollmentCounts.GetValueOrDefault(c.Id, 0),
                moduleCount,
                lessonCount,
                c.InstructorId,
                c.Instructor?.FullName ?? "Instructor",
                c.Instructor?.AvatarUrl,
                c.CreatedAt,
                c.UpdatedAt
            );
        }).ToList();
    }

    /// <summary>Applies the storefront's sort vocabulary to a projected list.</summary>
    private static List<MarketplaceCourseDto> ApplySort(List<MarketplaceCourseDto> items, string? sort)
    {
        return (sort ?? "popular").Trim().ToLowerInvariant() switch
        {
            "rating" => items
                .OrderByDescending(c => c.AverageRating)
                .ThenByDescending(c => c.RatingCount)
                .ThenByDescending(c => c.EnrollmentCount)
                .ThenBy(c => c.Title)
                .ToList(),
            "newest" => items.OrderByDescending(c => c.CreatedAt).ThenBy(c => c.Title).ToList(),
            "title" => items.OrderBy(c => c.Title).ToList(),
            "price-asc" => items.OrderBy(c => c.Price).ThenBy(c => c.Title).ToList(),
            "price-desc" => items.OrderByDescending(c => c.Price).ThenBy(c => c.Title).ToList(),
            _ => items
                .OrderByDescending(c => c.EnrollmentCount)
                .ThenByDescending(c => c.RatingCount)
                .ThenByDescending(c => c.AverageRating)
                .ThenBy(c => c.Title)
                .ToList()
        };
    }

    /// <summary>Public instructor profile for the course detail page.</summary>
    private async Task<MarketplaceInstructorDto> BuildInstructorAsync(Guid instructorId)
    {
        var user = await DbContext.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == instructorId)
            ?? new User { Id = instructorId, FullName = "Instructor" };

        var profile = await DbContext.InstructorProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == instructorId);

        var publishedIds = await DbContext.Courses.AsNoTracking()
            .Where(c => c.InstructorId == instructorId && c.IsPublished)
            .Select(c => c.Id)
            .ToListAsync();

        var studentCount = publishedIds.Count == 0
            ? 0
            : await DbContext.Enrollments.AsNoTracking()
                .Where(e => publishedIds.Contains(e.CourseId)
                    && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed))
                .Select(e => e.StudentId)
                .Distinct()
                .CountAsync();

        var rating = await _ratingService.GetInstructorSummaryAsync(instructorId);

        return new MarketplaceInstructorDto(
            user.Id,
            user.FullName,
            user.AvatarUrl,
            user.Role == UserRole.Admin ? "Admin" : "Instructor",
            profile?.Headline ?? string.Empty,
            profile?.Bio ?? string.Empty,
            SplitTags(profile?.Expertise),
            publishedIds.Count,
            studentCount,
            rating.AverageRating,
            rating.ReviewCount
        );
    }

    private static IReadOnlyList<string> SplitTags(string? raw)
        => (raw ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
}
