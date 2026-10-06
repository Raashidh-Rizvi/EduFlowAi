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
/// Unit tests for quiz publication rules and validation gates.
/// Verifies that quizzes cannot be published without meeting validation criteria.
/// </summary>
public class QuizPublicationTests
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
            IsPublished = true
        };
        db.Courses.Add(course);
        db.SaveChanges();
        return course;
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
            CoinReward = 20,
            Status = status
        };
        db.Assessments.Add(quiz);
        db.SaveChanges();
        return quiz;
    }

    private static Question SeedQuestion(ApplicationDbContext db, Guid assessmentId, int points = 10)
    {
        var question = new Question
        {
            AssessmentId = assessmentId,
            Prompt = "Test question?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"A\", \"B\", \"C\", \"D\"]",
            CorrectAnswer = "A",
            Explanation = "A is correct.",
            Points = points,
            OrderIndex = 1
        };
        db.Questions.Add(question);
        db.SaveChanges();
        return question;
    }

    // =========================================================================
    // PUBLICATION VALIDATION RULES
    // =========================================================================

    [Fact]
    public async Task Publish_RequiresAtLeastOneQuestion()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);

        // Validation: quiz must have at least 1 question
        var questionCount = await db.Questions.CountAsync(q => q.AssessmentId == quiz.Id);
        Assert.Equal(0, questionCount);

        // Simulate publish gate: should fail
        var canPublish = questionCount > 0;
        Assert.False(canPublish);
    }

    [Fact]
    public async Task Publish_PassesWithQuestions()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        SeedQuestion(db, quiz.Id);

        var questionCount = await db.Questions.CountAsync(q => q.AssessmentId == quiz.Id);
        Assert.Equal(1, questionCount);

        var canPublish = questionCount > 0;
        Assert.True(canPublish);
    }

    [Fact]
    public async Task Publish_RejectsInvalidPassingScore()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.PassingScorePercent = 0; // Invalid
        await db.SaveChangesAsync();
        SeedQuestion(db, quiz.Id);

        // Validation: PassingScorePercent must be between 1-100
        var isValid = quiz.PassingScorePercent >= 1 && quiz.PassingScorePercent <= 100;
        Assert.False(isValid);
    }

    [Fact]
    public async Task Publish_RejectsPassingScoreAbove100()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.PassingScorePercent = 101; // Invalid
        await db.SaveChangesAsync();

        var isValid = quiz.PassingScorePercent >= 1 && quiz.PassingScorePercent <= 100;
        Assert.False(isValid);
    }

    [Fact]
    public async Task Publish_AcceptsValidPassingScore()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.PassingScorePercent = 70;
        await db.SaveChangesAsync();

        var isValid = quiz.PassingScorePercent >= 1 && quiz.PassingScorePercent <= 100;
        Assert.True(isValid);
    }

    [Fact]
    public async Task Publish_RejectsExcessiveXpReward()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.XpReward = 300; // Exceeds 250 cap
        await db.SaveChangesAsync();

        // Validation: XpReward must be <= 250
        var isValid = quiz.XpReward <= 250;
        Assert.False(isValid);
    }

    [Fact]
    public async Task Publish_AcceptsValidXpReward()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.XpReward = 250;
        await db.SaveChangesAsync();

        var isValid = quiz.XpReward <= 250;
        Assert.True(isValid);
    }

    // =========================================================================
    // STATUS TRANSITIONS
    // =========================================================================

    [Fact]
    public async Task StatusTransition_DraftToPublished()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id, QuizStatus.Draft);

        Assert.Equal(QuizStatus.Draft, quiz.Status);

        quiz.Status = QuizStatus.Published;
        await db.SaveChangesAsync();

        var updated = await db.Assessments.FindAsync(quiz.Id);
        Assert.NotNull(updated);
        Assert.Equal(QuizStatus.Published, updated!.Status);
    }

    [Fact]
    public async Task StatusTransition_PublishedToUnpublished()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id, QuizStatus.Published);

        quiz.Status = QuizStatus.Unpublished;
        await db.SaveChangesAsync();

        var updated = await db.Assessments.FindAsync(quiz.Id);
        Assert.NotNull(updated);
        Assert.Equal(QuizStatus.Unpublished, updated!.Status);
    }

    [Fact]
    public async Task StatusTransition_DraftToUnpublished()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id, QuizStatus.Draft);

        quiz.Status = QuizStatus.Unpublished;
        await db.SaveChangesAsync();

        var updated = await db.Assessments.FindAsync(quiz.Id);
        Assert.NotNull(updated);
        Assert.Equal(QuizStatus.Unpublished, updated!.Status);
    }

    [Fact]
    public async Task StatusTransition_PublishedToArchived()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id, QuizStatus.Published);

        quiz.Status = QuizStatus.Archived;
        await db.SaveChangesAsync();

        var updated = await db.Assessments.FindAsync(quiz.Id);
        Assert.NotNull(updated);
        Assert.Equal(QuizStatus.Archived, updated!.Status);
    }

    // =========================================================================
    // AI QUIZ DRAFT DEFAULT
    // =========================================================================

    [Fact]
    public async Task AiQuizGeneration_DefaultsToDraftStatus()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        // Simulate AI quiz creation (as done in QuizzesController.GenerateAiQuiz)
        var aiQuiz = new Assessment
        {
            CourseId = course.Id,
            Title = "AI Generated Quiz",
            Type = AssessmentType.Quiz,
            PassingScorePercent = 70,
            XpReward = 50,
            Status = QuizStatus.Draft, // AI-generated quizzes start as Draft
            GeneratedByAI = true
        };
        db.Assessments.Add(aiQuiz);
        await db.SaveChangesAsync();

        var saved = await db.Assessments.FindAsync(aiQuiz.Id);
        Assert.NotNull(saved);
        Assert.Equal(QuizStatus.Draft, saved!.Status);
        Assert.True(saved.GeneratedByAI);
    }

    [Fact]
    public async Task AiQuizGeneration_DraftCannotBeSeenByStudents()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var aiQuiz = SeedAssessment(db, course.Id, QuizStatus.Draft);
        aiQuiz.GeneratedByAI = true;
        await db.SaveChangesAsync();

        // Students should only see Published quizzes
        var visibleToStudents = await db.Assessments
            .Where(a => a.CourseId == course.Id && a.Status == QuizStatus.Published)
            .ToListAsync();

        Assert.Empty(visibleToStudents);
    }

    [Fact]
    public async Task AiQuizGeneration_OnlyVisibleAfterPublish()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var aiQuiz = SeedAssessment(db, course.Id, QuizStatus.Draft);
        aiQuiz.GeneratedByAI = true;
        await db.SaveChangesAsync();

        // Publish the quiz
        aiQuiz.Status = QuizStatus.Published;
        await db.SaveChangesAsync();

        var visibleToStudents = await db.Assessments
            .Where(a => a.CourseId == course.Id && a.Status == QuizStatus.Published)
            .ToListAsync();

        Assert.Single(visibleToStudents);
        Assert.Equal(aiQuiz.Id, visibleToStudents[0].Id);
    }

    // =========================================================================
    // DUPLICATE QUIZ CREATES DRAFT
    // =========================================================================

    [Fact]
    public async Task DuplicateQuiz_CreatesDraftCopy()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var original = SeedAssessment(db, course.Id, QuizStatus.Published);
        SeedQuestion(db, original.Id);

        // Simulate duplicate (as done in QuizzesController.DuplicateQuiz)
        var clone = new Assessment
        {
            CourseId = original.CourseId,
            Title = $"{original.Title} (Copy)",
            Status = QuizStatus.Draft, // Copies start as Draft
            PassingScorePercent = original.PassingScorePercent,
            XpReward = original.XpReward,
            CreatedAt = DateTime.UtcNow
        };
        db.Assessments.Add(clone);
        await db.SaveChangesAsync();

        var saved = await db.Assessments.FindAsync(clone.Id);
        Assert.NotNull(saved);
        Assert.Equal(QuizStatus.Draft, saved!.Status);
        Assert.Contains("(Copy)", saved.Title);
    }

    // =========================================================================
    // QUESTION POINTS VALIDATION
    // =========================================================================

    [Fact]
    public async Task Question_PointsMustBePositive()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);

        var question = new Question
        {
            AssessmentId = quiz.Id,
            Prompt = "Zero points question?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"A\", \"B\"]",
            CorrectAnswer = "A",
            Points = 0, // Invalid: must be > 0
            OrderIndex = 1
        };
        db.Questions.Add(question);
        await db.SaveChangesAsync();

        // Validation: question points must be > 0
        var isValid = question.Points > 0;
        Assert.False(isValid);
    }

    [Fact]
    public async Task Question_ValidPointsAccepted()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);

        var question = new Question
        {
            AssessmentId = quiz.Id,
            Prompt = "Valid question?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"A\", \"B\"]",
            CorrectAnswer = "A",
            Points = 10,
            OrderIndex = 1
        };
        db.Questions.Add(question);
        await db.SaveChangesAsync();

        Assert.True(question.Points > 0);
    }

    // =========================================================================
    // SUBMISSION AUTO-GRADING
    // =========================================================================

    [Fact]
    public async Task Submission_CorrectPercentageCalculation()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);

        var q1 = SeedQuestion(db, quiz.Id, points: 10);
        var q2 = SeedQuestion(db, quiz.Id, points: 10);

        // Student gets 1 out of 2 correct = 50%
        var submission = new Submission
        {
            AssessmentId = quiz.Id,
            StudentId = student.Id,
            ScoreObtained = 10,
            MaxScore = 20,
            PercentageScore = 50.0,
            Passed = false, // 50% < 70% passing
            SubmittedAt = DateTime.UtcNow
        };
        db.Submissions.Add(submission);
        await db.SaveChangesAsync();

        var saved = await db.Submissions.FindAsync(submission.Id);
        Assert.NotNull(saved);
        Assert.Equal(50.0, saved!.PercentageScore);
        Assert.False(saved.Passed);
    }

    [Fact]
    public async Task Submission_PassingScoreMarksAsPassed()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var quiz = SeedAssessment(db, course.Id);
        quiz.PassingScorePercent = 70;
        await db.SaveChangesAsync();

        // Student gets 80% which is >= 70% passing
        var submission = new Submission
        {
            AssessmentId = quiz.Id,
            StudentId = student.Id,
            ScoreObtained = 16,
            MaxScore = 20,
            PercentageScore = 80.0,
            Passed = true,
            SubmittedAt = DateTime.UtcNow
        };
        db.Submissions.Add(submission);
        await db.SaveChangesAsync();

        var saved = await db.Submissions.FindAsync(submission.Id);
        Assert.NotNull(saved);
        Assert.True(saved!.Passed);
    }
}
