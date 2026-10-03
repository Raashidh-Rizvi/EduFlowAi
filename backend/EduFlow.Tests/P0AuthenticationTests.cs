using System.Net;
using System.Net.Http.Json;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EduFlow.Tests;

public partial class AuthSessionRbacTests
{
    [Theory]
    [InlineData("Student", HttpStatusCode.Created)]
    [InlineData("Admin", HttpStatusCode.BadRequest)]
    [InlineData("Instructor", HttpStatusCode.BadRequest)]
    [InlineData("Administrator", HttpStatusCode.BadRequest)]
    [InlineData(0, HttpStatusCode.BadRequest)]
    [InlineData(1, HttpStatusCode.BadRequest)]
    public async Task P0_PublicRegistration_EnforcesStudentRole(object role, HttpStatusCode expected)
    {
        await using var app = await StartAuthApp();
        using var client = CreateClient(app);
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new { FullName = "New learner", Email = "learner@example.test", Password = TestPassword, Role = role });
        Assert.Equal(expected, response.StatusCode);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(expected == HttpStatusCode.Created ? 1 : 0, await db.Users.CountAsync());
        if (expected == HttpStatusCode.Created)
        {
            var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
            Assert.Equal("Student", auth!.Role);
            UseBearer(client, auth.Token);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
        }
    }

    [Theory]
    [InlineData("agents-topology")]
    [InlineData("tools-registry")]
    [InlineData("observability-metrics")]
    public async Task P0_OperationalAiEndpoints_RejectAnonymousAndNonAdmin(string endpoint)
    {
        await using var app = await StartAuthApp();
        using var client = CreateClient(app);
        var path = "/api/aireview/" + endpoint;
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path)).StatusCode);
        foreach (var role in new[] { UserRole.Student, UserRole.Instructor })
        {
            var user = await SeedUserAsync(app, role.ToString(), role + "@example.test", role);
            UseBearer(client, (await LoginAsync(client, user.Email)).Token);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync(path)).StatusCode);
        }
    }

    [Theory]
    [InlineData("/api/gamification/squads")]
    [InlineData("/api/v1/gamification/squads")]
    public async Task P0_SquadAccess_IsSelfOrStaffAndListsAreStaffOnly(string prefix)
    {
        await using var app = await StartAuthApp();
        var student = await SeedUserAsync(app, "Learner", "student@example.test", UserRole.Student);
        var other = await SeedUserAsync(app, "Other", "other@example.test", UserRole.Student);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var team = new Team { Name = "P0 squad", LeaderId = student.Id };
            db.Teams.Add(team);
            db.TeamMembers.AddRange(
                new TeamMember { TeamId = team.Id, StudentId = student.Id, Role = TeamRole.Leader },
                new TeamMember { TeamId = team.Id, StudentId = other.Id, Role = TeamRole.Member });
            await db.SaveChangesAsync();
        }
        using var client = CreateClient(app);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(prefix + "/" + student.Id)).StatusCode);
        UseBearer(client, (await LoginAsync(client, student.Email)).Token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(prefix + "/" + student.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync(prefix + "/" + other.Id)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync(prefix)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync(prefix + "/eligible-students")).StatusCode);
        foreach (var role in new[] { UserRole.Instructor, UserRole.Admin })
        {
            var staff = await SeedUserAsync(app, "Staff", role + "@example.test", role);
            UseBearer(client, (await LoginAsync(client, staff.Email)).Token);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(prefix + "/" + other.Id)).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(prefix)).StatusCode);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(prefix + "/eligible-students")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync(prefix, new { Name = "Staff squad" })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsync(prefix + "/" + Guid.NewGuid() + "/join", null)).StatusCode);
        }
    }

    [Theory]
    [InlineData("/api/students/me/courses")]
    [InlineData("/api/students/me/enrollment-requests")]
    public async Task P0_StudentApis_RequireStudentIdentity(string path)
    {
        await using var app = await StartAuthApp();
        using var client = CreateClient(app);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path)).StatusCode);
        foreach (var role in new[] { UserRole.Instructor, UserRole.Admin, UserRole.Student })
        {
            var user = await SeedUserAsync(app, role.ToString(), role + "@example.test", role);
            UseBearer(client, (await LoginAsync(client, user.Email)).Token);
            var expected = role == UserRole.Student ? HttpStatusCode.OK : HttpStatusCode.Forbidden;
            Assert.Equal(expected, (await client.GetAsync(path)).StatusCode);
        }
    }

    [Fact]
    public async Task P0_DeactivatedAccount_CannotLoginRefreshOrUseExistingJwt()
    {
        await using var app = await StartAuthApp();
        var user = await SeedUserAsync(app, "Learner", "learner@example.test", UserRole.Student);
        using var client = CreateClient(app);
        var auth = await LoginAsync(client, user.Email);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            (await db.Users.FindAsync(user.Id))!.IsActive = false;
            await db.SaveChangesAsync();
        }
        UseBearer(client, auth.Token);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshTokenRequest(auth.Token, auth.RefreshToken))).StatusCode);
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.Email, TestPassword));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("inactive", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task P0_RoleChange_InvalidatesExistingJwt()
    {
        await using var app = await StartAuthApp();
        var user = await SeedUserAsync(app, "Admin", "admin@example.test", UserRole.Admin);
        using var client = CreateClient(app);
        var auth = await LoginAsync(client, user.Email);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            (await db.Users.FindAsync(user.Id))!.Role = UserRole.Student;
            await db.SaveChangesAsync();
        }
        UseBearer(client, auth.Token);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/users")).StatusCode);
    }
}

public class P0DemoAccountPolicyTests
{
    private static ApplicationDbContext CreateDb() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public void NormalStartup_DisablesKnownDemoAndRevokesTokensWithoutDeletingData(bool development, bool enabled)
    {
        using var db = CreateDb();
        var demo = new User { Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Email = "admin@eduflow.ai", FullName = "Demo", Role = UserRole.Admin, PasswordHash = "unchanged" };
        var real = new User { Email = "admin@example.test", FullName = "Real admin", Role = UserRole.Admin };
        var similarlyNamed = new User { Email = "instructor@eduflow.ai", FullName = "Not a seed", Role = UserRole.Instructor };
        var course = new Course { InstructorId = demo.Id, Code = "KEEP", Title = "Preserved course" };
        var refresh = new RefreshToken { UserId = demo.Id, Token = "demo-refresh", ExpiresAt = DateTime.UtcNow.AddDays(1) };
        db.AddRange(demo, real, similarlyNamed, course, refresh);
        db.SaveChanges();
        DbInitializer.ApplyDemoAccountPolicy(db, development, enabled, resetCredentials: true);
        Assert.False(demo.IsActive);
        Assert.True(refresh.IsRevoked);
        Assert.Equal("unchanged", demo.PasswordHash);
        Assert.True(real.IsActive);
        Assert.True(similarlyNamed.IsActive);
        Assert.Equal(3, db.Users.Count());
        Assert.Equal(demo.Id, db.Courses.Single().InstructorId);
        DbInitializer.ApplyDemoAccountPolicy(db, development, enabled); // idempotent
        Assert.Single(db.Courses);
    }

    [Fact]
    public void NormalStartup_DoesNotProvisionMissingDemoAccounts()
    {
        using var db = CreateDb();
        DbInitializer.ApplyDemoAccountPolicy(db, true, false);
        Assert.Empty(db.Users);
    }

    [Fact]
    public void ExplicitDevelopmentDemo_DoesNotResetExistingCredentialsUnlessRequested()
    {
        using var db = CreateDb();
        var demo = new User { Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Email = "admin@eduflow.ai", FullName = "Demo", Role = UserRole.Admin, IsActive = false, PasswordHash = "unchanged" };
        var instructor = new User { Id = Guid.Parse("22222222-2222-2222-2222-222222222223"),
            Email = "instructor.b@eduflow.ai", FullName = "Other instructor", Role = UserRole.Instructor, IsActive = false, PasswordHash = "also-unchanged" };
        db.AddRange(demo, instructor);
        db.SaveChanges();
        DbInitializer.ApplyDemoAccountPolicy(db, true, true);
        Assert.False(demo.IsActive);
        Assert.False(instructor.IsActive);
        Assert.Equal("unchanged", demo.PasswordHash);
        Assert.Equal("also-unchanged", instructor.PasswordHash);
        Assert.Contains(db.Users, u => u.Email == "student@eduflow.ai");
        DbInitializer.ApplyDemoAccountPolicy(db, true, true, resetCredentials: true);
        Assert.True(demo.IsActive);
        Assert.True(instructor.IsActive);
        Assert.NotEqual("unchanged", demo.PasswordHash);
        Assert.NotEqual("also-unchanged", instructor.PasswordHash);
    }
}
