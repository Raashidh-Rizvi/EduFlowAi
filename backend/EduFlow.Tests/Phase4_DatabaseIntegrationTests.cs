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
/// Phase 4 Database Integration Tests — EF Core behaviors (FK enforcement,
/// cascade deletes, hierarchy traversal, seed data, gamification entities)
/// using the InMemory provider to validate patterns that apply to PostgreSQL.
/// </summary>
public class Phase4_DatabaseIntegrationTests
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
            Title = "Integration Test Course",
            Description = "Integration test",
            InstructorId = instructorId,
            IsPublished = true
        };
        db.Courses.Add(course);
        db.SaveChanges();
        return course;
    }

    private static Assessment SeedAssessment(ApplicationDbContext db, Guid courseId)
    {
        var assessment = new Assessment
        {
            CourseId = courseId,
            Title = "Test Assessment",
            Description = "Assessment desc",
            Type = AssessmentType.Quiz,
            PassingScorePercent = 70,
            XpReward = 50,
            CoinReward = 20,
            Status = QuizStatus.Published
        };
        db.Assessments.Add(assessment);
        db.SaveChanges();
        return assessment;
    }

    private static Question SeedQuestion(ApplicationDbContext db, Guid assessmentId)
    {
        var question = new Question
        {
            AssessmentId = assessmentId,
            Prompt = "Test question?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"A\", \"B\", \"C\"]",
            CorrectAnswer = "A",
            Explanation = "A is correct.",
            Points = 10,
            OrderIndex = 1
        };
        db.Questions.Add(question);
        db.SaveChanges();
        return question;
    }

    private static Submission SeedSubmission(ApplicationDbContext db, Guid assessmentId, Guid studentId)
    {
        var submission = new Submission
        {
            AssessmentId = assessmentId,
            StudentId = studentId,
            PercentageScore = 80,
            Passed = true,
            SubmittedAt = DateTime.UtcNow
        };
        db.Submissions.Add(submission);
        db.SaveChanges();
        return submission;
    }

    // =========================================================================
    // 1. FK_Course_To_Instructor_Enforced
    // =========================================================================

    [Fact]
    public async Task FK_Course_To_Instructor_Enforced()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var loaded = await db.Courses
            .Include(c => c.Instructor)
            .FirstAsync(c => c.Id == course.Id);

        Assert.NotNull(loaded.Instructor);
        Assert.Equal(instructor.Id, loaded.InstructorId);
        Assert.Equal(UserRole.Instructor, loaded.Instructor!.Role);
    }

    // =========================================================================
    // 2. FK_Module_To_Course_CascadeDelete
    // =========================================================================

    [Fact]
    public async Task FK_Module_To_Course_CascadeDelete()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var module = new Module
        {
            CourseId = course.Id,
            Title = "Module to be cascade-deleted",
            Description = "Will go with course",
            OrderIndex = 1
        };
        db.Modules.Add(module);
        await db.SaveChangesAsync();

        db.Courses.Remove(course);
        await db.SaveChangesAsync();

        var orphan = await db.Modules.FindAsync(module.Id);
        Assert.Null(orphan);
    }

    // =========================================================================
    // 3. FK_Lesson_To_Module_CascadeDelete
    // =========================================================================

    [Fact]
    public async Task FK_Lesson_To_Module_CascadeDelete()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var module = new Module
        {
            CourseId = course.Id,
            Title = "Module with lesson",
            Description = "Desc",
            OrderIndex = 1
        };
        db.Modules.Add(module);
        await db.SaveChangesAsync();

        var lesson = new ContentItem
        {
            ModuleId = module.Id,
            Title = "Lesson to be cascade-deleted",
            Content = "Content",
            DisplayOrder = 1
        };
        db.ContentItems.Add(lesson);
        await db.SaveChangesAsync();

        db.Modules.Remove(module);
        await db.SaveChangesAsync();

        var orphan = await db.ContentItems.FindAsync(lesson.Id);
        Assert.Null(orphan);
    }

    // =========================================================================
    // 4. FK_Topic_To_Module_CascadeDelete
    // =========================================================================

    [Fact]
    public async Task FK_Topic_To_Module_CascadeDelete()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var module = new Module
        {
            CourseId = course.Id,
            Title = "Module with topic",
            Description = "Desc",
            OrderIndex = 1
        };
        db.Modules.Add(module);
        await db.SaveChangesAsync();

        var topic = new Topic
        {
            ModuleId = module.Id,
            Title = "Topic to be cascade-deleted",
            Description = "Desc",
            DisplayOrder = 1
        };
        db.Topics.Add(topic);
        await db.SaveChangesAsync();

        db.Modules.Remove(module);
        await db.SaveChangesAsync();

        var orphan = await db.Topics.FindAsync(topic.Id);
        Assert.Null(orphan);
    }

    // =========================================================================
    // 5. FK_ContentItem_To_Module_CascadeDelete
    // =========================================================================

    [Fact]
    public async Task FK_ContentItem_To_Module_CascadeDelete()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var module = new Module
        {
            CourseId = course.Id,
            Title = "Module with content",
            Description = "Desc",
            OrderIndex = 1
        };
        db.Modules.Add(module);
        await db.SaveChangesAsync();

        var contentItem = new ContentItem
        {
            ModuleId = module.Id,
            Title = "ContentItem to be cascade-deleted",
            Content = "Content",
            DisplayOrder = 1
        };
        db.ContentItems.Add(contentItem);
        await db.SaveChangesAsync();

        db.Modules.Remove(module);
        await db.SaveChangesAsync();

        var orphan = await db.ContentItems.FindAsync(contentItem.Id);
        Assert.Null(orphan);
    }

    // =========================================================================
    // 6. FK_Assessment_To_Course_CascadeDelete
    // =========================================================================

    [Fact]
    public async Task FK_Assessment_To_Course_CascadeDelete()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var assessment = SeedAssessment(db, course.Id);

        db.Courses.Remove(course);
        await db.SaveChangesAsync();

        var orphan = await db.Assessments.FindAsync(assessment.Id);
        Assert.Null(orphan);
    }

    // =========================================================================
    // 7. FK_Submission_To_Assessment_Preserved
    //    Assessment -> Submission is Restrict: academic history blocks deleting
    //    the assessment instead of being silently cascaded away.
    // =========================================================================

    [Fact]
    public async Task FK_Submission_To_Assessment_Preserved()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var assessment = SeedAssessment(db, course.Id);
        var submission = SeedSubmission(db, assessment.Id, student.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            db.Assessments.Remove(assessment);
            await db.SaveChangesAsync();
        });

        db.ChangeTracker.Clear();
        Assert.NotNull(await db.Submissions.FindAsync(submission.Id));
        Assert.NotNull(await db.Assessments.FindAsync(assessment.Id));
    }

    // =========================================================================
    // 8. FK_SubmissionAnswer_To_Submission_CascadeDelete
    // =========================================================================

    [Fact]
    public async Task FK_SubmissionAnswer_To_Submission_CascadeDelete()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var assessment = SeedAssessment(db, course.Id);
        var question = SeedQuestion(db, assessment.Id);
        var submission = SeedSubmission(db, assessment.Id, student.Id);

        var answer = new SubmissionAnswer
        {
            SubmissionId = submission.Id,
            QuestionId = question.Id,
            SelectedAnswer = "A",
            IsCorrect = true,
            PointsAwarded = 10
        };
        db.SubmissionAnswers.Add(answer);
        await db.SaveChangesAsync();

        db.Submissions.Remove(submission);
        await db.SaveChangesAsync();

        var orphan = await db.SubmissionAnswers.FindAsync(answer.Id);
        Assert.Null(orphan);
    }

    // =========================================================================
    // 9. FK_Question_To_Assessment_CascadeDelete
    // =========================================================================

    [Fact]
    public async Task FK_Question_To_Assessment_CascadeDelete()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var assessment = SeedAssessment(db, course.Id);
        var question = SeedQuestion(db, assessment.Id);

        db.Assessments.Remove(assessment);
        await db.SaveChangesAsync();

        var orphan = await db.Questions.FindAsync(question.Id);
        Assert.Null(orphan);
    }

    // =========================================================================
    // 10. Assessment_Hierarchy_CourseToQuestions
    // =========================================================================

    [Fact]
    public async Task Assessment_Hierarchy_CourseToQuestions()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var assessment = SeedAssessment(db, course.Id);
        var q1 = SeedQuestion(db, assessment.Id);

        var q2 = new Question
        {
            AssessmentId = assessment.Id,
            Prompt = "Second question?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"X\", \"Y\"]",
            CorrectAnswer = "Y",
            Points = 10,
            OrderIndex = 2
        };
        db.Questions.Add(q2);
        await db.SaveChangesAsync();

        var loaded = await db.Assessments
            .Include(a => a.Questions)
            .FirstAsync(a => a.Id == assessment.Id);

        Assert.Equal(2, loaded.Questions.Count);
        Assert.Contains(loaded.Questions, q => q.Id == q1.Id);
        Assert.Contains(loaded.Questions, q => q.Id == q2.Id);
    }

    // =========================================================================
    // 11. Submission_Hierarchy_AssessmentToAnswers
    // =========================================================================

    [Fact]
    public async Task Submission_Hierarchy_AssessmentToAnswers()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var assessment = SeedAssessment(db, course.Id);
        var q1 = SeedQuestion(db, assessment.Id);
        var submission = SeedSubmission(db, assessment.Id, student.Id);

        var a1 = new SubmissionAnswer
        {
            SubmissionId = submission.Id,
            QuestionId = q1.Id,
            SelectedAnswer = "A",
            IsCorrect = true,
            PointsAwarded = 10
        };
        var a2 = new SubmissionAnswer
        {
            SubmissionId = submission.Id,
            QuestionId = q1.Id,
            SelectedAnswer = "B",
            IsCorrect = false,
            PointsAwarded = 0
        };
        db.SubmissionAnswers.AddRange(a1, a2);
        await db.SaveChangesAsync();

        var loaded = await db.Submissions
            .Include(s => s.Answers)
            .FirstAsync(s => s.Id == submission.Id);

        Assert.Equal(2, loaded.Answers.Count);
    }

    // =========================================================================
    // 12. Course_Hierarchy_Full — Course -> Modules -> Topics -> ContentItems
    // =========================================================================

    [Fact]
    public async Task Course_Hierarchy_Full()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var module = new Module
        {
            CourseId = course.Id,
            Title = "Full Hierarchy Module",
            Description = "Desc",
            OrderIndex = 1
        };
        db.Modules.Add(module);
        await db.SaveChangesAsync();

        var topic = new Topic
        {
            ModuleId = module.Id,
            Title = "Full Hierarchy Topic",
            Description = "Desc",
            DisplayOrder = 1
        };
        db.Topics.Add(topic);
        await db.SaveChangesAsync();

        var contentItem = new ContentItem
        {
            ModuleId = module.Id,
            TopicId = topic.Id,
            Title = "Full Hierarchy ContentItem",
            Content = "Content",
            DisplayOrder = 1
        };
        db.ContentItems.Add(contentItem);
        await db.SaveChangesAsync();

        var assessment = SeedAssessment(db, course.Id);

        var loaded = await db.Courses
            .Include(c => c.Modules)
                .ThenInclude(m => m.Topics)
                    .ThenInclude(t => t.ContentItems)
            .Include(c => c.Assessments)
            .FirstAsync(c => c.Id == course.Id);

        Assert.Single(loaded.Modules);
        var modules = loaded.Modules.ToList();
        var topics = modules[0].Topics.ToList();
        Assert.Single(topics);
        var contentItems = topics[0].ContentItems.ToList();
        Assert.Single(contentItems);
        Assert.Equal("Full Hierarchy ContentItem", contentItems[0].Title);
        Assert.Single(loaded.Assessments);
    }

    // =========================================================================
    // 13. MultipleInstructors_IndependentCourses
    // =========================================================================

    [Fact]
    public async Task MultipleInstructors_IndependentCourses()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor, "Instructor A");
        var instructorB = SeedUser(db, UserRole.Instructor, "Instructor B");

        var courseA = SeedCourse(db, instructorA.Id);
        var courseB = SeedCourse(db, instructorB.Id);

        var loadedA = await db.Courses.Include(c => c.Instructor).FirstAsync(c => c.Id == courseA.Id);
        var loadedB = await db.Courses.Include(c => c.Instructor).FirstAsync(c => c.Id == courseB.Id);

        Assert.Equal(instructorA.Id, loadedA.InstructorId);
        Assert.Equal(instructorB.Id, loadedB.InstructorId);
        Assert.NotEqual(loadedA.InstructorId, loadedB.InstructorId);
    }

    // =========================================================================
    // 14. Enrollment_HandlesMultipleStudents
    // =========================================================================

    [Fact]
    public async Task Enrollment_HandlesMultipleStudents()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var student1 = SeedUser(db, UserRole.Student, "Student 1");
        var student2 = SeedUser(db, UserRole.Student, "Student 2");
        var student3 = SeedUser(db, UserRole.Student, "Student 3");

        db.Enrollments.AddRange(
            new Enrollment { StudentId = student1.Id, CourseId = course.Id, Status = EnrollmentStatus.Active },
            new Enrollment { StudentId = student2.Id, CourseId = course.Id, Status = EnrollmentStatus.Active },
            new Enrollment { StudentId = student3.Id, CourseId = course.Id, Status = EnrollmentStatus.Active }
        );
        await db.SaveChangesAsync();

        var enrollments = await db.Enrollments
            .Where(e => e.CourseId == course.Id && e.Status == EnrollmentStatus.Active)
            .ToListAsync();

        Assert.Equal(3, enrollments.Count);
        Assert.Contains(enrollments, e => e.StudentId == student1.Id);
        Assert.Contains(enrollments, e => e.StudentId == student2.Id);
        Assert.Contains(enrollments, e => e.StudentId == student3.Id);
    }

    // =========================================================================
    // 15. StudentXp_CanBeCreatedAndUpdated
    // =========================================================================

    [Fact]
    public async Task StudentXp_CanBeCreatedAndUpdated()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);

        var xp = new StudentXp
        {
            StudentId = student.Id,
            TotalXp = 0,
            CurrentLevel = 1,
            Coins = 0
        };
        db.StudentXp.Add(xp);
        await db.SaveChangesAsync();

        var loaded = await db.StudentXp.FindAsync(student.Id);
        Assert.NotNull(loaded);
        Assert.Equal(0, loaded.TotalXp);
        Assert.Equal(1, loaded.CurrentLevel);

        loaded.TotalXp = 500;
        loaded.CurrentLevel = 3;
        loaded.Coins = 150;
        await db.SaveChangesAsync();

        var updated = await db.StudentXp.FindAsync(student.Id);
        Assert.NotNull(updated);
        Assert.Equal(500, updated!.TotalXp);
        Assert.Equal(3, updated.CurrentLevel);
        Assert.Equal(150, updated.Coins);
    }

    // =========================================================================
    // 16. StudentStreak_CanBeCreatedAndUpdated
    // =========================================================================

    [Fact]
    public async Task StudentStreak_CanBeCreatedAndUpdated()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);

        var streak = new StudentStreak
        {
            StudentId = student.Id,
            CurrentStreak = 0,
            LongestStreak = 0,
            FreezeTokensAvailable = 2
        };
        db.StudentStreaks.Add(streak);
        await db.SaveChangesAsync();

        var loaded = await db.StudentStreaks.FindAsync(student.Id);
        Assert.NotNull(loaded);
        Assert.Equal(0, loaded.CurrentStreak);

        loaded.CurrentStreak = 7;
        loaded.LongestStreak = 7;
        loaded.LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow);
        await db.SaveChangesAsync();

        var updated = await db.StudentStreaks.FindAsync(student.Id);
        Assert.NotNull(updated);
        Assert.Equal(7, updated!.CurrentStreak);
        Assert.Equal(7, updated.LongestStreak);
    }

    // =========================================================================
    // 17. SeedData_ContainsNoDemoAccounts
    //     Demo accounts are created only by the Development seeder, never by the
    //     EF model/migrations, so no other environment receives them.
    // =========================================================================

    [Fact]
    public async Task SeedData_ContainsNoDemoAccounts()
    {
        await using var db = CreateDb();

        Assert.False(await db.Users.AnyAsync());
        Assert.False(await db.StudentXp.AnyAsync());
        Assert.False(await db.StudentStreaks.AnyAsync());

        // Reference data (level curve, badge catalogue) is still part of the model.
        Assert.True(await db.Levels.AnyAsync());
        Assert.True(await db.Badges.AnyAsync());
    }

    // =========================================================================
    // 18. Badge_CanBeAssignedToStudent
    // =========================================================================

    [Fact]
    public async Task Badge_CanBeAssignedToStudent()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);

        var badge = await db.Badges.FindAsync("FIRST_LESSON");
        Assert.NotNull(badge);

        var studentBadge = new StudentBadge
        {
            StudentId = student.Id,
            BadgeId = badge!.Id,
            UnlockedAt = DateTime.UtcNow
        };
        db.StudentBadges.Add(studentBadge);
        await db.SaveChangesAsync();

        var assigned = await db.StudentBadges
            .Include(sb => sb.Badge)
            .Where(sb => sb.StudentId == student.Id && sb.BadgeId == badge.Id)
            .ToListAsync();

        Assert.Single(assigned);
        Assert.Equal("First Step", assigned[0].Badge!.Title);
    }

    // =========================================================================
    // 19. Notification_BelongsToUser
    // =========================================================================

    [Fact]
    public async Task Notification_BelongsToUser()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);

        var notification = new Notification
        {
            UserId = student.Id,
            Title = "Welcome!",
            Message = "Welcome to EduFlow",
            Type = "General",
            IsRead = false
        };
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        var loaded = await db.Notifications
            .Include(n => n.User)
            .FirstAsync(n => n.Id == notification.Id);

        Assert.NotNull(loaded.User);
        Assert.Equal(student.Id, loaded.UserId);
        Assert.Equal(student.Id, loaded.User!.Id);
        Assert.Equal("Welcome!", loaded.Title);
    }
}
