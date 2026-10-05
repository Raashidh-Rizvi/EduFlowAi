using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Evaluation;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using Microsoft.AspNetCore.Hosting;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/v1/[controller]")]
[Authorize]
public class QuizzesController : BaseApiController
{
    private readonly IGamificationService _gamificationService;
    private readonly IAiGatewayClient _aiGatewayClient;
    private readonly IAssessmentAccessService _accessService;
    private readonly IAttemptService _attemptService;
    private readonly IAttemptGradingService _gradingService;
    private readonly IEvaluationService _evaluationService;
    private readonly IAuditLogWriter _auditLogWriter;
    private readonly IWebHostEnvironment? _environment;
    private readonly IUploadStorage _uploadStorage;

    /// <summary>Keys of generations currently running, so a double click cannot create two quizzes.</summary>
    private static readonly ConcurrentDictionary<string, byte> GenerationInFlight = new();

    public QuizzesController(
        ApplicationDbContext dbContext,
        IGamificationService gamificationService,
        IAiGatewayClient aiGatewayClient,
        IAssessmentAccessService accessService,
        IAttemptService attemptService,
        IAttemptGradingService gradingService,
        IEvaluationService evaluationService,
        IAuditLogWriter auditLogWriter,
        IWebHostEnvironment? environment = null,
        IUploadStorage? uploadStorage = null)
        : base(dbContext)
    {
        _uploadStorage = uploadStorage ?? new LocalUploadStorage(
            environment?.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot"));
        _gamificationService = gamificationService;
        _aiGatewayClient = aiGatewayClient;
        _accessService = accessService;
        _attemptService = attemptService;
        _gradingService = gradingService;
        _evaluationService = evaluationService;
        _auditLogWriter = auditLogWriter;
        _environment = environment;
    }

    // -------------------------------------------------------------------------
    // 1. GET QUIZZES BY COURSE OR SCOPE
    // -------------------------------------------------------------------------

    [HttpGet("course/{courseId:guid}")]
    public async Task<IActionResult> GetCourseQuizzes(Guid courseId)
    {
        // Managers see every lifecycle state; enrolled learners only see published quizzes.
        var (userId, role) = GetCurrentUser();
        bool canManage = await _accessService.CanManageCourseAsync(courseId, userId, role);
        if (!canManage && !await _accessService.HasLearnerAccessAsync(courseId, userId, role))
        {
            return Forbid();
        }

        var quizzes = await DbContext.Assessments
            .Where(a => a.CourseId == courseId && (canManage || a.Status == QuizStatus.Published))
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
                a.ScopeType == QuizScopeType.Topic ? (a.Topic != null ? a.Topic.Title : null)
                    : a.ScopeType == QuizScopeType.Module ? (a.Module != null ? a.Module.Title : null)
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
                a.CreatedAt,
                a.ModuleId,
                a.TopicId
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

        // A scope belongs to exactly one course; resolve the caller's rights per course.
        var (userId, role) = GetCurrentUser();
        var courseIds = await DbContext.Assessments
            .Where(a => a.ScopeType == parsedScope && a.ScopeId == scopeId)
            .Select(a => a.CourseId)
            .Distinct()
            .ToListAsync();

        var managedCourseIds = new List<Guid>();
        var learnerCourseIds = new List<Guid>();
        foreach (var courseId in courseIds)
        {
            if (await _accessService.CanManageCourseAsync(courseId, userId, role)) managedCourseIds.Add(courseId);
            else if (await _accessService.HasLearnerAccessAsync(courseId, userId, role)) learnerCourseIds.Add(courseId);
        }

        if (courseIds.Count > 0 && managedCourseIds.Count == 0 && learnerCourseIds.Count == 0)
        {
            return Forbid();
        }

        var quizzes = await DbContext.Assessments
            .Where(a => a.ScopeType == parsedScope && a.ScopeId == scopeId)
            .Where(a => managedCourseIds.Contains(a.CourseId)
                || (learnerCourseIds.Contains(a.CourseId) && a.Status == QuizStatus.Published))
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
                a.CreatedAt,
                a.ModuleId,
                a.TopicId
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
            .Include(a => a.Topic)
            .Include(a => a.Module)
            .Include(a => a.ContentItemScope)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        // Answer keys are only ever returned to the course owner or an Admin.
        var (userId, role) = GetCurrentUser();
        bool canManage = await _accessService.CanManageCourseAsync(quiz.CourseId, userId, role);
        if (!canManage)
        {
            if (quiz.Status != QuizStatus.Published
                || !await _accessService.HasLearnerAccessAsync(quiz.CourseId, userId, role))
            {
                return Forbid();
            }
        }

        var questionsDto = !canManage
            ? quiz.Questions.Select(q => ToLearnerQuestionDto(q, shuffleOptions: false)).ToList()
            : quiz.Questions.Select(q => new QuizQuestionDto(
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
            QuizScopeType.Topic => quiz.Topic?.Title,
            QuizScopeType.Module => quiz.Module?.Title,
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
            configDto,
            quiz.ModuleId,
            quiz.TopicId
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
        // SECURITY: ownership is resolved from the JWT only. There is no seeded/default
        // course id and no "first course in the database" fallback — an instructor must
        // explicitly select one of their own courses.
        if (request.CourseId == Guid.Empty)
        {
            return BadRequest(new { message = "A course must be selected for this quiz." });
        }

        if (!await IsCourseOwnerOrAdmin(request.CourseId))
        {
            return Forbid();
        }

        var course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == request.CourseId);
        if (course == null)
        {
            return NotFound(new { message = "Selected Course does not exist." });
        }
        var courseId = course.Id;

        var (placement, placementError) = await ResolvePlacementAsync(courseId, request.ScopeType, request.ScopeId, request.ModuleId);
        if (placement == null)
        {
            return BadRequest(new { message = placementError });
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
        ApplyPlacement(quiz, placement);

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

        // Publishing is gated by the same validation as POST /{id}/publish.
        if (quiz.Status == QuizStatus.Published && CollectPublishErrors(quiz) is { Count: > 0 } publishErrors)
        {
            return BadRequest(new { message = "Quiz validation failed. Fix errors before publishing.", errors = publishErrors });
        }

        await DbContext.Assessments.AddAsync(quiz);
        await DbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuizById), new { id = quiz.Id }, ToSummary(quiz));
    }

    [HttpPost("upload-quiz")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UploadQuiz([FromBody] UploadQuizRequest request)
    {
        if (request.CourseId == Guid.Empty)
        {
            return BadRequest(new { message = "A course must be selected for this quiz." });
        }

        if (!await IsCourseOwnerOrAdmin(request.CourseId))
        {
            return Forbid();
        }

        var course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == request.CourseId);
        if (course == null)
        {
            return BadRequest(new { message = "Selected Course does not exist." });
        }

        var (placement, placementError) = await ResolvePlacementAsync(course.Id, request.ScopeType, request.ScopeId, request.ModuleId);
        if (placement == null)
        {
            return BadRequest(new { message = placementError });
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
        ApplyPlacement(quiz, placement);

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

        // Student attempts reference these questions; replacing them would rewrite history.
        if (await DbContext.Submissions.AnyAsync(s => s.AssessmentId == id))
        {
            return Conflict(new
            {
                message = "This quiz already has student attempts and cannot be edited. Duplicate it to create a new version.",
                code = "ASSESSMENT_HAS_ATTEMPTS"
            });
        }

        var (placement, placementError) = await ResolvePlacementAsync(
            quiz.CourseId, request.ScopeType, request.ScopeId ?? quiz.ScopeId, request.ModuleId ?? quiz.ModuleId);
        if (placement == null)
        {
            return BadRequest(new { message = placementError });
        }

        quiz.Title = request.Title;
        quiz.Description = request.Description;
        ApplyPlacement(quiz, placement);
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

            // BaseEntity.Id ships with a preset Guid, so if this new question is only discovered
            // through the tracked quiz's collection, EF attaches it as Modified and issues an
            // UPDATE matching 0 rows (DbUpdateConcurrencyException). Add it to the DbSet
            // explicitly; relationship fixup then places it in quiz.Questions for us.
            DbContext.Questions.Add(question);
        }

        quiz.QuestionCount = quiz.Questions.Count;

        if (quiz.Status == QuizStatus.Published && CollectPublishErrors(quiz) is { Count: > 0 } publishErrors)
        {
            return BadRequest(new { message = "Quiz validation failed. Fix errors before publishing.", errors = publishErrors });
        }

        await DbContext.SaveChangesAsync();
        return Ok(ToSummary(quiz));
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

        // Deleting would cascade to student submissions; archive instead.
        if (await DbContext.Submissions.AnyAsync(s => s.AssessmentId == id))
        {
            return Conflict(new
            {
                message = "This quiz has student attempts and cannot be deleted. Archive it instead.",
                code = "ASSESSMENT_HAS_ATTEMPTS"
            });
        }

        // Removing a weighted assessment would leave active grading weights below 100%.
        if (quiz.GradeWeightPercent != null && await DbContext.CourseGradingConfigurations.AnyAsync(c =>
                c.CourseId == quiz.CourseId && c.Status == GradingConfigurationStatus.Active))
        {
            return Conflict(new
            {
                message = "This quiz carries grade weight in an active grading configuration. Reassign its weight before deleting it.",
                code = "ASSESSMENT_WEIGHTED"
            });
        }

        DbContext.Assessments.Remove(quiz);
        AuditAssessment("Assessment.Deleted", quiz.Id);
        await DbContext.SaveChangesAsync();
        return Ok(new { message = "Quiz deleted successfully." });
    }

    [HttpPost("{id:guid}/archive")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> ArchiveQuiz(Guid id)
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

        quiz.Status = QuizStatus.Archived;
        quiz.UpdatedAt = DateTime.UtcNow;
        AuditAssessment("Assessment.Archived", quiz.Id);
        await DbContext.SaveChangesAsync();

        return Ok(new { message = "Quiz archived.", quizId = quiz.Id, status = quiz.Status.ToString() });
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

        if (!await IsQuizOwnerOrAdmin(id))
        {
            return Forbid();
        }

        var errors = CollectPublishErrors(quiz);
        var warnings = new List<string>();
        var seenPrompts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var q in quiz.Questions)
        {
            if (!seenPrompts.Add(q.Prompt.Trim()))
            {
                warnings.Add($"Potential duplicate question text found: '{q.Prompt.Substring(0, Math.Min(40, q.Prompt.Length))}...'");
            }
        }
        int totalMarks = quiz.Questions.Sum(q => q.Points);

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

        var errors = CollectPublishErrors(quiz);

        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Quiz validation failed. Fix errors before publishing.", errors });
        }

        quiz.Status = QuizStatus.Published;
        quiz.UpdatedAt = DateTime.UtcNow;
        AuditAssessment("Assessment.Published", quiz.Id);
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
        clone.ModuleId = original.ModuleId;
        clone.TopicId = original.TopicId;
        clone.ContentItemScopeId = original.ContentItemScopeId;
        clone.ScopeType = original.ScopeType;
        clone.ScopeId = original.ScopeId;

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
        var course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == request.CourseId);
        if (course == null)
        {
            return NotFound(new { message = "Course not found.", code = "NOT_FOUND" });
        }

        // Ownership check: instructor may only generate quizzes for their own courses
        if (!await IsCourseOwnerOrAdmin(request.CourseId))
        {
            return Forbid();
        }

        var (placement, placementError) = await ResolvePlacementAsync(course.Id, request.ScopeType, request.ScopeId, request.ModuleId);
        if (placement == null)
        {
            return BadRequest(new { message = placementError, code = "INVALID_SCOPE" });
        }

        // IDEMPOTENCY: one in-flight generation per user + target. A repeated submit
        // (double click / retry storm) gets a clear conflict instead of a duplicate quiz.
        var (callerId, _) = GetCurrentUser();
        var inflightKey = $"gen:{callerId}:{request.CourseId}:{request.ScopeType}:{request.ScopeId}:{request.ModuleId}:{request.QuestionCount}";
        if (!GenerationInFlight.TryAdd(inflightKey, 0))
        {
            return Conflict(new
            {
                status = "error",
                code = "AI_GENERATION_IN_PROGRESS",
                message = "A quiz generation request for this selection is already running. Please wait for it to finish.",
                detail = "A quiz generation request for this selection is already running. Please wait for it to finish.",
                requestId = HttpContext.TraceIdentifier,
                traceId = HttpContext.TraceIdentifier
            });
        }

        try
        {
            return await GenerateAiQuizCoreAsync(request, course, placement);
        }
        finally
        {
            GenerationInFlight.TryRemove(inflightKey, out _);
        }
    }

    /// <summary>
    /// Provider validation -> document-processing gate -> LLM generation -> persistence.
    /// Every exit path carries a stable error code, a user-safe message and the request id;
    /// never a stack trace, never an API key, never a raw upstream body.
    /// </summary>
    private async Task<IActionResult> GenerateAiQuizCoreAsync(
        GenerateAiQuizRequest request, Course course, AssessmentPlacement placement)
    {
        var requestId = HttpContext.TraceIdentifier;
        var started = System.Diagnostics.Stopwatch.StartNew();

        // -------------------------------------------------------------------------
        // 1. PROVIDER VALIDATION — server-side allowlist; the client cannot bypass config
        // -------------------------------------------------------------------------
        var catalog = await _aiGatewayClient.GetAiProvidersAsync();
        if (catalog.StatusCode < 200 || catalog.StatusCode > 299)
        {
            Logger.LogWarning("generate_ai_quiz provider_catalog_unavailable requestId={RequestId} status={Status}",
                requestId, catalog.StatusCode);
            return StatusCode(503, AiError("AI_PROVIDER_UNAVAILABLE",
                "The AI service is unavailable, so the selected provider cannot be verified right now. Please try again shortly."));
        }

        var providerGate = ValidateAiProviderSelection(request, catalog.Body, requestId);
        if (providerGate != null)
        {
            return providerGate;
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
            Title = title,
            Description = $"Draft generated by EduFlow AI from this module's course material. Review every question before publishing.",
            Type = AssessmentType.Quiz,
            Difficulty = Enum.TryParse<DifficultyLevel>(request.Difficulty, true, out var diff) ? diff : DifficultyLevel.Medium,
            TimeLimitSeconds = request.TimeLimitMinutes * 60,
            TimeLimitMinutes = request.TimeLimitMinutes,
            PassingScorePercent = request.PassingScorePercent,
            XpReward = request.XpReward > 0 ? request.XpReward : defaultXp,
            CoinReward = request.CoinReward,
            Status = request.AutoPublish ? QuizStatus.Published : QuizStatus.Draft, // Immediately published when AutoPublish is true so students can take it
            GeneratedByAI = true,
            GenerationWorkflowId = workflowId,
            CreatedAt = DateTime.UtcNow
        };
        ApplyPlacement(quiz, placement);

        // -------------------------------------------------------------------------
        // CALL PYTHON AI AGENT MICROSERVICE (via the shared, configured gateway client)
        // -------------------------------------------------------------------------

        // Map relative PdfUrl or SlideUrl to physical path for the python service
        // Client-supplied slide URLs are only honoured inside wwwroot (no path traversal).
        string? physicalSlidePath = await ResolveWebRootFile(request.SlideUrl ?? request.PdfUrl);

        // Fallback: if slide not found in request, check module in database
        Module? dbModule;
        if (string.IsNullOrEmpty(physicalSlidePath))
        {
            dbModule = await DbContext.Modules
                .Include(m => m.Topics)
                .Include(m => m.ContentItems)
                .FirstOrDefaultAsync(m => m.Id == placement.ModuleId);
            physicalSlidePath = await ResolveWebRootFile(dbModule?.PdfUrl);
        }
        else
        {
            dbModule = await DbContext.Modules
                .Include(m => m.Topics)
                .Include(m => m.ContentItems)
                .FirstOrDefaultAsync(m => m.Id == placement.ModuleId);
        }

        // The generator must ground questions in the module's REAL content:
        // description, topic titles and content item text resolved from the database.
        var moduleContext = BuildModuleContext(dbModule);

        // -------------------------------------------------------------------------
        // 2. DOCUMENT-PROCESSING GATE — never generate from a document that is still
        //    processing or failed; a never-indexed file gets indexing kicked off now.
        // -------------------------------------------------------------------------
        var documentGate = await CheckDocumentProcessingGateAsync(physicalSlidePath, course.Id, dbModule?.Id);
        if (documentGate != null)
        {
            return documentGate;
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
            num_questions = count,
            time_limit_minutes = request.TimeLimitMinutes,
            pass_percentage = request.PassingScorePercent > 0 ? request.PassingScorePercent : 70,
            pdf_path = physicalSlidePath,
            slide_path = physicalSlidePath,
            module_context = moduleContext,
            learning_objectives = request.LearningObjectives ?? new List<string>(),
            selected_topics = request.SelectedTopics,
            question_types = request.QuestionTypes ?? new List<string> { "MULTIPLE_CHOICE", "TRUE_FALSE", "MULTIPLE_SELECT" },
            // Provider/model selection: validated above against the server-side allowlist;
            // the Python service re-validates before any LLM call.
            provider = string.IsNullOrWhiteSpace(request.Provider) ? null : request.Provider.Trim(),
            model = string.IsNullOrWhiteSpace(request.Model) ? null : request.Model.Trim()
        };

        bool usedPython = false;
        string? aiSource = null;
        string? aiModel = null;
        try
        {
            var responseString = await _aiGatewayClient.GenerateQuizAsync(pythonPayload, requestId: requestId);
            var aiResult = JsonSerializer.Deserialize<JsonElement>(responseString);

            if (aiResult.TryGetProperty("status", out var stProp) && string.Equals(stProp.GetString(), "error", StringComparison.OrdinalIgnoreCase))
            {
                // Structured AI error from the gateway: { code, message, details, requestId, status_code }.
                var code = aiResult.TryGetProperty("code", out var codeProp) && codeProp.ValueKind == JsonValueKind.String
                    ? codeProp.GetString() ?? "AI_GENERATION_FAILED"
                    : "AI_GENERATION_FAILED";
                var message = aiResult.TryGetProperty("message", out var msgProp) && msgProp.ValueKind == JsonValueKind.String
                    ? msgProp.GetString()
                    : null;
                if (string.IsNullOrWhiteSpace(message) && aiResult.TryGetProperty("detail", out var detProp))
                {
                    message = detProp.GetString();
                }
                message ??= "AI quiz generation failed. Please try again.";
                var details = aiResult.TryGetProperty("details", out var detailsProp) && detailsProp.ValueKind == JsonValueKind.String
                    ? detailsProp.GetString()
                    : null;
                var upstreamRequestId = aiResult.TryGetProperty("requestId", out var ridProp) && ridProp.ValueKind == JsonValueKind.String
                    ? ridProp.GetString()
                    : null;
                var statusCode = aiResult.TryGetProperty("status_code", out var scProp)
                    && scProp.ValueKind == JsonValueKind.Number
                    && scProp.TryGetInt32(out var sc)
                    ? sc
                    : 502;
                if (statusCode is < 400 or > 599) statusCode = 502;

                Logger.LogWarning(
                    "generate_ai_quiz status=error requestId={RequestId} code={Code} upstreamRequestId={UpstreamRequestId} durationMs={DurationMs}",
                    requestId, code, upstreamRequestId, started.ElapsedMilliseconds);
                return StatusCode(statusCode, new
                {
                    status = "error",
                    code,
                    message,
                    detail = message,
                    details,
                    requestId = upstreamRequestId ?? requestId,
                    traceId = requestId
                });
            }

            if (aiResult.TryGetProperty("questions", out var questionsArray) && questionsArray.ValueKind == JsonValueKind.Array)
            {
                int i = 0;
                int skippedQuestions = 0;
                foreach (var qToken in questionsArray.EnumerateArray())
                {
                    try
                    {
                    // A malformed member must never discard an otherwise valid batch:
                    // skip it, keep the rest, and report the count to the log.
                    if (!qToken.TryGetProperty("question_text", out var promptProp)
                        || promptProp.ValueKind != JsonValueKind.String
                        || string.IsNullOrWhiteSpace(promptProp.GetString()))
                    {
                        skippedQuestions++;
                        Logger.LogWarning("generate_ai_quiz status=question_skipped reason=missing_question_text requestId={RequestId} index={Index}", requestId, i);
                        i++;
                        continue;
                    }
                    var prompt = promptProp.GetString()!;
                    var qTypeStr = qToken.TryGetProperty("question_type", out var qt) ? qt.GetString() ?? "MULTIPLE_CHOICE" : "MULTIPLE_CHOICE";
                    var correct = qToken.TryGetProperty("correct_answer", out var ca) ? ca.GetString() ?? "A" : "A";
                    var explanation = qToken.TryGetProperty("explanation", out var exp) ? exp.GetString() ?? "AI Explanation" : "AI Explanation";
                    var markingScheme = qToken.TryGetProperty("marking_scheme", out var ms) ? ms.GetString() ?? explanation : explanation;
                    var slideCitation = qToken.TryGetProperty("slide_citation", out var sc) ? sc.GetString() ?? $"Curriculum for {resolvedTopic}" : $"Curriculum for {resolvedTopic}";
                    var bloomsLevel = qToken.TryGetProperty("blooms_taxonomy_level", out var bloomsProp) ? bloomsProp.GetString() : null;
                    var aiLearningObjective = qToken.TryGetProperty("learning_objective", out var loProp) ? loProp.GetString() : null;

                    // Keep the AI's proposed mark value instead of a hardcoded 10.
                    int questionPoints = 10;
                    if (qToken.TryGetProperty("points", out var pointsProp)
                        && pointsProp.ValueKind == JsonValueKind.Number
                        && pointsProp.TryGetInt32(out var parsedPoints))
                    {
                        questionPoints = Math.Clamp(parsedPoints, 1, 100);
                    }

                    var qType = QuestionType.MultipleChoice;
                    var upperType = qTypeStr.ToUpperInvariant();
                    if (upperType.Contains("TRUE_FALSE") || upperType == "TRUEFALSE") qType = QuestionType.TrueFalse;
                    else if (upperType.Contains("SELECT")) qType = QuestionType.MultipleSelect;
                    else if (upperType.Contains("FILL")) qType = QuestionType.FillInBlank;
                    else if (upperType.Contains("MATCH")) qType = QuestionType.Matching;
                    else if (upperType.Contains("SHORT") || upperType.Contains("TYPING") || upperType.Contains("OPEN")) qType = QuestionType.ShortAnswer;
                    else if (upperType.Contains("DROPDOWN")) qType = QuestionType.MultipleChoice;

                    var options = new List<string>();
                    if (qToken.TryGetProperty("options", out var optionsArray) && optionsArray.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var opt in optionsArray.EnumerateArray())
                        {
                            var optStr = opt.GetString() ?? "";
                            if (!string.IsNullOrWhiteSpace(optStr))
                            {
                                options.Add(optStr.Trim());
                            }
                        }
                    }

                    if (qType == QuestionType.TrueFalse && options.Count == 0)
                    {
                        options = new List<string> { "TRUE", "FALSE" };
                    }

                    // Determine correct index or option text
                    int resolvedCorrectIdx = -1;
                    if (qToken.TryGetProperty("correct_index", out var correctIndexProp)
                        && correctIndexProp.ValueKind == JsonValueKind.Number
                        && correctIndexProp.TryGetInt32(out var idxFromProp)
                        && idxFromProp >= 0 && idxFromProp < options.Count)
                    {
                        resolvedCorrectIdx = idxFromProp;
                    }

                    if (resolvedCorrectIdx < 0 && !string.IsNullOrWhiteSpace(correct))
                    {
                        var trimmedCorrect = correct.Trim();
                        if (int.TryParse(trimmedCorrect, out var parsedIdx) && parsedIdx >= 0 && parsedIdx < options.Count)
                        {
                            resolvedCorrectIdx = parsedIdx;
                        }
                        else if (trimmedCorrect.Length <= 3)
                        {
                            char letter = char.ToUpperInvariant(trimmedCorrect[0]);
                            if (letter >= 'A' && letter <= 'Z' && (letter - 'A') < options.Count)
                            {
                                resolvedCorrectIdx = letter - 'A';
                            }
                        }
                    }

                    var metadataDict = new Dictionary<string, object>
                    {
                        ["markingScheme"] = markingScheme,
                        ["slideCitation"] = slideCitation,
                        ["questionType"] = qTypeStr
                    };

                    if (!string.IsNullOrWhiteSpace(bloomsLevel))
                    {
                        metadataDict["bloomsTaxonomy"] = bloomsLevel;
                    }

                    if (qToken.TryGetProperty("matching_pairs", out var pairsArray) && pairsArray.ValueKind == JsonValueKind.Array)
                    {
                        var pairs = new List<Dictionary<string, string>>();
                        foreach (var pair in pairsArray.EnumerateArray())
                        {
                            if (pair.ValueKind != JsonValueKind.Object) continue;
                            var left = pair.TryGetProperty("left", out var lp) && lp.ValueKind == JsonValueKind.String ? lp.GetString()?.Trim() : null;
                            var right = pair.TryGetProperty("right", out var rp) && rp.ValueKind == JsonValueKind.String ? rp.GetString()?.Trim() : null;
                            if (!string.IsNullOrWhiteSpace(left) && !string.IsNullOrWhiteSpace(right))
                            {
                                pairs.Add(new Dictionary<string, string> { ["left"] = left!, ["right"] = right! });
                            }
                        }

                        if (pairs.Count > 0)
                        {
                            metadataDict["matchingPairs"] = pairs;
                            if (qType == QuestionType.Matching)
                            {
                                // Grading format expected by MatchingEvaluator: "left -> right; left2 -> right2"
                                correct = string.Join("; ", pairs.Select(p => $"{p["left"]} -> {p["right"]}"));
                                if (options.Count == 0)
                                {
                                    var rights = pairs.Select(p => p["right"]).ToList();
                                    options = rights.Skip(1).Concat(rights.Take(1)).ToList();
                                }
                            }
                        }
                    }

                    if (string.IsNullOrWhiteSpace(explanation) || explanation == "AI Explanation")
                    {
                        explanation = !string.IsNullOrWhiteSpace(markingScheme) && markingScheme != "AI Explanation"
                            ? markingScheme
                            : $"Correct answer: {correct}.";
                    }

                    var question = new Question
                    {
                        Prompt = prompt,
                        Type = qType,
                        OptionsJson = JsonSerializer.Serialize(options),
                        CorrectAnswer = correct,
                        Explanation = explanation,
                        Difficulty = quiz.Difficulty,
                        Points = questionPoints,
                        OrderIndex = i + 1,
                        LearningObjective = string.IsNullOrWhiteSpace(aiLearningObjective) ? null : aiLearningObjective!.Trim(),
                        MetadataJson = JsonSerializer.Serialize(metadataDict)
                    };

                    var matchedOptionTexts = new List<string>();
                    int optIdx = 1;
                    foreach (var opt in options)
                    {
                        bool isCorrect = false;

                        if (resolvedCorrectIdx >= 0 && (optIdx - 1) == resolvedCorrectIdx)
                        {
                            isCorrect = true;
                        }
                        else
                        {
                            var cleanOpt = System.Text.RegularExpressions.Regex.Replace(opt, @"^[A-Da-d1-4][\.\)]\s*", "").Trim();
                            var cleanCorrect = System.Text.RegularExpressions.Regex.Replace(correct, @"^[A-Da-d1-4][\.\)]\s*", "").Trim();

                            isCorrect = string.Equals(opt, correct.Trim(), StringComparison.OrdinalIgnoreCase)
                                || string.Equals(cleanOpt, cleanCorrect, StringComparison.OrdinalIgnoreCase)
                                || correct.Split(new[] { ',', ';' }, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                                          .Any(c => string.Equals(c, opt, StringComparison.OrdinalIgnoreCase)
                                                 || string.Equals(c, cleanOpt, StringComparison.OrdinalIgnoreCase));
                        }

                        if (isCorrect)
                        {
                            matchedOptionTexts.Add(opt);
                        }

                        question.Options.Add(new QuestionOption
                        {
                            OptionText = opt,
                            IsCorrect = isCorrect,
                            DisplayOrder = optIdx++
                        });
                    }

                    // Fallback if no option was flagged isCorrect for single choice
                    var optionsList = question.Options.ToList();
                    if ((qType == QuestionType.MultipleChoice || qType == QuestionType.TrueFalse) && !optionsList.Any(o => o.IsCorrect) && optionsList.Count > 0)
                    {
                        int fallbackIdx = resolvedCorrectIdx >= 0 && resolvedCorrectIdx < optionsList.Count ? resolvedCorrectIdx : 0;
                        optionsList[fallbackIdx].IsCorrect = true;
                        matchedOptionTexts.Add(optionsList[fallbackIdx].OptionText);
                    }

                    if (matchedOptionTexts.Count > 0 && qType != QuestionType.Matching)
                    {
                        question.CorrectAnswer = string.Join(", ", matchedOptionTexts);
                    }

                    quiz.Questions.Add(question);
                    i++;
                    }
                    catch (Exception parseEx)
                    {
                        skippedQuestions++;
                        Logger.LogWarning(parseEx,
                            "generate_ai_quiz status=question_parse_failed requestId={RequestId} index={Index}",
                            requestId, i);
                        i++;
                    }
                }
                if (skippedQuestions > 0)
                {
                    Logger.LogWarning(
                        "generate_ai_quiz status=questions_skipped requestId={RequestId} skipped={Skipped} kept={Kept}",
                        requestId, skippedQuestions, quiz.Questions.Count);
                }
                aiSource = aiResult.TryGetProperty("source", out var srcProp) && srcProp.ValueKind == JsonValueKind.String
                    ? srcProp.GetString()
                    : null;
                aiModel = aiResult.TryGetProperty("model", out var mdlProp) && mdlProp.ValueKind == JsonValueKind.String
                    ? mdlProp.GetString()
                    : null;
                usedPython = quiz.Questions.Count > 0;
            }
        }
        catch (Exception ex)
        {
            // Transport/parse failures stay in the server log; the client gets the stable error below.
            Logger.LogError(ex, "generate_ai_quiz status=transport_error requestId={RequestId} durationMs={DurationMs}",
                requestId, started.ElapsedMilliseconds);
        }

        // -------------------------------------------------------------------------
        // STRICT POLICY: if AI generation fails, DO NOT create fallback questions.
        // The instructor gets a stable code + friendly message + the request id.
        // -------------------------------------------------------------------------
        if (!usedPython)
        {
            Logger.LogWarning("generate_ai_quiz status=no_output requestId={RequestId} durationMs={DurationMs}",
                requestId, started.ElapsedMilliseconds);
            return BadRequest(new
            {
                status = "error",
                code = "AI_GENERATION_FAILED",
                message = "AI quiz generation failed. Please try again.",
                detail = "AI quiz generation failed. Please try again.",
                details = "The AI service did not return a valid quiz. Check that the provider is configured and try again.",
                requestId,
                traceId = requestId
            });
        }

        // Historical metadata: which provider/model produced this quiz (kept even if
        // the provider is unconfigured later; never any credential material).
        quiz.AiProvider = !string.IsNullOrWhiteSpace(aiSource)
            ? aiSource.Trim()
            : (!string.IsNullOrWhiteSpace(request.Provider) ? request.Provider.Trim().ToLowerInvariant() : null);
        quiz.AiModel = !string.IsNullOrWhiteSpace(aiModel)
            ? aiModel.Trim()
            : (!string.IsNullOrWhiteSpace(request.Model) ? request.Model.Trim() : null);

        quiz.QuestionCount = quiz.Questions.Count;

        await DbContext.Assessments.AddAsync(quiz);
        await DbContext.SaveChangesAsync();

        Logger.LogInformation(
            "generate_ai_quiz status=ok requestId={RequestId} provider={Provider} model={Model} " +
            "courseId={CourseId} document={Document} quizId={QuizId} questions={Questions} durationMs={DurationMs}",
            requestId, quiz.AiProvider ?? "unknown", quiz.AiModel ?? "default", request.CourseId,
            physicalSlidePath != null ? System.IO.Path.GetFileName(physicalSlidePath) : null,
            quiz.Id, quiz.Questions.Count, started.ElapsedMilliseconds);

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

        if (!await IsQuizOwnerOrAdmin(question.AssessmentId))
        {
            return Forbid();
        }

        if (await DbContext.SubmissionAnswers.AnyAsync(a => a.QuestionId == questionId))
        {
            return Conflict(new
            {
                message = "Students have already answered this question; it cannot be regenerated.",
                code = "ASSESSMENT_HAS_ATTEMPTS"
            });
        }

        var focus = !string.IsNullOrWhiteSpace(request.FocusTopic)
            ? request.FocusTopic
            : question.Assessment?.Title ?? "Software Engineering";

        var targetType = request.TargetType ?? question.Type;
        var targetDiff = request.TargetDifficulty ?? question.Difficulty;

        // Ground regeneration in the same real course content the quiz belongs to.
        var regenModule = question.Assessment == null
            ? null
            : await DbContext.Modules
                .Include(m => m.Topics)
                .Include(m => m.ContentItems)
                .FirstOrDefaultAsync(m => m.Id == question.Assessment.ModuleId);
        var regenSlidePath = await ResolveWebRootFile(regenModule?.PdfUrl);
        var regenCourse = await DbContext.Courses.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == question.Assessment!.CourseId);

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
            source_content_id = question.SourceContentId?.ToString(),
            course_id = question.Assessment?.CourseId.ToString(),
            course_title = regenCourse?.Title,
            module_title = regenModule?.Title ?? focus,
            module_context = BuildModuleContext(regenModule),
            slide_path = regenSlidePath,
            pdf_path = regenSlidePath,
            source_question_text = question.Prompt
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
            var responseString = await _aiGatewayClient.RegenerateQuestionAsync(
                questionId.ToString(), pythonPayload, requestId: HttpContext.TraceIdentifier);
            var aiResult = JsonSerializer.Deserialize<JsonElement>(responseString);

            // Python/gateway errors are surfaced with their stable code; the original
            // question is left untouched so an AI outage can never silently rewrite it.
            if (aiResult.TryGetProperty("status", out var statusProp)
                && string.Equals(statusProp.GetString(), "error", StringComparison.OrdinalIgnoreCase))
            {
                var code = aiResult.TryGetProperty("code", out var regCodeProp)
                           && regCodeProp.ValueKind == JsonValueKind.String
                    ? regCodeProp.GetString() ?? "AI_REGENERATION_FAILED"
                    : "AI_REGENERATION_FAILED";
                var errorDetail = aiResult.TryGetProperty("message", out var messageProp)
                    ? ExtractPythonErrorDetail(messageProp.GetString())
                    : null;
                var details = aiResult.TryGetProperty("details", out var detProp)
                              && detProp.ValueKind == JsonValueKind.String
                    ? detProp.GetString()
                    : null;
                var upstreamRequestId = aiResult.TryGetProperty("requestId", out var ridProp)
                                        && ridProp.ValueKind == JsonValueKind.String
                    ? ridProp.GetString()
                    : null;
                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    message = string.IsNullOrWhiteSpace(errorDetail)
                        ? "AI question regeneration is unavailable. The original question was left unchanged."
                        : errorDetail,
                    detail = string.IsNullOrWhiteSpace(errorDetail)
                        ? "AI question regeneration is unavailable. The original question was left unchanged."
                        : errorDetail,
                    status = "error",
                    code,
                    details,
                    requestId = upstreamRequestId ?? HttpContext.TraceIdentifier,
                    traceId = HttpContext.TraceIdentifier
                });
            }

            if (aiResult.TryGetProperty("question", out var qToken))
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

                // Only trust the AI response if it produced usable options and a correct answer.
                usedPython = options.Count >= 2 && !string.IsNullOrWhiteSpace(newPrompt) && !string.IsNullOrWhiteSpace(correctAnswer);
            }
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "AI single-question regeneration call to the Python service failed.");
        }

        // Never substitute a canned question: an AI failure leaves the instructor's question untouched.
        if (!usedPython)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                message = "AI question regeneration is unavailable. The original question was left unchanged.",
                status = "error",
                code = "AI_REGENERATION_FAILED"
            });
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
            // Preset Guid key: without an explicit Add EF attaches the new option as Modified.
            // Fixup places it in question.Options for us.
            DbContext.QuestionOptions.Add(new QuestionOption
            {
                QuestionId = question.Id,
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

    /// <summary>Stable AI error body shared by the generation pipeline. Never contains secrets.</summary>
    private object AiError(string code, string message, string? details = null) => new
    {
        status = "error",
        code,
        message,
        detail = message,
        details,
        requestId = HttpContext.TraceIdentifier,
        traceId = HttpContext.TraceIdentifier
    };

    private sealed record AiProviderInfo(
        string Provider, string Label, bool Configured, List<string> Models, List<string>? Missing, bool Active);

    private static List<AiProviderInfo>? ParseProviderCatalog(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("providers", out var arr) || arr.ValueKind != JsonValueKind.Array)
            {
                return null;
            }
            var list = new List<AiProviderInfo>();
            foreach (var p in arr.EnumerateArray())
            {
                static List<string> ReadStrings(JsonElement el) => el.ValueKind == JsonValueKind.Array
                    ? el.EnumerateArray().Select(x => x.GetString() ?? "").Where(s => s.Length > 0).ToList()
                    : new List<string>();
                list.Add(new AiProviderInfo(
                    p.TryGetProperty("provider", out var pv) ? pv.GetString() ?? "" : "",
                    p.TryGetProperty("label", out var lb) ? lb.GetString() ?? "" : "",
                    p.TryGetProperty("configured", out var cf) && cf.ValueKind == JsonValueKind.True,
                    p.TryGetProperty("models", out var md) ? ReadStrings(md) : new List<string>(),
                    p.TryGetProperty("missing", out var ms) ? ReadStrings(ms) : null,
                    p.TryGetProperty("active", out var ac) && ac.ValueKind == JsonValueKind.True));
            }
            return list;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Validates the requested provider/model against the AI service's provider catalog
    /// (server-side allowlist). Returns null when generation may proceed, otherwise a
    /// stable 503/400 error naming what is missing — never a credential value.
    /// </summary>
    private IActionResult? ValidateAiProviderSelection(GenerateAiQuizRequest request, string catalogBody, string requestId)
    {
        var providers = ParseProviderCatalog(catalogBody);
        if (providers == null)
        {
            return null; // Catalog unparseable: the Python service still validates before its LLM call.
        }

        AiProviderInfo? selected;
        if (!string.IsNullOrWhiteSpace(request.Provider))
        {
            selected = providers.FirstOrDefault(p =>
                string.Equals(p.Provider, request.Provider.Trim(), StringComparison.OrdinalIgnoreCase));
            if (selected == null)
            {
                Logger.LogWarning("generate_ai_quiz unsupported_provider requestId={RequestId} requested={Requested}",
                    requestId, request.Provider);
                return StatusCode(503, AiError("AI_PROVIDER_NOT_CONFIGURED",
                    $"The selected AI provider \"{request.Provider}\" is not supported.",
                    $"Supported providers: {string.Join(", ", providers.Select(p => p.Provider))}. " +
                    "Choose a configured provider and try again."));
            }
        }
        else
        {
            selected = providers.FirstOrDefault(p => p.Active) ?? providers.FirstOrDefault();
        }

        if (selected != null && !selected.Configured)
        {
            var required = selected.Missing is { Count: > 0 }
                ? string.Join(", ", selected.Missing)
                : "its required credentials";
            Logger.LogWarning("generate_ai_quiz provider_not_configured requestId={RequestId} provider={Provider}",
                requestId, selected.Provider);
            return StatusCode(503, AiError("AI_PROVIDER_NOT_CONFIGURED",
                $"The selected AI provider \"{selected.Label}\" requires {required}. " +
                "Please configure the provider before generating a quiz.",
                $"{selected.Label} is not configured."));
        }

        if (!string.IsNullOrWhiteSpace(request.Model) && selected != null &&
            !selected.Models.Contains(request.Model.Trim(), StringComparer.OrdinalIgnoreCase))
        {
            var available = selected.Models.Count > 0
                ? string.Join(", ", selected.Models)
                : "no server-configured models";
            return BadRequest(AiError("AI_MODEL_NOT_FOUND",
                $"The model \"{request.Model}\" is not available for {selected.Label}.",
                $"Configured models: {available}."));
        }

        return null;
    }

    /// <summary>
    /// Document ingestion gate: PROCESSING/FAILED documents are refused with a clear code,
    /// UPLOADED documents get indexing kicked off in the background (generation still parses
    /// the file synchronously, so this run stays grounded in the real document).
    /// Returns null when generation may proceed.
    /// </summary>
    private async Task<IActionResult?> CheckDocumentProcessingGateAsync(string? physicalPath, Guid courseId, Guid? moduleId)
    {
        // physicalPath was resolved through IUploadStorage, so it already exists (disk path or Blob URL).
        if (string.IsNullOrWhiteSpace(physicalPath))
        {
            return null; // No attached document: generation falls back to module context text.
        }

        // Blob URLs are percent-encoded; the agent keys document status by the decoded basename.
        var fileName = Uri.UnescapeDataString(System.IO.Path.GetFileName(physicalPath));
        var status = await _aiGatewayClient.GetDocumentStatusAsync(fileName);
        if (status.StatusCode < 200 || status.StatusCode > 299 || string.IsNullOrWhiteSpace(status.Body))
        {
            return null; // AI service unreachable: the generation call itself will surface the outage.
        }

        string? state = null;
        string? failureReason = null;
        try
        {
            using var doc = JsonDocument.Parse(status.Body);
            if (doc.RootElement.TryGetProperty("state", out var st)) state = st.GetString();
            if (doc.RootElement.TryGetProperty("error", out var er) && er.ValueKind == JsonValueKind.String) failureReason = er.GetString();
            if (doc.RootElement.TryGetProperty("reindexRecommended", out var ri) && ri.ValueKind == JsonValueKind.True)
            {
                Logger.LogWarning("document_embedding_mismatch file={File}; re-index recommended before relying on RAG retrieval.",
                    fileName);
            }
        }
        catch (JsonException)
        {
            return null;
        }

        if (string.Equals(state, "PROCESSING", StringComparison.OrdinalIgnoreCase))
        {
            Logger.LogInformation("generate_ai_quiz document_processing requestId={RequestId} file={File}",
                HttpContext.TraceIdentifier, fileName);
            return Conflict(AiError("DOCUMENT_NOT_PROCESSED",
                "Course material is not ready. The uploaded PDF is still being prepared for AI quiz generation — please wait until processing is complete."));
        }

        // FAILED only means background RAG indexing failed (embedding quota, vector store,
        // serverless /tmp, ...). Generation parses the file synchronously and the agent returns
        // DOCUMENT_EXTRACTION_FAILED itself if the file truly has no text, so a stale FAILED
        // record must not block every later generation. Retry indexing and proceed.
        if (string.Equals(state, "FAILED", StringComparison.OrdinalIgnoreCase))
        {
            Logger.LogWarning("generate_ai_quiz document_index_failed_retrying requestId={RequestId} file={File} reason={Reason}",
                HttpContext.TraceIdentifier, fileName, failureReason);
        }

        if (string.Equals(state, "UPLOADED", StringComparison.OrdinalIgnoreCase)
            || string.Equals(state, "FAILED", StringComparison.OrdinalIgnoreCase))
        {
            // Not indexed (or indexing failed): kick indexing off now so RAG retrieval catches up.
            // The technical outcome lands in the server log and the document-status record.
            var pathForIndex = physicalPath;
            var courseIdForIndex = courseId;
            var moduleIdForIndex = moduleId;
            _ = Task.Run(async () =>
            {
                try
                {
                    var result = await _aiGatewayClient.IndexDocumentAsync(new
                    {
                        file_path = pathForIndex,
                        course_id = courseIdForIndex.ToString(),
                        module_id = moduleIdForIndex?.ToString()
                    });
                    Logger.LogInformation("document_index file={File} status={Status}", fileName, result.StatusCode);
                }
                catch (Exception ex)
                {
                    Logger.LogWarning(ex, "document_index failed for {File}", fileName);
                }
            });
        }

        return null;
    }

    /// <summary>
    /// Unwraps the FastAPI error detail the gateway forwards inside "message"
    /// (e.g. {{"detail":"GEMINI_API_KEY is not configured..."}}) so instructors
    /// see the real reason instead of raw JSON.
    /// </summary>
    private static string? ExtractPythonErrorDetail(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }
        if (raw.TrimStart().StartsWith("{"))
        {
            try
            {
                using var nested = JsonDocument.Parse(raw);
                if (nested.RootElement.TryGetProperty("detail", out var detailEl))
                {
                    return detailEl.GetString() ?? raw;
                }
            }
            catch
            {
                // Not JSON after all; show the raw text.
            }
        }
        return raw;
    }

    /// <summary>
    /// Real course content for AI grounding, resolved from the database:
    /// module description, topic titles and content item text. Never placeholder
    /// titles-only context — the generator must see what students actually study.
    /// </summary>
    private static string BuildModuleContext(Module? module)
    {
        if (module == null)
        {
            return string.Empty;
        }

        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(module.Description))
        {
            parts.Add($"Module description: {module.Description.Trim()}");
        }
        foreach (var topic in module.Topics.OrderBy(t => t.DisplayOrder))
        {
            var line = string.IsNullOrWhiteSpace(topic.Description)
                ? $"Topic: {topic.Title}"
                : $"Topic: {topic.Title} - {topic.Description.Trim()}";
            parts.Add(line);
        }
        foreach (var item in module.ContentItems.OrderBy(c => c.DisplayOrder))
        {
            var body = (item.Content ?? string.Empty).Replace("\r", " ").Replace("\n", " ").Trim();
            parts.Add(string.IsNullOrWhiteSpace(body)
                ? $"Content item: {item.Title}"
                : $"Content item: {item.Title} - {body}");
        }

        var context = string.Join("\n", parts);
        return context.Length > 4000 ? context[..4000] : context;
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
    public async Task<IActionResult> StartQuizAttempt(Guid id)
    {
        var quiz = await DbContext.Assessments
            .Include(a => a.Questions.OrderBy(q => q.OrderIndex))
            .FirstOrDefaultAsync(a => a.Id == id);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        // Course owners/admins may preview any state without recording an attempt;
        // everyone else starts (or resumes) a persisted attempt.
        var (userId, role) = GetCurrentUser();
        Submission? attempt = null;
        if (!await _accessService.CanManageCourseAsync(quiz.CourseId, userId, role))
        {
            var resolution = await _attemptService.StartOrResumeAsync(quiz, userId);
            if (!resolution.IsAllowed)
            {
                return AttemptDenied(resolution.Eligibility);
            }
            attempt = resolution.Attempt;
        }

        // Questions are delivered without answer keys, explanations or marking metadata.
        var questionsDto = quiz.Questions
            .Select(q => ToLearnerQuestionDto(q, shuffleOptions: quiz.RandomizeOptions))
            .ToList();

        if (quiz.RandomizeQuestions)
        {
            questionsDto = questionsDto.OrderBy(_ => Guid.NewGuid()).ToList();
        }

        var response = new StartQuizAttemptResponse(
            AttemptId: attempt?.Id ?? Guid.Empty,
            QuizId: quiz.Id,
            QuizTitle: quiz.Title,
            TimeLimitMinutes: quiz.TimeLimitMinutes,
            TimeLimitSeconds: quiz.TimeLimitSeconds > 0 ? quiz.TimeLimitSeconds : (quiz.TimeLimitMinutes * 60),
            Questions: questionsDto,
            AttemptNumber: attempt?.AttemptNumber ?? 0,
            StartedAt: attempt?.StartedAt,
            IsRecorded: attempt != null
        );

        return Ok(response);
    }

    [HttpPost("submit")]
    public async Task<IActionResult> SubmitQuiz([FromBody] SubmitQuizRequest request)
    {
        var (studentId, role) = GetCurrentUser();
        if (studentId == Guid.Empty)
        {
            // Fail closed: never attribute a submission to a seeded/fabricated account.
            return Unauthorized(new { message = "A verified user identity is required to submit a quiz." });
        }

        var quiz = await DbContext.Assessments
            .Include(a => a.Questions)
                .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(a => a.Id == request.QuizId);

        if (quiz == null)
        {
            return NotFound(new { message = "Quiz not found." });
        }

        var resolution = await _attemptService.ResolveForSubmissionAsync(quiz, studentId, request.AttemptId);
        if (!resolution.IsAllowed)
        {
            return AttemptDenied(resolution.Eligibility);
        }
        var submission = resolution.Attempt!;
        bool isNewAttempt = resolution.IsNew;

        var answers = request.Answers ?? new List<QuestionAnswerSubmission>();
        var questionIds = quiz.Questions.Select(q => q.Id).ToHashSet();
        if (answers.Any(a => !questionIds.Contains(a.QuestionId)))
        {
            return BadRequest(new { message = "One or more answers reference a question that is not part of this quiz.", code = "INVALID_ANSWER_QUESTION" });
        }
        if (answers.GroupBy(a => a.QuestionId).Any(g => g.Count() > 1))
        {
            return BadRequest(new { message = "Each question may be answered at most once per attempt.", code = "DUPLICATE_ANSWER" });
        }

        // All marking happens in the evaluation service; the controller only shapes the response.
        var graded = await _gradingService.SubmitAsync(
            quiz,
            submission,
            isNewAttempt,
            answers.ToDictionary(a => a.QuestionId, a => a.SelectedAnswer ?? string.Empty));

        var attempt = graded.Attempt;
        var reward = graded.Reward;
        bool isEvaluated = graded.Marks.IsFullyEvaluated;
        var breakdown = BuildBreakdown(quiz, graded.Outcomes.Select(o => new AnswerView(
            o.Question, o.StudentAnswer, o.Result.AwardedMarks, o.Result.IsCorrect, o.Result.Feedback,
            o.Result.Status, o.Result.Method)),
            revealKeys: await _accessService.CanManageCourseAsync(quiz.CourseId, studentId, role)
                || await CanStudentSeeAnswerKeysAsync(quiz, studentId, isEvaluated));

        return Ok(new
        {
            submissionId = attempt.Id,
            attemptId = attempt.Id,
            attemptNumber = attempt.AttemptNumber,
            quizId = quiz.Id,
            status = attempt.Status.ToString(),
            pendingReviewCount = graded.Marks.PendingReviewCount,
            scoreObtained = attempt.ScoreObtained,
            maxScore = attempt.MaxScore,
            percentageScore = attempt.PercentageScore,
            passed = attempt.Passed,
            xpEarned = reward?.XpBreakdown.TotalXpEarned ?? 0,
            coinsEarned = reward?.XpBreakdown.CoinsEarned ?? 0,
            feedback = !isEvaluated
                ? $"{graded.Marks.PendingReviewCount} answer(s) are awaiting marking. Your final result and rewards will be available once marking is complete."
                : attempt.Passed
                    ? $"Passed. You earned +{reward?.XpBreakdown.TotalXpEarned ?? 0} XP (+{reward?.XpBreakdown.CoinsEarned ?? 0} Coins)."
                    : "Not passed yet. Review the feedback below and try again.",
            questionBreakdown = breakdown,
            scopeType = quiz.ScopeType.ToString(),
            badgeUnlocked = reward?.UnlockedBadges.FirstOrDefault(),
            xpBreakdown = reward?.XpBreakdown,
            levelUpOccurred = reward?.LevelUpOccurred ?? false,
            newLevel = reward?.NewLevel,
            newTotalXp = reward?.NewTotalXp,
            masteryUpdates = reward?.MasteryUpdates
        });
    }

    /// <summary>
    /// The persisted result of one attempt, rebuilt from the stored answers and question
    /// snapshots (so it is reproducible even if the quiz changed later). Students may read their
    /// own attempts; the course instructor and admins may read any attempt of their courses.
    /// </summary>
    [HttpGet("attempts/{attemptId:guid}/result")]
    public async Task<IActionResult> GetAttemptResult(Guid attemptId)
    {
        var attempt = await DbContext.Submissions
            .AsNoTracking()
            .Include(s => s.Answers).ThenInclude(a => a.Question)
            .Include(s => s.Assessment!).ThenInclude(a => a.Questions)
            .FirstOrDefaultAsync(s => s.Id == attemptId);
        if (attempt?.Assessment == null)
        {
            return NotFound(new { message = "Attempt not found." });
        }

        var (userId, role) = GetCurrentUser();
        bool canManage = await _accessService.CanManageCourseAsync(attempt.Assessment.CourseId, userId, role);
        if (!canManage && attempt.StudentId != userId)
        {
            return NotFound(new { message = "Attempt not found." });
        }

        bool isEvaluated = attempt.Status == AttemptStatus.Evaluated;
        var answerViews = attempt.Answers.Select(a => new AnswerView(
            DeserializeSnapshot(a), a.SelectedAnswer, a.PointsAwarded, a.IsCorrect, a.Feedback ?? string.Empty,
            a.EvaluationStatus, a.EvaluationMethod));

        return Ok(new
        {
            attemptId = attempt.Id,
            quizId = attempt.AssessmentId,
            quizTitle = attempt.Assessment.Title,
            studentId = attempt.StudentId,
            attemptNumber = attempt.AttemptNumber,
            status = attempt.Status.ToString(),
            startedAt = attempt.StartedAt,
            submittedAt = attempt.SubmittedAt,
            evaluatedAt = attempt.EvaluatedAt,
            scoreObtained = attempt.ScoreObtained,
            maxScore = attempt.MaxScore,
            percentageScore = attempt.PercentageScore,
            passed = attempt.Passed,
            pendingReviewCount = attempt.Answers.Count(a => a.EvaluationStatus != AnswerEvaluationStatus.Evaluated),
            instructorFeedback = attempt.InstructorFeedback,
            questionBreakdown = BuildBreakdown(attempt.Assessment, answerViews,
                revealKeys: canManage || await CanStudentSeeAnswerKeysAsync(attempt.Assessment, attempt.StudentId, isEvaluated))
        });
    }

    /// <summary>
    /// Students only see correct answers and explanations once they can no longer use them on
    /// another attempt: the quiz must show answers, this attempt must be fully evaluated, the
    /// student must have no open attempt, and the attempt limit is reached or the quiz is closed.
    /// Unlimited-attempt quizzes that are still open never reveal keys to students.
    /// </summary>
    private async Task<bool> CanStudentSeeAnswerKeysAsync(Assessment quiz, Guid studentId, bool isEvaluated)
    {
        if (!quiz.ShowCorrectAnswers || !isEvaluated) return false;

        bool hasOpenAttempt = await DbContext.Submissions.AnyAsync(s =>
            s.AssessmentId == quiz.Id && s.StudentId == studentId && s.Status == AttemptStatus.InProgress);
        if (hasOpenAttempt) return false;

        var eligibility = await _accessService.CheckAttemptEligibilityAsync(quiz, studentId);
        return eligibility.Reason is AttemptDenialReason.AttemptLimitReached or AttemptDenialReason.Closed;
    }

    /// <summary>
    /// Records an instructor's mark for one answer (first marking of a response awaiting
    /// review, or an override with a mandatory reason). Every change is kept and audited.
    /// </summary>
    [HttpPost("attempts/{attemptId:guid}/answers/{questionId:guid}/mark")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> MarkAnswer(Guid attemptId, Guid questionId, [FromBody] ManualMarkRequest request)
    {
        var (userId, role) = GetCurrentUser();
        var result = await _gradingService.MarkAnswerAsync(
            attemptId, questionId, request.AwardedMarks, request.Feedback, request.Reason, userId, role);

        return result.Error switch
        {
            ManualMarkError.None => Ok(new
            {
                attemptId,
                questionId,
                status = result.Attempt!.Status.ToString(),
                pendingReviewCount = result.Marks!.PendingReviewCount,
                scoreObtained = result.Attempt.ScoreObtained,
                maxScore = result.Attempt.MaxScore,
                percentageScore = result.Attempt.PercentageScore,
                passed = result.Attempt.Passed
            }),
            ManualMarkError.AttemptNotFound or ManualMarkError.AnswerNotFound => NotFound(new { message = result.Message }),
            ManualMarkError.NotAllowed => Forbid(),
            ManualMarkError.AttemptNotSubmitted => Conflict(new { message = result.Message }),
            _ => BadRequest(new { message = result.Message, code = result.Error.ToString() })
        };
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
                attemptNumber = s.AttemptNumber,
                status = s.Status.ToString(),
                pendingReviewCount = s.Answers.Count(a => a.EvaluationStatus != AnswerEvaluationStatus.Evaluated),
                quizId = s.AssessmentId,
                studentId = s.StudentId,
                studentName = s.Student != null ? s.Student.FullName : null,
                studentEmail = s.Student != null ? s.Student.Email : null,
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
                    maxMarks = a.MaxMarks,
                    evaluationStatus = a.EvaluationStatus.ToString(),
                    evaluationMethod = a.EvaluationMethod.ToString(),
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

    // -------------------------------------------------------------------------
    // 7. SHARED HELPERS
    // -------------------------------------------------------------------------

    /// <summary>
    /// Learner-facing view of a question: prompt, options and marks only. Answer keys,
    /// explanations, option correctness and marking metadata are never included.
    /// </summary>
    private static QuizQuestionDto ToLearnerQuestionDto(Question q, bool shuffleOptions)
    {
        var options = JsonSerializer.Deserialize<List<string>>(q.OptionsJson) ?? new List<string>();
        if (shuffleOptions)
        {
            options = options.OrderBy(_ => Guid.NewGuid()).ToList();
        }

        return new QuizQuestionDto(
            q.Id,
            q.Prompt,
            q.Type,
            options,
            q.Points,
            q.OrderIndex,
            CorrectAnswer: null,
            Explanation: null,
            Difficulty: q.Difficulty,
            SourceContentId: null,
            LearningObjective: null,
            MetadataJson: q.Type == QuestionType.Matching
                ? JsonSerializer.Serialize(new { matchingLeft = ExtractMatchingLeftItems(q) })
                : "{}",
            OptionDetails: null);
    }

    /// <summary>
    /// Left-hand prompts of a matching question (no answers), read from the stored
    /// matchingPairs metadata or, as a fallback, from the "left -> right" answer key.
    /// </summary>
    private static List<string> ExtractMatchingLeftItems(Question q)
    {
        var lefts = new List<string>();
        try
        {
            using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(q.MetadataJson) ? "{}" : q.MetadataJson);
            if (doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty("matchingPairs", out var pairs))
            {
                using var nested = pairs.ValueKind == JsonValueKind.String ? JsonDocument.Parse(pairs.GetString() ?? "[]") : null;
                var arr = nested?.RootElement ?? pairs;
                if (arr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var p in arr.EnumerateArray())
                    {
                        if (p.ValueKind == JsonValueKind.Object
                            && p.TryGetProperty("left", out var l) && l.ValueKind == JsonValueKind.String
                            && !string.IsNullOrWhiteSpace(l.GetString()))
                        {
                            lefts.Add(l.GetString()!.Trim());
                        }
                    }
                }
            }
        }
        catch (JsonException)
        {
            // Fall through to the answer-key parse below.
        }

        if (lefts.Count == 0 && !string.IsNullOrWhiteSpace(q.CorrectAnswer))
        {
            foreach (var part in q.CorrectAnswer.Split(new[] { ';', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var sep = part.IndexOf("->", StringComparison.Ordinal);
                if (sep > 0) lefts.Add(part[..sep].Trim());
            }
        }

        return lefts;
    }

    private sealed record AnswerView(
        QuestionSnapshot Question,
        string StudentAnswer,
        int AwardedMarks,
        bool IsCorrect,
        string Feedback,
        AnswerEvaluationStatus Status,
        EvaluationMethod Method);

    /// <summary>
    /// Shapes per-question results. Answer keys, explanations and marking notes are only
    /// included when <paramref name="revealKeys"/> is true.
    /// </summary>
    private static List<QuestionResultItem> BuildBreakdown(Assessment quiz, IEnumerable<AnswerView> answers, bool revealKeys)
    {
        var metadataById = quiz.Questions.ToDictionary(q => q.Id, q => q.MetadataJson);
        return answers.Select(a =>
        {
            string? slideCitation = null;
            string? markingScheme = null;
            if (revealKeys && metadataById.TryGetValue(a.Question.QuestionId, out var metadataJson))
            {
                (slideCitation, markingScheme) = ReadDisplayMetadata(metadataJson);
            }

            return new QuestionResultItem(
                QuestionId: a.Question.QuestionId,
                Prompt: a.Question.Prompt,
                SelectedAnswer: a.StudentAnswer,
                CorrectAnswer: revealKeys ? string.Join(", ", a.Question.CorrectAnswers) : "Hidden",
                IsCorrect: a.IsCorrect,
                PointsAwarded: a.AwardedMarks,
                Explanation: revealKeys
                    ? string.Join(" ", new[] { a.Feedback, a.Question.Explanation }.Where(t => !string.IsNullOrWhiteSpace(t)))
                    : (a.Status == AnswerEvaluationStatus.Evaluated ? "Feedback available on review." : a.Feedback),
                SlideCitation: slideCitation,
                QuestionType: a.Question.Type.ToString(),
                MarkingScheme: markingScheme,
                MaxMarks: a.Question.MaxMarks,
                EvaluationStatus: a.Status.ToString(),
                EvaluationMethod: a.Method.ToString());
        }).ToList();
    }

    private static (string? SlideCitation, string? MarkingScheme) ReadDisplayMetadata(string? metadataJson)
    {
        if (string.IsNullOrWhiteSpace(metadataJson)) return (null, null);
        try
        {
            using var doc = JsonDocument.Parse(metadataJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return (null, null);
            string? Read(string name) => doc.RootElement.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;
            return (Read("slideCitation"), Read("markingScheme"));
        }
        catch (JsonException)
        {
            // Malformed display metadata only affects labels, never marks.
            return (null, null);
        }
    }

    /// <summary>
    /// The stored snapshot, or (for answers recorded before snapshots existed) a best-effort
    /// view of the current question.
    /// </summary>
    private static QuestionSnapshot DeserializeSnapshot(SubmissionAnswer answer)
        => !string.IsNullOrWhiteSpace(answer.QuestionSnapshotJson)
            ? JsonSerializer.Deserialize<QuestionSnapshot>(answer.QuestionSnapshotJson)!
            : new QuestionSnapshot(answer.QuestionId, answer.Question?.Type ?? QuestionType.MultipleChoice,
                answer.Question?.Prompt ?? string.Empty, Array.Empty<string>(),
                answer.Question != null ? new[] { answer.Question.CorrectAnswer } : Array.Empty<string>(),
                answer.MaxMarks, answer.Question?.Explanation ?? string.Empty, QuestionMarkingRules.Default);

    /// <summary>Stages an audit entry committed with the caller's SaveChanges.</summary>
    private void AuditAssessment(string action, Guid assessmentId)
    {
        var (userId, role) = GetCurrentUser();
        _auditLogWriter.AddEntry(userId, role, action, "Assessment", assessmentId.ToString());
    }

    /// <summary>Write-endpoint response: identifies the saved quiz without serializing the entity graph.</summary>
    private static object ToSummary(Assessment quiz) => new
    {
        id = quiz.Id,
        courseId = quiz.CourseId,
        moduleId = quiz.ModuleId,
        topicId = quiz.TopicId,
        title = quiz.Title,
        status = quiz.Status.ToString(),
        questionCount = quiz.Questions.Count,
        totalMarks = quiz.Questions.Sum(q => q.Points)
    };

    private IActionResult AttemptDenied(AttemptEligibility eligibility)
    {
        var body = new
        {
            message = eligibility.Message,
            code = eligibility.Reason.ToString(),
            attemptsUsed = eligibility.AttemptsUsed,
            attemptsAllowed = eligibility.AttemptsAllowed
        };

        return eligibility.Reason switch
        {
            AttemptDenialReason.AttemptLimitReached or AttemptDenialReason.AttemptNotOpen => Conflict(body),
            AttemptDenialReason.AttemptNotFound => NotFound(body),
            _ => StatusCode(StatusCodes.Status403Forbidden, body)
        };
    }

    /// <summary>Where an assessment lives: always a module, optionally a topic or content item in it.</summary>
    private sealed record AssessmentPlacement(
        Guid ModuleId, Guid? TopicId, Guid? ContentItemId, QuizScopeType ScopeType, Guid ScopeId);

    /// <summary>
    /// Maps the legacy (scopeType, scopeId) request shape onto the canonical placement. A
    /// course-level request must name its module. Every target must belong to the course.
    /// </summary>
    private async Task<(AssessmentPlacement? Placement, string? Error)> ResolvePlacementAsync(
        Guid courseId, QuizScopeType scopeType, Guid? scopeId, Guid? moduleId)
    {
        switch (scopeType)
        {
            case QuizScopeType.Module:
            case QuizScopeType.Course:
            {
                var targetModuleId = scopeType == QuizScopeType.Module ? scopeId ?? moduleId : moduleId;
                if (!targetModuleId.HasValue || targetModuleId.Value == Guid.Empty)
                {
                    return (null, "Select the module this assessment belongs to.");
                }
                bool inCourse = await DbContext.Modules.AnyAsync(m => m.Id == targetModuleId.Value && m.CourseId == courseId);
                return inCourse
                    ? (new AssessmentPlacement(targetModuleId.Value, null, null, QuizScopeType.Module, targetModuleId.Value), null)
                    : (null, $"The selected module (ID: {targetModuleId}) does not belong to the selected Course.");
            }

            case QuizScopeType.Topic:
            {
                var topic = scopeId.HasValue
                    ? await DbContext.Topics.AsNoTracking().FirstOrDefaultAsync(t => t.Id == scopeId.Value && t.Module!.CourseId == courseId)
                    : null;
                return topic != null
                    ? (new AssessmentPlacement(topic.ModuleId, topic.Id, null, QuizScopeType.Topic, topic.Id), null)
                    : (null, $"The selected Topic (ID: {scopeId}) does not belong to the selected Course.");
            }

            case QuizScopeType.ContentItem:
            {
                var item = scopeId.HasValue
                    ? await DbContext.ContentItems.AsNoTracking().FirstOrDefaultAsync(ci => ci.Id == scopeId.Value && ci.Module!.CourseId == courseId)
                    : null;
                return item != null
                    ? (new AssessmentPlacement(item.ModuleId, item.TopicId, item.Id, QuizScopeType.ContentItem, item.Id), null)
                    : (null, $"The selected ContentItem (ID: {scopeId}) does not belong to the selected Course.");
            }

            default:
                return (null, $"Unsupported scope type '{scopeType}'.");
        }
    }

    /// <summary>The only writer of an assessment's placement columns.</summary>
    private static void ApplyPlacement(Assessment quiz, AssessmentPlacement placement)
    {
        quiz.ModuleId = placement.ModuleId;
        quiz.TopicId = placement.TopicId;
        quiz.ContentItemScopeId = placement.ContentItemId;
        quiz.ScopeType = placement.ScopeType;
        quiz.ScopeId = placement.ScopeId;
    }

    /// <summary>
    /// Where the AI agent can read an uploaded file: a disk path (local storage) or a private
    /// Blob URL (Vercel). Null when missing or outside the uploads/web root (no path traversal).
    /// </summary>
    private Task<string?> ResolveWebRootFile(string? relativeUrl) => _uploadStorage.ResolveForAiAsync(relativeUrl);

    /// <summary>
    /// The single publication gate used by create, update, validate and publish. Answer keys
    /// are checked through the same snapshot the evaluation service marks against.
    /// </summary>
    private List<string> CollectPublishErrors(Assessment quiz)
    {
        var errors = new List<string>();

        if (quiz.Questions.Count == 0)
        {
            errors.Add("Cannot publish an empty quiz with 0 questions.");
        }

        foreach (var q in quiz.Questions)
        {
            string label = $"Question #{q.OrderIndex} ({q.Type})";
            if (string.IsNullOrWhiteSpace(q.Prompt))
                errors.Add($"{label} has an empty prompt.");

            if (q.Points <= 0)
                errors.Add($"{label} must have points greater than 0.");

            var key = _evaluationService.Snapshot(q);
            bool KeyIsOption(string answer) => key.Options.Any(o => string.Equals(o.Trim(), answer.Trim(), StringComparison.OrdinalIgnoreCase));

            switch (q.Type)
            {
                case QuestionType.MultipleChoice:
                case QuestionType.TimedChallenge:
                    if (key.Options.Count < 2)
                        errors.Add($"{label} requires at least 2 options, found {key.Options.Count}.");
                    if (key.CorrectAnswers.Count != 1)
                        errors.Add($"{label} must have exactly one correct answer.");
                    else if (!KeyIsOption(key.CorrectAnswers[0]))
                        errors.Add($"{label} correct answer '{key.CorrectAnswers[0]}' does not match any option.");
                    break;

                case QuestionType.MultipleSelect:
                    if (key.Options.Count < 2)
                        errors.Add($"{label} requires at least 2 options.");
                    if (key.CorrectAnswers.Count == 0)
                        errors.Add($"{label} must specify one or more correct answers.");
                    else if (!key.CorrectAnswers.All(KeyIsOption))
                        errors.Add($"{label} has correct answers that do not match any option.");
                    break;

                case QuestionType.TrueFalse:
                    if (key.CorrectAnswers.Count != 1 ||
                        !(key.CorrectAnswers[0].Equals("True", StringComparison.OrdinalIgnoreCase) ||
                          key.CorrectAnswers[0].Equals("False", StringComparison.OrdinalIgnoreCase)))
                        errors.Add($"{label} must have 'True' or 'False' as its correct answer.");
                    break;

                case QuestionType.Numerical:
                    if (key.CorrectAnswers.Count == 0 || !key.CorrectAnswers.All(c =>
                            decimal.TryParse(c, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out _)))
                        errors.Add($"{label} must have a numeric correct answer (use '.' as the decimal separator).");
                    break;

                case QuestionType.FillInBlank:
                case QuestionType.Matching:
                case QuestionType.Ordering:
                    if (key.CorrectAnswers.Count == 0)
                        errors.Add($"{label} must have a correct answer.");
                    break;

                // ShortAnswer, OpenEnded, ScenarioBased, CodeSnippet are marked by an instructor
                // (or AI-assisted marking); a model answer is guidance, not a key.
            }
        }

        if (quiz.PassingScorePercent <= 0 || quiz.PassingScorePercent > 100)
        {
            errors.Add($"Passing score percent must be between 1 and 100. Current: {quiz.PassingScorePercent}.");
        }

        if (quiz.XpReward > 250)
        {
            errors.Add($"XP reward ({quiz.XpReward}) exceeds platform maximum of 250 XP.");
        }

        return errors;
    }



    /// <summary>
    /// Instructor view: Overall quiz analytics and student performance leaderboard for a course.
    /// </summary>
    [HttpGet("course/{courseId:guid}/performance")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetCourseQuizPerformance(Guid courseId)
    {
        if (!await IsCourseOwnerOrAdmin(courseId))
            return Forbid();

        var quizzes = await DbContext.Assessments.AsNoTracking()
            .Where(a => a.CourseId == courseId && a.Type == AssessmentType.Quiz)
            .Select(a => new { a.Id, a.Title, a.XpReward, a.CoinReward })
            .ToListAsync();

        var quizIds = quizzes.Select(q => q.Id).ToList();

        var submissions = await DbContext.Submissions.AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Assessment)
            .Where(s => quizIds.Contains(s.AssessmentId) && s.SubmittedAt != null)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();

        var topPerformers = submissions
            .GroupBy(s => new { s.StudentId, Name = s.Student != null ? s.Student.FullName : "Student", Email = s.Student != null ? s.Student.Email : "" })
            .Select(g => new
            {
                studentId = g.Key.StudentId,
                studentName = g.Key.Name,
                studentEmail = g.Key.Email,
                quizzesTaken = g.Select(s => s.AssessmentId).Distinct().Count(),
                totalAttempts = g.Count(),
                averageScore = Math.Round(g.Average(s => s.PercentageScore), 1),
                highestScore = Math.Round(g.Max(s => s.PercentageScore), 1),
                passedCount = g.Count(s => s.Passed),
                totalXpEarned = g.Where(s => s.Passed).Sum(s => s.Assessment != null ? s.Assessment.XpReward : 0)
            })
            .OrderByDescending(p => p.totalXpEarned)
            .ThenByDescending(p => p.averageScore)
            .Take(15)
            .ToList();

        var recentSubmissions = submissions
            .Take(25)
            .Select(s => new
            {
                submissionId = s.Id,
                quizId = s.AssessmentId,
                quizTitle = s.Assessment != null ? s.Assessment.Title : "Quiz",
                studentId = s.StudentId,
                studentName = s.Student != null ? s.Student.FullName : "Student",
                percentageScore = Math.Round(s.PercentageScore, 1),
                passed = s.Passed,
                xpEarned = s.Passed && s.Assessment != null ? s.Assessment.XpReward : 0,
                submittedAt = s.SubmittedAt
            })
            .ToList();

        return Ok(new
        {
            courseId,
            totalQuizzes = quizzes.Count,
            totalSubmissions = submissions.Count,
            averageCourseQuizScore = submissions.Count > 0 ? Math.Round(submissions.Average(s => s.PercentageScore), 1) : 0,
            passRatePercentage = submissions.Count > 0 ? Math.Round((double)submissions.Count(s => s.Passed) / submissions.Count * 100, 1) : 0,
            topPerformers,
            recentSubmissions
        });
    }

    /// <summary>
    /// Student/Learner view: Quiz attempt history for the student journey map and gamification progress.
    /// </summary>
    [HttpGet("student/history")]
    [Authorize]
    public async Task<IActionResult> GetStudentQuizHistory([FromQuery] Guid? studentId)
    {
        var (callerId, role) = GetCurrentUser();
        var targetStudentId = studentId ?? callerId;

        if (targetStudentId != callerId && !role.Equals("Instructor", StringComparison.OrdinalIgnoreCase) && !role.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return Forbid();
        }

        var history = await DbContext.Submissions.AsNoTracking()
            .Include(s => s.Assessment)
                .ThenInclude(a => a!.Course)
            .Where(s => s.StudentId == targetStudentId && s.SubmittedAt != null)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new
            {
                submissionId = s.Id,
                quizId = s.AssessmentId,
                quizTitle = s.Assessment != null ? s.Assessment.Title : "Quiz",
                courseId = s.Assessment != null ? s.Assessment.CourseId : Guid.Empty,
                courseTitle = s.Assessment != null && s.Assessment.Course != null ? s.Assessment.Course.Title : "Course",
                attemptNumber = s.AttemptNumber,
                scoreObtained = s.ScoreObtained,
                maxScore = s.MaxScore,
                percentageScore = Math.Round(s.PercentageScore, 1),
                passed = s.Passed,
                xpEarned = s.Passed && s.Assessment != null ? s.Assessment.XpReward : 0,
                coinEarned = s.Passed && s.Assessment != null ? s.Assessment.CoinReward : 0,
                submittedAt = s.SubmittedAt
            })
            .ToListAsync();

        return Ok(history);
    }
}
