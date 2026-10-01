using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Api.Controllers;
using EduFlow.Core.DTOs;
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
using System.Text.Encodings.Web;
using System.Text.Json;

namespace EduFlow.Tests;

/// <summary>
/// End-to-end coverage of the student enrollment / instructor approval lifecycle:
///
///   discover -> request (PENDING) -> instructor approves (APPROVED) -> protected materials unlock
///                          \-> instructor rejects (REJECTED) -> student may re-request
///                          \-> student cancels (CANCELLED)
///
/// Security invariants covered: only the owning instructor (or an Admin) may decide a request,
/// a student can never approve their own enrollment by editing the request, decisions are
/// transactional, and approval never bypasses an unsatisfied payment condition.
/// </summary>
public class EnrollmentLifecycleTests
{
    // ── Harness ────────────────────────────────────────────────────────────────
    // Requests pass through the real authorization middleware; only authentication is
    // faked via headers so each call can扮演 a different principal.
    private static async Task<WebApplication> StartEnrollmentApp(
        IPaymentVerificationService? paymentGate = null)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = "Development",
            ContentRootPath = System.IO.Path.GetTempPath()
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JwtSettings:Secret"] = "enrollment-lifecycle-test-secret-at-least-32-chars"
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
        if (paymentGate != null)
            builder.Services.AddScoped<IPaymentVerificationService>(_ => paymentGate);
        else
            builder.Services.AddScoped<IPaymentVerificationService, PaymentVerificationService>();

        builder.Services.AddAuthentication("EnrollmentTest")
            .AddScheme<AuthenticationSchemeOptions, EnrollmentTestAuthHandler>("EnrollmentTest", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddControllers().AddApplicationPart(typeof(CoursesController).Assembly);

        var app = builder.Build();
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

    public sealed class EnrollmentTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public EnrollmentTestAuthHandler(
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
            var identity = new ClaimsIdentityBridge().Create(role, actorId, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(identity, Scheme.Name)));
        }
    }

    private sealed class ClaimsIdentityBridge
    {
        public System.Security.Claims.ClaimsPrincipal Create(string role, string actorId, string scheme)
        {
            var identity = new System.Security.Claims.ClaimsIdentity(new[]
            {
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, role),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, actorId)
            }, scheme);
            return new System.Security.Claims.ClaimsPrincipal(identity);
        }
    }

    // ── Seed helpers ───────────────────────────────────────────────────────────
    private static async Task<(Guid StudentId, Guid InstructorId, Guid OtherInstructorId, Guid AdminId, Guid CourseId)>
        SeedScenario(WebApplication app, bool coursePublished = true, bool courseIsFree = true, decimal price = 0m)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var student = NewUser("Alex Rivera", "alex.rivera@test.local", UserRole.Student);
        var instructor = NewUser("Dr. Sarah Jenkins", "sarah.jenkins@test.local", UserRole.Instructor);
        var otherInstructor = NewUser("Dr. Other", "other.instructor@test.local", UserRole.Instructor);
        var admin = NewUser("Platform Admin", "platform.admin@test.local", UserRole.Admin);

        var course = new Course
        {
            Code = "CS-701",
            Title = "Distributed Systems in Depth",
            Description = "Consensus, replication and partition tolerance.",
            Category = "Computer Science",
            IsPublished = coursePublished,
            IsFree = courseIsFree,
            Price = price,
            InstructorId = instructor.Id
        };

        db.Users.AddRange(student, instructor, otherInstructor, admin);
        db.Courses.Add(course);
        await db.SaveChangesAsync();

        return (student.Id, instructor.Id, otherInstructor.Id, admin.Id, course.Id);
    }

    private static User NewUser(string fullName, string email, UserRole role) => new()
    {
        FullName = fullName,
        Email = email,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!", workFactor: 4),
        Role = role,
        IsActive = true
    };

    private static async Task<Guid> SeedCurriculum(WebApplication app, Guid courseId, string title)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var module = new Module { CourseId = courseId, Title = title, Description = "Module", OrderIndex = 1 };
        db.Modules.Add(module);
        await db.SaveChangesAsync();

        var lesson = new Lesson
        {
            ModuleId = module.Id,
            Title = $"{title} Lesson",
            Content = "PROTECTED LESSON BODY — must not leak before approval.",
            OrderIndex = 1
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();
        return lesson.Id;
    }

    private static async Task<Enrollment?> FindEnrollment(WebApplication app, Guid courseId, Guid studentId)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.Enrollments.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId);
    }

    private static async Task<List<Enrollment>> AllEnrollments(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.Enrollments.AsNoTracking().ToListAsync();
    }

    private static async Task<List<Notification>> NotificationsFor(WebApplication app, Guid userId)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .ToListAsync();
    }

    private static JsonElement Json(HttpResponseMessage response)
    {
        var body = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
        if (string.IsNullOrWhiteSpace(body))
            throw new InvalidOperationException(
                $"Expected a JSON body but got {(int)response.StatusCode} {response.StatusCode} with an empty body.");
        try
        {
            return JsonDocument.Parse(body).RootElement;
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException(
                $"Response {(int)response.StatusCode} was not JSON ({ex.Message}). Body: " +
                (body.Length > 2000 ? body[..2000] : body));
        }
    }

    private static async Task<string> RequestEnrollmentAsync(HttpClient client, Guid courseId)
    {
        var response = await client.PostAsync($"/api/courses/{courseId}/enroll", null);
        return await response.Content.ReadAsStringAsync();
    }

    // ── 1. Request creation ────────────────────────────────────────────────────

    [Fact]
    public async Task StudentRequestsEnrollment_CreatesPendingRequest_AndNotifiesInstructor()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        var response = await student.PostAsync($"/api/courses/{courseId}/enroll", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = Json(response);
        Assert.Equal("Pending", body.GetProperty("status").GetString());
        Assert.Equal("PENDING", body.GetProperty("statusLabel").GetString());

        var enrollment = await FindEnrollment(app, courseId, studentId);
        Assert.NotNull(enrollment);
        Assert.Equal(EnrollmentStatus.Pending, enrollment!.Status);
        Assert.NotNull(enrollment.RequestedAt);

        var instructorNotifications = await NotificationsFor(app, instructorId);
        Assert.Contains(instructorNotifications, n => n.Type == "EnrollmentRequested");
    }

    [Fact]
    public async Task StudentRequestsEnrollment_Twice_CreatesExactlyOneRow()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, _, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        var first = await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        var second = await student.PostAsync($"/api/courses/{courseId}/enroll", null);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal("Enrollment request already pending instructor approval.",
            Json(second).GetProperty("message").GetString());

        var rows = await AllEnrollments(app);
        Assert.Single(rows);
        Assert.Equal(EnrollmentStatus.Pending, rows[0].Status);
    }

    [Fact]
    public async Task EnrollmentTable_EnforcesUniqueCourseStudentIndex()
    {
        await using var app = await StartEnrollmentApp();
        var (_, _, _, _, courseId) = await SeedScenario(app);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var model = db.Model;

        var entityType = model.FindEntityType(typeof(Enrollment))!;
        var index = entityType.GetIndexes()
            .FirstOrDefault(i => i.IsUnique &&
                                 i.Properties.Select(p => p.Name).SequenceEqual(new[] { "CourseId", "StudentId" }));

        Assert.NotNull(index);
    }

    [Fact]
    public async Task UnpublishedCourse_CannotBeRequested()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, _, _, _, courseId) = await SeedScenario(app, coursePublished: false);

        using var student = CreateClient(app, "Student", studentId);
        var response = await student.PostAsync($"/api/courses/{courseId}/enroll", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Null(await FindEnrollment(app, courseId, studentId));
    }

    // ── 2. Instructor sees and decides ─────────────────────────────────────────

    [Fact]
    public async Task InstructorSeesPendingRequest_WithStudentNameAndRequestDate()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);

        using var instructor = CreateClient(app, "Instructor", instructorId);
        var response = await instructor.GetAsync("/api/instructor/enrollment-requests?status=pending");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var rows = Json(response).EnumerateArray().ToList();
        var row = Assert.Single(rows);
        Assert.Equal("Alex Rivera", row.GetProperty("studentName").GetString());
        Assert.Equal("alex.rivera@test.local", row.GetProperty("studentEmail").GetString());
        Assert.Equal("PENDING", row.GetProperty("statusLabel").GetString());
        Assert.NotEqual(default, row.GetProperty("requestedAt").GetDateTime());
    }

    [Fact]
    public async Task Approve_PendingRequest_TransitionsToApproved_AndUnlocksAccess()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(app);
        var lessonId = await SeedCurriculum(app, courseId, "Replication");

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);

        // Protected material is withheld while the request is still pending.
        var blocked = await student.GetAsync($"/api/courses/{courseId}/hierarchy");
        Assert.Equal(HttpStatusCode.Forbidden, blocked.StatusCode);

        var pending = await FindEnrollment(app, courseId, studentId);
        Assert.NotNull(pending);

        using var instructor = CreateClient(app, "Instructor", instructorId);
        var decision = await instructor.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { notes = "Welcome aboard." });
        Assert.Equal(HttpStatusCode.OK, decision.StatusCode);
        Assert.Equal("APPROVED", Json(decision).GetProperty("statusLabel").GetString());

        var approved = await FindEnrollment(app, courseId, studentId);
        Assert.Equal(EnrollmentStatus.Active, approved!.Status);
        Assert.NotNull(approved.ReviewedAt);
        Assert.Equal(instructorId, approved.ReviewedByInstructorId);
        Assert.Equal("Welcome aboard.", approved.ReviewNotes);

        // Student notification
        var studentNotifications = await NotificationsFor(app, studentId);
        Assert.Contains(studentNotifications, n => n.Type == "EnrollmentApproved");

        // Approved students show up on the course roster with their progress.
        var roster = await instructor.GetAsync($"/api/courses/{courseId}/enrolled-students");
        Assert.Equal(HttpStatusCode.OK, roster.StatusCode);
        var rosterRow = Assert.Single(Json(roster).EnumerateArray());
        Assert.Equal("Alex Rivera", rosterRow.GetProperty("fullName").GetString());

        // Access endpoint + protected material now open up.
        var access = await student.GetAsync($"/api/courses/{courseId}/access");
        Assert.Equal(HttpStatusCode.OK, access.StatusCode);
        Assert.True(Json(access).GetProperty("hasAccess").GetBoolean());

        var allowed = await student.GetAsync($"/api/courses/{courseId}/hierarchy");
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);

        var lesson = await student.GetAsync($"/api/courses/lessons/{lessonId}");
        Assert.Equal(HttpStatusCode.OK, lesson.StatusCode);
        Assert.Contains("PROTECTED LESSON BODY", await lesson.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Reject_PendingRequest_MarksRejected_AndAllowsReRequest()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        var pending = await FindEnrollment(app, courseId, studentId);

        using var instructor = CreateClient(app, "Instructor", instructorId);
        var reject = await instructor.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending!.Id}/reject",
            new { notes = "Prerequisites not met." });
        Assert.Equal(HttpStatusCode.OK, reject.StatusCode);
        Assert.Equal("REJECTED", Json(reject).GetProperty("statusLabel").GetString());

        var rejected = await FindEnrollment(app, courseId, studentId);
        Assert.Equal(EnrollmentStatus.Rejected, rejected!.Status);
        Assert.Equal("Prerequisites not met.", rejected.ReviewNotes);

        var notifications = await NotificationsFor(app, studentId);
        Assert.Contains(notifications, n => n.Type == "EnrollmentRejected");

        // Re-requesting re-opens the SAME row (unique index preserved) as a fresh PENDING.
        var resubmit = await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        Assert.Equal(HttpStatusCode.OK, resubmit.StatusCode);
        Assert.Equal("PENDING", Json(resubmit).GetProperty("statusLabel").GetString());

        var rows = await AllEnrollments(app);
        Assert.Single(rows);
        Assert.Equal(EnrollmentStatus.Pending, rows[0].Status);
        Assert.Null(rows[0].ReviewNotes);
    }

    [Fact]
    public async Task Decide_OnAlreadyDecidedRequest_ReturnsConflict()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        var pending = await FindEnrollment(app, courseId, studentId);

        using var instructor = CreateClient(app, "Instructor", instructorId);
        var approve = await instructor.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { });
        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);

        var secondApprove = await instructor.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending.Id}/approve", new { });
        Assert.Equal(HttpStatusCode.Conflict, secondApprove.StatusCode);

        var rejectAfterApprove = await instructor.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending.Id}/reject", new { notes = "nope" });
        Assert.Equal(HttpStatusCode.Conflict, rejectAfterApprove.StatusCode);

        var state = await FindEnrollment(app, courseId, studentId);
        Assert.Equal(EnrollmentStatus.Active, state!.Status);
    }

    // ── 3. Authorization invariants ────────────────────────────────────────────

    [Fact]
    public async Task StudentCannotApproveOwnEnrollment_EvenWhenCallingTheEndpointDirectly()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, _, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        var pending = await FindEnrollment(app, courseId, studentId);

        // The student edits the API request themselves — the role gate must still hold.
        var forgedApprove = await student.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { });
        var forgedReject = await student.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending.Id}/reject", new { notes = "self" });

        Assert.Equal(HttpStatusCode.Forbidden, forgedApprove.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, forgedReject.StatusCode);

        var state = await FindEnrollment(app, courseId, studentId);
        Assert.Equal(EnrollmentStatus.Pending, state!.Status);
    }

    [Fact]
    public async Task StudentCannotListOrApproveAnotherCoursesRequests()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, _, otherInstructorId, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        var pending = await FindEnrollment(app, courseId, studentId);

        using var otherInstructor = CreateClient(app, "Instructor", otherInstructorId);

        // A different instructor owns nothing here: listing scopes to zero, deciding is 403.
        var list = await otherInstructor.GetAsync("/api/instructor/enrollment-requests");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        Assert.Empty(Json(list).EnumerateArray());

        var decide = await otherInstructor.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { });
        Assert.Equal(HttpStatusCode.Forbidden, decide.StatusCode);
        Assert.Equal(EnrollmentStatus.Pending, (await FindEnrollment(app, courseId, studentId))!.Status);

        // Their course filter may never widen visibility either.
        var filtered = await otherInstructor.GetAsync($"/api/instructor/enrollment-requests?courseId={courseId}");
        Assert.Equal(HttpStatusCode.Forbidden, filtered.StatusCode);
    }

    [Fact]
    public async Task AdminCanApproveAnyRequest()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, _, _, adminId, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        var pending = await FindEnrollment(app, courseId, studentId);

        using var admin = CreateClient(app, "Admin", adminId);
        var approve = await admin.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { notes = "Admin override." });

        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);
        Assert.Equal(EnrollmentStatus.Active, (await FindEnrollment(app, courseId, studentId))!.Status);
    }

    [Fact]
    public async Task UnauthenticatedCaller_CannotRequestOrDecide()
    {
        await using var app = await StartEnrollmentApp();
        var (_, instructorId, _, _, courseId) = await SeedScenario(app);

        using var anonymous = new HttpClient
        {
            BaseAddress = new Uri(((IEnumerable<string>)app.Services
                .GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses).First())
        };

        var request = await anonymous.PostAsync($"/api/courses/{courseId}/enroll", null);
        Assert.Equal(HttpStatusCode.Unauthorized, request.StatusCode);

        // No credentials at all on the decision endpoints either.
        var approve = await anonymous.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{Guid.NewGuid()}/approve", new { });
        var reject = await anonymous.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{Guid.NewGuid()}/reject", new { notes = "x" });
        var list = await anonymous.GetAsync("/api/instructor/enrollment-requests");

        Assert.Equal(HttpStatusCode.Unauthorized, approve.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, reject.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, list.StatusCode);

        // An instructor hitting an id that does not exist gets 404, never a decision.
        using var instructor = CreateClient(app, "Instructor", instructorId);
        var decide = await instructor.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{Guid.NewGuid()}/approve", new { });
        Assert.Equal(HttpStatusCode.NotFound, decide.StatusCode);
    }

    // ── 4. Cancel / withdraw ───────────────────────────────────────────────────

    [Fact]
    public async Task StudentCancelsPendingRequest()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, _, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);

        var cancel = await student.DeleteAsync($"/api/courses/{courseId}/enroll");
        Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);
        Assert.Equal("CANCELLED", Json(cancel).GetProperty("statusLabel").GetString());

        var state = await FindEnrollment(app, courseId, studentId);
        Assert.Equal(EnrollmentStatus.Cancelled, state!.Status);

        // A cancelled request grants no access.
        var hierarchy = await student.GetAsync($"/api/courses/{courseId}/hierarchy");
        Assert.Equal(HttpStatusCode.Forbidden, hierarchy.StatusCode);

        // The student can re-request afterwards.
        var again = await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        Assert.Equal("PENDING", Json(again).GetProperty("statusLabel").GetString());
    }

    [Fact]
    public async Task WithdrawApprovedEnrollment_MarksDropped()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        var pending = await FindEnrollment(app, courseId, studentId);

        using var instructor = CreateClient(app, "Instructor", instructorId);
        await instructor.PostAsJsonAsync($"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { });

        var withdraw = await student.DeleteAsync($"/api/courses/{courseId}/enroll");
        Assert.Equal(HttpStatusCode.OK, withdraw.StatusCode);
        Assert.Equal("DROPPED", Json(withdraw).GetProperty("statusLabel").GetString());

        var hierarchy = await student.GetAsync($"/api/courses/{courseId}/hierarchy");
        Assert.Equal(HttpStatusCode.Forbidden, hierarchy.StatusCode);
    }

    // ── 5. Payment conditions ──────────────────────────────────────────────────

    [Fact]
    public async Task PaidCourse_EnrollmentRequestIsBlockedWithPaymentRequired()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(
            app, courseIsFree: false, price: 149.00m);

        using var student = CreateClient(app, "Student", studentId);
        var response = await student.PostAsync($"/api/courses/{courseId}/enroll", null);

        Assert.Equal(HttpStatusCode.PaymentRequired, response.StatusCode);
        Assert.Null(await FindEnrollment(app, courseId, studentId));
    }

    [Fact]
    public async Task PaidCourse_ApprovalCannotBypassPaymentVerification()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(
            app, courseIsFree: false, price: 149.00m);

        // Seed a request directly (simulating a course that was made paid after the fact).
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Enrollments.Add(new Enrollment
            {
                CourseId = courseId,
                StudentId = studentId,
                Status = EnrollmentStatus.Pending,
                RequestedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
        var pending = await FindEnrollment(app, courseId, studentId);

        using var instructor = CreateClient(app, "Instructor", instructorId);
        var approve = await instructor.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { });

        Assert.Equal(HttpStatusCode.PaymentRequired, approve.StatusCode);
        var state = await FindEnrollment(app, courseId, studentId);
        Assert.Equal(EnrollmentStatus.Pending, state!.Status);
    }

    [Fact]
    public async Task PaidCourse_WhenPaymentGateSatisfied_AllowsFullApprovalFlow()
    {
        // Proves the seam: swapping the registered IPaymentVerificationService is all a
        // future payment provider needs — the workflow itself never changes.
        var payingGate = new AlwaysSatisfiedPaymentGate();
        await using var app = await StartEnrollmentApp(payingGate);

        var (studentId, instructorId, _, _, courseId) = await SeedScenario(
            app, courseIsFree: false, price: 149.00m);

        using var student = CreateClient(app, "Student", studentId);
        var request = await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        Assert.Equal(HttpStatusCode.OK, request.StatusCode);

        var pending = await FindEnrollment(app, courseId, studentId);
        using var instructor = CreateClient(app, "Instructor", instructorId);
        var approve = await instructor.PostAsJsonAsync(
            $"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { });

        Assert.Equal(HttpStatusCode.OK, approve.StatusCode);
        Assert.Equal(EnrollmentStatus.Active, (await FindEnrollment(app, courseId, studentId))!.Status);
    }

    private sealed class AlwaysSatisfiedPaymentGate : IPaymentVerificationService
    {
        public Task<PaymentVerificationResult> VerifyAsync(Guid courseId, Guid studentId, CancellationToken ct = default)
            => Task.FromResult(PaymentVerificationResult.Satisfied("Captured and verified."));
    }

    // ── 6. Status surfaces ─────────────────────────────────────────────────────

    [Fact]
    public async Task InstructorRequestList_FiltersByStatusAndSearch()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        var pending = await FindEnrollment(app, courseId, studentId);

        using var instructor = CreateClient(app, "Instructor", instructorId);
        await instructor.PostAsJsonAsync($"/api/instructor/enrollment-requests/{pending!.Id}/reject", new { notes = "x" });

        var pendingRows = Json(await instructor.GetAsync("/api/instructor/enrollment-requests?status=pending"))
            .EnumerateArray().ToList();
        Assert.Empty(pendingRows);

        var rejectedRows = Json(await instructor.GetAsync("/api/instructor/enrollment-requests?status=rejected"))
            .EnumerateArray().ToList();
        Assert.Single(rejectedRows);

        var approvedRows = Json(await instructor.GetAsync("/api/instructor/enrollment-requests?status=approved"))
            .EnumerateArray().ToList();
        Assert.Empty(approvedRows);

        var searchHit = Json(await instructor.GetAsync("/api/instructor/enrollment-requests?search=alex.rivera"))
            .EnumerateArray().ToList();
        Assert.Single(searchHit);

        var searchMiss = Json(await instructor.GetAsync("/api/instructor/enrollment-requests?search=nobody-here"))
            .EnumerateArray().ToList();
        Assert.Empty(searchMiss);
    }

    [Fact]
    public async Task InstructorSummary_ReportsBadgeCountsPerCourse()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);
        var pending = await FindEnrollment(app, courseId, studentId);

        using var instructor = CreateClient(app, "Instructor", instructorId);

        var before = Json(await instructor.GetAsync("/api/instructor/enrollment-requests/summary"));
        Assert.Equal(1, before.GetProperty("pending").GetInt32());
        Assert.Equal(0, before.GetProperty("approved").GetInt32());
        var group = before.GetProperty("courses").EnumerateArray().Single();
        Assert.Equal(courseId, group.GetProperty("courseId").GetGuid());
        Assert.Equal(1, group.GetProperty("pending").GetInt32());

        await instructor.PostAsJsonAsync($"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { });

        var after = Json(await instructor.GetAsync("/api/instructor/enrollment-requests/summary"));
        Assert.Equal(0, after.GetProperty("pending").GetInt32());
        Assert.Equal(1, after.GetProperty("approved").GetInt32());
    }

    [Fact]
    public async Task StudentEnrollmentRequests_ReturnAccurateStatusLabels()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);

        var pendingRows = Json(await student.GetAsync("/api/students/me/enrollment-requests"))
            .EnumerateArray().ToList();
        var pendingRow = Assert.Single(pendingRows);
        Assert.Equal("PENDING", pendingRow.GetProperty("statusLabel").GetString());
        Assert.True(pendingRow.GetProperty("canCancel").GetBoolean());
        Assert.False(pendingRow.GetProperty("hasAccess").GetBoolean());

        var pending = await FindEnrollment(app, courseId, studentId);
        using var instructor = CreateClient(app, "Instructor", instructorId);
        await instructor.PostAsJsonAsync($"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { });

        var approvedRow = Assert.Single(Json(await student.GetAsync("/api/students/me/enrollment-requests"))
            .EnumerateArray().ToList());
        Assert.Equal("APPROVED", approvedRow.GetProperty("statusLabel").GetString());
        Assert.False(approvedRow.GetProperty("canCancel").GetBoolean());
        Assert.True(approvedRow.GetProperty("hasAccess").GetBoolean());
        Assert.NotNull(approvedRow.GetProperty("reviewedAt").GetDateTime());
    }

    [Fact]
    public async Task ApprovedEnrollment_AppearsInStudentCourseList_WithProgress()
    {
        await using var app = await StartEnrollmentApp();
        var (studentId, instructorId, _, _, courseId) = await SeedScenario(app);

        using var student = CreateClient(app, "Student", studentId);
        await student.PostAsync($"/api/courses/{courseId}/enroll", null);

        // Pending requests are visible on the dashboard but grant nothing.
        var whilePending = Json(await student.GetAsync("/api/students/me/courses"))
            .EnumerateArray().ToList();
        Assert.Single(whilePending);

        var pending = await FindEnrollment(app, courseId, studentId);
        using var instructor = CreateClient(app, "Instructor", instructorId);
        await instructor.PostAsJsonAsync($"/api/instructor/enrollment-requests/{pending!.Id}/approve", new { });

        var afterApproval = Json(await student.GetAsync("/api/students/me/courses"))
            .EnumerateArray().ToList();
        var row = Assert.Single(afterApproval);
        Assert.Equal("Distributed Systems in Depth", row.GetProperty("courseTitle").GetString());
        Assert.Equal("Active", row.GetProperty("status").GetString());
        Assert.True(row.GetProperty("totalLessons").GetInt32() >= 0);
    }

    // ── 7. Content gating for other principals ─────────────────────────────────

    [Fact]
    public async Task AnonymousCaller_CannotReadProtectedLearningMaterials()
    {
        await using var app = await StartEnrollmentApp();
        var (_, _, _, _, courseId) = await SeedScenario(app);
        await SeedCurriculum(app, courseId, "Consensus");

        using var anonymous = new HttpClient
        {
            BaseAddress = new Uri(app.Services
                .GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.First())
        };

        var hierarchy = await anonymous.GetAsync($"/api/courses/{courseId}/hierarchy");
        Assert.Equal(HttpStatusCode.Unauthorized, hierarchy.StatusCode);

        var modules = await anonymous.GetAsync($"/api/courses/{courseId}/modules");
        Assert.Equal(HttpStatusCode.Unauthorized, modules.StatusCode);

        // The catalog/detail view stays browsable so students can discover the course.
        var detail = await anonymous.GetAsync($"/api/courses/{courseId}");
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
    }

    [Fact]
    public async Task CourseOwnerAndAdmin_KeepFullAccessWithoutEnrollment()
    {
        await using var app = await StartEnrollmentApp();
        var (_, instructorId, _, adminId, courseId) = await SeedScenario(app);
        await SeedCurriculum(app, courseId, "Failure Detectors");

        using var instructor = CreateClient(app, "Instructor", instructorId);
        Assert.Equal(HttpStatusCode.OK, (await instructor.GetAsync($"/api/courses/{courseId}/hierarchy")).StatusCode);

        using var admin = CreateClient(app, "Admin", adminId);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync($"/api/courses/{courseId}/hierarchy")).StatusCode);
    }
}
