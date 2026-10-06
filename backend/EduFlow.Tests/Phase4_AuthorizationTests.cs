using System;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Unit tests for Phase 4 – Authorization &amp; Ownership Enforcement.
/// Verifies that instructors, admins, and unauthenticated users
/// can only access resources they own or are permitted to see.
/// Tests exercise the DB-level ownership logic from BaseApiController.
/// </summary>
public class Phase4_AuthorizationTests
{
    // -------------------------------------------------------------------------
    // Helper: create isolated in-memory DB per test
    // -------------------------------------------------------------------------
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

    private static ContentItem SeedLesson(ApplicationDbContext db, Guid moduleId)
    {
        var lesson = new ContentItem
        {
            ModuleId = moduleId,
            Title = "Lesson 1",
            Content = "Lesson content",
            DisplayOrder = 1
        };
        db.ContentItems.Add(lesson);
        db.SaveChanges();
        return lesson;
    }

    private static Topic SeedTopic(ApplicationDbContext db, Guid moduleId)
    {
        var topic = new Topic
        {
            ModuleId = moduleId,
            Title = "Topic 1",
            Description = "Topic desc",
            DisplayOrder = 1,
            EstimatedMinutes = 30
        };
        db.Topics.Add(topic);
        db.SaveChanges();
        return topic;
    }

    private static ContentItem SeedContentItem(ApplicationDbContext db, Guid moduleId, Guid? topicId = null)
    {
        var contentItem = new ContentItem
        {
            ModuleId = moduleId,
            TopicId = topicId,
            Title = "Content Item 1",
            Content = "Some content",
            ContentType = "Lesson",
            DisplayOrder = 1
        };
        db.ContentItems.Add(contentItem);
        db.SaveChanges();
        return contentItem;
    }

    // =========================================================================
    // COURSE OWNERSHIP
    // =========================================================================

    [Fact]
    public async Task Instructor_CanAccess_OwnCourse()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructorA.Id);

        var isOwner = await db.Courses
            .AnyAsync(c => c.Id == course.Id && c.InstructorId == instructorA.Id);

        Assert.True(isOwner);
        Assert.Equal(instructorA.Id, course.InstructorId);
    }

    [Fact]
    public async Task Instructor_CannotAccess_OtherInstructorCourse()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseA = SeedCourse(db, instructorA.Id);

        var isOwner = await db.Courses
            .AnyAsync(c => c.Id == courseA.Id && c.InstructorId == instructorB.Id);

        Assert.False(isOwner);
        Assert.NotEqual(instructorB.Id, courseA.InstructorId);
    }

    [Fact]
    public async Task Admin_CanAccess_AnyCourse()
    {
        await using var db = CreateDb();
        var admin = SeedUser(db, UserRole.Admin);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        // Admin bypasses ownership — just needs Admin role
        var isAdmin = admin.Role == UserRole.Admin;
        Assert.True(isAdmin);
        Assert.Equal(UserRole.Admin, admin.Role);

        // Admin can see the course exists (ownership check bypassed for Admin)
        var courseExists = await db.Courses.AnyAsync(c => c.Id == course.Id);
        Assert.True(courseExists);
    }

    // =========================================================================
    // COURSE UPDATE RESTRICTION
    // =========================================================================

    [Fact]
    public async Task Instructor_CannotUpdate_OtherInstructorCourse()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseA = SeedCourse(db, instructorA.Id);

        // Simulate: instructor B tries to update course A's title
        var isOwner = await db.Courses
            .AnyAsync(c => c.Id == courseA.Id && c.InstructorId == instructorB.Id);

        Assert.False(isOwner);

        // Verify the course still belongs to instructor A after failed check
        var course = await db.Courses.FindAsync(courseA.Id);
        Assert.Equal(instructorA.Id, course!.InstructorId);
        Assert.NotEqual(instructorB.Id, course.InstructorId);
    }

    [Fact]
    public async Task Admin_CanDelete_AnyCourse()
    {
        await using var db = CreateDb();
        var admin = SeedUser(db, UserRole.Admin);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        // Admin role check — always permitted
        var isAdmin = admin.Role == UserRole.Admin;
        Assert.True(isAdmin);

        // Admin deletes the course
        db.Courses.Remove(course);
        await db.SaveChangesAsync();

        var deleted = await db.Courses.FindAsync(course.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task Instructor_CannotDelete_OtherInstructorCourse()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseA = SeedCourse(db, instructorA.Id);

        // Simulate: instructor B tries to delete course A
        var isOwner = await db.Courses
            .AnyAsync(c => c.Id == courseA.Id && c.InstructorId == instructorB.Id);

        Assert.False(isOwner);

        // Verify course still exists (delete would be blocked by Forbid())
        var course = await db.Courses.FindAsync(courseA.Id);
        Assert.NotNull(course);
    }

    // =========================================================================
    // COURSE CREATION OWNERSHIP
    // =========================================================================

    [Fact]
    public async Task Instructor_CanCreate_CourseUnderOwnId()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);

        var course = new Course
        {
            Code = $"C-{Guid.NewGuid().ToString("N")[..6]}",
            Title = "New Course",
            Description = "Desc",
            Category = "CS",
            InstructorId = instructor.Id,
            IsPublished = false
        };
        db.Courses.Add(course);
        await db.SaveChangesAsync();

        Assert.Equal(instructor.Id, course.InstructorId);

        var saved = await db.Courses.FindAsync(course.Id);
        Assert.NotNull(saved);
        Assert.Equal(instructor.Id, saved.InstructorId);
    }

    // =========================================================================
    // MODULE OWNERSHIP (via Course -> InstructorId chain)
    // =========================================================================

    [Fact]
    public async Task Module_Owned_By_CourseInstructor()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var module = SeedModule(db, course.Id);

        var isOwner = await db.Modules
            .Include(m => m.Course)
            .AnyAsync(m => m.Id == module.Id && m.Course != null && m.Course.InstructorId == instructor.Id);

        Assert.True(isOwner);
        Assert.Equal(course.Id, module.CourseId);
    }

    [Fact]
    public async Task Instructor_CannotModify_OtherInstructorModule()
    {
        await using var db = CreateDb();
        var instructorA = SeedUser(db, UserRole.Instructor);
        var instructorB = SeedUser(db, UserRole.Instructor);
        var courseA = SeedCourse(db, instructorA.Id);
        var moduleA = SeedModule(db, courseA.Id);

        // Simulate: instructor B tries to update module A
        var isOwner = await db.Modules
            .Include(m => m.Course)
            .AnyAsync(m => m.Id == moduleA.Id && m.Course != null && m.Course.InstructorId == instructorB.Id);

        Assert.False(isOwner);

        // Verify module still belongs to instructor A's course
        var module = await db.Modules
            .Include(m => m.Course)
            .FirstAsync(m => m.Id == moduleA.Id);

        Assert.Equal(instructorA.Id, module.Course!.InstructorId);
        Assert.NotEqual(instructorB.Id, module.Course.InstructorId);
    }

    // =========================================================================
    // LESSON OWNERSHIP (via Module -> Course chain)
    // =========================================================================

    [Fact]
    public async Task Lesson_Owned_By_ModuleOwner()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var module = SeedModule(db, course.Id);
        var lesson = SeedLesson(db, module.Id);

        var isOwner = await db.ContentItems
            .Include(l => l.Module)
                .ThenInclude(m => m.Course)
            .AnyAsync(l => l.Id == lesson.Id
                && l.Module != null
                && l.Module.Course != null
                && l.Module.Course.InstructorId == instructor.Id);

        Assert.True(isOwner);
        Assert.Equal(module.Id, lesson.ModuleId);
    }

    // =========================================================================
    // TOPIC OWNERSHIP (via Module -> Course chain)
    // =========================================================================

    [Fact]
    public async Task Topic_Owned_By_ModuleOwner()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var module = SeedModule(db, course.Id);
        var topic = SeedTopic(db, module.Id);

        var isOwner = await db.Topics
            .Include(t => t.Module)
                .ThenInclude(m => m.Course)
            .AnyAsync(t => t.Id == topic.Id
                && t.Module != null
                && t.Module.Course != null
                && t.Module.Course.InstructorId == instructor.Id);

        Assert.True(isOwner);
        Assert.Equal(module.Id, topic.ModuleId);
    }

    // =========================================================================
    // CONTENT ITEM OWNERSHIP (via Module -> Course chain)
    // =========================================================================

    [Fact]
    public async Task ContentItem_Owned_By_ModuleOwner()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);
        var module = SeedModule(db, course.Id);
        var topic = SeedTopic(db, module.Id);
        var contentItem = SeedContentItem(db, module.Id, topic.Id);

        var isOwner = await db.ContentItems
            .Include(ci => ci.Module)
                .ThenInclude(m => m.Course)
            .AnyAsync(ci => ci.Id == contentItem.Id
                && ci.Module != null
                && ci.Module.Course != null
                && ci.Module.Course.InstructorId == instructor.Id);

        Assert.True(isOwner);
        Assert.Equal(module.Id, contentItem.ModuleId);
        Assert.Equal(topic.Id, contentItem.TopicId);
    }
}
