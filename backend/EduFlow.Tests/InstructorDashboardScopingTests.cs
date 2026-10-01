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
/// Security coverage for the instructor-specific dashboard:
/// every /api/instructor/* response is scoped to the caller's own courses, every
/// course-modification endpoint enforces ownership server-side, and ownership of a
/// newly created course can only ever come from the authenticated JWT.
/// </summary>
public class InstructorDashboardScopingTests
{
    // ── Harness ────────────────────────────────────────────────────────────────
    private static async Task<WebApplication> StartApp()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = "Testing",
            ContentRootPath = System.IO.Path.GetTempPath()
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JwtSettings:Secret"] = "instructor-dashboard-scoping-test-secret-32+"
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
        builder.Services.AddScoped<IAuditLogWriter, AuditLogWriter>();
        builder.Services.AddScoped<IRatingService, RatingService>();
        builder.Services.AddScoped<IPaymentVerificationService, PaymentVerificationService>();
        builder.Services.AddHttpClient<IAiGatewayClient, AiGatewayClient>();

        builder.Services.AddAuthentication("ScopingTest")
            .AddScheme<AuthenticationSchemeOptions, ScopingTestAuthHandler>("ScopingTest", _ => { });
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

    public sealed class ScopingTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public ScopingTestAuthHandler(
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
    private sealed record Seed(Guid InstructorA, Guid InstructorB, Guid Student, Guid Admin, Guid CourseA, Guid CourseB);

    private static async Task<Seed> SeedScenario(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var instructorA = NewUser("Ada Lovelace", "ada@test.local", UserRole.Instructor);
        var instructorB = NewUser("Grace Hopper", "grace@test.local", UserRole.Instructor);
        var student = NewUser("Alan Turing", "alan@test.local", UserRole.Student);
        var admin = NewUser("Platform Admin", "admin@test.local", UserRole.Admin);

        var courseA = NewCourse("CS-101", "Ada's Course", instructorA.Id, published: true);
        var courseB = NewCourse("CS-202", "Grace's Course", instructorB.Id, published: true);

        db.Users.AddRange(instructorA, instructorB, student, admin);
        db.Courses.AddRange(courseA, courseB);
        await db.SaveChangesAsync();

        // One pending enrollment on each course so scoping has something to hide.
        db.Enrollments.AddRange(
            new Enrollment { CourseId = courseA.Id, StudentId = student.Id, Status = EnrollmentStatus.Pending, RequestedAt = DateTime.UtcNow },
            new Enrollment { CourseId = courseB.Id, StudentId = student.Id, Status = EnrollmentStatus.Pending, RequestedAt = DateTime.UtcNow });
        db.CourseReviews.Add(new CourseReview
        {
            CourseId = courseB.Id,
            StudentId = student.Id,
            Rating = 5,
            Comment = "Only on Grace's course.",
            Status = ReviewStatus.Approved
        });
        await db.SaveChangesAsync();

        return new Seed(instructorA.Id, instructorB.Id, student.Id, admin.Id, courseA.Id, courseB.Id);
    }

    private static User NewUser(string fullName, string email, UserRole role) => new()
    {
        FullName = fullName,
        Email = email,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!", workFactor: 4),
        Role = role,
        IsActive = true
    };

    private static Course NewCourse(string code, string title, Guid instructorId, bool published) => new()
    {
        Code = code,
        Title = title,
        Description = "Seed course used by scoping tests.",
        Category = "Computer Science",
        InstructorId = instructorId,
        IsPublished = published,
        IsFree = true,
        Price = 0m,
        Status = published ? "Published" : "Draft"
    };

    private static async Task<T?> ReadJson<T>(HttpResponseMessage response) where T : class
    {
        var body = await response.Content.ReadAsStringAsync();
        return string.IsNullOrWhiteSpace(body) ? null : JsonSerializer.Deserialize<T>(body, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    private sealed class CoursesPayload { public List<CourseRow>? Courses { get; set; } }
    private sealed class CourseRow { public Guid Id { get; set; } public string? Code { get; set; } }

    private sealed class DashboardPayload
    {
        public StatsRow? Stats { get; set; }
        public List<CourseRow>? Courses { get; set; }
    }
    private sealed class StatsRow { public int TotalCourses { get; set; } public int PendingEnrollmentRequests { get; set; } }

    private sealed class RequestsPayload : List<RequestRow> { }
    private sealed class RequestRow { public Guid CourseId { get; set; } }

    private sealed class StudentsPayload : List<StudentRow> { }
    private sealed class StudentRow { public Guid CourseId { get; set; } }

    private sealed class ReviewsPayload : List<ReviewRow> { }
    private sealed class ReviewRow { public Guid CourseId { get; set; } }

    // ── /api/instructor/* scoping ──────────────────────────────────────────────

    [Fact]
    public async Task InstructorCourses_ReturnOnlyCoursesOwnedByCaller()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorA);

        var response = await client.GetAsync("/api/instructor/courses");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await ReadJson<List<CourseRow>>(response) ?? new List<CourseRow>();
        Assert.Single(payload);
        Assert.Equal(seed.CourseA, payload[0].Id);
        Assert.DoesNotContain(payload, c => c.Id == seed.CourseB);
    }

    [Fact]
    public async Task InstructorDashboard_StatsAndCardsAreScopedToCaller()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorB);

        var response = await client.GetAsync("/api/instructor/dashboard");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await ReadJson<DashboardPayload>(response);
        Assert.NotNull(payload);
        Assert.Equal(1, payload!.Stats!.TotalCourses);
        Assert.Equal(1, payload.Stats.PendingEnrollmentRequests);
        Assert.Single(payload.Courses!);
        Assert.DoesNotContain(payload.Courses!, c => c.Id == seed.CourseA);
    }

    [Fact]
    public async Task InstructorCourseDetail_ForeignCourse_ReturnsForbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorA);

        var own = await client.GetAsync($"/api/instructor/courses/{seed.CourseA}");
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);

        var foreign = await client.GetAsync($"/api/instructor/courses/{seed.CourseB}");
        Assert.Equal(HttpStatusCode.Forbidden, foreign.StatusCode);
    }

    [Fact]
    public async Task InstructorEnrollmentRequests_OnlyOwnCoursesAreReturned()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorA);

        var response = await client.GetAsync("/api/instructor/enrollment-requests");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await ReadJson<RequestsPayload>(response) ?? new RequestsPayload();
        Assert.Single(payload);
        Assert.Equal(seed.CourseA, payload[0].CourseId);
    }

    [Fact]
    public async Task InstructorEnrollmentRequests_CourseFilterOutsideOwnership_ReturnsForbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorA);

        var foreign = await client.GetAsync($"/api/instructor/enrollment-requests?courseId={seed.CourseB}");
        Assert.Equal(HttpStatusCode.Forbidden, foreign.StatusCode);
    }

    [Fact]
    public async Task InstructorStudents_OnlyOwnCourseRosterIsVisible()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorA);

        var response = await client.GetAsync("/api/instructor/students");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await ReadJson<StudentsPayload>(response) ?? new StudentsPayload();
        Assert.All(payload, s => Assert.Equal(seed.CourseA, s.CourseId));
        Assert.DoesNotContain(payload, s => s.CourseId == seed.CourseB);
    }

    [Fact]
    public async Task InstructorReviews_OnlyOwnCourseReviewsAreVisible()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorB);

        var ownReviews = await client.GetAsync("/api/instructor/reviews");
        Assert.Equal(HttpStatusCode.OK, ownReviews.StatusCode);
        var payload = await ReadJson<ReviewsPayload>(ownReviews) ?? new ReviewsPayload();
        Assert.Single(payload);

        using var otherInstructor = CreateClient(app, "Instructor", seed.InstructorA);
        var aReviews = await otherInstructor.GetAsync("/api/instructor/reviews");
        Assert.Equal(HttpStatusCode.OK, aReviews.StatusCode);
        var aPayload = await ReadJson<ReviewsPayload>(aReviews) ?? new ReviewsPayload();
        Assert.Empty(aPayload);
    }

    [Fact]
    public async Task InstructorEndpoints_StudentRole_ReturnsForbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Student", seed.Student);

        foreach (var path in new[]
        {
            "/api/instructor/dashboard",
            "/api/instructor/courses",
            "/api/instructor/students",
            "/api/instructor/reviews",
            "/api/instructor/enrollment-requests"
        })
        {
            var response = await client.GetAsync(path);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    [Fact]
    public async Task InstructorEndpoints_Anonymous_ReturnsUnauthorized()
    {
        await using var app = await StartApp();
        await SeedScenario(app);
        using var client = CreateClient(app, null, null);

        var response = await client.GetAsync("/api/instructor/dashboard");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AdminCaller_IsNotScoped_AndSeesEveryInstructor()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Admin", seed.Admin);

        var response = await client.GetAsync("/api/instructor/courses");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await ReadJson<List<CourseRow>>(response) ?? new List<CourseRow>();
        Assert.Equal(2, payload.Count);
    }

    // ── Enrollment decisions ───────────────────────────────────────────────────

    [Fact]
    public async Task ApproveOrDecline_ForeignEnrollment_ReturnsForbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var foreignEnrollment = await db.Enrollments
            .AsNoTracking()
            .FirstAsync(e => e.CourseId == seed.CourseB);
        var ownEnrollment = await db.Enrollments
            .AsNoTracking()
            .FirstAsync(e => e.CourseId == seed.CourseA);

        using var client = CreateClient(app, "Instructor", seed.InstructorA);

        var approveForeign = await client.PostAsync(
            $"/api/instructor/enrollment-requests/{foreignEnrollment.Id}/approve", null);
        Assert.Equal(HttpStatusCode.Forbidden, approveForeign.StatusCode);

        var declineForeign = await client.PostAsync(
            $"/api/instructor/enrollment-requests/{foreignEnrollment.Id}/decline", null);
        Assert.Equal(HttpStatusCode.Forbidden, declineForeign.StatusCode);

        using var scope2 = app.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var untouched = await db2.Enrollments.AsNoTracking().FirstAsync(e => e.Id == foreignEnrollment.Id);
        Assert.Equal(EnrollmentStatus.Pending, untouched.Status);

        var approveOwn = await client.PostAsync(
            $"/api/instructor/enrollment-requests/{ownEnrollment.Id}/approve", null);
        Assert.Equal(HttpStatusCode.OK, approveOwn.StatusCode);
    }

    // ── Course modification ownership ──────────────────────────────────────────

    [Fact]
    public async Task CreateCourse_TakesOwnershipFromJwt_AndStartsAsDraft()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorA);

        // A spoofed ownership field must be ignored: CreateCourseRequest has no owner property.
        var response = await client.PostAsJsonAsync("/api/courses", new
        {
            code = "CS-303",
            title = "Owned by the caller",
            description = "Ownership must come from the token only.",
            category = "Computer Science",
            instructorId = seed.InstructorB,
            ownerId = seed.InstructorB,
            isFree = true
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var created = await db.Courses.AsNoTracking().SingleAsync(c => c.Code == "CS-303");

        Assert.Equal(seed.InstructorA, created.InstructorId);
        Assert.False(created.IsPublished);
        Assert.Equal("Draft", created.Status);
    }

    [Fact]
    public async Task CreateCourse_Anonymous_ReturnsUnauthorized()
    {
        await using var app = await StartApp();
        await SeedScenario(app);
        using var client = CreateClient(app, null, null);

        var response = await client.PostAsJsonAsync("/api/courses", new
        {
            code = "CS-404",
            title = "Anonymous course",
            description = "Should never be created.",
            category = "Computer Science"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateCourse_StudentRole_ReturnsForbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Student", seed.Student);

        var response = await client.PostAsJsonAsync("/api/courses", new
        {
            code = "CS-405",
            title = "Student course",
            description = "Students must not create courses.",
            category = "Computer Science"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PublishCourse_ForeignCourse_ReturnsForbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorA);

        var response = await client.PostAsJsonAsync($"/api/courses/{seed.CourseB}/publish",
            new { isPublished = false });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task EnrolledStudents_ForeignCourse_ReturnsForbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorA);

        var own = await client.GetAsync($"/api/courses/{seed.CourseA}/enrolled-students");
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);

        var foreign = await client.GetAsync($"/api/courses/{seed.CourseB}/enrolled-students");
        Assert.Equal(HttpStatusCode.Forbidden, foreign.StatusCode);
    }

    [Fact]
    public async Task QuizValidation_ForeignCourseQuiz_ReturnsForbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedScenario(app);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Assessments.Add(new Assessment
            {
                CourseId = seed.CourseB,
                Title = "Grace's Quiz",
                Description = "Not yours.",
                Type = AssessmentType.Quiz,
                PassingScorePercent = 70,
                XpReward = 10,
                Status = QuizStatus.Published
            });
            await db.SaveChangesAsync();
        }

        using var scope2 = app.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var quiz = await db2.Assessments.AsNoTracking().FirstAsync(a => a.CourseId == seed.CourseB);

        using var client = CreateClient(app, "Instructor", seed.InstructorA);
        var response = await client.PostAsync($"/api/quizzes/{quiz.Id}/validate", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Student self-service enrollment ────────────────────────────────────────

    [Fact]
    public async Task StudentSelfEnrollment_CreatesPendingRequest_NotActiveAccess()
    {
        await using var app = await StartApp();
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var instructor = NewUser("Alan Kay", "alan.kay@test.local", UserRole.Instructor);
        var student = NewUser("Ken Thompson", "ken@test.local", UserRole.Student);
        var course = NewCourse("CS-500", "Self-service enrollment", instructor.Id, published: true);
        db.Users.AddRange(instructor, student);
        db.Courses.Add(course);
        await db.SaveChangesAsync();

        using var client = CreateClient(app, "Student", student.Id);
        var response = await client.PostAsync($"/api/courses/{course.Id}/enroll", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        Assert.Equal("PENDING", doc.RootElement.GetProperty("statusLabel").GetString());

        using var scope2 = app.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var enrollment = await db2.Enrollments.AsNoTracking()
            .SingleAsync(e => e.CourseId == course.Id && e.StudentId == student.Id);
        Assert.Equal(EnrollmentStatus.Pending, enrollment.Status);

        using var studentCourses = CreateClient(app, "Student", student.Id);
        var list = await studentCourses.GetAsync("/api/students/me/courses");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        var listJson = JsonDocument.Parse(await list.Content.ReadAsStringAsync());
        Assert.Equal(1, listJson.RootElement.GetArrayLength());
    }
}
