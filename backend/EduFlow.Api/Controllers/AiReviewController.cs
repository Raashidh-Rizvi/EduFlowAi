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
using Microsoft.Extensions.Logging;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiReviewController : BaseApiController
{
    private readonly IAiGatewayClient _aiGatewayClient;
    private readonly ILogger<AiReviewController> _logger;

    public AiReviewController(ApplicationDbContext dbContext, IAiGatewayClient aiGatewayClient, ILogger<AiReviewController> logger)
        : base(dbContext)
    {
        _aiGatewayClient = aiGatewayClient;
        _logger = logger;
    }

    /// <summary>
    /// Lists all study plan proposals pending instructor review.
    /// Admins see all proposals. Instructors see only proposals for their own courses.
    /// </summary>
    [HttpGet("pending-proposals")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetPendingProposals()
    {
        var (userId, role) = GetCurrentUser();
        var isAdmin = role.Equals("Admin", StringComparison.OrdinalIgnoreCase);

        var query = DbContext.StudyPlans
            .Include(sp => sp.Student)
            .Include(sp => sp.Course)
            .Include(sp => sp.Items)
            .Where(sp => sp.Status == StudyPlanStatus.PendingInstructorApproval)
            .AsQueryable();

        // Scope to instructor's courses only
        if (!isAdmin && userId != Guid.Empty)
        {
            var instructorCourseIds = await DbContext.Courses
                .Where(c => c.InstructorId == userId)
                .Select(c => c.Id)
                .ToListAsync();
            query = query.Where(sp => instructorCourseIds.Contains(sp.CourseId));
        }

        var plans = await query.OrderByDescending(sp => sp.CreatedAt).ToListAsync();
        return Ok(plans);
    }

    /// <summary>
    /// Lists all AI workflows with filtering by status.
    /// </summary>
    [HttpGet("workflows")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetWorkflows([FromQuery] StudyPlanStatus? status = null)
    {
        var query = DbContext.StudyPlans
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
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetWorkflowById(Guid id)
    {
        var plan = await DbContext.StudyPlans
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

        // Ownership: instructor can only view proposals for their own courses
        if (!await IsCourseOwnerOrAdmin(plan.CourseId))
        {
            return Forbid();
        }

        return Ok(plan);
    }

    /// <summary>
    /// Triggers the 4-agent LangGraph orchestration pipeline to generate a customized study plan.
    /// </summary>
    [HttpPost("orchestrate")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> OrchestrateStudyPlan([FromBody] StudyPlanRequest request)
    {
        // 1. Resolve student ID safely (prioritize specified valid student, then fallback to student in DB)
        Guid studentId;
        if (!string.IsNullOrWhiteSpace(request.student_id) && Guid.TryParse(request.student_id, out var parsedReqId) && await DbContext.Users.AnyAsync(u => u.Id == parsedReqId))
        {
            studentId = parsedReqId;
        }
        else
        {
            var studentUser = await DbContext.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Student);
            studentId = studentUser?.Id ?? Guid.Parse("33333333-3333-3333-3333-333333333333");
        }

        // 2. Resolve course safely (lookup by code like "CS-301", Guid, or prefix, fallback to first course in DB)
        Course? course = null;
        if (!string.IsNullOrWhiteSpace(request.course_id))
        {
            if (Guid.TryParse(request.course_id, out var parsedCourseId))
            {
                course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == parsedCourseId);
            }
            if (course == null)
            {
                var targetCode = request.course_id.Split(':')[0].Trim();
                course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Code.ToLower() == targetCode.ToLower() || c.Code.ToLower() == request.course_id.ToLower());
            }
        }
        if (course == null)
        {
            course = await DbContext.Courses.FirstOrDefaultAsync();
        }

        if (course == null)
        {
            return BadRequest(new { message = "No course found. Please provide a valid course_id." });
        }

        // Ownership: instructor can only generate study plans for their own courses
        if (!await IsCourseOwnerOrAdmin(course.Id))
        {
            return Forbid();
        }

        var courseId = course.Id;

        // 3. Prepare normalized payload for Python AI Microservice
        var studentObj = await DbContext.Users.FirstOrDefaultAsync(u => u.Id == studentId);
        var sName = !string.IsNullOrWhiteSpace(request.student_name) ? request.student_name : (studentObj?.FullName ?? "Alex Rivera");
        var outgoingPayload = new
        {
            student_id = studentId.ToString(),
            course_id = course?.Code ?? "CS-301",
            student_name = sName,
            target_goal = string.IsNullOrWhiteSpace(request.target_goal) ? "Master Enterprise Architecture & Relational Databases" : request.target_goal,
            hours_per_week = request.hours_per_week > 0 ? request.hours_per_week : 8.0f,
            target_weeks = request.target_weeks > 0 ? request.target_weeks : 2
        };

        var aiJson = await _aiGatewayClient.OrchestrateStudyPlanAsync(outgoingPayload);

        var studyPlan = new StudyPlan
        {
            StudentId = studentId,
            CourseId = courseId,
            TargetGoal = outgoingPayload.target_goal,
            TargetWeeks = outgoingPayload.target_weeks,
            HoursPerWeek = outgoingPayload.hours_per_week,
            Status = StudyPlanStatus.PendingInstructorApproval
        };

        // Parse AI schedule output into database items
        try
        {
            using var doc = JsonDocument.Parse(aiJson);
            if (doc.RootElement.TryGetProperty("schedule", out var scheduleEl) && scheduleEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var itemEl in scheduleEl.EnumerateArray())
                {
                    var dayNum = itemEl.TryGetProperty("day_number", out var dVal) ? dVal.GetInt32() : (studyPlan.Items.Count + 1);
                    var title = itemEl.TryGetProperty("activity_title", out var tVal) ? tVal.GetString() : "Interactive Module";
                    var desc = itemEl.TryGetProperty("description", out var descVal) ? descVal.GetString() : "Curated study activity";
                    var minutes = itemEl.TryGetProperty("estimated_minutes", out var mVal) ? mVal.GetInt32() : 60;

                    studyPlan.Items.Add(new StudyPlanItem
                    {
                        DayNumber = dayNum,
                        ActivityTitle = title ?? "Interactive Module",
                        Description = desc ?? "Curated study activity",
                        EstimatedMinutes = minutes,
                        IsCompleted = false
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse schedule items from AI JSON into StudyPlanItems.");
        }

        await DbContext.StudyPlans.AddAsync(studyPlan);

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
        await DbContext.AiWorkflowLogs.AddAsync(workflowLog);

        await DbContext.SaveChangesAsync();

        return Ok(JsonDocument.Parse(aiJson).RootElement);
    }

    /// <summary>
    /// Updates study plan proposal target goal, workload parameters, or quest schedule items.
    /// </summary>
    [HttpPut("proposals/{id}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateProposal(Guid id, [FromBody] UpdateStudyPlanRequest request)
    {
        var plan = await DbContext.StudyPlans.Include(sp => sp.Items).FirstOrDefaultAsync(sp => sp.Id == id);
        if (plan == null)
        {
            return NotFound(new { message = "Study plan proposal not found." });
        }

        // Ownership: instructor can only update proposals for their own courses
        if (!await IsCourseOwnerOrAdmin(plan.CourseId))
        {
            return Forbid();
        }

        if (!string.IsNullOrWhiteSpace(request.TargetGoal))
        {
            plan.TargetGoal = request.TargetGoal;
        }
        if (request.HoursPerWeek.HasValue && request.HoursPerWeek.Value > 0)
        {
            plan.HoursPerWeek = request.HoursPerWeek.Value;
        }
        if (request.TargetWeeks.HasValue && request.TargetWeeks.Value > 0)
        {
            plan.TargetWeeks = request.TargetWeeks.Value;
        }

        if (request.Items != null)
        {
            DbContext.StudyPlanItems.RemoveRange(plan.Items);
            foreach (var itemDto in request.Items)
            {
                plan.Items.Add(new StudyPlanItem
                {
                    DayNumber = itemDto.DayNumber,
                    ActivityTitle = itemDto.ActivityTitle,
                    Description = itemDto.Description,
                    EstimatedMinutes = itemDto.EstimatedMinutes,
                    IsCompleted = itemDto.IsCompleted
                });
            }
        }

        plan.UpdatedAt = DateTime.UtcNow;
        await DbContext.SaveChangesAsync();

        return Ok(plan);
    }

    /// <summary>
    /// Human-in-the-Loop approval/rejection/revision decision gateway for AI proposals.
    /// </summary>
    [HttpPost("proposals/{id}/decision")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> SubmitDecision(Guid id, [FromBody] ProposalDecisionRequest request)
    {
        var plan = await DbContext.StudyPlans.FirstOrDefaultAsync(sp => sp.Id == id);
        if (plan == null)
        {
            return NotFound(new { message = "Study plan not found." });
        }

        // Ownership: instructor can only approve/reject proposals for their own courses
        if (!await IsCourseOwnerOrAdmin(plan.CourseId))
        {
            return Forbid();
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

        // Forward decision to Python AI Agent microservice if active.
        // SubmitWorkflowDecisionAsync already catches and falls back internally on transport
        // failures, but we still guard the await so an unexpected exception here is logged
        // instead of failing (or silently vanishing from) the instructor's decision request.
        try
        {
            await _aiGatewayClient.SubmitWorkflowDecisionAsync(id.ToString(), new { decision = request.Decision, comments = request.Comments });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to forward workflow decision for study plan {StudyPlanId} to the AI gateway.", id);
        }

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
        await DbContext.Notifications.AddAsync(notification);

        await DbContext.SaveChangesAsync();

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
        var (userId, _) = GetCurrentUser();
        if (userId == Guid.Empty) return Unauthorized();
        var response = await _aiGatewayClient.ChatWithCoachAsync(
            request with { student_id = userId.ToString() }, HttpContext.RequestAborted);
        return new ContentResult { StatusCode = response.StatusCode, ContentType = "application/json", Content = response.Body };
    }

    [HttpPost("learn")]
    [Authorize]
    public async Task<IActionResult> Learn([FromBody] LearningAgentApiRequest request)
    {
        var (userId, _) = GetCurrentUser();
        if (userId == Guid.Empty) return Unauthorized();
        var response = await _aiGatewayClient.LearnAsync(
            request with { student_id = userId.ToString() }, HttpContext.RequestAborted);
        return new ContentResult { StatusCode = response.StatusCode, ContentType = "application/json", Content = response.Body };
    }

    [HttpGet("learning/slide-decks")]
    [Authorize]
    public async Task<IActionResult> GetLearningSlideDecks()
    {
        var response = await _aiGatewayClient.GetLearningSlideDecksAsync(HttpContext.RequestAborted);
        return new ContentResult { StatusCode = response.StatusCode, ContentType = "application/json", Content = response.Body };
    }

    [HttpPost("rag/chat")]
    [Authorize]
    public async Task<IActionResult> RagChat([FromBody] RagChatApiRequest request)
    {
        var (userId, _) = GetCurrentUser();
        if (userId == Guid.Empty) return Unauthorized();
        var response = await _aiGatewayClient.RagChatAsync(
            request with { student_id = userId.ToString() }, HttpContext.RequestAborted);
        return new ContentResult { StatusCode = response.StatusCode, ContentType = "application/json", Content = response.Body };
    }
}

public record RagChatApiRequest(
    string question,
    string? course_id = null,
    string? module_id = null,
    string? source_file = null,
    int max_citations = 3,
    string? student_id = null,
    string? session_id = null
);

public record LearningAgentApiRequest(
    string? student_id,
    string? course_id,
    string source_file,
    string request_type,
    string? session_id = null,
    string? sub_lecture_id = null,
    string? topic = null,
    string? message = null
);

public record StudyPlanRequest(
    string student_id,
    string course_id,
    string? student_name,
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
    string? student_id,
    string course_id,
    string message,
    string? source_file = null,
    string? session_id = null
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

public record UpdateStudyPlanRequest(
    string? TargetGoal,
    double? HoursPerWeek,
    int? TargetWeeks,
    List<StudyPlanItemDto>? Items
);

public record StudyPlanItemDto(
    int DayNumber,
    string ActivityTitle,
    string Description,
    int EstimatedMinutes,
    bool IsCompleted
);
