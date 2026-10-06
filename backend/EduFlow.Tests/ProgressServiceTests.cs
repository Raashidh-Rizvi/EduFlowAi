using System;
using System.Linq;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

/// <summary>The single progress formula (<see cref="ProgressService"/>).</summary>
public class ProgressServiceTests
{
    private sealed record Setup(ApplicationDbContext Db, ProgressService Service, Course Course, Module M1, Module M2, User Student, Enrollment Enrollment);

    private static async Task<Setup> CreateAsync()
    {
        var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var instructor = new User { FullName = "I", Email = "i@t", Role = UserRole.Instructor };
        var student = new User { FullName = "S", Email = "s@t", Role = UserRole.Student };
        var course = new Course { Code = "P-1", Title = "Progress", InstructorId = instructor.Id };
        var m1 = new Module { Course = course, Title = "M1", OrderIndex = 1 };
        var m2 = new Module { Course = course, Title = "M2", OrderIndex = 2 };
        var enrollment = new Enrollment { Course = course, StudentId = student.Id, Status = EnrollmentStatus.Active };
        db.AddRange(instructor, student, course, m1, m2, enrollment);
        await db.SaveChangesAsync();
        return new Setup(db, new ProgressService(db), course, m1, m2, student, enrollment);
    }

    private static ContentItem Item(Setup s, Module m, string status = "Published")
    {
        var item = new ContentItem { ModuleId = m.Id, Title = "Item", Status = status };
        s.Db.ContentItems.Add(item);
        return item;
    }

    private static Assessment Quiz(Setup s, Module m, QuizStatus status = QuizStatus.Published)
    {
        var quiz = new Assessment { CourseId = s.Course.Id, ModuleId = m.Id, Title = "Quiz", Status = status };
        s.Db.Assessments.Add(quiz);
        return quiz;
    }

    private static void Complete(Setup s, ContentItem item)
        => s.Db.LessonCompletions.Add(new LessonCompletion { StudentId = s.Student.Id, ContentItemId = item.Id });

    private static void Attempt(Setup s, Assessment quiz, bool passed, AttemptStatus status = AttemptStatus.Evaluated)
        => s.Db.Submissions.Add(new Submission { AssessmentId = quiz.Id, StudentId = s.Student.Id, Status = status, Passed = passed });

    [Fact]
    public async Task Progress_IsCompletedUnitsOverPublishedUnits()
    {
        var s = await CreateAsync();
        var a = Item(s, s.M1);
        Item(s, s.M1);
        var quiz = Quiz(s, s.M1);
        Item(s, s.M2);
        Complete(s, a);
        Attempt(s, quiz, passed: true);
        await s.Db.SaveChangesAsync();

        var progress = await s.Service.CalculateAsync(s.Course.Id, s.Student.Id);
        Assert.Equal(4, progress.TotalUnits);
        Assert.Equal(2, progress.CompletedUnits);
        Assert.Equal(50m, progress.Percentage);

        var m1 = progress.Modules.Single(m => m.ModuleId == s.M1.Id);
        Assert.Equal(2, m1.CompletedContentItems + m1.PassedAssessments);
        Assert.Equal(66.67m, m1.Percentage);
        Assert.False(m1.IsComplete);
    }

    [Fact]
    public async Task FailedOrUnmarkedAttempts_AndUnpublishedUnits_DoNotCount()
    {
        var s = await CreateAsync();
        var quiz = Quiz(s, s.M1);
        var draftQuiz = Quiz(s, s.M1, QuizStatus.Draft);
        Item(s, s.M1, status: "Draft");
        Attempt(s, quiz, passed: false);
        Attempt(s, quiz, passed: true, status: AttemptStatus.Evaluating);
        Attempt(s, draftQuiz, passed: true);
        await s.Db.SaveChangesAsync();

        var progress = await s.Service.CalculateAsync(s.Course.Id, s.Student.Id);
        Assert.Equal(1, progress.TotalUnits);
        Assert.Equal(0, progress.CompletedUnits);
        Assert.Equal(0m, progress.Percentage);
    }

    [Fact]
    public async Task CompletingEveryUnit_MarksTheEnrollmentCompleted()
    {
        var s = await CreateAsync();
        var item = Item(s, s.M1);
        var quiz = Quiz(s, s.M2);
        Complete(s, item);
        await s.Db.SaveChangesAsync();

        await s.Service.RefreshEnrollmentAsync(s.Course.Id, s.Student.Id);
        await s.Db.SaveChangesAsync();
        Assert.Equal(50.0, s.Enrollment.ProgressPercentage);
        Assert.Equal(EnrollmentStatus.Active, s.Enrollment.Status);

        Attempt(s, quiz, passed: true);
        await s.Db.SaveChangesAsync();
        var progress = await s.Service.RefreshEnrollmentAsync(s.Course.Id, s.Student.Id);
        await s.Db.SaveChangesAsync();

        Assert.True(progress!.IsComplete);
        Assert.Equal(100.0, s.Enrollment.ProgressPercentage);
        Assert.Equal(EnrollmentStatus.Completed, s.Enrollment.Status);
        Assert.NotNull(s.Enrollment.CompletedAt);
    }

    [Fact]
    public async Task CourseWithoutUnits_HasZeroProgress_AndIsNotComplete()
    {
        var s = await CreateAsync();
        var progress = await s.Service.CalculateAsync(s.Course.Id, s.Student.Id);
        Assert.Equal(0m, progress.Percentage);
        Assert.False(progress.IsComplete);
    }
}
