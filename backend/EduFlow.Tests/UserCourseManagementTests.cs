using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using EduFlow.Api.Controllers;
using EduFlow.Core.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Unit tests for Member 1 – User &amp; Course Management.
/// Covers: enrollment rules, course publishing workflow, profile management.
/// </summary>
public class UserCourseManagementTests
{
    // Focused HTTP tests use an isolated EF database and test authentication.
    // Requests still pass through the real controller authorization middleware.
    private static async Task<WebApplication> StartUserManagementApp(string? postgresConnection = null)
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
            ["JwtSettings:Secret"] = "user-management-test-secret-at-least-32-characters-long"
        });
        var databaseName = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<ApplicationDbContext>(options =>
        {
            if (postgresConnection == null) options.UseInMemoryDatabase(databaseName);
            else options.UseNpgsql(postgresConnection, npgsql => npgsql.EnableRetryOnFailure(3));
        });
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddAuthentication("UserManagementTest")
            .AddScheme<AuthenticationSchemeOptions, UserManagementTestAuthHandler>("UserManagementTest", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddControllers().AddApplicationPart(typeof(AdminController).Assembly);
        var app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync();
        return app;
    }

    private static HttpClient CreateUserManagementClient(WebApplication app, string? role = null, Guid? actorId = null)
    {
        var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
        var client = new HttpClient { BaseAddress = new Uri(addresses.Addresses.Single()) };
        if (role != null) client.DefaultRequestHeaders.Add("X-Test-Role", role);
        if (actorId != null) client.DefaultRequestHeaders.Add("X-Test-UserId", actorId.ToString());
        return client;
    }

    [Theory]
    [InlineData("Student")]
    [InlineData("Instructor")]
    [InlineData("Admin")]
    public async Task AdminCreateUser_PersistsSelectedRole_HashesPassword_AndReturnsNoCredentials(string role)
    {
        await using var app = await StartUserManagementApp();
        using var client = CreateUserManagementClient(app, "Admin");
        const string password = "StrongPassword123!";
        var response = await client.PostAsJsonAsync("/api/admin/users",
            new CreateUserRequest("  New User  ", " NewUser@Example.com ", password, role));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<CreatedUserDto>();
        Assert.NotNull(created);
        Assert.Equal("New User", created.FullName);
        Assert.Equal("newuser@example.com", created.Email);
        Assert.Equal(role, created.Role);
        Assert.True(created.IsActive);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(password, body);
        Assert.DoesNotContain("password", body.ToLowerInvariant());
        Assert.DoesNotContain("token", body.ToLowerInvariant());

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.SingleAsync();
        Assert.Equal(created.Id, user.Id);
        Assert.Equal(role, user.Role.ToString());
        Assert.NotEqual(password, user.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify(password, user.PasswordHash));
        Assert.Empty(await db.RefreshTokens.ToListAsync());
        if (role == "Student")
        {
            var xp = await db.StudentXp.SingleAsync(x => x.StudentId == user.Id);
            var streak = await db.StudentStreaks.SingleAsync(x => x.StudentId == user.Id);
            Assert.Equal(0, xp.TotalXp);
            Assert.Equal(1, xp.CurrentLevel);
            Assert.Equal(50, xp.Coins);
            Assert.Equal(0, streak.CurrentStreak);
            Assert.Equal(2, streak.FreezeTokensAvailable);
        }
        else
        {
            Assert.Empty(await db.StudentXp.ToListAsync());
            Assert.Empty(await db.StudentStreaks.ToListAsync());
        }
        var listed = await client.GetStringAsync("/api/admin/users");
        Assert.Contains(created.Email, listed);
        Assert.DoesNotContain(password, listed);
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(created.Email, password));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized)]
    [InlineData("Student", HttpStatusCode.Forbidden)]
    [InlineData("Instructor", HttpStatusCode.Forbidden)]
    public async Task AdminCreateUser_RejectsUnauthenticatedAndNonAdmin(string? role, HttpStatusCode expected)
    {
        await using var app = await StartUserManagementApp();
        using var client = CreateUserManagementClient(app, role);
        var response = await client.PostAsJsonAsync("/api/admin/users",
            new CreateUserRequest("New User", "new@example.com", "Password123!", "Admin"));
        Assert.Equal(expected, response.StatusCode);
        using var scope = app.Services.CreateScope();
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.ToListAsync());
    }

    [Fact]
    public async Task AdminCreateUser_RejectsDuplicateEmailIgnoringCaseAndWhitespace()
    {
        await using var app = await StartUserManagementApp();
        using var client = CreateUserManagementClient(app, "Admin");
        var request = new CreateUserRequest("New User", "duplicate@example.com", "Password123!", "Student");
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/admin/users", request)).StatusCode);
        var duplicate = await client.PostAsJsonAsync("/api/admin/users", request with { Email = " DUPLICATE@EXAMPLE.COM " });
        Assert.Equal(HttpStatusCode.BadRequest, duplicate.StatusCode);
        Assert.Contains("already exists", await duplicate.Content.ReadAsStringAsync());
        using var scope = app.Services.CreateScope();
        Assert.Single(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.ToListAsync());
    }

    [Theory]
    [InlineData("", "new@example.com", "Password123!", "Student")]
    [InlineData("   ", "new@example.com", "Password123!", "Student")]
    [InlineData("New User", "invalid-email", "Password123!", "Student")]
    [InlineData("New User", "", "Password123!", "Student")]
    [InlineData("New User", "new@example.com", "short", "Student")]
    [InlineData("New User", "new@example.com", "        ", "Student")]
    [InlineData("New User", "new@example.com", "Password123!", "Unknown")]
    [InlineData("New User", "new@example.com", "Password123!", "1")]
    public async Task AdminCreateUser_RejectsInvalidFields(string name, string email, string password, string role)
    {
        await using var app = await StartUserManagementApp();
        using var client = CreateUserManagementClient(app, "Admin");
        var response = await client.PostAsJsonAsync("/api/admin/users", new CreateUserRequest(name, email, password, role));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var scope = app.Services.CreateScope();
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.ToListAsync());
    }

    [Theory]
    [InlineData(UserRole.Instructor)]
    [InlineData(UserRole.Admin)]
    [InlineData((UserRole)999)]
    public async Task PublicRegister_RejectsPrivilegeEscalation(UserRole role)
    {
        await using var app = await StartUserManagementApp();
        using var client = CreateUserManagementClient(app);
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Public User", "public@example.com", "Password123!", role));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var scope = app.Services.CreateScope();
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.ToListAsync());
    }

    [Fact]
    public async Task PublicRegister_DefaultsToStudent_AndStillAllowsLogin()
    {
        await using var app = await StartUserManagementApp();
        using var client = CreateUserManagementClient(app);
        var response = await client.PostAsJsonAsync("/api/auth/register",
            new { fullName = "Public User", email = "public@example.com", password = "Password123!" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var registered = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.Equal("Student", registered!.Role);
        Assert.False(string.IsNullOrEmpty(registered.Token));
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(registered.Email, "Password123!"));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task CreateUser_RejectsPasswordBeyondBcryptByteLimit()
    {
        await using var db = CreateDb();
        var service = new AuthService(db, null!);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateUserAsync(
            new RegisterRequest("New User", "long@example.com", new string('é', 37), UserRole.Student)));
    }

    // Opt-in: uses an existing PostgreSQL database without migrations or seed changes.
    // Only the uniquely named disposable account created here is deleted.
    public sealed class PostgreSqlDeleteFactAttribute : FactAttribute
    {
        public PostgreSqlDeleteFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("EDUFLOW_DELETE_POSTGRES_CONNECTION")))
                Skip = "Set EDUFLOW_DELETE_POSTGRES_CONNECTION to run the real PostgreSQL delete regression.";
        }
    }

    [PostgreSqlDeleteFact]
    public async Task AdminDeleteUser_PostgreSqlWithRetries_DeletesDisposableUserAndAuxiliaryRows()
    {
        var connection = Environment.GetEnvironmentVariable("EDUFLOW_DELETE_POSTGRES_CONNECTION")!;
        await using var app = await StartUserManagementApp(connection);
        Guid actorId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.True(db.Database.CreateExecutionStrategy().RetriesOnFailure);
            actorId = await db.Users.Where(u => u.Role == UserRole.Admin && u.IsActive)
                .Select(u => u.Id).FirstAsync();
        }
        using var client = CreateUserManagementClient(app, "Admin", actorId);
        var email = $"delete-postgres-regression-{Guid.NewGuid():N}@example.com";
        var create = await client.PostAsJsonAsync("/api/admin/users",
            new CreateUserRequest("Disposable PostgreSQL Delete Regression", email, "DisposableTest123!", "Student"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = (await create.Content.ReadFromJsonAsync<CreatedUserDto>())!;
        try
        {
            // Login creates a refresh token, which is auxiliary identity data.
            var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "DisposableTest123!"));
            Assert.Equal(HttpStatusCode.OK, login.StatusCode);
            var response = await client.DeleteAsync($"/api/admin/users/{created.Id}");
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            using var scope = app.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.False(await db.Users.AsNoTracking().AnyAsync(u => u.Id == created.Id));
            Assert.False(await db.StudentXp.AnyAsync(x => x.StudentId == created.Id));
            Assert.False(await db.StudentStreaks.AnyAsync(x => x.StudentId == created.Id));
            Assert.False(await db.RefreshTokens.AnyAsync(x => x.UserId == created.Id));
            Assert.DoesNotContain(email, await client.GetStringAsync("/api/admin/users"));
            Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/admin/users/{created.Id}")).StatusCode);
        }
        finally
        {
            // The guarded endpoint is also used for cleanup; never bypass safety rules.
            await client.DeleteAsync($"/api/admin/users/{created.Id}");
        }
    }

    public static IEnumerable<object[]> UserDeleteProtectedReferences()
    {
        using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        return db.Model.FindEntityType(typeof(User))!.GetReferencingForeignKeys()
            .Where(fk => fk.DeclaringEntityType.ClrType != typeof(RefreshToken) &&
                fk.DeclaringEntityType.ClrType != typeof(StudentXp) &&
                fk.DeclaringEntityType.ClrType != typeof(StudentStreak))
            .Select(fk => new object[] { fk.DeclaringEntityType.ClrType.Name, fk.Properties.Single().Name })
            .ToArray();
    }

    [Theory]
    [InlineData("Student")]
    [InlineData("Instructor")]
    [InlineData("Admin")]
    public async Task AdminDeleteUser_UnusedAccount_RemovesUserAndAuxiliaryRecords(string role)
    {
        await using var app = await StartUserManagementApp();
        Guid actorId;
        using (var scope = app.Services.CreateScope())
            actorId = SeedUser(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>(), UserRole.Admin).Id;
        using var client = CreateUserManagementClient(app, "Admin", actorId);
        var createdResponse = await client.PostAsJsonAsync("/api/admin/users",
            new CreateUserRequest("Unused User", "unused@example.com", "Password123!", role));
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var created = (await createdResponse.Content.ReadFromJsonAsync<CreatedUserDto>())!;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.RefreshTokens.Add(new RefreshToken { UserId = created.Id, Token = "delete-test-token" });
            await db.SaveChangesAsync();
        }

        var response = await client.DeleteAsync($"/api/admin/users/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("", await response.Content.ReadAsStringAsync());
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.Null(await db.Users.FindAsync(created.Id));
            Assert.False(await db.RefreshTokens.AnyAsync(t => t.UserId == created.Id));
            Assert.False(await db.StudentXp.AnyAsync(x => x.StudentId == created.Id));
            Assert.False(await db.StudentStreaks.AnyAsync(s => s.StudentId == created.Id));
            Assert.NotNull(await db.Users.FindAsync(actorId));
        }
        Assert.DoesNotContain(created.Email, await client.GetStringAsync("/api/admin/users"));
    }

    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized)]
    [InlineData("Student", HttpStatusCode.Forbidden)]
    [InlineData("Instructor", HttpStatusCode.Forbidden)]
    public async Task AdminDeleteUser_RejectsUnauthenticatedAndNonAdmin(string? role, HttpStatusCode expected)
    {
        await using var app = await StartUserManagementApp();
        Guid targetId;
        using (var scope = app.Services.CreateScope())
            targetId = SeedUser(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>()).Id;
        using var client = CreateUserManagementClient(app, role);
        Assert.Equal(expected, (await client.DeleteAsync($"/api/admin/users/{targetId}")).StatusCode);
        using var check = app.Services.CreateScope();
        Assert.NotNull(await check.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.FindAsync(targetId));
    }

    [Fact]
    public async Task AdminDeleteUser_UnknownUser_ReturnsNotFound()
    {
        await using var app = await StartUserManagementApp();
        using var client = CreateUserManagementClient(app, "Admin");
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/admin/users/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task AdminDeleteUser_OwnAccount_ReturnsConflict()
    {
        await using var app = await StartUserManagementApp();
        Guid actorId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            actorId = SeedUser(db, UserRole.Admin).Id;
            SeedUser(db, UserRole.Admin);
        }
        using var client = CreateUserManagementClient(app, "Admin", actorId);
        var response = await client.DeleteAsync($"/api/admin/users/{actorId}");
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("own account", await response.Content.ReadAsStringAsync());
        using var check = app.Services.CreateScope();
        Assert.NotNull(await check.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.FindAsync(actorId));
    }

    [Fact]
    public async Task AdminDeleteUser_LastActiveAdmin_ReturnsConflict_EvenWhenInactiveAdminExists()
    {
        await using var app = await StartUserManagementApp();
        Guid targetId;
        Guid actorId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            targetId = SeedUser(db, UserRole.Admin).Id;
            var inactive = SeedUser(db, UserRole.Admin);
            inactive.IsActive = false;
            actorId = inactive.Id;
            await db.SaveChangesAsync();
        }
        using var client = CreateUserManagementClient(app, "Admin", actorId);
        var response = await client.DeleteAsync($"/api/admin/users/{targetId}");
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("last active Admin", await response.Content.ReadAsStringAsync());
        using var check = app.Services.CreateScope();
        Assert.NotNull(await check.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.FindAsync(targetId));
    }

    [Theory]
    [MemberData(nameof(UserDeleteProtectedReferences))]
    public async Task AdminDeleteUser_AnyMappedBusinessReference_ReturnsConflictAndPreservesHistory(string entityName, string foreignKey)
    {
        await using var app = await StartUserManagementApp();
        Guid targetId;
        Type historyType;
        object[] historyKey;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            targetId = SeedUser(db).Id;
            var entityType = db.Model.GetEntityTypes().Single(t => t.ClrType.Name == entityName);
            historyType = entityType.ClrType;
            var history = Activator.CreateInstance(historyType)!;
            var entry = db.Add(history);
            entry.Property(foreignKey).CurrentValue = targetId;
            await db.SaveChangesAsync();
            historyKey = entityType.FindPrimaryKey()!.Properties.Select(p => entry.Property(p.Name).CurrentValue!).ToArray();
        }
        using var client = CreateUserManagementClient(app, "Admin");
        var response = await client.DeleteAsync($"/api/admin/users/{targetId}");
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("Suspend the account instead", await response.Content.ReadAsStringAsync());
        using var check = app.Services.CreateScope();
        var checkedDb = check.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.NotNull(await checkedDb.Users.FindAsync(targetId));
        var retained = await checkedDb.FindAsync(historyType, historyKey);
        Assert.NotNull(retained);
        Assert.Equal(targetId, checkedDb.Entry(retained!).Property(foreignKey).CurrentValue);
    }

    [Theory]
    [InlineData("AssessmentAuthor")]
    [InlineData("AuditSubject")]
    [InlineData("AuditSubjectCompact")]
    [InlineData("AuditSubjectBraced")]
    public async Task AdminDeleteUser_UnmappedAuthorOrAuditSubject_ReturnsConflict(string reference)
    {
        await using var app = await StartUserManagementApp();
        Guid targetId;
        Guid historyId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            targetId = SeedUser(db).Id;
            BaseEntity history = reference == "AssessmentAuthor"
                ? new Assessment { CreatedBy = targetId }
                : new AuditLog { EntityType = "User", EntityId = targetId.ToString(
                    reference == "AuditSubjectCompact" ? "N" : reference == "AuditSubjectBraced" ? "B" : "D").ToUpperInvariant() };
            historyId = history.Id;
            db.Add(history);
            await db.SaveChangesAsync();
        }
        using var client = CreateUserManagementClient(app, "Admin");
        var response = await client.DeleteAsync($"/api/admin/users/{targetId}");
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using var check = app.Services.CreateScope();
        var checkedDb = check.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.NotNull(await checkedDb.Users.FindAsync(targetId));
        if (reference == "AssessmentAuthor") Assert.NotNull(await checkedDb.Assessments.FindAsync(historyId));
        else Assert.NotNull(await checkedDb.AuditLogs.FindAsync(historyId));
    }

    [Theory]
    [InlineData("Xp")]
    [InlineData("Level")]
    [InlineData("Coins")]
    [InlineData("CurrentStreak")]
    [InlineData("LongestStreak")]
    [InlineData("FreezeTokens")]
    [InlineData("LastActivity")]
    public async Task AdminDeleteUser_ChangedStudentProfile_ReturnsConflict(string activity)
    {
        await using var app = await StartUserManagementApp();
        using var client = CreateUserManagementClient(app, "Admin");
        var createdResponse = await client.PostAsJsonAsync("/api/admin/users",
            new CreateUserRequest("Student", "student-delete@example.com", "Password123!", "Student"));
        var created = (await createdResponse.Content.ReadFromJsonAsync<CreatedUserDto>())!;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var xp = await db.StudentXp.SingleAsync(x => x.StudentId == created.Id);
            var streak = await db.StudentStreaks.SingleAsync(s => s.StudentId == created.Id);
            switch (activity)
            {
                case "Xp": xp.TotalXp = 25; break;
                case "Level": xp.CurrentLevel = 2; break;
                case "Coins": xp.Coins = 49; break;
                case "CurrentStreak": streak.CurrentStreak = 1; break;
                case "LongestStreak": streak.LongestStreak = 1; break;
                case "FreezeTokens": streak.FreezeTokensAvailable = 1; break;
                case "LastActivity": streak.LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow); break;
            }
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync($"/api/admin/users/{created.Id}")).StatusCode);
        using var check = app.Services.CreateScope();
        Assert.NotNull(await check.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.FindAsync(created.Id));
    }

    [Fact]
    public async Task AdminDeleteUser_MissingValidIdentity_FailsClosed()
    {
        await using var app = await StartUserManagementApp();
        using var client = CreateUserManagementClient(app, "Admin");
        client.DefaultRequestHeaders.Add("X-Test-UserId", "invalid");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.DeleteAsync($"/api/admin/users/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task AdminUserStatus_SuspendAndReactivate_RemainsAvailableForProtectedAccount()
    {
        await using var app = await StartUserManagementApp();
        Guid targetId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            targetId = SeedUser(db).Id;
            db.Notifications.Add(new Notification { UserId = targetId, Title = "Keep this history" });
            await db.SaveChangesAsync();
        }
        using var client = CreateUserManagementClient(app, "Admin");
        Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync($"/api/admin/users/{targetId}")).StatusCode);
        foreach (var expectedActive in new[] { false, true })
        {
            var response = await client.PostAsync($"/api/admin/users/{targetId}/toggle-status", null);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var check = app.Services.CreateScope();
            var db = check.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.Equal(expectedActive, (await db.Users.FindAsync(targetId))!.IsActive);
            Assert.True(await db.Notifications.AnyAsync(n => n.UserId == targetId));
        }
    }

    public sealed class UserManagementTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public UserManagementTestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger, UrlEncoder encoder) : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var role = Request.Headers["X-Test-Role"].ToString();
            if (string.IsNullOrEmpty(role)) return Task.FromResult(AuthenticateResult.NoResult());
            var actorId = Request.Headers["X-Test-UserId"].FirstOrDefault() ?? "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
            var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.NameIdentifier, actorId) }, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
        }
    }

    // -------------------------------------------------------------------------
    // Helper: create isolated in-memory DB per test
    // -------------------------------------------------------------------------
    private static ApplicationDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var ctx = new ApplicationDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    private static User SeedUser(ApplicationDbContext db, UserRole role = UserRole.Student)
    {
        var user = new User
        {
            FullName = "Test User",
            Email = $"user_{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            Role = role,
            IsActive = true
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    private static Course SeedCourse(ApplicationDbContext db, Guid instructorId, bool isPublished = true)
    {
        var course = new Course
        {
            Code = $"C-{Guid.NewGuid().ToString("N")[..6]}",
            Title = "Test Course",
            Description = "Desc",
            Category = "CS",
            InstructorId = instructorId,
            IsPublished = isPublished
        };
        db.Courses.Add(course);
        db.SaveChanges();
        return course;
    }

    // =========================================================================
    // ENROLLMENT RULES
    // =========================================================================

    [Fact]
    public async Task EnrollStudent_NewEnrollment_CreatesActiveRecord()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var enrollment = new Enrollment
        {
            StudentId = student.Id,
            CourseId = course.Id,
            ProgressPercentage = 0.0,
            Status = EnrollmentStatus.Active
        };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync();

        var saved = await db.Enrollments
            .FirstOrDefaultAsync(e => e.StudentId == student.Id && e.CourseId == course.Id);

        Assert.NotNull(saved);
        Assert.Equal(EnrollmentStatus.Active, saved!.Status);
        Assert.Equal(0.0, saved.ProgressPercentage);
    }

    [Fact]
    public async Task EnrollStudent_DuplicateEnrollment_ExistingRecordIsReturned()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        // Enroll once
        var first = new Enrollment { StudentId = student.Id, CourseId = course.Id, Status = EnrollmentStatus.Active };
        db.Enrollments.Add(first);
        await db.SaveChangesAsync();

        // Simulate controller idempotency check
        var existing = await db.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == course.Id && e.StudentId == student.Id);

        Assert.NotNull(existing);
        Assert.Equal(first.Id, existing!.Id); // same record, not a new one

        var count = await db.Enrollments.CountAsync(e => e.StudentId == student.Id && e.CourseId == course.Id);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task UnenrollStudent_SetsStatusToDropped_NotHardDeleted()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var enrollment = new Enrollment
        {
            StudentId = student.Id,
            CourseId = course.Id,
            Status = EnrollmentStatus.Active
        };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync();

        // Simulate unenroll — soft delete
        enrollment.Status = EnrollmentStatus.Dropped;
        enrollment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Record still exists (audit trail preserved)
        var saved = await db.Enrollments.FindAsync(enrollment.Id);
        Assert.NotNull(saved);
        Assert.Equal(EnrollmentStatus.Dropped, saved!.Status);
    }

    [Fact]
    public async Task GetMyCourses_OnlyReturnsActiveEnrollments()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var activeCourse = SeedCourse(db, instructor.Id);
        var droppedCourse = SeedCourse(db, instructor.Id);

        db.Enrollments.Add(new Enrollment
        {
            StudentId = student.Id,
            CourseId = activeCourse.Id,
            Status = EnrollmentStatus.Active
        });
        db.Enrollments.Add(new Enrollment
        {
            StudentId = student.Id,
            CourseId = droppedCourse.Id,
            Status = EnrollmentStatus.Dropped
        });
        await db.SaveChangesAsync();

        var activeEnrollments = await db.Enrollments
            .Where(e => e.StudentId == student.Id && e.Status == EnrollmentStatus.Active)
            .ToListAsync();

        Assert.Single(activeEnrollments);
        Assert.Equal(activeCourse.Id, activeEnrollments[0].CourseId);
    }

    // =========================================================================
    // COURSE PUBLISHING WORKFLOW
    // =========================================================================

    [Fact]
    public async Task CreateCourse_StartsAsUnpublished()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);

        // New courses should start as drafts (IsPublished = false)
        var course = new Course
        {
            Code = "PY101",
            Title = "Python Basics",
            Description = "Intro",
            Category = "CS",
            InstructorId = instructor.Id,
            IsPublished = false
        };
        db.Courses.Add(course);
        await db.SaveChangesAsync();

        var saved = await db.Courses.FindAsync(course.Id);
        Assert.NotNull(saved);
        Assert.False(saved!.IsPublished);
    }

    [Fact]
    public async Task PublishCourse_SetsIsPublishedTrue()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id, isPublished: false);

        // Simulate publish action
        course.IsPublished = true;
        course.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var published = await db.Courses.FindAsync(course.Id);
        Assert.NotNull(published);
        Assert.True(published!.IsPublished);
    }

    [Fact]
    public async Task UnpublishCourse_SetsIsPublishedFalse()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id, isPublished: true);

        // Simulate unpublish action
        course.IsPublished = false;
        course.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var unpublished = await db.Courses.FindAsync(course.Id);
        Assert.NotNull(unpublished);
        Assert.False(unpublished!.IsPublished);
    }

    [Fact]
    public async Task GetCourses_ReturnsOnlyPublishedCourses()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var pub = SeedCourse(db, instructor.Id, isPublished: true);
        var unpub = SeedCourse(db, instructor.Id, isPublished: false);

        var published = await db.Courses.Where(c => c.IsPublished).ToListAsync();
        Assert.Contains(published, c => c.Id == pub.Id);
        Assert.DoesNotContain(published, c => c.Id == unpub.Id);
    }

    // =========================================================================
    // ROLE CHECKS
    // =========================================================================

    [Fact]
    public void UserRole_Student_CannotBeAssignedInstructorPrivileges_ByDefault()
    {
        var student = new User { Role = UserRole.Student };
        Assert.NotEqual(UserRole.Instructor, student.Role);
        Assert.NotEqual(UserRole.Admin, student.Role);
    }

    [Fact]
    public async Task ChangeRole_UpdatesUserRoleCorrectly()
    {
        await using var db = CreateDb();
        var user = SeedUser(db, UserRole.Student);

        // Simulate admin changing user role
        user.Role = UserRole.Instructor;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var updated = await db.Users.FindAsync(user.Id);
        Assert.Equal(UserRole.Instructor, updated!.Role);
    }

    [Fact]
    public async Task ToggleUserStatus_DeactivatesActiveUser()
    {
        await using var db = CreateDb();
        var user = SeedUser(db, UserRole.Student);
        Assert.True(user.IsActive);

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var updated = await db.Users.FindAsync(user.Id);
        Assert.False(updated!.IsActive);
    }

    // =========================================================================
    // AUTH SERVICE — PROFILE MANAGEMENT
    // =========================================================================

    [Fact]
    public async Task AuthService_Logout_RevokesRefreshToken()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var authService = new AuthService(db, null!);

        // Seed a refresh token
        var token = new RefreshToken
        {
            UserId = instructor.Id,
            Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        };
        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync();

        // Logout
        await authService.LogoutAsync(token.Token);

        var saved = await db.RefreshTokens.FindAsync(token.Id);
        Assert.True(saved!.IsRevoked);
    }

    [Fact]
    public async Task AuthService_Logout_IsIdempotent_WhenTokenAlreadyRevoked()
    {
        await using var db = CreateDb();
        var user = SeedUser(db);
        var authService = new AuthService(db, null!);

        // Already-revoked token
        var token = new RefreshToken
        {
            UserId = user.Id,
            Token = "already-revoked-token",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = true
        };
        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync();

        // Should not throw
        await authService.LogoutAsync(token.Token);
        // Still revoked
        var saved = await db.RefreshTokens.FindAsync(token.Id);
        Assert.True(saved!.IsRevoked);
    }

    [Fact]
    public async Task AuthService_GetUserByIdAsync_ReturnsCorrectProfile()
    {
        await using var db = CreateDb();
        var user = SeedUser(db, UserRole.Instructor);
        var authService = new AuthService(db, null!);

        var profile = await authService.GetUserByIdAsync(user.Id);

        Assert.Equal(user.Id, profile.Id);
        Assert.Equal(user.Email, profile.Email);
        Assert.Equal("Instructor", profile.Role);
    }

    [Fact]
    public async Task AuthService_GetUserByIdAsync_ThrowsKeyNotFoundException_ForUnknownId()
    {
        await using var db = CreateDb();
        var authService = new AuthService(db, null!);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            authService.GetUserByIdAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task AuthService_UpdateProfileAsync_UpdatesNameAndAvatar()
    {
        await using var db = CreateDb();
        var user = SeedUser(db, UserRole.Student);
        var authService = new AuthService(db, null!);

        var updated = await authService.UpdateProfileAsync(user.Id, new UpdateProfileRequest(
            FullName: "Updated Name",
            AvatarUrl: "https://cdn.example.com/avatar.png"
        ));

        Assert.Equal("Updated Name", updated.FullName);
        var fromDb = await db.Users.FindAsync(user.Id);
        Assert.Equal("Updated Name", fromDb!.FullName);
        Assert.Equal("https://cdn.example.com/avatar.png", fromDb.AvatarUrl);
    }

    [Fact]
    public async Task AuthService_UpdateProfileAsync_NullAvatarUrl_DoesNotOverwriteExisting()
    {
        await using var db = CreateDb();
        var user = SeedUser(db, UserRole.Student);
        user.AvatarUrl = "https://cdn.example.com/old.png";
        await db.SaveChangesAsync();

        var authService = new AuthService(db, null!);

        // Passing null AvatarUrl should preserve existing
        var updated = await authService.UpdateProfileAsync(user.Id, new UpdateProfileRequest(
            FullName: "New Name",
            AvatarUrl: null
        ));

        var fromDb = await db.Users.FindAsync(user.Id);
        Assert.Equal("https://cdn.example.com/old.png", fromDb!.AvatarUrl); // preserved
        Assert.Equal("New Name", fromDb.FullName);
    }

    // =========================================================================
    // MODULE & LESSON PDF ATTACHMENTS
    // =========================================================================

    [Fact]
    public async Task CreateModule_WithPdfAttachment_PersistsAndRetrievesPdfDetails()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var module = new Module
        {
            CourseId = course.Id,
            Title = "Module 1: Advanced Relational Systems",
            Description = "Includes curriculum reading material",
            OrderIndex = 1,
            PdfUrl = "/uploads/pdfs/sample_module_syllabus.pdf",
            AttachmentFileName = "sample_module_syllabus.pdf"
        };

        db.Modules.Add(module);
        await db.SaveChangesAsync();

        var retrieved = await db.Modules.FirstOrDefaultAsync(m => m.Id == module.Id);
        Assert.NotNull(retrieved);
        Assert.Equal("/uploads/pdfs/sample_module_syllabus.pdf", retrieved!.PdfUrl);
        Assert.Equal("sample_module_syllabus.pdf", retrieved.AttachmentFileName);
    }

    [Fact]
    public async Task CreateLesson_WithPdfAttachment_PersistsAndRetrievesPdfDetails()
    {
        await using var db = CreateDb();
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var module = new Module
        {
            CourseId = course.Id,
            Title = "Module 2: Scalable Indexing",
            OrderIndex = 1
        };
        db.Modules.Add(module);
        await db.SaveChangesAsync();

        var lesson = new Lesson
        {
            ModuleId = module.Id,
            Title = "Lesson 2.1: B-Tree Indexes",
            Content = "Comprehensive lecture on Postgres indexing.",
            PdfUrl = "/uploads/pdfs/btree_indexes_lecture_notes.pdf",
            AttachmentFileName = "btree_indexes_lecture_notes.pdf",
            XpReward = 30,
            EstimatedMinutes = 25,
            OrderIndex = 1
        };
        db.Lessons.Add(lesson);
        await db.SaveChangesAsync();

        var retrieved = await db.Lessons.FirstOrDefaultAsync(l => l.Id == lesson.Id);
        Assert.NotNull(retrieved);
        Assert.Equal("/uploads/pdfs/btree_indexes_lecture_notes.pdf", retrieved!.PdfUrl);
        Assert.Equal("btree_indexes_lecture_notes.pdf", retrieved.AttachmentFileName);
        Assert.Equal(30, retrieved.XpReward);
    }

    [Fact]
    public async Task Instructor_AddStudentToCourse_CreatesActiveEnrollment()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var enrollment = new Enrollment
        {
            CourseId = course.Id,
            StudentId = student.Id,
            ProgressPercentage = 0.0,
            Status = EnrollmentStatus.Active
        };
        await db.Enrollments.AddAsync(enrollment);
        await db.SaveChangesAsync();

        var enrolled = await db.Enrollments
            .Include(e => e.Student)
            .FirstOrDefaultAsync(e => e.CourseId == course.Id && e.StudentId == student.Id);

        Assert.NotNull(enrolled);
        Assert.Equal(EnrollmentStatus.Active, enrolled!.Status);
        Assert.Equal(student.Id, enrolled.StudentId);
    }

    [Fact]
    public async Task Instructor_AddStudentToCourse_ReactivatesDroppedEnrollment()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var enrollment = new Enrollment
        {
            CourseId = course.Id,
            StudentId = student.Id,
            Status = EnrollmentStatus.Dropped
        };
        await db.Enrollments.AddAsync(enrollment);
        await db.SaveChangesAsync();

        // Reactivate
        var existing = await db.Enrollments.FirstAsync(e => e.CourseId == course.Id && e.StudentId == student.Id);
        existing.Status = EnrollmentStatus.Active;
        await db.SaveChangesAsync();

        var updated = await db.Enrollments.FirstAsync(e => e.CourseId == course.Id && e.StudentId == student.Id);
        Assert.Equal(EnrollmentStatus.Active, updated.Status);
    }

    [Fact]
    public async Task Student_GetMyCourses_ReturnsCourseWithModulesAndSyllabus()
    {
        await using var db = CreateDb();
        var student = SeedUser(db, UserRole.Student);
        var instructor = SeedUser(db, UserRole.Instructor);
        var course = SeedCourse(db, instructor.Id);

        var module = new Module
        {
            CourseId = course.Id,
            Title = "Module 1: Advanced Relational Systems",
            Description = "Syllabus for Relational Databases",
            PdfUrl = "/uploads/pdfs/syllabus_m1.pdf",
            AttachmentFileName = "syllabus_m1.pdf"
        };
        db.Modules.Add(module);

        var enrollment = new Enrollment
        {
            CourseId = course.Id,
            StudentId = student.Id,
            Status = EnrollmentStatus.Active
        };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync();

        var activeEnrollments = await db.Enrollments
            .Where(e => e.StudentId == student.Id && e.Status == EnrollmentStatus.Active)
            .Include(e => e.Course)
                .ThenInclude(c => c!.Modules)
            .ToListAsync();

        Assert.Single(activeEnrollments);
        var courseModules = activeEnrollments[0].Course!.Modules;
        Assert.Single(courseModules);
        Assert.Equal("Module 1: Advanced Relational Systems", courseModules.First().Title);
        Assert.Equal("syllabus_m1.pdf", courseModules.First().AttachmentFileName);
    }
}
