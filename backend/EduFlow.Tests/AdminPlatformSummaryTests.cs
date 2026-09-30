using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Api.Controllers;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace EduFlow.Tests;

public class AdminPlatformSummaryTests
{
    private static async Task<WebApplication> StartSummaryApp()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = "Testing",
            ContentRootPath = System.IO.Path.GetTempPath()
        });

        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();

        var databaseName = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseInMemoryDatabase(databaseName);
        });

        builder.Services.AddAuthentication("SummaryTest")
            .AddScheme<AuthenticationSchemeOptions, SummaryTestAuthHandler>("SummaryTest", _ => { });

        builder.Services.AddAuthorization();
        builder.Services.AddControllers()
            .AddApplicationPart(typeof(AnalyticsController).Assembly);

        var app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync();
        return app;
    }

    private static HttpClient CreateClient(WebApplication app, string? role = null, Guid? actorId = null)
    {
        var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
        var client = new HttpClient { BaseAddress = new Uri(addresses.Addresses.Single()) };
        if (role != null) client.DefaultRequestHeaders.Add("X-Test-Role", role);
        if (actorId != null) client.DefaultRequestHeaders.Add("X-Test-UserId", actorId.ToString());
        return client;
    }

    public sealed class SummaryTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public SummaryTestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger, UrlEncoder encoder) : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var role = Request.Headers["X-Test-Role"].ToString();
            if (string.IsNullOrEmpty(role)) return Task.FromResult(AuthenticateResult.NoResult());

            var actorId = Request.Headers["X-Test-UserId"].FirstOrDefault() ?? "11111111-1111-1111-1111-111111111111";
            var identity = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.NameIdentifier, actorId)
            }, Scheme.Name);

            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
        }
    }

    [Fact]
    public async Task AdminPlatformSummary_ReturnsLiveAggregatesAndSnapshotInvariants()
    {
        var app = await StartSummaryApp();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // Seed users (Admin, Instructor, Student, plus an inactive user)
        var admin = new User { Id = Guid.NewGuid(), FullName = "Admin User", Email = "admin@eduflow.ai", Role = UserRole.Admin, IsActive = true };
        var instructor = new User { Id = Guid.NewGuid(), FullName = "Prof Smith", Email = "prof@eduflow.ai", Role = UserRole.Instructor, IsActive = true };
        var student1 = new User { Id = Guid.NewGuid(), FullName = "Alice Student", Email = "alice@eduflow.ai", Role = UserRole.Student, IsActive = true };
        var student2 = new User { Id = Guid.NewGuid(), FullName = "Bob Suspended", Email = "bob@eduflow.ai", Role = UserRole.Student, IsActive = false };

        db.Users.AddRange(admin, instructor, student1, student2);

        // Seed courses (Published, Draft, Archived, OtherUnpublished)
        var cPublished = new Course { Id = Guid.NewGuid(), Title = "C# Mastery", InstructorId = instructor.Id, IsPublished = true, Status = "Published" };
        var cDraft = new Course { Id = Guid.NewGuid(), Title = "Rust Basics", InstructorId = instructor.Id, IsPublished = false, Status = "Draft" };
        var cArchived = new Course { Id = Guid.NewGuid(), Title = "Legacy Pascal", InstructorId = instructor.Id, IsPublished = false, Status = "Archived" };
        var cOther = new Course { Id = Guid.NewGuid(), Title = "Experimental AI", InstructorId = instructor.Id, IsPublished = false, Status = "UnderReview" };

        db.Courses.AddRange(cPublished, cDraft, cArchived, cOther);

        // Seed enrollments with each status
        db.Enrollments.AddRange(
            new Enrollment { Id = Guid.NewGuid(), CourseId = cPublished.Id, StudentId = student1.Id, Status = EnrollmentStatus.Active },
            new Enrollment { Id = Guid.NewGuid(), CourseId = cPublished.Id, StudentId = student2.Id, Status = EnrollmentStatus.Completed },
            new Enrollment { Id = Guid.NewGuid(), CourseId = cDraft.Id, StudentId = student1.Id, Status = EnrollmentStatus.Pending },
            new Enrollment { Id = Guid.NewGuid(), CourseId = cDraft.Id, StudentId = student2.Id, Status = EnrollmentStatus.Rejected },
            new Enrollment { Id = Guid.NewGuid(), CourseId = cArchived.Id, StudentId = student1.Id, Status = EnrollmentStatus.Cancelled },
            new Enrollment { Id = Guid.NewGuid(), CourseId = cArchived.Id, StudentId = student2.Id, Status = EnrollmentStatus.Dropped }
        );

        // Seed support tickets with statuses and types
        db.SupportTickets.AddRange(
            new SupportTicket { Id = Guid.NewGuid(), SubmittedByUserId = student1.Id, Status = SupportTicketStatus.Open, Type = SupportTicketType.Bug, Message = "Bug report" },
            new SupportTicket { Id = Guid.NewGuid(), SubmittedByUserId = student1.Id, Status = SupportTicketStatus.InProgress, Type = SupportTicketType.Dispute, Message = "Grade dispute" },
            new SupportTicket { Id = Guid.NewGuid(), SubmittedByUserId = student2.Id, Status = SupportTicketStatus.Resolved, Type = SupportTicketType.Feedback, Message = "Great feature" }
        );

        await db.SaveChangesAsync();

        var client = CreateClient(app, "Admin", admin.Id);
        var response = await client.GetAsync("/api/analytics/platform");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("no-store", response.Headers.CacheControl?.ToString() ?? "");

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Legacy fields must still exist
        Assert.Equal(4, json.GetProperty("totalUsers").GetInt32());
        Assert.Equal(2, json.GetProperty("totalStudents").GetInt32());
        Assert.Equal(4, json.GetProperty("totalCourses").GetInt32());
        Assert.Equal(1, json.GetProperty("publishedCourses").GetInt32());
        Assert.Equal(1, json.GetProperty("totalEnrollments").GetInt32()); // legacy totalEnrollments means Active only

        // Admin extension must exist
        Assert.True(json.TryGetProperty("adminSummary", out var summary));
        Assert.NotNull(summary.GetProperty("generatedAt").GetString());

        // Users metrics
        var users = summary.GetProperty("users");
        Assert.Equal(4, users.GetProperty("total").GetInt32());
        Assert.Equal(2, users.GetProperty("students").GetInt32());
        Assert.Equal(1, users.GetProperty("instructors").GetInt32());
        Assert.Equal(1, users.GetProperty("admins").GetInt32());
        Assert.Equal(3, users.GetProperty("active").GetInt32());
        Assert.Equal(1, users.GetProperty("suspended").GetInt32());

        // User invariants
        Assert.Equal(users.GetProperty("total").GetInt32(),
            users.GetProperty("students").GetInt32() + users.GetProperty("instructors").GetInt32() + users.GetProperty("admins").GetInt32());
        Assert.Equal(users.GetProperty("total").GetInt32(),
            users.GetProperty("active").GetInt32() + users.GetProperty("suspended").GetInt32());

        // Courses metrics
        var courses = summary.GetProperty("courses");
        Assert.Equal(4, courses.GetProperty("total").GetInt32());
        Assert.Equal(1, courses.GetProperty("published").GetInt32());
        Assert.Equal(3, courses.GetProperty("unpublished").GetInt32());
        Assert.Equal(1, courses.GetProperty("draft").GetInt32());
        Assert.Equal(1, courses.GetProperty("archived").GetInt32());
        Assert.Equal(1, courses.GetProperty("otherUnpublished").GetInt32());

        // Course invariants
        Assert.Equal(courses.GetProperty("total").GetInt32(),
            courses.GetProperty("published").GetInt32() + courses.GetProperty("unpublished").GetInt32());
        Assert.Equal(courses.GetProperty("unpublished").GetInt32(),
            courses.GetProperty("draft").GetInt32() + courses.GetProperty("archived").GetInt32() + courses.GetProperty("otherUnpublished").GetInt32());

        // Enrollments metrics
        var enrollments = summary.GetProperty("enrollments");
        Assert.Equal(6, enrollments.GetProperty("totalRecords").GetInt32());
        Assert.Equal(1, enrollments.GetProperty("active").GetInt32());
        Assert.Equal(1, enrollments.GetProperty("completed").GetInt32());
        Assert.Equal(1, enrollments.GetProperty("pending").GetInt32());
        Assert.Equal(1, enrollments.GetProperty("rejected").GetInt32());
        Assert.Equal(1, enrollments.GetProperty("cancelled").GetInt32());
        Assert.Equal(1, enrollments.GetProperty("dropped").GetInt32());

        // Enrollment invariants
        Assert.Equal(enrollments.GetProperty("totalRecords").GetInt32(),
            enrollments.GetProperty("active").GetInt32() +
            enrollments.GetProperty("completed").GetInt32() +
            enrollments.GetProperty("pending").GetInt32() +
            enrollments.GetProperty("rejected").GetInt32() +
            enrollments.GetProperty("cancelled").GetInt32() +
            enrollments.GetProperty("dropped").GetInt32());

        // Support metrics
        var support = summary.GetProperty("support");
        Assert.Equal("Available", summary.GetProperty("supportAvailability").GetString());
        Assert.Equal(3, support.GetProperty("total").GetInt32());
        Assert.Equal(1, support.GetProperty("open").GetInt32());
        Assert.Equal(1, support.GetProperty("inProgress").GetInt32());
        Assert.Equal(1, support.GetProperty("resolved").GetInt32());
        Assert.Equal(2, support.GetProperty("unresolved").GetInt32());

        var byType = support.GetProperty("byType");
        Assert.Equal(1, byType.GetProperty("bug").GetInt32());
        Assert.Equal(1, byType.GetProperty("dispute").GetInt32());
        Assert.Equal(1, byType.GetProperty("feedback").GetInt32());

        // Support invariants
        Assert.Equal(support.GetProperty("unresolved").GetInt32(),
            support.GetProperty("open").GetInt32() + support.GetProperty("inProgress").GetInt32());

        await app.StopAsync();
    }

    [Fact]
    public async Task Instructor_ReceivesLegacyPlatformResponse_WithoutAdminSummary()
    {
        var app = await StartSummaryApp();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var instructor = new User { Id = Guid.NewGuid(), FullName = "Prof Smith", Email = "prof@eduflow.ai", Role = UserRole.Instructor, IsActive = true };
        db.Users.Add(instructor);
        await db.SaveChangesAsync();

        var client = CreateClient(app, "Instructor", instructor.Id);
        var response = await client.GetAsync("/api/analytics/platform");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Legacy fields must exist
        Assert.True(json.TryGetProperty("totalUsers", out _));
        Assert.True(json.TryGetProperty("totalStudents", out _));
        Assert.True(json.TryGetProperty("totalCourses", out _));

        // Admin extension MUST NOT be present in instructor response
        Assert.False(json.TryGetProperty("adminSummary", out _));

        await app.StopAsync();
    }

    [Fact]
    public async Task Student_IsDenied_With403Forbidden()
    {
        var app = await StartSummaryApp();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var student = new User { Id = Guid.NewGuid(), FullName = "Alice Student", Email = "alice@eduflow.ai", Role = UserRole.Student, IsActive = true };
        db.Users.Add(student);
        await db.SaveChangesAsync();

        var client = CreateClient(app, "Student", student.Id);
        var response = await client.GetAsync("/api/analytics/platform");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await app.StopAsync();
    }

    [Fact]
    public async Task StaleInactiveAdmin_IsDenied_With403Forbidden()
    {
        var app = await StartSummaryApp();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var inactiveAdmin = new User { Id = Guid.NewGuid(), FullName = "Ex Admin", Email = "exadmin@eduflow.ai", Role = UserRole.Admin, IsActive = false };
        db.Users.Add(inactiveAdmin);
        await db.SaveChangesAsync();

        var client = CreateClient(app, "Admin", inactiveAdmin.Id);
        var response = await client.GetAsync("/api/analytics/platform");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await app.StopAsync();
    }

    [Fact]
    public async Task NonExistentAdmin_IsDenied_With401Unauthorized()
    {
        var app = await StartSummaryApp();
        var client = CreateClient(app, "Admin", Guid.NewGuid());
        var response = await client.GetAsync("/api/analytics/platform");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await app.StopAsync();
    }

    [Fact]
    public async Task SupportMetrics_WhenEmpty_ReturnsZeroCountsAndAvailable()
    {
        var app = await StartSummaryApp();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var admin = new User { Id = Guid.NewGuid(), FullName = "Admin User", Email = "admin@eduflow.ai", Role = UserRole.Admin, IsActive = true };
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        var client = CreateClient(app, "Admin", admin.Id);
        var response = await client.GetAsync("/api/analytics/platform");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.True(json.TryGetProperty("adminSummary", out var summary));
        var support = summary.GetProperty("support");
        Assert.Equal("Available", summary.GetProperty("supportAvailability").GetString());
        Assert.Equal(0, support.GetProperty("total").GetInt32());
        Assert.Equal(0, support.GetProperty("open").GetInt32());
        Assert.Equal(0, support.GetProperty("inProgress").GetInt32());
        Assert.Equal(0, support.GetProperty("resolved").GetInt32());
        Assert.Equal(0, support.GetProperty("unresolved").GetInt32());

        await app.StopAsync();
    }
}
