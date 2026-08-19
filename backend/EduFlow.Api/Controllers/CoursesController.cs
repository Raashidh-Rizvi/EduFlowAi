using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IGamificationService _gamificationService;
    private readonly IWebHostEnvironment? _environment;

    public CoursesController(
        ApplicationDbContext dbContext,
        IGamificationService gamificationService,
        IWebHostEnvironment? environment = null)
    {
        _dbContext = dbContext;
        _gamificationService = gamificationService;
        _environment = environment;
    }

    // -------------------------------------------------------------------------
    // COURSES
    // -------------------------------------------------------------------------

    [HttpGet]
    public async Task<IActionResult> GetCourses()
    {
        var courses = await _dbContext.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Modules)
                .ThenInclude(m => m.Lessons)
            .Select(c => new CourseDto(
                c.Id,
                c.Code,
                c.Title,
                c.Description,
                c.Category,
                c.ThumbnailUrl,
                c.IsPublished,
                c.InstructorId,
                c.Instructor != null ? c.Instructor.FullName : "Instructor",
                c.Modules.Count,
                c.Modules.SelectMany(m => m.Lessons).Count()
            ))
            .ToListAsync();

        return Ok(courses);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCourseById(Guid id)
    {
        var course = await _dbContext.Courses
            .Include(c => c.Instructor)
            .Include(c => c.Modules.OrderBy(m => m.OrderIndex))
                .ThenInclude(m => m.Lessons.OrderBy(l => l.OrderIndex))
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

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
                m.PdfUrl,
                m.AttachmentFileName,
                m.Lessons.Select(l => new LessonSummaryDto(
                    l.Id,
                    l.Title,
                    l.XpReward,
                    l.EstimatedMinutes,
                    l.OrderIndex,
                    false,
                    l.PdfUrl,
                    l.AttachmentFileName
                )).ToList()
            )).ToList()
        );

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest request)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var instructorId = !string.IsNullOrEmpty(uidClaim) && Guid.TryParse(uidClaim, out var parsed)
            ? parsed
            : Guid.Parse("22222222-2222-2222-2222-222222222222");

        var course = new Course
        {
            Code = request.Code,
            Title = request.Title,
            Description = request.Description,
            Category = request.Category,
            ThumbnailUrl = request.ThumbnailUrl,
            InstructorId = instructorId,
            IsPublished = false   // Courses start as drafts; use /publish to make live
        };

        await _dbContext.Courses.AddAsync(course);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCourseById), new { id = course.Id }, course);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] CreateCourseRequest request)
    {
        var course = await _dbContext.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        course.Code = request.Code;
        course.Title = request.Title;
        course.Description = request.Description;
        course.Category = request.Category;
        course.ThumbnailUrl = request.ThumbnailUrl;
        course.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return Ok(course);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteCourse(Guid id)
    {
        var course = await _dbContext.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        _dbContext.Courses.Remove(course);
        await _dbContext.SaveChangesAsync();
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
        var course = await _dbContext.Courses.FirstOrDefaultAsync(c => c.Id == id);
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

        course.IsPublished = request.IsPublished;
        course.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            message = course.IsPublished ? "Course published successfully." : "Course unpublished.",
            isPublished = course.IsPublished
        });
    }

    // -------------------------------------------------------------------------
    // MODULES
    // -------------------------------------------------------------------------

    [HttpGet("{courseId:guid}/modules")]
    public async Task<IActionResult> GetModules(Guid courseId)
    {
        var courseExists = await _dbContext.Courses.AnyAsync(c => c.Id == courseId);
        if (!courseExists)
        {
            return NotFound(new { message = "Course not found." });
        }

        var modules = await _dbContext.Modules
            .Where(m => m.CourseId == courseId)
            .OrderBy(m => m.OrderIndex)
            .Include(m => m.Lessons.OrderBy(l => l.OrderIndex))
            .Select(m => new ModuleDto(
                m.Id,
                m.Title,
                m.Description,
                m.OrderIndex,
                m.PdfUrl,
                m.AttachmentFileName,
                m.Lessons.Select(l => new LessonSummaryDto(
                    l.Id, l.Title, l.XpReward, l.EstimatedMinutes, l.OrderIndex, false, l.PdfUrl, l.AttachmentFileName
                )).ToList()
            ))
            .ToListAsync();

        return Ok(modules);
    }

    [HttpPost("{courseId:guid}/modules")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateModule(Guid courseId, [FromBody] CreateModuleRequest request)
    {
        var course = await _dbContext.Courses.AnyAsync(c => c.Id == courseId);
        if (!course)
        {
            return NotFound(new { message = "Course not found." });
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

        await _dbContext.Modules.AddAsync(module);
        await _dbContext.SaveChangesAsync();
        return Ok(module);
    }

    [HttpPut("modules/{moduleId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateModule(Guid moduleId, [FromBody] UpdateModuleRequest request)
    {
        var module = await _dbContext.Modules.FirstOrDefaultAsync(m => m.Id == moduleId);
        if (module == null)
        {
            return NotFound(new { message = "Module not found." });
        }

        module.Title = request.Title;
        module.Description = request.Description;
        module.OrderIndex = request.OrderIndex;
        if (request.PdfUrl != null) module.PdfUrl = request.PdfUrl;
        if (request.AttachmentFileName != null) module.AttachmentFileName = request.AttachmentFileName;
        module.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return Ok(module);
    }

    [HttpDelete("modules/{moduleId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteModule(Guid moduleId)
    {
        var module = await _dbContext.Modules
            .Include(m => m.Lessons)
            .FirstOrDefaultAsync(m => m.Id == moduleId);

        if (module == null)
        {
            return NotFound(new { message = "Module not found." });
        }

        _dbContext.Modules.Remove(module);
        await _dbContext.SaveChangesAsync();
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

        var lesson = await _dbContext.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
        {
            return NotFound(new { message = "Lesson not found." });
        }

        var isCompleted = studentId != Guid.Empty && await _dbContext.LessonCompletions
            .AnyAsync(lc => lc.LessonId == lessonId && lc.StudentId == studentId);

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
            lesson.OrderIndex,
            isCompleted
        );

        return Ok(dto);
    }

    [HttpPost("modules/{moduleId:guid}/lessons")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateLesson(Guid moduleId, [FromBody] CreateLessonRequest request)
    {
        var module = await _dbContext.Modules.AnyAsync(m => m.Id == moduleId);
        if (!module)
        {
            return NotFound(new { message = "Module not found." });
        }

        var lesson = new Lesson
        {
            ModuleId = moduleId,
            Title = request.Title,
            Content = request.Content,
            VideoUrl = request.VideoUrl,
            PdfUrl = request.PdfUrl,
            AttachmentFileName = request.AttachmentFileName,
            XpReward = request.XpReward,
            EstimatedMinutes = request.EstimatedMinutes,
            OrderIndex = request.OrderIndex
        };

        await _dbContext.Lessons.AddAsync(lesson);
        await _dbContext.SaveChangesAsync();
        return Ok(lesson);
    }

    [HttpPut("lessons/{lessonId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateLesson(Guid lessonId, [FromBody] UpdateLessonRequest request)
    {
        var lesson = await _dbContext.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
        {
            return NotFound(new { message = "Lesson not found." });
        }

        lesson.Title = request.Title;
        lesson.Content = request.Content;
        lesson.VideoUrl = request.VideoUrl;
        if (request.PdfUrl != null) lesson.PdfUrl = request.PdfUrl;
        if (request.AttachmentFileName != null) lesson.AttachmentFileName = request.AttachmentFileName;
        lesson.XpReward = request.XpReward;
        lesson.EstimatedMinutes = request.EstimatedMinutes;
        lesson.OrderIndex = request.OrderIndex;
        lesson.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return Ok(lesson);
    }

    // -------------------------------------------------------------------------
    // FILE UPLOAD (PDF Document Storage)
    // -------------------------------------------------------------------------

    /// <summary>
    /// Uploads and stores a PDF document for modules/lessons, returning the accessible URL.
    /// </summary>
    [HttpPost("upload-pdf")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UploadPdf(IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded or file is empty." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".pdf")
        {
            return BadRequest(new { message = "Only PDF documents (.pdf) are allowed." });
        }

        if (file.Length > 25 * 1024 * 1024) // 25MB limit
        {
            return BadRequest(new { message = "File size exceeds 25MB limit." });
        }

        var webRoot = _environment?.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadDir = Path.Combine(webRoot, "uploads", "pdfs");
        if (!Directory.Exists(uploadDir))
        {
            Directory.CreateDirectory(uploadDir);
        }

        var safeFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
        var filePath = Path.Combine(uploadDir, safeFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"/uploads/pdfs/{safeFileName}";
        return Ok(new PdfUploadResultDto(
            FileUrl: fileUrl,
            FileName: file.FileName,
            FileSizeBytes: file.Length,
            Message: "PDF uploaded and stored successfully."
        ));
    }

    // -------------------------------------------------------------------------
    // ENROLLMENT
    // -------------------------------------------------------------------------

    [HttpPost("{id:guid}/enroll")]
    [Authorize]
    public async Task<IActionResult> EnrollInCourse(Guid id)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
        }

        var courseExists = await _dbContext.Courses.AnyAsync(c => c.Id == id && c.IsPublished);
        if (!courseExists)
        {
            return NotFound(new { message = "Course not found or is not published." });
        }

        var existingEnrollment = await _dbContext.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == id && e.StudentId == studentId);

        if (existingEnrollment != null)
        {
            return Ok(new { message = "Already enrolled in this course.", enrollmentId = existingEnrollment.Id });
        }

        var enrollment = new Enrollment
        {
            CourseId = id,
            StudentId = studentId,
            ProgressPercentage = 0.0,
            Status = EnrollmentStatus.Active
        };

        await _dbContext.Enrollments.AddAsync(enrollment);
        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Successfully enrolled in course!", enrollmentId = enrollment.Id });
    }

    /// <summary>
    /// Unenrolls the authenticated student from a course.
    /// Sets enrollment status to Dropped rather than hard deleting for audit purposes.
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

        var enrollment = await _dbContext.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId);

        if (enrollment == null)
        {
            return NotFound(new { message = "Enrollment not found." });
        }

        // Soft delete — mark as Dropped to preserve audit trail
        enrollment.Status = EnrollmentStatus.Dropped;
        enrollment.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Successfully unenrolled from course." });
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

        var enrollments = await _dbContext.Enrollments
            .Where(e => e.StudentId == studentId && e.Status == EnrollmentStatus.Active)
            .Include(e => e.Course)
                .ThenInclude(c => c!.Instructor)
            .Include(e => e.Course)
                .ThenInclude(c => c!.Modules)
                    .ThenInclude(m => m.Lessons)
            .ToListAsync();

        var myCourses = enrollments.Select(e =>
        {
            var totalLessons = e.Course?.Modules.SelectMany(m => m.Lessons).Count() ?? 0;
            var completedLessons = _dbContext.LessonCompletions
                .Count(lc => lc.StudentId == studentId &&
                             (e.Course != null && e.Course.Modules.Any(m => m.Lessons.Any(l => l.Id == lc.LessonId))));

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
                CompletedLessons: completedLessons
            );
        }).ToList();

        return Ok(myCourses);
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

        var lesson = await _dbContext.Lessons.FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
        {
            return NotFound(new { message = "Lesson not found." });
        }

        var alreadyCompleted = await _dbContext.LessonCompletions
            .AnyAsync(lc => lc.LessonId == lessonId && lc.StudentId == studentId);

        if (!alreadyCompleted)
        {
            var completion = new LessonCompletion
            {
                LessonId = lessonId,
                StudentId = studentId,
                CompletedAt = DateTime.UtcNow
            };
            await _dbContext.LessonCompletions.AddAsync(completion);
            await _dbContext.SaveChangesAsync();

            // Award XP for lesson completion
            var gamificationResult = await _gamificationService.AwardXpAsync(
                studentId,
                XpSourceType.LessonCompleted,
                lessonId,
                lesson.XpReward,
                $"Completed lesson: {lesson.Title}"
            );

            return Ok(new { message = "Lesson completed!", gamification = gamificationResult });
        }

        return Ok(new { message = "Lesson was already completed." });
    }

    // -------------------------------------------------------------------------
    // HIERARCHICAL CURRICULUM TREE & SCOPE RESOLUTION
    // -------------------------------------------------------------------------

    [HttpGet("{courseId:guid}/hierarchy")]
    public async Task<IActionResult> GetCourseHierarchy(Guid courseId)
    {
        var course = await _dbContext.Courses
            .Include(c => c.Modules.OrderBy(m => m.OrderIndex))
                .ThenInclude(m => m.Topics.OrderBy(t => t.DisplayOrder))
                    .ThenInclude(t => t.ContentItems.OrderBy(ci => ci.DisplayOrder))
            .Include(c => c.Assessments)
            .FirstOrDefaultAsync(c => c.Id == courseId);

        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        var allQuizzes = await _dbContext.Assessments
            .Where(a => a.CourseId == courseId)
            .Include(a => a.Questions)
            .ToListAsync();

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
                            false, null, allQuizzes.Count(q => q.ScopeType == QuizScopeType.ContentItem && q.ScopeId == sub.Id)
                        )).ToList();

                    return new ContentItemDto(
                        ci.Id, ci.ModuleId, ci.TopicId, ci.ParentContentId, ci.Title,
                        ci.Content, ci.ContentType, ci.DisplayOrder, ci.EstimatedMinutes,
                        ci.XpReward, ci.VideoUrl, ci.PdfUrl, ci.AttachmentFileName, ci.Status,
                        false, subtopics, allQuizzes.Count(q => q.ScopeType == QuizScopeType.ContentItem && q.ScopeId == ci.Id)
                    );
                }).ToList();

                return new TopicDto(
                    t.Id, t.ModuleId, t.Title, t.Description, t.DisplayOrder,
                    t.ContentType, t.EstimatedMinutes, t.Status, contentItemDtos, topicQuizzesCount
                );
            }).ToList();

            var directItems = _dbContext.ContentItems
                .Where(ci => ci.ModuleId == m.Id && ci.TopicId == null && ci.ParentContentId == null)
                .Select(ci => new ContentItemDto(
                    ci.Id, ci.ModuleId, null, null, ci.Title, ci.Content, ci.ContentType,
                    ci.DisplayOrder, ci.EstimatedMinutes, ci.XpReward, ci.VideoUrl, ci.PdfUrl,
                    ci.AttachmentFileName, ci.Status, false, null, 0
                )).ToList();

            return new HierarchicalModuleDto(
                m.Id, m.Title, m.Description, m.OrderIndex, m.Status, topics, directItems, moduleQuizzes
            );
        }).ToList();

        var tree = new ContentHierarchyTreeDto(
            course.Id,
            course.Code,
            course.Title,
            course.Description,
            hierarchicalModules
        );

        return Ok(tree);
    }

    [HttpPost("modules/{moduleId:guid}/topics")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateTopic(Guid moduleId, [FromBody] CreateTopicRequest request)
    {
        var module = await _dbContext.Modules.FirstOrDefaultAsync(m => m.Id == moduleId);
        if (module == null)
        {
            return NotFound(new { message = "Module not found." });
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

        await _dbContext.Topics.AddAsync(topic);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCourseHierarchy), new { courseId = module.CourseId }, topic);
    }

    [HttpPut("topics/{topicId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateTopic(Guid topicId, [FromBody] UpdateTopicRequest request)
    {
        var topic = await _dbContext.Topics.FirstOrDefaultAsync(t => t.Id == topicId);
        if (topic == null)
        {
            return NotFound(new { message = "Topic not found." });
        }

        topic.Title = request.Title;
        topic.Description = request.Description;
        topic.DisplayOrder = request.DisplayOrder;
        topic.ContentType = request.ContentType;
        topic.EstimatedMinutes = request.EstimatedMinutes;
        topic.Status = request.Status;
        topic.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return Ok(topic);
    }

    [HttpDelete("topics/{topicId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteTopic(Guid topicId)
    {
        var topic = await _dbContext.Topics.FirstOrDefaultAsync(t => t.Id == topicId);
        if (topic == null)
        {
            return NotFound(new { message = "Topic not found." });
        }

        _dbContext.Topics.Remove(topic);
        await _dbContext.SaveChangesAsync();
        return Ok(new { message = "Topic deleted successfully." });
    }

    [HttpPost("topics/{topicId:guid}/content-items")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> CreateContentItem(Guid topicId, [FromBody] CreateContentItemRequest request)
    {
        var topic = await _dbContext.Topics.Include(t => t.Module).FirstOrDefaultAsync(t => t.Id == topicId);
        if (topic == null)
        {
            return NotFound(new { message = "Topic not found." });
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

        await _dbContext.ContentItems.AddAsync(contentItem);
        await _dbContext.SaveChangesAsync();

        return Ok(contentItem);
    }

    [HttpPut("content-items/{contentItemId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> UpdateContentItem(Guid contentItemId, [FromBody] UpdateContentItemRequest request)
    {
        var item = await _dbContext.ContentItems.FirstOrDefaultAsync(ci => ci.Id == contentItemId);
        if (item == null)
        {
            return NotFound(new { message = "Content item not found." });
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

        await _dbContext.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("content-items/{contentItemId:guid}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> DeleteContentItem(Guid contentItemId)
    {
        var item = await _dbContext.ContentItems.FirstOrDefaultAsync(ci => ci.Id == contentItemId);
        if (item == null)
        {
            return NotFound(new { message = "Content item not found." });
        }

        _dbContext.ContentItems.Remove(item);
        await _dbContext.SaveChangesAsync();
        return Ok(new { message = "Content item deleted successfully." });
    }
}


