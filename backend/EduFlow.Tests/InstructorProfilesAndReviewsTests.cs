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
using EduFlow.Core.Interfaces;
using EduFlow.Core.Options;
using EduFlow.Infrastructure;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using EduFlow.Infrastructure.Services.Evaluation;
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

/// <summary>
/// Instructor public profiles + course rating/review system.
///
/// Covers the documented contracts in docs/current/RATINGS_AND_REVIEWS.md:
///   * one unique public profile per instructor (name, image, bio, expertise,
///     published courses, student count, aggregate rating) + own-profile editing;
///   * five-star reviews gated by the verified-enrollment eligibility rules,
///     one active review per student per course, editable by its author;
///   * averages computed from APPROVED reviews only, with one shared calculation;
///   * instructors can view but never modify reviews; admins can moderate;
///   * every unauthorized create/edit/delete is rejected.
///
/// HTTP tests run the real controllers through the real authorization middleware
/// with a stub authentication scheme (X-Test-Role / X-Test-UserId headers).
/// </summary>
public class InstructorProfilesAndReviewsTests
{
    private static readonly JsonSerializerOptions WebJsonOptions = new(JsonSerializerDefaults.Web);

    // -------------------------------------------------------------------------
    // Test host
    // -------------------------------------------------------------------------

    private static async Task<WebApplication> StartApp(bool requireApproval = false)
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
            options.UseInMemoryDatabase(databaseName));
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddLmsDomainServices();
        builder.Services.AddScoped<IRatingService, RatingService>();
        if (requireApproval)
        {
            builder.Services.Configure<ReviewModerationOptions>(o => o.RequireApproval = true);
        }
        builder.Services.AddAuthentication("InstructorReviewsTest")
            .AddScheme<AuthenticationSchemeOptions, InstructorReviewsTestAuthHandler>("InstructorReviewsTest", _ => { });
        builder.Services.AddAuthorization(EduFlow.Api.Security.AuthorizationPolicies.Configure);
        builder.Services.AddControllers().AddApplicationPart(typeof(AdminController).Assembly);
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

    public sealed class InstructorReviewsTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public InstructorReviewsTestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger, UrlEncoder encoder) : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var role = Request.Headers["X-Test-Role"].ToString();
            if (string.IsNullOrEmpty(role)) return Task.FromResult(AuthenticateResult.NoResult());
            var actorId = Request.Headers["X-Test-UserId"].FirstOrDefault() ?? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
            var identity = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.NameIdentifier, actorId)
            }, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
        }
    }

    // -------------------------------------------------------------------------
    // Seed
    // -------------------------------------------------------------------------

    private sealed record SeedData(
        User Instructor,
        User InstructorB,
        User Student,
        User Student2,
        User Admin,
        Course CourseA,
        Course CourseB,
        Course DraftCourse,
        Course OtherCourse);

    private static User NewUser(string name, string email, UserRole role) => new()
    {
        FullName = name,
        Email = email,
        PasswordHash = "hash",
        Role = role,
        IsActive = true
    };

    private static async Task<SeedData> SeedAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var instructor = NewUser("Ada Lovelace", "ada@eduflow.ai", UserRole.Instructor);
        var instructorB = NewUser("Grace Hopper", "grace@eduflow.ai", UserRole.Instructor);
        var student = NewUser("Alan Turing", "alan@eduflow.ai", UserRole.Student);
        var student2 = NewUser("Katherine Johnson", "katherine@eduflow.ai", UserRole.Student);
        var admin = NewUser("Root Admin", "root@eduflow.ai", UserRole.Admin);
        db.Users.AddRange(instructor, instructorB, student, student2, admin);
        await db.SaveChangesAsync();

        var courseA = new Course
        {
            Code = "CS-101", Title = "Databases 101", Description = "Intro",
            Category = "Computer Science", InstructorId = instructor.Id, IsPublished = true, Status = "Published"
        };
        var courseB = new Course
        {
            Code = "CS-102", Title = "Transactions", Description = "ACID",
            Category = "Computer Science", InstructorId = instructor.Id, IsPublished = true, Status = "Published"
        };
        var draftCourse = new Course
        {
            Code = "CS-999", Title = "Unreleased", Description = "Draft",
            Category = "Computer Science", InstructorId = instructor.Id, IsPublished = false, Status = "Draft"
        };
        var otherCourse = new Course
        {
            Code = "MA-101", Title = "Compilers", Description = "Parsing",
            Category = "Computer Science", InstructorId = instructorB.Id, IsPublished = true, Status = "Published"
        };
        db.Courses.AddRange(courseA, courseB, draftCourse, otherCourse);
        await db.SaveChangesAsync();

        db.Enrollments.AddRange(
            new Enrollment { CourseId = courseA.Id, StudentId = student.Id, ProgressPercentage = 60, Status = EnrollmentStatus.Active },
            new Enrollment { CourseId = courseA.Id, StudentId = student2.Id, ProgressPercentage = 20, Status = EnrollmentStatus.Active },
            new Enrollment { CourseId = courseB.Id, StudentId = student.Id, ProgressPercentage = 100, Status = EnrollmentStatus.Completed },
            new Enrollment { CourseId = courseB.Id, StudentId = student2.Id, ProgressPercentage = 0, Status = EnrollmentStatus.Pending },
            new Enrollment { CourseId = otherCourse.Id, StudentId = student.Id, ProgressPercentage = 10, Status = EnrollmentStatus.Active });
        await db.SaveChangesAsync();

        db.InstructorProfiles.Add(new InstructorProfile
        {
            UserId = instructor.Id,
            Headline = "Database systems",
            Bio = "I teach databases.",
            Expertise = "PostgreSQL, EF Core"
        });
        await db.SaveChangesAsync();

        db.CourseReviews.AddRange(
            new CourseReview { CourseId = courseA.Id, StudentId = student.Id, Rating = 5, Comment = "Excellent.", Status = ReviewStatus.Approved },
            new CourseReview { CourseId = courseA.Id, StudentId = student2.Id, Rating = 4, Comment = "Good.", Status = ReviewStatus.Approved });
        await db.SaveChangesAsync();

        var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();
        await rating.RecalculateCourseAsync(courseA.Id);

        return new SeedData(instructor, instructorB, student, student2, admin,
            courseA, courseB, draftCourse, otherCourse);
    }

    // -------------------------------------------------------------------------
    // Public instructor profiles
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PublicProfile_Anonymous_ReturnsFullProfileWithRealAggregates()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app); // anonymous

        var response = await client.GetAsync($"/api/instructors/{seed.Instructor.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var profile = await response.Content.ReadFromJsonAsync<PublicInstructorProfileDto>();
        Assert.NotNull(profile);
        Assert.Equal("Ada Lovelace", profile.FullName);
        Assert.Equal("Database systems", profile.Headline);
        Assert.Equal("I teach databases.", profile.Bio);
        Assert.Equal(new[] { "PostgreSQL", "EF Core" }, profile.Expertise);
        Assert.Equal(2, profile.PublishedCourseCount);
        Assert.Equal(3, profile.TotalCourseCount);
        // Distinct verified students across published courses: Alan + Katherine.
        Assert.Equal(2, profile.StudentCount);
        // (5 + 4) / 2 = 4.5 across 2 approved reviews.
        Assert.Equal(4.5, profile.AverageRating);
        Assert.Equal(2, profile.ReviewCount);
        // Draft course is never listed publicly.
        Assert.DoesNotContain(profile.Courses, c => c.Code == "CS-999");
        Assert.Equal(2, profile.Courses.Count);
        var courseA = profile.Courses.Single(c => c.Code == "CS-101");
        Assert.Equal(4.5, courseA.AverageRating);
        Assert.Equal(2, courseA.RatingCount);
        Assert.Equal(2, courseA.StudentsCount);
        Assert.False(profile.IsOwnProfile);

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("ada@eduflow.ai", body); // email stays private
    }

    [Fact]
    public async Task PublicProfile_UnknownId_ReturnsNotFound()
    {
        await using var app = await StartApp();
        await SeedAsync(app);
        using var client = CreateClient(app);
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/instructors/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task PublicProfile_StudentId_ReturnsNotFound()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app);
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/instructors/{seed.Student.Id}")).StatusCode);
    }

    [Fact]
    public async Task InstructorsList_Anonymous_ContainsEveryInstructorWithOwnProfileFlagClear()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app);

        var list = await client.GetFromJsonAsync<List<InstructorListItemDto>>("/api/instructors");
        Assert.NotNull(list);
        Assert.Equal(2, list.Count);
        var ada = list.Single(i => i.Id == seed.Instructor.Id);
        Assert.Equal(4.5, ada.AverageRating);
        Assert.Equal(2, ada.ReviewCount);
        // Grace owns one published course (no reviews yet) but has no profile row —
        // the listing must still render her with zeros and empty strings, no crash.
        var grace = list.Single(i => i.Id == seed.InstructorB.Id);
        Assert.Equal(1, grace.PublishedCourseCount);
        Assert.Equal(1, grace.StudentCount);
        Assert.Equal(0.0, grace.AverageRating);
        Assert.Equal(0, grace.ReviewCount);
        Assert.Empty(grace.Expertise);
    }

    [Fact]
    public async Task PublicProfile_OwnProfileFlagSetForOwner()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Instructor", seed.Instructor.Id);

        var profile = await client.GetFromJsonAsync<PublicInstructorProfileDto>(
            $"/api/instructors/{seed.Instructor.Id}");
        Assert.NotNull(profile);
        Assert.True(profile.IsOwnProfile);
    }

    [Fact]
    public async Task MyProfile_AsInstructor_ReturnsEditableShapeWithStats()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Instructor", seed.Instructor.Id);

        var response = await client.GetAsync("/api/instructors/me/profile");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        Assert.Equal("Ada Lovelace", doc.RootElement.GetProperty("fullName").GetString());
        Assert.Equal("ada@eduflow.ai", doc.RootElement.GetProperty("email").GetString());
        Assert.Equal("I teach databases.", doc.RootElement.GetProperty("bio").GetString());
        Assert.Equal(3, doc.RootElement.GetProperty("stats").GetProperty("totalCourses").GetInt32());
    }

    // -------------------------------------------------------------------------
    // Own-profile editing
    // -------------------------------------------------------------------------

    [Fact]
    public async Task UpdateMyProfile_AsInstructor_UpdatesOwnProfile()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Instructor", seed.Instructor.Id);

        var response = await client.PutAsJsonAsync("/api/instructors/me/profile",
            new UpdateInstructorProfileRequest(
                FullName: "Ada Augusta Lovelace",
                AvatarUrl: "/uploads/avatars/ada.png",
                Headline: "First programmer",
                Bio: "Updated bio.",
                Expertise: "Databases, databases,  PostgreSQL",
                WebsiteUrl: "https://ada.example.com",
                LinkedInUrl: "https://linkedin.com/in/ada"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.FindAsync(seed.Instructor.Id);
        Assert.Equal("Ada Augusta Lovelace", user!.FullName);
        Assert.Equal("/uploads/avatars/ada.png", user.AvatarUrl);
        var profileRow = await db.InstructorProfiles.SingleAsync(p => p.UserId == seed.Instructor.Id);
        Assert.Equal("Updated bio.", profileRow.Bio);
        // Expertise is normalized: trimmed + de-duplicated.
        Assert.Equal("Databases, PostgreSQL", profileRow.Expertise);
    }

    [Fact]
    public async Task UpdateMyProfile_PartialUpdate_PreservesOtherFields()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Instructor", seed.Instructor.Id);

        var response = await client.PutAsJsonAsync("/api/instructors/me/profile",
            new UpdateInstructorProfileRequest(Bio: "Only the bio changes."));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal("Ada Lovelace", (await db.Users.FindAsync(seed.Instructor.Id))!.FullName);
        Assert.Equal("Only the bio changes.",
            (await db.InstructorProfiles.SingleAsync(p => p.UserId == seed.Instructor.Id)).Bio);
    }

    [Fact]
    public async Task UpdateMyProfile_CreatesProfileRow_WhenMissing()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorB.Id);

        var response = await client.PutAsJsonAsync("/api/instructors/me/profile",
            new UpdateInstructorProfileRequest(Headline: "Hello", Bio: "World"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var row = await db.InstructorProfiles.SingleOrDefaultAsync(p => p.UserId == seed.InstructorB.Id);
        Assert.NotNull(row);
        Assert.Equal("Hello", row!.Headline);
    }

    [Fact]
    public async Task UpdateMyProfile_OnlyTouchesCallerRow()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Instructor", seed.InstructorB.Id);

        await client.PutAsJsonAsync("/api/instructors/me/profile",
            new UpdateInstructorProfileRequest(FullName: "Changed", Bio: "Changed"));

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        // Ada's profile is untouched: the endpoint binds ownership from the JWT only.
        Assert.Equal("Ada Lovelace", (await db.Users.FindAsync(seed.Instructor.Id))!.FullName);
        Assert.Equal("I teach databases.",
            (await db.InstructorProfiles.SingleAsync(p => p.UserId == seed.Instructor.Id)).Bio);
    }

    [Fact]
    public async Task UpdateMyProfile_AsStudent_Forbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Student", seed.Student.Id);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await client.PutAsJsonAsync("/api/instructors/me/profile",
                new UpdateInstructorProfileRequest(Bio: "hijack"))).StatusCode);
    }

    [Fact]
    public async Task UpdateMyProfile_Unauthenticated_Unauthorized()
    {
        await using var app = await StartApp();
        using var client = CreateClient(app);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PutAsJsonAsync("/api/instructors/me/profile",
                new UpdateInstructorProfileRequest(Bio: "hijack"))).StatusCode);
    }

    [Theory]
    [InlineData("javascript:alert(1)", null, null)]
    [InlineData(null, "ftp://files.example.com/x", null)]
    [InlineData(null, null, "//evil.com/avatar.png")]
    public async Task UpdateMyProfile_UnsafeUrls_Rejected(string? avatar, string? website, string? linkedIn)
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Instructor", seed.Instructor.Id);
        var response = await client.PutAsJsonAsync("/api/instructors/me/profile",
            new UpdateInstructorProfileRequest(AvatarUrl: avatar, WebsiteUrl: website, LinkedInUrl: linkedIn));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // -------------------------------------------------------------------------
    // Review submission + eligibility
    // -------------------------------------------------------------------------

    [Fact]
    public async Task SubmitReview_EligibleStudent_CreatesReviewAndRefreshesAggregates()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Student", seed.Student.Id);

        // Alan holds a Completed enrollment on CS-102: a verified enrollment.
        var response = await client.PostAsJsonAsync($"/api/courses/{seed.CourseB.Id}/reviews",
            new CreateCourseReviewRequest(2, "Tough but fair."));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        var review = doc.RootElement.GetProperty("review").Deserialize<CourseReviewDto>(WebJsonOptions);
        Assert.NotNull(review);
        Assert.Equal(2, review!.Rating);
        Assert.Equal("Approved", review.Status);

        // Course aggregate + instructor aggregate follow the single documented method.
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var courseB = await db.Courses.FindAsync(seed.CourseB.Id);
        Assert.Equal(1, courseB!.RatingCount);
        Assert.Equal(2.0, courseB.AverageRating);

        var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();
        var instructor = await rating.GetInstructorSummaryAsync(seed.Instructor.Id);
        Assert.Equal(3, instructor.ReviewCount); // 5 + 4 + 2
        Assert.Equal(3.67, instructor.AverageRating); // 11 / 3 rounded
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    [InlineData(-3)]
    public async Task SubmitReview_RatingOutsideOneToFive_BadRequest(int stars)
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Student", seed.Student.Id);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsJsonAsync($"/api/courses/{seed.CourseB.Id}/reviews",
                new CreateCourseReviewRequest(stars, "x"))).StatusCode);
    }

    [Fact]
    public async Task SubmitReview_CommentTooLong_BadRequest()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Student", seed.Student.Id);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostAsJsonAsync($"/api/courses/{seed.CourseB.Id}/reviews",
                new CreateCourseReviewRequest(5, new string('x', 2001)))).StatusCode);
    }

    [Fact]
    public async Task SubmitReview_UnknownCourse_NotFound()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Student", seed.Student.Id);
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.PostAsJsonAsync($"/api/courses/{Guid.NewGuid()}/reviews",
                new CreateCourseReviewRequest(5, "x"))).StatusCode);
    }

    [Fact]
    public async Task SubmitReview_NotEnrolled_Forbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        // Katherine has no enrollment on Grace's course.
        using var client = CreateClient(app, "Student", seed.Student2.Id);
        var response = await client.PostAsJsonAsync($"/api/courses/{seed.OtherCourse.Id}/reviews",
            new CreateCourseReviewRequest(5, "x"));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains("enrolled", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task SubmitReview_PendingEnrollment_Forbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        // Katherine's CS-102 enrollment is Pending: not a verified enrollment.
        using var client = CreateClient(app, "Student", seed.Student2.Id);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await client.PostAsJsonAsync($"/api/courses/{seed.CourseB.Id}/reviews",
                new CreateCourseReviewRequest(5, "x"))).StatusCode);
    }

    [Fact]
    public async Task SubmitReview_DroppedEnrollment_Forbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var enrollment = await db.Enrollments.SingleAsync(
                e => e.CourseId == seed.CourseB.Id && e.StudentId == seed.Student.Id);
            enrollment.Status = EnrollmentStatus.Dropped;
            await db.SaveChangesAsync();
        }

        using var client = CreateClient(app, "Student", seed.Student.Id);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await client.PostAsJsonAsync($"/api/courses/{seed.CourseB.Id}/reviews",
                new CreateCourseReviewRequest(5, "x"))).StatusCode);
    }

    [Fact]
    public async Task SubmitReview_UnpublishedCourse_Forbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Enrollments.Add(new Enrollment
            {
                CourseId = seed.DraftCourse.Id,
                StudentId = seed.Student.Id,
                Status = EnrollmentStatus.Active
            });
            await db.SaveChangesAsync();
        }

        using var client = CreateClient(app, "Student", seed.Student.Id);
        var response = await client.PostAsJsonAsync($"/api/courses/{seed.DraftCourse.Id}/reviews",
            new CreateCourseReviewRequest(5, "x"));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains("published", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task SubmitReview_AsInstructorRole_ForbiddenByPolicy()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        // Instructors can view reviews but can never submit one.
        using var client = CreateClient(app, "Instructor", seed.InstructorB.Id);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await client.PostAsJsonAsync($"/api/courses/{seed.CourseA.Id}/reviews",
                new CreateCourseReviewRequest(5, "x"))).StatusCode);
    }

    [Fact]
    public async Task SubmitReview_Twice_UpdatesSameRow_KeepsSingleActiveReview()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Student", seed.Student.Id);

        await client.PostAsJsonAsync($"/api/courses/{seed.CourseA.Id}/reviews",
            new CreateCourseReviewRequest(5, "First."));
        var second = await client.PostAsJsonAsync($"/api/courses/{seed.CourseA.Id}/reviews",
            new CreateCourseReviewRequest(3, "Changed my mind."));
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var rows = await db.CourseReviews
            .Where(r => r.CourseId == seed.CourseA.Id && r.StudentId == seed.Student.Id)
            .ToListAsync();
        var single = Assert.Single(rows);
        Assert.Equal(3, single.Rating);
        Assert.Equal("Changed my mind.", single.Comment);

        // (3 + 4) / 2 = 3.5 — the stale 5 is gone from the aggregate.
        var courseA = await db.Courses.FindAsync(seed.CourseA.Id);
        Assert.Equal(2, courseA!.RatingCount);
        Assert.Equal(3.5, courseA.AverageRating);
    }

    [Fact]
    public async Task EligibilityService_OwnCourseAndUnknownCourse_Denied()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var scope = app.Services.CreateScope();
        var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();

        var own = await rating.CheckReviewEligibilityAsync(seed.Instructor.Id, seed.CourseA.Id);
        Assert.False(own.IsEligible);

        var missing = await rating.CheckReviewEligibilityAsync(seed.Student.Id, Guid.NewGuid());
        Assert.False(missing.IsEligible);

        var anonymous = await rating.CheckReviewEligibilityAsync(Guid.Empty, seed.CourseA.Id);
        Assert.False(anonymous.IsEligible);
    }

    // -------------------------------------------------------------------------
    // Review reads
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PublicReviews_ReturnOnlyApproved()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.CourseReviews.Add(new CourseReview
            {
                CourseId = seed.CourseB.Id, StudentId = seed.Student.Id,
                Rating = 1, Comment = "Hidden.", Status = ReviewStatus.Rejected
            });
            await db.SaveChangesAsync();
        }

        using var client = CreateClient(app); // anonymous
        var reviews = await client.GetFromJsonAsync<List<CourseReviewDto>>(
            $"/api/courses/{seed.CourseA.Id}/reviews");
        Assert.NotNull(reviews);
        Assert.Equal(2, reviews.Count);
        Assert.All(reviews, r => Assert.Equal("Approved", r.Status));

        var courseB = await client.GetFromJsonAsync<List<CourseReviewDto>>(
            $"/api/courses/{seed.CourseB.Id}/reviews");
        Assert.NotNull(courseB);
        Assert.Empty(courseB);
    }

    [Fact]
    public async Task MyReview_ReturnsOwnReview_OrEmptyFlag()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var alan = CreateClient(app, "Student", seed.Student.Id);
        using var doc = await JsonDocument.ParseAsync(
            await (await alan.GetAsync($"/api/courses/{seed.CourseA.Id}/reviews/mine")).Content.ReadAsStreamAsync());
        Assert.True(doc.RootElement.GetProperty("hasReview").GetBoolean());
        Assert.Equal(5, doc.RootElement.GetProperty("review").GetProperty("rating").GetInt32());

        using var kate = CreateClient(app, "Student", seed.Student2.Id);
        using var doc2 = await JsonDocument.ParseAsync(
            await (await kate.GetAsync($"/api/courses/{seed.CourseB.Id}/reviews/mine")).Content.ReadAsStreamAsync());
        Assert.False(doc2.RootElement.GetProperty("hasReview").GetBoolean());
    }

    [Fact]
    public async Task CourseCards_And_Detail_ShowRealInstructorNameAndRating()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app);

        var courses = await client.GetFromJsonAsync<List<CourseDto>>("/api/courses");
        Assert.NotNull(courses);
        var card = courses.Single(c => c.Code == "CS-101");
        Assert.Equal("Ada Lovelace", card.InstructorName);
        Assert.Equal(4.5, card.AverageRating);
        Assert.Equal(2, card.RatingCount);

        var detail = await client.GetFromJsonAsync<CourseDetailDto>($"/api/courses/{seed.CourseA.Id}");
        Assert.NotNull(detail);
        Assert.Equal(4.5, detail.AverageRating);
        Assert.Equal(2, detail.RatingCount);
        Assert.Equal("Ada Lovelace", detail.InstructorName);
    }

    [Fact]
    public async Task InstructorDashboard_UsesDocumentedAggregate()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Instructor", seed.Instructor.Id);

        using var doc = await JsonDocument.ParseAsync(
            await (await client.GetAsync("/api/instructor/dashboard")).Content.ReadAsStreamAsync());
        var stats = doc.RootElement.GetProperty("stats");
        Assert.Equal(4.5, stats.GetProperty("averageRating").GetDouble());
        Assert.Equal(2, stats.GetProperty("totalReviews").GetInt32());
    }

    [Fact]
    public async Task InstructorReviews_SeesAllStatusesForOwnCoursesOnly()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.CourseReviews.Add(new CourseReview
            {
                CourseId = seed.CourseB.Id, StudentId = seed.Student.Id,
                Rating = 2, Comment = "Pending moderation.", Status = ReviewStatus.Pending
            });
            await db.SaveChangesAsync();
        }

        using var ada = CreateClient(app, "Instructor", seed.Instructor.Id);
        var mine = await ada.GetFromJsonAsync<List<CourseReviewDto>>("/api/instructor/reviews");
        Assert.NotNull(mine);
        Assert.Equal(3, mine.Count); // 2 approved + 1 pending
        Assert.Contains(mine, r => r.Status == "Pending");

        using var grace = CreateClient(app, "Instructor", seed.InstructorB.Id);
        var hers = await grace.GetFromJsonAsync<List<CourseReviewDto>>("/api/instructor/reviews");
        Assert.NotNull(hers);
        Assert.Empty(hers);
    }

    [Fact]
    public async Task InstructorAggregate_WeightsByReviewCount_AndExcludesDrafts()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            // Loud minority on a draft course: must not move the aggregate.
            db.CourseReviews.AddRange(
                new CourseReview { CourseId = seed.DraftCourse.Id, StudentId = seed.Student.Id, Rating = 1, Comment = "Draft.", Status = ReviewStatus.Approved },
                new CourseReview { CourseId = seed.DraftCourse.Id, StudentId = seed.Student2.Id, Rating = 1, Comment = "Draft.", Status = ReviewStatus.Approved });
            await db.SaveChangesAsync();
        }

        using var client = CreateClient(app);
        var profile = await client.GetFromJsonAsync<PublicInstructorProfileDto>(
            $"/api/instructors/{seed.Instructor.Id}");
        Assert.NotNull(profile);
        // Published courses only: (5 + 4) / 2.
        Assert.Equal(4.5, profile.AverageRating);
        Assert.Equal(2, profile.ReviewCount);
    }

    // -------------------------------------------------------------------------
    // Review deletion
    // -------------------------------------------------------------------------

    [Fact]
    public async Task DeleteReview_Author_RemovesAndRecalculates()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app, "Student", seed.Student2.Id);

        var mine = await client.GetFromJsonAsync<JsonElement>(
            $"/api/courses/{seed.CourseA.Id}/reviews/mine");
        var reviewId = mine.GetProperty("review").GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.OK,
            (await client.DeleteAsync($"/api/courses/{seed.CourseA.Id}/reviews/{reviewId}")).StatusCode);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await db.CourseReviews.AnyAsync(r => r.Id == reviewId));
        var courseA = await db.Courses.FindAsync(seed.CourseA.Id);
        Assert.Equal(1, courseA!.RatingCount);
        Assert.Equal(5.0, courseA.AverageRating);
    }

    [Fact]
    public async Task DeleteReview_OtherStudent_Forbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var reviewId = await db.CourseReviews
            .Where(r => r.CourseId == seed.CourseA.Id && r.StudentId == seed.Student.Id)
            .Select(r => r.Id)
            .SingleAsync();

        using var kate = CreateClient(app, "Student", seed.Student2.Id);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await kate.DeleteAsync($"/api/courses/{seed.CourseA.Id}/reviews/{reviewId}")).StatusCode);
        Assert.True(await db.CourseReviews.AnyAsync(r => r.Id == reviewId));
    }

    [Fact]
    public async Task DeleteReview_CourseInstructor_Forbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var reviewId = await db.CourseReviews
            .Where(r => r.CourseId == seed.CourseA.Id && r.StudentId == seed.Student.Id)
            .Select(r => r.Id)
            .SingleAsync();

        // Instructors may view reviews but never modify student ratings.
        using var ada = CreateClient(app, "Instructor", seed.Instructor.Id);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await ada.DeleteAsync($"/api/courses/{seed.CourseA.Id}/reviews/{reviewId}")).StatusCode);
        Assert.True(await db.CourseReviews.AnyAsync(r => r.Id == reviewId));
    }

    [Fact]
    public async Task DeleteReview_Admin_Allowed()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var reviewId = await db.CourseReviews
            .Where(r => r.CourseId == seed.CourseA.Id && r.StudentId == seed.Student.Id)
            .Select(r => r.Id)
            .SingleAsync();

        using var admin = CreateClient(app, "Admin", seed.Admin.Id);
        Assert.Equal(HttpStatusCode.OK,
            (await admin.DeleteAsync($"/api/courses/{seed.CourseA.Id}/reviews/{reviewId}")).StatusCode);
        Assert.False(await db.CourseReviews.AnyAsync(r => r.Id == reviewId));
    }

    [Fact]
    public async Task DeleteReview_Unauthenticated_Unauthorized()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var client = CreateClient(app);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.DeleteAsync($"/api/courses/{seed.CourseA.Id}/reviews/{Guid.NewGuid()}")).StatusCode);
    }

    // -------------------------------------------------------------------------
    // Admin moderation
    // -------------------------------------------------------------------------

    [Fact]
    public async Task AdminReject_ApprovedReview_HidesItAndExcludesFromAggregates()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var reviewId = await db.CourseReviews
            .Where(r => r.CourseId == seed.CourseA.Id && r.StudentId == seed.Student2.Id)
            .Select(r => r.Id)
            .SingleAsync();

        using var admin = CreateClient(app, "Admin", seed.Admin.Id);
        var response = await admin.PostAsync($"/api/admin/reviews/{reviewId}/reject", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var check = app.Services.CreateScope();
        var db2 = check.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var row = await db2.CourseReviews.FindAsync(reviewId);
        Assert.Equal(ReviewStatus.Rejected, row!.Status);
        Assert.NotNull(row.ModeratedAt);
        var courseA = await db2.Courses.FindAsync(seed.CourseA.Id);
        Assert.Equal(1, courseA!.RatingCount);
        Assert.Equal(5.0, courseA.AverageRating);

        using var anon = CreateClient(app);
        var visible = await anon.GetFromJsonAsync<List<CourseReviewDto>>(
            $"/api/courses/{seed.CourseA.Id}/reviews");
        Assert.Single(visible!);
    }

    [Fact]
    public async Task AdminApprove_PendingReview_PublishesItAndCountsIt()
    {
        await using var app = await StartApp(requireApproval: true);
        var seed = await SeedAsync(app);

        // With approval required, a fresh submission starts Pending and stays hidden.
        using var alan = CreateClient(app, "Student", seed.Student.Id);
        var posted = await alan.PostAsJsonAsync($"/api/courses/{seed.CourseB.Id}/reviews",
            new CreateCourseReviewRequest(5, "Awaiting moderation."));
        Assert.Equal(HttpStatusCode.OK, posted.StatusCode);
        using var postedDoc = await JsonDocument.ParseAsync(await posted.Content.ReadAsStreamAsync());
        Assert.Equal("Pending", postedDoc.RootElement.GetProperty("review").GetProperty("status").GetString());
        var reviewId = postedDoc.RootElement.GetProperty("review").GetProperty("id").GetGuid();

        using var anon = CreateClient(app);
        var before = await anon.GetFromJsonAsync<List<CourseReviewDto>>(
            $"/api/courses/{seed.CourseB.Id}/reviews");
        Assert.NotNull(before);
        Assert.Empty(before);

        using var admin = CreateClient(app, "Admin", seed.Admin.Id);
        var pending = await admin.GetFromJsonAsync<List<AdminCourseReviewDto>>(
            "/api/admin/reviews?status=Pending");
        Assert.NotNull(pending);
        Assert.Contains(pending, r => r.Id == reviewId);

        Assert.Equal(HttpStatusCode.OK,
            (await admin.PostAsync($"/api/admin/reviews/{reviewId}/approve", null)).StatusCode);

        var after = await anon.GetFromJsonAsync<List<CourseReviewDto>>(
            $"/api/courses/{seed.CourseB.Id}/reviews");
        Assert.NotNull(after);
        Assert.Single(after);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var courseB = await db.Courses.FindAsync(seed.CourseB.Id);
        Assert.Equal(1, courseB!.RatingCount);
        Assert.Equal(5.0, courseB.AverageRating);
    }

    [Fact]
    public async Task AdminModeration_AsInstructor_Forbidden()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var ada = CreateClient(app, "Instructor", seed.Instructor.Id);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await ada.PostAsync($"/api/admin/reviews/{Guid.NewGuid()}/approve", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await ada.GetAsync("/api/admin/reviews")).StatusCode);
    }

    [Fact]
    public async Task AdminDeleteReview_RemovesAndRecalculates()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var reviewId = await db.CourseReviews
            .Where(r => r.CourseId == seed.CourseA.Id && r.StudentId == seed.Student.Id)
            .Select(r => r.Id)
            .SingleAsync();

        using var admin = CreateClient(app, "Admin", seed.Admin.Id);
        Assert.Equal(HttpStatusCode.OK,
            (await admin.DeleteAsync($"/api/admin/reviews/{reviewId}")).StatusCode);

        using var check = app.Services.CreateScope();
        var db2 = check.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await db2.CourseReviews.AnyAsync(r => r.Id == reviewId));
        var courseA = await db2.Courses.FindAsync(seed.CourseA.Id);
        Assert.Equal(1, courseA!.RatingCount);
        Assert.Equal(4.0, courseA.AverageRating);
    }

    // -------------------------------------------------------------------------
    // Rating service unit checks (no HTTP)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task RatingService_EmptyCourse_ReturnsZeroSummary()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var scope = app.Services.CreateScope();
        var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();

        var empty = await rating.GetCourseSummaryAsync(seed.CourseB.Id);
        Assert.Equal(0.0, empty.AverageRating);
        Assert.Equal(0, empty.ReviewCount);

        Assert.False(await rating.RecalculateCourseAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task RatingService_BatchSummaries_CoverRequestedCourses()
    {
        await using var app = await StartApp();
        var seed = await SeedAsync(app);
        using var scope = app.Services.CreateScope();
        var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();

        var summaries = await rating.GetCourseSummariesAsync(
            new[] { seed.CourseA.Id, seed.CourseB.Id, Guid.NewGuid() });
        Assert.Equal(3, summaries.Count);
        Assert.Equal(4.5, summaries[seed.CourseA.Id].AverageRating);
        Assert.Equal(2, summaries[seed.CourseA.Id].ReviewCount);
        Assert.Equal(CourseRatingSummary.Empty, summaries[seed.CourseB.Id]);
    }

    [Fact]
    public async Task RatingService_ResolveSubmittedStatus_FollowsModerationOption()
    {
        await using var app = await StartApp();
        await SeedAsync(app);
        using (var scope = app.Services.CreateScope())
        {
            var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();
            Assert.Equal(ReviewStatus.Approved, rating.ResolveSubmittedStatus());
        }

        await using var strict = await StartApp(requireApproval: true);
        await SeedAsync(strict);
        using (var scope = strict.Services.CreateScope())
        {
            var rating = scope.ServiceProvider.GetRequiredService<IRatingService>();
            Assert.Equal(ReviewStatus.Pending, rating.ResolveSubmittedStatus());
        }
    }

    // -------------------------------------------------------------------------
    // Model shape
    // -------------------------------------------------------------------------

    [Fact]
    public void Model_ReviewConstraints_AreConfigured()
    {
        using var db = CreateInMemoryDb();
        var model = db.Model;

        var reviewType = model.FindEntityType(typeof(CourseReview));
        Assert.NotNull(reviewType);
        // Exactly one active review per (course, student).
        var unique = reviewType!.GetIndexes()
            .FirstOrDefault(i => i.IsUnique && i.Properties.Count == 2);
        Assert.NotNull(unique);
        Assert.Contains("CourseId", unique!.Properties.Select(p => p.Name));
        Assert.Contains("StudentId", unique.Properties.Select(p => p.Name));
        // Moderation status is persisted as text.
        var status = reviewType.FindProperty(nameof(CourseReview.Status));
        Assert.NotNull(status);
        Assert.Equal(typeof(string), status!.GetProviderClrType());

        var profileType = model.FindEntityType(typeof(InstructorProfile));
        Assert.NotNull(profileType);
        var profileUnique = profileType!.GetIndexes()
            .FirstOrDefault(i => i.IsUnique && i.Properties.Count == 1);
        Assert.NotNull(profileUnique);
        Assert.Contains("UserId", profileUnique!.Properties.Select(p => p.Name));
    }

    private static ApplicationDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var ctx = new ApplicationDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }
}
