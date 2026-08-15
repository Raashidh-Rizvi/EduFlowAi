using System;
using System.Collections.Generic;
using System.Linq;
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
public class QuizzesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IGamificationService _gamificationService;

    public QuizzesController(ApplicationDbContext dbContext, IGamificationService gamificationService)
    {
        _dbContext = dbContext;
        _gamificationService = gamificationService;
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetCourseQuizzes(Guid courseId)
    {
        var quizzes = await _dbContext.Assessments
            .Where(a => a.CourseId == courseId && a.Type == AssessmentType.Quiz)
            .Include(a => a.Questions)
            .Select(a => new QuizDto(
                a.Id,
                a.CourseId,
                a.Title,
                a.Description,
                a.Type,
                a.TimeLimitMinutes,
                a.PassingScorePercent,
                a.XpReward,
                a.CoinReward,
                a.Questions.Count
            ))
            .ToListAsync();

        return Ok(quizzes);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetQuizById(Guid id)
    {
        var quiz = await _dbContext.Assessments
            .Include(a => a.Questions.OrderBy(q => q.OrderIndex))
            .FirstOrDefaultAsync(a => a.Id == id);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        var questionsDto = quiz.Questions.Select(q => new QuizQuestionDto(
            q.Id,
            q.Prompt,
            q.Type,
            JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new List<string>(),
            q.Points,
            q.OrderIndex
        )).ToList();

        var result = new QuizDetailDto(
            quiz.Id,
            quiz.CourseId,
            quiz.Title,
            quiz.Description,
            quiz.TimeLimitMinutes,
            quiz.PassingScorePercent,
            quiz.XpReward,
            quiz.CoinReward,
            questionsDto
        );

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateQuiz([FromBody] CreateQuizRequest request)
    {
        var quiz = new Assessment
        {
            CourseId = request.CourseId,
            Title = request.Title,
            Description = request.Description,
            Type = AssessmentType.Quiz,
            TimeLimitMinutes = request.TimeLimitMinutes,
            PassingScorePercent = request.PassingScorePercent,
            XpReward = request.XpReward,
            CoinReward = request.CoinReward
        };

        foreach (var q in request.Questions)
        {
            quiz.Questions.Add(new Question
            {
                Prompt = q.Prompt,
                Type = q.Type,
                OptionsJson = JsonSerializer.Serialize(q.Options),
                CorrectAnswer = q.CorrectAnswer,
                Explanation = q.Explanation,
                Points = q.Points,
                OrderIndex = q.OrderIndex
            });
        }

        await _dbContext.Assessments.AddAsync(quiz);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuizById), new { id = quiz.Id }, quiz);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateQuiz(Guid id, [FromBody] CreateQuizRequest request)
    {
        var quiz = await _dbContext.Assessments.FirstOrDefaultAsync(a => a.Id == id);
        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        quiz.Title = request.Title;
        quiz.Description = request.Description;
        quiz.TimeLimitMinutes = request.TimeLimitMinutes;
        quiz.PassingScorePercent = request.PassingScorePercent;
        quiz.XpReward = request.XpReward;
        quiz.CoinReward = request.CoinReward;
        quiz.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return Ok(quiz);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteQuiz(Guid id)
    {
        var quiz = await _dbContext.Assessments.FirstOrDefaultAsync(a => a.Id == id);
        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        _dbContext.Assessments.Remove(quiz);
        await _dbContext.SaveChangesAsync();
        return Ok(new { message = "Quiz deleted successfully." });
    }

    [HttpPost("{id}/start")]
    [Authorize]
    public async Task<IActionResult> StartQuizAttempt(Guid id)
    {
        var quiz = await _dbContext.Assessments
            .Include(a => a.Questions.OrderBy(q => q.OrderIndex))
            .FirstOrDefaultAsync(a => a.Id == id);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        var questionsDto = quiz.Questions.Select(q => new QuizQuestionDto(
            q.Id,
            q.Prompt,
            q.Type,
            JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new List<string>(),
            q.Points,
            q.OrderIndex
        )).ToList();

        var response = new StartQuizAttemptResponse(
            AttemptId: Guid.NewGuid(),
            QuizId: quiz.Id,
            QuizTitle: quiz.Title,
            TimeLimitMinutes: quiz.TimeLimitMinutes,
            Questions: questionsDto
        );

        return Ok(response);
    }

    [HttpPost("submit")]
    [Authorize]
    public async Task<IActionResult> SubmitQuiz([FromBody] SubmitQuizRequest request)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var quiz = await _dbContext.Assessments
            .Include(a => a.Questions)
            .FirstOrDefaultAsync(a => a.Id == request.QuizId);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        int totalPoints = 0;
        int scoreObtained = 0;
        var breakdown = new List<QuestionResultItem>();

        var submission = new Submission
        {
            AssessmentId = quiz.Id,
            StudentId = studentId,
            SubmittedAt = DateTime.UtcNow
        };

        foreach (var q in quiz.Questions)
        {
            totalPoints += q.Points;
            var studentAns = request.Answers.FirstOrDefault(a => a.QuestionId == q.Id)?.SelectedAnswer ?? string.Empty;
            bool isCorrect = string.Equals(studentAns.Trim(), q.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase);
            int awarded = isCorrect ? q.Points : 0;
            scoreObtained += awarded;

            submission.Answers.Add(new SubmissionAnswer
            {
                QuestionId = q.Id,
                SelectedAnswer = studentAns,
                IsCorrect = isCorrect,
                PointsAwarded = awarded
            });

            breakdown.Add(new QuestionResultItem(
                q.Id,
                q.Prompt,
                studentAns,
                q.CorrectAnswer,
                isCorrect,
                awarded,
                q.Explanation
            ));
        }

        double percent = totalPoints > 0 ? ((double)scoreObtained / totalPoints) * 100 : 0;
        bool passed = percent >= quiz.PassingScorePercent;

        submission.ScoreObtained = scoreObtained;
        submission.MaxScore = totalPoints;
        submission.PercentageScore = percent;
        submission.Passed = passed;

        await _dbContext.Submissions.AddAsync(submission);
        await _dbContext.SaveChangesAsync();

        int xpEarned = 0;
        int coinsEarned = 0;

        if (passed)
        {
            var sourceType = percent >= 100 ? XpSourceType.PerfectScore : XpSourceType.QuizCompleted;
            var xpAmount = percent >= 100 ? quiz.XpReward + 50 : quiz.XpReward;

            var gamificationResult = await _gamificationService.AwardXpAsync(
                studentId,
                sourceType,
                quiz.Id,
                xpAmount,
                $"Completed Quiz: {quiz.Title} ({percent:F0}%)"
            );

            xpEarned = xpAmount;
            coinsEarned = gamificationResult.CoinsEarned;
        }

        return Ok(new QuizResultDto(
            SubmissionId: submission.Id,
            QuizId: quiz.Id,
            ScoreObtained: scoreObtained,
            MaxScore: totalPoints,
            PercentageScore: percent,
            Passed: passed,
            XpEarned: xpEarned,
            CoinsEarned: coinsEarned,
            Feedback: passed ? "Well done! You've mastered these concepts." : "Review the material and try again to earn full XP!",
            QuestionBreakdown: breakdown
        ));
    }
}
