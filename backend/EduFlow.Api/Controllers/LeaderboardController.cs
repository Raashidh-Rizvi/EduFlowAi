using System;
using System.Threading.Tasks;
using EduFlow.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeaderboardController : ControllerBase
{
    private readonly IGamificationService _gamificationService;

    public LeaderboardController(IGamificationService gamificationService)
    {
        _gamificationService = gamificationService;
    }

    [HttpGet("weekly")]
    public async Task<IActionResult> GetWeeklyLeaderboard([FromQuery] int top = 20)
    {
        var leaderboard = await _gamificationService.GetWeeklyLeaderboardAsync(top);
        return Ok(leaderboard);
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetCourseLeaderboard(Guid courseId, [FromQuery] int top = 20)
    {
        var leaderboard = await _gamificationService.GetCourseLeaderboardAsync(courseId, top);
        return Ok(leaderboard);
    }

    [HttpGet("global")]
    public async Task<IActionResult> GetGlobalLeaderboard([FromQuery] int top = 20)
    {
        var leaderboard = await _gamificationService.GetGlobalLeaderboardAsync(top);
        return Ok(leaderboard);
    }
}
