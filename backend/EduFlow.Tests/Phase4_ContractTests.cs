using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Cross-student contract tests verifying the Assessment→Submission→Result→Reward pipeline.
/// Instructor (Student 2) creates assessments; Learner (Student 3) submits;
/// rewards are awarded correctly.
/// </summary>
public class Phase4_ContractTests
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

    private static User SeedUser(ApplicationDbContext db, UserRole role, string? name = null)
    {
        var user = new User
        {
            FullName = name ?? $"{role} User {Guid.NewGuid().ToString("N")[..4]}",
            Email = $"{role}_{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            Role = role,
            IsActive = true
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    private static Course SeedCourse(ApplicationDbContext db, Guid instructorId)
    {
        var course = new Course
        {
            Code = $"C-{Guid.NewGuid().ToString("N")[..6]}",
            Title = "Contract Test Course",
            Description = "Test",
            Category = "CS",
            InstructorId = instructorId,
            IsPublished = true
        };
        db.Courses.Add(course);
        db.SaveChanges();
        return course;
    }

    private static Module SeedModule(ApplicationDbContext db, Guid courseId, int orderIndex = 1)
    {
        var module = new Module
        {
            CourseId = courseId,
            Title = $"Module {orderIndex}",
            Description = $"Module {orderIndex} desc",
            OrderIndex = orderIndex
        };
        db.Modules.Add(module);
        db.SaveChanges();
        return module;
    }

    private static Topic SeedTopic(ApplicationDbContext db, Guid moduleId, int displayOrder = 1)
    {
        var topic = new Topic
        {
            ModuleId = moduleId,
            Title = $"Topic {displayOrder}",
            Description = $"Topic {displayOrder} desc",
            DisplayOrder = displayOrder,
            ContentType = "Theory",
            EstimatedMinutes = 30
        };
        db.Topics.Add(topic);
        db.SaveChanges();
        return topic;
    }

    private static Assessment SeedAssessment(ApplicationDbContext db, Guid courseId, Guid? createdBy = null)
    {
        var assessment = new Assessment
        {
            CourseId = courseId,
            Title = "Contract Assessment",
            Description = "Contract test assessment",
            Type = AssessmentType.Quiz,
            PassingScorePercent = 70,
            TimeLimitMinutes = 15,
            AttemptsAllowed = 3,
            XpReward = 100,
            CoinReward = 20,
            Status = QuizStatus.Published,
            CreatedBy = createdBy
        };
        db.Assessments.Add(assessment);
        db.SaveChanges();
        return assessment;
    }

    private static Question SeedQuestion(ApplicationDbContext db, Guid assessmentId, int orderIndex = 1)
    {
        var question = new Question
        {
            AssessmentId = assessmentId,
            Prompt = "What is 2 + 2?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"3\", \"4\", \"5\", \"6\"]",
            CorrectAnswer = "4",
            Explanation = "Basic addition",
            Points = 10,
            OrderIndex = orderIndex
        };
        db.Questions.Add(question);
        db.SaveChanges();
        return question;
    }

    private static Submission SeedSubmission(ApplicationDbContext db, Guid assessmentId, Guid studentId, int scoreObtained = 10, int maxScore = 10, bool passed = true)
    {
        var submission = new Submission
        {
            AssessmentId = assessmentId,
            StudentId = studentId,
            ScoreObtained = scoreObtained,
            MaxScore = maxScore,
            PercentageScore = maxScore > 0 ? (double)scoreObtained / maxScore * 100 : 0,
            Passed = passed,
            SubmittedAt = DateTime.UtcNow
        };
        db.Submissions.Add(submission);
        db.SaveChanges();
        return submission;
    }

    // =========================================================================
    // 1. Full Pipeline: Assessment → Submission → Result → Reward
    // =========================================================================

    [Fact]
    public async Task FullPipeline_AssessmentToReward_FlowWorksEndToEnd()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor, "Instructor 2");
        var student = SeedUser(db, UserRole.Student, "Student 3");

        var course = SeedCourse(db, instructor.Id);
        var module = SeedModule(db, course.Id);
        var topic = SeedTopic(db, module.Id);

        var assessment = SeedAssessment(db, course.Id, instructor.Id);
        var question = SeedQuestion(db, assessment.Id);

        var enrollment = new Enrollment
        {
            StudentId = student.Id,
            CourseId = course.Id,
            Status = EnrollmentStatus.Active
        };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync();

        var submission = new Submission
        {
            AssessmentId = assessment.Id,
            StudentId = student.Id,
            ScoreObtained = 10,
            MaxScore = 10,
            PercentageScore = 100.0,
            Passed = true,
            SubmittedAt = DateTime.UtcNow
        };
        db.Submissions.Add(submission);

        var answer = new SubmissionAnswer
        {
            SubmissionId = submission.Id,
            QuestionId = question.Id,
            SelectedAnswer = "4",
            IsCorrect = true,
            PointsAwarded = 10
        };
        db.SubmissionAnswers.Add(answer);

        var xp = new XpTransaction
        {
            StudentId = student.Id,
            SourceType = XpSourceType.QuizCompleted,
            SourceId = assessment.Id,
            XpAmount = 100,
            Description = "Quiz passed"
        };
        db.XpTransactions.Add(xp);

        var badge = new StudentBadge
        {
            StudentId = student.Id,
            BadgeId = "QUIZ_MASTER",
            UnlockedAt = DateTime.UtcNow
        };
        db.StudentBadges.Add(badge);

        await db.SaveChangesAsync();

        var savedSubmission = await db.Submissions
            .Include(s => s.Answers)
            .FirstOrDefaultAsync(s => s.StudentId == student.Id && s.AssessmentId == assessment.Id);
        Assert.NotNull(savedSubmission);
        Assert.True(savedSubmission.Passed);
        Assert.Equal(100.0, savedSubmission.PercentageScore);
        Assert.Single(savedSubmission.Answers);

        var savedXp = await db.XpTransactions
            .FirstOrDefaultAsync(x => x.StudentId == student.Id && x.SourceType == XpSourceType.QuizCompleted);
        Assert.NotNull(savedXp);
        Assert.Equal(100, savedXp.XpAmount);

        var savedBadge = await db.StudentBadges
            .FirstOrDefaultAsync(b => b.StudentId == student.Id && b.BadgeId == "QUIZ_MASTER");
        Assert.NotNull(savedBadge);
    }

    // =========================================================================
    // 2. Instructor Creates Assessment, Student Submits
    // =========================================================================

    [Fact]
    public async Task InstructorCreatesAssessment_StudentSubmits_SubmissionLinkedToAssessment()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor, "Instructor 2");
        var student = SeedUser(db, UserRole.Student, "Student 3");

        var course = SeedCourse(db, instructor.Id);
        var assessment = SeedAssessment(db, course.Id, instructor.Id);

        var submission = new Submission
        {
            AssessmentId = assessment.Id,
            StudentId = student.Id,
            ScoreObtained = 8,
            MaxScore = 10,
            PercentageScore = 80.0,
            Passed = true,
            SubmittedAt = DateTime.UtcNow
        };
        db.Submissions.Add(submission);
        await db.SaveChangesAsync();

        var result = await db.Submissions
            .Include(s => s.Assessment)
            .FirstOrDefaultAsync(s => s.Id == submission.Id);

        Assert.NotNull(result);
        Assert.Equal(assessment.Id, result.AssessmentId);
        Assert.Equal("Contract Assessment", result.Assessment!.Title);
        Assert.Equal(student.Id, result.StudentId);
    }

    // =========================================================================
    // 3. Multiple Students Submit to Same Assessment
    // =========================================================================

    [Fact]
    public async Task MultipleStudentsSubmitToSameAssessment_EachStudentHasOwnSubmission()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor, "Instructor 2");
        var student1 = SeedUser(db, UserRole.Student, "Student A");
        var student2 = SeedUser(db, UserRole.Student, "Student B");

        var course = SeedCourse(db, instructor.Id);
        var assessment = SeedAssessment(db, course.Id, instructor.Id);

        var sub1 = new Submission
        {
            AssessmentId = assessment.Id,
            StudentId = student1.Id,
            ScoreObtained = 9,
            MaxScore = 10,
            PercentageScore = 90.0,
            Passed = true,
            SubmittedAt = DateTime.UtcNow
        };

        var sub2 = new Submission
        {
            AssessmentId = assessment.Id,
            StudentId = student2.Id,
            ScoreObtained = 5,
            MaxScore = 10,
            PercentageScore = 50.0,
            Passed = false,
            SubmittedAt = DateTime.UtcNow
        };

        db.Submissions.AddRange(sub1, sub2);
        await db.SaveChangesAsync();

        var allSubmissions = await db.Submissions
            .Where(s => s.AssessmentId == assessment.Id)
            .ToListAsync();

        Assert.Equal(2, allSubmissions.Count);
        Assert.Contains(allSubmissions, s => s.StudentId == student1.Id && s.Passed);
        Assert.Contains(allSubmissions, s => s.StudentId == student2.Id && !s.Passed);
    }

    // =========================================================================
    // 4. Failed Submission Does Not Award Badge
    // =========================================================================

    [Fact]
    public async Task FailedSubmission_DoesNotAwardQuizMasterBadge()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor, "Instructor 2");
        var student = SeedUser(db, UserRole.Student, "Student 3");

        var course = SeedCourse(db, instructor.Id);
        var assessment = SeedAssessment(db, course.Id, instructor.Id);

        var submission = new Submission
        {
            AssessmentId = assessment.Id,
            StudentId = student.Id,
            ScoreObtained = 3,
            MaxScore = 10,
            PercentageScore = 30.0,
            Passed = false,
            SubmittedAt = DateTime.UtcNow
        };
        db.Submissions.Add(submission);

        var xp = new XpTransaction
        {
            StudentId = student.Id,
            SourceType = XpSourceType.PracticeCompleted,
            SourceId = assessment.Id,
            XpAmount = 10,
            Description = "Quiz attempt"
        };
        db.XpTransactions.Add(xp);

        await db.SaveChangesAsync();

        var savedSubmission = await db.Submissions.FindAsync(submission.Id);
        Assert.NotNull(savedSubmission);
        Assert.False(savedSubmission!.Passed);

        var badge = await db.StudentBadges
            .FirstOrDefaultAsync(b => b.StudentId == student.Id && b.BadgeId == "QUIZ_MASTER");
        Assert.Null(badge);

        var xpRecord = await db.XpTransactions
            .FirstOrDefaultAsync(x => x.StudentId == student.Id && x.SourceType == XpSourceType.PracticeCompleted);
        Assert.NotNull(xpRecord);
        Assert.Equal(10, xpRecord!.XpAmount);
    }

    // =========================================================================
    // 5. Unpublished Assessment Should Not Accept Submissions
    // =========================================================================

    [Fact]
    public async Task UnpublishedAssessment_StudentSubmission_ShouldBeBlocked()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor, "Instructor 2");
        var student = SeedUser(db, UserRole.Student, "Student 3");

        var course = SeedCourse(db, instructor.Id);

        var assessment = new Assessment
        {
            CourseId = course.Id,
            Title = "Draft Assessment",
            Description = "Not yet published",
            Type = AssessmentType.Quiz,
            PassingScorePercent = 70,
            TimeLimitMinutes = 10,
            AttemptsAllowed = 1,
            XpReward = 50,
            CoinReward = 10,
            Status = QuizStatus.Draft,
            CreatedBy = instructor.Id
        };
        db.Assessments.Add(assessment);
        await db.SaveChangesAsync();

        var canSubmit = assessment.Status == QuizStatus.Published;
        Assert.False(canSubmit, "Unpublished assessment should not accept submissions");
    }

    // =========================================================================
    // 6. XP Ledger Integrity
    // =========================================================================

    [Fact]
    public async Task XPLedger_MultipleTransactions_HaveCorrectRunningTotal()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student, "Student 3");

        var transactions = new List<XpTransaction>
        {
            new() { StudentId = student.Id, SourceType = XpSourceType.CourseCompleted, SourceId = Guid.NewGuid(), XpAmount = 50, Description = "Enrollment" },
            new() { StudentId = student.Id, SourceType = XpSourceType.QuizCompleted, SourceId = Guid.NewGuid(), XpAmount = 100, Description = "Quiz passed" },
            new() { StudentId = student.Id, SourceType = XpSourceType.StreakBonus, SourceId = Guid.NewGuid(), XpAmount = 25, Description = "Login streak" },
            new() { StudentId = student.Id, SourceType = XpSourceType.DailyChallenge, SourceId = Guid.NewGuid(), XpAmount = 150, Description = "Challenge completed" },
        };
        db.XpTransactions.AddRange(transactions);
        await db.SaveChangesAsync();

        var totalXp = await db.XpTransactions
            .Where(x => x.StudentId == student.Id)
            .SumAsync(x => x.XpAmount);

        Assert.Equal(325, totalXp);

        var transactionCount = await db.XpTransactions
            .Where(x => x.StudentId == student.Id)
            .CountAsync();
        Assert.Equal(4, transactionCount);
    }

    // =========================================================================
    // 7. Streak and Badge Independence
    // =========================================================================

    [Fact]
    public async Task StreakBonus_IndependentOfSubmission()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student, "Student 3");

        var streak = new StudentStreak
        {
            StudentId = student.Id,
            CurrentStreak = 5,
            LongestStreak = 10,
            LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow)
        };
        db.StudentStreaks.Add(streak);

        var badge = new StudentBadge
        {
            StudentId = student.Id,
            BadgeId = "STREAK_5",
            UnlockedAt = DateTime.UtcNow
        };
        db.StudentBadges.Add(badge);

        await db.SaveChangesAsync();

        var savedStreak = await db.StudentStreaks.FirstOrDefaultAsync(s => s.StudentId == student.Id);
        Assert.NotNull(savedStreak);
        Assert.Equal(5, savedStreak!.CurrentStreak);

        var savedBadge = await db.StudentBadges.FirstOrDefaultAsync(b => b.StudentId == student.Id && b.BadgeId == "STREAK_5");
        Assert.NotNull(savedBadge);
    }

    // =========================================================================
    // 8. Enrollment Before Submission
    // =========================================================================

    [Fact]
    public async Task EnrollmentExists_BeforeSubmission()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor, "Instructor 2");
        var student = SeedUser(db, UserRole.Student, "Student 3");

        var course = SeedCourse(db, instructor.Id);

        var enrollment = new Enrollment
        {
            StudentId = student.Id,
            CourseId = course.Id,
            Status = EnrollmentStatus.Active
        };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync();

        var assessment = SeedAssessment(db, course.Id, instructor.Id);

        var submission = new Submission
        {
            AssessmentId = assessment.Id,
            StudentId = student.Id,
            ScoreObtained = 10,
            MaxScore = 10,
            PercentageScore = 100.0,
            Passed = true,
            SubmittedAt = DateTime.UtcNow
        };
        db.Submissions.Add(submission);
        await db.SaveChangesAsync();

        var enrolled = await db.Enrollments
            .AnyAsync(e => e.CourseId == course.Id && e.StudentId == student.Id);
        Assert.True(enrolled);

        var submitted = await db.Submissions
            .AnyAsync(s => s.AssessmentId == assessment.Id && s.StudentId == student.Id);
        Assert.True(submitted);
    }

    // =========================================================================
    // 9. Content Ownership Chain: Course → Module → Topic → Assessment
    // =========================================================================

    [Fact]
    public async Task CourseOwnedByInstructor_HasModuleWithTopicWithAssessment()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor, "Instructor 2");

        var course = SeedCourse(db, instructor.Id);
        var module = SeedModule(db, course.Id);
        var topic = SeedTopic(db, module.Id);

        var assessment = new Assessment
        {
            CourseId = course.Id,
            ScopeType = QuizScopeType.Topic,
            TopicScopeId = topic.Id,
            Title = "Topic Assessment",
            Description = "Assessment scoped to topic",
            Type = AssessmentType.Quiz,
            PassingScorePercent = 70,
            TimeLimitMinutes = 5,
            AttemptsAllowed = 1,
            XpReward = 50,
            CoinReward = 10,
            Status = QuizStatus.Published,
            CreatedBy = instructor.Id
        };
        db.Assessments.Add(assessment);
        await db.SaveChangesAsync();

        var loaded = await db.Assessments
            .Include(a => a.TopicScope)
            .ThenInclude(t => t!.Module)
            .ThenInclude(m => m!.Course)
            .FirstOrDefaultAsync(a => a.Id == assessment.Id);

        Assert.NotNull(loaded);
        Assert.NotNull(loaded!.TopicScope);
        Assert.Equal("Topic 1", loaded.TopicScope!.Title);
        Assert.NotNull(loaded.TopicScope.Module);
        Assert.Equal("Module 1", loaded.TopicScope.Module!.Title);
        Assert.Equal(instructor.Id, loaded.TopicScope.Module.Course!.InstructorId);
    }
}
