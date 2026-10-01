using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using EduFlow.Api.Controllers;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using EduFlow.Infrastructure.Services.Evaluation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EduFlow.Tests;

/// <summary>
/// End-to-end execution of the mandatory acceptance scenario over real HTTP:
/// Instructor A owns Course A, Instructor B owns Course B, Student A requests
/// enrollment in Course A, only Instructor A / an Admin may approve it, approved
/// students reach their own course and nothing else, and every write path is
/// ownership-checked server-side. Course create/edit/publish/delete is covered
/// here because no other suite exercises PUT /api/courses/{id}.
/// </summary>
public class MandatoryScenarioTests
{
    // ── Harness ────────────────────────────────────────────────────────────────
    private static async Task<WebApplication> StartApp()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = "Testing",
            ContentRootPath = Path.GetTempPath()
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JwtSettings:Secret"] = "mandatory-scenario-test-secret-32-chars-min"
        });

        var databaseName = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(databaseName));

        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddScoped<IGamificationService, GamificationService>();
        builder.Services.AddScoped<IAssessmentAccessService, AssessmentAccessService>();
        builder.Services.AddScoped<IAttemptService, AttemptService>();
        builder.Services.AddSingleton<IEvaluationService>(_ => new EvaluationService(EvaluationService.DefaultEvaluators()));
        builder.Services.AddScoped<IAttemptGradingService, AttemptGradingService>();
        builder.Services.AddScoped<IGradeService, GradeService>();
        builder.Services.AddScoped<IProgressService, ProgressService>();
        builder.Services.AddScoped<IAuditLogWriter, AuditLogWriter>();
        builder.Services.AddScoped<IRatingService, RatingService>();
        builder.Services.AddScoped<IPaymentVerificationService, PaymentVerificationService>();
        builder.Services.AddHttpClient<IAiGatewayClient, AiGatewayClient>();

        builder.Services.AddAuthentication("MandatoryScenario")
            .AddScheme<AuthenticationSchemeOptions, MandatoryScenarioAuthHandler>("MandatoryScenario", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddControllers().AddApplicationPart(typeof(CoursesController).Assembly);

        var app = builder.Build();
        app.UseDeveloperExceptionPage();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync();
        return app;
    }

    private static HttpClient CreateClient(WebApplication app, string? role, Guid? actorId)
    {
        var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
        var client = new HttpClient { BaseAddress = new Uri(addresses.Addresses.Single()) };
        if (role != null) client.DefaultRequestHeaders.Add("X-Test-Role", role);
        if (actorId != null) client.DefaultRequestHeaders.Add("X-Test-UserId", actorId.ToString());
        return client;
    }

    public sealed class MandatoryScenarioAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public MandatoryScenarioAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var role = Request.Headers["X-Test-Role"].ToString();
            if (string.IsNullOrEmpty(role)) return Task.FromResult(AuthenticateResult.NoResult());

            var actorId = Request.Headers["X-Test-UserId"].FirstOrDefault()
                ?? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
            var identity = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.NameIdentifier, actorId)
            }, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
        }
    }

    // ── Seed ───────────────────────────────────────────────────────────────────
    private sealed record Seed(Guid InstructorA, Guid InstructorB, Guid StudentA, Guid StudentB, Guid Admin);

    private static async Task<Seed> SeedUsers(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var instructorA = NewUser("Instructor A", "instructor.a@test.local", UserRole.Instructor);
        var instructorB = NewUser("Instructor B", "instructor.b@test.local", UserRole.Instructor);
        var studentA = NewUser("Student A", "student.a@test.local", UserRole.Student);
        var studentB = NewUser("Student B", "student.b@test.local", UserRole.Student);
        var admin = NewUser("Administrator", "admin.a@test.local", UserRole.Admin);

        db.Users.AddRange(instructorA, instructorB, studentA, studentB, admin);
        await db.SaveChangesAsync();

        return new Seed(instructorA.Id, instructorB.Id, studentA.Id, studentB.Id, admin.Id);
    }

    private static User NewUser(string fullName, string email, UserRole role) => new()
    {
        FullName = fullName,
        Email = email,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!", workFactor: 4),
        Role = role,
        IsActive = true
    };

    private sealed record CreatedCourse(Guid Id, string Code, string Title, bool IsPublished, Guid InstructorId, string Status);

    private static async Task<CreatedCourse> CreateCourse(HttpClient client, string code, string title)
    {
        var response = await client.PostAsJsonAsync("/api/courses", new
        {
            code,
            title,
            description = $"{title} — created by the mandatory scenario suite.",
            category = "Computer Science",
            thumbnailUrl = (string?)null,
            term = "Fall 2026",
            difficulty = "Medium",
            durationHours = 8,
            price = 0,
            isFree = true
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return new CreatedCourse(
            json.RootElement.GetProperty("id").GetGuid(),
            json.RootElement.GetProperty("code").GetString()!,
            json.RootElement.GetProperty("title").GetString()!,
            json.RootElement.GetProperty("isPublished").GetBoolean(),
            json.RootElement.GetProperty("instructorId").GetGuid(),
            json.RootElement.GetProperty("status").GetString()!);
    }

    private static async Task<JsonDocument> ReadJson(HttpClient client, string url)
        => JsonDocument.Parse(await client.GetStringAsync(url));

    private static async Task<int> CountEnrollments(WebApplication app, Guid courseId, Guid studentId)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.Enrollments.CountAsync(e => e.CourseId == courseId && e.StudentId == studentId);
    }

    // ── 1. Course create / edit / publish / delete with ownership ─────────────

    [Fact]
    public async Task CreateCourse_TakesOwnershipFromCallerAndStartsAsDraft()
    {
        await using var app = await StartApp();
        var seed = await SeedUsers(app);
        var instructorA = CreateClient(app, "Instructor", seed.InstructorA);

        var course = await CreateCourse(instructorA, "MAND-A", "Instructor A Course");

        Assert.Equal(seed.InstructorA, course.InstructorId);
        Assert.False(course.IsPublished);
        Assert.Equal("Draft", course.Status);
    }

    [Fact]
    public async Task UpdateCourse_OwnCourse_PersistsEditsAndKeepsOwnershipImmutable()
    {
        await using var app = await StartApp();
        var seed = await SeedUsers(app);
        var instructorA = CreateClient(app, "Instructor", seed.InstructorA);

        var course = await CreateCourse(instructorA, "MAND-EDIT", "Original Title");

        var response = await instructorA.PutAsJsonAsync($"/api/courses/{course.Id}", new
        {
            code = "MAND-EDIT-2",
            title = "Edited Title",
            description = "Now with a longer description.",
            category = "Data Engineering",
            thumbnailUrl = "https://example.test/thumb.png",
            term = "Spring 2027",
            difficulty = "Hard",
            durationHours = 12,
            price = 0,
            isFree = true,
            // Hostile payload: attempts to steal ownership through the request body.
            instructorId = seed.InstructorB
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Edited Title", json.RootElement.GetProperty("title").GetString());
        Assert.Equal("MAND-EDIT-2", json.RootElement.GetProperty("code").GetString());
        Assert.Equal(seed.InstructorA, json.RootElement.GetProperty("instructorId").GetGuid());

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.Courses.SingleAsync(c => c.Id == course.Id);
        Assert.Equal(seed.InstructorA, stored.InstructorId);
        Assert.Equal("Edited Title", stored.Title);
        Assert.Equal("Data Engineering", stored.Category);
    }

    [Fact]
    public async Task UpdateCourse_ForeignCourse_ReturnsForbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedUsers(app);
        var instructorA = CreateClient(app, "Instructor", seed.InstructorA);
        var instructorB = CreateClient(app, "Instructor", seed.InstructorB);

        var courseA = await CreateCourse(instructorA, "MAND-OWN-A", "Owned By A");

        var response = await instructorB.PutAsJsonAsync($"/api/courses/{courseA.Id}", new
        {
            code = courseA.Code,
            title = "Hijacked Title",
            description = "Should never be written.",
            category = "Computer Science",
            thumbnailUrl = (string?)null,
            term = "Fall 2026",
            difficulty = "Medium",
            durationHours = 1,
            price = 0,
            isFree = true
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.Courses.SingleAsync(c => c.Id == courseA.Id);
        Assert.Equal("Owned By A", stored.Title);
    }

    [Fact]
    public async Task UpdateCourse_DuplicateCode_ReturnsConflict_AndEmptyTitleReturnsBadRequest()
    {
        await using var app = await StartApp();
        var seed = await SeedUsers(app);
        var instructorA = CreateClient(app, "Instructor", seed.InstructorA);
        var instructorB = CreateClient(app, "Instructor", seed.InstructorB);

        var courseA = await CreateCourse(instructorA, "MAND-CODE-A", "Course A");
        var courseB = await CreateCourse(instructorB, "MAND-CODE-B", "Course B");

        var clash = await instructorA.PutAsJsonAsync($"/api/courses/{courseA.Id}", new
        {
            code = courseB.Code,
            title = "Clashing code",
            description = "",
            category = "Computer Science",
            thumbnailUrl = (string?)null,
            term = "Fall 2026",
            difficulty = "Medium",
            durationHours = 1,
            price = 0,
            isFree = true
        });
        Assert.Equal(HttpStatusCode.Conflict, clash.StatusCode);

        // Keeping your own code on your own course must still succeed.
        var keepOwnCode = await instructorA.PutAsJsonAsync($"/api/courses/{courseA.Id}", new
        {
            code = courseA.Code,
            title = "Still fine",
            description = "",
            category = "Computer Science",
            thumbnailUrl = (string?)null,
            term = "Fall 2026",
            difficulty = "Medium",
            durationHours = 1,
            price = 0,
            isFree = true
        });
        Assert.Equal(HttpStatusCode.OK, keepOwnCode.StatusCode);

        var blank = await instructorA.PutAsJsonAsync($"/api/courses/{courseA.Id}", new
        {
            code = "   ",
            title = "",
            description = "",
            category = "Computer Science",
            thumbnailUrl = (string?)null,
            term = "Fall 2026",
            difficulty = "Medium",
            durationHours = 1,
            price = 0,
            isFree = true
        });
        Assert.Equal(HttpStatusCode.BadRequest, blank.StatusCode);
    }

    [Fact]
    public async Task UpdateCourse_NeverFlipsPublishState()
    {
        await using var app = await StartApp();
        var seed = await SeedUsers(app);
        var instructorA = CreateClient(app, "Instructor", seed.InstructorA);

        var course = await CreateCourse(instructorA, "MAND-PUB", "Publish Me");
        var publish = await instructorA.PostAsJsonAsync($"/api/courses/{course.Id}/publish",
            new { isPublished = true });
        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);

        var edit = await instructorA.PutAsJsonAsync($"/api/courses/{course.Id}", new
        {
            code = course.Code,
            title = "Renamed After Publish",
            description = "desc",
            category = "Computer Science",
            thumbnailUrl = (string?)null,
            term = "Fall 2026",
            difficulty = "Medium",
            durationHours = 3,
            price = 0,
            isFree = true
        });
        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.Courses.SingleAsync(c => c.Id == course.Id);
        Assert.True(stored.IsPublished);
        Assert.Equal("Published", stored.Status);
        Assert.Equal("Renamed After Publish", stored.Title);
    }

    [Fact]
    public async Task DeleteCourse_ForeignCourse_ReturnsForbidden_OwnCourseDeletes()
    {
        await using var app = await StartApp();
        var seed = await SeedUsers(app);
        var instructorA = CreateClient(app, "Instructor", seed.InstructorA);
        var instructorB = CreateClient(app, "Instructor", seed.InstructorB);

        var courseA = await CreateCourse(instructorA, "MAND-DEL-A", "Keep Me");
        var courseB = await CreateCourse(instructorB, "MAND-DEL-B", "Delete Me");

        var denied = await instructorA.DeleteAsync($"/api/courses/{courseB.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.True(await db.Courses.AnyAsync(c => c.Id == courseB.Id));
        }

        var allowed = await instructorB.DeleteAsync($"/api/courses/{courseB.Id}");
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.False(await db.Courses.AnyAsync(c => c.Id == courseB.Id));
            Assert.True(await db.Courses.AnyAsync(c => c.Id == courseA.Id));
        }
    }

    // ── 2. The mandatory cross-role scenario, end to end ───────────────────────

    [Fact]
    public async Task MandatoryScenario_TwoInstructorsTwoStudents_EnforcesOwnershipApprovalAndAccess()
    {
        await using var app = await StartApp();
        var seed = await SeedUsers(app);

        var instructorA = CreateClient(app, "Instructor", seed.InstructorA);
        var instructorB = CreateClient(app, "Instructor", seed.InstructorB);
        var studentA = CreateClient(app, "Student", seed.StudentA);
        var studentB = CreateClient(app, "Student", seed.StudentB);
        var admin = CreateClient(app, "Admin", seed.Admin);
        var anonymous = CreateClient(app, null, null);

        // 1 — each instructor creates and publishes their own course.
        var courseA = await CreateCourse(instructorA, "SCEN-A", "Course A");
        var courseB = await CreateCourse(instructorB, "SCEN-B", "Course B");

        Assert.Equal(HttpStatusCode.OK,
            (await instructorA.PostAsJsonAsync($"/api/courses/{courseA.Id}/publish", new { isPublished = true })).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await instructorB.PostAsJsonAsync($"/api/courses/{courseB.Id}/publish", new { isPublished = true })).StatusCode);

        // 2 — cross-instructor mutation is refused for edit, publish and delete.
        foreach (var (client, foreign) in new[] { (instructorA, courseB), (instructorB, courseA) })
        {
            var edit = await client.PutAsJsonAsync($"/api/courses/{foreign.Id}", new
            {
                code = foreign.Code,
                title = "Tampered",
                description = "",
                category = "Computer Science",
                thumbnailUrl = (string?)null,
                term = "Fall 2026",
                difficulty = "Medium",
                durationHours = 1,
                price = 0,
                isFree = true
            });
            Assert.Equal(HttpStatusCode.Forbidden, edit.StatusCode);

            Assert.Equal(HttpStatusCode.Forbidden,
                (await client.PostAsJsonAsync($"/api/courses/{foreign.Id}/publish", new { isPublished = false })).StatusCode);

            Assert.Equal(HttpStatusCode.Forbidden,
                (await client.DeleteAsync($"/api/courses/{foreign.Id}")).StatusCode);

            // Curriculum writes are ownership-checked too.
            Assert.Equal(HttpStatusCode.Forbidden,
                (await client.PostAsJsonAsync($"/api/courses/{foreign.Id}/modules",
                    new { title = "Injected", description = "", orderIndex = 1 })).StatusCode);
        }

        // 3 — each instructor's dashboard only lists their own course.
        foreach (var (client, expected, other) in new[]
                 {
                     (instructorA, courseA.Id, courseB.Id),
                     (instructorB, courseB.Id, courseA.Id)
                 })
        {
            var payload = await ReadJson(client, "/api/instructor/courses");
            var ids = payload.RootElement.EnumerateArray().Select(e => e.GetProperty("id").GetGuid()).ToList();
            Assert.Contains(expected, ids);
            Assert.DoesNotContain(other, ids);
        }

        // 4 — Student A requests enrollment in Course A (duplicate request stays one row).
        var enroll1 = await studentA.PostAsJsonAsync($"/api/courses/{courseA.Id}/enroll", new { });
        Assert.Equal(HttpStatusCode.OK, enroll1.StatusCode);
        var enrollJson = JsonDocument.Parse(await enroll1.Content.ReadAsStringAsync());
        Assert.Equal("Pending", enrollJson.RootElement.GetProperty("status").GetString());
        var enrollmentId = enrollJson.RootElement.GetProperty("enrollmentId").GetGuid();

        var enroll2 = await studentA.PostAsJsonAsync($"/api/courses/{courseA.Id}/enroll", new { });
        Assert.Equal(HttpStatusCode.OK, enroll2.StatusCode);
        Assert.Equal(1, await CountEnrollments(app, courseA.Id, seed.StudentA));

        // 5 — nobody but Instructor A or an Admin may approve.
        Assert.Equal(HttpStatusCode.Forbidden,
            (await studentA.PostAsJsonAsync($"/api/instructor/enrollment-requests/{enrollmentId}/approve", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await studentB.PostAsJsonAsync($"/api/instructor/enrollment-requests/{enrollmentId}/approve", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await instructorB.PostAsJsonAsync($"/api/instructor/enrollment-requests/{enrollmentId}/approve", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.PostAsJsonAsync($"/api/instructor/enrollment-requests/{enrollmentId}/approve", new { })).StatusCode);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var row = await db.Enrollments.SingleAsync(e => e.Id == enrollmentId);
            Assert.Equal(EnrollmentStatus.Pending, row.Status);
        }

        // 6 — unapproved students cannot reach protected materials.
        Assert.Equal(HttpStatusCode.Forbidden,
            (await studentA.GetAsync($"/api/courses/{courseA.Id}/modules")).StatusCode);
        var pendingAccess = await ReadJson(studentA, $"/api/courses/{courseA.Id}/access");
        Assert.False(pendingAccess.RootElement.GetProperty("hasAccess").GetBoolean());

        // The course is listed with a PENDING status (so the UI can show the request),
        // but it must not be reported as accessible, and Course B must never appear.
        var pendingCourses = await ReadJson(studentA, "/api/students/me/courses");
        var pendingList = pendingCourses.RootElement.EnumerateArray().ToList();
        Assert.DoesNotContain(courseB.Id, pendingList.Select(e => e.GetProperty("courseId").GetGuid()));
        var pendingEntry = pendingList.Single(e => e.GetProperty("courseId").GetGuid() == courseA.Id);
        Assert.Equal("Pending", pendingEntry.GetProperty("status").GetString());

        // 7 — Instructor A approves.
        var approve = await instructorA.PostAsJsonAsync($"/api/instructor/enrollment-requests/{enrollmentId}/approve", new { });
        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);

        // Re-approving a decided request is refused.
        Assert.Equal(HttpStatusCode.Conflict,
            (await instructorA.PostAsJsonAsync($"/api/instructor/enrollment-requests/{enrollmentId}/approve", new { })).StatusCode);

        // 8 — Student A now reaches Course A only.
        Assert.Equal(HttpStatusCode.OK,
            (await studentA.GetAsync($"/api/courses/{courseA.Id}/modules")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await studentA.GetAsync($"/api/courses/{courseB.Id}/modules")).StatusCode);

        var myCourses = await ReadJson(studentA, "/api/students/me/courses");
        var enrolledIds = myCourses.RootElement.EnumerateArray()
            .Select(e => e.GetProperty("courseId").GetGuid()).ToList();
        Assert.Contains(courseA.Id, enrolledIds);
        Assert.DoesNotContain(courseB.Id, enrolledIds);

        var approvedAccess = await ReadJson(studentA, $"/api/courses/{courseA.Id}/access");
        Assert.True(approvedAccess.RootElement.GetProperty("hasAccess").GetBoolean());
        var foreignAccess = await ReadJson(studentA, $"/api/courses/{courseB.Id}/access");
        Assert.False(foreignAccess.RootElement.GetProperty("hasAccess").GetBoolean());

        // 9 — reviews are only accepted from eligible students.
        Assert.True((await studentA.PostAsJsonAsync($"/api/courses/{courseA.Id}/reviews",
            new { rating = 5, comment = "Approved student review." })).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await studentA.PostAsJsonAsync($"/api/courses/{courseB.Id}/reviews",
                new { rating = 1, comment = "Not enrolled here." })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await studentB.PostAsJsonAsync($"/api/courses/{courseA.Id}/reviews",
                new { rating = 1, comment = "Never approved." })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await instructorA.PostAsJsonAsync($"/api/courses/{courseA.Id}/reviews",
                new { rating = 5, comment = "Instructor rating himself." })).StatusCode);

        // 10 — anonymous callers are rejected outright.
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/students/me/courses")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/instructor/courses")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync($"/api/courses/{courseA.Id}/enroll", new { })).StatusCode);

        // 11 — an Admin may approve a request on somebody else's course.
        var studentBRequest = await studentB.PostAsJsonAsync($"/api/courses/{courseB.Id}/enroll", new { });
        var studentBJson = JsonDocument.Parse(await studentBRequest.Content.ReadAsStringAsync());
        var studentBEnrollmentId = studentBJson.RootElement.GetProperty("enrollmentId").GetGuid();

        var adminView = await ReadJson(admin, "/api/instructor/enrollment-requests?status=pending");
        Assert.Contains(adminView.RootElement.EnumerateArray(),
            e => e.GetProperty("enrollmentId").GetGuid() == studentBEnrollmentId);

        Assert.Equal(HttpStatusCode.OK,
            (await admin.PostAsJsonAsync($"/api/instructor/enrollment-requests/{studentBEnrollmentId}/approve", new { })).StatusCode);

        // Instructor B must not be able to approve on Instructor A's course even now.
        var secondOnA = await studentB.PostAsJsonAsync($"/api/courses/{courseA.Id}/enroll", new { });
        var secondOnAJson = JsonDocument.Parse(await secondOnA.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Forbidden,
            (await instructorB.PostAsJsonAsync(
                $"/api/instructor/enrollment-requests/{secondOnAJson.RootElement.GetProperty("enrollmentId").GetGuid()}/approve",
                new { })).StatusCode);
    }

    // ── 3. Isolation, duplicates and concurrency ───────────────────────────────

    [Fact]
    public async Task TwoStudents_SimultaneousSessions_NeverSeeEachOthersData()
    {
        await using var app = await StartApp();
        var seed = await SeedUsers(app);

        var instructorA = CreateClient(app, "Instructor", seed.InstructorA);
        var studentA = CreateClient(app, "Student", seed.StudentA);
        var studentB = CreateClient(app, "Student", seed.StudentB);

        var course = await CreateCourse(instructorA, "ISO-A", "Isolation Course");
        await instructorA.PostAsJsonAsync($"/api/courses/{course.Id}/publish", new { isPublished = true });

        var requestA = await studentA.PostAsJsonAsync($"/api/courses/{course.Id}/enroll", new { });
        var idA = JsonDocument.Parse(await requestA.Content.ReadAsStringAsync())
            .RootElement.GetProperty("enrollmentId").GetGuid();
        await instructorA.PostAsJsonAsync($"/api/instructor/enrollment-requests/{idA}/approve", new { });

        // Student A is enrolled, Student B is not — in two parallel client sessions.
        var tasks = Enumerable.Range(0, 20).Select(async i =>
        {
            var client = i % 2 == 0 ? studentA : studentB;
            var url = i % 2 == 0
                ? $"/api/courses/{course.Id}/access"
                : "/api/students/me/courses";
            using var response = await client.GetAsync(url);
            return (index: i, status: response.StatusCode, body: await response.Content.ReadAsStringAsync());
        });
        var results = (await Task.WhenAll(tasks)).OrderBy(r => r.index).ToList();

        foreach (var result in results)
        {
            Assert.Equal(HttpStatusCode.OK, result.status);
            if (result.index % 2 == 0)
            {
                Assert.True(JsonDocument.Parse(result.body).RootElement.GetProperty("hasAccess").GetBoolean());
            }
            else
            {
                Assert.Empty(JsonDocument.Parse(result.body).RootElement.EnumerateArray());
            }
        }

        // Persisted state survives fresh sessions (logout/login/page refresh equivalent).
        var freshA = CreateClient(app, "Student", seed.StudentA);
        var freshB = CreateClient(app, "Student", seed.StudentB);
        var recheckA = await ReadJson(freshA, $"/api/courses/{course.Id}/access");
        var recheckB = await ReadJson(freshB, "/api/students/me/courses");
        Assert.True(recheckA.RootElement.GetProperty("hasAccess").GetBoolean());
        Assert.Empty(recheckB.RootElement.EnumerateArray());

        // Ratings are attributed to the right student on the right course.
        await studentA.PostAsJsonAsync($"/api/courses/{course.Id}/reviews", new { rating = 5, comment = "A" });
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var reviews = await db.CourseReviews.Where(r => r.CourseId == course.Id).ToListAsync();
            Assert.Single(reviews);
            Assert.Equal(seed.StudentA, reviews[0].StudentId);
            Assert.Equal(1, await db.Enrollments.CountAsync(e => e.CourseId == course.Id));
        }
    }

    [Fact]
    public async Task ConcurrentEnrollmentApprovals_LeaveASingleConsistentRow()
    {
        await using var app = await StartApp();
        var seed = await SeedUsers(app);

        var instructorA = CreateClient(app, "Instructor", seed.InstructorA);
        var studentA = CreateClient(app, "Student", seed.StudentA);

        var course = await CreateCourse(instructorA, "RACE-A", "Race Course");
        await instructorA.PostAsJsonAsync($"/api/courses/{course.Id}/publish", new { isPublished = true });

        // Four students enroll concurrently (one distinct row each); the unique
        // (CourseId, StudentId) index plus the service's re-use path must keep the
        // table at exactly four rows even though every student also resubmits.
        var students = new[]
        {
            NewUser("Racer 1", "racer1@test.local", UserRole.Student),
            NewUser("Racer 2", "racer2@test.local", UserRole.Student),
            NewUser("Racer 3", "racer3@test.local", UserRole.Student),
            NewUser("Racer 4", "racer4@test.local", UserRole.Student)
        };
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Users.AddRange(students);
            await db.SaveChangesAsync();
        }

        var enrollmentIds = new List<Guid>();
        foreach (var s in students)
        {
            var client = CreateClient(app, "Student", s.Id);

            // One request at a time for a single student: the service must collapse
            // repeated attempts onto the one (CourseId, StudentId) row.
            var first = await client.PostAsJsonAsync($"/api/courses/{course.Id}/enroll", new { });
            Assert.Equal(HttpStatusCode.OK, first.StatusCode);
            var enrollmentId = JsonDocument.Parse(await first.Content.ReadAsStringAsync())
                .RootElement.GetProperty("enrollmentId").GetGuid();

            for (var attempt = 0; attempt < 3; attempt++)
            {
                var repeat = await client.PostAsJsonAsync($"/api/courses/{course.Id}/enroll", new { });
                Assert.Equal(HttpStatusCode.OK, repeat.StatusCode);
                var repeatId = JsonDocument.Parse(await repeat.Content.ReadAsStringAsync())
                    .RootElement.GetProperty("enrollmentId").GetGuid();
                Assert.Equal(enrollmentId, repeatId);
            }

            enrollmentIds.Add(enrollmentId);
        }

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.Equal(4, await db.Enrollments.CountAsync(e => e.CourseId == course.Id));
        }

        // Two approval decisions race on the first request; no duplicate row may appear.
        var target = enrollmentIds[0];
        var approvals = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ =>
            instructorA.PostAsJsonAsync($"/api/instructor/enrollment-requests/{target}/approve", new { })));

        Assert.All(approvals, a => Assert.True(
            a.StatusCode is HttpStatusCode.OK or HttpStatusCode.Conflict,
            $"Unexpected approval status {(int)a.StatusCode}"));

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var row = await db.Enrollments.SingleAsync(e => e.Id == target);
            Assert.Equal(EnrollmentStatus.Active, row.Status);
            Assert.NotNull(row.ReviewedAt);
            Assert.Equal(4, await db.Enrollments.CountAsync(e => e.CourseId == course.Id));
        }

        // The approving instructor is recorded as an authorized reviewer.
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var row = await db.Enrollments.SingleAsync(e => e.Id == target);
            Assert.Equal(seed.InstructorA, row.ReviewedByInstructorId);
        }

        // A student who never enrolled still owns nothing on this course.
        Assert.Equal(HttpStatusCode.NotFound,
            (await studentA.DeleteAsync($"/api/courses/{course.Id}/enroll")).StatusCode);
    }

    [Fact]
    public async Task UnauthenticatedRequests_AreRejectedAcrossEveryProtectedSurface()
    {
        await using var app = await StartApp();
        var seed = await SeedUsers(app);
        var instructorA = CreateClient(app, "Instructor", seed.InstructorA);
        var course = await CreateCourse(instructorA, "401-A", "Auth Required");
        await instructorA.PostAsJsonAsync($"/api/courses/{course.Id}/publish", new { isPublished = true });

        var anonymous = CreateClient(app, null, null);

        var protectedGet = new[]
        {
            "/api/students/me/courses",
            "/api/students/me/enrollment-requests",
            "/api/instructor/courses",
            "/api/instructor/dashboard",
            "/api/instructor/enrollment-requests",
            "/api/auth/me"
        };
        foreach (var url in protectedGet)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(url)).StatusCode);
        }

        // A request that carries a user identity but no role claim is still rejected.
        var roleless = CreateClient(app, null, seed.Admin);
        Assert.Equal(HttpStatusCode.Unauthorized, (await roleless.GetAsync("/api/admin/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await roleless.GetAsync("/api/instructor/courses")).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.PostAsJsonAsync($"/api/courses/{course.Id}/enroll", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.PostAsJsonAsync("/api/courses", new
            {
                code = "NOPE", title = "Nope", description = "", category = "X",
                thumbnailUrl = (string?)null, term = "Fall 2026", difficulty = "Medium",
                durationHours = 1, price = 0, isFree = true
            })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.DeleteAsync($"/api/courses/{course.Id}")).StatusCode);
    }
}
