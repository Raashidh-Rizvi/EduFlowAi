using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

public record SaveGradingRequest(
    AttemptScoringRule AttemptScoring,
    List<AssessmentWeightInput> Weights,
    List<GradeBandInput>? Bands = null);

public record GradeOverrideRequest(string? Grade, string? Reason);

/// <summary>
/// Course grading configuration (policy, weights, attempt rule) and course results.
/// Results are always calculated server-side by <see cref="IGradeService"/>.
/// </summary>
[ApiController]
[Route("api/courses/{courseId:guid}")]
[Authorize]
public class GradingController : BaseApiController
{
    private readonly IGradeService _gradeService;
    private readonly IAssessmentAccessService _accessService;

    public GradingController(ApplicationDbContext dbContext, IGradeService gradeService, IAssessmentAccessService accessService)
        : base(dbContext)
    {
        _gradeService = gradeService;
        _accessService = accessService;
    }

    [HttpGet("grading")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetGrading(Guid courseId)
    {
        if (!await CanManage(courseId)) return Forbid();

        var config = await _gradeService.GetOrCreateConfigurationAsync(courseId);
        if (config == null) return NotFound(new { message = "Course not found." });

        var assessments = await DbContext.Assessments.AsNoTracking()
            .Where(a => a.CourseId == courseId)
            .OrderBy(a => a.Module!.OrderIndex).ThenBy(a => a.CreatedAt)
            .Select(a => new
            {
                assessmentId = a.Id,
                title = a.Title,
                moduleId = a.ModuleId,
                status = a.Status.ToString(),
                weightPercent = a.GradeWeightPercent
            })
            .ToListAsync();

        decimal total = assessments.Sum(a => a.weightPercent ?? 0m);
        return Ok(new
        {
            courseId,
            status = config.Status.ToString(),
            attemptScoring = config.AttemptScoring.ToString(),
            activatedAt = config.ActivatedAt,
            policy = new
            {
                id = config.GradingPolicyId,
                name = config.GradingPolicy!.Name,
                isInstitutionDefault = config.GradingPolicy.IsInstitutionDefault,
                bands = config.GradingPolicy.Bands
                    .OrderByDescending(b => b.MinPercentage)
                    .Select(b => new { label = b.Label, minPercentage = b.MinPercentage })
            },
            assessments,
            totalWeightPercent = total,
            canActivate = config.Status == GradingConfigurationStatus.Draft && total == 100m
        });
    }

    [HttpPut("grading")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> SaveGrading(Guid courseId, [FromBody] SaveGradingRequest request)
    {
        if (!await CanManage(courseId)) return Forbid();

        var (userId, role) = GetCurrentUser();
        var result = await _gradeService.SaveConfigurationAsync(courseId,
            new GradingConfigurationInput(request.AttemptScoring, request.Weights ?? new List<AssessmentWeightInput>(), request.Bands),
            userId, role);
        return ToResponse(result);
    }

    [HttpPost("grading/activate")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> ActivateGrading(Guid courseId)
    {
        if (!await CanManage(courseId)) return Forbid();

        var (userId, role) = GetCurrentUser();
        return ToResponse(await _gradeService.ActivateAsync(courseId, userId, role));
    }

    /// <summary>The caller's own course result (students), or a given student's (?studentId=, managers).</summary>
    [HttpGet("grade")]
    public async Task<IActionResult> GetGrade(Guid courseId, [FromQuery] Guid? studentId)
    {
        var (userId, role) = GetCurrentUser();
        bool canManage = await CanManage(courseId);
        var targetStudentId = studentId ?? userId;
        if (targetStudentId != userId && !canManage) return Forbid();
        if (!canManage && !await _accessService.HasLearnerAccessAsync(courseId, userId, role)) return Forbid();

        var config = await DbContext.CourseGradingConfigurations.AsNoTracking()
            .FirstOrDefaultAsync(c => c.CourseId == courseId);
        if (config == null || config.Status != GradingConfigurationStatus.Active)
        {
            return Ok(new { courseId, studentId = targetStudentId, gradingStatus = "NotConfigured" });
        }

        var result = await DbContext.CourseResults.AsNoTracking()
            .FirstOrDefaultAsync(r => r.CourseId == courseId && r.StudentId == targetStudentId);
        if (result == null)
        {
            return Ok(new { courseId, studentId = targetStudentId, gradingStatus = "NoResults" });
        }

        var breakdown = await AssessmentBreakdown(courseId, targetStudentId, config.AttemptScoring);
        return Ok(new
        {
            courseId,
            studentId = targetStudentId,
            gradingStatus = "Active",
            coursePercentage = result.CoursePercentage,
            currentPercentage = result.CurrentPercentage,
            assessedWeight = result.AssessedWeight,
            isComplete = result.IsComplete,
            grade = result.EffectiveGrade,
            calculatedGrade = result.CalculatedGrade,
            isOverridden = result.OverrideGrade != null,
            calculatedAt = result.CalculatedAt,
            assessments = breakdown
        });
    }

    [HttpGet("grades")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetGrades(Guid courseId)
    {
        if (!await CanManage(courseId)) return Forbid();

        var results = await DbContext.CourseResults.AsNoTracking()
            .Where(r => r.CourseId == courseId)
            .OrderBy(r => r.Student!.FullName)
            .Select(r => new
            {
                studentId = r.StudentId,
                studentName = r.Student!.FullName,
                coursePercentage = r.CoursePercentage,
                currentPercentage = r.CurrentPercentage,
                assessedWeight = r.AssessedWeight,
                isComplete = r.IsComplete,
                calculatedGrade = r.CalculatedGrade,
                overrideGrade = r.OverrideGrade,
                calculatedAt = r.CalculatedAt
            })
            .ToListAsync();
        return Ok(results);
    }

    [HttpPost("grades/{studentId:guid}/override")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> OverrideGrade(Guid courseId, Guid studentId, [FromBody] GradeOverrideRequest request)
    {
        if (!await CanManage(courseId)) return Forbid();

        var (userId, role) = GetCurrentUser();
        return ToResponse(await _gradeService.OverrideGradeAsync(courseId, studentId, request.Grade, request.Reason, userId, role));
    }

    private async Task<object> AssessmentBreakdown(Guid courseId, Guid studentId, AttemptScoringRule rule)
    {
        var weighted = await DbContext.Assessments.AsNoTracking()
            .Where(a => a.CourseId == courseId && a.GradeWeightPercent != null)
            .Select(a => new { a.Id, a.Title, Weight = a.GradeWeightPercent!.Value })
            .ToListAsync();
        var ids = weighted.Select(w => w.Id).ToList();
        var attempts = await DbContext.Submissions.AsNoTracking()
            .Where(s => s.StudentId == studentId && s.Status == AttemptStatus.Evaluated && ids.Contains(s.AssessmentId))
            .Select(s => new { s.AssessmentId, s.PercentageScore, s.SubmittedAt, s.AttemptNumber })
            .ToListAsync();

        return weighted.Select(w =>
        {
            var forAssessment = attempts.Where(a => a.AssessmentId == w.Id).ToList();
            double? counted = forAssessment.Count == 0 ? null
                : rule == AttemptScoringRule.Latest
                    ? forAssessment.OrderByDescending(a => a.SubmittedAt).ThenByDescending(a => a.AttemptNumber).First().PercentageScore
                    : forAssessment.Max(a => a.PercentageScore);
            return new
            {
                assessmentId = w.Id,
                title = w.Title,
                weightPercent = w.Weight,
                countedPercentage = counted,
                contribution = counted.HasValue ? Math.Round((decimal)counted.Value * w.Weight / 100m, 2) : (decimal?)null
            };
        }).ToList();
    }

    private async Task<bool> CanManage(Guid courseId)
    {
        var (userId, role) = GetCurrentUser();
        return await _accessService.CanManageCourseAsync(courseId, userId, role);
    }

    private IActionResult ToResponse(GradingOperationResult result) => result.Error switch
    {
        GradingError.None => Ok(new { message = result.Message }),
        GradingError.CourseNotFound or GradingError.ResultNotFound => NotFound(new { message = result.Message }),
        GradingError.NotConfigured => Conflict(new { message = result.Message, code = result.Error.ToString() }),
        _ => BadRequest(new { message = result.Message, code = result.Error.ToString(), errors = result.Details })
    };
}
