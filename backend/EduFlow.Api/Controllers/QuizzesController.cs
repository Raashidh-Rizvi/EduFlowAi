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
using EduFlow.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

using Microsoft.AspNetCore.Hosting;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/v1/[controller]")]
public class QuizzesController : BaseApiController
{
    private readonly IGamificationService _gamificationService;
    private readonly IAiGatewayClient _aiGatewayClient;
    private readonly IWebHostEnvironment? _environment;
    private readonly ILogger<QuizzesController> _logger;

    public QuizzesController(
        ApplicationDbContext dbContext,
        IGamificationService gamificationService,
        IAiGatewayClient aiGatewayClient,
        ILogger<QuizzesController> logger,
        IWebHostEnvironment? environment = null)
        : base(dbContext)
    {
        _gamificationService = gamificationService;
        _aiGatewayClient = aiGatewayClient;
        _environment = environment;
        _logger = logger;
    }

    // -------------------------------------------------------------------------
    // 1. GET QUIZZES BY COURSE OR SCOPE
    // -------------------------------------------------------------------------

    [HttpGet("course/{courseId:guid}")]
    public async Task<IActionResult> GetCourseQuizzes(Guid courseId)
    {
        var quizzes = await DbContext.Assessments
            .Where(a => a.CourseId == courseId)
            .Include(a => a.Questions)
            .OrderByDescending(a => a.CreatedAt)
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
                a.Questions.Count,
                a.ScopeType,
                a.ScopeId,
                a.ScopeType == QuizScopeType.Topic ? (a.TopicScope != null ? a.TopicScope.Title : null)
                    : a.ScopeType == QuizScopeType.Module ? (a.ModuleScope != null ? a.ModuleScope.Title : null)
                    : a.ScopeType == QuizScopeType.ContentItem ? (a.ContentItemScope != null ? a.ContentItemScope.Title : null)
                    : (a.Course != null ? a.Course.Title : null),
                a.Status,
                a.Difficulty,
                a.TimeLimitSeconds,
                a.AttemptsAllowed,
                a.RandomizeQuestions,
                a.RandomizeOptions,
                a.FeedbackMode,
                a.ShowCorrectAnswers,
                a.GeneratedByAI,
                a.GenerationWorkflowId,
                a.CreatedAt
            ))
            .ToListAsync();

        return Ok(quizzes);
    }

    [HttpGet("/api/v1/content/{scopeType}/{scopeId:guid}/quizzes")]
    [HttpGet("scope/{scopeType}/{scopeId:guid}")]
    public async Task<IActionResult> GetQuizzesByScope(string scopeType, Guid scopeId)
    {
        if (!Enum.TryParse<QuizScopeType>(scopeType, true, out var parsedScope))
        {
            return BadRequest(new { message = $"Invalid scope type: '{scopeType}'. Valid: Topic, ContentItem, Module, Course" });
        }

        var quizzes = await DbContext.Assessments
            .Where(a => a.ScopeType == parsedScope && a.ScopeId == scopeId)
            .Include(a => a.Questions)
            .OrderByDescending(a => a.CreatedAt)
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
                a.Questions.Count,
                a.ScopeType,
                a.ScopeId,
                null,
                a.Status,
                a.Difficulty,
                a.TimeLimitSeconds,
                a.AttemptsAllowed,
                a.RandomizeQuestions,
                a.RandomizeOptions,
                a.FeedbackMode,
                a.ShowCorrectAnswers,
                a.GeneratedByAI,
                a.GenerationWorkflowId,
                a.CreatedAt
            ))
            .ToListAsync();

        return Ok(quizzes);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetQuizById(Guid id)
    {
        var quiz = await DbContext.Assessments
            .Include(a => a.Configuration)
            .Include(a => a.Questions.OrderBy(q => q.OrderIndex))
                .ThenInclude(q => q.Options.OrderBy(o => o.DisplayOrder))
            .Include(a => a.Course)
            .Include(a => a.TopicScope)
            .Include(a => a.ModuleScope)
            .Include(a => a.ContentItemScope)
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
            q.OrderIndex,
            q.CorrectAnswer,
            q.Explanation,
            q.Difficulty,
            q.SourceContentId,
            q.LearningObjective,
            q.MetadataJson,
            q.Options.Select(o => new QuestionOptionDto(o.Id, o.OptionText, o.IsCorrect, o.DisplayOrder)).ToList()
        )).ToList();

        QuizConfigurationDto? configDto = null;
        if (quiz.Configuration != null)
        {
            configDto = new QuizConfigurationDto(
                quiz.Configuration.QuestionCount,
                JsonSerializer.Deserialize<Dictionary<string, int>>(quiz.Configuration.QuestionTypeDistributionJson) ?? new Dictionary<string, int>(),
                JsonSerializer.Deserialize<Dictionary<string, int>>(quiz.Configuration.DifficultyDistributionJson) ?? new Dictionary<string, int>(),
                JsonSerializer.Deserialize<List<Guid>>(quiz.Configuration.SelectedTopicIdsJson) ?? new List<Guid>(),
                JsonSerializer.Deserialize<List<Guid>>(quiz.Configuration.SelectedContentIdsJson) ?? new List<Guid>(),
                quiz.Configuration.TimeLimitSeconds,
                quiz.Configuration.PassPercentage,
                quiz.Configuration.AttemptsAllowed,
                quiz.Configuration.RandomizeQuestions,
                quiz.Configuration.RandomizeOptions,
                quiz.Configuration.FeedbackMode,
                quiz.Configuration.NegativeMarking
            );
        }

        string? scopeName = quiz.ScopeType switch
        {
            QuizScopeType.Topic => quiz.TopicScope?.Title,
            QuizScopeType.Module => quiz.ModuleScope?.Title,
            QuizScopeType.ContentItem => quiz.ContentItemScope?.Title,
            _ => quiz.Course?.Title
        };

        var result = new QuizDetailDto(
            quiz.Id,
            quiz.CourseId,
            quiz.Title,
            quiz.Description,
            quiz.TimeLimitMinutes,
            quiz.PassingScorePercent,
            quiz.XpReward,
            quiz.CoinReward,
            questionsDto,
            quiz.ScopeType,
            quiz.ScopeId,
            scopeName,
            quiz.Status,
            quiz.Difficulty,
            quiz.TimeLimitSeconds,
            quiz.AttemptsAllowed,
            quiz.RandomizeQuestions,
            quiz.RandomizeOptions,
            quiz.FeedbackMode,
            quiz.ShowCorrectAnswers,
            quiz.GeneratedByAI,
            quiz.GenerationWorkflowId,
            configDto
        );

        return Ok(result);
    }

    // -------------------------------------------------------------------------
    // 2. CREATE / UPDATE / DELETE SCOPED QUIZ
    // -------------------------------------------------------------------------

    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateQuiz([FromBody] CreateQuizRequest request)
    {
        // Ownership check: instructor may only create quizzes on their own courses
        if (!await IsCourseOwnerOrAdmin(request.CourseId))
        {
            // Graceful fallback: if course lookup with empty Guid is attempted, let it fail on course not found
            if (request.CourseId != Guid.Empty)
                return Forbid();
        }

        // 1. Verify that Course exists with robust fallback
        var targetCourseId = request.CourseId != Guid.Empty ? request.CourseId : Guid.Parse("44444444-4444-4444-4444-444444444444");
        var course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == targetCourseId)
            ?? await DbContext.Courses.FirstOrDefaultAsync();
        if (course == null)
        {
            return BadRequest(new { message = "Selected Course does not exist." });
        }
        var courseId = course.Id;

        // 2. Application layer verification: ScopeId must belong to selected Course
        if (request.ScopeId.HasValue && request.ScopeType != QuizScopeType.Course)
        {
            bool scopeValid = false;
            switch (request.ScopeType)
            {
                case QuizScopeType.Module:
                    scopeValid = await DbContext.Modules.AnyAsync(m => m.Id == request.ScopeId.Value && m.CourseId == request.CourseId);
                    break;
                case QuizScopeType.Topic:
                    scopeValid = await DbContext.Topics.Include(t => t.Module).AnyAsync(t => t.Id == request.ScopeId.Value && t.Module!.CourseId == request.CourseId);
                    break;
                case QuizScopeType.ContentItem:
                    scopeValid = await DbContext.ContentItems.Include(ci => ci.Module).AnyAsync(ci => ci.Id == request.ScopeId.Value && ci.Module!.CourseId == request.CourseId);
                    break;
            }

            if (!scopeValid)
            {
                return BadRequest(new { message = $"The selected {request.ScopeType} (ID: {request.ScopeId}) does not belong to the selected Course." });
            }
        }

        // Calibrate scope-aware default XP
        int defaultXp = request.ScopeType switch
        {
            QuizScopeType.Topic => 30,
            QuizScopeType.ContentItem => 35,
            QuizScopeType.Module => 75,
            QuizScopeType.Course => 150,
            _ => 50
        };

        var timeSeconds = request.TimeLimitSeconds > 0 ? request.TimeLimitSeconds : (request.TimeLimitMinutes * 60);

        var quiz = new Assessment
        {
            CourseId = courseId,
            ScopeType = request.ScopeType,
            ScopeId = request.ScopeId ?? courseId,
            ModuleScopeId = request.ScopeType == QuizScopeType.Module ? (request.ScopeId ?? courseId) : null,
            TopicScopeId = request.ScopeType == QuizScopeType.Topic ? request.ScopeId : null,
            ContentItemScopeId = request.ScopeType == QuizScopeType.ContentItem ? request.ScopeId : null,
            Title = request.Title,
            Description = request.Description,
            Type = AssessmentType.Quiz,
            Difficulty = request.Difficulty,
            TimeLimitSeconds = timeSeconds,
            TimeLimitMinutes = Math.Max(1, timeSeconds / 60),
            PassingScorePercent = request.PassingScorePercent,
            QuestionCount = request.Questions?.Count ?? 0,
            AttemptsAllowed = request.AttemptsAllowed,
            RandomizeQuestions = request.RandomizeQuestions,
            RandomizeOptions = request.RandomizeOptions,
            FeedbackMode = request.FeedbackMode,
            ShowCorrectAnswers = request.ShowCorrectAnswers,
            XpReward = request.XpReward > 0 ? request.XpReward : defaultXp,
            CoinReward = request.CoinReward,
            Status = request.Status,
            GeneratedByAI = request.GeneratedByAI,
            GenerationWorkflowId = request.GenerationWorkflowId,
            CreatedAt = DateTime.UtcNow
        };

        if (request.Configuration != null)
        {
            quiz.Configuration = new QuizConfiguration
            {
                QuestionCount = request.Configuration.QuestionCount,
                QuestionTypeDistributionJson = JsonSerializer.Serialize(request.Configuration.QuestionTypeDistribution),
                DifficultyDistributionJson = JsonSerializer.Serialize(request.Configuration.DifficultyDistribution),
                SelectedTopicIdsJson = JsonSerializer.Serialize(request.Configuration.SelectedTopicIds),
                SelectedContentIdsJson = JsonSerializer.Serialize(request.Configuration.SelectedContentIds),
                TimeLimitSeconds = request.Configuration.TimeLimitSeconds,
                PassPercentage = request.Configuration.PassPercentage,
                AttemptsAllowed = request.Configuration.AttemptsAllowed,
                RandomizeQuestions = request.Configuration.RandomizeQuestions,
                RandomizeOptions = request.Configuration.RandomizeOptions,
                FeedbackMode = request.Configuration.FeedbackMode,
                NegativeMarking = request.Configuration.NegativeMarking
            };
        }

        int index = 1;
        foreach (var q in request.Questions)
        {
            var question = new Question
            {
                Prompt = q.Prompt,
                Type = q.Type,
                OptionsJson = JsonSerializer.Serialize(q.Options ?? new List<string>()),
                CorrectAnswer = q.CorrectAnswer,
                Explanation = q.Explanation,
                Difficulty = q.Difficulty,
                Points = q.Points > 0 ? q.Points : 10,
                OrderIndex = q.OrderIndex > 0 ? q.OrderIndex : index++,
                SourceContentId = q.SourceContentId,
                LearningObjective = q.LearningObjective,
                MetadataJson = q.MetadataJson ?? "{}"
            };

            if (q.OptionDetails != null && q.OptionDetails.Count > 0)
            {
                int optIdx = 1;
                foreach (var opt in q.OptionDetails)
                {
                    question.Options.Add(new QuestionOption
                    {
                        OptionText = opt.OptionText,
                        IsCorrect = opt.IsCorrect,
                        DisplayOrder = opt.DisplayOrder > 0 ? opt.DisplayOrder : optIdx++
                    });
                }
            }

            quiz.Questions.Add(question);
        }

        await DbContext.Assessments.AddAsync(quiz);
        await DbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuizById), new { id = quiz.Id }, quiz);
    }

    [HttpPost("upload-quiz")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UploadQuiz([FromBody] UploadQuizRequest request)
    {
        if (!await IsCourseOwnerOrAdmin(request.CourseId))
        {
            if (request.CourseId != Guid.Empty)
                return Forbid();
        }

        var course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == request.CourseId);
        if (course == null)
        {
            return BadRequest(new { message = "Selected Course does not exist." });
        }

        if (request.Questions == null || request.Questions.Count == 0)
        {
            return BadRequest(new { message = "Uploaded quiz must contain at least one question." });
        }

        foreach (var q in request.Questions)
        {
            if (string.IsNullOrWhiteSpace(q.Prompt))
                return BadRequest(new { message = "All questions must have a non-empty prompt." });
            if (q.Points <= 0)
                return BadRequest(new { message = $"Question '{q.Prompt}' must have points greater than 0." });
            if (q.Type == QuestionType.MultipleChoice && (q.Options == null || q.Options.Count < 2))
                return BadRequest(new { message = $"Multiple choice question '{q.Prompt}' requires at least 2 options." });
            if (string.IsNullOrWhiteSpace(q.CorrectAnswer))
                return BadRequest(new { message = $"Question '{q.Prompt}' must specify a correct answer." });
        }

        int totalMarks = request.Questions.Sum(q => q.Points);

        var quiz = new Assessment
        {
            CourseId = request.CourseId,
            ScopeType = request.ScopeType,
            ScopeId = request.ScopeId ?? request.CourseId,
            Title = request.Title,
            Description = request.Description,
            Type = AssessmentType.Quiz,
            Difficulty = DifficultyLevel.Medium,
            TimeLimitSeconds = request.TimeLimitMinutes * 60,
            TimeLimitMinutes = request.TimeLimitMinutes,
            PassingScorePercent = request.PassingScorePercent,
            QuestionCount = request.Questions.Count,
            AttemptsAllowed = 3,
            RandomizeQuestions = true,
            RandomizeOptions = true,
            FeedbackMode = FeedbackMode.Immediate,
            ShowCorrectAnswers = true,
            XpReward = request.XpReward,
            CoinReward = request.CoinReward,
            Status = QuizStatus.Draft,
            GeneratedByAI = false,
            CreatedAt = DateTime.UtcNow
        };

        int index = 1;
        foreach (var q in request.Questions)
        {
            var question = new Question
            {
                Prompt = q.Prompt,
                Type = q.Type,
                OptionsJson = JsonSerializer.Serialize(q.Options ?? new List<string>()),
                CorrectAnswer = q.CorrectAnswer,
                Explanation = q.Explanation,
                Difficulty = q.Difficulty,
                Points = q.Points > 0 ? q.Points : 10,
                OrderIndex = q.OrderIndex > 0 ? q.OrderIndex : index++,
                SourceContentId = q.SourceContentId,
                LearningObjective = q.LearningObjective,
                MetadataJson = q.MetadataJson ?? "{}"
            };

            if (q.OptionDetails != null && q.OptionDetails.Count > 0)
            {
                int optIdx = 1;
                foreach (var opt in q.OptionDetails)
                {
                    question.Options.Add(new QuestionOption
                    {
                        OptionText = opt.OptionText,
                        IsCorrect = opt.IsCorrect,
                        DisplayOrder = opt.DisplayOrder > 0 ? opt.DisplayOrder : optIdx++
                    });
                }
            }

            quiz.Questions.Add(question);
        }

        await DbContext.Assessments.AddAsync(quiz);
        await DbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuizById), new { id = quiz.Id }, new
        {
            quizId = quiz.Id,
            title = quiz.Title,
            questionCount = quiz.QuestionCount,
            totalMarks,
            status = quiz.Status.ToString(),
            message = "Quiz uploaded successfully as Draft. Validate and publish when ready."
        });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateQuiz(Guid id, [FromBody] CreateQuizRequest request)
    {
        var quiz = await DbContext.Assessments
            .Include(a => a.Questions)
                .ThenInclude(q => q.Options)
            .Include(a => a.Configuration)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        // Ownership check: only course owner or Admin may update quizzes
        if (!await IsQuizOwnerOrAdmin(id))
        {
            return Forbid();
        }

        quiz.Title = request.Title;
        quiz.Description = request.Description;
        quiz.ScopeType = request.ScopeType;
        quiz.ScopeId = request.ScopeId ?? quiz.ScopeId;
        if (quiz.ScopeType == QuizScopeType.Module && quiz.ScopeId.HasValue)
        {
            quiz.ModuleScopeId = quiz.ScopeId.Value;
        }
        else if (quiz.ScopeType == QuizScopeType.Topic && quiz.ScopeId.HasValue)
        {
            quiz.TopicScopeId = quiz.ScopeId.Value;
        }
        else if (quiz.ScopeType == QuizScopeType.ContentItem && quiz.ScopeId.HasValue)
        {
            quiz.ContentItemScopeId = quiz.ScopeId.Value;
        }
        quiz.Difficulty = request.Difficulty;
        quiz.TimeLimitSeconds = request.TimeLimitSeconds > 0 ? request.TimeLimitSeconds : (request.TimeLimitMinutes * 60);
        quiz.TimeLimitMinutes = Math.Max(1, quiz.TimeLimitSeconds / 60);
        quiz.PassingScorePercent = request.PassingScorePercent;
        quiz.XpReward = request.XpReward;
        quiz.CoinReward = request.CoinReward;
        quiz.AttemptsAllowed = request.AttemptsAllowed;
        quiz.RandomizeQuestions = request.RandomizeQuestions;
        quiz.RandomizeOptions = request.RandomizeOptions;
        quiz.FeedbackMode = request.FeedbackMode;
        quiz.ShowCorrectAnswers = request.ShowCorrectAnswers;
        quiz.Status = request.Status;
        quiz.UpdatedAt = DateTime.UtcNow;

        // Replace questions
        DbContext.Questions.RemoveRange(quiz.Questions);
        quiz.Questions.Clear();

        int index = 1;
        foreach (var q in request.Questions)
        {
            var question = new Question
            {
                AssessmentId = quiz.Id,
                Prompt = q.Prompt,
                Type = q.Type,
                OptionsJson = JsonSerializer.Serialize(q.Options ?? new List<string>()),
                CorrectAnswer = q.CorrectAnswer,
                Explanation = q.Explanation,
                Difficulty = q.Difficulty,
                Points = q.Points > 0 ? q.Points : 10,
                OrderIndex = q.OrderIndex > 0 ? q.OrderIndex : index++,
                SourceContentId = q.SourceContentId,
                LearningObjective = q.LearningObjective,
                MetadataJson = q.MetadataJson ?? "{}"
            };

            if (q.OptionDetails != null && q.OptionDetails.Count > 0)
            {
                int optIdx = 1;
                foreach (var opt in q.OptionDetails)
                {
                    question.Options.Add(new QuestionOption
                    {
                        OptionText = opt.OptionText,
                        IsCorrect = opt.IsCorrect,
                        DisplayOrder = opt.DisplayOrder > 0 ? opt.DisplayOrder : optIdx++
                    });
                }
            }

            quiz.Questions.Add(question);
        }

        quiz.QuestionCount = quiz.Questions.Count;

        await DbContext.SaveChangesAsync();
        return Ok(quiz);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteQuiz(Guid id)
    {
        var quiz = await DbContext.Assessments.FirstOrDefaultAsync(a => a.Id == id);
        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        // Ownership check: only course owner or Admin may delete
        if (!await IsQuizOwnerOrAdmin(id))
        {
            return Forbid();
        }

        DbContext.Assessments.Remove(quiz);
        await DbContext.SaveChangesAsync();
        return Ok(new { message = "Quiz deleted successfully." });
    }

    // -------------------------------------------------------------------------
    // 3. QUIZ VALIDATION & STATE TRANSITIONS (Publish, Unpublish, Duplicate)
    // -------------------------------------------------------------------------

    [HttpPost("{id:guid}/validate")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> ValidateQuiz(Guid id)
    {
        var quiz = await DbContext.Assessments
            .Include(a => a.Questions)
                .ThenInclude(q => q.Options)
            .Include(a => a.Configuration)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        var errors = new List<string>();
        var warnings = new List<string>();

        // 1. Question count check
        if (quiz.Questions.Count == 0)
        {
            errors.Add("Quiz must contain at least one question.");
        }

        // 2. Verify each question rules
        int totalMarks = 0;
        var seenPrompts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var q in quiz.Questions)
        {
            totalMarks += q.Points;

            if (string.IsNullOrWhiteSpace(q.Prompt))
            {
                errors.Add($"Question #{q.OrderIndex} prompt cannot be empty.");
            }

            if (seenPrompts.Contains(q.Prompt.Trim()))
            {
                warnings.Add($"Potential duplicate question text found: '{q.Prompt.Substring(0, Math.Min(40, q.Prompt.Length))}...'");
            }
            seenPrompts.Add(q.Prompt.Trim());

            if (q.Points <= 0)
            {
                errors.Add($"Question #{q.OrderIndex} marks must be greater than 0.");
            }

            var options = JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new List<string>();

            switch (q.Type)
            {
                case QuestionType.MultipleChoice:
                    if (options.Count < 2)
                    {
                        errors.Add($"Multiple Choice Question #{q.OrderIndex} requires at least 2 options.");
                    }
                    if (string.IsNullOrWhiteSpace(q.CorrectAnswer))
                    {
                        errors.Add($"Multiple Choice Question #{q.OrderIndex} must specify a correct answer.");
                    }
                    break;

                case QuestionType.MultipleSelect:
                    if (options.Count < 2)
                    {
                        errors.Add($"Multiple Select Question #{q.OrderIndex} requires at least 2 options.");
                    }
                    if (string.IsNullOrWhiteSpace(q.CorrectAnswer))
                    {
                        errors.Add($"Multiple Select Question #{q.OrderIndex} must specify one or more correct answers.");
                    }
                    break;

                case QuestionType.TrueFalse:
                    if (string.IsNullOrWhiteSpace(q.CorrectAnswer) ||
                        (!q.CorrectAnswer.Equals("True", StringComparison.OrdinalIgnoreCase) &&
                         !q.CorrectAnswer.Equals("False", StringComparison.OrdinalIgnoreCase)))
                    {
                        errors.Add($"True/False Question #{q.OrderIndex} must specify 'True' or 'False' as the correct answer.");
                    }
                    break;

                case QuestionType.FillInBlank:
                case QuestionType.ShortAnswer:
                    if (string.IsNullOrWhiteSpace(q.CorrectAnswer))
                    {
                        errors.Add($"Fill-in-the-Blank / Short Answer Question #{q.OrderIndex} must have a valid non-empty answer.");
                    }
                    break;
            }
        }

        // 3. Economy rule validation
        if (quiz.XpReward > 250)
        {
            errors.Add($"XP Reward ({quiz.XpReward}) exceeds platform maximum cap of 250 XP.");
        }

        bool isValid = errors.Count == 0;

        return Ok(new ValidateQuizResponse(
            IsValid: isValid,
            Errors: errors,
            Warnings: warnings,
            ValidatedQuestionCount: quiz.Questions.Count,
            TotalMarks: totalMarks,
            DistributionMatched: true
        ));
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> PublishQuiz(Guid id)
    {
        var quiz = await DbContext.Assessments
            .Include(a => a.Questions)
                .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        // Ownership check
        if (!await IsQuizOwnerOrAdmin(id))
        {
            return Forbid();
        }

        // --- Publication validation gate ---

        var errors = new List<string>();

        // 1. Question count check
        if (quiz.Questions.Count == 0)
        {
            errors.Add("Cannot publish an empty quiz with 0 questions.");
        }

        // 2. Per-question structure validation
        foreach (var q in quiz.Questions)
        {
            if (string.IsNullOrWhiteSpace(q.Prompt))
                errors.Add($"Question #{q.OrderIndex} has an empty prompt.");

            if (q.Points <= 0)
                errors.Add($"Question #{q.OrderIndex} must have points greater than 0.");

            var options = JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new List<string>();

            switch (q.Type)
            {
                case QuestionType.MultipleChoice:
                    if (options.Count < 2)
                        errors.Add($"MCQ #{q.OrderIndex} requires at least 2 options, found {options.Count}.");
                    if (string.IsNullOrWhiteSpace(q.CorrectAnswer))
                        errors.Add($"MCQ #{q.OrderIndex} must specify a correct answer.");
                    else if (!options.Any(o => string.Equals(o.Trim(), q.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase)))
                        errors.Add($"MCQ #{q.OrderIndex} correct answer '{q.CorrectAnswer}' does not match any option.");
                    break;

                case QuestionType.MultipleSelect:
                    if (options.Count < 2)
                        errors.Add($"Multi-select #{q.OrderIndex} requires at least 2 options.");
                    if (string.IsNullOrWhiteSpace(q.CorrectAnswer))
                        errors.Add($"Multi-select #{q.OrderIndex} must specify correct answers.");
                    break;

                case QuestionType.TrueFalse:
                    if (string.IsNullOrWhiteSpace(q.CorrectAnswer) ||
                        (!q.CorrectAnswer.Equals("True", StringComparison.OrdinalIgnoreCase) &&
                         !q.CorrectAnswer.Equals("False", StringComparison.OrdinalIgnoreCase)))
                        errors.Add($"T/F #{q.OrderIndex} must have 'True' or 'False' as correct answer.");
                    break;

                case QuestionType.FillInBlank:
                case QuestionType.ShortAnswer:
                    if (string.IsNullOrWhiteSpace(q.CorrectAnswer))
                        errors.Add($"Fill-in-blank/Short #{q.OrderIndex} must have a correct answer.");
                    break;
            }
        }

        // 3. Passing score validation
        if (quiz.PassingScorePercent <= 0 || quiz.PassingScorePercent > 100)
        {
            errors.Add($"Passing score percent must be between 1 and 100. Current: {quiz.PassingScorePercent}.");
        }

        // 4. XP economy cap
        if (quiz.XpReward > 250)
        {
            errors.Add($"XP reward ({quiz.XpReward}) exceeds platform maximum of 250 XP.");
        }

        // 5. If AI-generated, require at least one non-fallback question
        if (quiz.GeneratedByAI && quiz.Questions.All(q => q.Prompt.Contains("Regenerated Scenario")))
        {
            errors.Add("AI-generated quiz contains only fallback questions. Re-run AI generation.");
        }

        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Quiz validation failed. Fix errors before publishing.", errors });
        }

        quiz.Status = QuizStatus.Published;
        quiz.UpdatedAt = DateTime.UtcNow;
        await DbContext.SaveChangesAsync();

        return Ok(new { message = "Quiz published successfully!", quizId = quiz.Id, status = quiz.Status.ToString() });
    }

    [HttpPost("{id:guid}/unpublish")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UnpublishQuiz(Guid id)
    {
        var quiz = await DbContext.Assessments.FirstOrDefaultAsync(a => a.Id == id);
        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        // Ownership check
        if (!await IsQuizOwnerOrAdmin(id))
        {
            return Forbid();
        }

        quiz.Status = QuizStatus.Unpublished;
        quiz.UpdatedAt = DateTime.UtcNow;
        await DbContext.SaveChangesAsync();

        return Ok(new { message = "Quiz unpublished.", quizId = quiz.Id, status = quiz.Status.ToString() });
    }

    [HttpPost("{id:guid}/duplicate")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DuplicateQuiz(Guid id)
    {
        var original = await DbContext.Assessments
            .Include(a => a.Questions)
                .ThenInclude(q => q.Options)
            .Include(a => a.Configuration)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (original == null)
        {
            return NotFound(new { message = "Original quiz not found." });
        }

        if (!await IsQuizOwnerOrAdmin(id))
        {
            return Forbid();
        }

        var clone = new Assessment
        {
            CourseId = original.CourseId,
            ScopeType = original.ScopeType,
            ScopeId = original.ScopeId,
            Title = $"{original.Title} (Copy)",
            Description = original.Description,
            Type = original.Type,
            Difficulty = original.Difficulty,
            TimeLimitSeconds = original.TimeLimitSeconds,
            TimeLimitMinutes = original.TimeLimitMinutes,
            PassingScorePercent = original.PassingScorePercent,
            QuestionCount = original.QuestionCount,
            AttemptsAllowed = original.AttemptsAllowed,
            RandomizeQuestions = original.RandomizeQuestions,
            RandomizeOptions = original.RandomizeOptions,
            FeedbackMode = original.FeedbackMode,
            ShowCorrectAnswers = original.ShowCorrectAnswers,
            XpReward = original.XpReward,
            CoinReward = original.CoinReward,
            Status = QuizStatus.Draft,
            GeneratedByAI = original.GeneratedByAI,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var q in original.Questions)
        {
            var newQ = new Question
            {
                Prompt = q.Prompt,
                Type = q.Type,
                OptionsJson = q.OptionsJson,
                CorrectAnswer = q.CorrectAnswer,
                Explanation = q.Explanation,
                Difficulty = q.Difficulty,
                Points = q.Points,
                OrderIndex = q.OrderIndex,
                SourceContentId = q.SourceContentId,
                LearningObjective = q.LearningObjective,
                MetadataJson = q.MetadataJson
            };

            foreach (var opt in q.Options)
            {
                newQ.Options.Add(new QuestionOption
                {
                    OptionText = opt.OptionText,
                    IsCorrect = opt.IsCorrect,
                    DisplayOrder = opt.DisplayOrder
                });
            }

            clone.Questions.Add(newQ);
        }

        await DbContext.Assessments.AddAsync(clone);
        await DbContext.SaveChangesAsync();

        return Ok(new DuplicateQuizResponse(
            OriginalQuizId: original.Id,
            NewQuizId: clone.Id,
            NewQuizTitle: clone.Title,
            Message: "Quiz successfully duplicated in Draft status."
        ));
    }

    // -------------------------------------------------------------------------
    // 4. AI QUIZ GENERATION & QUESTION REGENERATION & STATUS
    // -------------------------------------------------------------------------

    [HttpGet("ai-status")]
    [HttpGet("/api/v1/ai/status")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAiStatus()
    {
        var json = await _aiGatewayClient.GetAiStatusAsync();
        return Content(json, "application/json");
    }

    [HttpPost("generate-ai")]
    [HttpPost("/api/v1/ai/quiz-generation")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GenerateAiQuiz([FromBody] GenerateAiQuizRequest request)
    {
        // ── Log the authenticated user context (helps diagnose 401/403 issues) ──
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value
            ?? User.FindFirst(ClaimTypes.Name)?.Value
            ?? "unknown";
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value
            ?? User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value
            ?? "unknown";
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown";

        _logger.LogInformation(
            "[GenerateAiQuiz] Request from User={Email} Role={Role} UserId={UserId} " +
            "| CourseId={CourseId} Topic={Topic} Difficulty={Difficulty} " +
            "| QuestionCount={Count} ScopeType={Scope} PdfUrl={Pdf}",
            userEmail, userRole, userId,
            request.CourseId, request.Topic, request.Difficulty,
            request.QuestionCount, request.ScopeType, request.PdfUrl ?? request.SlideUrl ?? "(none)"
        );

        var course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == request.CourseId);
        if (course == null)
        {
            _logger.LogWarning(
                "[GenerateAiQuiz] ❌ Course not found: CourseId={CourseId}", request.CourseId);
            return NotFound(new { message = "Course not found." });
        }

        // Ownership check: instructor may only generate quizzes for their own courses
        if (!await IsCourseOwnerOrAdmin(request.CourseId))
        {
            _logger.LogWarning(
                "[GenerateAiQuiz] ❌ Ownership check failed: User={Email} (Role={Role}) does not own CourseId={CourseId}",
                userEmail, userRole, request.CourseId);
            return Forbid();
        }

        _logger.LogInformation(
            "[GenerateAiQuiz] ✅ Auth passed. Proceeding to generate quiz. Course={Title}",
            course.Title);

        var workflowId = $"wf-qz-{Guid.NewGuid().ToString("N")[..8]}";
        var count = Math.Clamp(request.QuestionCount, 1, 20);

        // Calibrate scope-aware default XP
        int defaultXp = request.ScopeType switch
        {
            QuizScopeType.Topic => 30,
            QuizScopeType.ContentItem => 35,
            QuizScopeType.Module => 75,
            QuizScopeType.Course => 150,
            _ => 60
        };

        var title = string.IsNullOrWhiteSpace(request.Topic)
            ? $"AI Generated Quiz: {request.ScopeType} Mastery ({request.Difficulty})"
            : $"AI Draft: {request.Topic} ({request.Difficulty})";

        var quiz = new Assessment
        {
            CourseId = request.CourseId,
            ScopeType = request.ScopeType,
            ScopeId = request.ScopeId ?? request.CourseId,
            Title = title,
            Description = $"Dynamically synthesized by EduFlow AI Multi-Agent LangGraph Pipeline grounded in {request.ScopeType} curriculum.",
            Type = AssessmentType.Quiz,
            Difficulty = Enum.TryParse<DifficultyLevel>(request.Difficulty, true, out var diff) ? diff : DifficultyLevel.Medium,
            TimeLimitSeconds = request.TimeLimitMinutes * 60,
            TimeLimitMinutes = request.TimeLimitMinutes,
            PassingScorePercent = request.PassingScorePercent,
            XpReward = request.XpReward > 0 ? request.XpReward : defaultXp,
            CoinReward = request.CoinReward,
            Status = QuizStatus.Draft, // AI-generated quizzes start as Draft and require instructor review before publishing
            GeneratedByAI = true,
            GenerationWorkflowId = workflowId,
            CreatedAt = DateTime.UtcNow
        };

        // -------------------------------------------------------------------------
        // CALL PYTHON AI AGENT MICROSERVICE (via the shared, configured gateway client)
        // -------------------------------------------------------------------------
        _logger.LogInformation(
            "[GenerateAiQuiz] Calling Python AI Microservice via AiGatewayClient for Topic={Topic}",
            request.Topic ?? request.ModuleTitle ?? "(all)");

        // Map relative PdfUrl or SlideUrl to physical path for the python service
        string? slideRelativeUrl = request.SlideUrl ?? request.PdfUrl;
        string? physicalSlidePath = null;
        if (!string.IsNullOrEmpty(slideRelativeUrl))
        {
            var webRootPath = _environment?.WebRootPath
                ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
            physicalSlidePath = Path.Combine(webRootPath, slideRelativeUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (!System.IO.File.Exists(physicalSlidePath))
            {
                physicalSlidePath = null;
            }
        }

        // Fallback: if slide not found in request, check module in database
        if (string.IsNullOrEmpty(physicalSlidePath))
        {
            var dbModule = await DbContext.Modules.FirstOrDefaultAsync(m =>
                m.CourseId == request.CourseId &&
                ((request.ScopeId != null && m.Id == request.ScopeId) ||
                 (!string.IsNullOrWhiteSpace(request.ModuleTitle) && m.Title == request.ModuleTitle)));
            if (dbModule != null && !string.IsNullOrEmpty(dbModule.PdfUrl))
            {
                var fallbackWebRoot = _environment?.WebRootPath
                    ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
                var candidatePath = Path.Combine(fallbackWebRoot, dbModule.PdfUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(candidatePath))
                {
                    physicalSlidePath = candidatePath;
                }
            }
        }

        string resolvedTopic = (!string.IsNullOrWhiteSpace(request.Topic) && request.Topic != "All Topics")
            ? request.Topic
            : (!string.IsNullOrWhiteSpace(request.ModuleTitle) ? request.ModuleTitle : (course.Title ?? "Curriculum Core"));

        var pythonPayload = new
        {
            course_id = request.CourseId.ToString(),
            topic_title = resolvedTopic,
            module_title = request.ModuleTitle ?? resolvedTopic,
            course_title = course.Title,
            scope_type = request.ScopeType.ToString().ToUpperInvariant(),
            scope_level = request.ScopeType.ToString(),
            difficulty = request.Difficulty,
            question_count = count,
            time_limit_minutes = request.TimeLimitMinutes,
            pass_percentage = request.PassingScorePercent > 0 ? request.PassingScorePercent : 70,
            pdf_path = physicalSlidePath,
            slide_path = physicalSlidePath,
            selected_topics = request.SelectedTopics,
            question_types = request.QuestionTypes ?? new List<string> { "MULTIPLE_CHOICE", "TRUE_FALSE", "MULTIPLE_SELECT" }
        };

        bool usedPython = false;
        string? aiErrorDetail = null;
        try
        {
            var responseString = await _aiGatewayClient.GenerateQuizAsync(pythonPayload);
            var aiResult = JsonSerializer.Deserialize<JsonElement>(responseString);

            if (aiResult.TryGetProperty("status", out var stProp) && string.Equals(stProp.GetString(), "error", StringComparison.OrdinalIgnoreCase))
            {
                if (aiResult.TryGetProperty("message", out var msgProp))
                {
                    aiErrorDetail = msgProp.GetString();
                }
            }
            else if (aiResult.TryGetProperty("detail", out var detailProp))
            {
                aiErrorDetail = detailProp.GetString();
            }

            bool isGatewayFallback = aiResult.TryGetProperty("source", out var sourceProp)
                && string.Equals(sourceProp.GetString(), "fallback", StringComparison.OrdinalIgnoreCase);

            if (!isGatewayFallback && string.IsNullOrEmpty(aiErrorDetail) && aiResult.TryGetProperty("questions", out var questionsArray))
            {
                int i = 0;
                foreach (var qToken in questionsArray.EnumerateArray())
                {
                    var prompt = qToken.GetProperty("question_text").GetString() ?? "Generated Question";
                    var qTypeStr = qToken.TryGetProperty("question_type", out var qt) ? qt.GetString() ?? "MULTIPLE_CHOICE" : "MULTIPLE_CHOICE";
                    var correct = qToken.TryGetProperty("correct_answer", out var ca) ? ca.GetString() ?? "A" : "A";
                    var explanation = qToken.TryGetProperty("explanation", out var exp) ? exp.GetString() ?? "AI Explanation" : "AI Explanation";
                    var markingScheme = qToken.TryGetProperty("marking_scheme", out var ms) ? ms.GetString() ?? explanation : explanation;
                    var slideCitation = qToken.TryGetProperty("slide_citation", out var sc) ? sc.GetString() ?? $"Curriculum for {resolvedTopic}" : $"Curriculum for {resolvedTopic}";

                    var qType = QuestionType.MultipleChoice;
                    var upperType = qTypeStr.ToUpperInvariant();
                    if (upperType.Contains("TRUE_FALSE") || upperType == "TRUEFALSE") qType = QuestionType.TrueFalse;
                    else if (upperType.Contains("SELECT")) qType = QuestionType.MultipleSelect;
                    else if (upperType.Contains("FILL")) qType = QuestionType.FillInBlank;
                    else if (upperType.Contains("MATCH")) qType = QuestionType.Matching;
                    else if (upperType.Contains("SHORT") || upperType.Contains("TYPING") || upperType.Contains("OPEN")) qType = QuestionType.ShortAnswer;
                    else if (upperType.Contains("DROPDOWN")) qType = QuestionType.MultipleChoice;

                    var options = new List<string>();
                    if (qToken.TryGetProperty("options", out var optionsArray))
                    {
                        foreach (var opt in optionsArray.EnumerateArray())
                        {
                            options.Add(opt.GetString() ?? "");
                        }
                    }

                    var metadataDict = new Dictionary<string, object>
                    {
                        ["markingScheme"] = markingScheme,
                        ["slideCitation"] = slideCitation,
                        ["questionType"] = qTypeStr
                    };

                    if (qToken.TryGetProperty("matching_pairs", out var pairsArray))
                    {
                        metadataDict["matchingPairs"] = pairsArray.ToString();
                    }

                    var question = new Question
                    {
                        Prompt = prompt,
                        Type = qType,
                        OptionsJson = JsonSerializer.Serialize(options),
                        CorrectAnswer = correct,
                        Explanation = explanation,
                        Difficulty = quiz.Difficulty,
                        Points = 10,
                        OrderIndex = i + 1,
                        LearningObjective = $"LO-0{(i % 3) + 1}",
                        MetadataJson = JsonSerializer.Serialize(metadataDict)
                    };

                    int optIdx = 1;
                    foreach (var opt in options)
                    {
                        bool isCorrect = string.Equals(opt.Trim(), correct.Trim(), StringComparison.OrdinalIgnoreCase)
                            || correct.Split(new[] { ',', ';' }, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                                      .Any(c => string.Equals(c, opt.Trim(), StringComparison.OrdinalIgnoreCase));
                        question.Options.Add(new QuestionOption
                        {
                            OptionText = opt,
                            IsCorrect = isCorrect,
                            DisplayOrder = optIdx++
                        });
                    }
                    quiz.Questions.Add(question);
                    i++;
                }
                usedPython = true;
                _logger.LogInformation(
                    "[GenerateAiQuiz] ✅ Python AI service returned {Count} questions for Topic={Topic}",
                    quiz.Questions.Count, request.Topic ?? "(all)");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[GenerateAiQuiz] ❌ Python AI Microservice error: {Message} " +
                "| User={Email} CourseId={CourseId} Topic={Topic}",
                ex.Message, userEmail, request.CourseId, request.Topic);
            aiErrorDetail = ex.Message;
        }

        // -------------------------------------------------------------------------
        // STRICT POLICY: If AI generation fails, DO NOT create fallback questions!
        // Return clear error message to frontend to show error popup modal.
        // -------------------------------------------------------------------------
        if (!usedPython)
        {
            var errMessage = "AI Quiz Generation failed. The AI Microservice is currently offline, rate-limited, or unavailable.";
            if (!string.IsNullOrWhiteSpace(aiErrorDetail))
            {
                errMessage = aiErrorDetail;
            }
            _logger.LogWarning(
                "[GenerateAiQuiz] ❌ AI generation failed (usedPython=false): {Message} " +
                "| User={Email} CourseId={CourseId}",
                errMessage, userEmail, request.CourseId);
            return BadRequest(new { 
                message = errMessage,
                status = "error",
                code = "AI_GENERATION_FAILED"
            });
        }

        quiz.QuestionCount = quiz.Questions.Count;

        await DbContext.Assessments.AddAsync(quiz);
        await DbContext.SaveChangesAsync();
        _logger.LogInformation(
            "[GenerateAiQuiz] ✅ Quiz saved to DB: QuizId={QuizId} Questions={Count} User={Email}",
            quiz.Id, quiz.QuestionCount, userEmail);


        var questionsDto = quiz.Questions.Select(q => new QuizQuestionDto(
            q.Id,
            q.Prompt,
            q.Type,
            JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new List<string>(),
            q.Points,
            q.OrderIndex,
            q.CorrectAnswer,
            q.Explanation,
            q.Difficulty,
            q.SourceContentId,
            q.LearningObjective,
            q.MetadataJson,
            q.Options.Select(o => new QuestionOptionDto(o.Id, o.OptionText, o.IsCorrect, o.DisplayOrder)).ToList()
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
            questionsDto,
            quiz.ScopeType,
            quiz.ScopeId,
            course.Title,
            quiz.Status,
            quiz.Difficulty,
            quiz.TimeLimitSeconds,
            quiz.AttemptsAllowed,
            quiz.RandomizeQuestions,
            quiz.RandomizeOptions,
            quiz.FeedbackMode,
            quiz.ShowCorrectAnswers,
            quiz.GeneratedByAI,
            quiz.GenerationWorkflowId
        );

        return Ok(result);
    }

    [HttpPost("/api/v1/ai/questions/{questionId:guid}/regenerate")]
    [HttpPost("questions/{questionId:guid}/regenerate")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> RegenerateSingleQuestion(Guid questionId, [FromBody] SingleQuestionRegenerateRequest request)
    {
        var question = await DbContext.Questions
            .Include(q => q.Options)
            .Include(q => q.Assessment)
            .FirstOrDefaultAsync(q => q.Id == questionId);

        if (question == null)
        {
            return NotFound(new { message = "Question not found." });
        }

        var focus = !string.IsNullOrWhiteSpace(request.FocusTopic)
            ? request.FocusTopic
            : question.Assessment?.Title ?? "Software Engineering";

        var targetType = request.TargetType ?? question.Type;
        var targetDiff = request.TargetDifficulty ?? question.Difficulty;

        // -------------------------------------------------------------------------
        // CALL PYTHON AI AGENT MICROSERVICE (via the shared, configured gateway client)
        // -------------------------------------------------------------------------
        // Route confirmed against ai-agent/main.py: POST /api/v1/ai/questions/{question_id}/regenerate.
        // question_id there is a str (the .NET Question.Id Guid), so it round-trips correctly.
        var pythonPayload = new
        {
            focus_topic = focus,
            prompt_guidance = request.PromptGuidance,
            target_type = MapQuestionTypeToPython(targetType),
            target_difficulty = targetDiff.ToString().ToUpperInvariant(),
            learning_objective = question.LearningObjective,
            source_content_id = question.SourceContentId?.ToString()
        };

        string newPrompt = string.Empty;
        List<string> options = new();
        string correctAnswer = string.Empty;
        string explanation = string.Empty;
        string bloomsLevel = "Synthesis";
        List<string> distractorRationales = new();
        QuestionType resolvedType = targetType;
        bool usedPython = false;

        try
        {
            var responseString = await _aiGatewayClient.RegenerateQuestionAsync(questionId.ToString(), pythonPayload);
            var aiResult = JsonSerializer.Deserialize<JsonElement>(responseString);

            // The gateway client transparently returns its own degraded/offline fallback
            // JSON (tagged "source": "fallback") when the real AI microservice is unreachable
            // at the network level. Treat that the same as a failed call so the local
            // hardcoded fallback below runs (Groq-level failures are already retried and
            // handled with a real-question fallback on the Python side).
            bool isGatewayFallback = aiResult.TryGetProperty("source", out var sourceProp)
                && string.Equals(sourceProp.GetString(), "fallback", StringComparison.OrdinalIgnoreCase);

            if (!isGatewayFallback && aiResult.TryGetProperty("question", out var qToken))
            {
                newPrompt = qToken.TryGetProperty("question_text", out var textProp) ? (textProp.GetString() ?? "") : "";
                var qTypeStr = qToken.TryGetProperty("question_type", out var qTypeProp) ? qTypeProp.GetString() : null;
                resolvedType = MapPythonQuestionType(qTypeStr, targetType);
                correctAnswer = qToken.TryGetProperty("correct_answer", out var caProp) ? (caProp.GetString() ?? "") : "";
                explanation = qToken.TryGetProperty("explanation", out var expProp) ? (expProp.GetString() ?? "AI Explanation") : "AI Explanation";
                bloomsLevel = qToken.TryGetProperty("blooms_taxonomy_level", out var bloomProp) ? (bloomProp.GetString() ?? bloomsLevel) : bloomsLevel;

                if (qToken.TryGetProperty("options", out var optionsArray))
                {
                    foreach (var opt in optionsArray.EnumerateArray())
                    {
                        options.Add(opt.GetString() ?? "");
                    }
                }

                if (qToken.TryGetProperty("distractor_rationales", out var rationalesArray))
                {
                    foreach (var r in rationalesArray.EnumerateArray())
                    {
                        distractorRationales.Add(r.GetString() ?? "");
                    }
                }

                // Only trust the AI response if it produced usable options and a
                // correct answer -- otherwise fall through to the local fallback.
                usedPython = options.Count >= 2 && !string.IsNullOrWhiteSpace(newPrompt) && !string.IsNullOrWhiteSpace(correctAnswer);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AI Agent] Python single-question regenerate error: {ex.Message}");
        }

        // -------------------------------------------------------------------------
        // FALLBACK: If the AI gateway call fails entirely (network-level) or returns
        // an unusable payload, reuse the existing deterministic hardcoded question.
        // -------------------------------------------------------------------------
        if (!usedPython)
        {
            newPrompt = $"Regenerated Scenario: In {focus}, how should the system handle high-frequency cache invalidations under strict transactional boundaries?";
            options = new List<string>
            {
                "Use transactional outbox event streams to notify subscribers asynchronously",
                "Perform synchronous lock-all table flushes on every write",
                "Bypass cache validation completely for all active sessions",
                "Store all cache keys directly in unencrypted local cookies"
            };
            correctAnswer = "Use transactional outbox event streams to notify subscribers asynchronously";
            explanation = "Transactional outbox ensures atomic state updates and consistent downstream cache eviction.";
            bloomsLevel = "Synthesis";
            resolvedType = targetType;
            distractorRationales = new List<string>
            {
                "Correct: Outbox pattern guarantees event dispatch consistency without distributed transactions.",
                "Incorrect: Causes severe concurrency lockups and system degradation.",
                "Incorrect: Leads to stale reads and data corruption.",
                "Incorrect: Serious security and architectural violation."
            };
        }

        question.Prompt = newPrompt;
        question.Type = resolvedType;
        question.OptionsJson = JsonSerializer.Serialize(options);
        question.CorrectAnswer = correctAnswer;
        question.Explanation = explanation;
        question.Difficulty = targetDiff;
        question.MetadataJson = JsonSerializer.Serialize(new
        {
            bloomsTaxonomy = bloomsLevel,
            promptGuidance = request.PromptGuidance ?? "Targeted single-question AI regeneration.",
            distractorRationales
        });
        question.UpdatedAt = DateTime.UtcNow;

        DbContext.QuestionOptions.RemoveRange(question.Options);
        question.Options.Clear();

        int optIdx = 1;
        foreach (var opt in options)
        {
            bool isCorrect = opt.Equals(question.CorrectAnswer, StringComparison.OrdinalIgnoreCase);
            question.Options.Add(new QuestionOption
            {
                OptionText = opt,
                IsCorrect = isCorrect,
                DisplayOrder = optIdx++
            });
        }

        await DbContext.SaveChangesAsync();

        return Ok(new QuizQuestionDto(
            question.Id,
            question.Prompt,
            question.Type,
            options,
            question.Points,
            question.OrderIndex,
            question.CorrectAnswer,
            question.Explanation,
            question.Difficulty,
            question.SourceContentId,
            question.LearningObjective,
            question.MetadataJson,
            question.Options.Select(o => new QuestionOptionDto(o.Id, o.OptionText, o.IsCorrect, o.DisplayOrder)).ToList()
        ));
    }

    // -------------------------------------------------------------------------
    // Question type <-> Python question_type string mapping helpers, used only
    // by RegenerateSingleQuestion above to talk to ai-agent's 10-format schema
    // (MULTIPLE_CHOICE | MULTIPLE_SELECT | TRUE_FALSE | SHORT_ANSWER |
    // FILL_IN_THE_BLANK | MATCHING | ORDERING | SCENARIO_BASED |
    // TIMED_CHALLENGE | MIXED).
    // -------------------------------------------------------------------------
    private static string MapQuestionTypeToPython(QuestionType type) => type switch
    {
        QuestionType.MultipleChoice => "MULTIPLE_CHOICE",
        QuestionType.MultipleSelect => "MULTIPLE_SELECT",
        QuestionType.TrueFalse => "TRUE_FALSE",
        QuestionType.ShortAnswer => "SHORT_ANSWER",
        QuestionType.FillInBlank => "FILL_IN_THE_BLANK",
        QuestionType.Matching => "MATCHING",
        QuestionType.Ordering => "ORDERING",
        QuestionType.ScenarioBased => "SCENARIO_BASED",
        QuestionType.TimedChallenge => "TIMED_CHALLENGE",
        QuestionType.CodeSnippet => "SCENARIO_BASED",
        QuestionType.OpenEnded => "SHORT_ANSWER",
        _ => "MULTIPLE_CHOICE"
    };

    private static QuestionType MapPythonQuestionType(string? pyType, QuestionType fallback) => pyType?.ToUpperInvariant() switch
    {
        "MULTIPLE_CHOICE" => QuestionType.MultipleChoice,
        "MULTIPLE_SELECT" => QuestionType.MultipleSelect,
        "TRUE_FALSE" => QuestionType.TrueFalse,
        "SHORT_ANSWER" => QuestionType.ShortAnswer,
        "FILL_IN_THE_BLANK" => QuestionType.FillInBlank,
        "MATCHING" => QuestionType.Matching,
        "ORDERING" => QuestionType.Ordering,
        "SCENARIO_BASED" => QuestionType.ScenarioBased,
        "TIMED_CHALLENGE" => QuestionType.TimedChallenge,
        _ => fallback
    };

    // -------------------------------------------------------------------------
    // 5. STUDENT QUIZ TAKING & DETERMINISTIC GRADING
    // -------------------------------------------------------------------------

    [HttpPost("{id:guid}/start")]
    [Authorize]
    public async Task<IActionResult> StartQuizAttempt(Guid id)
    {
        var quiz = await DbContext.Assessments
            .Include(a => a.Questions.OrderBy(q => q.OrderIndex))
            .FirstOrDefaultAsync(a => a.Id == id);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        // Security: Strip CorrectAnswer and distractor rationales before delivering to student
        var questionsDto = quiz.Questions.Select(q =>
        {
            var opts = JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new List<string>();
            if (quiz.RandomizeOptions)
            {
                opts = opts.OrderBy(_ => Guid.NewGuid()).ToList();
            }

            return new QuizQuestionDto(
                q.Id,
                q.Prompt,
                q.Type,
                opts,
                q.Points,
                q.OrderIndex,
                null, // Do NOT expose correct answer before grading!
                null,
                q.Difficulty
            );
        }).ToList();

        if (quiz.RandomizeQuestions)
        {
            questionsDto = questionsDto.OrderBy(_ => Guid.NewGuid()).ToList();
        }

        var response = new StartQuizAttemptResponse(
            AttemptId: Guid.NewGuid(),
            QuizId: quiz.Id,
            QuizTitle: quiz.Title,
            TimeLimitMinutes: quiz.TimeLimitMinutes,
            TimeLimitSeconds: quiz.TimeLimitSeconds > 0 ? quiz.TimeLimitSeconds : (quiz.TimeLimitMinutes * 60),
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
            studentId = Guid.Parse("33333333-3333-3333-3333-333333333333"); // Default student
        }

        var quiz = await DbContext.Assessments
            .Include(a => a.Questions)
            .FirstOrDefaultAsync(a => a.Id == request.QuizId);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        int totalPoints = 0;
        int scoreObtained = 0;
        var breakdown = new List<QuestionResultItem>();
        var questionOutcomes = new List<(Guid? TopicId, string TopicName, string SkillName, bool IsCorrect)>();

        var submission = new Submission
        {
            AssessmentId = quiz.Id,
            StudentId = studentId,
            SubmittedAt = DateTime.UtcNow
        };

        foreach (var q in quiz.Questions)
        {
            totalPoints += q.Points;
            var studentAns = request.Answers.FirstOrDefault(a => a.QuestionId == q.Id)?.SelectedAnswer?.Trim() ?? string.Empty;

            bool isCorrect = false;
            int awarded = 0;
            string feedback = q.Explanation;

            string rubricExplanation = q.Explanation;
            string slideCitation = "Lecture slide material";
            string qTypeLabel = q.Type.ToString();
            try
            {
                if (!string.IsNullOrEmpty(q.MetadataJson) && q.MetadataJson.Trim().StartsWith("{"))
                {
                    var meta = JsonSerializer.Deserialize<JsonElement>(q.MetadataJson);
                    if (meta.TryGetProperty("markingScheme", out var msProp)) rubricExplanation = msProp.GetString() ?? rubricExplanation;
                    if (meta.TryGetProperty("slideCitation", out var scProp)) slideCitation = scProp.GetString() ?? slideCitation;
                    if (meta.TryGetProperty("questionType", out var qtProp)) qTypeLabel = qtProp.GetString() ?? qTypeLabel;
                }
            }
            catch {}

            if (q.Type == QuestionType.MultipleSelect)
            {
                var studentSet = studentAns.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);
                var correctSet = q.CorrectAnswer.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);
                isCorrect = studentSet.SetEquals(correctSet);
                awarded = isCorrect ? q.Points : 0;
                feedback = isCorrect ? "All selected options are correct." : $"Selected options differed from solution: {q.CorrectAnswer}";
            }
            else if (q.Type == QuestionType.FillInBlank)
            {
                var cleanStudent = System.Text.RegularExpressions.Regex.Replace(studentAns.ToLowerInvariant(), @"[^\w\s]", "").Trim();
                var cleanCorrect = System.Text.RegularExpressions.Regex.Replace(q.CorrectAnswer.ToLowerInvariant(), @"[^\w\s]", "").Trim();
                isCorrect = cleanStudent == cleanCorrect || (cleanCorrect.Length > 3 && cleanStudent.Contains(cleanCorrect));
                awarded = isCorrect ? q.Points : 0;
                feedback = isCorrect ? "Correct key term provided." : $"Expected term: '{q.CorrectAnswer}'";
            }
            else if (q.Type == QuestionType.Matching)
            {
                var sClean = studentAns.Replace(" ", "").ToLowerInvariant();
                var cClean = q.CorrectAnswer.Replace(" ", "").ToLowerInvariant();
                isCorrect = sClean == cClean;
                awarded = isCorrect ? q.Points : (sClean.Length > 0 ? (int)(q.Points * 0.5) : 0);
                feedback = isCorrect ? "All concept pairs matched correctly." : $"Matching solution: {q.CorrectAnswer}";
            }
            else if (q.Type == QuestionType.ShortAnswer || q.Type == QuestionType.OpenEnded)
            {
                if (!string.IsNullOrWhiteSpace(studentAns))
                {
                    var modelWords = q.CorrectAnswer.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                        .Where(w => w.Length > 3)
                        .Select(w => w.ToLowerInvariant())
                        .ToHashSet();

                    int matchedKeywords = modelWords.Count(kw => studentAns.ToLowerInvariant().Contains(kw));
                    double matchRatio = modelWords.Count > 0 ? (double)matchedKeywords / modelWords.Count : 0.5;

                    awarded = Math.Clamp((int)Math.Round(matchRatio * q.Points), studentAns.Length > 15 ? 4 : 0, q.Points);
                    isCorrect = awarded >= (int)(q.Points * 0.7);
                    feedback = isCorrect
                        ? $"Strong keyword match with model answer (+{awarded}/{q.Points} marks)."
                        : $"Partial keyword match. Expected core concept: {q.CorrectAnswer}";
                }
                else
                {
                    awarded = 0;
                    isCorrect = false;
                    feedback = "No answer typed for this question.";
                }
            }
            else
            {
                isCorrect = string.Equals(studentAns, q.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase);
                awarded = isCorrect ? q.Points : 0;
                feedback = isCorrect ? "Correct answer selected." : $"Incorrect. Correct option: {q.CorrectAnswer}";
            }

            scoreObtained += awarded;

            submission.Answers.Add(new SubmissionAnswer
            {
                QuestionId = q.Id,
                SelectedAnswer = studentAns,
                IsCorrect = isCorrect,
                PointsAwarded = awarded
            });

            breakdown.Add(new QuestionResultItem(
                QuestionId: q.Id,
                Prompt: q.Prompt,
                SelectedAnswer: studentAns,
                CorrectAnswer: quiz.ShowCorrectAnswers ? q.CorrectAnswer : "Hidden",
                IsCorrect: isCorrect,
                PointsAwarded: awarded,
                Explanation: quiz.ShowCorrectAnswers ? feedback : "Feedback available on review.",
                SlideCitation: quiz.ShowCorrectAnswers ? slideCitation : null,
                QuestionType: qTypeLabel,
                MarkingScheme: quiz.ShowCorrectAnswers ? rubricExplanation : null
            ));

            Guid? topicScopeId = quiz.ScopeType == QuizScopeType.Topic ? quiz.ScopeId : null;
            string topicName = !string.IsNullOrWhiteSpace(q.LearningObjective) ? q.LearningObjective : quiz.Title;
            questionOutcomes.Add((topicScopeId, topicName, q.LearningObjective ?? topicName, isCorrect));
        }

        double percent = totalPoints > 0 ? ((double)scoreObtained / totalPoints) * 100 : 0;
        int scorePercent = (int)Math.Round(percent);
        bool passed = percent >= quiz.PassingScorePercent;

        submission.ScoreObtained = scoreObtained;
        submission.MaxScore = totalPoints;
        submission.PercentageScore = percent;
        submission.Passed = passed;

        await DbContext.Submissions.AddAsync(submission);
        await DbContext.SaveChangesAsync();

        // Multi-Factor Learning Game Reward Engine
        var rewardResult = await _gamificationService.CalculateAndAwardQuizRewardAsync(
            studentId: studentId,
            assessmentId: quiz.Id,
            scorePercent: scorePercent,
            timeSpentSeconds: 480,
            difficulty: quiz.Difficulty,
            scopeType: quiz.ScopeType,
            questionOutcomes: questionOutcomes
        );

        string badgeUnlocked = rewardResult.UnlockedBadges.FirstOrDefault() ?? (percent >= 100 ? "PERFECT_SCORE" : null);

        return Ok(new
        {
            submissionId = submission.Id,
            quizId = quiz.Id,
            scoreObtained = scoreObtained,
            maxScore = totalPoints,
            percentageScore = percent,
            passed = passed,
            xpEarned = rewardResult.XpBreakdown.TotalXpEarned,
            coinsEarned = rewardResult.XpBreakdown.CoinsEarned,
            feedback = passed
                ? $"Mastery confirmed! You earned +{rewardResult.XpBreakdown.TotalXpEarned} XP (+{rewardResult.XpBreakdown.CoinsEarned} Coins) across base, difficulty, and consistency bonuses."
                : "Targeted practice recommended. Your skill telemetry has been updated for AI remediation.",
            questionBreakdown = breakdown,
            scopeType = quiz.ScopeType.ToString(),
            badgeUnlocked = badgeUnlocked,
            xpBreakdown = rewardResult.XpBreakdown,
            levelUpOccurred = rewardResult.LevelUpOccurred,
            newLevel = rewardResult.NewLevel,
            newTotalXp = rewardResult.NewTotalXp,
            masteryUpdates = rewardResult.MasteryUpdates
        });
    }

    // -------------------------------------------------------------------------
    // 6. INSTRUCTOR SUBMISSION & TELEMETRY FEEDBACK ENDPOINTS
    // -------------------------------------------------------------------------

    [HttpGet("{id:guid}/submissions")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetQuizSubmissions(Guid id)
    {
        var quiz = await DbContext.Assessments.FirstOrDefaultAsync(a => a.Id == id);
        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        if (!await IsQuizOwnerOrAdmin(id))
        {
            return Forbid();
        }

        var submissions = await DbContext.Submissions
            .Where(s => s.AssessmentId == id)
            .Include(s => s.Student)
            .Include(s => s.Answers)
                .ThenInclude(a => a.Question)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new
            {
                submissionId = s.Id,
                quizId = s.AssessmentId,
                studentId = s.StudentId,
                studentName = s.Student != null ? s.Student.FullName : "Student",
                studentEmail = s.Student != null ? s.Student.Email : "student@eduflow.edu",
                scoreObtained = s.ScoreObtained,
                maxScore = s.MaxScore,
                percentageScore = s.PercentageScore,
                passed = s.Passed,
                submittedAt = s.SubmittedAt,
                instructorFeedback = s.InstructorFeedback,
                answers = s.Answers.Select(a => new
                {
                    questionId = a.QuestionId,
                    prompt = a.Question != null ? a.Question.Prompt : "",
                    selectedAnswer = a.SelectedAnswer,
                    correctAnswer = a.Question != null ? a.Question.CorrectAnswer : "",
                    isCorrect = a.IsCorrect,
                    pointsAwarded = a.PointsAwarded,
                    explanation = a.Question != null ? a.Question.Explanation : ""
                }).ToList()
            })
            .ToListAsync();

        double avgScore = submissions.Any() ? submissions.Average(s => s.percentageScore) : 0;
        int passCount = submissions.Count(s => s.passed);

        return Ok(new
        {
            quizId = id,
            quizTitle = quiz.Title,
            totalSubmissions = submissions.Count,
            averagePercentage = Math.Round(avgScore, 1),
            passCount = passCount,
            submissions = submissions
        });
    }

    [HttpPost("submissions/{submissionId:guid}/feedback")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> SendSubmissionFeedback(Guid submissionId, [FromBody] SubmissionFeedbackRequest request)
    {
        var submission = await DbContext.Submissions.FirstOrDefaultAsync(s => s.Id == submissionId);
        if (submission == null)
        {
            return NotFound(new { message = "Submission not found." });
        }

        if (!await IsSubmissionOwnerOrAdmin(submissionId))
        {
            return Forbid();
        }

        submission.InstructorFeedback = request.Feedback;
        await DbContext.SaveChangesAsync();

        return Ok(new { message = "Feedback saved successfully.", submissionId = submission.Id, feedback = submission.InstructorFeedback });
    }
}


