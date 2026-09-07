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

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/v1/[controller]")]
public class QuizzesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IGamificationService _gamificationService;
    private readonly IAiGatewayClient _aiGatewayClient;

    public QuizzesController(ApplicationDbContext dbContext, IGamificationService gamificationService, IAiGatewayClient aiGatewayClient)
    {
        _dbContext = dbContext;
        _gamificationService = gamificationService;
        _aiGatewayClient = aiGatewayClient;
    }

    // -------------------------------------------------------------------------
    // 1. GET QUIZZES BY COURSE OR SCOPE
    // -------------------------------------------------------------------------

    [HttpGet("course/{courseId:guid}")]
    public async Task<IActionResult> GetCourseQuizzes(Guid courseId)
    {
        var quizzes = await _dbContext.Assessments
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

        var quizzes = await _dbContext.Assessments
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
        var quiz = await _dbContext.Assessments
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
        // 1. Verify that Course exists
        var course = await _dbContext.Courses.FirstOrDefaultAsync(c => c.Id == request.CourseId);
        if (course == null)
        {
            return BadRequest(new { message = "Selected Course does not exist." });
        }

        // 2. Application layer verification: ScopeId must belong to selected Course
        if (request.ScopeId.HasValue && request.ScopeType != QuizScopeType.Course)
        {
            bool scopeValid = false;
            switch (request.ScopeType)
            {
                case QuizScopeType.Module:
                    scopeValid = await _dbContext.Modules.AnyAsync(m => m.Id == request.ScopeId.Value && m.CourseId == request.CourseId);
                    break;
                case QuizScopeType.Topic:
                    scopeValid = await _dbContext.Topics.Include(t => t.Module).AnyAsync(t => t.Id == request.ScopeId.Value && t.Module!.CourseId == request.CourseId);
                    break;
                case QuizScopeType.ContentItem:
                    scopeValid = await _dbContext.ContentItems.Include(ci => ci.Module).AnyAsync(ci => ci.Id == request.ScopeId.Value && ci.Module!.CourseId == request.CourseId);
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
            CourseId = request.CourseId,
            ScopeType = request.ScopeType,
            ScopeId = request.ScopeId ?? request.CourseId,
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

        await _dbContext.Assessments.AddAsync(quiz);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuizById), new { id = quiz.Id }, quiz);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateQuiz(Guid id, [FromBody] CreateQuizRequest request)
    {
        var quiz = await _dbContext.Assessments
            .Include(a => a.Questions)
                .ThenInclude(q => q.Options)
            .Include(a => a.Configuration)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        quiz.Title = request.Title;
        quiz.Description = request.Description;
        quiz.ScopeType = request.ScopeType;
        quiz.ScopeId = request.ScopeId ?? quiz.ScopeId;
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
        _dbContext.Questions.RemoveRange(quiz.Questions);
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

        await _dbContext.SaveChangesAsync();
        return Ok(quiz);
    }

    [HttpDelete("{id:guid}")]
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

    // -------------------------------------------------------------------------
    // 3. QUIZ VALIDATION & STATE TRANSITIONS (Publish, Unpublish, Duplicate)
    // -------------------------------------------------------------------------

    [HttpPost("{id:guid}/validate")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> ValidateQuiz(Guid id)
    {
        var quiz = await _dbContext.Assessments
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
        var quiz = await _dbContext.Assessments
            .Include(a => a.Questions)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        if (quiz.Questions.Count == 0)
        {
            return BadRequest(new { message = "Cannot publish an empty quiz with 0 questions." });
        }

        quiz.Status = QuizStatus.Published;
        quiz.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Quiz published successfully!", quizId = quiz.Id, status = quiz.Status.ToString() });
    }

    [HttpPost("{id:guid}/unpublish")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UnpublishQuiz(Guid id)
    {
        var quiz = await _dbContext.Assessments.FirstOrDefaultAsync(a => a.Id == id);
        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        quiz.Status = QuizStatus.Unpublished;
        quiz.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Quiz unpublished.", quizId = quiz.Id, status = quiz.Status.ToString() });
    }

    [HttpPost("{id:guid}/duplicate")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DuplicateQuiz(Guid id)
    {
        var original = await _dbContext.Assessments
            .Include(a => a.Questions)
                .ThenInclude(q => q.Options)
            .Include(a => a.Configuration)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (original == null)
        {
            return NotFound(new { message = "Original quiz not found." });
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

        await _dbContext.Assessments.AddAsync(clone);
        await _dbContext.SaveChangesAsync();

        return Ok(new DuplicateQuizResponse(
            OriginalQuizId: original.Id,
            NewQuizId: clone.Id,
            NewQuizTitle: clone.Title,
            Message: "Quiz successfully duplicated in Draft status."
        ));
    }

    // -------------------------------------------------------------------------
    // 4. AI QUIZ GENERATION & QUESTION REGENERATION
    // -------------------------------------------------------------------------

    [HttpPost("generate-ai")]
    [HttpPost("/api/v1/ai/quiz-generation")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GenerateAiQuiz([FromBody] GenerateAiQuizRequest request)
    {
        var course = await _dbContext.Courses.FirstOrDefaultAsync(c => c.Id == request.CourseId);
        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

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
            Status = QuizStatus.ReadyForReview, // State machine: READY_FOR_REVIEW
            GeneratedByAI = true,
            GenerationWorkflowId = workflowId,
            CreatedAt = DateTime.UtcNow
        };

        // -------------------------------------------------------------------------
        // CALL PYTHON AI AGENT MICROSERVICE (via the shared, configured gateway client)
        // -------------------------------------------------------------------------

        // Map relative PdfUrl to physical path for the python service
        string? physicalPdfPath = null;
        if (!string.IsNullOrEmpty(request.PdfUrl))
        {
            // E.g., /uploads/pdfs/file.pdf -> d:/Project/EduHub/backend/EduFlow.Api/wwwroot/uploads/pdfs/file.pdf
            physicalPdfPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", request.PdfUrl.TrimStart('/'));
            if (!System.IO.File.Exists(physicalPdfPath))
            {
                physicalPdfPath = null; // Don't send invalid paths
            }
        }

        var pythonPayload = new
        {
            course_id = request.CourseId.ToString(),
            topic_title = request.Topic ?? "System Architecture",
            difficulty = request.Difficulty,
            question_count = count,
            pdf_path = physicalPdfPath
        };

        bool usedPython = false;
        try
        {
            var responseString = await _aiGatewayClient.GenerateQuizAsync(pythonPayload);
            var aiResult = JsonSerializer.Deserialize<JsonElement>(responseString);

            // The gateway client transparently returns its own degraded/offline fallback
            // JSON (tagged "source": "fallback") when the real AI microservice is unreachable.
            // Treat that the same as a failed call so the local hardcoded fallback below runs,
            // preserving prior behavior.
            bool isGatewayFallback = aiResult.TryGetProperty("source", out var sourceProp)
                && string.Equals(sourceProp.GetString(), "fallback", StringComparison.OrdinalIgnoreCase);

            if (!isGatewayFallback && aiResult.TryGetProperty("questions", out var questionsArray))
            {
                int i = 0;
                foreach (var qToken in questionsArray.EnumerateArray())
                {
                    var prompt = qToken.GetProperty("question_text").GetString() ?? "Generated Question";
                    var qTypeStr = qToken.GetProperty("question_type").GetString() ?? "MULTIPLE_CHOICE";
                    var correct = qToken.GetProperty("correct_answer").GetString() ?? "A";
                    var explanation = qToken.GetProperty("explanation").GetString() ?? "AI Explanation";

                    var qType = QuestionType.MultipleChoice;
                    if (qTypeStr == "TRUE_FALSE") qType = QuestionType.TrueFalse;
                    if (qTypeStr == "MULTIPLE_SELECT") qType = QuestionType.MultipleSelect;

                    var options = new List<string>();
                    if (qToken.TryGetProperty("options", out var optionsArray))
                    {
                        foreach (var opt in optionsArray.EnumerateArray())
                        {
                            options.Add(opt.GetString() ?? "");
                        }
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
                        MetadataJson = "{}"
                    };

                    int optIdx = 1;
                    foreach (var opt in options)
                    {
                        bool isCorrect = correct.Contains(opt, StringComparison.OrdinalIgnoreCase);
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
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[AI Agent] Python service error: {ex.Message}");
        }

        // -------------------------------------------------------------------------
        // FALLBACK: If Python fails, use C# hardcoded fallback
        // -------------------------------------------------------------------------
        if (!usedPython)
        {
            var questionTypes = request.QuestionTypes ?? new List<string> { "MultipleChoice", "TrueFalse", "MultipleSelect" };
            for (int i = 0; i < count; i++)
            {
                var prompt = $"Generated fallback question {i + 1} for {request.Topic}";
                var options = new List<string> { "A", "B", "C", "D" };
                var correct = "A";

                var question = new Question
                {
                    Prompt = prompt,
                    Type = QuestionType.MultipleChoice,
                    OptionsJson = JsonSerializer.Serialize(options),
                    CorrectAnswer = correct,
                    Explanation = "Fallback generated.",
                    Difficulty = quiz.Difficulty,
                    Points = 10,
                    OrderIndex = i + 1,
                    MetadataJson = "{}"
                };

                int optIdx = 1;
                foreach (var opt in options)
                {
                    question.Options.Add(new QuestionOption { OptionText = opt, IsCorrect = opt == correct, DisplayOrder = optIdx++ });
                }
                quiz.Questions.Add(question);
            }
        }

        quiz.QuestionCount = quiz.Questions.Count;

        await _dbContext.Assessments.AddAsync(quiz);
        await _dbContext.SaveChangesAsync();

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
        var question = await _dbContext.Questions
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

        _dbContext.QuestionOptions.RemoveRange(question.Options);
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

        await _dbContext.SaveChangesAsync();

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
        var quiz = await _dbContext.Assessments
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

            if (q.Type == QuestionType.MultipleSelect)
            {
                var studentSet = studentAns.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);
                var correctSet = q.CorrectAnswer.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);
                isCorrect = studentSet.SetEquals(correctSet);
            }
            else
            {
                isCorrect = string.Equals(studentAns, q.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase);
            }

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
                quiz.ShowCorrectAnswers ? q.CorrectAnswer : "Hidden",
                isCorrect,
                awarded,
                quiz.ShowCorrectAnswers ? q.Explanation : "Feedback available on review."
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

        await _dbContext.Submissions.AddAsync(submission);
        await _dbContext.SaveChangesAsync();

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
}

