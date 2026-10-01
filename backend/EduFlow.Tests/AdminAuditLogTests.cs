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
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
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

public class AdminAuditLogTests
{
    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized)]
    [InlineData("Student", HttpStatusCode.Forbidden)]
    [InlineData("Instructor", HttpStatusCode.Forbidden)]
    public async Task OptionsAndDetail_RequireAdmin(string? role, HttpStatusCode expected)
    {
        await using var app = await StartAuditApp();
        using var client = CreateClient(app, role);
        Assert.Equal(expected, (await client.GetAsync("/api/admin/audit-logs/options")).StatusCode);
        Assert.Equal(expected, (await client.GetAsync($"/api/admin/audit-logs/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task Options_ReflectEnabledRegistry_AndNewEventsCanBeFilteredAndRead()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "options@test.local");
        Guid logId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            new AuditLogWriter(db).AddEntry(admin.Id, "Admin", "Course.Created", "Course", Guid.NewGuid().ToString());
            await db.SaveChangesAsync();
            logId = (await db.AuditLogs.SingleAsync()).Id;
        }
        using var client = CreateClient(app, "Admin", admin.Id);
        var response = await client.GetAsync("/api/admin/audit-logs/options");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore);
        using var options = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(AuditEventRegistry.Events.Keys.OrderBy(x => x), options.RootElement.GetProperty("actions")
            .EnumerateArray().Select(x => x.GetString()));
        Assert.Equal(new[] { "Assessment", "Course", "Enrollment", "Submission", "SupportTicket", "User" }, options.RootElement.GetProperty("resourceTypes")
            .EnumerateArray().Select(x => x.GetString()));
        var page = await client.GetFromJsonAsync<PagedResult<AuditLogSummaryDto>>(
            "/api/admin/audit-logs?action=Course.Created&entityType=Course");
        Assert.Single(page!.Items);
        var detail = await client.GetFromJsonAsync<AuditLogDetailDto>($"/api/admin/audit-logs/{logId}");
        Assert.Equal("Course.Created", detail!.Action);
        Assert.False(detail.MetadataUnavailable);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            (await db.Users.FindAsync(admin.Id))!.IsActive = false;
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin/audit-logs/options")).StatusCode);
    }

    private static async Task<WebApplication> StartAuditApp()
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

        builder.Services.AddScoped<IAuditLogWriter, AuditLogWriter>();
        builder.Services.AddScoped<IAdminAuditLogService, AdminAuditLogService>();
        builder.Services.AddScoped<ISupportTicketService, SupportTicketService>();
        builder.Services.AddScoped<IAuthService, AuthService>();

        builder.Services.AddAuthentication("AuditTest")
            .AddScheme<AuthenticationSchemeOptions, AuditTestAuthHandler>("AuditTest", _ => { });

        builder.Services.AddAuthorization();
        builder.Services.AddControllers()
            .AddApplicationPart(typeof(AdminAuditLogsController).Assembly);

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

    public sealed class AuditTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public AuditTestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
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

    private static async Task<User> SeedUser(WebApplication app, UserRole role, string name, string email, bool isActive = true)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = name,
            Email = email,
            PasswordHash = "dummyhash",
            Role = role,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. Authorization & Role Verification
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAuditLogs_Unauthenticated_Returns401()
    {
        await using var app = await StartAuditApp();
        using var client = CreateClient(app); // No role or user ID header

        var response = await client.GetAsync("/api/admin/audit-logs");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetAuditLogs_StudentRole_Returns403()
    {
        await using var app = await StartAuditApp();
        var student = await SeedUser(app, UserRole.Student, "Student User", "student@test.com");
        using var client = CreateClient(app, "Student", student.Id);

        var response = await client.GetAsync("/api/admin/audit-logs");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAuditLogs_InstructorRole_Returns403()
    {
        await using var app = await StartAuditApp();
        var instructor = await SeedUser(app, UserRole.Instructor, "Instructor User", "inst@test.com");
        using var client = CreateClient(app, "Instructor", instructor.Id);

        var response = await client.GetAsync("/api/admin/audit-logs");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAuditLogs_SuspendedAdmin_Returns403()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Suspended Admin", "admin.inactive@test.com", isActive: false);
        using var client = CreateClient(app, "Admin", admin.Id);

        var response = await client.GetAsync("/api/admin/audit-logs");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAuditLogs_ActiveAdmin_Returns200WithEmptyList()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Active Admin", "admin@test.com", isActive: true);
        using var client = CreateClient(app, "Admin", admin.Id);

        var response = await client.GetAsync("/api/admin/audit-logs");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var page = await response.Content.ReadFromJsonAsync<PagedResult<AuditLogSummaryDto>>();
        Assert.NotNull(page);
        Assert.Equal(1, page.Page);
        Assert.Equal(20, page.PageSize);
        Assert.Equal(0, page.TotalCount);
        Assert.Equal(0, page.TotalPages);
        Assert.Empty(page.Items);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. Query Validation Rules
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAuditLogs_PageLessThan1_Returns400()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");
        using var client = CreateClient(app, "Admin", admin.Id);

        var response = await client.GetAsync("/api/admin/audit-logs?page=0");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetAuditLogs_PageSizeOutOfRange_Returns400()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");
        using var client = CreateClient(app, "Admin", admin.Id);

        var respTooSmall = await client.GetAsync("/api/admin/audit-logs?pageSize=0");
        Assert.Equal(HttpStatusCode.BadRequest, respTooSmall.StatusCode);

        var respTooLarge = await client.GetAsync("/api/admin/audit-logs?pageSize=101");
        Assert.Equal(HttpStatusCode.BadRequest, respTooLarge.StatusCode);
    }

    [Fact]
    public async Task GetAuditLogs_FromDateAfterToDate_Returns400()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");
        using var client = CreateClient(app, "Admin", admin.Id);

        var from = "2026-09-30T00:00:00Z";
        var to = "2026-09-29T00:00:00Z";
        var response = await client.GetAsync($"/api/admin/audit-logs?fromUtc={Uri.EscapeDataString(from)}&toUtc={Uri.EscapeDataString(to)}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetAuditLogs_EmptyGuidActorId_Returns400()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");
        using var client = CreateClient(app, "Admin", admin.Id);

        var response = await client.GetAsync($"/api/admin/audit-logs?actorId={Guid.Empty}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. Paging, Ordering & Filtering
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAuditLogs_PagingAndNewestFirstOrdering_WorksCorrectly()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");
        using var client = CreateClient(app, "Admin", admin.Id);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var baseTime = new DateTime(2026, 9, 29, 10, 0, 0, DateTimeKind.Utc);

            for (int i = 1; i <= 25; i++)
            {
                db.AuditLogs.Add(new AuditLog
                {
                    Id = Guid.NewGuid(),
                    ActorId = admin.Id,
                    Action = "SupportTicket.Created",
                    EntityType = "SupportTicket",
                    EntityId = Guid.NewGuid().ToString(),
                    Details = JsonSerializer.Serialize(new
                    {
                        schemaVersion = 1,
                        actorUserId = admin.Id.ToString(),
                        actorRole = "Admin",
                        data = new { type = "Bug", newStatus = "Open" }
                    }),
                    IpAddress = string.Empty,
                    CreatedAt = baseTime.AddMinutes(i),
                    UpdatedAt = baseTime.AddMinutes(i)
                });
            }
            await db.SaveChangesAsync();
        }

        // Fetch page 1 (default size 20)
        var page1Resp = await client.GetAsync("/api/admin/audit-logs?page=1&pageSize=20");
        Assert.Equal(HttpStatusCode.OK, page1Resp.StatusCode);
        var page1 = await page1Resp.Content.ReadFromJsonAsync<PagedResult<AuditLogSummaryDto>>();
        Assert.NotNull(page1);
        Assert.Equal(25, page1.TotalCount);
        Assert.Equal(2, page1.TotalPages);
        Assert.Equal(20, page1.Items.Count);

        // Verify newest first
        for (int i = 0; i < page1.Items.Count - 1; i++)
        {
            Assert.True(page1.Items[i].CreatedAt >= page1.Items[i + 1].CreatedAt);
        }

        // Fetch page 2
        var page2Resp = await client.GetAsync("/api/admin/audit-logs?page=2&pageSize=20");
        Assert.Equal(HttpStatusCode.OK, page2Resp.StatusCode);
        var page2 = await page2Resp.Content.ReadFromJsonAsync<PagedResult<AuditLogSummaryDto>>();
        Assert.NotNull(page2);
        Assert.Equal(5, page2.Items.Count);
    }

    [Fact]
    public async Task GetAuditLogs_FilterByAction_ExactMatch()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");
        using var client = CreateClient(app, "Admin", admin.Id);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                ActorId = admin.Id,
                Action = "SupportTicket.Created",
                EntityType = "SupportTicket",
                EntityId = Guid.NewGuid().ToString(),
                Details = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                ActorId = admin.Id,
                Action = "SupportTicket.Resolved",
                EntityType = "SupportTicket",
                EntityId = Guid.NewGuid().ToString(),
                Details = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var resp = await client.GetAsync("/api/admin/audit-logs?action=SupportTicket.Resolved");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var page = await resp.Content.ReadFromJsonAsync<PagedResult<AuditLogSummaryDto>>();
        Assert.NotNull(page);
        Assert.Equal(1, page.TotalCount);
        Assert.Equal("SupportTicket.Resolved", page.Items[0].Action);
    }

    [Fact]
    public async Task GetAuditLogs_SearchSubstring_FindsActionOrActor()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Alice Administrator", "alice@test.com");
        using var client = CreateClient(app, "Admin", admin.Id);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                ActorId = admin.Id,
                Action = "SupportTicket.Replied",
                EntityType = "SupportTicket",
                EntityId = "aabbccdd-1234-5678-9999-000011112222",
                Details = "{}",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        // Search by actor name substring
        var respName = await client.GetAsync("/api/admin/audit-logs?search=alice");
        var pageName = await respName.Content.ReadFromJsonAsync<PagedResult<AuditLogSummaryDto>>();
        Assert.NotNull(pageName);
        Assert.Equal(1, pageName.TotalCount);

        // Search by EntityId substring
        var respId = await client.GetAsync("/api/admin/audit-logs?search=aabbccdd");
        var pageId = await respId.Content.ReadFromJsonAsync<PagedResult<AuditLogSummaryDto>>();
        Assert.NotNull(pageId);
        Assert.Equal(1, pageId.TotalCount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. Detail Endpoint & Legacy Handling
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAuditLogById_NotFound_Returns404()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");
        using var client = CreateClient(app, "Admin", admin.Id);

        var response = await client.GetAsync($"/api/admin/audit-logs/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetAuditLogById_LegacyMalformedDetails_ReturnsEmptyMetadataWithMetadataUnavailableTrue()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");
        using var client = CreateClient(app, "Admin", admin.Id);

        var logId = Guid.NewGuid();
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.AuditLogs.Add(new AuditLog
            {
                Id = logId,
                ActorId = admin.Id,
                Action = "SupportTicket.Created",
                EntityType = "SupportTicket",
                EntityId = Guid.NewGuid().ToString(),
                // Malformed legacy Details without schemaVersion 1
                Details = "Plain text details or unapproved legacy format with sensitive data: password123",
                IpAddress = "127.0.0.1",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var response = await client.GetAsync($"/api/admin/audit-logs/{logId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var detail = await response.Content.ReadFromJsonAsync<AuditLogDetailDto>();
        Assert.NotNull(detail);
        Assert.True(detail.MetadataUnavailable);
        Assert.Empty(detail.Metadata);
        // Ensure sensitive string is never echoed
        var rawJson = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("password123", rawJson);
        Assert.DoesNotContain("127.0.0.1", rawJson);
    }

    [Fact]
    public async Task GetAuditLogById_DeletedActor_DisplaysUnavailableActor_AndPreservesActorId()
    {
        await using var app = await StartAuditApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");
        using var client = CreateClient(app, "Admin", admin.Id);

        var logId = Guid.NewGuid();
        var actorUuid = Guid.NewGuid();

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.AuditLogs.Add(new AuditLog
            {
                Id = logId,
                ActorId = null, // Actor foreign key was set to null on user deletion
                Action = "SupportTicket.Created",
                EntityType = "SupportTicket",
                EntityId = Guid.NewGuid().ToString(),
                Details = JsonSerializer.Serialize(new
                {
                    schemaVersion = 1,
                    actorUserId = actorUuid.ToString(),
                    actorRole = "Student",
                    data = new { type = "Bug", newStatus = "Open" }
                }),
                IpAddress = string.Empty,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var response = await client.GetAsync($"/api/admin/audit-logs/{logId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var detail = await response.Content.ReadFromJsonAsync<AuditLogDetailDto>();
        Assert.NotNull(detail);
        Assert.Equal("Unavailable actor", detail.Actor.DisplayName);
        Assert.Equal(actorUuid, detail.Actor.Id);
        Assert.False(detail.MetadataUnavailable);
        Assert.Equal("Student", detail.Metadata["actorRole"]?.ToString());
        Assert.Equal("Bug", detail.Metadata["type"]?.ToString());
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. AuditLogWriter Unit & Contract Tests
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task AuditLogWriter_DoesNotCallSaveChangesIndependently()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var db = new ApplicationDbContext(options);
        var writer = new AuditLogWriter(db);

        writer.WriteSupportTicketCreated(
            Guid.NewGuid(),
            "Student",
            Guid.NewGuid(),
            "Bug",
            "Open"
        );

        // AuditLog is tracked as Added, but NOT yet in the persisted store until SaveChanges is invoked
        Assert.Single(db.ChangeTracker.Entries<AuditLog>());
        Assert.Equal(EntityState.Added, db.ChangeTracker.Entries<AuditLog>().Single().State);

        // Before save, database count is 0
        Assert.Equal(0, await db.AuditLogs.CountAsync());

        // Now caller commits
        await db.SaveChangesAsync();
        Assert.Equal(1, await db.AuditLogs.CountAsync());
    }

    [Fact]
    public void AuditLogWriter_UnapprovedAction_ThrowsArgumentException()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var db = new ApplicationDbContext(options);
        var writer = new AuditLogWriter(db);

        Assert.Throws<ArgumentException>(() =>
            writer.AddEntry(Guid.NewGuid(), "Admin", "User.UnauthorizedAction", "User", Guid.NewGuid().ToString()));
    }

    [Fact]
    public void AuditLogWriter_PayloadExceeding2048Chars_ThrowsInvalidOperationException()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var db = new ApplicationDbContext(options);
        var writer = new AuditLogWriter(db);

        var oversizedMetadata = new Dictionary<string, object?>
        {
            ["huge"] = new string('x', 2100)
        };

        Assert.Throws<InvalidOperationException>(() =>
            writer.AddEntry(Guid.NewGuid(), "Admin", "SupportTicket.Created", "SupportTicket", Guid.NewGuid().ToString(), oversizedMetadata));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. Support Desk Flow & Audit Integration
    // ─────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task SupportDesk_CreateTicket_PersistsCreatedAuditEvent()
    {
        await using var app = await StartAuditApp();
        var student = await SeedUser(app, UserRole.Student, "Student", "student@test.com");
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");

        using var studentClient = CreateClient(app, "Student", student.Id);
        using var adminClient = CreateClient(app, "Admin", admin.Id);

        var reqId = Guid.NewGuid();
        var createResp = await studentClient.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Feedback", "Great platform!", reqId));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        // Verify audit log
        var logsResp = await adminClient.GetAsync("/api/admin/audit-logs?action=SupportTicket.Created");
        Assert.Equal(HttpStatusCode.OK, logsResp.StatusCode);
        var logs = await logsResp.Content.ReadFromJsonAsync<PagedResult<AuditLogSummaryDto>>();
        Assert.NotNull(logs);
        Assert.Single(logs.Items);
        Assert.Equal("SupportTicket.Created", logs.Items[0].Action);
        Assert.Equal(student.Id, logs.Items[0].Actor.Id);
    }

    [Fact]
    public async Task SupportDesk_IdempotentTicketCreate_DoesNotDuplicateAuditEvent()
    {
        await using var app = await StartAuditApp();
        var student = await SeedUser(app, UserRole.Student, "Student", "student@test.com");
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");

        using var studentClient = CreateClient(app, "Student", student.Id);
        using var adminClient = CreateClient(app, "Admin", admin.Id);

        var reqId = Guid.NewGuid();
        var payload = new CreateSupportTicketRequest("Bug", "Glitch found", reqId);

        // First attempt -> Created
        var resp1 = await studentClient.PostAsJsonAsync("/api/support/tickets", payload);
        Assert.Equal(HttpStatusCode.Created, resp1.StatusCode);

        // Exact replay -> OK
        var resp2 = await studentClient.PostAsJsonAsync("/api/support/tickets", payload);
        Assert.Equal(HttpStatusCode.OK, resp2.StatusCode);

        // Exactly one audit log should exist
        var logsResp = await adminClient.GetAsync("/api/admin/audit-logs?action=SupportTicket.Created");
        var logs = await logsResp.Content.ReadFromJsonAsync<PagedResult<AuditLogSummaryDto>>();
        Assert.NotNull(logs);
        Assert.Single(logs.Items);
    }

    [Fact]
    public async Task SupportDesk_AdminReplyAndResolve_PersistsBothRepliedAndResolvedEvents()
    {
        await using var app = await StartAuditApp();
        var student = await SeedUser(app, UserRole.Student, "Student", "student@test.com");
        var admin = await SeedUser(app, UserRole.Admin, "Admin", "admin@test.com");

        using var studentClient = CreateClient(app, "Student", student.Id);
        using var adminClient = CreateClient(app, "Admin", admin.Id);

        var createResp = await studentClient.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Dispute", "Dispute issue", Guid.NewGuid()));
        var ticket = await createResp.Content.ReadFromJsonAsync<SupportTicketDetailDto>();
        Assert.NotNull(ticket);

        // Reply and Resolve in one transaction
        var updateResp = await adminClient.PutAsJsonAsync($"/api/admin/support-tickets/{ticket.Id}",
            new UpdateAdminSupportTicketRequest("Resolved", "Issue has been investigated and resolved.", ticket.Version));
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        // Verify Replied and Resolved events
        var logsResp = await adminClient.GetAsync($"/api/admin/audit-logs?search={ticket.Id}");
        var logs = await logsResp.Content.ReadFromJsonAsync<PagedResult<AuditLogSummaryDto>>();
        Assert.NotNull(logs);
        Assert.Equal(3, logs.TotalCount); // Created + Replied + Resolved

        var actions = logs.Items.Select(x => x.Action).ToList();
        Assert.Contains("SupportTicket.Created", actions);
        Assert.Contains("SupportTicket.Replied", actions);
        Assert.Contains("SupportTicket.Resolved", actions);
    }
}
