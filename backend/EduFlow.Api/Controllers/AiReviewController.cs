using System;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiReviewController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IAiGatewayClient _aiGatewayClient;

    public AiReviewController(ApplicationDbContext dbContext, IAiGatewayClient aiGatewayClient)
    {
        _dbContext = dbContext;
        _aiGatewayClient = aiGatewayClient;
    }

    [HttpGet("pending-proposals")]
    public async Task<IActionResult> GetPendingProposals()
    {
        var plans = await _dbContext.StudyPlans
            .Include(sp => sp.Student)
            .Include(sp => sp.Course)
            .Include(sp => sp.Items)
            .Where(sp => sp.Status == StudyPlanStatus.PendingInstructorApproval)
            .ToListAsync();

        return Ok(plans);
    }

    [HttpPost("orchestrate")]
    [Authorize]
    public async Task<IActionResult> OrchestrateStudyPlan([FromBody] StudyPlanRequest request)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var studentId = !string.IsNullOrEmpty(uidClaim) && Guid.TryParse(uidClaim, out var parsed) ? parsed : Guid.Parse(request.student_id);

        var aiJson = await _aiGatewayClient.OrchestrateStudyPlanAsync(request);

        var studyPlan = new StudyPlan
        {
            StudentId = studentId,
            CourseId = Guid.TryParse(request.course_id, out var cId) ? cId : Guid.NewGuid(),
            TargetGoal = request.target_goal,
            TargetWeeks = request.target_weeks,
            HoursPerWeek = request.hours_per_week,
            Status = StudyPlanStatus.PendingInstructorApproval
        };

        await _dbContext.StudyPlans.AddAsync(studyPlan);
        await _dbContext.SaveChangesAsync();

        return Ok(JsonDocument.Parse(aiJson).RootElement);
    }

    [HttpPost("proposals/{id}/decision")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> SubmitDecision(Guid id, [FromBody] ProposalDecisionRequest request)
    {
        var plan = await _dbContext.StudyPlans.FirstOrDefaultAsync(sp => sp.Id == id);
        if (plan == null)
        {
            return NotFound(new { message = "Study plan not found." });
        }

        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!string.IsNullOrEmpty(uidClaim) && Guid.TryParse(uidClaim, out var instructorId))
        {
            plan.ApprovedByInstructorId = instructorId;
        }

        if (string.Equals(request.Decision, "Approved", StringComparison.OrdinalIgnoreCase))
        {
            plan.Status = StudyPlanStatus.Approved;
            plan.ApprovedAt = DateTime.UtcNow;
            plan.InstructorNotes = request.Comments;
        }
        else
        {
            plan.Status = StudyPlanStatus.Rejected;
            plan.InstructorNotes = request.Comments;
        }

        await _dbContext.SaveChangesAsync();

        return Ok(new { message = $"Study plan proposal {request.Decision.ToLower()} successfully.", planId = plan.Id, status = plan.Status.ToString() });
    }

    [HttpPost("coach/chat")]
    [Authorize]
    public async Task<IActionResult> ChatWithCoach([FromBody] CoachChatApiRequest request)
    {
        var responseJson = await _aiGatewayClient.ChatWithCoachAsync(request);
        return Ok(JsonDocument.Parse(responseJson).RootElement);
    }
}

public record StudyPlanRequest(
    string student_id,
    string course_id,
    string student_name,
    string target_goal,
    float hours_per_week,
    int target_weeks
);

public record ProposalDecisionRequest(
    string Decision, // "Approved" | "Rejected"
    string? Comments
);

public record CoachChatApiRequest(
    string student_id,
    string course_id,
    string message
);
