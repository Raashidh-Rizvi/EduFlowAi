using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduFlow.Api.Controllers;

// Phase 1B fix: Removed duplicate [Route("api/v1/gamification")] — one route only
[ApiController]
[Route("api/[controller]")]
public class GamificationController : ControllerBase
{
    private readonly IGamificationService _gamificationService;

    public GamificationController(IGamificationService gamificationService)
    {
        _gamificationService = gamificationService;
    }

    // Phase 1A: Self-only guard — student can only see their own dashboard
    [HttpGet("dashboard/{studentId:guid}")]
    [Authorize]
    public async Task<ActionResult<StudentGameDashboardDto>> GetDashboard(Guid studentId, CancellationToken ct)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!Guid.TryParse(callerIdStr, out var callerId) || callerId != studentId)
            return Forbid();

        var dashboard = await _gamificationService.GetStudentDashboardAsync(studentId, ct);
        return Ok(dashboard);
    }

    // Phase 1A: Self-only guard — student can only see their own profile
    [HttpGet("profile/{studentId:guid}")]
    [Authorize]
    public async Task<ActionResult<GamificationProfileDto>> GetProfile(Guid studentId, CancellationToken ct)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!Guid.TryParse(callerIdStr, out var callerId) || callerId != studentId)
            return Forbid();

        var profile = await _gamificationService.GetStudentProfileAsync(studentId, ct);
        return Ok(profile);
    }

    // Phase 1A: Self-only guard — student can only see their own XP ledger
    [HttpGet("ledger/{studentId:guid}")]
    [Authorize]
    public async Task<ActionResult<List<XpTransactionDto>>> GetLedger(Guid studentId, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!Guid.TryParse(callerIdStr, out var callerId) || callerId != studentId)
            return Forbid();

        var ledger = await _gamificationService.GetStudentXpLedgerAsync(studentId, limit, ct);
        return Ok(ledger);
    }

    // Phase 1A: Self-only guard — student can only see their own mastery
    [HttpGet("mastery/{studentId:guid}")]
    [Authorize]
    public async Task<ActionResult<TopicMasteryMatrixDto>> GetMasteryMatrix(Guid studentId, CancellationToken ct)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!Guid.TryParse(callerIdStr, out var callerId) || callerId != studentId)
            return Forbid();

        var mastery = await _gamificationService.GetSkillMasteryMatrixAsync(studentId, ct);
        return Ok(mastery);
    }

    // Phase 1A: Self-only guard — student can only claim their own mission reward
    [HttpPost("missions/claim-grand/{studentId:guid}")]
    [Authorize]
    public async Task<ActionResult<ClaimDailyGrandMissionResponseDto>> ClaimGrandReward(Guid studentId, CancellationToken ct)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!Guid.TryParse(callerIdStr, out var callerId) || callerId != studentId)
            return Forbid();

        var res = await _gamificationService.ClaimDailyMissionGrandRewardAsync(studentId, ct);
        if (!res.Success)
        {
            return BadRequest(res);
        }
        return Ok(res);
    }

    // Phase 1A: Self-only guard — student can only use their own streak freeze
    [HttpPost("streak/freeze/{studentId:guid}")]
    [Authorize]
    public async Task<ActionResult<bool>> UseStreakFreeze(Guid studentId, CancellationToken ct)
    {
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!Guid.TryParse(callerIdStr, out var callerId) || callerId != studentId)
            return Forbid();

        bool success = await _gamificationService.UseStreakFreezeAsync(studentId, ct);
        if (!success)
        {
            return BadRequest("No streak freeze tokens available or streak already active.");
        }
        return Ok(true);
    }

    // Public: badges list is not private (any authenticated user can view)
    // Badge catalogue is public; a student's unlock state is only visible to that student
    // (or to staff).
    [HttpGet("badges")]
    public async Task<ActionResult<List<BadgeDto>>> GetAllBadges([FromQuery] Guid? studentId, CancellationToken ct)
    {
        if (studentId.HasValue)
        {
            var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
            bool isStaff = User.IsInRole("Admin") || User.IsInRole("Instructor");
            if (!Guid.TryParse(callerIdStr, out var callerId) || (callerId != studentId.Value && !isStaff))
                return Forbid();
        }

        var badges = await _gamificationService.GetAllBadgesAsync(studentId, ct);
        return Ok(badges);
    }

    // Public: leaderboard is intentionally visible to all
    [HttpGet("leaderboard")]
    public async Task<ActionResult<List<LeaderboardEntryDto>>> GetLeaderboard(
        [FromQuery] string type = "weekly", 
        [FromQuery] Guid? courseId = null, 
        [FromQuery] int top = 20, 
        CancellationToken ct = default)
    {
        if (type.Equals("course", StringComparison.OrdinalIgnoreCase) && courseId.HasValue)
        {
            return Ok(await _gamificationService.GetCourseLeaderboardAsync(courseId.Value, top, ct));
        }

        if (type.Equals("global", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(await _gamificationService.GetGlobalLeaderboardAsync(top, ct));
        }

        return Ok(await _gamificationService.GetWeeklyLeaderboardAsync(top, ct));
    }

    [HttpPost("focus-session")]
    [Authorize]
    public async Task<ActionResult<FocusSessionResponseDto>> RecordFocusSession([FromBody] FocusSessionRequestDto request, CancellationToken ct)
    {
        // XP always goes to the authenticated caller; any studentId in the body is ignored.
        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!Guid.TryParse(callerIdStr, out var callerId))
            return Unauthorized();

        var result = await _gamificationService.AwardFocusSessionXpAsync(request with { StudentId = callerId }, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    [HttpGet("multiplier")]
    public ActionResult<double> GetMultiplier()
    {
        return Ok(_gamificationService.GetXpMultiplier());
    }

    // Platform-wide setting: Admin only.
    [HttpPost("multiplier")]
    [Authorize(Roles = "Admin")]
    public ActionResult<double> SetMultiplier([FromBody] SetMultiplierRequest request)
    {
        _gamificationService.SetXpMultiplier(request.Multiplier);
        return Ok(_gamificationService.GetXpMultiplier());
    }
}
