using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Events;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using EduFlow.Infrastructure.Services;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : BaseApiController
{
    private readonly IAuditLogWriter _auditLogWriter;
    private readonly IGamificationService _gamificationService;
    private readonly IRatingService _ratingService;
    private readonly IWebHostEnvironment? _environment;
    private readonly IAiGatewayClient? _aiGatewayClient;
    private readonly IPaymentVerificationService? _paymentVerificationService;
    private readonly IProgressService _progressService;
    private readonly IDomainEventDispatcher? _events;

    public CoursesController(
        ApplicationDbContext dbContext,
        IGamificationService gamificationService,
        IRatingService ratingService,
        IWebHostEnvironment? environment = null,
        IAiGatewayClient? aiGatewayClient = null,
        IPaymentVerificationService? paymentVerificationService = null,
        IAuditLogWriter? auditLogWriter = null,
        IProgressService? progressService = null,
        IDomainEventDispatcher? events = null)
        : base(dbContext)
    {
        _events = events;
        _progressService = progressService ?? new ProgressService(dbContext, events);
        _auditLogWriter = auditLogWriter ?? new AuditLogWriter(dbContext);
        _gamificationService = gamificationService;
        _ratingService = ratingService;
        _environment = environment;
        _aiGatewayClient = aiGatewayClient;
        _paymentVerificationService = paymentVerificationService;
    }

    private IPaymentVerificationService ResolvePaymentGate()
        => _paymentVerificationService ?? new PaymentVerificationService(DbContext);

    // -------------------------------------------------------------------------
    // COURSES
    // -------------------------------------------------------------------------

    [HttpGet]
    public async Task<IActionResult> GetCourses()
    {
        // SECURITY: identity and role come exclusively from the JWT, never from the
        // request. Instructors only ever receive their own courses (including their
        // drafts); Students and anonymous visitors only receive published courses;
        // Admins receive everything.
        var (callerId, callerRole) = GetCurrentUser();
        var courseQuery = DbContext.Courses.AsQueryable();
        if (callerId == Guid.Empty)
        {
            courseQuery = courseQuery.Where(c => c.IsPublished);
        }
        else if (callerRole.Equals("Instructor", StringComparison.OrdinalIgnoreCase))
        {
            courseQuery = courseQuery.Where(c => c.InstructorId == callerId);
        }
        else if (!callerRole.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            courseQuery = courseQuery.Where(c => c.IsPublished);
        }

        var dbCourses = await courseQuery
            .Include(c => c.Instructor)
            .Include(c => c.Modules)
                .ThenInclude(m => m.ContentItems)
            .Include(c => c.Modules)
                .ThenInclude(m => m.Topics)
            .AsNoTracking()
            .ToListAsync();

        var enrollments = await DbContext.Enrollments
            .AsNoTracking()
            .Where(e => (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed))
            .ToListAsync();

        var assessments = await DbContext.Assessments
            .AsNoTracking()
            .ToListAsync();

        var completions = await DbContext.LessonCompletions
            .AsNoTracking()
            .ToListAsync();

        var submissions = await DbContext.Submissions
            .AsNoTracking()
            .ToListAsync();

        // Real average rating / review count computed from APPROVED review rows.
        var ratingSummaries = await _ratingService.GetCourseSummariesAsync(
            dbCourses.Select(c => c.Id).ToList());

        var coursesList = new List<CourseDto>();

        foreach (var c in dbCourses)
        {
            var enrolledStudents = enrollments.Where(e => e.CourseId == c.Id).ToList();
            var studentsCount = enrolledStudents.Count;

            var modulesCount = c.Modules.Count;
            var topicsCount = c.Modules.SelectMany(m => m.Topics).Count();
            var lessons = c.Modules.SelectMany(m => m.ContentItems).ToList();
            var lessonsCount = lessons.Count;

            var courseAssessments = assessments.Where(a => a.CourseId == c.Id).ToList();
            var quizzesCount = courseAssessments.Count;

            // Real figures only: no data means 0, never a placeholder.
            var lessonIds = lessons.Select(l => l.Id).ToHashSet();
            double completionRate = studentsCount > 0
                ? Math.Round(enrolledStudents.Average(e => e.ProgressPercentage), 1)
                : 0.0;

            var assessmentIds = courseAssessments.Select(a => a.Id).ToHashSet();
            var courseSubmissions = submissions
                .Where(s => assessmentIds.Contains(s.AssessmentId) && s.Status == AttemptStatus.Evaluated)
                .ToList();
            double avgScore = courseSubmissions.Any()
                ? Math.Round(courseSubmissions.Average(s => s.PercentageScore), 1)
                : 0.0;

            var courseRating = ratingSummaries.TryGetValue(c.Id, out var summary)
                ? summary
                : CourseRatingSummary.Empty;

            double engagement = 0.0;
            if (studentsCount > 0)
            {
                var activeStudentsCount = completions.Where(lc => lc.ContentItemId.HasValue && lessonIds.Contains(lc.ContentItemId.Value)).Select(lc => lc.StudentId).Distinct().Count();
                engagement = Math.Round((double)activeStudentsCount / studentsCount * 100, 1);
            }

            coursesList.Add(new CourseDto(
                c.Id,
                c.Code,
                c.Title,
                c.Description,
                c.Category,
                c.ThumbnailUrl,
                c.IsPublished,
                c.InstructorId,
                c.Instructor != null ? c.Instructor.FullName : "Instructor",
                modulesCount,
                lessonsCount,
                string.IsNullOrWhiteSpace(c.Term) ? "Fall 2026" : c.Term,
                studentsCount,
                topicsCount,
                quizzesCount,
                completionRate,
                avgScore,
                engagement,
                c.Difficulty.ToString(),
                c.Status,
                c.DurationHours,
                c.Price,
                c.IsFree,
                courseRating.AverageRating,
                courseRating.ReviewCount,
                c.ShortDescription,
                string.IsNullOrWhiteSpace(c.Language) ? "English" : c.Language,
                c.XpReward,
                c.CertificateEnabled,
                DeserializeStringList(c.LearningOutcomesJson),
                DeserializeStringList(c.PrerequisitesJson),
                DeserializeStringList(c.TargetAudienceJson)
            ));
        }

        return Ok(coursesList);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCourseById(Guid id)
    {
        var course = await DbContext.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Modules.OrderBy(m => m.OrderIndex))
                .ThenInclude(m => m.ContentItems.OrderBy(l => l.DisplayOrder))
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        // SECURITY: unpublished (draft) courses are only visible to their owner or an
        // Admin — modifying the id in the URL must not expose another instructor's draft.
        if (!course.IsPublished)
        {
            var (viewerId, viewerRole) = GetCurrentUser();
            var isOwner = viewerId != Guid.Empty && course.InstructorId == viewerId;
            var isAdmin = viewerRole.Equals("Admin", StringComparison.OrdinalIgnoreCase);
            if (!isOwner && !isAdmin)
            {
                return NotFound(new { message = "Course not found." });
            }
        }

        // Resolve real per-lesson completion only when an authenticated Student is viewing
        // their own course. This endpoint has no [Authorize] attribute (it's browsable
        // anonymously), and an Instructor/Admin here isn't "a student" whose completion state
        // we could pick -- there is no single "current student" in either of those cases, so
        // IsCompleted stays false for them below (matching GetLessonDetail's own fallback).
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        Guid? currentStudentId = role.Equals("Student", StringComparison.OrdinalIgnoreCase)
            && Guid.TryParse(uidClaim, out var parsedStudentId)
                ? parsedStudentId
                : null;

        var courseLessonIds = course.Modules.SelectMany(m => m.ContentItems).Select(l => l.Id).ToList();
        var completedLessonIds = currentStudentId.HasValue && courseLessonIds.Count > 0
            ? (await DbContext.LessonCompletions
                .Where(lc => lc.StudentId == currentStudentId.Value
                    && lc.ContentItemId != null
                    && courseLessonIds.Contains(lc.ContentItemId.Value))
                .Select(lc => lc.ContentItemId!.Value)
                .ToListAsync()).ToHashSet()
            : new HashSet<Guid>();

        // Load the course's assessments. Only the owner or an Admin sees drafts and other
        // unpublished lifecycle states; everyone else sees published assessments only.
        var (assessmentViewerId, assessmentViewerRole) = GetCurrentUser();
        bool canSeeUnpublished = assessmentViewerRole.Equals("Admin", StringComparison.OrdinalIgnoreCase)
            || (assessmentViewerId != Guid.Empty && course.InstructorId == assessmentViewerId);
        var courseAssessments = await DbContext.Assessments
            .Where(a => a.CourseId == id && (canSeeUnpublished || a.Status == QuizStatus.Published))
            .Include(a => a.Questions)
            .Include(a => a.Topic)
            .Include(a => a.Module)
            .Include(a => a.ContentItemScope)
            .Include(a => a.Course)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        Func<Assessment, QuizDto> mapQuizToDto = a => new QuizDto(
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
        );

        // Every assessment now belongs to a module, so this list is empty for migrated data;
        // it is kept for API compatibility until the legacy course-level field is removed.
        var courseLevelQuizzes = courseAssessments
            .Where(a => a.ScopeType == QuizScopeType.Course)
            .Select(mapQuizToDto)
            .ToList();

        var ratingSummary = await _ratingService.GetCourseSummaryAsync(course.Id);

        // Catalog/description stay visible to everyone (students need them to decide whether
        // to request enrollment), but the actual attachments are only handed out once the
        // caller satisfies the approval + payment conditions for this course.
        var (callerId, callerRole) = GetCurrentUser();
        var canAccessMaterials = await HasCourseMaterialAccessAsync(course.Id, callerId, callerRole);

        var result = new CourseDetailDto(
            course.Id,
            course.Code,
            course.Title,
            course.Description,
            course.Category,
            course.ThumbnailUrl,
            course.InstructorId,
            course.Instructor?.FullName ?? "Instructor",
            course.Modules.Select(m => new ModuleDto(
                m.Id,
                m.Title,
                m.Description,
                m.OrderIndex,
                canAccessMaterials ? m.PdfUrl : null,
                canAccessMaterials ? m.AttachmentFileName : null,
                m.ContentItems.Select(l => new LessonSummaryDto(
                    l.Id,
                    l.Title,
                    l.XpReward,
                    l.EstimatedMinutes,
                    l.DisplayOrder,
                    completedLessonIds.Contains(l.Id),
                    canAccessMaterials ? l.PdfUrl : null,
                    canAccessMaterials ? l.AttachmentFileName : null
                )).ToList(),
                courseAssessments
                    .Where(a => a.ModuleId == m.Id)
                    .Select(mapQuizToDto)
                    .ToList()
            )).ToList(),
            courseLevelQuizzes,
            string.IsNullOrWhiteSpace(course.Term) ? "Fall 2026" : course.Term,
            ratingSummary.AverageRating,
            ratingSummary.ReviewCount
        );

        return Ok(result);
    }

    /// <summary>
    /// Creates a course owned by the authenticated instructor.
    /// The owner is ALWAYS taken from the JWT identity claim — an instructor id sent by
    /// the client (even if injected into the JSON payload) is never read or trusted.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest request)
    {
        var (requestingUserId, role) = GetCurrentUser();

        // No verifiable identity => no course creation. Never fall back to a seeded/default id.
        if (requestingUserId == Guid.Empty)
        {
            return Unauthorized(new { message = "A verified instructor identity is required to create a course." });
        }

        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Course code and title are required." });
        }

        var code = request.Code.Trim();
        var codeTaken = await DbContext.Courses.AnyAsync(c => c.Code == code);
        if (codeTaken)
        {
            return Conflict(new { message = $"A course with code '{code}' already exists." });
        }

        var course = new Course
        {
            Code = code,
            Title = request.Title.Trim(),
            Description = request.Description ?? string.Empty,
            ShortDescription = (request.ShortDescription ?? string.Empty).Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category.Trim(),
            Term = !string.IsNullOrWhiteSpace(request.Term) ? request.Term : "Fall 2026",
            ThumbnailUrl = request.ThumbnailUrl,
            Difficulty = ParseDifficulty(request.Difficulty),
            DurationHours = Math.Max(0, request.DurationHours),
            Price = request.IsFree ? 0m : Math.Max(0m, request.Price),
            IsFree = request.IsFree,
            Language = string.IsNullOrWhiteSpace(request.Language) ? "English" : request.Language.Trim(),
            XpReward = Math.Max(0, request.XpReward),
            CertificateEnabled = request.CertificateEnabled,
            LearningOutcomesJson = SerializeStringList(request.LearningOutcomes),
            PrerequisitesJson = SerializeStringList(request.Prerequisites),
            TargetAudienceJson = SerializeStringList(request.TargetAudience),
            InstructorId = requestingUserId,   // ownership comes from the authenticated user only
            IsPublished = false,               // courses start as drafts; use /publish to go live
            Status = "Draft"
        };

        await DbContext.Courses.AddAsync(course);
        this.Record(_auditLogWriter, "Course.Created", course.Id);
        await DbContext.SaveChangesAsync();

        var instructorName = role.Equals("Admin", StringComparison.OrdinalIgnoreCase)
            ? null
            : await DbContext.Users
                .Where(u => u.Id == requestingUserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync();

        var dto = new CourseDto(
            course.Id,
            course.Code,
            course.Title,
            course.Description,
            course.Category,
            course.ThumbnailUrl,
            course.IsPublished,
            course.InstructorId,
            instructorName,
            0,
            0,
            string.IsNullOrWhiteSpace(course.Term) ? "Fall 2026" : course.Term,
            StudentsCount: 0,
            TopicsCount: 0,
            QuizzesCount: 0,
            CompletionRate: 0.0,
            AvgScore: 0.0,
            Engagement: 0.0,
            Difficulty: course.Difficulty.ToString(),
            Status: course.Status,
            DurationHours: course.DurationHours,
            Price: course.Price,
            IsFree: course.IsFree,
            ShortDescription: course.ShortDescription,
            Language: string.IsNullOrWhiteSpace(course.Language) ? "English" : course.Language,
            XpReward: course.XpReward,
            CertificateEnabled: course.CertificateEnabled,
            LearningOutcomes: DeserializeStringList(course.LearningOutcomesJson),
            Prerequisites: DeserializeStringList(course.PrerequisitesJson),
            TargetAudience: DeserializeStringList(course.TargetAudienceJson)
        );

        return CreatedAtAction(nameof(GetCourseById), new { id = course.Id }, dto);
    }

    /// <summary>Maps a client-supplied difficulty string onto the domain enum (defaults to Medium).</summary>
    private static DifficultyLevel ParseDifficulty(string? value)
        => Enum.TryParse<DifficultyLevel>(value, ignoreCase: true, out var parsed) ? parsed : DifficultyLevel.Medium;

    /// <summary>Serializes a nullable string list to compact JSON (empty list for null input).</summary>
    private static string SerializeStringList(List<string>? items)
    {
        var cleaned = (items ?? new List<string>())
            .Where(i => !string.IsNullOrWhiteSpace(i))
            .Select(i => i.Trim())
            .ToList();
        return System.Text.Json.JsonSerializer.Serialize(cleaned);
    }

    /// <summary>Reads a JSON string list stored on a course; never returns null.</summary>
    private static List<string> DeserializeStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] CreateCourseRequest request)
    {
        var course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        // Ownership check: only course owner or Admin may update
        if (!await IsCourseOwnerOrAdmin(id))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Course code and title are required." });
        }

        var code = request.Code.Trim();
        var codeTaken = await DbContext.Courses.AnyAsync(c => c.Code == code && c.Id != id);
        if (codeTaken)
        {
            return Conflict(new { message = $"A course with code '{code}' already exists." });
        }

        course.Code = code;
        course.Title = request.Title.Trim();
        course.Description = request.Description ?? string.Empty;
        course.ShortDescription = (request.ShortDescription ?? string.Empty).Trim();
        course.Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category.Trim();
        if (!string.IsNullOrWhiteSpace(request.Term))
        {
            course.Term = request.Term;
        }
        course.ThumbnailUrl = request.ThumbnailUrl;
        course.Difficulty = ParseDifficulty(request.Difficulty);
        course.DurationHours = Math.Max(0, request.DurationHours);
        course.IsFree = request.IsFree;
        course.Price = request.IsFree ? 0m : Math.Max(0m, request.Price);
        course.Language = string.IsNullOrWhiteSpace(request.Language) ? course.Language : request.Language.Trim();
        course.XpReward = Math.Max(0, request.XpReward);
        course.CertificateEnabled = request.CertificateEnabled;
        course.LearningOutcomesJson = SerializeStringList(request.LearningOutcomes);
        course.PrerequisitesJson = SerializeStringList(request.Prerequisites);
        course.TargetAudienceJson = SerializeStringList(request.TargetAudience);
        // Editing must never silently flip publish state, but the legacy Status string is
        // normalised so it can never contradict IsPublished.
        if (course.IsPublished != string.Equals(course.Status, "Published", StringComparison.OrdinalIgnoreCase))
        {
            course.Status = course.IsPublished ? "Published" : "Draft";
        }
        // Ownership is immutable through this endpoint: InstructorId is never assigned from the request.
        course.UpdatedAt = DateTime.UtcNow;

        DbContext.ChangeTracker.DetectChanges();
        var changedFields = DbContext.Entry(course).Properties
            .Where(p => p.IsModified && AuditEventRegistry.CourseFields.Contains(p.Metadata.Name))
            .Select(p => p.Metadata.Name).OrderBy(x => x).ToArray();
        if (changedFields.Length > 0)
            this.Record(_auditLogWriter, "Course.Updated", course.Id,
                new Dictionary<string, object?> { ["changedFields"] = string.Join(",", changedFields) });
        await DbContext.SaveChangesAsync();

        var dto = new CourseDto(
            course.Id,
            course.Code,
            course.Title,
            course.Description,
            course.Category,
            course.ThumbnailUrl,
            course.IsPublished,
            course.InstructorId,
            null,
            0,
            0,
            string.IsNullOrWhiteSpace(course.Term) ? "Fall 2026" : course.Term,
            StudentsCount: 0,
            TopicsCount: 0,
            QuizzesCount: 0,
            CompletionRate: 0.0,
            AvgScore: 0.0,
            Engagement: 0.0,
            Difficulty: course.Difficulty.ToString(),
            Status: course.Status,
            DurationHours: course.DurationHours,
            Price: course.Price,
            IsFree: course.IsFree,
            ShortDescription: course.ShortDescription,
            Language: string.IsNullOrWhiteSpace(course.Language) ? "English" : course.Language,
            XpReward: course.XpReward,
            CertificateEnabled: course.CertificateEnabled,
            LearningOutcomes: DeserializeStringList(course.LearningOutcomesJson),
            Prerequisites: DeserializeStringList(course.PrerequisitesJson),
            TargetAudience: DeserializeStringList(course.TargetAudienceJson)
        );

        return Ok(dto);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteCourse(Guid id)
    {
        var course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        // Ownership check: only course owner or Admin may delete
        if (!await IsCourseOwnerOrAdmin(id))
        {
            return Forbid();
        }

        DbContext.Courses.Remove(course);
        this.Record(_auditLogWriter, "Course.Deleted", course.Id);
        await DbContext.SaveChangesAsync();
        return Ok(new { message = "Course deleted successfully." });
    }

    /// <summary>
    /// Toggles a course between published and unpublished.
    /// Only the owning instructor or an admin may publish/unpublish.
    /// </summary>
    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> PublishCourse(Guid id, [FromBody] PublishCourseRequest request)
    {
        var course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var requestingUserId = Guid.TryParse(uidClaim, out var parsedId) ? parsedId : Guid.Empty;
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        // Only allow the owning instructor or an admin to publish
        if (!role.Equals("Admin", StringComparison.OrdinalIgnoreCase) && course.InstructorId != requestingUserId)
        {
            return Forbid();
        }

        if (course.IsPublished != request.IsPublished)
            this.Record(_auditLogWriter, request.IsPublished ? "Course.Published" : "Course.Unpublished", course.Id);
        course.IsPublished = request.IsPublished;
        course.Status = request.IsPublished ? "Published" : "Draft";
        course.UpdatedAt = DateTime.UtcNow;
        await DbContext.SaveChangesAsync();

        return Ok(new
        {
            message = course.IsPublished ? "Course published successfully." : "Course unpublished.",
            isPublished = course.IsPublished
        });
    }

    // -------------------------------------------------------------------------
    // REVIEWS & RATINGS
    // -------------------------------------------------------------------------

    /// <summary>
    /// Public review list for a course. Only APPROVED reviews are returned.
    /// Non-approved reviews are visible to the course's instructor
    /// (GET /api/instructor/reviews) and to administrators (GET /api/admin/reviews).
    /// </summary>
    [HttpGet("{id:guid}/reviews")]
    public async Task<IActionResult> GetCourseReviews(Guid id)
    {
        var courseExists = await DbContext.Courses.AsNoTracking().AnyAsync(c => c.Id == id);
        if (!courseExists)
        {
            return NotFound(new { message = "Course not found." });
        }

        var reviews = await DbContext.CourseReviews
            .AsNoTracking()
            .Where(r => r.CourseId == id && r.Status == ReviewStatus.Approved)
            .Include(r => r.Student)
            .Include(r => r.Course)
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.UpdatedAt)
            .ToListAsync();

        return Ok(reviews.Select(MapReview).ToList());
    }

    /// <summary>
    /// The authenticated student's own review for this course (used by the UI to know
    /// whether to show the submit or the edit form). Returns <c>hasReview = false</c>
    /// when the student has not reviewed the course yet.
    /// </summary>
    [HttpGet("{id:guid}/reviews/mine")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyCourseReview(Guid id)
    {
        var (studentId, _) = GetCurrentUser();
        if (studentId == Guid.Empty)
        {
            return Unauthorized(new { message = "A verified student identity is required." });
        }

        var review = await DbContext.CourseReviews
            .AsNoTracking()
            .Where(r => r.CourseId == id && r.StudentId == studentId)
            .Include(r => r.Student)
            .Include(r => r.Course)
            .FirstOrDefaultAsync();

        return Ok(new
        {
            hasReview = review != null,
            review = review != null ? MapReview(review) : null
        });
    }

    /// <summary>
    /// Creates — or updates, when the student already has one — the caller's review of a
    /// course. The student id always comes from the JWT and is never read from the body,
    /// so a caller can only ever create or edit their OWN review.
    ///
    /// Eligibility is evaluated by <see cref="IRatingService.CheckReviewEligibilityAsync"/>
    /// (role, published course, verified Active/Completed enrollment, not the instructor).
    /// One review row per (course, student) is additionally enforced by a unique index.
    /// </summary>
    [HttpPost("{id:guid}/reviews")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> CreateOrUpdateReview(Guid id, [FromBody] CreateCourseReviewRequest request)
    {
        var (studentId, _) = GetCurrentUser();
        if (studentId == Guid.Empty)
        {
            return Unauthorized(new { message = "A verified student identity is required to review a course." });
        }

        if (request.Rating < 1 || request.Rating > 5)
        {
            return BadRequest(new { message = "Rating must be between 1 and 5." });
        }

        var comment = (request.Comment ?? string.Empty).Trim();
        if (comment.Length > MaxReviewCommentLength)
        {
            return BadRequest(new { message = $"Review comment must be {MaxReviewCommentLength} characters or fewer." });
        }

        var course = await DbContext.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        var eligibility = await _ratingService.CheckReviewEligibilityAsync(studentId, id);
        if (!eligibility.IsEligible)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = eligibility.Reason });
        }

        var existing = await DbContext.CourseReviews
            .FirstOrDefaultAsync(r => r.CourseId == id && r.StudentId == studentId);

        var isNew = existing == null;
        if (existing == null)
        {
            existing = new CourseReview { CourseId = id, StudentId = studentId };
            await DbContext.CourseReviews.AddAsync(existing);
        }

        existing.Rating = request.Rating;
        existing.Comment = comment;
        existing.UpdatedAt = DateTime.UtcNow;
        // A brand-new review is auto-approved (or queued) per the moderation policy;
        // an edited review re-enters the same policy so rejected content can be fixed.
        existing.Status = _ratingService.ResolveSubmittedStatus();

        await DbContext.SaveChangesAsync();
        await _ratingService.RecalculateCourseAsync(id);

        var saved = await DbContext.CourseReviews
            .AsNoTracking()
            .Where(r => r.Id == existing.Id)
            .Include(r => r.Student)
            .Include(r => r.Course)
            .FirstOrDefaultAsync();

        return Ok(new
        {
            message = isNew ? "Review submitted." : "Review updated.",
            review = saved != null ? MapReview(saved) : null
        });
    }

    /// <summary>
    /// Deletes a review. Allowed only for the review's author or an administrator —
    /// instructors cannot modify student ratings on their own courses.
    /// </summary>
    [HttpDelete("{id:guid}/reviews/{reviewId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(Guid id, Guid reviewId)
    {
        var (userId, role) = GetCurrentUser();
        if (userId == Guid.Empty)
        {
            return Unauthorized(new { message = "Authenticated user required." });
        }

        var review = await DbContext.CourseReviews
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.CourseId == id);
        if (review == null)
        {
            return NotFound(new { message = "Review not found." });
        }

        var isAuthor = review.StudentId == userId;
        var isAdmin = role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        if (!isAuthor && !isAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new { message = "Only the review's author or an administrator may delete a review." });
        }

        DbContext.CourseReviews.Remove(review);
        await DbContext.SaveChangesAsync();
        await _ratingService.RecalculateCourseAsync(id);

        return Ok(new { message = "Review deleted." });
    }

    /// <summary>Maps a review row to its public DTO (shared by all review endpoints).</summary>
    private static CourseReviewDto MapReview(CourseReview r) => new(
        r.Id,
        r.CourseId,
        r.Course?.Code ?? string.Empty,
        r.Course?.Title ?? string.Empty,
        r.StudentId,
        r.Student?.FullName ?? "Student",
        r.Student?.AvatarUrl,
        r.Rating,
        r.Comment,
        r.CreatedAt,
        r.Status.ToString(),
        r.UpdatedAt,
        r.Course?.InstructorId
    );

    private const int MaxReviewCommentLength = 2000;

    // -------------------------------------------------------------------------
    // MODULES
    // -------------------------------------------------------------------------

    [HttpGet("{courseId:guid}/modules")]
    public async Task<IActionResult> GetModules(Guid courseId)
    {
        var courseExists = await DbContext.Courses.AnyAsync(c => c.Id == courseId);
        if (!courseExists)
        {
            return NotFound(new { message = "Course not found." });
        }

        if (await EnforceCourseContentAccess(courseId) is { } denied) return denied;

        var modules = await DbContext.Modules
            .Where(m => m.CourseId == courseId)
            .OrderBy(m => m.OrderIndex)
            .Include(m => m.ContentItems)
            .ToListAsync();

        var moduleDtos = modules.Select(m => new ModuleDto(
                m.Id,
                m.Title,
                m.Description,
                m.OrderIndex,
                m.PdfUrl,
                m.AttachmentFileName,
                m.ContentItems.OrderBy(l => l.DisplayOrder).Select(l => new LessonSummaryDto(
                    l.Id, l.Title, l.XpReward, l.EstimatedMinutes, l.DisplayOrder, false, l.PdfUrl, l.AttachmentFileName
                )).ToList(),
                null
            )).ToList();

        return Ok(moduleDtos);
    }

    [HttpPost("{courseId:guid}/modules")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateModule(Guid courseId, [FromBody] CreateModuleRequest request)
    {
        var courseExists = await DbContext.Courses.AnyAsync(c => c.Id == courseId);
        if (!courseExists)
        {
            return NotFound(new { message = "Course not found." });
        }

        // Ownership check
        if (!await IsCourseOwnerOrAdmin(courseId))
        {
            return Forbid();
        }

        var module = new Module
        {
            CourseId = courseId,
            Title = request.Title,
            Description = request.Description,
            OrderIndex = request.OrderIndex,
            PdfUrl = request.PdfUrl,
            AttachmentFileName = request.AttachmentFileName
        };

        await DbContext.Modules.AddAsync(module);
        await DbContext.SaveChangesAsync();
        return Ok(module);
    }

    [HttpPut("modules/{moduleId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateModule(Guid moduleId, [FromBody] UpdateModuleRequest request)
    {
        var module = await DbContext.Modules.FirstOrDefaultAsync(m => m.Id == moduleId);
        if (module == null)
        {
            return NotFound(new { message = "Module not found." });
        }

        if (!await IsModuleOwnerOrAdmin(moduleId))
        {
            return Forbid();
        }

        module.Title = request.Title;
        module.Description = request.Description;
        module.OrderIndex = request.OrderIndex;
        if (request.PdfUrl != null) module.PdfUrl = request.PdfUrl;
        if (request.AttachmentFileName != null) module.AttachmentFileName = request.AttachmentFileName;
        module.UpdatedAt = DateTime.UtcNow;

        await DbContext.SaveChangesAsync();
        return Ok(module);
    }

    [HttpDelete("modules/{moduleId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteModule(Guid moduleId)
    {
        var module = await DbContext.Modules
            .Include(m => m.ContentItems)
            .FirstOrDefaultAsync(m => m.Id == moduleId);

        if (module == null)
        {
            return NotFound(new { message = "Module not found." });
        }

        if (!await IsModuleOwnerOrAdmin(moduleId))
        {
            return Forbid();
        }

        DbContext.Modules.Remove(module);
        await DbContext.SaveChangesAsync();
        return Ok(new { message = "Module and its lessons deleted successfully." });
    }

    // -------------------------------------------------------------------------
    // LESSONS
    // -------------------------------------------------------------------------

    [HttpGet("lessons/{lessonId:guid}")]
    [Authorize]
    public async Task<IActionResult> GetLessonDetail(Guid lessonId)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var studentId = Guid.TryParse(uidClaim, out var parsedId) ? parsedId : Guid.Empty;

        var lesson = await DbContext.ContentItems.FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
        {
            return NotFound(new { message = "Lesson not found." });
        }

        var lessonCourseId = await DbContext.Modules
            .Where(m => m.Id == lesson.ModuleId)
            .Select(m => m.CourseId)
            .FirstOrDefaultAsync();
        if (await EnforceCourseContentAccess(lessonCourseId) is { } denied) return denied;

        var isCompleted = studentId != Guid.Empty && await DbContext.LessonCompletions
            .AnyAsync(lc => lc.ContentItemId == lessonId && lc.StudentId == studentId);

        var dto = new LessonDetailDto(
            lesson.Id,
            lesson.ModuleId,
            lesson.Title,
            lesson.Content,
            lesson.VideoUrl,
            lesson.PdfUrl,
            lesson.AttachmentFileName,
            lesson.XpReward,
            lesson.EstimatedMinutes,
            lesson.DisplayOrder,
            isCompleted
        );

        return Ok(dto);
    }

    /// <summary>
    /// Public preview of a single lesson the instructor marked as Free Preview.
    /// Only the lesson body and title are exposed — attachments stay enrollment-gated —
    /// and the parent course must be published. Any other lesson id returns 403 with
    /// an enrollment hint rather than its content.
    /// </summary>
    [HttpGet("lessons/{lessonId:guid}/preview")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFreePreviewLesson(Guid lessonId)
    {
        var lesson = await DbContext.ContentItems.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.IsFreePreview);
        if (lesson == null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "This lesson is not available as a free preview.",
                requiresEnrollment = true
            });
        }

        var course = await DbContext.Courses.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Modules.Any(m => m.Id == lesson.ModuleId));
        if (course == null || !course.IsPublished)
        {
            return NotFound(new { message = "Course not found." });
        }

        return Ok(new
        {
            lesson.Id,
            lesson.Title,
            lesson.Content,
            lesson.VideoUrl,
            lesson.EstimatedMinutes,
            lesson.DisplayOrder,
            courseId = course.Id,
            courseTitle = course.Title,
            // Attachments deliberately omitted: preview must never leak the full material.
            pdfUrl = (string?)null,
            isFreePreview = true
        });
    }

    /// <summary>
    /// Server-computed XP summary for a published course. The course's configured
    /// XpReward is the headline figure; the breakdown sums real lesson XpReward values
    /// and live quiz XpReward values, so the storefront can never show fabricated totals.
    /// </summary>
    [HttpGet("{id:guid}/xp-summary")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCourseXpSummary(Guid id)
    {
        var course = await DbContext.Courses.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        var lessonXp = await DbContext.ContentItems.AsNoTracking()
            .Where(l => l.Module != null && l.Module.CourseId == id)
            .SumAsync(l => (int?)l.XpReward) ?? 0;

        var quizXp = await DbContext.Assessments.AsNoTracking()
            .Where(a => a.CourseId == id)
            .SumAsync(a => (int?)a.XpReward) ?? 0;

        return Ok(new
        {
            courseId = course.Id,
            configuredCourseXp = course.XpReward,
            lessonXp,
            quizXp,
            earnedFromLessonsAndQuizzes = lessonXp + quizXp,
            // The headline shown on the course page: instructor-configured total when
            // present, otherwise the live sum of lesson + quiz rewards.
            displayTotal = course.XpReward > 0 ? course.XpReward : lessonXp + quizXp
        });
    }

    [HttpPost("modules/{moduleId:guid}/lessons")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateLesson(Guid moduleId, [FromBody] CreateLessonRequest request)
    {
        var moduleExists = await DbContext.Modules.AnyAsync(m => m.Id == moduleId);
        if (!moduleExists)
        {
            return NotFound(new { message = "Module not found." });
        }

        if (!await IsModuleOwnerOrAdmin(moduleId))
        {
            return Forbid();
        }

        // Lessons are stored as content items in the canonical Course → Module → Topic → ContentItem tree.
        var lesson = new ContentItem
        {
            ModuleId = moduleId,
            ContentType = "Lesson",
            Title = request.Title,
            Content = request.Content,
            VideoUrl = request.VideoUrl,
            PdfUrl = request.PdfUrl,
            AttachmentFileName = request.AttachmentFileName,
            XpReward = request.XpReward,
            EstimatedMinutes = request.EstimatedMinutes,
            DisplayOrder = request.OrderIndex,
            IsFreePreview = request.IsFreePreview
        };

        await DbContext.ContentItems.AddAsync(lesson);
        await DbContext.SaveChangesAsync();
        return Ok(lesson);
    }

    [HttpPut("lessons/{lessonId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateLesson(Guid lessonId, [FromBody] UpdateLessonRequest request)
    {
        var lesson = await DbContext.ContentItems.FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
        {
            return NotFound(new { message = "Lesson not found." });
        }

        // Ownership check via module chain
        if (!await IsModuleOwnerOrAdmin(lesson.ModuleId))
        {
            return Forbid();
        }

        lesson.Title = request.Title;
        lesson.Content = request.Content;
        lesson.VideoUrl = request.VideoUrl;
        if (request.PdfUrl != null) lesson.PdfUrl = request.PdfUrl;
        if (request.AttachmentFileName != null) lesson.AttachmentFileName = request.AttachmentFileName;
        lesson.XpReward = request.XpReward;
        lesson.EstimatedMinutes = request.EstimatedMinutes;
        lesson.DisplayOrder = request.OrderIndex;
        if (request.IsFreePreview.HasValue) lesson.IsFreePreview = request.IsFreePreview.Value;
        lesson.UpdatedAt = DateTime.UtcNow;

        await DbContext.SaveChangesAsync();
        return Ok(lesson);
    }

    // -------------------------------------------------------------------------
    // FILE UPLOAD (PDF & PowerPoint Slide Presentation Storage)
    // -------------------------------------------------------------------------

    /// <summary>
    /// Uploads and stores a lecture slide presentation (PDF or PowerPoint PPTX/PPT), returning the accessible URL.
    /// </summary>
    [HttpPost("upload-pdf")]
    [HttpPost("upload-slide")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UploadPdf(IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded or file is empty." });
        }

        // Security: Validate file extension
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".pdf" && ext != ".pptx" && ext != ".ppt" && ext != ".docx" && ext != ".doc")
        {
            return BadRequest(new { message = "Only PDF documents (.pdf), Word documents (.docx, .doc) and PowerPoint presentations (.pptx, .ppt) are allowed." });
        }

        // Security: Validate file size (50MB limit)
        if (file.Length > 50 * 1024 * 1024)
        {
            return BadRequest(new { message = "File size exceeds 50MB limit." });
        }

        // Security: Validate content-type matches extension
        var allowedContentTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword"
        };
        if (!string.IsNullOrEmpty(file.ContentType) && !allowedContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new { message = $"File content type '{file.ContentType}' does not match the allowed types." });
        }

        // Security: Sanitize filename - strip path components, prevent traversal
        var rawFileName = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(rawFileName))
        {
            return BadRequest(new { message = "Invalid file name." });
        }

        // Security: Ensure no directory traversal in the filename
        var sanitizedFileName = rawFileName.Replace("..", "").Replace("/", "").Replace("\\", "");
        if (sanitizedFileName != rawFileName)
        {
            return BadRequest(new { message = "File name contains invalid characters." });
        }

        var webRoot = _environment?.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var folderName = (ext == ".pptx" || ext == ".ppt") ? "slides" : (ext == ".docx" || ext == ".doc") ? "docs" : "pdfs";
        var uploadDir = Path.Combine(webRoot, "uploads", folderName);
        if (!Directory.Exists(uploadDir))
        {
            Directory.CreateDirectory(uploadDir);
        }

        var safeFileName = $"{Guid.NewGuid()}_{Path.GetFileName(sanitizedFileName)}";
        var filePath = Path.Combine(uploadDir, safeFileName);

        // Security: Verify the resolved path is within the upload directory
        var resolvedPath = Path.GetFullPath(filePath);
        var resolvedUploadDir = Path.GetFullPath(uploadDir);
        if (!resolvedPath.StartsWith(resolvedUploadDir, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Invalid file path." });
        }

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"/uploads/{folderName}/{safeFileName}";
        return Ok(new PdfUploadResultDto(
            FileUrl: fileUrl,
            FileName: rawFileName,
            FileSizeBytes: file.Length,
            Message: "Lecture slide uploaded and stored successfully."
        ));
    }

    /// <summary>
    /// Analyzes an uploaded module's lecture slides with the AI Topic Discovery Agent to extract 4-6 topics.
    /// </summary>
    [HttpPost("modules/{moduleId:guid}/categorize-topics")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CategorizeModuleSlideTopics(Guid moduleId)
    {
        var module = await DbContext.Modules.FirstOrDefaultAsync(m => m.Id == moduleId);
        if (module == null)
        {
            return NotFound(new { message = "Module not found." });
        }

        if (!await IsModuleOwnerOrAdmin(moduleId))
        {
            return Forbid();
        }

        if (string.IsNullOrEmpty(module.PdfUrl))
        {
            return BadRequest(new { message = "Module does not have an attached lecture slide or document." });
        }

        var webRoot = _environment?.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var physicalPath = Path.Combine(webRoot, module.PdfUrl.TrimStart('/'));

        // Security: Verify resolved path is within webroot to prevent path traversal
        var resolvedPhysicalPath = Path.GetFullPath(physicalPath);
        var resolvedWebRoot = Path.GetFullPath(webRoot);
        if (!resolvedPhysicalPath.StartsWith(resolvedWebRoot, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Invalid file path." });
        }

        if (!System.IO.File.Exists(physicalPath))
        {
            return BadRequest(new { message = $"Slide file not found on disk at: {physicalPath}" });
        }

        var payload = new
        {
            slide_path = physicalPath,
            max_topics = 6
        };

        if (_aiGatewayClient != null)
        {
            var res = await _aiGatewayClient.CategorizeSlideTopicsAsync(payload);
            return Content(res, "application/json");
        }

        return Ok(new
        {
            slide_name = module.AttachmentFileName ?? "Lecture Slides",
            total_slides = 5,
            topics = new[]
            {
                new { id = "topic_1", title = $"{module.Title} Foundations", summary = "Core theoretical foundation and introduction.", slide_range = "Slides 1-5", key_concepts = new[] { "Architecture", "Design" } },
                new { id = "topic_2", title = $"{module.Title} Implementation", summary = "Practical architectural patterns and code implementation.", slide_range = "Slides 6-12", key_concepts = new[] { "Patterns", "Code" } },
                new { id = "topic_3", title = $"{module.Title} Best Practices & Optimization", summary = "Production hardening, security, and performance metrics.", slide_range = "Slides 13-20", key_concepts = new[] { "Optimization", "Security" } }
            },
            source = "fallback"
        });
    }

    // -------------------------------------------------------------------------
    // ENROLLMENT
    // -------------------------------------------------------------------------

    /// <summary>
    /// Submits a self-service enrollment request. The request is created (or re-opened) with
    /// PENDING status and only becomes an approved enrollment after the owning instructor
    /// accepts it. Duplicate active requests are impossible: the (CourseId, StudentId) unique
    /// index forces every attempt onto the single existing row.
    /// </summary>
    [HttpPost("{id:guid}/enroll")]
    [Authorize]
    public async Task<IActionResult> EnrollInCourse(Guid id)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var course = await DbContext.Courses
            .FirstOrDefaultAsync(c => c.Id == id && c.IsPublished);
        if (course == null)
        {
            return NotFound(new { message = "Course not found or is not published." });
        }

        // Payment conditions are evaluated before a request is even created, so an
        // enrollment that could never be approved is never accepted into the queue.
        var payment = await ResolvePaymentGate().VerifyAsync(id, studentId);
        if (!payment.IsSatisfied)
        {
            return StatusCode(StatusCodes.Status402PaymentRequired, new
            {
                message = payment.Reason,
                requiresPayment = payment.RequiresPayment
            });
        }

        var existingEnrollment = await DbContext.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == id && e.StudentId == studentId);

        if (existingEnrollment != null)
        {
            switch (existingEnrollment.Status)
            {
                case EnrollmentStatus.Pending:
                    return Ok(new
                    {
                        message = "Enrollment request already pending instructor approval.",
                        enrollmentId = existingEnrollment.Id,
                        status = existingEnrollment.Status.ToString(),
                        statusLabel = existingEnrollment.Status.ToApiLabel()
                    });
                case EnrollmentStatus.Active:
                case EnrollmentStatus.Completed:
                    return Ok(new
                    {
                        message = "Already enrolled in this course.",
                        enrollmentId = existingEnrollment.Id,
                        status = existingEnrollment.Status.ToString(),
                        statusLabel = existingEnrollment.Status.ToApiLabel()
                    });
            }

            // Rejected / Cancelled / Dropped -> re-open the same row as a fresh request.
            // Reusing the row keeps the (CourseId, StudentId) unique index satisfied.
            existingEnrollment.Status = EnrollmentStatus.Pending;
            existingEnrollment.RequestedAt = DateTime.UtcNow;
            existingEnrollment.ReviewedAt = null;
            existingEnrollment.ReviewedByInstructorId = null;
            existingEnrollment.ReviewNotes = null;
            existingEnrollment.UpdatedAt = DateTime.UtcNow;
            QueueEnrollmentRequestedNotification(course);
            await DbContext.SaveChangesAsync();

            return Ok(new
            {
                message = "Enrollment request resubmitted. Awaiting instructor approval.",
                enrollmentId = existingEnrollment.Id,
                status = existingEnrollment.Status.ToString(),
                statusLabel = existingEnrollment.Status.ToApiLabel()
            });
        }

        var enrollment = new Enrollment
        {
            CourseId = id,
            StudentId = studentId,
            ProgressPercentage = 0.0,
            Status = EnrollmentStatus.Pending,
            RequestedAt = DateTime.UtcNow
        };

        await DbContext.Enrollments.AddAsync(enrollment);
        QueueEnrollmentRequestedNotification(course);
        await DbContext.SaveChangesAsync();

        return Ok(new
        {
            message = "Enrollment request submitted. Awaiting instructor approval.",
            enrollmentId = enrollment.Id,
            status = enrollment.Status.ToString(),
            statusLabel = enrollment.Status.ToApiLabel()
        });
    }

    /// <summary>
    /// Cancels a pending enrollment request, or withdraws an approved enrollment.
    /// Pending requests become CANCELLED; approved enrollments become DROPPED (audit trail).
    /// </summary>
    [HttpDelete("{courseId:guid}/enroll")]
    [Authorize]
    public async Task<IActionResult> UnenrollFromCourse(Guid courseId)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var enrollment = await DbContext.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId);

        if (enrollment == null)
        {
            return NotFound(new { message = "Enrollment not found." });
        }

        if (enrollment.Status is EnrollmentStatus.Rejected or EnrollmentStatus.Cancelled or EnrollmentStatus.Dropped)
        {
            return Ok(new
            {
                message = $"This enrollment is already {enrollment.Status.ToApiLabel()}.",
                enrollmentId = enrollment.Id,
                status = enrollment.Status.ToString(),
                statusLabel = enrollment.Status.ToApiLabel()
            });
        }

        var cancelled = enrollment.Status == EnrollmentStatus.Pending;
        enrollment.Status = cancelled ? EnrollmentStatus.Cancelled : EnrollmentStatus.Dropped;
        if (cancelled)
        {
            enrollment.ReviewedAt = DateTime.UtcNow;
            enrollment.ReviewNotes = "Cancelled by student.";
        }
        enrollment.UpdatedAt = DateTime.UtcNow;
        this.RecordEnrollment(_auditLogWriter, cancelled ? "Enrollment.Cancelled" : "Enrollment.Dropped", enrollment);
        await DbContext.SaveChangesAsync();

        return Ok(new
        {
            message = cancelled
                ? "Enrollment request cancelled."
                : "Successfully unenrolled from course.",
            enrollmentId = enrollment.Id,
            status = enrollment.Status.ToString(),
            statusLabel = enrollment.Status.ToApiLabel()
        });
    }

    /// <summary>Queues the instructor's "new request" notification. Saved with the caller's SaveChanges.</summary>
    private void QueueEnrollmentRequestedNotification(Course course)
    {
        if (course.InstructorId == Guid.Empty) return;
        DbContext.Notifications.Add(new Notification
        {
            UserId = course.InstructorId,
            Title = "New Enrollment Request",
            Message = $"A student requested enrollment in '{course.Title}' and is waiting for your approval.",
            Type = "EnrollmentRequested"
        });
    }

    /// <summary>
    /// The authenticated student's own enrollment requests with their lifecycle status,
    /// so their dashboard can show PENDING / APPROVED / REJECTED / CANCELLED accurately.
    /// </summary>
    [HttpGet("/api/students/me/enrollment-requests")]
    [Authorize]
    public async Task<IActionResult> GetMyEnrollmentRequests()
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var enrollments = await DbContext.Enrollments.AsNoTracking()
            .Where(e => e.StudentId == studentId)
            .Include(e => e.Course)
                .ThenInclude(c => c!.Instructor)
            .OrderByDescending(e => e.RequestedAt ?? e.CreatedAt)
            .ToListAsync();

        return Ok(enrollments.Select(e =>
        {
            var access = e.Status.GrantsAccess();
            return new StudentEnrollmentRequestDto(
                EnrollmentId: e.Id,
                CourseId: e.CourseId,
                CourseCode: e.Course?.Code ?? string.Empty,
                CourseTitle: e.Course?.Title ?? string.Empty,
                ThumbnailUrl: e.Course?.ThumbnailUrl,
                Category: e.Course?.Category ?? string.Empty,
                InstructorName: e.Course?.Instructor?.FullName ?? "Instructor",
                Status: e.Status.ToString(),
                StatusLabel: e.Status.ToApiLabel(),
                RequestedAt: e.RequestedAt ?? e.CreatedAt,
                ReviewedAt: e.ReviewedAt,
                ReviewNotes: e.ReviewNotes,
                ProgressPercentage: e.ProgressPercentage,
                CanCancel: e.Status == EnrollmentStatus.Pending,
                HasAccess: access
            );
        }));
    }

    /// <summary>
    /// Whether the caller may open this course's protected learning materials right now.
    /// Used by the UI to gate lesson/PDF content behind approval and payment.
    /// </summary>
    [HttpGet("{courseId:guid}/access")]
    [Authorize]
    public async Task<IActionResult> GetCourseAccess(Guid courseId)
    {
        var (userId, role) = GetCurrentUser();
        if (userId == Guid.Empty) return Unauthorized();

        var course = await DbContext.Courses.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == courseId);
        if (course == null) return NotFound(new { message = "Course not found." });

        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase) ||
            course.InstructorId == userId)
        {
            return Ok(new EnrollmentAccessDto(
                courseId, true, "Active", "APPROVED",
                "You own or administer this course.", false, false, true));
        }

        var payment = await ResolvePaymentGate().VerifyAsync(courseId, userId);
        var enrollment = await DbContext.Enrollments.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == userId);

        if (enrollment != null && enrollment.Status.GrantsAccess() && payment.IsSatisfied)
        {
            return Ok(new EnrollmentAccessDto(
                courseId, true, enrollment.Status.ToString(), enrollment.Status.ToApiLabel(),
                "You are enrolled in this course.", true, payment.RequiresPayment, true));
        }

        var reason = !payment.IsSatisfied
            ? payment.Reason
            : enrollment?.Status switch
            {
                EnrollmentStatus.Pending => "Your enrollment request is awaiting instructor approval.",
                EnrollmentStatus.Rejected => "Your enrollment request was declined by the instructor.",
                EnrollmentStatus.Cancelled => "You cancelled your enrollment request. Submit a new request to rejoin.",
                EnrollmentStatus.Dropped => "You are no longer enrolled in this course.",
                _ => "You are not enrolled in this course yet."
            };

        return Ok(new EnrollmentAccessDto(
            courseId,
            false,
            enrollment?.Status.ToString() ?? "NotEnrolled",
            enrollment?.Status.ToApiLabel() ?? "NOT_ENROLLED",
            reason,
            RequiresApproval: true,
            RequiresPayment: payment.RequiresPayment,
            PaymentSatisfied: payment.IsSatisfied));
    }

    /// <summary>
    /// True when the caller may read a course's protected learning materials: they own/administer
    /// the course, or they hold an approved enrollment whose payment conditions are satisfied.
    /// </summary>
    private async Task<bool> HasCourseMaterialAccessAsync(Guid courseId, Guid userId, string role)
    {
        if (userId == Guid.Empty) return false;
        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase)) return true;
        if (await DbContext.Courses.AnyAsync(c => c.Id == courseId && c.InstructorId == userId)) return true;

        var enrollment = await DbContext.Enrollments.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == userId);
        if (enrollment == null || !enrollment.Status.GrantsAccess()) return false;

        return (await ResolvePaymentGate().VerifyAsync(courseId, userId)).IsSatisfied;
    }

    /// <summary>
    /// Returns null when the caller may open a course's protected learning materials,
    /// otherwise the 401/402/403 result explaining why access is withheld. Applied to the
    /// endpoints that expose real lesson content, full curriculum trees and attachments.
    /// </summary>
    private async Task<IActionResult?> EnforceCourseContentAccess(Guid courseId)
    {
        var (userId, role) = GetCurrentUser();
        if (userId == Guid.Empty)
        {
            return Unauthorized(new { message = "Sign in to access this course's learning materials." });
        }

        if (await HasCourseMaterialAccessAsync(courseId, userId, role)) return null;

        if (!role.Equals("Admin", StringComparison.OrdinalIgnoreCase) &&
            await DbContext.Courses.AnyAsync(c => c.Id == courseId && c.InstructorId == userId))
        {
            return null;
        }

        var enrollment = await DbContext.Enrollments.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == userId);

        if (enrollment != null && enrollment.Status.GrantsAccess())
        {
            var payment = await ResolvePaymentGate().VerifyAsync(courseId, userId);
            return StatusCode(StatusCodes.Status402PaymentRequired, new
            {
                message = payment.Reason,
                requiresPayment = payment.RequiresPayment
            });
        }

        var reason = enrollment?.Status switch
        {
            EnrollmentStatus.Pending => "Your enrollment request is awaiting instructor approval.",
            EnrollmentStatus.Rejected => "Your enrollment request was declined by the instructor.",
            EnrollmentStatus.Cancelled => "Your enrollment request was cancelled. Submit a new request to rejoin.",
            EnrollmentStatus.Dropped => "You are no longer enrolled in this course.",
            _ => "You are not enrolled in this course yet. Request enrollment to gain access."
        };

        return StatusCode(StatusCodes.Status403Forbidden, new
        {
            message = reason,
            status = enrollment?.Status.ToApiLabel() ?? "NOT_ENROLLED"
        });
    }

    /// <summary>
    /// Returns all courses the authenticated student is actively enrolled in,
    /// with per-course progress and completion stats.
    /// </summary>
    [HttpGet("/api/students/me/courses")]
    [Authorize]
    public async Task<IActionResult> GetMyCourses()
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var enrollments = await DbContext.Enrollments
            .Where(e => e.StudentId == studentId
                && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed || e.Status == EnrollmentStatus.Pending))
            .Include(e => e.Course)
                .ThenInclude(c => c!.Instructor)
            .Include(e => e.Course)
                .ThenInclude(c => c!.Modules)
                    .ThenInclude(m => m.ContentItems)
            .ToListAsync();

        var myCourseIds = enrollments.Select(e => e.CourseId).Distinct().ToList();
        var ratingSummaries = await _ratingService.GetCourseSummariesAsync(myCourseIds);
        var completedLessonIds = await DbContext.LessonCompletions
            .Where(lc => lc.StudentId == studentId)
            .Select(lc => lc.ContentItemId)
            .Distinct()
            .ToListAsync();

        // Progress for approved enrollments comes from the single progress formula.
        var progressByCourse = new Dictionary<Guid, CourseProgress>();
        foreach (var e in enrollments.Where(e => e.Status.GrantsAccess()))
        {
            var refreshed = await _progressService.RefreshEnrollmentAsync(e.CourseId, studentId);
            if (refreshed != null) progressByCourse[e.CourseId] = refreshed;
        }
        await DbContext.SaveChangesAsync();

        var myCourses = enrollments.Select(e =>
        {
            var courseLessons = e.Course?.Modules.SelectMany(m => m.ContentItems).ToList()
                ?? new List<ContentItem>();
            var totalLessons = courseLessons.Count;
            var completedLessons = courseLessons.Count(l => completedLessonIds.Contains(l.Id));

            var rating = ratingSummaries.TryGetValue(e.CourseId, out var s)
                ? s
                : CourseRatingSummary.Empty;

            return new EnrolledCourseDto(
                EnrollmentId: e.Id,
                CourseId: e.CourseId,
                CourseCode: e.Course?.Code ?? string.Empty,
                CourseTitle: e.Course?.Title ?? string.Empty,
                ThumbnailUrl: e.Course?.ThumbnailUrl,
                Category: e.Course?.Category ?? string.Empty,
                InstructorName: e.Course?.Instructor?.FullName ?? "Instructor",
                ProgressPercentage: e.ProgressPercentage,
                Status: e.Status.ToString(),
                EnrolledAt: e.CreatedAt,
                TotalLessons: totalLessons,
                CompletedLessons: completedLessons,
                Term: string.IsNullOrWhiteSpace(e.Course?.Term) ? "Fall 2026" : e.Course.Term,
                InstructorId: e.Course?.InstructorId ?? Guid.Empty,
                AverageRating: rating.AverageRating,
                RatingCount: rating.ReviewCount
            );
        }).ToList();

        return Ok(myCourses);
    }

    /// <summary>
    /// Instructor or Admin adds/enrolls a student into a course.
    /// </summary>
    [HttpPost("{courseId:guid}/students")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> AddStudentToCourse(Guid courseId, [FromBody] AddStudentToCourseRequest request)
    {
        var course = await DbContext.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        // Ownership check: only course owner or Admin may manage roster
        if (!await IsCourseOwnerOrAdmin(courseId))
        {
            return Forbid();
        }

        User? student = null;
        if (request.StudentId.HasValue && request.StudentId.Value != Guid.Empty)
        {
            student = await DbContext.Users.FirstOrDefaultAsync(u => u.Id == request.StudentId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var targetEmail = request.Email.Trim().ToLower();
            student = await DbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == targetEmail);
        }

        if (student == null)
        {
            return NotFound(new { message = "Student not found with provided ID or Email." });
        }

        // Instructor-initiated enrollment is still an approval, so it runs through the same
        // payment gate as self-service requests.
        var payment = await ResolvePaymentGate().VerifyAsync(courseId, student.Id);
        if (!payment.IsSatisfied)
        {
            return StatusCode(StatusCodes.Status402PaymentRequired, new
            {
                message = payment.Reason,
                requiresPayment = payment.RequiresPayment
            });
        }

        var (actorId, _) = GetCurrentUser();

        var existingEnrollment = await DbContext.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == student.Id);

        if (existingEnrollment != null)
        {
            if (existingEnrollment.Status == EnrollmentStatus.Active)
            {
                return Ok(new { message = $"{student.FullName} is already enrolled in this course.", enrollmentId = existingEnrollment.Id });
            }

            existingEnrollment.Status = EnrollmentStatus.Active;
            existingEnrollment.ReviewedAt = DateTime.UtcNow;
            existingEnrollment.ReviewedByInstructorId = actorId;
            existingEnrollment.ReviewNotes = "Added directly by instructor.";
            existingEnrollment.UpdatedAt = DateTime.UtcNow;
            this.RecordEnrollment(_auditLogWriter, "Enrollment.Added", existingEnrollment);
            await DbContext.SaveChangesAsync();
            return Ok(new { message = $"Re-activated enrollment for {student.FullName} in {course.Title}.", enrollmentId = existingEnrollment.Id });
        }

        var enrollment = new Enrollment
        {
            CourseId = courseId,
            StudentId = student.Id,
            ProgressPercentage = 0.0,
            Status = EnrollmentStatus.Active,
            RequestedAt = DateTime.UtcNow,
            ReviewedAt = DateTime.UtcNow,
            ReviewedByInstructorId = actorId,
            ReviewNotes = "Added directly by instructor."
        };

        await DbContext.Enrollments.AddAsync(enrollment);
        this.RecordEnrollment(_auditLogWriter, "Enrollment.Added", enrollment);
        await DbContext.SaveChangesAsync();

        return Ok(new { message = $"Successfully added {student.FullName} to {course.Title}.", enrollmentId = enrollment.Id });
    }

    /// <summary>
    /// Gets all enrolled active students for a specific course.
    /// Restricted to the course owner (or an Admin) — one instructor can never
    /// enumerate another instructor's roster.
    /// </summary>
    [HttpGet("{courseId:guid}/enrolled-students")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetEnrolledStudents(Guid courseId)
    {
        var courseExists = await DbContext.Courses.AnyAsync(c => c.Id == courseId);
        if (!courseExists)
        {
            return NotFound(new { message = "Course not found." });
        }

        if (!await IsCourseOwnerOrAdmin(courseId))
        {
            return Forbid();
        }

        var enrolledStudents = await DbContext.Enrollments
            .Where(e => e.CourseId == courseId && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed))
            .Include(e => e.Student)
            .Select(e => new EnrolledStudentDto(
                e.StudentId,
                e.Student != null ? e.Student.FullName : "Student",
                e.Student != null ? e.Student.Email : string.Empty,
                e.CreatedAt,
                e.ProgressPercentage,
                e.Status.ToString()
            ))
            .ToListAsync();

        return Ok(enrolledStudents);
    }

    /// <summary>
    /// Gets all active students available in the system for enrollment.
    /// </summary>
    [HttpGet("students/available")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetAvailableStudents()
    {
        var students = await DbContext.Users
            .Where(u => u.Role == UserRole.Student && u.IsActive)
            .OrderBy(u => u.FullName)
            .Select(u => new AvailableStudentDto(
                u.Id,
                u.FullName,
                u.Email,
                u.IsActive
            ))
            .ToListAsync();

        return Ok(students);
    }

    /// <summary>
    /// Instructor or Admin removes/unenrolls a student from a course.
    /// </summary>
    [HttpDelete("{courseId:guid}/students/{studentId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> RemoveStudentFromCourse(Guid courseId, Guid studentId)
    {
        // Ownership check: only course owner or Admin may remove students
        if (!await IsCourseOwnerOrAdmin(courseId))
        {
            return Forbid();
        }

        var enrollment = await DbContext.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId);

        if (enrollment == null)
        {
            return NotFound(new { message = "Enrollment record not found." });
        }

        if (enrollment.Status != EnrollmentStatus.Dropped)
            this.RecordEnrollment(_auditLogWriter, "Enrollment.Dropped", enrollment);
        enrollment.Status = EnrollmentStatus.Dropped;
        enrollment.UpdatedAt = DateTime.UtcNow;
        await DbContext.SaveChangesAsync();

        return Ok(new { message = "Student successfully unenrolled from course." });
    }

    // -------------------------------------------------------------------------
    // LESSON COMPLETION (with XP award)
    // -------------------------------------------------------------------------

    [HttpPost("lessons/{lessonId:guid}/complete")]
    [Authorize]
    public async Task<IActionResult> CompleteLesson(Guid lessonId)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var lesson = await DbContext.ContentItems.FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
        {
            return NotFound(new { message = "Lesson not found." });
        }

        var lessonCourseId = await DbContext.Modules
            .Where(m => m.Id == lesson.ModuleId)
            .Select(m => m.CourseId)
            .FirstOrDefaultAsync();
        if (await EnforceCourseContentAccess(lessonCourseId) is { } completeDenied) return completeDenied;

        var alreadyCompleted = await DbContext.LessonCompletions
            .AnyAsync(lc => lc.ContentItemId == lessonId && lc.StudentId == studentId);

        if (!alreadyCompleted)
        {
            // Completion, its XP and the refreshed course progress are committed together.
            var completed = await DbContext.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
            {
                DbContext.ChangeTracker.Clear();
                await using var transaction = DbContext.Database.IsRelational()
                    ? await DbContext.Database.BeginTransactionAsync()
                    : null;

                DbContext.LessonCompletions.Add(new LessonCompletion
                {
                    ContentItemId = lessonId,
                    StudentId = studentId,
                    CompletedAt = DateTime.UtcNow
                });
                await DbContext.SaveChangesAsync();

                // Gamification reacts to the event; the controller never awards XP itself.
                var events = _events ?? throw new InvalidOperationException("Domain events are not configured.");
                var reward = (await events.PublishAsync(new LessonCompleted(
                        studentId, lessonCourseId, lessonId, lesson.Title, lesson.XpReward)))
                    .OfType<ChallengeResultDto>()
                    .FirstOrDefault();

                var progress = await _progressService.RefreshEnrollmentAsync(lessonCourseId, studentId);
                await DbContext.SaveChangesAsync();

                if (transaction != null) await transaction.CommitAsync();
                return (reward, progress);
            });

            return Ok(new
            {
                message = "Lesson completed!",
                gamification = completed.reward,
                progressPercentage = completed.progress?.Percentage
            });
        }

        return Ok(new { message = "Lesson was already completed." });
    }

    // -------------------------------------------------------------------------
    // HIERARCHICAL CURRICULUM TREE & SCOPE RESOLUTION
    // -------------------------------------------------------------------------

    [HttpGet("{courseId:guid}/hierarchy")]
    public async Task<IActionResult> GetCourseHierarchy(Guid courseId)
    {
        var course = await DbContext.Courses
            .Include(c => c.Modules.OrderBy(m => m.OrderIndex))
                .ThenInclude(m => m.Topics.OrderBy(t => t.DisplayOrder))
                    .ThenInclude(t => t.ContentItems.OrderBy(ci => ci.DisplayOrder))
            .Include(c => c.Assessments)
            .FirstOrDefaultAsync(c => c.Id == courseId);

        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        if (await EnforceCourseContentAccess(courseId) is { } hierarchyDenied) return hierarchyDenied;

        var allQuizzes = await DbContext.Assessments
            .Where(a => a.CourseId == courseId)
            .Include(a => a.Questions)
            .ToListAsync();

        // Resolve real per-content-item completion only when an authenticated Student is
        // viewing their own course hierarchy. This endpoint has no [Authorize] attribute
        // (it's browsable anonymously), and an Instructor/Admin here isn't "a student" whose
        // completion state we could pick -- there is no single "current student" in either of
        // those cases, so IsCompleted stays false for them below (matching GetLessonDetail's
        // own fallback).
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        Guid? currentStudentId = role.Equals("Student", StringComparison.OrdinalIgnoreCase)
            && Guid.TryParse(uidClaim, out var parsedStudentId)
                ? parsedStudentId
                : null;

        var moduleIds = course.Modules.Select(m => m.Id).ToList();
        var courseContentItemIds = await DbContext.ContentItems
            .Where(ci => moduleIds.Contains(ci.ModuleId))
            .Select(ci => ci.Id)
            .ToListAsync();

        var completedContentItemIds = currentStudentId.HasValue && courseContentItemIds.Count > 0
            ? (await DbContext.LessonCompletions
                .Where(lc => lc.StudentId == currentStudentId.Value
                    && lc.ContentItemId != null
                    && courseContentItemIds.Contains(lc.ContentItemId.Value))
                .Select(lc => lc.ContentItemId!.Value)
                .ToListAsync()).ToHashSet()
            : new HashSet<Guid>();

        var hierarchicalModules = course.Modules.Select(m =>
        {
            var moduleQuizzes = allQuizzes
                .Where(q => q.ScopeType == QuizScopeType.Module && q.ScopeId == m.Id)
                .Select(q => new QuizDto(
                    q.Id, q.CourseId, q.Title, q.Description, q.Type, q.TimeLimitMinutes,
                    q.PassingScorePercent, q.XpReward, q.CoinReward, q.Questions.Count,
                    q.ScopeType, q.ScopeId, m.Title, q.Status, q.Difficulty, q.TimeLimitSeconds,
                    q.AttemptsAllowed, q.RandomizeQuestions, q.RandomizeOptions, q.FeedbackMode,
                    q.ShowCorrectAnswers, q.GeneratedByAI, q.GenerationWorkflowId, q.CreatedAt
                )).ToList();

            var topics = m.Topics.Select(t =>
            {
                var topicQuizzesCount = allQuizzes.Count(q => q.ScopeType == QuizScopeType.Topic && q.ScopeId == t.Id);

                // Group content items into top-level lessons and their child subtopics
                var rootItems = t.ContentItems.Where(ci => ci.ParentContentId == null).ToList();
                var contentItemDtos = rootItems.Select(ci =>
                {
                    var subtopics = t.ContentItems
                        .Where(sub => sub.ParentContentId == ci.Id)
                        .Select(sub => new ContentItemDto(
                            sub.Id, sub.ModuleId, sub.TopicId, sub.ParentContentId, sub.Title,
                            sub.Content, sub.ContentType, sub.DisplayOrder, sub.EstimatedMinutes,
                            sub.XpReward, sub.VideoUrl, sub.PdfUrl, sub.AttachmentFileName, sub.Status,
                            completedContentItemIds.Contains(sub.Id), null, allQuizzes.Count(q => q.ScopeType == QuizScopeType.ContentItem && q.ScopeId == sub.Id)
                        )).ToList();

                    return new ContentItemDto(
                        ci.Id, ci.ModuleId, ci.TopicId, ci.ParentContentId, ci.Title,
                        ci.Content, ci.ContentType, ci.DisplayOrder, ci.EstimatedMinutes,
                        ci.XpReward, ci.VideoUrl, ci.PdfUrl, ci.AttachmentFileName, ci.Status,
                        completedContentItemIds.Contains(ci.Id), subtopics, allQuizzes.Count(q => q.ScopeType == QuizScopeType.ContentItem && q.ScopeId == ci.Id)
                    );
                }).ToList();

                return new TopicDto(
                    t.Id, t.ModuleId, t.Title, t.Description, t.DisplayOrder,
                    t.ContentType, t.EstimatedMinutes, t.Status, contentItemDtos, topicQuizzesCount
                );
            }).ToList();

            var directItems = DbContext.ContentItems
                .Where(ci => ci.ModuleId == m.Id && ci.TopicId == null && ci.ParentContentId == null)
                .Select(ci => new ContentItemDto(
                    ci.Id, ci.ModuleId, null, null, ci.Title, ci.Content, ci.ContentType,
                    ci.DisplayOrder, ci.EstimatedMinutes, ci.XpReward, ci.VideoUrl, ci.PdfUrl,
                    ci.AttachmentFileName, ci.Status, completedContentItemIds.Contains(ci.Id), null, 0
                )).ToList();

            return new HierarchicalModuleDto(
                m.Id, m.Title, m.Description, m.OrderIndex, m.Status, topics, directItems, moduleQuizzes
            );
        }).ToList();

        // Course-level ("final exam") quizzes -- scoped to the whole course rather than any
        // single module/topic/content item -- mirroring the same scope-filtering pattern used
        // for moduleQuizzes above.
        var courseLevelQuizzes = allQuizzes
            .Where(q => q.ScopeType == QuizScopeType.Course)
            .Select(q => new QuizDto(
                q.Id, q.CourseId, q.Title, q.Description, q.Type, q.TimeLimitMinutes,
                q.PassingScorePercent, q.XpReward, q.CoinReward, q.Questions.Count,
                q.ScopeType, q.ScopeId, course.Title, q.Status, q.Difficulty, q.TimeLimitSeconds,
                q.AttemptsAllowed, q.RandomizeQuestions, q.RandomizeOptions, q.FeedbackMode,
                q.ShowCorrectAnswers, q.GeneratedByAI, q.GenerationWorkflowId, q.CreatedAt
            )).ToList();

        var tree = new ContentHierarchyTreeDto(
            course.Id,
            course.Code,
            course.Title,
            course.Description,
            hierarchicalModules,
            courseLevelQuizzes
        );

        return Ok(tree);
    }

    [HttpPost("modules/{moduleId:guid}/topics")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateTopic(Guid moduleId, [FromBody] CreateTopicRequest request)
    {
        var module = await DbContext.Modules.FirstOrDefaultAsync(m => m.Id == moduleId);
        if (module == null)
        {
            return NotFound(new { message = "Module not found." });
        }

        if (!await IsModuleOwnerOrAdmin(moduleId))
        {
            return Forbid();
        }

        var topic = new Topic
        {
            ModuleId = moduleId,
            Title = request.Title,
            Description = request.Description,
            DisplayOrder = request.DisplayOrder,
            ContentType = request.ContentType,
            EstimatedMinutes = request.EstimatedMinutes,
            Status = "Published",
            CreatedAt = DateTime.UtcNow
        };

        await DbContext.Topics.AddAsync(topic);
        await DbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCourseHierarchy), new { courseId = module.CourseId }, topic);
    }

    [HttpPut("topics/{topicId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateTopic(Guid topicId, [FromBody] UpdateTopicRequest request)
    {
        var topic = await DbContext.Topics.Include(t => t.Module).FirstOrDefaultAsync(t => t.Id == topicId);
        if (topic == null)
        {
            return NotFound(new { message = "Topic not found." });
        }

        if (!await IsModuleOwnerOrAdmin(topic.ModuleId))
        {
            return Forbid();
        }

        topic.Title = request.Title;
        topic.Description = request.Description;
        topic.DisplayOrder = request.DisplayOrder;
        topic.ContentType = request.ContentType;
        topic.EstimatedMinutes = request.EstimatedMinutes;
        topic.Status = request.Status;
        topic.UpdatedAt = DateTime.UtcNow;

        await DbContext.SaveChangesAsync();
        return Ok(topic);
    }

    [HttpDelete("topics/{topicId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteTopic(Guid topicId)
    {
        var topic = await DbContext.Topics.Include(t => t.Module).FirstOrDefaultAsync(t => t.Id == topicId);
        if (topic == null)
        {
            return NotFound(new { message = "Topic not found." });
        }

        if (!await IsModuleOwnerOrAdmin(topic.ModuleId))
        {
            return Forbid();
        }

        DbContext.Topics.Remove(topic);
        await DbContext.SaveChangesAsync();
        return Ok(new { message = "Topic deleted successfully." });
    }

    [HttpPost("topics/{topicId:guid}/content-items")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateContentItem(Guid topicId, [FromBody] CreateContentItemRequest request)
    {
        var topic = await DbContext.Topics.Include(t => t.Module).FirstOrDefaultAsync(t => t.Id == topicId);
        if (topic == null)
        {
            return NotFound(new { message = "Topic not found." });
        }

        if (!await IsModuleOwnerOrAdmin(topic.ModuleId))
        {
            return Forbid();
        }

        var contentItem = new ContentItem
        {
            ModuleId = topic.ModuleId,
            TopicId = topicId,
            ParentContentId = request.ParentContentId,
            Title = request.Title,
            Content = request.Content,
            ContentType = request.ContentType,
            DisplayOrder = request.DisplayOrder,
            EstimatedMinutes = request.EstimatedMinutes,
            XpReward = request.XpReward,
            VideoUrl = request.VideoUrl,
            PdfUrl = request.PdfUrl,
            AttachmentFileName = request.AttachmentFileName,
            Status = "Published",
            CreatedAt = DateTime.UtcNow
        };

        await DbContext.ContentItems.AddAsync(contentItem);
        await DbContext.SaveChangesAsync();

        return Ok(contentItem);
    }

    [HttpPut("content-items/{contentItemId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateContentItem(Guid contentItemId, [FromBody] UpdateContentItemRequest request)
    {
        var item = await DbContext.ContentItems.FirstOrDefaultAsync(ci => ci.Id == contentItemId);
        if (item == null)
        {
            return NotFound(new { message = "Content item not found." });
        }

        if (!await IsModuleOwnerOrAdmin(item.ModuleId))
        {
            return Forbid();
        }

        item.Title = request.Title;
        item.Content = request.Content;
        item.ContentType = request.ContentType;
        item.DisplayOrder = request.DisplayOrder;
        item.EstimatedMinutes = request.EstimatedMinutes;
        item.XpReward = request.XpReward;
        item.VideoUrl = request.VideoUrl;
        item.PdfUrl = request.PdfUrl;
        item.AttachmentFileName = request.AttachmentFileName;
        item.Status = request.Status;
        item.UpdatedAt = DateTime.UtcNow;

        await DbContext.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("content-items/{contentItemId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteContentItem(Guid contentItemId)
    {
        var item = await DbContext.ContentItems.FirstOrDefaultAsync(ci => ci.Id == contentItemId);
        if (item == null)
        {
            return NotFound(new { message = "Content item not found." });
        }

        if (!await IsModuleOwnerOrAdmin(item.ModuleId))
        {
            return Forbid();
        }

        DbContext.ContentItems.Remove(item);
        await DbContext.SaveChangesAsync();
        return Ok(new { message = "Content item deleted successfully." });
    }
}


