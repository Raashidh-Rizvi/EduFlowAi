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
public class ChallengesController : BaseApiController
{
    private readonly IGamificationService _gamificationService;

    public ChallengesController(ApplicationDbContext dbContext, IGamificationService gamificationService)
        : base(dbContext)
    {
        _gamificationService = gamificationService;
    }

    [HttpGet("daily")]
    [Authorize]
    public async Task<IActionResult> GetDailyMissions()
    {
        var missions = await DbContext.Challenges
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
    [Authorize]
    public async Task<IActionResult> GetCourseChallenges(Guid courseId)
    {
        var challenges = await DbContext.Challenges
            .Where(c => c.CourseId == courseId && c.IsActive)
            .ToListAsync();

        return Ok(challenges);
    }

    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateChallenge([FromBody] CreateChallengeRequest request)
    {
        if (request.CourseId.HasValue && request.CourseId.Value != Guid.Empty)
        {
            if (!await IsCourseOwnerOrAdmin(request.CourseId.Value))
                return Forbid();
        }

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

        await DbContext.Challenges.AddAsync(challenge);
        await DbContext.SaveChangesAsync();

        return Ok(challenge);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateChallenge(Guid id, [FromBody] CreateChallengeRequest request)
    {
        var challenge = await DbContext.Challenges.FirstOrDefaultAsync(c => c.Id == id);
        if (challenge == null)
        {
            return NotFound(new { message = "Challenge not found." });
        }

        if (!await IsChallengeOwnerOrAdmin(id))
            return Forbid();

        challenge.Title = request.Title;
        challenge.Description = request.Description;
        challenge.Difficulty = request.Difficulty;
        challenge.Type = request.Type;
        challenge.XpReward = request.XpReward;
        challenge.CoinReward = request.CoinReward;
        challenge.TimeLimitMinutes = request.TimeLimitMinutes;
        challenge.UpdatedAt = DateTime.UtcNow;

        await DbContext.SaveChangesAsync();
        return Ok(challenge);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteChallenge(Guid id)
    {
        var challenge = await DbContext.Challenges.FirstOrDefaultAsync(c => c.Id == id);
        if (challenge == null)
        {
            return NotFound(new { message = "Challenge not found." });
        }

        if (!await IsChallengeOwnerOrAdmin(id))
            return Forbid();

        DbContext.Challenges.Remove(challenge);
        await DbContext.SaveChangesAsync();
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

        var challenge = await DbContext.Challenges.FirstOrDefaultAsync(c => c.Id == id);
        if (challenge == null)
        {
            return NotFound(new { message = "Challenge not found." });
        }

        if (!challenge.IsActive)
        {
            return BadRequest(new { message = "This challenge is no longer active." });
        }

        // A challenge pays out once per student; repeat submissions earn nothing.
        var studentChallenge = await DbContext.StudentChallenges
            .FirstOrDefaultAsync(sc => sc.ChallengeId == id && sc.StudentId == studentId);
        if (studentChallenge?.Status == ChallengeStatus.Completed)
        {
            return Conflict(new { message = "You have already completed this challenge.", code = "CHALLENGE_ALREADY_COMPLETED" });
        }

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
            await DbContext.StudentChallenges.AddAsync(studentChallenge);
        }
        else
        {
            studentChallenge.Status = ChallengeStatus.Completed;
            studentChallenge.ScoreObtained = challenge.XpReward;
            studentChallenge.CompletedAt = DateTime.UtcNow;
        }

        // AwardXpAsync saves the tracked completion row and the XP ledger entry together.
        var result = await _gamificationService.AwardXpAsync(
            studentId,
            XpSourceType.DailyChallenge,
            challenge.Id,
            challenge.XpReward,
            $"Completed challenge: {challenge.Title}"
        );

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
