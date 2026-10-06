using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EduFlow.Api.Controllers;
using EduFlow.Api.Filters;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Regression tests for uploaded-material authorization (UploadsController) and the
/// fail-closed shared-secret check on internal service routes (InternalServiceAuthFilter).
/// </summary>
public class UploadsAndInternalAuthSecurityTests : IDisposable
{
    private readonly string _webRoot;

    public UploadsAndInternalAuthSecurityTests()
    {
        _webRoot = Path.Combine(Path.GetTempPath(), "eduflow-uploads-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(Path.Combine(_webRoot, "uploads", "pdfs"));
        File.WriteAllText(Path.Combine(_webRoot, "uploads", "pdfs", "lecture.pdf"), "%PDF-1.4 test");
        File.WriteAllText(Path.Combine(_webRoot, "uploads", "pdfs", "orphan.pdf"), "%PDF-1.4 test");
        File.WriteAllText(Path.Combine(_webRoot, "secret.txt"), "outside uploads");
    }

    public void Dispose()
    {
        try { Directory.Delete(_webRoot, recursive: true); } catch (IOException) { }
    }

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

    private (ApplicationDbContext Db, User Instructor) SeedCourseWithModulePdf()
    {
        var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = new Course
        {
            Code = "UPL-1",
            Title = "Uploads Course",
            Description = "Desc",
            Category = "CS",
            InstructorId = instructor.Id,
            IsPublished = true
        };
        db.Courses.Add(course);
        db.Modules.Add(new Module { CourseId = course.Id, Title = "M1", Description = "d", OrderIndex = 1, PdfUrl = "/uploads/pdfs/lecture.pdf" });
        db.SaveChanges();
        return (db, instructor);
    }

    private UploadsController Uploads(ApplicationDbContext db, User? actor)
    {
        var env = new Mock<IWebHostEnvironment>();
        env.SetupGet(e => e.WebRootPath).Returns(_webRoot);
        var controller = new UploadsController(db, env.Object);
        var identity = actor == null
            ? new ClaimsIdentity()
            : new ClaimsIdentity(new[]
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

    [Fact]
    public void UploadsController_RequiresAuthentication()
    {
        Assert.NotEmpty(typeof(UploadsController).GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), inherit: true));
    }

    [Fact]
    public async Task OwningInstructor_CanReadModulePdf()
    {
        var (db, instructor) = SeedCourseWithModulePdf();
        var result = await Uploads(db, instructor).Get("pdfs/lecture.pdf");
        Assert.IsType<PhysicalFileResult>(result);
    }

    [Theory]
    [InlineData(EnrollmentStatus.Active, true)]
    [InlineData(EnrollmentStatus.Completed, true)]
    [InlineData(EnrollmentStatus.Pending, false)]
    [InlineData(EnrollmentStatus.Rejected, false)]
    [InlineData(EnrollmentStatus.Dropped, false)]
    public async Task Student_CanReadOnlyWithAccessGrantingEnrollment(EnrollmentStatus status, bool allowed)
    {
        var (db, _) = SeedCourseWithModulePdf();
        var student = SeedUser(db, UserRole.Student);
        var courseId = await db.Courses.Select(c => c.Id).SingleAsync();
        db.Enrollments.Add(new Enrollment { StudentId = student.Id, CourseId = courseId, Status = status });
        db.SaveChanges();

        var result = await Uploads(db, student).Get("pdfs/lecture.pdf");

        if (allowed) Assert.IsType<PhysicalFileResult>(result);
        else Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task UnenrolledStudent_And_OtherInstructor_GetNotFound()
    {
        var (db, _) = SeedCourseWithModulePdf();
        var student = SeedUser(db, UserRole.Student);
        var otherInstructor = SeedUser(db, UserRole.Instructor);

        Assert.IsType<NotFoundObjectResult>(await Uploads(db, student).Get("pdfs/lecture.pdf"));
        Assert.IsType<NotFoundObjectResult>(await Uploads(db, otherInstructor).Get("pdfs/lecture.pdf"));
    }

    [Fact]
    public async Task UnattachedFile_IsVisibleToInstructorsOnly()
    {
        var (db, _) = SeedCourseWithModulePdf();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);

        Assert.IsType<NotFoundObjectResult>(await Uploads(db, student).Get("pdfs/orphan.pdf"));
        Assert.IsType<PhysicalFileResult>(await Uploads(db, instructor).Get("pdfs/orphan.pdf"));
    }

    [Theory]
    [InlineData("../secret.txt")]
    [InlineData("pdfs/../../secret.txt")]
    [InlineData("pdfs/missing.pdf")]
    public async Task PathTraversal_And_MissingFiles_ReturnNotFound_EvenForAdmin(string path)
    {
        var db = CreateDb();
        var admin = SeedUser(db, UserRole.Admin);
        Assert.IsType<NotFoundObjectResult>(await Uploads(db, admin).Get(path));
    }

    // ---- InternalServiceAuthFilter ----

    private static async Task<(IActionResult? Result, bool NextCalled)> RunFilter(
        string? configuredKey, string? headerKey, string environment = "Production", bool allowUnauthenticated = false)
    {
        var settings = new Dictionary<string, string?>
        {
            ["AiService:ApiKey"] = configuredKey,
            ["AiService:AllowUnauthenticatedInternalCalls"] = allowUnauthenticated.ToString()
        };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        var env = new Mock<IHostEnvironment>();
        env.SetupGet(e => e.EnvironmentName).Returns(environment);

        var filter = new InternalServiceAuthFilter(configuration, env.Object, NullLogger<InternalServiceAuthFilter>.Instance);

        var httpContext = new DefaultHttpContext();
        if (headerKey != null) httpContext.Request.Headers["X-Internal-Api-Key"] = headerKey;
        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        var context = new ActionExecutingContext(actionContext, new List<IFilterMetadata>(), new Dictionary<string, object?>(), controller: new object());

        var nextCalled = false;
        await filter.OnActionExecutionAsync(context, () =>
        {
            nextCalled = true;
            return Task.FromResult(new ActionExecutedContext(actionContext, new List<IFilterMetadata>(), new object()));
        });
        return (context.Result, nextCalled);
    }

    [Fact]
    public async Task InternalFilter_FailsClosed_WhenKeyNotConfigured()
    {
        var (result, nextCalled) = await RunFilter(configuredKey: "", headerKey: null);
        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    [Fact]
    public async Task InternalFilter_OptInBypass_IsIgnoredOutsideDevelopment()
    {
        var (_, nextCalled) = await RunFilter(configuredKey: "", headerKey: null, environment: "Production", allowUnauthenticated: true);
        Assert.False(nextCalled);
    }

    [Fact]
    public async Task InternalFilter_OptInBypass_AllowedInDevelopment()
    {
        var (_, nextCalled) = await RunFilter(configuredKey: "", headerKey: null, environment: "Development", allowUnauthenticated: true);
        Assert.True(nextCalled);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("wrong-key")]
    [InlineData("expected-key-suffix")]
    public async Task InternalFilter_RejectsMissingOrWrongKey(string? header)
    {
        var (result, nextCalled) = await RunFilter(configuredKey: "expected-key", headerKey: header);
        Assert.False(nextCalled);
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task InternalFilter_AcceptsMatchingKey()
    {
        var (result, nextCalled) = await RunFilter(configuredKey: "expected-key", headerKey: "expected-key");
        Assert.True(nextCalled);
        Assert.Null(result);
    }
}
