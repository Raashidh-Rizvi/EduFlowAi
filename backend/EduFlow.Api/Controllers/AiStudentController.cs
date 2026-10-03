using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Services;

namespace EduFlow.Api.Controllers;

/// <summary>
/// Phase 1C — Student 3 (Atheek M.F. IT24103933)
/// Provides AI-driven next best learning action for the authenticated student.
/// Recommendations are ADVISORY only — never modifies XP or grades directly.
/// </summary>
[ApiController]
[Route("api/ai")]
[Authorize(Roles = "Student")]
public class AiStudentController : ControllerBase
{
    private readonly IAiGatewayClient? _aiGateway;

    public AiStudentController(IAiGatewayClient? aiGateway = null)
    {
        _aiGateway = aiGateway;
    }

    /// <summary>
    /// Returns the next recommended learning action for the authenticated student.
    /// Identity is read from JWT token — request body student_id is never trusted.
    /// Falls back to a safe generic recommendation when AI gateway is unavailable.
    /// </summary>
    [HttpPost("next-best-action")]
    public async Task<IActionResult> GetNextBestAction([FromBody] NextBestActionRequest request)
    {
        // SECURITY: Read identity from JWT token, never from request body
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!Guid.TryParse(callerIdStr, out _))
            return Unauthorized(new { message = "A valid authentication token is required." });

        if (_aiGateway != null)
        {
            try
            {
                // Future: call Python AI agent via gateway
                // var result = await _aiGateway.GetNextBestActionAsync(callerId, request);
                // return Ok(result);
                await Task.CompletedTask;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AiStudentController] AI gateway error: {ex.Message}");
            }
        }

        // Safe fallback — never crash student experience when AI is down
        return Ok(new
        {
            recommendation = "Continue with your enrolled courses and complete your pending lessons.",
            reasoning = "AI guidance is temporarily unavailable. Your progress data will be used next time.",
            confidence = 0.5,
            source = "fallback"
        });
    }
}

/// <summary>
/// Request body for next best action.
/// Student identity comes from JWT token NOT these fields.
/// These fields give context to the AI model only.
/// </summary>
public record NextBestActionRequest(
    string? student_name,
    int level,
    int total_xp,
    int streak
);
