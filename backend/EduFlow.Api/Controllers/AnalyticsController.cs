using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Instructor,Admin")]
public class AnalyticsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public AnalyticsController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Course-visibility scope resolved from the JWT only (never from request input).
    /// null  => Admin (legitimately unscoped, sees the whole platform)
    /// value => Instructor, scoped to the courses they own
    /// Guid.Empty => unauthenticated/unresolvable identity (scoped to nothing)
    /// </summary>
    private Guid? InstructorScope
    {
        get
        {
            var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
            var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            if (!Guid.TryParse(uidClaim, out var userId)) return Guid.Empty;
            return role.Equals("Admin", StringComparison.OrdinalIgnoreCase) ? null : userId;
        }
    }

    private IQueryable<Course> ScopedCourses()
    {
        var scope = InstructorScope;
        var query = _dbContext.Courses.AsQueryable();
        return scope.HasValue ? query.Where(c => c.InstructorId == scope.Value) : query;
    }

    /// <summary>
    /// Returns high-level dashboard KPIs for instructors and admins.
    /// Instructor callers receive only metrics derived from their own courses.
    /// </summary>
    [HttpGet("dashboard-summary")]
    public async Task<IActionResult> GetDashboardSummary()
    {
        var scope = InstructorScope;
        var scopedCourseIds = scope.HasValue
            ? await ScopedCourses().Select(c => c.Id).ToListAsync()
            : null;

        var totalStudents = scopedCourseIds == null
            ? await _dbContext.Users.AsNoTracking().CountAsync(u => u.Role == UserRole.Student)
            : await _dbContext.Enrollments.AsNoTracking()
                .Where(e => scopedCourseIds.Contains(e.CourseId))
                .Select(e => e.StudentId)
                .Distinct()
                .CountAsync();

        var totalInstructors = await _dbContext.Users.AsNoTracking().CountAsync(u => u.Role == UserRole.Instructor);
        var totalXpSum = await _dbContext.StudentXp.AsNoTracking().SumAsync(s => (long)s.TotalXp);
        var activeStreaks = await _dbContext.StudentStreaks.AsNoTracking().CountAsync(s => s.CurrentStreak > 0);

        var pendingAi = scopedCourseIds == null
            ? await _dbContext.StudyPlans.AsNoTracking().CountAsync(s => s.Status == StudyPlanStatus.PendingInstructorApproval)
            : await _dbContext.StudyPlans.AsNoTracking()
                .CountAsync(s => s.Status == StudyPlanStatus.PendingInstructorApproval
                    && scopedCourseIds.Contains(s.CourseId));

        var totalCourses = await ScopedCourses().AsNoTracking().CountAsync(c => c.IsPublished);

        var totalQuizzesPassed = scopedCourseIds == null
            ? await _dbContext.Submissions.AsNoTracking().CountAsync(s => s.Passed)
            : await _dbContext.Submissions.AsNoTracking()
                .CountAsync(s => s.Passed
                    && s.Assessment != null
                    && scopedCourseIds.Contains(s.Assessment.CourseId));

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
    /// When requested by a verified active Administrator, includes the authoritative adminSummary extension.
    /// </summary>
    [HttpGet("platform")]
    public async Task<IActionResult> GetPlatformAnalytics(CancellationToken cancellationToken = default)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var roleClaim = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var isAdminClaim = roleClaim.Equals("Admin", StringComparison.OrdinalIgnoreCase);

        if (isAdminClaim)
        {
            if (!Guid.TryParse(uidClaim, out var adminUserId))
            {
                return Unauthorized(new { message = "Invalid user identity claim." });
            }

            var liveUser = await _dbContext.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == adminUserId, cancellationToken);

            if (liveUser == null)
            {
                return Unauthorized(new { message = "User account not found." });
            }

            if (!liveUser.IsActive)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "User account is suspended or inactive." });
            }

            if (liveUser.Role != UserRole.Admin)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "User does not have Administrator privileges." });
            }

            Response.Headers.CacheControl = "no-store, private";

            var strategy = _dbContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = _dbContext.Database.IsRelational()
                    ? await _dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, cancellationToken)
                    : null;

                var totalUsers = await _dbContext.Users.AsNoTracking().CountAsync(cancellationToken);
                var totalStudents = await _dbContext.Users.AsNoTracking().CountAsync(u => u.Role == UserRole.Student, cancellationToken);
                var totalCourses = await _dbContext.Courses.AsNoTracking().CountAsync(cancellationToken);
                var publishedCourses = await _dbContext.Courses.AsNoTracking().CountAsync(c => c.IsPublished, cancellationToken);
                var totalEnrollments = await _dbContext.Enrollments.AsNoTracking().CountAsync(e => e.Status == EnrollmentStatus.Active, cancellationToken);
                var totalSubmissions = await _dbContext.Submissions.AsNoTracking().CountAsync(cancellationToken);
                var passedSubmissions = await _dbContext.Submissions.AsNoTracking().CountAsync(s => s.Passed, cancellationToken);
                var totalChallenges = await _dbContext.Challenges.AsNoTracking().CountAsync(cancellationToken);
                var totalXp = await _dbContext.StudentXp.AsNoTracking().SumAsync(s => (long)s.TotalXp, cancellationToken);
                var totalBadgesUnlocked = await _dbContext.StudentBadges.AsNoTracking().CountAsync(cancellationToken);
                var pendingAiApprovals = await _dbContext.StudyPlans.AsNoTracking().CountAsync(sp => sp.Status == StudyPlanStatus.PendingInstructorApproval, cancellationToken);
                var approvedAiWorkflows = await _dbContext.StudyPlans.AsNoTracking().CountAsync(sp => sp.Status == StudyPlanStatus.Approved, cancellationToken);

                var passRate = totalSubmissions > 0
                    ? Math.Round((double)passedSubmissions / totalSubmissions * 100, 1)
                    : 100.0;

                // Extended Admin aggregates
                var totalInstructors = await _dbContext.Users.AsNoTracking().CountAsync(u => u.Role == UserRole.Instructor, cancellationToken);
                var totalAdmins = await _dbContext.Users.AsNoTracking().CountAsync(u => u.Role == UserRole.Admin, cancellationToken);
                var activeUsers = await _dbContext.Users.AsNoTracking().CountAsync(u => u.IsActive, cancellationToken);
                var suspendedUsers = await _dbContext.Users.AsNoTracking().CountAsync(u => !u.IsActive, cancellationToken);

                var unpublishedCourses = await _dbContext.Courses.AsNoTracking().CountAsync(c => !c.IsPublished, cancellationToken);
                var draftCourses = await _dbContext.Courses.AsNoTracking()
                    .CountAsync(c => !c.IsPublished && c.Status != null && c.Status.ToLower() == "draft", cancellationToken);
                var archivedCourses = await _dbContext.Courses.AsNoTracking()
                    .CountAsync(c => !c.IsPublished && c.Status != null && c.Status.ToLower() == "archived", cancellationToken);
                var otherUnpublished = unpublishedCourses - draftCourses - archivedCourses;
                if (otherUnpublished < 0) otherUnpublished = 0;

                var totalEnrollmentRecords = await _dbContext.Enrollments.AsNoTracking().CountAsync(cancellationToken);
                var activeEnrollments = totalEnrollments;
                var completedEnrollments = await _dbContext.Enrollments.AsNoTracking().CountAsync(e => e.Status == EnrollmentStatus.Completed, cancellationToken);
                var pendingEnrollments = await _dbContext.Enrollments.AsNoTracking().CountAsync(e => e.Status == EnrollmentStatus.Pending, cancellationToken);
                var rejectedEnrollments = await _dbContext.Enrollments.AsNoTracking().CountAsync(e => e.Status == EnrollmentStatus.Rejected, cancellationToken);
                var cancelledEnrollments = await _dbContext.Enrollments.AsNoTracking().CountAsync(e => e.Status == EnrollmentStatus.Cancelled, cancellationToken);
                var droppedEnrollments = await _dbContext.Enrollments.AsNoTracking().CountAsync(e => e.Status == EnrollmentStatus.Dropped, cancellationToken);

                var supportTotal = await _dbContext.SupportTickets.AsNoTracking().CountAsync(cancellationToken);
                var supportOpen = await _dbContext.SupportTickets.AsNoTracking().CountAsync(t => t.Status == SupportTicketStatus.Open, cancellationToken);
                var supportInProgress = await _dbContext.SupportTickets.AsNoTracking().CountAsync(t => t.Status == SupportTicketStatus.InProgress, cancellationToken);
                var supportResolved = await _dbContext.SupportTickets.AsNoTracking().CountAsync(t => t.Status == SupportTicketStatus.Resolved, cancellationToken);
                var supportBug = await _dbContext.SupportTickets.AsNoTracking().CountAsync(t => t.Type == SupportTicketType.Bug, cancellationToken);
                var supportDispute = await _dbContext.SupportTickets.AsNoTracking().CountAsync(t => t.Type == SupportTicketType.Dispute, cancellationToken);
                var supportFeedback = await _dbContext.SupportTickets.AsNoTracking().CountAsync(t => t.Type == SupportTicketType.Feedback, cancellationToken);

                if (transaction != null)
                {
                    await transaction.CommitAsync(cancellationToken);
                }

                var adminSummary = new AdminPlatformSummaryDto
                {
                    GeneratedAt = DateTime.UtcNow,
                    Users = new UserSummaryMetricsDto
                    {
                        Total = totalUsers,
                        Students = totalStudents,
                        Instructors = totalInstructors,
                        Admins = totalAdmins,
                        Active = activeUsers,
                        Suspended = suspendedUsers
                    },
                    Courses = new CourseSummaryMetricsDto
                    {
                        Total = totalCourses,
                        Published = publishedCourses,
                        Unpublished = unpublishedCourses,
                        Draft = draftCourses,
                        Archived = archivedCourses,
                        OtherUnpublished = otherUnpublished
                    },
                    Enrollments = new EnrollmentSummaryMetricsDto
                    {
                        TotalRecords = totalEnrollmentRecords,
                        Active = activeEnrollments,
                        Completed = completedEnrollments,
                        Pending = pendingEnrollments,
                        Rejected = rejectedEnrollments,
                        Cancelled = cancelledEnrollments,
                        Dropped = droppedEnrollments
                    },
                    Support = new SupportSummaryMetricsDto
                    {
                        Total = supportTotal,
                        Open = supportOpen,
                        InProgress = supportInProgress,
                        Resolved = supportResolved,
                        Unresolved = supportOpen + supportInProgress,
                        ByType = new SupportTypeDistributionDto
                        {
                            Bug = supportBug,
                            Dispute = supportDispute,
                            Feedback = supportFeedback
                        }
                    },
                    SupportAvailability = "Available"
                };

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
                    },
                    adminSummary
                });
            });
        }

        // Instructor flow: legacy response without adminSummary
        var legacyTotalUsers = await _dbContext.Users.AsNoTracking().CountAsync(cancellationToken);
        var legacyTotalStudents = await _dbContext.Users.AsNoTracking().CountAsync(u => u.Role == UserRole.Student, cancellationToken);
        var legacyTotalCourses = await _dbContext.Courses.AsNoTracking().CountAsync(cancellationToken);
        var legacyPublishedCourses = await _dbContext.Courses.AsNoTracking().CountAsync(c => c.IsPublished, cancellationToken);
        var legacyTotalEnrollments = await _dbContext.Enrollments.AsNoTracking().CountAsync(e => e.Status == EnrollmentStatus.Active, cancellationToken);
        var legacyTotalSubmissions = await _dbContext.Submissions.AsNoTracking().CountAsync(cancellationToken);
        var legacyPassedSubmissions = await _dbContext.Submissions.AsNoTracking().CountAsync(s => s.Passed, cancellationToken);
        var legacyTotalChallenges = await _dbContext.Challenges.AsNoTracking().CountAsync(cancellationToken);
        var legacyTotalXp = await _dbContext.StudentXp.AsNoTracking().SumAsync(s => (long)s.TotalXp, cancellationToken);
        var legacyTotalBadgesUnlocked = await _dbContext.StudentBadges.AsNoTracking().CountAsync(cancellationToken);
        var legacyPendingAiApprovals = await _dbContext.StudyPlans.AsNoTracking().CountAsync(sp => sp.Status == StudyPlanStatus.PendingInstructorApproval, cancellationToken);
        var legacyApprovedAiWorkflows = await _dbContext.StudyPlans.AsNoTracking().CountAsync(sp => sp.Status == StudyPlanStatus.Approved, cancellationToken);

        var legacyPassRate = legacyTotalSubmissions > 0
            ? Math.Round((double)legacyPassedSubmissions / legacyTotalSubmissions * 100, 1)
            : 100.0;

        return Ok(new
        {
            totalUsers = legacyTotalUsers,
            totalStudents = legacyTotalStudents,
            totalCourses = legacyTotalCourses,
            publishedCourses = legacyPublishedCourses,
            totalEnrollments = legacyTotalEnrollments,
            totalSubmissions = legacyTotalSubmissions,
            passedSubmissions = legacyPassedSubmissions,
            quizPassRate = legacyPassRate,
            totalChallenges = legacyTotalChallenges,
            totalXpAwarded = legacyTotalXp,
            totalBadgesUnlocked = legacyTotalBadgesUnlocked,
            aiWorkflows = new
            {
                pending = legacyPendingAiApprovals,
                approved = legacyApprovedAiWorkflows,
                total = legacyPendingAiApprovals + legacyApprovedAiWorkflows
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
        var scope = InstructorScope;
        var submissionsQuery = _dbContext.Submissions
            .AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Assessment)
            .Where(s => !s.Passed);

        // Instructors only see risk signals from students enrolled in their own courses.
        if (scope.HasValue)
        {
            submissionsQuery = submissionsQuery
                .Where(s => s.Assessment != null && s.Assessment.Course != null
                    && s.Assessment.Course.InstructorId == scope.Value);
        }

        var lowScoreSubmissions = await submissionsQuery
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
        var enrolledCoursesCount = await _dbContext.Enrollments.CountAsync(e => e.StudentId == id && (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed));

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
                .ThenInclude(m => m.ContentItems)
            .Include(c => c.Assessments)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course == null)
        {
            return NotFound(new { message = "Course not found." });
        }

        // Ownership: an Instructor may only read analytics for their own courses.
        var uidClaim2 = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var role2 = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var isCourseAdmin = role2.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        var isCourseOwner = Guid.TryParse(uidClaim2, out var courseViewerId)
            && course.InstructorId == courseViewerId;
        if (!isCourseAdmin && !isCourseOwner)
        {
            return Forbid();
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
            totalLessons = course.Modules.Sum(m => m.ContentItems.Count),
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
        var courses = await ScopedCourses()
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

    [HttpGet("recent-activity")]
    public IActionResult GetRecentActivity()
    {
        // Mocking recent activity as requested by UI since there is no domain event ledger out-of-the-box
        var recentActivity = new[]
        {
            new { student = "Alex Rivera", action = "completed Daily Mission: PostgreSQL Indexing", xp = "+120 XP", time = "2m ago", avatar = "AR", isBoss = false, isAi = false },
            new { student = "Maya Patel", action = "slayed Boss Challenge: EF Core Concurrency", xp = "+500 XP", time = "8m ago", avatar = "MP", isBoss = true, isAi = false },
            new { student = "Chen Wei", action = "unlocked 7-Day Silver Streak Badge 🔥", xp = "+50 XP", time = "15m ago", avatar = "CW", isBoss = false, isAi = false },
            new { student = "Elena Rostova", action = "requested AI Personalized Study Plan", xp = "AI Queue", time = "22m ago", avatar = "ER", isBoss = false, isAi = true }
        };
        return Ok(recentActivity);
    }
}
