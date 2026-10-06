using System;
using System.Threading.Tasks;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduFlow.Api.Controllers;

/// <summary>Course progress, calculated by <see cref="IProgressService"/> from persisted activity.</summary>
[ApiController]
[Route("api/courses/{courseId:guid}/progress")]
[Authorize]
public class ProgressController : BaseApiController
{
    private readonly IProgressService _progressService;
    private readonly IAssessmentAccessService _accessService;

    public ProgressController(ApplicationDbContext dbContext, IProgressService progressService, IAssessmentAccessService accessService)
        : base(dbContext)
    {
        _progressService = progressService;
        _accessService = accessService;
    }

    /// <summary>The caller's own progress (students), or a given student's (?studentId=, course instructor/admin).</summary>
    [HttpGet]
    public async Task<IActionResult> GetProgress(Guid courseId, [FromQuery] Guid? studentId)
    {
        var (userId, role) = GetCurrentUser();
        bool canManage = await _accessService.CanManageCourseAsync(courseId, userId, role);
        var targetStudentId = studentId ?? userId;
        if (targetStudentId != userId && !canManage) return Forbid();
        if (!canManage && !await _accessService.HasLearnerAccessAsync(courseId, userId, role)) return Forbid();

        // Reading refreshes the cached enrollment percentage, so it never lags new content.
        var progress = await _progressService.RefreshEnrollmentAsync(courseId, targetStudentId)
            ?? await _progressService.CalculateAsync(courseId, targetStudentId);
        await DbContext.SaveChangesAsync();
        return Ok(progress);
    }
}
