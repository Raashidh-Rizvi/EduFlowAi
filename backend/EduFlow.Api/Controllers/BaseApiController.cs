using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

/// <summary>
/// Base controller providing shared identity and course-ownership helpers
/// for all Instructor-owned controllers (Courses, Quizzes, AiReview).
/// </summary>
[ApiController]
public abstract class BaseApiController : ControllerBase
{
    protected readonly ApplicationDbContext DbContext;

    protected BaseApiController(ApplicationDbContext dbContext)
    {
        DbContext = dbContext;
    }

    /// <summary>
    /// Extracts the current user's Guid and role from JWT claims.
    /// Returns (Guid.Empty, "") if the token is missing or unparseable.
    /// </summary>
    protected (Guid UserId, string Role) GetCurrentUser()
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userId = Guid.TryParse(uidClaim, out var parsed) ? parsed : Guid.Empty;
        return (userId, role);
    }

    /// <summary>
    /// Returns true if the caller is an Admin or the instructor who owns the specified course.
    /// </summary>
    protected async Task<bool> IsCourseOwnerOrAdmin(Guid courseId)
    {
        var (userId, role) = GetCurrentUser();
        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase)) return true;
        if (userId == Guid.Empty) return false;
        return await DbContext.Courses.AnyAsync(c => c.Id == courseId && c.InstructorId == userId);
    }

    /// <summary>
    /// Resolves ownership by going through a Module -> CourseId chain.
    /// </summary>
    protected async Task<bool> IsModuleOwnerOrAdmin(Guid moduleId)
    {
        var (userId, role) = GetCurrentUser();
        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase)) return true;
        if (userId == Guid.Empty) return false;
        return await DbContext.Modules
            .Include(m => m.Course)
            .AnyAsync(m => m.Id == moduleId && m.Course != null && m.Course.InstructorId == userId);
    }

    /// <summary>
    /// Returns true if the caller is an Admin or the instructor who owns the course
    /// that the given assessment belongs to.
    /// </summary>
    protected async Task<bool> IsQuizOwnerOrAdmin(Guid assessmentId)
    {
        var (userId, role) = GetCurrentUser();
        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase)) return true;
        if (userId == Guid.Empty) return false;
        return await DbContext.Assessments
            .Include(a => a.Course)
            .AnyAsync(a => a.Id == assessmentId && a.Course != null && a.Course.InstructorId == userId);
    }

    /// <summary>
    /// Returns true if the caller is an Admin or the instructor who owns the course
    /// that the given submission's assessment belongs to.
    /// </summary>
    protected async Task<bool> IsSubmissionOwnerOrAdmin(Guid submissionId)
    {
        var (userId, role) = GetCurrentUser();
        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase)) return true;
        if (userId == Guid.Empty) return false;
        return await DbContext.Submissions
            .Include(s => s.Assessment)
                .ThenInclude(a => a.Course)
            .AnyAsync(s => s.Id == submissionId
                && s.Assessment != null
                && s.Assessment.Course != null
                && s.Assessment.Course.InstructorId == userId);
    }

    /// <summary>
    /// Returns true if the caller is an Admin or the instructor who owns the course
    /// that the given topic belongs to (via Module -> Course chain).
    /// </summary>
    protected async Task<bool> IsTopicOwnerOrAdmin(Guid topicId)
    {
        var (userId, role) = GetCurrentUser();
        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase)) return true;
        if (userId == Guid.Empty) return false;
        return await DbContext.Topics
            .Include(t => t.Module)
                .ThenInclude(m => m.Course)
            .AnyAsync(t => t.Id == topicId
                && t.Module != null
                && t.Module.Course != null
                && t.Module.Course.InstructorId == userId);
    }

    /// <summary>
    /// Denies access with 403 if the user does not own the course (or is not Admin).
    /// Returns null on success; a ForbidResult if denied.
    /// </summary>
    protected async Task<IActionResult?> EnforceCourseOwnership(Guid courseId)
    {
        if (!await IsCourseOwnerOrAdmin(courseId))
            return Forbid();
        return null;
    }

    /// <summary>
    /// Denies access with 403 if the user does not own the quiz (or is not Admin).
    /// Returns null on success; a ForbidResult if denied.
    /// </summary>
    protected async Task<IActionResult?> EnforceQuizOwnership(Guid assessmentId)
    {
        if (!await IsQuizOwnerOrAdmin(assessmentId))
            return Forbid();
        return null;
    }
}
