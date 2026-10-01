using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Globalization;
using System.Linq;
using EduFlow.Core.Constants;
using EduFlow.Core.DTOs;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduFlow.Api.Controllers;

// Phase 1B fix: Removed duplicate [Route("api/v1/gamification")] — one route only
[ApiController]
[Route("api/[controller]")]
public class GamificationController : ControllerBase
{
    private readonly IGamificationService _gamificationService;
    private readonly ApplicationDbContext _dbContext;
    private readonly IAuditLogWriter _auditLogWriter;

    public GamificationController(IGamificationService gamificationService, ApplicationDbContext dbContext, IAuditLogWriter auditLogWriter)
    {
        _gamificationService = gamificationService;
        _dbContext = dbContext;
        _auditLogWriter = auditLogWriter;
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
    public async Task<ActionResult<double>> GetMultiplier(CancellationToken ct)
    {
        return Ok(await _gamificationService.GetXpMultiplierAsync(ct));
    }

    // Platform-wide setting: Admin only. Stored as the "xp.multiplier" rule.
    [HttpPost("multiplier")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetMultiplier([FromBody] SetMultiplierRequest request, CancellationToken ct)
    {
        var result = await UpdateRuleAsync(GamificationRuleKeys.XpMultiplier, (decimal)request.Multiplier, ct);
        return result ?? Ok(await _gamificationService.GetXpMultiplierAsync(ct));
    }

    /// <summary>Every configurable reward value (Admin).</summary>
    [HttpGet("rules")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetRules(CancellationToken ct)
    {
        var rules = await _dbContext.GamificationRules.AsNoTracking()
            .OrderBy(r => r.Key)
            .Select(r => new { r.Key, r.Value, r.Description, r.UpdatedAt })
            .ToListAsync(ct);
        return Ok(rules);
    }

    [HttpPut("rules/{key}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRule(string key, [FromBody] UpdateGamificationRuleRequest request, CancellationToken ct)
        => await UpdateRuleAsync(key, request.Value, ct) ?? Ok(new { key, value = request.Value });

    /// <returns>An error result, or null on success.</returns>
    private async Task<IActionResult?> UpdateRuleAsync(string key, decimal value, CancellationToken ct)
    {
        var rule = await _dbContext.GamificationRules.FirstOrDefaultAsync(r => r.Key == key, ct);
        if (rule == null) return NotFound(new { message = $"Unknown gamification rule '{key}'." });

        if (value < 0) return BadRequest(new { message = "Rule values cannot be negative." });
        if (key == GamificationRuleKeys.XpMultiplier && (value < 1 || value > 5))
            return BadRequest(new { message = "The XP multiplier must be between 1 and 5." });

        var callerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        _auditLogWriter.AddEntry(Guid.Parse(callerIdStr!), role, "GamificationRule.Updated", "GamificationRule", rule.Id.ToString(),
            new Dictionary<string, object?>
            {
                ["previousValue"] = rule.Value.ToString(CultureInfo.InvariantCulture),
                ["newValue"] = value.ToString(CultureInfo.InvariantCulture)
            });

        rule.Value = value;
        rule.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(ct);
        return null;
    }
}

public record UpdateGamificationRuleRequest(decimal Value);
