using System;
using System.Security.Claims;
using System.Threading.Tasks;
using EduFlow.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GamificationController : ControllerBase
{
    private readonly IGamificationService _gamificationService;

    public GamificationController(IGamificationService gamificationService)
    {
        _gamificationService = gamificationService;
    }

    [HttpGet("students/me/profile")]
    [Authorize]
    public async Task<IActionResult> GetMyProfile()
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var profile = await _gamificationService.GetStudentProfileAsync(studentId);
        return Ok(profile);
    }

    [HttpGet("students/{studentId}/profile")]
    [Authorize]
    public async Task<IActionResult> GetStudentProfile(Guid studentId)
    {
        var profile = await _gamificationService.GetStudentProfileAsync(studentId);
        return Ok(profile);
    }

    [HttpGet("students/me/xp-ledger")]
    [Authorize]
    public async Task<IActionResult> GetMyXpLedger([FromQuery] int limit = 50)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var ledger = await _gamificationService.GetStudentXpLedgerAsync(studentId, limit);
        return Ok(ledger);
    }

    [HttpGet("badges")]
    public async Task<IActionResult> GetAllBadges()
    {
        Guid? studentId = null;
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!string.IsNullOrEmpty(uidClaim) && Guid.TryParse(uidClaim, out var parsedId))
        {
            studentId = parsedId;
        }

        var badges = await _gamificationService.GetAllBadgesAsync(studentId);
        return Ok(badges);
    }

    [HttpPost("streaks/freeze")]
    [Authorize]
    public async Task<IActionResult> UseStreakFreeze()
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var success = await _gamificationService.UseStreakFreezeAsync(studentId);
        if (!success)
        {
            return BadRequest(new { message = "No streak freeze tokens available or unable to freeze streak." });
        }

        return Ok(new { message = "Streak freeze successfully applied! Your streak is safe." });
    }
}
