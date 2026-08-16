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

[ApiController]
[Route("api/v1/gamification")]
public class GamificationController : ControllerBase
{
    private readonly IGamificationService _gamificationService;

    public GamificationController(IGamificationService gamificationService)
    {
        _gamificationService = gamificationService;
    }

    [HttpGet("dashboard/{studentId:guid}")]
    public async Task<ActionResult<StudentGameDashboardDto>> GetDashboard(Guid studentId, CancellationToken ct)
    {
        var dashboard = await _gamificationService.GetStudentDashboardAsync(studentId, ct);
        return Ok(dashboard);
    }

    [HttpGet("profile/{studentId:guid}")]
    public async Task<ActionResult<GamificationProfileDto>> GetProfile(Guid studentId, CancellationToken ct)
    {
        var profile = await _gamificationService.GetStudentProfileAsync(studentId, ct);
        return Ok(profile);
    }

    [HttpGet("ledger/{studentId:guid}")]
    public async Task<ActionResult<List<XpTransactionDto>>> GetLedger(Guid studentId, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var ledger = await _gamificationService.GetStudentXpLedgerAsync(studentId, limit, ct);
        return Ok(ledger);
    }

    [HttpGet("mastery/{studentId:guid}")]
    public async Task<ActionResult<TopicMasteryMatrixDto>> GetMasteryMatrix(Guid studentId, CancellationToken ct)
    {
        var mastery = await _gamificationService.GetSkillMasteryMatrixAsync(studentId, ct);
        return Ok(mastery);
    }

    [HttpPost("missions/claim-grand/{studentId:guid}")]
    public async Task<ActionResult<ClaimDailyGrandMissionResponseDto>> ClaimGrandReward(Guid studentId, CancellationToken ct)
    {
        var res = await _gamificationService.ClaimDailyMissionGrandRewardAsync(studentId, ct);
        if (!res.Success)
        {
            return BadRequest(res);
        }
        return Ok(res);
    }

    [HttpPost("streak/freeze/{studentId:guid}")]
    public async Task<ActionResult<bool>> UseStreakFreeze(Guid studentId, CancellationToken ct)
    {
        bool success = await _gamificationService.UseStreakFreezeAsync(studentId, ct);
        if (!success)
        {
            return BadRequest("No streak freeze tokens available or streak already active.");
        }
        return Ok(true);
    }

    [HttpGet("badges")]
    public async Task<ActionResult<List<BadgeDto>>> GetAllBadges([FromQuery] Guid? studentId, CancellationToken ct)
    {
        var badges = await _gamificationService.GetAllBadgesAsync(studentId, ct);
        return Ok(badges);
    }

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
}
