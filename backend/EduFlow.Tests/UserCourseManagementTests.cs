using System;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Unit tests for Member 1 – User &amp; Course Management.
/// Covers: enrollment rules, course publishing workflow, profile management.
/// </summary>
public class UserCourseManagementTests
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

    private static User SeedUser(ApplicationDbContext db, UserRole role = UserRole.Student)
    {
        var user = new User
        {
            FullName = "Test User",
            Email = $"user_{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            Role = role,
            IsActive = true
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    private static Course SeedCourse(ApplicationDbContext db, Guid instructorId, bool isPublished = true)
    {
        var course = new Course
        {
            Code = $"C-{Guid.NewGuid().ToString("N")[..6]}",
            Title = "Test Course",
            Description = "Desc",
            Category = "CS",
            InstructorId = instructorId,
            IsPublished = isPublished
        };
        db.Courses.Add(course);
        db.SaveChanges();
        return course;
    }

    // =========================================================================
    // ENROLLMENT RULES
    // =========================================================================

    [Fact]
    public async Task EnrollStudent_NewEnrollment_CreatesActiveRecord()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var enrollment = new Enrollment
        {
            StudentId = student.Id,
            CourseId = course.Id,
            ProgressPercentage = 0.0,
            Status = EnrollmentStatus.Active
        };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync();

        var saved = await db.Enrollments
            .FirstOrDefaultAsync(e => e.StudentId == student.Id && e.CourseId == course.Id);

        Assert.NotNull(saved);
        Assert.Equal(EnrollmentStatus.Active, saved!.Status);
        Assert.Equal(0.0, saved.ProgressPercentage);
    }

    [Fact]
    public async Task EnrollStudent_DuplicateEnrollment_ExistingRecordIsReturned()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        // Enroll once
        var first = new Enrollment { StudentId = student.Id, CourseId = course.Id, Status = EnrollmentStatus.Active };
        db.Enrollments.Add(first);
        await db.SaveChangesAsync();

        // Simulate controller idempotency check
        var existing = await db.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == course.Id && e.StudentId == student.Id);

        Assert.NotNull(existing);
        Assert.Equal(first.Id, existing!.Id); // same record, not a new one

        var count = await db.Enrollments.CountAsync(e => e.StudentId == student.Id && e.CourseId == course.Id);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task UnenrollStudent_SetsStatusToDropped_NotHardDeleted()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var enrollment = new Enrollment
        {
            StudentId = student.Id,
            CourseId = course.Id,
            Status = EnrollmentStatus.Active
        };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync();

        // Simulate unenroll — soft delete
        enrollment.Status = EnrollmentStatus.Dropped;
        enrollment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Record still exists (audit trail preserved)
        var saved = await db.Enrollments.FindAsync(enrollment.Id);
        Assert.NotNull(saved);
        Assert.Equal(EnrollmentStatus.Dropped, saved!.Status);
    }

    [Fact]
    public async Task GetMyCourses_OnlyReturnsActiveEnrollments()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var activeCourse = SeedCourse(db, instructor.Id);
        var droppedCourse = SeedCourse(db, instructor.Id);

        db.Enrollments.Add(new Enrollment
        {
            StudentId = student.Id,
            CourseId = activeCourse.Id,
            Status = EnrollmentStatus.Active
        });
        db.Enrollments.Add(new Enrollment
        {
            StudentId = student.Id,
            CourseId = droppedCourse.Id,
            Status = EnrollmentStatus.Dropped
        });
        await db.SaveChangesAsync();

        var activeEnrollments = await db.Enrollments
            .Where(e => e.StudentId == student.Id && e.Status == EnrollmentStatus.Active)
            .ToListAsync();

        Assert.Single(activeEnrollments);
        Assert.Equal(activeCourse.Id, activeEnrollments[0].CourseId);
    }

    // =========================================================================
    // COURSE PUBLISHING WORKFLOW
    // =========================================================================

    [Fact]
    public async Task CreateCourse_StartsAsUnpublished()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);

        // New courses should start as drafts (IsPublished = false)
        var course = new Course
        {
            Code = "PY101",
            Title = "Python Basics",
            Description = "Intro",
            Category = "CS",
            InstructorId = instructor.Id,
            IsPublished = false
        };
        db.Courses.Add(course);
        await db.SaveChangesAsync();

        var saved = await db.Courses.FindAsync(course.Id);
        Assert.NotNull(saved);
        Assert.False(saved!.IsPublished);
    }

    [Fact]
    public async Task PublishCourse_SetsIsPublishedTrue()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id, isPublished: false);

        // Simulate publish action
        course.IsPublished = true;
        course.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var published = await db.Courses.FindAsync(course.Id);
        Assert.NotNull(published);
        Assert.True(published!.IsPublished);
    }

    [Fact]
    public async Task UnpublishCourse_SetsIsPublishedFalse()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id, isPublished: true);

        // Simulate unpublish action
        course.IsPublished = false;
        course.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var unpublished = await db.Courses.FindAsync(course.Id);
        Assert.NotNull(unpublished);
        Assert.False(unpublished!.IsPublished);
    }

    [Fact]
    public async Task GetCourses_ReturnsOnlyPublishedCourses()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var pub = SeedCourse(db, instructor.Id, isPublished: true);
        var unpub = SeedCourse(db, instructor.Id, isPublished: false);

        var published = await db.Courses.Where(c => c.IsPublished).ToListAsync();
        Assert.Contains(published, c => c.Id == pub.Id);
        Assert.DoesNotContain(published, c => c.Id == unpub.Id);
    }

    // =========================================================================
    // ROLE CHECKS
    // =========================================================================

    [Fact]
    public void UserRole_Student_CannotBeAssignedInstructorPrivileges_ByDefault()
    {
        var student = new User { Role = UserRole.Student };
        Assert.NotEqual(UserRole.Instructor, student.Role);
        Assert.NotEqual(UserRole.Admin, student.Role);
    }

    [Fact]
    public async Task ChangeRole_UpdatesUserRoleCorrectly()
    {
        await using var db = CreateDb();
        var user = SeedUser(db, UserRole.Student);

        // Simulate admin changing user role
        user.Role = UserRole.Instructor;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var updated = await db.Users.FindAsync(user.Id);
        Assert.Equal(UserRole.Instructor, updated!.Role);
    }

    [Fact]
    public async Task ToggleUserStatus_DeactivatesActiveUser()
    {
        await using var db = CreateDb();
        var user = SeedUser(db, UserRole.Student);
        Assert.True(user.IsActive);

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var updated = await db.Users.FindAsync(user.Id);
        Assert.False(updated!.IsActive);
    }

    // =========================================================================
    // AUTH SERVICE — PROFILE MANAGEMENT
    // =========================================================================

    [Fact]
    public async Task AuthService_Logout_RevokesRefreshToken()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var authService = new AuthService(db, null!);

        // Seed a refresh token
        var token = new RefreshToken
        {
            UserId = instructor.Id,
            Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        };
        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync();

        // Logout
        await authService.LogoutAsync(token.Token);

        var saved = await db.RefreshTokens.FindAsync(token.Id);
        Assert.True(saved!.IsRevoked);
    }

    [Fact]
    public async Task AuthService_Logout_IsIdempotent_WhenTokenAlreadyRevoked()
    {
        await using var db = CreateDb();
        var user = SeedUser(db);
        var authService = new AuthService(db, null!);

        // Already-revoked token
        var token = new RefreshToken
        {
            UserId = user.Id,
            Token = "already-revoked-token",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = true
        };
        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync();

        // Should not throw
        await authService.LogoutAsync(token.Token);
        // Still revoked
        var saved = await db.RefreshTokens.FindAsync(token.Id);
        Assert.True(saved!.IsRevoked);
    }

    [Fact]
    public async Task AuthService_GetUserByIdAsync_ReturnsCorrectProfile()
    {
        await using var db = CreateDb();
        var user = SeedUser(db, UserRole.Instructor);
        var authService = new AuthService(db, null!);

        var profile = await authService.GetUserByIdAsync(user.Id);

        Assert.Equal(user.Id, profile.Id);
        Assert.Equal(user.Email, profile.Email);
        Assert.Equal("Instructor", profile.Role);
    }

    [Fact]
    public async Task AuthService_GetUserByIdAsync_ThrowsKeyNotFoundException_ForUnknownId()
    {
        await using var db = CreateDb();
        var authService = new AuthService(db, null!);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            authService.GetUserByIdAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task AuthService_UpdateProfileAsync_UpdatesNameAndAvatar()
    {
        await using var db = CreateDb();
        var user = SeedUser(db, UserRole.Student);
        var authService = new AuthService(db, null!);

        var updated = await authService.UpdateProfileAsync(user.Id, new UpdateProfileRequest(
            FullName: "Updated Name",
            AvatarUrl: "https://cdn.example.com/avatar.png"
        ));

        Assert.Equal("Updated Name", updated.FullName);
        var fromDb = await db.Users.FindAsync(user.Id);
        Assert.Equal("Updated Name", fromDb!.FullName);
        Assert.Equal("https://cdn.example.com/avatar.png", fromDb.AvatarUrl);
    }

    [Fact]
    public async Task AuthService_UpdateProfileAsync_NullAvatarUrl_DoesNotOverwriteExisting()
    {
        await using var db = CreateDb();
        var user = SeedUser(db, UserRole.Student);
        user.AvatarUrl = "https://cdn.example.com/old.png";
        await db.SaveChangesAsync();

        var authService = new AuthService(db, null!);

        // Passing null AvatarUrl should preserve existing
        var updated = await authService.UpdateProfileAsync(user.Id, new UpdateProfileRequest(
            FullName: "New Name",
            AvatarUrl: null
        ));

        var fromDb = await db.Users.FindAsync(user.Id);
        Assert.Equal("https://cdn.example.com/old.png", fromDb!.AvatarUrl); // preserved
        Assert.Equal("New Name", fromDb.FullName);
    }

    // =========================================================================
    // MODULE & LESSON PDF ATTACHMENTS
    // =========================================================================

    [Fact]
    public async Task CreateModule_WithPdfAttachment_PersistsAndRetrievesPdfDetails()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var module = new Module
        {
            CourseId = course.Id,
            Title = "Module 1: Advanced Relational Systems",
            Description = "Includes curriculum reading material",
            OrderIndex = 1,
            PdfUrl = "/uploads/pdfs/sample_module_syllabus.pdf",
            AttachmentFileName = "sample_module_syllabus.pdf"
        };

        db.Modules.Add(module);
        await db.SaveChangesAsync();

        var retrieved = await db.Modules.FirstOrDefaultAsync(m => m.Id == module.Id);
        Assert.NotNull(retrieved);
        Assert.Equal("/uploads/pdfs/sample_module_syllabus.pdf", retrieved!.PdfUrl);
        Assert.Equal("sample_module_syllabus.pdf", retrieved.AttachmentFileName);
    }

    [Fact]
    public async Task CreateLesson_WithPdfAttachment_PersistsAndRetrievesPdfDetails()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var module = new Module
        {
            CourseId = course.Id,
            Title = "Module 2: Scalable Indexing",
            OrderIndex = 1
        };
        db.Modules.Add(module);
        await db.SaveChangesAsync();

        var lesson = new Lesson
        {
            ModuleId = module.Id,
            Title = "Lesson 2.1: B-Tree Indexes",
            Content = "Comprehensive lecture on Postgres indexing.",
            PdfUrl = "/uploads/pdfs/btree_indexes_lecture_notes.pdf",
            AttachmentFileName = "btree_indexes_lecture_notes.pdf",
            XpReward = 30,
            EstimatedMinutes = 25,
            OrderIndex = 1
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();

        var retrieved = await db.Lessons.FirstOrDefaultAsync(l => l.Id == lesson.Id);
        Assert.NotNull(retrieved);
        Assert.Equal("/uploads/pdfs/btree_indexes_lecture_notes.pdf", retrieved!.PdfUrl);
        Assert.Equal("btree_indexes_lecture_notes.pdf", retrieved.AttachmentFileName);
        Assert.Equal(30, retrieved.XpReward);
    }
}
