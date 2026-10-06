using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EduFlow.Api.Controllers;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Services;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Regression tests for ownership checks on instructor-facing list/detail endpoints:
/// AI review workflows, generated reports and course-scoped broadcasts.
/// </summary>
public class IdorOwnershipTests
{
    private static ApplicationDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
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

    private static Course SeedCourse(ApplicationDbContext db, User instructor)
    {
        var course = new Course
        {
            Code = "IDOR-" + Guid.NewGuid().ToString("N")[..6],
            Title = "Owned Course",
            Description = "Desc",
            InstructorId = instructor.Id
        };
        db.Courses.Add(course);
        db.SaveChanges();
        return course;
    }

    private static T WithUser<T>(T controller, User actor) where T : ControllerBase
    {
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, actor.Id.ToString()),
            new Claim(ClaimTypes.Role, actor.Role.ToString())
        }, "Test");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return controller;
    }

    // ---- AI review workflows ----

    private static AiReviewController AiReview(ApplicationDbContext db, User actor) =>
        WithUser(new AiReviewController(db, Mock.Of<IAiGatewayClient>(), NullLogger<AiReviewController>.Instance), actor);

    [Fact]
    public async Task GetWorkflows_InstructorSeesOnlyOwnCourses_AdminSeesAll()
    {
        var db = CreateDb();
        var owner = SeedUser(db, UserRole.Instructor);
        var other = SeedUser(db, UserRole.Instructor);
        var admin = SeedUser(db, UserRole.Admin);
        var student = SeedUser(db, UserRole.Student);
        var ownCourse = SeedCourse(db, owner);
        var otherCourse = SeedCourse(db, other);
        db.StudyPlans.AddRange(
            new StudyPlan { StudentId = student.Id, CourseId = ownCourse.Id, TargetGoal = "own" },
            new StudyPlan { StudentId = student.Id, CourseId = otherCourse.Id, TargetGoal = "other" });
        db.SaveChanges();

        var ownerResult = Assert.IsType<OkObjectResult>(await AiReview(db, owner).GetWorkflows());
        var ownerPlans = Assert.IsAssignableFrom<IEnumerable<StudyPlan>>(ownerResult.Value).ToList();
        Assert.Single(ownerPlans);
        Assert.Equal(ownCourse.Id, ownerPlans[0].CourseId);

        var adminResult = Assert.IsType<OkObjectResult>(await AiReview(db, admin).GetWorkflows());
        Assert.Equal(2, Assert.IsAssignableFrom<IEnumerable<StudyPlan>>(adminResult.Value).Count());
    }

    // ---- Reports ----

    private static ReportsController Reports(ApplicationDbContext db, User actor) =>
        WithUser(new ReportsController(db), actor);

    [Fact]
    public async Task GetReportById_ReturnsNotFound_ForAnotherInstructorsOrSystemReport()
    {
        var db = CreateDb();
        var owner = SeedUser(db, UserRole.Instructor);
        var other = SeedUser(db, UserRole.Instructor);
        var admin = SeedUser(db, UserRole.Admin);
        var owned = new Report { Title = "Mine", GeneratedById = owner.Id };
        var system = new Report { Title = "System", GeneratedById = null };
        db.Reports.AddRange(owned, system);
        db.SaveChanges();

        Assert.IsType<OkObjectResult>(await Reports(db, owner).GetReportById(owned.Id));
        Assert.IsType<NotFoundObjectResult>(await Reports(db, other).GetReportById(owned.Id));
        Assert.IsType<NotFoundObjectResult>(await Reports(db, owner).GetReportById(system.Id));
        Assert.IsType<OkObjectResult>(await Reports(db, admin).GetReportById(owned.Id));
        Assert.IsType<OkObjectResult>(await Reports(db, admin).GetReportById(system.Id));
    }

    [Fact]
    public async Task GetReports_InstructorSeesOnlyOwnReports_AdminSeesAll()
    {
        var db = CreateDb();
        var owner = SeedUser(db, UserRole.Instructor);
        var other = SeedUser(db, UserRole.Instructor);
        var admin = SeedUser(db, UserRole.Admin);
        db.Reports.AddRange(
            new Report { Title = "Mine", GeneratedById = owner.Id },
            new Report { Title = "Theirs", GeneratedById = other.Id },
            new Report { Title = "System", GeneratedById = null });
        db.SaveChanges();

        var ownerList = Assert.IsAssignableFrom<System.Collections.IEnumerable>(
            Assert.IsType<OkObjectResult>(await Reports(db, owner).GetReports()).Value).Cast<object>().ToList();
        Assert.Single(ownerList);

        var adminList = Assert.IsAssignableFrom<System.Collections.IEnumerable>(
            Assert.IsType<OkObjectResult>(await Reports(db, admin).GetReports()).Value).Cast<object>().ToList();
        Assert.Equal(3, adminList.Count);
    }

    // ---- Broadcasts ----

    private static NotificationsController Notifications(ApplicationDbContext db, User actor) =>
        WithUser(new NotificationsController(db), actor);

    [Fact]
    public async Task Broadcast_ToAnotherInstructorsCourse_IsForbidden_AndNotSaved()
    {
        var db = CreateDb();
        var owner = SeedUser(db, UserRole.Instructor);
        var other = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, owner);

        var result = await Notifications(db, other).BroadcastAnnouncement(new BroadcastRequest("Hi", "Body", false, course.Id));

        Assert.IsType<ForbidResult>(result);
        Assert.Empty(db.Announcements);
    }

    [Fact]
    public async Task Broadcast_ByOwnerOrAdmin_Succeeds_WithRealAuthor()
    {
        var db = CreateDb();
        var owner = SeedUser(db, UserRole.Instructor);
        var admin = SeedUser(db, UserRole.Admin);
        var course = SeedCourse(db, owner);

        Assert.IsType<OkObjectResult>(await Notifications(db, owner).BroadcastAnnouncement(new BroadcastRequest("A", "B", false, course.Id)));
        Assert.IsType<OkObjectResult>(await Notifications(db, admin).BroadcastAnnouncement(new BroadcastRequest("A", "B", false, course.Id)));
        // Global broadcasts stay available to instructors (used by the Communications page).
        Assert.IsType<OkObjectResult>(await Notifications(db, owner).BroadcastAnnouncement(new BroadcastRequest("A", "B", true, null)));

        var authors = db.Announcements.Select(a => a.AuthorId).ToList();
        Assert.Equal(3, authors.Count);
        Assert.All(authors, id => Assert.Contains(id, new[] { owner.Id, admin.Id }));
    }

    [Fact]
    public async Task Broadcast_WithoutValidUserId_IsUnauthorized()
    {
        var db = CreateDb();
        var controller = new NotificationsController(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, "Instructor") }, "Test"))
                }
            }
        };

        Assert.IsType<UnauthorizedResult>(await controller.BroadcastAnnouncement(new BroadcastRequest("A", "B", true, null)));
        Assert.Empty(db.Announcements);
    }
}
