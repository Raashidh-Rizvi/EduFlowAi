using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Api.Controllers;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Core.Options;
using EduFlow.Infrastructure;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using EduFlow.Infrastructure.Services.Evaluation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// End-to-end HTTP tests for authentication, session lifecycle and RBAC.
///
/// These tests exercise the REAL JWT authentication stack (login -> bearer token
/// -> /api/auth/me -> refresh -> logout) against an isolated in-memory database,
/// and verify the security invariants behind "every instructor only ever sees
/// their own courses, dashboard and student data":
///
///   * every account logs in with its own unique user id
///   * identity and role are resolved server-side from the token
///   * course listings/details are scoped to the caller's role
///   * instructors cannot reach each other's data by manipulating ids
///   * logout revokes the refresh token (the session cannot be renewed)
/// </summary>
public partial class AuthSessionRbacTests
{
    private const string TestPassword = "Password123!";

    // -------------------------------------------------------------------------
    // Test host: real JWT bearer auth + isolated EF database
    // -------------------------------------------------------------------------
    private static async Task<WebApplication> StartAuthApp()
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
            ["JwtSettings:Secret"] = "auth-session-rbac-test-secret-at-least-32-characters",
            ["JwtSettings:Issuer"] = "EduFlowAPI",
            ["JwtSettings:Audience"] = "EduFlowClients",
            ["JwtSettings:ExpiryMinutes"] = "15"
        });

        var databaseName = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(databaseName));

        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddLmsDomainServices();
        builder.Services.AddScoped<ITeamService, TeamService>();
        builder.Services.AddScoped<IRatingService, RatingService>();
        builder.Services.Configure<ReviewModerationOptions>(builder.Configuration.GetSection("ReviewModeration"));
        builder.Services.AddHttpClient<IAiGatewayClient, AiGatewayClient>();

        var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("auth-session-rbac-test-secret-at-least-32-characters"));
        builder.Services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.SaveToken = true;
                options.Events = new JwtBearerEvents { OnTokenValidated = EduFlow.Api.Security.AccountTokenValidation.ValidateAsync };
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = jwtKey,
                    ValidateIssuer = true,
                    ValidIssuer = "EduFlowAPI",
                    ValidateAudience = true,
                    ValidAudience = "EduFlowClients",
                    ClockSkew = TimeSpan.Zero
                };
            });

        builder.Services.AddAuthorization();
        builder.Services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly);

        var app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync();
        return app;
    }

    private static HttpClient CreateClient(WebApplication app)
    {
        var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
        return new HttpClient { BaseAddress = new Uri(addresses.Addresses.Single()) };
    }

    private static async Task<AuthResponse> LoginAsync(HttpClient client, string email, string password = TestPassword)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);
        return auth!;
    }

    private static void UseBearer(HttpClient client, string token)
        => client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private static async Task<User> SeedUserAsync(WebApplication app, string fullName, string email, UserRole role)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = new User
        {
            FullName = fullName,
            Email = email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword, workFactor: 11),
            Role = role,
            IsActive = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<Course> SeedCourseAsync(
        WebApplication app, Guid instructorId, string code, bool isPublished = true)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var course = new Course
        {
            Code = code,
            Title = $"Course {code}",
            Description = "Test course",
            Category = "CS",
            InstructorId = instructorId,
            IsPublished = isPublished,
            Status = isPublished ? "Published" : "Draft"
        };
        db.Courses.Add(course);
        await db.SaveChangesAsync();
        return course;
    }

    private static async Task<JsonDocument> ReadJsonAsync(HttpResponseMessage response)
        => JsonDocument.Parse(await response.Content.ReadAsStringAsync());

    private static IEnumerable<string> CourseCodes(JsonElement list)
        => list.EnumerateArray().Select(e => e.GetProperty("code").GetString() ?? "");

    // =========================================================================
    // 1. UNIQUE, PERSISTENT USER IDENTITY
    // =========================================================================

    [Fact]
    public async Task Login_EachAccountReceivesItsOwnUniqueUserId()
    {
        await using var app = await StartAuthApp();
        var instructorA = await SeedUserAsync(app, "Instructor Alpha", "instructor.a@eduflow.ai", UserRole.Instructor);
        var instructorB = await SeedUserAsync(app, "Instructor Beta", "instructor.b@eduflow.ai", UserRole.Instructor);

        using var client = CreateClient(app);
        var loginA = await LoginAsync(client, instructorA.Email);
        var loginB = await LoginAsync(client, instructorB.Email);

        // Each instructor gets their OWN persisted id — never a shared/fabricated one.
        Assert.Equal(instructorA.Id, loginA.UserId);
        Assert.Equal(instructorB.Id, loginB.UserId);
        Assert.NotEqual(loginA.UserId, loginB.UserId);
        Assert.Equal("Instructor", loginA.Role);

        // The JWT itself carries that identity for server-side resolution.
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(loginA.Token);
        Assert.Equal(instructorA.Id.ToString(), jwt.Claims.First(c => c.Type == "uid").Value);
    }

    [Fact]
    public async Task Me_ReturnsServerSideIdentityAndRole()
    {
        await using var app = await StartAuthApp();
        var instructor = await SeedUserAsync(app, "Dr. Sarah Jenkins", "instructor@eduflow.ai", UserRole.Instructor);
        var student = await SeedUserAsync(app, "Alex Rivera", "student@eduflow.ai", UserRole.Student);

        using var client = CreateClient(app);

        var instructorLogin = await LoginAsync(client, instructor.Email);
        UseBearer(client, instructorLogin.Token);
        var me = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        using var meJson = await ReadJsonAsync(me);
        Assert.Equal(instructor.Id.ToString(), meJson.RootElement.GetProperty("id").GetString());
        Assert.Equal("Instructor", meJson.RootElement.GetProperty("role").GetString());
        Assert.Equal("Dr. Sarah Jenkins", meJson.RootElement.GetProperty("fullName").GetString());

        // A different account gets its own profile back — the endpoint is per-token.
        var studentLogin = await LoginAsync(client, student.Email);
        UseBearer(client, studentLogin.Token);
        var meStudent = await client.GetAsync("/api/auth/me");
        using var meStudentJson = await ReadJsonAsync(meStudent);
        Assert.Equal(student.Id.ToString(), meStudentJson.RootElement.GetProperty("id").GetString());
        Assert.Equal("Student", meStudentJson.RootElement.GetProperty("role").GetString());
    }

    [Fact]
    public async Task Me_ReturnsUnauthorized_WithoutToken()
    {
        await using var app = await StartAuthApp();
        await SeedUserAsync(app, "Instructor Alpha", "instructor.a@eduflow.ai", UserRole.Instructor);

        using var client = CreateClient(app);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);

        // A fabricated/garbage token is rejected too — identity is never client-asserted.
        UseBearer(client, "not-a-real-jwt");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    // =========================================================================
    // 2. SESSION LIFECYCLE: REFRESH + SECURE LOGOUT
    // =========================================================================

    [Fact]
    public async Task Refresh_ExtendsSession_AndLogoutRevokesIt()
    {
        await using var app = await StartAuthApp();
        var user = await SeedUserAsync(app, "Alex Rivera", "student@eduflow.ai", UserRole.Student);

        using var client = CreateClient(app);
        var login = await LoginAsync(client, user.Email);
        Assert.False(string.IsNullOrWhiteSpace(login.RefreshToken));

        // Refresh rotates the session and yields a new working token pair.
        var refreshResponse = await client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshTokenRequest(login.Token, login.RefreshToken));
        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);
        var refreshed = await refreshResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(refreshed);
        Assert.Equal(user.Id, refreshed!.UserId);
        Assert.NotEqual(login.RefreshToken, refreshed.RefreshToken);

        // Logout revokes the presented refresh token server-side.
        var logout = await client.PostAsJsonAsync("/api/auth/logout", new LogoutRequest(refreshed.RefreshToken));
        Assert.Equal(HttpStatusCode.OK, logout.StatusCode);

        // The revoked credential can no longer renew the session.
        var reuse = await client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshTokenRequest(refreshed.Token, refreshed.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, reuse.StatusCode);
    }

    [Fact]
    public async Task Refresh_RejectsUnknownRefreshToken()
    {
        await using var app = await StartAuthApp();
        await SeedUserAsync(app, "Alex Rivera", "student@eduflow.ai", UserRole.Student);

        using var client = CreateClient(app);
        var response = await client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshTokenRequest(string.Empty, Convert.ToBase64String(Guid.NewGuid().ToByteArray())));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // =========================================================================
    // 3. COURSE / DASHBOARD ISOLATION BY INSTRUCTOR
    // =========================================================================

    [Fact]
    public async Task Courses_InstructorSeesOnlyOwnCourses_StudentsAndAnonymousOnlySeePublished()
    {
        await using var app = await StartAuthApp();
        var instructorA = await SeedUserAsync(app, "Instructor Alpha", "instructor.a@eduflow.ai", UserRole.Instructor);
        var instructorB = await SeedUserAsync(app, "Instructor Beta", "instructor.b@eduflow.ai", UserRole.Instructor);
        var student = await SeedUserAsync(app, "Alex Rivera", "student@eduflow.ai", UserRole.Student);

        var courseA1 = await SeedCourseAsync(app, instructorA.Id, "A-PUB");
        var courseA2 = await SeedCourseAsync(app, instructorA.Id, "A-DRAFT", isPublished: false);
        var courseB1 = await SeedCourseAsync(app, instructorB.Id, "B-PUB");

        using var client = CreateClient(app);

        // Instructor A: their published + draft course, and nothing of Instructor B's.
        var loginA = await LoginAsync(client, instructorA.Email);
        UseBearer(client, loginA.Token);
        using (var json = await ReadJsonAsync(await client.GetAsync("/api/courses")))
        {
            var codes = CourseCodes(json.RootElement).ToList();
            Assert.Contains("A-PUB", codes);
            Assert.Contains("A-DRAFT", codes);
            Assert.DoesNotContain("B-PUB", codes);
        }

        // Instructor B: only their own course.
        var loginB = await LoginAsync(client, instructorB.Email);
        UseBearer(client, loginB.Token);
        using (var json = await ReadJsonAsync(await client.GetAsync("/api/courses")))
        {
            var codes = CourseCodes(json.RootElement).ToList();
            Assert.Equal(new[] { "B-PUB" }, codes);
        }

        // Student: published courses only (drafts are never exposed).
        var loginStudent = await LoginAsync(client, student.Email);
        UseBearer(client, loginStudent.Token);
        using (var json = await ReadJsonAsync(await client.GetAsync("/api/courses")))
        {
            var codes = CourseCodes(json.RootElement).ToList();
            Assert.Contains("A-PUB", codes);
            Assert.Contains("B-PUB", codes);
            Assert.DoesNotContain("A-DRAFT", codes);
        }

        // Anonymous visitor: same rule as a student — published courses only.
        client.DefaultRequestHeaders.Authorization = null;
        using (var json = await ReadJsonAsync(await client.GetAsync("/api/courses")))
        {
            var codes = CourseCodes(json.RootElement).ToList();
            Assert.Contains("A-PUB", codes);
            Assert.DoesNotContain("A-DRAFT", codes);
        }

        Assert.NotNull(courseA1);
        Assert.NotNull(courseA2);
        Assert.NotNull(courseB1);
    }

    [Fact]
    public async Task CourseDetail_DraftCourseHiddenFromNonOwnerByUrlManipulation()
    {
        await using var app = await StartAuthApp();
        var instructorA = await SeedUserAsync(app, "Instructor Alpha", "instructor.a@eduflow.ai", UserRole.Instructor);
        var instructorB = await SeedUserAsync(app, "Instructor Beta", "instructor.b@eduflow.ai", UserRole.Instructor);
        var student = await SeedUserAsync(app, "Alex Rivera", "student@eduflow.ai", UserRole.Student);
        var draft = await SeedCourseAsync(app, instructorA.Id, "A-DRAFT", isPublished: false);

        using var client = CreateClient(app);

        // Owner can open their draft.
        var loginA = await LoginAsync(client, instructorA.Email);
        UseBearer(client, loginA.Token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/courses/{draft.Id}")).StatusCode);

        // Another instructor guessing the id gets 404, not the draft content.
        var loginB = await LoginAsync(client, instructorB.Email);
        UseBearer(client, loginB.Token);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/courses/{draft.Id}")).StatusCode);

        // Students and anonymous visitors cannot see it either.
        var loginStudent = await LoginAsync(client, student.Email);
        UseBearer(client, loginStudent.Token);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/courses/{draft.Id}")).StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/courses/{draft.Id}")).StatusCode);
    }

    [Fact]
    public async Task InstructorDashboard_ReportsOnlyOwnCourses()
    {
        await using var app = await StartAuthApp();
        var instructorA = await SeedUserAsync(app, "Instructor Alpha", "instructor.a@eduflow.ai", UserRole.Instructor);
        var instructorB = await SeedUserAsync(app, "Instructor Beta", "instructor.b@eduflow.ai", UserRole.Instructor);

        await SeedCourseAsync(app, instructorA.Id, "A-1");
        await SeedCourseAsync(app, instructorA.Id, "A-2", isPublished: false);
        await SeedCourseAsync(app, instructorB.Id, "B-1");

        using var client = CreateClient(app);
        var loginA = await LoginAsync(client, instructorA.Email);
        UseBearer(client, loginA.Token);

        var response = await client.GetAsync("/api/instructor/dashboard");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        var stats = json.RootElement.GetProperty("stats");
        Assert.Equal(2, stats.GetProperty("totalCourses").GetInt32());

        var courseCodes = json.RootElement.GetProperty("courses")
            .EnumerateArray()
            .Select(c => c.GetProperty("code").GetString())
            .ToList();
        Assert.All(courseCodes, code => Assert.StartsWith("A-", code));
    }

    [Fact]
    public async Task InstructorEndpoints_RejectStudentsAndAnonymousCallers()
    {
        await using var app = await StartAuthApp();
        var student = await SeedUserAsync(app, "Alex Rivera", "student@eduflow.ai", UserRole.Student);
        await SeedUserAsync(app, "Instructor Alpha", "instructor.a@eduflow.ai", UserRole.Instructor);

        using var client = CreateClient(app);

        // Anonymous => 401, Student => 403 (role resolved from the token, not the request).
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/instructor/dashboard")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/instructor/courses")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/analytics/dashboard-summary")).StatusCode);

        var studentLogin = await LoginAsync(client, student.Email);
        UseBearer(client, studentLogin.Token);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/instructor/dashboard")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/instructor/courses")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/analytics/dashboard-summary")).StatusCode);
    }

    [Fact]
    public async Task AdminEndpoints_RejectNonAdminRoles()
    {
        await using var app = await StartAuthApp();
        var instructor = await SeedUserAsync(app, "Instructor Alpha", "instructor.a@eduflow.ai", UserRole.Instructor);

        using var client = CreateClient(app);
        var login = await LoginAsync(client, instructor.Email);
        UseBearer(client, login.Token);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/users")).StatusCode);

        using var anonymous = CreateClient(app);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/admin/users")).StatusCode);

        var admin = await SeedUserAsync(app, "Sys Admin", "admin@eduflow.ai", UserRole.Admin);
        var adminLogin = await LoginAsync(client, admin.Email);
        UseBearer(client, adminLogin.Token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/users")).StatusCode);
    }

    // =========================================================================
    // 4. NO CROSS-INSTRUCTOR WRITES VIA FALLBACK IDS
    // =========================================================================

    [Fact]
    public async Task CreateQuiz_WithEmptyCourseId_IsRejected()
    {
        await using var app = await StartAuthApp();
        var instructor = await SeedUserAsync(app, "Instructor Alpha", "instructor.a@eduflow.ai", UserRole.Instructor);
        await SeedCourseAsync(app, instructor.Id, "A-1");

        using var client = CreateClient(app);
        var login = await LoginAsync(client, instructor.Email);
        UseBearer(client, login.Token);

        // Previously this fell back to a seeded/default course id — now it fails closed.
        var response = await client.PostAsJsonAsync("/api/quizzes", new
        {
            courseId = Guid.Empty,
            title = "Sneaky Quiz",
            description = "Should not be created",
            timeLimitMinutes = 10,
            passingScorePercent = 70,
            xpReward = 10,
            coinReward = 5,
            questions = Array.Empty<object>()
        });

        Assert.True(
            response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound,
            $"Expected 400/404 but got {(int)response.StatusCode}");
    }

    [Fact]
    public async Task CreateQuiz_OnAnotherInstructorsCourse_IsForbidden()
    {
        await using var app = await StartAuthApp();
        var instructorA = await SeedUserAsync(app, "Instructor Alpha", "instructor.a@eduflow.ai", UserRole.Instructor);
        var instructorB = await SeedUserAsync(app, "Instructor Beta", "instructor.b@eduflow.ai", UserRole.Instructor);
        var courseB = await SeedCourseAsync(app, instructorB.Id, "B-1");

        using var client = CreateClient(app);
        var loginA = await LoginAsync(client, instructorA.Email);
        UseBearer(client, loginA.Token);

        var response = await client.PostAsJsonAsync("/api/quizzes", new
        {
            courseId = courseB.Id,
            title = "Quiz on someone else's course",
            description = "Must be rejected",
            timeLimitMinutes = 10,
            passingScorePercent = 70,
            xpReward = 10,
            coinReward = 5,
            questions = Array.Empty<object>()
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AnalyticsCourseEndpoint_InstructorCannotReadAnotherInstructorsCourse()
    {
        await using var app = await StartAuthApp();
        var instructorA = await SeedUserAsync(app, "Instructor Alpha", "instructor.a@eduflow.ai", UserRole.Instructor);
        var instructorB = await SeedUserAsync(app, "Instructor Beta", "instructor.b@eduflow.ai", UserRole.Instructor);
        var courseB = await SeedCourseAsync(app, instructorB.Id, "B-1");

        using var client = CreateClient(app);
        var loginA = await LoginAsync(client, instructorA.Email);
        UseBearer(client, loginA.Token);

        var response = await client.GetAsync($"/api/analytics/course/{courseB.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Admin, by contrast, is allowed to inspect any course.
        var admin = await SeedUserAsync(app, "Sys Admin", "admin@eduflow.ai", UserRole.Admin);
        var loginAdmin = await LoginAsync(client, admin.Email);
        UseBearer(client, loginAdmin.Token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/analytics/course/{courseB.Id}")).StatusCode);
    }

    [Fact]
    public async Task Register_OnlyStudentRole_CanSelfService()
    {
        await using var app = await StartAuthApp();
        using var client = CreateClient(app);

        var student = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("New Student", "new.student@eduflow.ai", TestPassword, UserRole.Student));
        Assert.Equal(HttpStatusCode.Created, student.StatusCode);

        // Privilege escalation through the public register endpoint stays blocked.
        var instructor = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Fake Instructor", "fake.instructor@eduflow.ai", TestPassword, UserRole.Instructor));
        Assert.Equal(HttpStatusCode.BadRequest, instructor.StatusCode);
    }
}
