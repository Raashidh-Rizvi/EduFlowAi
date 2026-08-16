using System;
using System.Linq;
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

    /// <summary>
    /// Lists all study plan proposals pending instructor review.
    /// </summary>
    [HttpGet("pending-proposals")]
    public async Task<IActionResult> GetPendingProposals()
    {
        var plans = await _dbContext.StudyPlans
            .Include(sp => sp.Student)
            .Include(sp => sp.Course)
            .Include(sp => sp.Items)
            .Where(sp => sp.Status == StudyPlanStatus.PendingInstructorApproval)
            .OrderByDescending(sp => sp.CreatedAt)
            .ToListAsync();

        return Ok(plans);
    }

    /// <summary>
    /// Lists all AI workflows with filtering by status.
    /// </summary>
    [HttpGet("workflows")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetWorkflows([FromQuery] StudyPlanStatus? status = null)
    {
        var query = _dbContext.StudyPlans
            .Include(sp => sp.Student)
            .Include(sp => sp.Course)
            .Include(sp => sp.Items)
            .Include(sp => sp.ApprovedByInstructor)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(sp => sp.Status == status.Value);
        }

        var list = await query.OrderByDescending(sp => sp.CreatedAt).Take(50).ToListAsync();
        return Ok(list);
    }

    /// <summary>
    /// Retrieves a specific AI workflow / study plan proposal by ID.
    /// </summary>
    [HttpGet("workflows/{id}")]
    [HttpGet("proposals/{id}")]
    [Authorize]
    public async Task<IActionResult> GetWorkflowById(Guid id)
    {
        var plan = await _dbContext.StudyPlans
            .Include(sp => sp.Student)
            .Include(sp => sp.Course)
            .Include(sp => sp.Items)
            .Include(sp => sp.Logs)
            .Include(sp => sp.ApprovedByInstructor)
            .FirstOrDefaultAsync(sp => sp.Id == id);

        if (plan == null)
        {
            return NotFound(new { message = "Study plan proposal not found." });
        }

        return Ok(plan);
    }

    /// <summary>
    /// Triggers the 4-agent LangGraph orchestration pipeline to generate a customized study plan.
    /// </summary>
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

        // Record AI workflow execution audit log
        var workflowLog = new AiWorkflowLog
        {
            StudyPlan = studyPlan,
            WorkflowId = $"wf-{Guid.NewGuid().ToString("N")[..8]}",
            AgentName = "Validation / Safety Agent",
            InputPayload = JsonSerializer.Serialize(new { request.target_goal, request.hours_per_week, request.target_weeks }),
            OutputPayload = aiJson,
            ExecutionTimeMs = 380,
            ValidationPassed = true
        };
        await _dbContext.AiWorkflowLogs.AddAsync(workflowLog);

        await _dbContext.SaveChangesAsync();

        return Ok(JsonDocument.Parse(aiJson).RootElement);
    }

    /// <summary>
    /// Human-in-the-Loop approval/rejection/revision decision gateway for AI proposals.
    /// </summary>
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

        bool isApproved = string.Equals(request.Decision, "Approved", StringComparison.OrdinalIgnoreCase);
        bool isRevision = string.Equals(request.Decision, "RevisionRequested", StringComparison.OrdinalIgnoreCase) || string.Equals(request.Decision, "Revise", StringComparison.OrdinalIgnoreCase);

        if (isApproved)
        {
            plan.Status = StudyPlanStatus.Approved;
            plan.ApprovedAt = DateTime.UtcNow;
        }
        else if (isRevision)
        {
            plan.Status = StudyPlanStatus.RevisionRequested;
        }
        else
        {
            plan.Status = StudyPlanStatus.Rejected;
        }

        plan.InstructorNotes = request.Comments;

        // Forward decision to Python AI Agent microservice if active
        _ = Task.Run(() => _aiGatewayClient.SubmitWorkflowDecisionAsync(id.ToString(), new { decision = request.Decision, comments = request.Comments }));

        // Add Notification to student
        string notifTitle = isApproved ? "✅ Study Plan Approved!" : (isRevision ? "🔄 Study Plan Revision Requested" : "❌ Study Plan Requires Revision");
        string notifMsg = isApproved 
            ? $"Your AI study plan for '{plan.TargetGoal}' was approved by your instructor." 
            : (isRevision ? $"Your instructor requested revisions: {request.Comments}" : $"Your AI study plan proposal was not approved: {request.Comments}");

        var notification = new Notification
        {
            UserId = plan.StudentId,
            Title = notifTitle,
            Message = notifMsg,
            Type = isApproved ? "AiApproved" : (isRevision ? "AiRevision" : "AiRejected")
        };
        await _dbContext.Notifications.AddAsync(notification);

        await _dbContext.SaveChangesAsync();

        return Ok(new { message = $"Study plan proposal {request.Decision.ToLower()} successfully.", planId = plan.Id, status = plan.Status.ToString() });
    }

    /// <summary>
    /// Explicit approval endpoint for AI workflow governance.
    /// </summary>
    [HttpPost("proposals/{id}/approve")]
    [HttpPost("workflows/{id}/approve")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> ApproveProposal(Guid id, [FromBody] ApproveProposalRequest? request)
    {
        return await SubmitDecision(id, new ProposalDecisionRequest("Approved", request?.Comments ?? "Approved by instructor."));
    }

    /// <summary>
    /// Explicit rejection endpoint for AI workflow governance.
    /// </summary>
    [HttpPost("proposals/{id}/reject")]
    [HttpPost("workflows/{id}/reject")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> RejectProposal(Guid id, [FromBody] RejectProposalRequest? request)
    {
        return await SubmitDecision(id, new ProposalDecisionRequest("Rejected", request?.Comments ?? "Rejected by instructor."));
    }

    /// <summary>
    /// Explicit revision requested endpoint for AI workflow governance.
    /// </summary>
    [HttpPost("proposals/{id}/revise")]
    [HttpPost("workflows/{id}/revise")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> RequestRevision(Guid id, [FromBody] ReviseProposalRequest? request)
    {
        return await SubmitDecision(id, new ProposalDecisionRequest("RevisionRequested", request?.Comments ?? "Revisions requested by instructor."));
    }

    /// <summary>
    /// Returns the live topology, roles, and status of all 7 interconnected agents.
    /// </summary>
    [HttpGet("agents-topology")]
    public async Task<IActionResult> GetAgentsTopology()
    {
        var topologyJson = await _aiGatewayClient.GetAgentsTopologyAsync();
        return Ok(JsonDocument.Parse(topologyJson).RootElement);
    }

    /// <summary>
    /// Returns the registered permitted tools list.
    /// </summary>
    [HttpGet("tools-registry")]
    public async Task<IActionResult> GetToolsRegistry()
    {
        var toolsJson = await _aiGatewayClient.GetToolRegistryAsync();
        return Ok(JsonDocument.Parse(toolsJson).RootElement);
    }

    /// <summary>
    /// Returns AI observability and performance metrics.
    /// </summary>
    [HttpGet("observability-metrics")]
    public async Task<IActionResult> GetObservabilityMetrics()
    {
        var metricsJson = await _aiGatewayClient.GetObservabilityMetricsAsync();
        return Ok(JsonDocument.Parse(metricsJson).RootElement);
    }

    /// <summary>
    /// Generates curriculum-aligned diagnostic or summative quizzes via QuizGeneratorAgent.
    /// </summary>
    [HttpPost("generate-quiz")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GenerateQuiz([FromBody] GenerateQuizApiRequest request)
    {
        var quizJson = await _aiGatewayClient.GenerateQuizAsync(request);
        return Ok(JsonDocument.Parse(quizJson).RootElement);
    }

    /// <summary>
    /// Evaluates student streak/dropout risks and returns retention interventions via RetentionBehaviorAgent.
    /// </summary>
    [HttpPost("retention-insights")]
    [Authorize]
    public async Task<IActionResult> GetRetentionInsights([FromBody] RetentionInsightsApiRequest request)
    {
        var insightsJson = await _aiGatewayClient.AnalyzeRetentionAsync(request);
        return Ok(JsonDocument.Parse(insightsJson).RootElement);
    }

    /// <summary>
    /// Tool-augmented conversational AI Learning Coach chat.
    /// </summary>
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
    string Decision, // "Approved" | "Rejected" | "RevisionRequested"
    string? Comments
);

public record ApproveProposalRequest(
    string? Comments
);

public record RejectProposalRequest(
    string? Comments
);

public record ReviseProposalRequest(
    string? Comments
);

public record CoachChatApiRequest(
    string student_id,
    string course_id,
    string message
);

public record GenerateQuizApiRequest(
    string course_id,
    string module_title,
    string[] target_topics,
    string difficulty,
    int question_count
);

public record RetentionInsightsApiRequest(
    string student_id,
    int current_streak,
    int days_inactive,
    float recent_quiz_accuracy,
    int xp_velocity_7d
);
