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

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IGamificationService _gamificationService;

    public CoursesController(ApplicationDbContext dbContext, IGamificationService gamificationService)
    {
        _dbContext = dbContext;
        _gamificationService = gamificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCourses()
    {
        var courses = await _dbContext.Courses
            .Where(c => c.IsPublished)
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

    [HttpGet("{id}")]
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
                m.Lessons.Select(l => new LessonSummaryDto(
                    l.Id,
                    l.Title,
                    l.XpReward,
                    l.EstimatedMinutes,
                    l.OrderIndex,
                    false
                )).ToList()
            )).ToList()
        );

        return Ok(result);
    }

    [HttpPost("{id}/enroll")]
    [Authorize]
    public async Task<IActionResult> EnrollInCourse(Guid id)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var studentId))
        {
            return Unauthorized();
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

    [HttpPost("lessons/{lessonId}/complete")]
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
}
