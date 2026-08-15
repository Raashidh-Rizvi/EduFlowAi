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

    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateChallenge([FromBody] CreateChallengeRequest request)
    {
        var challenge = new Challenge
        {
            CourseId = request.CourseId,
            Title = request.Title,
            Description = request.Description,
            Difficulty = request.Difficulty,
            Type = request.Type,
            XpReward = request.XpReward,
            CoinReward = request.CoinReward,
            TimeLimitMinutes = request.TimeLimitMinutes,
            QuestionsJson = request.QuestionsJson ?? "[]",
            IsActive = true
        };

        await _dbContext.Challenges.AddAsync(challenge);
        await _dbContext.SaveChangesAsync();

        return Ok(challenge);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateChallenge(Guid id, [FromBody] CreateChallengeRequest request)
    {
        var challenge = await _dbContext.Challenges.FirstOrDefaultAsync(c => c.Id == id);
        if (challenge == null)
        {
            return NotFound(new { message = "Challenge not found." });
        }

        challenge.Title = request.Title;
        challenge.Description = request.Description;
        challenge.Difficulty = request.Difficulty;
        challenge.Type = request.Type;
        challenge.XpReward = request.XpReward;
        challenge.CoinReward = request.CoinReward;
        challenge.TimeLimitMinutes = request.TimeLimitMinutes;
        challenge.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return Ok(challenge);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteChallenge(Guid id)
    {
        var challenge = await _dbContext.Challenges.FirstOrDefaultAsync(c => c.Id == id);
        if (challenge == null)
        {
            return NotFound(new { message = "Challenge not found." });
        }

        _dbContext.Challenges.Remove(challenge);
        await _dbContext.SaveChangesAsync();
        return Ok(new { message = "Challenge deleted successfully." });
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

public record CreateChallengeRequest(
    Guid? CourseId,
    string Title,
    string Description,
    DifficultyLevel Difficulty,
    ChallengeType Type,
    int XpReward,
    int CoinReward,
    int TimeLimitMinutes,
    string? QuestionsJson
);
