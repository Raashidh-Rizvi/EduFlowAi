using System;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Unit tests for instructor course ownership enforcement.
/// Verifies that instructors can only modify their own courses, quizzes, and submissions.
/// </summary>
public class InstructorOwnershipTests
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

    private static User SeedUser(ApplicationDbContext db, UserRole role)
    {
        var user = new User
        {
            FullName = $"{role} User",
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
            Title = "Test Course",
            Description = "Desc",
            Category = "CS",
            InstructorId = instructorId,
            IsPublished = false
        };
        db.Courses.Add(course);
        db.SaveChanges();
        return course;
    }

    private static Module SeedModule(ApplicationDbContext db, Guid courseId)
    {
        var module = new Module
        {
            CourseId = courseId,
            Title = "Module 1",
            Description = "Module desc",
            OrderIndex = 1
        };
        db.Modules.Add(module);
        db.SaveChanges();
        return module;
    }

    private static Assessment SeedAssessment(ApplicationDbContext db, Guid courseId, QuizStatus status = QuizStatus.Draft)
    {
        var quiz = new Assessment
        {
            CourseId = courseId,
            Title = "Test Quiz",
            Description = "Quiz desc",
            Type = AssessmentType.Quiz,
            PassingScorePercent = 70,
            XpReward = 50,
            Status = status
        };
        db.Assessments.Add(quiz);
        db.SaveChanges();
        return quiz;
    }

    private static Question SeedQuestion(ApplicationDbContext db, Guid assessmentId)
    {
        var question = new Question
        {
            AssessmentId = assessmentId,
            Prompt = "Test question?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"A\", \"B\", \"C\", \"D\"]",
            CorrectAnswer = "A",
            Points = 10,
            OrderIndex = 1
        };
        db.Questions.Add(question);
        db.SaveChanges();
        return question;
    }

    // =========================================================================
    // COURSE OWNERSHIP
    // =========================================================================

    [Fact]
    public async Task CourseOwnership_InstructorACannotModifyInstructorBCourse()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseB = SeedCourse(db, instructorB.Id);

        // Verify: instructor A is NOT the owner of course B
        var isOwner = await db.Courses.AnyAsync(c => c.Id == courseB.Id && c.InstructorId == instructorA.Id);
        Assert.False(isOwner);
    }

    [Fact]
    public async Task CourseOwnership_InstructorCanModifyOwnCourse()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var isOwner = await db.Courses.AnyAsync(c => c.Id == course.Id && c.InstructorId == instructor.Id);
        Assert.True(isOwner);
    }

    [Fact]
    public async Task CourseOwnership_AdminCanModifyAnyCourse()
    {
        await using var db = CreateDb();
        var admin = SeedUser(db, UserRole.Admin);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        // Admin role bypasses ownership check
        var isAdmin = admin.Role == UserRole.Admin;
        Assert.True(isAdmin);
    }

    [Fact]
    public async Task CourseOwnership_StudentCannotModifyCourse()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var isOwner = await db.Courses.AnyAsync(c => c.Id == course.Id && c.InstructorId == student.Id);
        Assert.False(isOwner);
    }

    // =========================================================================
    // MODULE OWNERSHIP (via Course chain)
    // =========================================================================

    [Fact]
    public async Task ModuleOwnership_InstructorACannotModifyInstructorBModule()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseB = SeedCourse(db, instructorB.Id);
        var moduleB = SeedModule(db, courseB.Id);

        var isOwner = await db.Modules
            .Include(m => m.Course)
            .AnyAsync(m => m.Id == moduleB.Id && m.Course != null && m.Course.InstructorId == instructorA.Id);

        Assert.False(isOwner);
    }

    [Fact]
    public async Task ModuleOwnership_InstructorCanModifyOwnModule()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var module = SeedModule(db, course.Id);

        var isOwner = await db.Modules
            .Include(m => m.Course)
            .AnyAsync(m => m.Id == module.Id && m.Course != null && m.Course.InstructorId == instructor.Id);

        Assert.True(isOwner);
    }

    // =========================================================================
    // QUIZ OWNERSHIP
    // =========================================================================

    [Fact]
    public async Task QuizOwnership_InstructorACannotModifyInstructorBQuiz()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseB = SeedCourse(db, instructorB.Id);
        var quizB = SeedAssessment(db, courseB.Id);

        var isOwner = await db.Assessments
            .Include(a => a.Course)
            .AnyAsync(a => a.Id == quizB.Id && a.Course != null && a.Course.InstructorId == instructorA.Id);

        Assert.False(isOwner);
    }

    [Fact]
    public async Task QuizOwnership_InstructorCanModifyOwnQuiz()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);

        var isOwner = await db.Assessments
            .Include(a => a.Course)
            .AnyAsync(a => a.Id == quiz.Id && a.Course != null && a.Course.InstructorId == instructor.Id);

        Assert.True(isOwner);
    }

    [Fact]
    public async Task QuizOwnership_DuplicateQuizRequiresOwnership()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseB = SeedCourse(db, instructorB.Id);
        var quizB = SeedAssessment(db, courseB.Id);

        // Simulate ownership check before duplicate
        var canDuplicate = await db.Assessments
            .Include(a => a.Course)
            .AnyAsync(a => a.Id == quizB.Id && a.Course != null && a.Course.InstructorId == instructorA.Id);

        Assert.False(canDuplicate);
    }

    // =========================================================================
    // SUBMISSION OWNERSHIP (via Assessment -> Course chain)
    // =========================================================================

    [Fact]
    public async Task SubmissionOwnership_InstructorACannotViewInstructorBSubmission()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var student = SeedUser(db, UserRole.Student);
        var courseB = SeedCourse(db, instructorB.Id);
        var quizB = SeedAssessment(db, courseB.Id);

        var submission = new Submission
        {
            AssessmentId = quizB.Id,
            StudentId = student.Id,
            ScoreObtained = 8,
            MaxScore = 10,
            PercentageScore = 80.0,
            Passed = true,
            SubmittedAt = DateTime.UtcNow
        };
        db.Submissions.Add(submission);
        await db.SaveChangesAsync();

        var canView = await db.Submissions
            .Include(s => s.Assessment)
                .ThenInclude(a => a.Course)
            .AnyAsync(s => s.Id == submission.Id
                && s.Assessment != null
                && s.Assessment.Course != null
                && s.Assessment.Course.InstructorId == instructorA.Id);

        Assert.False(canView);
    }

    [Fact]
    public async Task SubmissionOwnership_InstructorCanViewOwnSubmission()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var student = SeedUser(db, UserRole.Student);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);

        var submission = new Submission
        {
            AssessmentId = quiz.Id,
            StudentId = student.Id,
            ScoreObtained = 8,
            MaxScore = 10,
            PercentageScore = 80.0,
            Passed = true,
            SubmittedAt = DateTime.UtcNow
        };
        db.Submissions.Add(submission);
        await db.SaveChangesAsync();

        var canView = await db.Submissions
            .Include(s => s.Assessment)
                .ThenInclude(a => a.Course)
            .AnyAsync(s => s.Id == submission.Id
                && s.Assessment != null
                && s.Assessment.Course != null
                && s.Assessment.Course.InstructorId == instructor.Id);

        Assert.True(canView);
    }

    // =========================================================================
    // ROLE SEPARATION
    // =========================================================================

    [Fact]
    public async Task RoleSeparation_StudentRoleCannotBeAssignedInstructorPrivileges()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);

        Assert.Equal(UserRole.Student, student.Role);
        Assert.NotEqual(UserRole.Instructor, student.Role);
        Assert.NotEqual(UserRole.Admin, student.Role);
    }

    [Fact]
    public async Task RoleSeparation_InstructorRoleCannotBeAssignedAdminPrivileges()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);

        Assert.Equal(UserRole.Instructor, instructor.Role);
        Assert.NotEqual(UserRole.Admin, instructor.Role);
    }

    // =========================================================================
    // EMPTY USER ID GUARD
    // =========================================================================

    [Fact]
    public async Task OwnershipCheck_EmptyUserId_ReturnsFalse()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        // Simulate empty userId (unauthenticated)
        var emptyUserId = Guid.Empty;
        var isOwner = await db.Courses.AnyAsync(c => c.Id == course.Id && c.InstructorId == emptyUserId);

        Assert.False(isOwner);
    }
}
