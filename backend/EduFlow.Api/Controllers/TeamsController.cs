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
[Route("api/v1/gamification/squads")]
public class TeamsController : ControllerBase
{
    private readonly ITeamService _teamService;

    public TeamsController(ITeamService teamService)
    {
        _teamService = teamService;
    }

    [HttpGet("{studentId:guid}")]
    public async Task<ActionResult<SquadDto?>> GetStudentSquad(Guid studentId, CancellationToken ct)
    {
        var squad = await _teamService.GetStudentSquadAsync(studentId, ct);
        return Ok(squad);
    }

    [HttpGet("leaderboard")]
    public async Task<ActionResult<List<SquadLeaderboardEntryDto>>> GetLeaderboard([FromQuery] int top = 10, CancellationToken ct = default)
    {
        var leaderboard = await _teamService.GetSquadLeaderboardAsync(top, ct);
        return Ok(leaderboard);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<SquadActionResultDto>> CreateSquad([FromBody] CreateSquadRequest request, CancellationToken ct)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var leaderId))
        {
            return Unauthorized();
        }

        var result = await _teamService.CreateSquadAsync(leaderId, request, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("{id:guid}/join")]
    [Authorize]
    public async Task<ActionResult<SquadActionResultDto>> JoinSquad(Guid id, CancellationToken ct)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var result = await _teamService.JoinSquadAsync(id, studentId, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
