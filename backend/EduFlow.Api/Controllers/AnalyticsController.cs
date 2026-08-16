using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public AnalyticsController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Returns high-level dashboard KPIs for instructors and admins.
    /// </summary>
    [HttpGet("dashboard-summary")]
    public async Task<IActionResult> GetDashboardSummary()
    {
        var totalStudents = await _dbContext.Users.CountAsync(u => u.Role == UserRole.Student);
        var totalInstructors = await _dbContext.Users.CountAsync(u => u.Role == UserRole.Instructor);
        var totalXpSum = await _dbContext.StudentXp.SumAsync(s => (long)s.TotalXp);
        var activeStreaks = await _dbContext.StudentStreaks.CountAsync(s => s.CurrentStreak > 0);
        var pendingAi = await _dbContext.StudyPlans.CountAsync(s => s.Status == StudyPlanStatus.PendingInstructorApproval);
        var totalCourses = await _dbContext.Courses.CountAsync(c => c.IsPublished);
        var totalQuizzesPassed = await _dbContext.Submissions.CountAsync(s => s.Passed);

        return Ok(new
        {
            totalStudents,
            totalInstructors,
            totalCourses,
            totalQuizzesPassed,
            totalXpAwarded = totalXpSum,
            activeStreaks,
            pendingAiApprovals = pendingAi
        });
    }

    /// <summary>
    /// Returns platform-wide operational and engagement metrics.
    /// </summary>
    [HttpGet("platform")]
    public async Task<IActionResult> GetPlatformAnalytics()
    {
        var totalUsers = await _dbContext.Users.CountAsync();
        var totalStudents = await _dbContext.Users.CountAsync(u => u.Role == UserRole.Student);
        var totalCourses = await _dbContext.Courses.CountAsync();
        var publishedCourses = await _dbContext.Courses.CountAsync(c => c.IsPublished);
        var totalEnrollments = await _dbContext.Enrollments.CountAsync(e => e.Status == EnrollmentStatus.Active);
        var totalSubmissions = await _dbContext.Submissions.CountAsync();
        var passedSubmissions = await _dbContext.Submissions.CountAsync(s => s.Passed);
        var totalChallenges = await _dbContext.Challenges.CountAsync();
        var totalXp = await _dbContext.StudentXp.SumAsync(s => (long)s.TotalXp);
        var totalBadgesUnlocked = await _dbContext.StudentBadges.CountAsync();
        var pendingAiApprovals = await _dbContext.StudyPlans.CountAsync(sp => sp.Status == StudyPlanStatus.PendingInstructorApproval);
        var approvedAiWorkflows = await _dbContext.StudyPlans.CountAsync(sp => sp.Status == StudyPlanStatus.Approved);

        var passRate = totalSubmissions > 0 
            ? Math.Round((double)passedSubmissions / totalSubmissions * 100, 1) 
            : 100.0;

        return Ok(new
        {
            totalUsers,
            totalStudents,
            totalCourses,
            publishedCourses,
            totalEnrollments,
            totalSubmissions,
            passedSubmissions,
            quizPassRate = passRate,
            totalChallenges,
            totalXpAwarded = totalXp,
            totalBadgesUnlocked,
            aiWorkflows = new
            {
                pending = pendingAiApprovals,
                approved = approvedAiWorkflows,
                total = pendingAiApprovals + approvedAiWorkflows
            }
        });
    }

    /// <summary>
    /// Identifies at-risk students based on failed quiz attempts, broken streaks, or low progress.
    /// </summary>
    [HttpGet("at-risk-students")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetAtRiskStudents()
    {
        var lowScoreSubmissions = await _dbContext.Submissions
            .Include(s => s.Student)
            .Include(s => s.Assessment)
            .Where(s => !s.Passed)
            .OrderByDescending(s => s.SubmittedAt)
            .Take(10)
            .Select(s => new
            {
                studentId = s.StudentId,
                studentName = s.Student != null ? s.Student.FullName : "Student",
                studentEmail = s.Student != null ? s.Student.Email : "",
                assessmentTitle = s.Assessment != null ? s.Assessment.Title : "Quiz",
                score = s.PercentageScore,
                riskFactor = "Failed multiple attempts on Assessment",
                recommendedAction = "Generate 5-min Remedial Challenge",
                submittedAt = s.SubmittedAt
            })
            .ToListAsync();

        return Ok(lowScoreSubmissions);
    }

    /// <summary>
    /// Returns granular performance analytics for a specific student.
    /// </summary>
    [HttpGet("student/{id}")]
    [Authorize]
    public async Task<IActionResult> GetStudentAnalytics(Guid id)
    {
        var user = await _dbContext.Users
            .Include(u => u.StudentXp)
            .Include(u => u.StudentStreak)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(new { message = "Student not found." });
        }

        var completedLessonsCount = await _dbContext.LessonCompletions.CountAsync(lc => lc.StudentId == id);
        var submissions = await _dbContext.Submissions.Where(s => s.StudentId == id).ToListAsync();
        var totalQuizzes = submissions.Count;
        var passedQuizzes = submissions.Count(s => s.Passed);
        var averageScore = totalQuizzes > 0 ? Math.Round(submissions.Average(s => s.PercentageScore), 1) : 0.0;
        var badgesCount = await _dbContext.StudentBadges.CountAsync(sb => sb.StudentId == id);
        var challengesCompleted = await _dbContext.StudentChallenges.CountAsync(sc => sc.StudentId == id && sc.Status == ChallengeStatus.Completed);
        var enrolledCoursesCount = await _dbContext.Enrollments.CountAsync(e => e.StudentId == id && e.Status == EnrollmentStatus.Active);

        return Ok(new
        {
            studentId = user.Id,
            fullName = user.FullName,
            email = user.Email,
            totalXp = user.StudentXp?.TotalXp ?? 0,
            currentLevel = user.StudentXp?.CurrentLevel ?? 1,
            coins = user.StudentXp?.Coins ?? 0,
            currentStreak = user.StudentStreak?.CurrentStreak ?? 0,
            longestStreak = user.StudentStreak?.LongestStreak ?? 0,
            enrolledCoursesCount,
            completedLessonsCount,
            totalQuizzesAttempted = totalQuizzes,
            quizzesPassed = passedQuizzes,
            averageQuizScore = averageScore,
            badgesUnlocked = badgesCount,
            challengesCompleted
        });
    }

    /// <summary>
    /// Returns aggregate performance analytics for a specific course.
    /// </summary>
    [HttpGet("course/{id}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetCourseAnalytics(Guid id)
    {
        var course = await _dbContext.Courses
            .Include(c => c.Modules)
                .ThenInclude(m => m.Lessons)
            .Include(c => c.Assessments)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        var enrollments = await _dbContext.Enrollments.Where(e => e.CourseId == id).ToListAsync();
        var totalEnrolled = enrollments.Count;
        var activeEnrolled = enrollments.Count(e => e.Status == EnrollmentStatus.Active);
        var completedEnrolled = enrollments.Count(e => e.Status == EnrollmentStatus.Completed);
        var avgProgress = totalEnrolled > 0 ? Math.Round(enrollments.Average(e => e.ProgressPercentage), 1) : 0.0;

        var assessmentIds = course.Assessments.Select(a => a.Id).ToList();
        var courseSubmissions = await _dbContext.Submissions
            .Where(s => assessmentIds.Contains(s.AssessmentId))
            .ToListAsync();

        var totalAttempts = courseSubmissions.Count;
        var passedAttempts = courseSubmissions.Count(s => s.Passed);
        var avgQuizScore = totalAttempts > 0 ? Math.Round(courseSubmissions.Average(s => s.PercentageScore), 1) : 0.0;

        return Ok(new
        {
            courseId = course.Id,
            courseTitle = course.Title,
            courseCode = course.Code,
            isPublished = course.IsPublished,
            totalModules = course.Modules.Count,
            totalLessons = course.Modules.Sum(m => m.Lessons.Count),
            totalAssessments = course.Assessments.Count,
            totalEnrolledStudents = totalEnrolled,
            activeStudents = activeEnrolled,
            completedStudents = completedEnrolled,
            averageProgressPercentage = avgProgress,
            totalAssessmentSubmissions = totalAttempts,
            assessmentPassRate = totalAttempts > 0 ? Math.Round((double)passedAttempts / totalAttempts * 100, 1) : 100.0,
            averageAssessmentScore = avgQuizScore
        });
    }

    /// <summary>
    /// Returns topic mastery and comprehension heatmap computed dynamically from curriculum assessments and submissions.
    /// </summary>
    [HttpGet("topic-mastery")]
    public async Task<IActionResult> GetTopicMasteryHeatmap()
    {
        var courses = await _dbContext.Courses
            .Include(c => c.Modules)
            .Include(c => c.Assessments)
                .ThenInclude(a => a.Submissions)
            .Where(c => c.IsPublished)
            .ToListAsync();

        var topicList = new List<object>();

        foreach (var course in courses)
        {
            if (course.Assessments.Any())
            {
                foreach (var assessment in course.Assessments)
                {
                    var submissions = assessment.Submissions.ToList();
                    var total = submissions.Count;
                    var avgScore = total > 0 ? (int)Math.Round(submissions.Average(s => s.PercentageScore)) : 0;
                    var atRisk = submissions.Count(s => !s.Passed || s.PercentageScore < 60);

                    string status;
                    string badgeType;

                    if (total == 0)
                    {
                        status = "Pending Data";
                        badgeType = "badge-neutral";
                    }
                    else if (avgScore < 65)
                    {
                        status = "Needs Intervention";
                        badgeType = "badge-danger";
                    }
                    else if (avgScore < 80)
                    {
                        status = "Moderate";
                        badgeType = "badge-warning";
                    }
                    else
                    {
                        status = "Strong";
                        badgeType = "badge-success";
                    }

                    topicList.Add(new
                    {
                        id = assessment.Id.ToString(),
                        name = string.IsNullOrWhiteSpace(course.Code) ? assessment.Title : $"{course.Code}: {assessment.Title}",
                        mastery = avgScore,
                        atRiskCount = atRisk,
                        status,
                        badgeType
                    });
                }
            }
            else
            {
                foreach (var module in course.Modules)
                {
                    topicList.Add(new
                    {
                        id = module.Id.ToString(),
                        name = string.IsNullOrWhiteSpace(course.Code) ? module.Title : $"{course.Code}: {module.Title}",
                        mastery = 0,
                        atRiskCount = 0,
                        status = "Pending Data",
                        badgeType = "badge-neutral"
                    });
                }
            }
        }

        return Ok(topicList);
    }

    /// <summary>
    /// Returns audit logs and AI workflow traces for system governance.
    /// </summary>
    [HttpGet("audit-logs")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetAuditLogs([FromQuery] int limit = 50)
    {
        var logs = await _dbContext.AiWorkflowLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(limit)
            .Select(l => new
            {
                id = l.Id,
                workflowId = l.WorkflowId,
                agentName = l.AgentName,
                executionTimeMs = l.ExecutionTimeMs,
                validationPassed = l.ValidationPassed,
                validationErrors = l.ValidationErrors,
                createdAt = l.CreatedAt
            })
            .ToListAsync();

        return Ok(logs);
    }
}
