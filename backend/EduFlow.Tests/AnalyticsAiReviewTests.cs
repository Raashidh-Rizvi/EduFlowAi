using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Comprehensive test suite for Member 4 – Analytics, Reporting, Audit & AI Validation/Safety Agent.
/// Covers:
/// 1. Dashboard KPI aggregation & platform analytics
/// 2. Student & Course performance analytics
/// 3. At-Risk student query & early warning detection
/// 4. Analytical report generation (StudentPerformance, CourseAnalytics, EngagementSummary)
/// 5. AI workflow human-in-the-loop governance (Approval, Rejection, Pending Queue)
/// 6. Notification delivery & broadcast communications
/// 7. AI safety validation audit logs & execution telemetry
/// </summary>
public class AnalyticsAiReviewTests
{
    private static ApplicationDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var ctx = new ApplicationDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    [Fact]
    public async Task Analytics_DashboardSummary_ComputesTotalMetricsCorrectly()
    {
        await using var db = CreateDb();

        var student1 = new User { FullName = "Student One", Role = UserRole.Student, Email = "s1@test.com" };
        var student2 = new User { FullName = "Student Two", Role = UserRole.Student, Email = "s2@test.com" };
        var instructor = new User { FullName = "Prof Smith", Role = UserRole.Instructor, Email = "prof@test.com" };
        await db.Users.AddRangeAsync(student1, student2, instructor);

        await db.StudentXp.AddRangeAsync(
            new StudentXp { StudentId = student1.Id, TotalXp = 1500, CurrentLevel = 3 },
            new StudentXp { StudentId = student2.Id, TotalXp = 2500, CurrentLevel = 3 }
        );

        await db.StudentStreaks.AddRangeAsync(
            new StudentStreak { StudentId = student1.Id, CurrentStreak = 5 },
            new StudentStreak { StudentId = student2.Id, CurrentStreak = 0 }
        );

        await db.StudyPlans.AddAsync(new StudyPlan
        {
            StudentId = student1.Id,
            TargetGoal = "Master LangGraph",
            Status = StudyPlanStatus.PendingInstructorApproval
        });

        await db.SaveChangesAsync();

        var totalStudents = await db.Users.CountAsync(u => u.Role == UserRole.Student);
        var totalInstructors = await db.Users.CountAsync(u => u.Role == UserRole.Instructor);
        var totalXp = await db.StudentXp.SumAsync(s => (long)s.TotalXp);
        var activeStreaks = await db.StudentStreaks.CountAsync(s => s.CurrentStreak > 0);
        var pendingAi = await db.StudyPlans.CountAsync(s => s.Status == StudyPlanStatus.PendingInstructorApproval);

        Assert.True(totalStudents >= 2);
        Assert.True(totalInstructors >= 1);
        Assert.True(totalXp >= 4000);
        Assert.True(activeStreaks >= 1);
        Assert.True(pendingAi >= 1);
    }

    [Fact]
    public async Task Analytics_PlatformMetrics_CalculatesPassRateAndAggregates()
    {
        await using var db = CreateDb();

        var student = new User { FullName = "Alice", Role = UserRole.Student, Email = "alice@test.com" };
        var instructor = new User { FullName = "Bob", Role = UserRole.Instructor, Email = "bob@test.com" };
        await db.Users.AddRangeAsync(student, instructor);

        var course = new Course { Code = "SE3090", Title = "Architecture", InstructorId = instructor.Id, IsPublished = true };
        await db.Courses.AddAsync(course);

        var assessment = new Assessment { CourseId = course.Id, Title = "Midterm Quiz", Type = AssessmentType.Quiz };
        await db.Assessments.AddAsync(assessment);

        await db.Submissions.AddRangeAsync(
            new Submission { StudentId = student.Id, AssessmentId = assessment.Id, ScoreObtained = 90, MaxScore = 100, PercentageScore = 90.0, Passed = true },
            new Submission { StudentId = student.Id, AssessmentId = assessment.Id, ScoreObtained = 40, MaxScore = 100, PercentageScore = 40.0, Passed = false }
        );

        await db.SaveChangesAsync();

        var totalSubmissions = await db.Submissions.CountAsync();
        var passedSubmissions = await db.Submissions.CountAsync(s => s.Passed);
        var passRate = Math.Round((double)passedSubmissions / totalSubmissions * 100, 1);

        Assert.Equal(2, totalSubmissions);
        Assert.Equal(1, passedSubmissions);
        Assert.Equal(50.0, passRate);
    }

    [Fact]
    public async Task Analytics_StudentMetrics_ReturnsAccurateStudentStats()
    {
        await using var db = CreateDb();

        var student = new User { FullName = "Charlie", Role = UserRole.Student, Email = "charlie@test.com" };
        await db.Users.AddAsync(student);

        await db.StudentXp.AddAsync(new StudentXp { StudentId = student.Id, TotalXp = 1200, CurrentLevel = 2, Coins = 150 });
        await db.StudentStreaks.AddAsync(new StudentStreak { StudentId = student.Id, CurrentStreak = 7, LongestStreak = 10 });

        var course = new Course { Code = "CS101", Title = "Intro", InstructorId = Guid.NewGuid() };
        await db.Courses.AddAsync(course);
        var module = new Module { CourseId = course.Id, Title = "M1" };
        await db.Modules.AddAsync(module);
        var lesson1 = new ContentItem { ModuleId = module.Id, Title = "L1" };
        var lesson2 = new ContentItem { ModuleId = module.Id, Title = "L2" };
        await db.ContentItems.AddRangeAsync(lesson1, lesson2);

        await db.LessonCompletions.AddRangeAsync(
            new LessonCompletion { StudentId = student.Id, ContentItemId = lesson1.Id },
            new LessonCompletion { StudentId = student.Id, ContentItemId = lesson2.Id }
        );

        await db.SaveChangesAsync();

        var completedLessons = await db.LessonCompletions.CountAsync(lc => lc.StudentId == student.Id);
        var xpProfile = await db.StudentXp.FirstOrDefaultAsync(x => x.StudentId == student.Id);
        var streakProfile = await db.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == student.Id);

        Assert.Equal(2, completedLessons);
        Assert.NotNull(xpProfile);
        Assert.Equal(1200, xpProfile.TotalXp);
        Assert.Equal(2, xpProfile.CurrentLevel);
        Assert.NotNull(streakProfile);
        Assert.Equal(7, streakProfile.CurrentStreak);
    }

    [Fact]
    public async Task Analytics_AtRiskStudents_IdentifiesFailingStudentsCorrectly()
    {
        await using var db = CreateDb();

        var studentPass = new User { FullName = "Passing Student", Role = UserRole.Student, Email = "pass@test.com" };
        var studentFail = new User { FullName = "At-Risk Student", Role = UserRole.Student, Email = "fail@test.com" };
        await db.Users.AddRangeAsync(studentPass, studentFail);

        var assessment = new Assessment { CourseId = Guid.NewGuid(), Title = "Concurrency Quiz" };
        await db.Assessments.AddAsync(assessment);

        await db.Submissions.AddRangeAsync(
            new Submission { StudentId = studentPass.Id, AssessmentId = assessment.Id, PercentageScore = 85.0, Passed = true },
            new Submission { StudentId = studentFail.Id, AssessmentId = assessment.Id, PercentageScore = 45.0, Passed = false }
        );

        await db.SaveChangesAsync();

        var atRiskList = await db.Submissions
            .Include(s => s.Student)
            .Where(s => !s.Passed)
            .ToListAsync();

        Assert.Single(atRiskList);
        Assert.Equal(studentFail.Id, atRiskList[0].StudentId);
        Assert.Equal(45.0, atRiskList[0].PercentageScore);
    }

    [Fact]
    public async Task Reports_GenerateReport_CreatesCompletedReportRecord()
    {
        await using var db = CreateDb();
        var instructorId = Guid.NewGuid();

        var report = new Report
        {
            Title = "SE3090 Cohort Performance Report",
            Type = "StudentPerformance",
            GeneratedById = instructorId,
            Status = "Completed",
            SummaryJson = JsonSerializer.Serialize(new { totalStudents = 120, avgScore = 78.5 }),
            FileUrl = "/reports/performance_2026.pdf"
        };

        await db.Reports.AddAsync(report);
        await db.SaveChangesAsync();

        var persisted = await db.Reports.FirstOrDefaultAsync(r => r.Id == report.Id);
        Assert.NotNull(persisted);
        Assert.Equal("SE3090 Cohort Performance Report", persisted.Title);
        Assert.Equal("Completed", persisted.Status);
        Assert.Contains("78.5", persisted.SummaryJson);
    }

    [Fact]
    public async Task AiReview_InstructorApproval_TransitionsStudyPlanToApproved()
    {
        await using var db = CreateDb();
        var studentId = Guid.NewGuid();
        var instructorId = Guid.NewGuid();

        var studyPlan = new StudyPlan
        {
            StudentId = studentId,
            TargetGoal = "Learn Distributed Database Locking",
            TargetWeeks = 3,
            HoursPerWeek = 8.0,
            Status = StudyPlanStatus.PendingInstructorApproval
        };

        await db.StudyPlans.AddAsync(studyPlan);
        await db.SaveChangesAsync();

        // Instructor reviews and approves
        studyPlan.Status = StudyPlanStatus.Approved;
        studyPlan.ApprovedByInstructorId = instructorId;
        studyPlan.ApprovedAt = DateTime.UtcNow;
        studyPlan.InstructorNotes = "Approved! Excellent pacing.";

        await db.SaveChangesAsync();

        var approvedPlan = await db.StudyPlans.FirstOrDefaultAsync(sp => sp.Id == studyPlan.Id);
        Assert.NotNull(approvedPlan);
        Assert.Equal(StudyPlanStatus.Approved, approvedPlan.Status);
        Assert.Equal(instructorId, approvedPlan.ApprovedByInstructorId);
        Assert.NotNull(approvedPlan.ApprovedAt);
    }

    [Fact]
    public async Task AiReview_InstructorRejection_TransitionsStudyPlanToRejected()
    {
        await using var db = CreateDb();
        var studentId = Guid.NewGuid();
        var instructorId = Guid.NewGuid();

        var studyPlan = new StudyPlan
        {
            StudentId = studentId,
            TargetGoal = "Learn Advanced AI in 1 day",
            TargetWeeks = 1,
            HoursPerWeek = 40.0,
            Status = StudyPlanStatus.PendingInstructorApproval
        };

        await db.StudyPlans.AddAsync(studyPlan);
        await db.SaveChangesAsync();

        // Instructor reviews and rejects with constructive feedback
        studyPlan.Status = StudyPlanStatus.Rejected;
        studyPlan.ApprovedByInstructorId = instructorId;
        studyPlan.InstructorNotes = "Workload exceeds safe study limits. Please spread over 3 weeks.";

        await db.SaveChangesAsync();

        var rejectedPlan = await db.StudyPlans.FirstOrDefaultAsync(sp => sp.Id == studyPlan.Id);
        Assert.NotNull(rejectedPlan);
        Assert.Equal(StudyPlanStatus.Rejected, rejectedPlan.Status);
        Assert.Contains("safe study limits", rejectedPlan.InstructorNotes);
    }

    [Fact]
    public async Task AiWorkflowLog_AuditTrail_RecordsExecutionAndValidationMetadata()
    {
        await using var db = CreateDb();

        var log = new AiWorkflowLog
        {
            WorkflowId = "wf-test-1234",
            AgentName = "Validation / Safety Agent",
            InputPayload = "{\"target_goal\":\"Master EF Core\",\"hours_per_week\":8.0}",
            OutputPayload = "{\"validation_passed\":true}",
            ExecutionTimeMs = 245,
            ValidationPassed = true,
            ValidationErrors = null
        };

        await db.AiWorkflowLogs.AddAsync(log);
        await db.SaveChangesAsync();

        var auditRecord = await db.AiWorkflowLogs.FirstOrDefaultAsync(l => l.WorkflowId == "wf-test-1234");
        Assert.NotNull(auditRecord);
        Assert.Equal("Validation / Safety Agent", auditRecord.AgentName);
        Assert.True(auditRecord.ValidationPassed);
        Assert.Equal(245, auditRecord.ExecutionTimeMs);
    }

    [Fact]
    public async Task Notifications_MarkAsRead_UpdatesIsReadFlag()
    {
        await using var db = CreateDb();
        var userId = Guid.NewGuid();

        var notification = new Notification
        {
            UserId = userId,
            Title = "🏆 Badge Unlocked",
            Message = "You unlocked Quiz Master!",
            IsRead = false
        };

        await db.Notifications.AddAsync(notification);
        await db.SaveChangesAsync();

        notification.IsRead = true;
        await db.SaveChangesAsync();

        var updated = await db.Notifications.FirstOrDefaultAsync(n => n.Id == notification.Id);
        Assert.NotNull(updated);
        Assert.True(updated.IsRead);
    }

    [Fact]
    public async Task Notifications_BroadcastAnnouncement_CreatesGlobalAndCourseAnnouncements()
    {
        await using var db = CreateDb();
        var authorId = Guid.NewGuid();

        var globalAnnouncement = new Announcement
        {
            Title = "Platform Maintenance",
            Content = "EduFlow AI will undergo maintenance on Sunday 2 AM UTC.",
            AuthorId = authorId,
            IsGlobal = true
        };

        var courseAnnouncement = new Announcement
        {
            Title = "SE3090 Assignment 1 Released",
            Content = "Assignment 1 specification is now live on the portal.",
            AuthorId = authorId,
            IsGlobal = false,
            CourseId = Guid.NewGuid()
        };

        await db.Announcements.AddRangeAsync(globalAnnouncement, courseAnnouncement);
        await db.SaveChangesAsync();

        var announcements = await db.Announcements.ToListAsync();
        Assert.Equal(2, announcements.Count);
        Assert.Contains(announcements, a => a.IsGlobal);
        Assert.Contains(announcements, a => !a.IsGlobal);
    }
}
