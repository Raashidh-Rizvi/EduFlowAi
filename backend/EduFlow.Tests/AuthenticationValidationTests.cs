using System.Net;
using System.Net.Http.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace EduFlow.Tests;

public partial class AuthSessionRbacTests
{
    [Fact]
    public async Task Registration_NormalizesIdentity_PersistsHashAndSession_AndRejectsCaseDuplicate()
    {
        await using var app = await StartAuthApp();
        using var client = CreateClient(app);
        var request = new RegisterRequest("  New Student  ", "  WAZNI@EXAMPLE.COM  ", TestPassword);
        var response = await client.PostAsJsonAsync("/api/auth/register", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        Assert.Equal("New Student", auth.FullName);
        Assert.Equal("wazni@example.com", auth.Email);
        Assert.Equal("Student", auth.Role);
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.SingleAsync();
        Assert.True(user.IsActive);
        Assert.True(BCrypt.Net.BCrypt.Verify(TestPassword, user.PasswordHash));
        Assert.NotEqual(TestPassword, user.PasswordHash);
        var refresh = await db.RefreshTokens.SingleAsync();
        Assert.StartsWith("sha256:", refresh.Token);
        Assert.NotEqual(auth.RefreshToken, refresh.Token);
        Assert.DoesNotContain("passwordHash", await response.Content.ReadAsStringAsync());
        foreach (var email in new[] { "wazni@example.com", "WaZnI@ExAmPlE.CoM" })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/register", request with { Email = email })).StatusCode);
        var login = await LoginAsync(client, " WAZNI@EXAMPLE.COM ");
        Assert.Equal(auth.UserId, login.UserId);
        UseBearer(client, login.Token);
        var me = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.DoesNotContain("password", (await me.Content.ReadAsStringAsync()).ToLowerInvariant());
        Assert.DoesNotContain("refreshToken", await me.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("", "valid@example.com", "Password123!")]
    [InlineData("   ", "valid@example.com", "Password123!")]
    [InlineData("A", "valid@example.com", "Password123!")]
    [InlineData("Learner", "invalid", "Password123!")]
    [InlineData("Learner", "a@@example.com", "Password123!")]
    [InlineData("Learner", "a@localhost", "Password123!")]
    [InlineData("Learner", "a..b@example.com", "Password123!")]
    [InlineData("Learner", ".a@example.com", "Password123!")]
    [InlineData("Learner", "a@-example.com", "Password123!")]
    [InlineData("Learner", "", "Password123!")]
    [InlineData("Learner", "valid@example.com", "admin123")]
    [InlineData("Learner", "valid@example.com", "password123!")]
    [InlineData("Learner", "valid@example.com", "PASSWORD123!")]
    [InlineData("Learner", "valid@example.com", "Password!!!")]
    [InlineData("Learner", "valid@example.com", "Password123")]
    [InlineData("Learner", "valid@example.com", "")]
    public async Task Registration_RejectsInvalidInputWithoutPersisting(string name, string email, string password)
    {
        await using var app = await StartAuthApp();
        using var client = CreateClient(app);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(name, email, password))).StatusCode);
        using var scope = app.Services.CreateScope();
        Assert.Empty(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users);
    }

    [Theory]
    [InlineData("", "Password123!")]
    [InlineData("invalid", "Password123!")]
    [InlineData("valid@example.com", "")]
    [InlineData("valid@example.com", "   ")]
    public async Task Login_RejectsMalformedRequests(string email, string password)
    {
        await using var app = await StartAuthApp();
        using var client = CreateClient(app);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password))).StatusCode);
    }

    [Fact]
    public async Task Registration_RejectsOversizedInputsAndBcryptTruncation()
    {
        await using var app = await StartAuthApp();
        using var client = CreateClient(app);
        var valid = new RegisterRequest("Learner", "valid@example.com", TestPassword);
        foreach (var request in new[] { valid with { FullName = new string('a', 201) },
            valid with { Email = new string('a', 250) + "@example.com" },
            valid with { Password = "Aa1!" + new string('é', 35) } })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/register", request)).StatusCode);
    }

    [Fact]
    public async Task Login_InvalidLegacyPasswordHashFailsSafely()
    {
        await using var app = await StartAuthApp();
        var user = await SeedUserAsync(app, "Learner", "learner@example.com", UserRole.Student);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            (await db.Users.FindAsync(user.Id))!.PasswordHash = "invalid-legacy-hash";
            await db.SaveChangesAsync();
        }
        using var client = CreateClient(app);
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.Email, TestPassword));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Contains("Invalid email or password.", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Login_WrongPasswordAndUnknownEmail_ReturnIdenticalSafeError()
    {
        await using var app = await StartAuthApp();
        var user = await SeedUserAsync(app, "Learner", "learner@example.com", UserRole.Student);
        using var client = CreateClient(app);
        foreach (var email in new[] { user.Email, "unknown@example.com" })
        {
            var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "WrongPassword!"));
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.Contains("Invalid email or password.", await response.Content.ReadAsStringAsync());
        }
    }

    [Theory]
    [InlineData("expired")]
    [InlineData("signature")]
    [InlineData("role")]
    [InlineData("issuer")]
    [InlineData("audience")]
    public async Task Jwt_RejectsExpiredForgedOrMismatchedToken(string kind)
    {
        await using var app = await StartAuthApp();
        var user = await SeedUserAsync(app, "Learner", "learner@example.com", UserRole.Student);
        var now = DateTime.UtcNow;
        var jwt = new JwtSecurityToken(
            issuer: kind == "issuer" ? "wrong" : "EduFlowAPI",
            audience: kind == "audience" ? "wrong" : "EduFlowClients",
            claims: new[] { new Claim("sub", user.Id.ToString()), new Claim("uid", user.Id.ToString()),
                new Claim(ClaimTypes.Role, kind == "role" ? "Admin" : "Student") },
            notBefore: now.AddHours(-2), expires: kind == "expired" ? now.AddMinutes(-1) : now.AddMinutes(10),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                kind == "signature" ? "forged-signature-key-with-at-least-32-characters" : "auth-session-rbac-test-secret-at-least-32-characters")), SecurityAlgorithms.HmacSha256));
        using var client = CreateClient(app);
        UseBearer(client, new JwtSecurityTokenHandler().WriteToken(jwt));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Jwt_DeletedAccountCannotUseExistingToken()
    {
        await using var app = await StartAuthApp();
        var user = await SeedUserAsync(app, "Learner", "learner@example.com", UserRole.Student);
        using var client = CreateClient(app);
        var auth = await LoginAsync(client, user.Email);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Users.Remove((await db.Users.FindAsync(user.Id))!);
            await db.SaveChangesAsync();
        }
        UseBearer(client, auth.Token);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Refresh_RejectsConsumedExpiredAndStoredHashCredentials()
    {
        await using var app = await StartAuthApp();
        var user = await SeedUserAsync(app, "Learner", "learner@example.com", UserRole.Student);
        using var client = CreateClient(app);
        var auth = await LoginAsync(client, user.Email);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var record = await db.RefreshTokens.SingleAsync();
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest(null, record.Token))).StatusCode);
        }
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest(null, auth.RefreshToken))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest(null, auth.RefreshToken))).StatusCode);
        auth = await LoginAsync(client, user.Email);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            foreach (var record in db.RefreshTokens) record.ExpiresAt = DateTime.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh", new RefreshTokenRequest(null, auth.RefreshToken))).StatusCode);
    }

    [Theory]
    [InlineData("/api/auth/register")]
    [InlineData("/api/auth/login")]
    [InlineData("/api/auth/refresh")]
    [InlineData("/api/auth/logout")]
    public async Task Auth_EmptyAndNullRequestsReturnValidationError(string endpoint)
    {
        await using var app = await StartAuthApp();
        using var client = CreateClient(app);
        foreach (var body in new[] { "{}", "null" })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync(endpoint, new StringContent(body, Encoding.UTF8, "application/json"))).StatusCode);
    }

    [Fact]
    public async Task DevelopmentAdmin_ProvisionedInternallyCanLoginAndAccessAdminOnlyApi()
    {
        await using var app = await StartAuthApp();
        using (var scope = app.Services.CreateScope())
            DbInitializer.EnsureDevelopmentAdmin(scope.ServiceProvider.GetRequiredService<ApplicationDbContext>(), true, true);
        using var client = CreateClient(app);
        var auth = await LoginAsync(client, "Admin@gmail.com", "admin123");
        Assert.Equal("Admin", auth.Role);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(auth.Token);
        Assert.Equal(auth.UserId.ToString(), jwt.Claims.First(c => c.Type == "uid").Value);
        Assert.Contains(jwt.Claims, c => (c.Type == "role" || c.Type == ClaimTypes.Role) && c.Value == "Admin");
        UseBearer(client, auth.Token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/users")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
        var student = await SeedUserAsync(app, "Learner", "learner@example.com", UserRole.Student);
        UseBearer(client, (await LoginAsync(client, student.Email)).Token);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/users")).StatusCode);
    }
}

public class DevelopmentAdminProvisioningTests
{
    private static ApplicationDbContext Db() => new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Theory]
    [InlineData(false, true)]
    [InlineData(false, false)]
    [InlineData(true, false)]
    public void DisabledOrProduction_NeverCreatesKnownCredential(bool development, bool enabled)
    {
        using var db = Db();
        DbInitializer.EnsureDevelopmentAdmin(db, development, enabled, true);
        Assert.Empty(db.Users);
    }

    [Fact]
    public void Startup_PreservesCredentialsAndOtherAccounts_ExplicitResetRevokesSessions()
    {
        using var db = Db();
        DbInitializer.EnsureDevelopmentAdmin(db, true, true);
        var demo = db.Users.Single();
        Assert.Equal("admin@gmail.com", demo.Email);
        Assert.Equal(UserRole.Admin, demo.Role);
        Assert.True(demo.IsActive);
        Assert.True(BCrypt.Net.BCrypt.Verify("admin123", demo.PasswordHash));
        var originalHash = demo.PasswordHash;
        DbInitializer.EnsureDevelopmentAdmin(db, true, true);
        Assert.Equal(originalHash, demo.PasswordHash);
        demo.IsActive = false; demo.PasswordHash = "preserved";
        var token = new RefreshToken { UserId = demo.Id, Token = "legacy", ExpiresAt = DateTime.UtcNow.AddDays(1) };
        var real = new User { FullName = "Real admin", Email = "other@example.com", Role = UserRole.Admin, PasswordHash = "real-password-hash" };
        db.AddRange(token, real); db.SaveChanges();
        DbInitializer.EnsureDevelopmentAdmin(db, true, true);
        Assert.False(demo.IsActive); Assert.Equal("preserved", demo.PasswordHash);
        DbInitializer.EnsureDevelopmentAdmin(db, true, true, true);
        Assert.True(demo.IsActive); Assert.True(token.IsRevoked);
        Assert.True(BCrypt.Net.BCrypt.Verify("admin123", demo.PasswordHash));
        Assert.Equal("real-password-hash", real.PasswordHash);
        Assert.Equal(2, db.Users.Count());
        DbInitializer.EnsureDevelopmentAdmin(db, false, true, true);
        Assert.False(demo.IsActive); Assert.True(real.IsActive);
    }

    [Fact]
    public void IndependentlyOwnedEmail_IsNeverOverwrittenEvenWithResetFlag()
    {
        using var db = Db();
        var user = new User { FullName = "Existing account", Email = "Admin@gmail.com", PasswordHash = "untouched", Role = UserRole.Student };
        db.Add(user); db.SaveChanges();
        DbInitializer.EnsureDevelopmentAdmin(db, true, true, true);
        DbInitializer.EnsureDevelopmentAdmin(db, false, true, true);
        Assert.Single(db.Users); Assert.Equal("untouched", user.PasswordHash);
        Assert.Equal(UserRole.Student, user.Role); Assert.True(user.IsActive);
    }
}
