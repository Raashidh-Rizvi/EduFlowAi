using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Student-facing discovery suite: course metadata (outcomes, prerequisites,
/// audience, XP, certificate) round-trips through the instructor API, the public
/// marketplace exposes it only for published courses, free-preview lessons stay
/// gated, and the XP summary never trusts client numbers.
/// </summary>
public class MarketplaceDiscoveryTests : IDisposable
{
    private readonly WebApplication _app;
    private readonly HttpClient _client;
    private readonly string _dbName = Guid.NewGuid().ToString();
    private static int _suffix = 0;

    public MarketplaceDiscoveryTests()
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
            ["JwtSettings:Secret"] = "marketplace-discovery-test-secret-at-least-32ch"
        });

        builder.Services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(_dbName));
        builder.Services.AddScoped<EduFlow.Core.Interfaces.IRatingService, EduFlow.Infrastructure.Services.RatingService>();
        builder.Services.AddScoped<EduFlow.Core.Interfaces.IGamificationService, EduFlow.Infrastructure.Services.GamificationService>();
        builder.Services.AddAuthentication("DiscoveryTest")
            .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, DiscoveryAuthHandler>(
                "DiscoveryTest", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddControllers().AddApplicationPart(typeof(EduFlow.Api.Controllers.CoursesController).Assembly);

        _app = builder.Build();
        _app.UseAuthentication();
        _app.UseAuthorization();
        _app.MapControllers();
        _app.StartAsync().GetAwaiter().GetResult();

        var addresses = _app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
        _client = new HttpClient { BaseAddress = new Uri(addresses.Addresses.Single()) };
    }

    public void Dispose()
    {
        _client.Dispose();
        _app.DisposeAsync().AsTask().GetAwaiter().GetResult();
    }

    public sealed class DiscoveryAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public DiscoveryAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var role = Request.Headers["X-Test-Role"].ToString();
            if (string.IsNullOrEmpty(role)) return Task.FromResult(AuthenticateResult.NoResult());

            var actorId = Request.Headers["X-Test-UserId"].FirstOrDefault() ?? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
            var identity = new System.Security.Claims.ClaimsIdentity(new[]
            {
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, role),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, actorId)
            }, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(
                new AuthenticationTicket(new System.Security.Claims.ClaimsPrincipal(identity), Scheme.Name)));
        }
    }

    private static string UniqueCode() => $"MD-{++_suffix:D4}";

    private static User NewUser(string name, UserRole role) => new()
    {
        FullName = name,
        Email = $"{name.ToLower().Replace(" ", ".")}.{Guid.NewGuid():N}@test.local".Replace($"{Guid.NewGuid():N}", Guid.NewGuid().ToString("N")[..8]),
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!", workFactor: 4),
        Role = role,
        IsActive = true
    };

    private async Task<(Course Course, User Instructor)> SeedPublishedCourseAsync(Action<Course>? configure = null)
    {
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var instructor = NewUser("Discovery Instructor", UserRole.Instructor);
        var course = new Course
        {
            Code = UniqueCode(),
            Title = "Discovery Seeded Course",
            Description = "A course used to verify marketplace discovery behavior.",
            Category = "Discovery Testing",
            IsPublished = true,
            Status = "Published",
            IsFree = true,
            InstructorId = instructor.Id,
            ShortDescription = "Short marketing summary for cards.",
            Language = "English",
            XpReward = 1500,
            CertificateEnabled = true,
            LearningOutcomesJson = JsonSerializer.Serialize(new[] { "Build tested applications", "Deploy with confidence" }),
            PrerequisitesJson = JsonSerializer.Serialize(new[] { "Basic programming" }),
            TargetAudienceJson = JsonSerializer.Serialize(new[] { "Career changers" })
        };
        configure?.Invoke(course);

        db.Users.Add(instructor);
        db.Courses.Add(course);
        await db.SaveChangesAsync();
        return (course, instructor);
    }

    private async Task<Guid> SeedLessonAsync(Guid courseId, string title, bool isFreePreview)
    {
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var module = new Module { CourseId = courseId, Title = "Module", OrderIndex = 1 };
        db.Modules.Add(module);
        await db.SaveChangesAsync();
        var lesson = new Lesson
        {
            ModuleId = module.Id,
            Title = title,
            Content = isFreePreview ? "FREE PREVIEW BODY" : "PROTECTED BODY",
            OrderIndex = 1,
            XpReward = 40,
            IsFreePreview = isFreePreview
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();
        return lesson.Id;
    }

    // ── 1. Public course detail carries instructor metadata ───────────────────
    [Fact]
    public async Task MarketplaceDetail_ExposesInstructorMetadata()
    {
        var (course, _) = await SeedPublishedCourseAsync();

        var response = await _client.GetAsync($"/api/marketplace/courses/{course.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Build tested applications", json.GetProperty("learningOutcomes").EnumerateArray().First().GetString());
        Assert.Equal("Basic programming", json.GetProperty("prerequisites").EnumerateArray().First().GetString());
        Assert.Equal("Career changers", json.GetProperty("targetAudience").EnumerateArray().First().GetString());
        Assert.Equal(1500, json.GetProperty("xpReward").GetInt32());
        Assert.True(json.GetProperty("certificateEnabled").GetBoolean());
        Assert.Equal("English", json.GetProperty("language").GetString());
        Assert.Equal("Short marketing summary for cards.", json.GetProperty("shortDescription").GetString());
    }

    // ── 2. Draft courses never appear on the public marketplace ───────────────
    [Fact]
    public async Task MarketplaceDetail_HidesDraftCourses()
    {
        var (course, _) = await SeedPublishedCourseAsync(c => { c.IsPublished = false; c.Status = "Draft"; });

        var response = await _client.GetAsync($"/api/marketplace/courses/{course.Id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── 3. Free-preview lesson opens anonymously; protected one does not ───────
    [Fact]
    public async Task FreePreview_OnlyServesLessonsMarkedAsPreview()
    {
        var (course, _) = await SeedPublishedCourseAsync();
        var previewId = await SeedLessonAsync(course.Id, "Open Lesson", isFreePreview: true);
        var protectedId = await SeedLessonAsync(course.Id, "Locked Lesson", isFreePreview: false);

        var ok = await _client.GetAsync($"/api/courses/lessons/{previewId}/preview");
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var body = await ok.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("FREE PREVIEW BODY", body.GetProperty("content").GetString());
        // Attachments must not leak through preview
        Assert.True(body.GetProperty("pdfUrl").ValueKind is JsonValueKind.Null);

        var denied = await _client.GetAsync($"/api/courses/lessons/{protectedId}/preview");
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
    }

    // ── 4. XP summary is computed server-side from real curriculum rows ────────
    [Fact]
    public async Task XpSummary_IsDerivedFromServerData()
    {
        var (course, _) = await SeedPublishedCourseAsync(c => c.XpReward = 0);
        await SeedLessonAsync(course.Id, "XP Lesson", isFreePreview: false);

        var response = await _client.GetAsync($"/api/courses/{course.Id}/xp-summary");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(40, json.GetProperty("lessonXp").GetInt32());
        Assert.Equal(40, json.GetProperty("displayTotal").GetInt32());
    }

    // ── 5. Search matches learning outcomes and instructor name ────────────────
    [Fact]
    public async Task CatalogSearch_MatchesOutcomesAndInstructorName()
    {
        var (course, instructor) = await SeedPublishedCourseAsync();
        var instructorNamePart = instructor.FullName.Split(' ')[0];

        var byOutcome = await _client.GetAsync("/api/marketplace/courses?search=deploy%20with%20confidence");
        Assert.Equal(HttpStatusCode.OK, byOutcome.StatusCode);
        var byOutcomeJson = await byOutcome.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains(byOutcomeJson.GetProperty("items").EnumerateArray(), i => i.GetProperty("id").GetString() == course.Id.ToString());

        var byInstructor = await _client.GetAsync($"/api/marketplace/courses?search={Uri.EscapeDataString(instructorNamePart)}");
        var byInstructorJson = await byInstructor.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains(byInstructorJson.GetProperty("items").EnumerateArray(), i => i.GetProperty("id").GetString() == course.Id.ToString());
    }

    // ── 6. Instructor metadata round-trips through update ──────────────────────
    [Fact]
    public async Task UpdateCourse_PersistsMetadata_WithOwnershipCheck()
    {
        var (course, instructor) = await SeedPublishedCourseAsync();
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var payload = new
        {
            code = course.Code,
            title = course.Title,
            description = course.Description,
            category = course.Category,
            isFree = true,
            difficulty = "Easy",
            durationHours = 10,
            shortDescription = "Updated summary",
            language = "Sinhala",
            xpReward = 2200,
            certificateEnabled = false,
            learningOutcomes = new[] { "New outcome one", "New outcome two" },
            prerequisites = new[] { "New prerequisite" },
            targetAudience = new[] { "New audience" }
        };

        // Owner succeeds and metadata is persisted.
        var owner = new HttpClient { BaseAddress = _client.BaseAddress };
        owner.DefaultRequestHeaders.Add("X-Test-Role", "Instructor");
        owner.DefaultRequestHeaders.Add("X-Test-UserId", instructor.Id.ToString());

        var ok = await owner.PutAsJsonAsync($"/api/courses/{course.Id}", payload);
        Assert.True(ok.IsSuccessStatusCode, await ok.Content.ReadAsStringAsync());

        db.ChangeTracker.Clear();
        var reloaded = await db.Courses.AsNoTracking().FirstAsync(c => c.Id == course.Id);
        Assert.Equal("Updated summary", reloaded.ShortDescription);
        Assert.Equal("Sinhala", reloaded.Language);
        Assert.Equal(2200, reloaded.XpReward);
        Assert.False(reloaded.CertificateEnabled);
        Assert.Contains("New outcome two", reloaded.LearningOutcomesJson);

        // A different instructor cannot modify the course.
        var outsiderId = Guid.NewGuid();
        var outsider = new HttpClient { BaseAddress = _client.BaseAddress };
        outsider.DefaultRequestHeaders.Add("X-Test-Role", "Instructor");
        outsider.DefaultRequestHeaders.Add("X-Test-UserId", outsiderId.ToString());
        db.Users.Add(NewUserWithId(outsiderId));
        await db.SaveChangesAsync();

        var forbidden = await outsider.PutAsJsonAsync($"/api/courses/{course.Id}", payload);
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
    }

    private static User NewUserWithId(Guid id) => new()
    {
        Id = id,
        FullName = "Outsider Instructor",
        Email = $"outsider.{Guid.NewGuid():N}@test.local",
        PasswordHash = "x",
        Role = UserRole.Instructor,
        IsActive = true
    };
}
