using System;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChallengesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IGamificationService _gamificationService;

    public ChallengesController(ApplicationDbContext dbContext, IGamificationService gamificationService)
    {
        _dbContext = dbContext;
        _gamificationService = gamificationService;
    }

    [HttpGet("daily")]
    public async Task<IActionResult> GetDailyMissions()
    {
        var missions = await _dbContext.Challenges
            .Where(c => c.IsActive && c.Type == ChallengeType.DailyMission)
            .Select(c => new DailyChallengeDto(
                c.Id,
                c.Title,
                c.Description,
                c.Difficulty,
                c.Type,
                c.XpReward,
                c.CoinReward,
                c.TimeLimitMinutes,
                ChallengeStatus.InProgress,
                DateTime.UtcNow.Date.AddDays(1).AddSeconds(-1)
            ))
            .ToListAsync();

        return Ok(missions);
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetCourseChallenges(Guid courseId)
    {
        var challenges = await _dbContext.Challenges
            .Where(c => c.CourseId == courseId && c.IsActive)
            .ToListAsync();

        return Ok(challenges);
    }

    [HttpPost("{id}/submit")]
    [Authorize]
    public async Task<IActionResult> SubmitChallenge(Guid id, [FromBody] SubmitChallengeRequest request)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var challenge = await _dbContext.Challenges.FirstOrDefaultAsync(c => c.Id == id);
        if (challenge == null)
        {
            return NotFound(new { message = "Challenge not found." });
        }

        // Award XP and coins through the Gamification Engine
        var result = await _gamificationService.AwardXpAsync(
            studentId,
            XpSourceType.DailyChallenge,
            challenge.Id,
            challenge.XpReward,
            $"Completed challenge: {challenge.Title}"
        );

        // Update StudentChallenge attempt status
        var studentChallenge = await _dbContext.StudentChallenges
            .FirstOrDefaultAsync(sc => sc.ChallengeId == id && sc.StudentId == studentId);

        if (studentChallenge == null)
        {
            studentChallenge = new StudentChallenge
            {
                ChallengeId = id,
                StudentId = studentId,
                Status = ChallengeStatus.Completed,
                ScoreObtained = challenge.XpReward,
                CompletedAt = DateTime.UtcNow
            };
            await _dbContext.StudentChallenges.AddAsync(studentChallenge);
        }
        else
        {
            studentChallenge.Status = ChallengeStatus.Completed;
            studentChallenge.ScoreObtained = challenge.XpReward;
            studentChallenge.CompletedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();

        return Ok(result);
    }
}
