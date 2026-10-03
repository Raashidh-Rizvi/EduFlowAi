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
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace EduFlow.Tests;

public class SupportDeskTests
{
    private static async Task<WebApplication> StartSupportApp(string? postgresConnection = null)
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
            if (postgresConnection == null)
            {
                options.UseInMemoryDatabase(databaseName);
            }
            else
            {
                options.UseNpgsql(postgresConnection, npgsql => npgsql.EnableRetryOnFailure(3));
            }
        });

        builder.Services.AddScoped<ISupportTicketService, SupportTicketService>();
        builder.Services.AddScoped<IAuthService, AuthService>();

        builder.Services.AddAuthentication("SupportTest")
            .AddScheme<AuthenticationSchemeOptions, SupportTestAuthHandler>("SupportTest", _ => { });

        builder.Services.AddAuthorization(EduFlow.Api.Security.AuthorizationPolicies.Configure);
        builder.Services.AddControllers()
            .AddApplicationPart(typeof(SupportController).Assembly);

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

    public sealed class SupportTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public SupportTestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
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

    // 1. Student / Instructor Ticket Submission
    [Fact]
    public async Task Student_CanCreateSupportTicket_Returns201WithOpenStatus()
    {
        await using var app = await StartSupportApp();
        var student = await SeedUser(app, UserRole.Student, "John Student", "john@test.com");
        using var client = CreateClient(app, "Student", student.Id);

        var requestId = Guid.NewGuid();
        var payload = new CreateSupportTicketRequest("Bug", "Found a glitch in the lesson video player.", requestId);

        var response = await client.PostAsJsonAsync("/api/support/tickets", payload);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var ticket = await response.Content.ReadFromJsonAsync<SupportTicketDetailDto>();
        Assert.NotNull(ticket);
        Assert.Equal("Bug", ticket.Type);
        Assert.Equal("Open", ticket.Status);
        Assert.Equal("Found a glitch in the lesson video player.", ticket.Message);
        Assert.NotEqual(Guid.Empty, ticket.Version);
        Assert.Empty(ticket.Responses);
        Assert.Null(ticket.ResolvedAt);
    }

    [Fact]
    public async Task Instructor_CanCreateSupportTicket_Returns201()
    {
        await using var app = await StartSupportApp();
        var instructor = await SeedUser(app, UserRole.Instructor, "Prof Miller", "miller@test.com");
        using var client = CreateClient(app, "Instructor", instructor.Id);

        var requestId = Guid.NewGuid();
        var payload = new CreateSupportTicketRequest("Dispute", "Assessment grading mismatch with rubric.", requestId);

        var response = await client.PostAsJsonAsync("/api/support/tickets", payload);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var ticket = await response.Content.ReadFromJsonAsync<SupportTicketDetailDto>();
        Assert.NotNull(ticket);
        Assert.Equal("Dispute", ticket.Type);
        Assert.Equal("Open", ticket.Status);
    }

    // 2. Validation Failures
    [Theory]
    [InlineData("", "Valid message")]
    [InlineData("   ", "Valid message")]
    [InlineData("InvalidType", "Some valid message body")]
    public async Task CreateTicket_InvalidData_Returns400BadRequest(string type, string message)
    {
        await using var app = await StartSupportApp();
        var student = await SeedUser(app, UserRole.Student, "Test Student", "student@test.com");
        using var client = CreateClient(app, "Student", student.Id);

        var payload = new CreateSupportTicketRequest(type, message, Guid.NewGuid());
        var response = await client.PostAsJsonAsync("/api/support/tickets", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateTicket_EmptyRequestId_Returns400BadRequest()
    {
        await using var app = await StartSupportApp();
        var student = await SeedUser(app, UserRole.Student, "Test Student", "student@test.com");
        using var client = CreateClient(app, "Student", student.Id);

        var payload = new CreateSupportTicketRequest("Feedback", "Some feedback", Guid.Empty);
        var response = await client.PostAsJsonAsync("/api/support/tickets", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateTicket_MessageExceeding5000Chars_Returns400BadRequest()
    {
        await using var app = await StartSupportApp();
        var student = await SeedUser(app, UserRole.Student, "Test Student", "student@test.com");
        using var client = CreateClient(app, "Student", student.Id);

        var longMessage = new string('A', 5001);
        var payload = new CreateSupportTicketRequest("Feedback", longMessage, Guid.NewGuid());
        var response = await client.PostAsJsonAsync("/api/support/tickets", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // 3. Idempotency Key Handling
    [Fact]
    public async Task CreateTicket_SameClientRequestId_SamePayload_ReplaysExistingTicket()
    {
        await using var app = await StartSupportApp();
        var student = await SeedUser(app, UserRole.Student, "Test Student", "student@test.com");
        using var client = CreateClient(app, "Student", student.Id);

        var requestId = Guid.NewGuid();
        var payload = new CreateSupportTicketRequest("Bug", "Persistent issue", requestId);

        var firstResp = await client.PostAsJsonAsync("/api/support/tickets", payload);
        Assert.Equal(HttpStatusCode.Created, firstResp.StatusCode);
        var firstTicket = await firstResp.Content.ReadFromJsonAsync<SupportTicketDetailDto>();

        // Replay
        var replayResp = await client.PostAsJsonAsync("/api/support/tickets", payload);
        Assert.Equal(HttpStatusCode.OK, replayResp.StatusCode);
        var replayTicket = await replayResp.Content.ReadFromJsonAsync<SupportTicketDetailDto>();

        Assert.NotNull(firstTicket);
        Assert.NotNull(replayTicket);
        Assert.Equal(firstTicket.Id, replayTicket.Id);

        // Verify only 1 ticket in database
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Single(await db.SupportTickets.ToListAsync());
    }

    [Fact]
    public async Task CreateTicket_SameClientRequestId_DifferentPayload_Returns409Conflict()
    {
        await using var app = await StartSupportApp();
        var student = await SeedUser(app, UserRole.Student, "Test Student", "student@test.com");
        using var client = CreateClient(app, "Student", student.Id);

        var requestId = Guid.NewGuid();
        var payload1 = new CreateSupportTicketRequest("Bug", "First issue", requestId);
        var payload2 = new CreateSupportTicketRequest("Feedback", "Different issue", requestId);

        var firstResp = await client.PostAsJsonAsync("/api/support/tickets", payload1);
        Assert.Equal(HttpStatusCode.Created, firstResp.StatusCode);

        var secondResp = await client.PostAsJsonAsync("/api/support/tickets", payload2);
        Assert.Equal(HttpStatusCode.Conflict, secondResp.StatusCode);
    }

    // 4. Data Scoping & Privacy: Student cannot see or detail another user's ticket
    [Fact]
    public async Task Student_CannotAccessAnotherUsersTicket()
    {
        await using var app = await StartSupportApp();
        var student1 = await SeedUser(app, UserRole.Student, "Student One", "one@test.com");
        var student2 = await SeedUser(app, UserRole.Student, "Student Two", "two@test.com");

        using var client1 = CreateClient(app, "Student", student1.Id);
        using var client2 = CreateClient(app, "Student", student2.Id);

        // Student 1 creates Ticket 1
        var resp1 = await client1.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Bug", "Ticket 1 private issue", Guid.NewGuid()));
        var ticket1 = await resp1.Content.ReadFromJsonAsync<SupportTicketDetailDto>();
        Assert.NotNull(ticket1);

        // Student 2 lists tickets -> Should be empty
        var listResp2 = await client2.GetAsync("/api/support/tickets");
        Assert.Equal(HttpStatusCode.OK, listResp2.StatusCode);
        var paged2 = await listResp2.Content.ReadFromJsonAsync<PagedResult<SupportTicketSummaryDto>>();
        Assert.NotNull(paged2);
        Assert.Empty(paged2.Items);

        // Student 2 tries to GET Student 1's ticket by ID -> 404 Not Found
        var detailResp2 = await client2.GetAsync($"/api/support/tickets/{ticket1.Id}");
        Assert.Equal(HttpStatusCode.NotFound, detailResp2.StatusCode);
    }

    // 5. Deactivated User Rejection
    [Fact]
    public async Task InactiveUser_CannotCreateOrAccessTickets()
    {
        await using var app = await StartSupportApp();
        var inactiveStudent = await SeedUser(app, UserRole.Student, "Inactive User", "inactive@test.com", isActive: false);
        using var client = CreateClient(app, "Student", inactiveStudent.Id);

        var resp = await client.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Bug", "Should fail", Guid.NewGuid()));
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);

        var listResp = await client.GetAsync("/api/support/tickets");
        Assert.Equal(HttpStatusCode.Forbidden, listResp.StatusCode);
    }

    // 6. Admin Inventory & Paging & Filtering
    [Fact]
    public async Task Admin_CanListTickets_WithFiltersAndPaging()
    {
        await using var app = await StartSupportApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin Boss", "admin@test.com");
        var s1 = await SeedUser(app, UserRole.Student, "Alice Smith", "alice@test.com");
        var s2 = await SeedUser(app, UserRole.Student, "Bob Jones", "bob@test.com");

        using var adminClient = CreateClient(app, "Admin", admin.Id);
        using var s1Client = CreateClient(app, "Student", s1.Id);
        using var s2Client = CreateClient(app, "Student", s2.Id);

        // Create tickets
        await s1Client.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Bug", "Alice bug report", Guid.NewGuid()));
        await s2Client.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Feedback", "Bob feedback note", Guid.NewGuid()));

        // Admin lists all
        var allResp = await adminClient.GetAsync("/api/admin/support-tickets");
        Assert.Equal(HttpStatusCode.OK, allResp.StatusCode);
        var allPaged = await allResp.Content.ReadFromJsonAsync<PagedResult<AdminSupportTicketSummaryDto>>();
        Assert.NotNull(allPaged);
        Assert.Equal(2, allPaged.TotalCount);

        // Filter by type
        var bugResp = await adminClient.GetAsync("/api/admin/support-tickets?type=Bug");
        var bugPaged = await bugResp.Content.ReadFromJsonAsync<PagedResult<AdminSupportTicketSummaryDto>>();
        Assert.NotNull(bugPaged);
        Assert.Single(bugPaged.Items);
        Assert.Equal("Alice Smith", bugPaged.Items[0].SubmittedBy.FullName);

        // Search by name
        var searchResp = await adminClient.GetAsync("/api/admin/support-tickets?search=Bob");
        var searchPaged = await searchResp.Content.ReadFromJsonAsync<PagedResult<AdminSupportTicketSummaryDto>>();
        Assert.NotNull(searchPaged);
        Assert.Single(searchPaged.Items);
        Assert.Equal("Bob Jones", searchPaged.Items[0].SubmittedBy.FullName);

        // Paging
        var page1Resp = await adminClient.GetAsync("/api/admin/support-tickets?page=1&pageSize=1");
        var page1Paged = await page1Resp.Content.ReadFromJsonAsync<PagedResult<AdminSupportTicketSummaryDto>>();
        Assert.NotNull(page1Paged);
        Assert.Single(page1Paged.Items);
        Assert.Equal(2, page1Paged.TotalCount);
        Assert.Equal(2, page1Paged.TotalPages);
    }

    // 7. Non-Admin Access Denial to Admin Endpoints
    [Fact]
    public async Task StudentOrInstructor_CannotAccessAdminEndpoints()
    {
        await using var app = await StartSupportApp();
        var student = await SeedUser(app, UserRole.Student, "Student", "student@test.com");
        var instructor = await SeedUser(app, UserRole.Instructor, "Instructor", "instructor@test.com");

        using var studentClient = CreateClient(app, "Student", student.Id);
        using var instructorClient = CreateClient(app, "Instructor", instructor.Id);

        var sResp = await studentClient.GetAsync("/api/admin/support-tickets");
        Assert.Equal(HttpStatusCode.Forbidden, sResp.StatusCode);

        var iResp = await instructorClient.GetAsync("/api/admin/support-tickets");
        Assert.Equal(HttpStatusCode.Forbidden, iResp.StatusCode);
    }

    // 8. Admin Reply & Status Transition (Open -> InProgress) & Concurrency Token Check
    [Fact]
    public async Task Admin_CanReplyAndMoveToInProgress_UpdatesVersionAndNotifiesRequester()
    {
        await using var app = await StartSupportApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin Support", "admin@test.com");
        var student = await SeedUser(app, UserRole.Student, "Jane Doe", "jane@test.com");

        using var studentClient = CreateClient(app, "Student", student.Id);
        using var adminClient = CreateClient(app, "Admin", admin.Id);

        var createResp = await studentClient.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Bug", "Need urgent help!", Guid.NewGuid()));
        var ticket = await createResp.Content.ReadFromJsonAsync<SupportTicketDetailDto>();
        Assert.NotNull(ticket);
        Assert.NotEqual(Guid.Empty, ticket.Version);

        // Admin replies and marks InProgress
        var updatePayload = new UpdateAdminSupportTicketRequest(
            Status: "InProgress",
            ResponseMessage: "We are actively investigating this issue.",
            ExpectedVersion: ticket.Version
        );

        var updateResp = await adminClient.PutAsJsonAsync($"/api/admin/support-tickets/{ticket.Id}", updatePayload);
        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);

        var updated = await updateResp.Content.ReadFromJsonAsync<AdminSupportTicketDetailDto>();
        Assert.NotNull(updated);
        Assert.Equal("InProgress", updated.Status);
        Assert.NotEqual(ticket.Version, updated.Version);
        Assert.Single(updated.Responses);
        Assert.Equal("We are actively investigating this issue.", updated.Responses[0].Message);
        Assert.Equal(admin.Id, updated.Responses[0].AdminUserId);

        // Verify notification and audit log in DB
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notif = await db.Notifications.FirstOrDefaultAsync(n => n.UserId == student.Id);
        Assert.NotNull(notif);
        Assert.Contains("Your support ticket", notif.Message);

        var audit = await db.AuditLogs.FirstOrDefaultAsync(a => a.ActorId == admin.Id);
        Assert.NotNull(audit);
        Assert.Equal("SupportTicket.Replied", audit.Action);
    }

    // 9. Concurrency Conflict (409 ticket_conflict)
    [Fact]
    public async Task Admin_VersionMismatch_Returns409Conflict()
    {
        await using var app = await StartSupportApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin Support", "admin@test.com");
        var student = await SeedUser(app, UserRole.Student, "Jane Doe", "jane@test.com");

        using var studentClient = CreateClient(app, "Student", student.Id);
        using var adminClient = CreateClient(app, "Admin", admin.Id);

        var createResp = await studentClient.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Bug", "Issue needing reply", Guid.NewGuid()));
        var ticket = await createResp.Content.ReadFromJsonAsync<SupportTicketDetailDto>();
        Assert.NotNull(ticket);

        // Expect random mismatched version
        var updatePayload = new UpdateAdminSupportTicketRequest(
            Status: "InProgress",
            ResponseMessage: "Stale update message",
            ExpectedVersion: Guid.NewGuid()
        );

        var updateResp = await adminClient.PutAsJsonAsync($"/api/admin/support-tickets/{ticket.Id}", updatePayload);
        Assert.Equal(HttpStatusCode.Conflict, updateResp.StatusCode);
    }

    // 10. Lifecycle Transition Rules
    [Fact]
    public async Task Admin_CannotMoveFromInProgressBackToOpen()
    {
        await using var app = await StartSupportApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin Support", "admin@test.com");
        var student = await SeedUser(app, UserRole.Student, "Jane Doe", "jane@test.com");

        using var studentClient = CreateClient(app, "Student", student.Id);
        using var adminClient = CreateClient(app, "Admin", admin.Id);

        var createResp = await studentClient.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Bug", "Issue", Guid.NewGuid()));
        var ticket = await createResp.Content.ReadFromJsonAsync<SupportTicketDetailDto>();
        Assert.NotNull(ticket);

        // Move to InProgress
        var inProgressResp = await adminClient.PutAsJsonAsync($"/api/admin/support-tickets/{ticket.Id}",
            new UpdateAdminSupportTicketRequest("InProgress", "Investigation started", ticket.Version));
        var inProgressTicket = await inProgressResp.Content.ReadFromJsonAsync<AdminSupportTicketDetailDto>();
        Assert.NotNull(inProgressTicket);

        // Attempt to move back to Open
        var backToOpenResp = await adminClient.PutAsJsonAsync($"/api/admin/support-tickets/{ticket.Id}",
            new UpdateAdminSupportTicketRequest("Open", "Move back to open", inProgressTicket.Version));

        Assert.Equal(HttpStatusCode.Conflict, backToOpenResp.StatusCode);
    }

    [Fact]
    public async Task Admin_CannotResolveWithoutResponse_Returns400BadRequest()
    {
        await using var app = await StartSupportApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin Support", "admin@test.com");
        var student = await SeedUser(app, UserRole.Student, "Jane Doe", "jane@test.com");

        using var studentClient = CreateClient(app, "Student", student.Id);
        using var adminClient = CreateClient(app, "Admin", admin.Id);

        var createResp = await studentClient.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Bug", "Issue", Guid.NewGuid()));
        var ticket = await createResp.Content.ReadFromJsonAsync<SupportTicketDetailDto>();
        Assert.NotNull(ticket);

        // Try to resolve with whitespace or empty message when no responses exist
        var resolveResp = await adminClient.PutAsJsonAsync($"/api/admin/support-tickets/{ticket.Id}",
            new UpdateAdminSupportTicketRequest("Resolved", "   ", ticket.Version));

        Assert.Equal(HttpStatusCode.BadRequest, resolveResp.StatusCode);
    }

    [Fact]
    public async Task Admin_CanResolveTicket_WithResponse_SetsResolvedAt_AndLocksFurtherModifications()
    {
        await using var app = await StartSupportApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin Support", "admin@test.com");
        var student = await SeedUser(app, UserRole.Student, "Jane Doe", "jane@test.com");

        using var studentClient = CreateClient(app, "Student", student.Id);
        using var adminClient = CreateClient(app, "Admin", admin.Id);

        var createResp = await studentClient.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Bug", "Issue", Guid.NewGuid()));
        var ticket = await createResp.Content.ReadFromJsonAsync<SupportTicketDetailDto>();
        Assert.NotNull(ticket);

        // Resolve with resolution message
        var resolveResp = await adminClient.PutAsJsonAsync($"/api/admin/support-tickets/{ticket.Id}",
            new UpdateAdminSupportTicketRequest("Resolved", "Bug has been fixed in the latest deployment.", ticket.Version));

        Assert.Equal(HttpStatusCode.OK, resolveResp.StatusCode);
        var resolved = await resolveResp.Content.ReadFromJsonAsync<AdminSupportTicketDetailDto>();
        Assert.NotNull(resolved);
        Assert.Equal("Resolved", resolved.Status);
        Assert.NotNull(resolved.ResolvedAt);

        // Attempting to modify resolved ticket -> 409 Conflict
        var furtherModResp = await adminClient.PutAsJsonAsync($"/api/admin/support-tickets/{ticket.Id}",
            new UpdateAdminSupportTicketRequest("InProgress", "Another message", resolved.Version));

        Assert.Equal(HttpStatusCode.Conflict, furtherModResp.StatusCode);
    }

    // 11. Referential Integrity Protection: User cannot be deleted if they have support activity
    [Fact]
    public async Task UserWithSupportTickets_CannotBeDeleted_ReturnsConflict()
    {
        await using var app = await StartSupportApp();
        var admin = await SeedUser(app, UserRole.Admin, "Admin Boss", "admin@test.com");
        var student = await SeedUser(app, UserRole.Student, "Jane Doe", "jane@test.com");

        using var studentClient = CreateClient(app, "Student", student.Id);
        using var adminClient = CreateClient(app, "Admin", admin.Id);

        // Student creates ticket
        var createResp = await studentClient.PostAsJsonAsync("/api/support/tickets",
            new CreateSupportTicketRequest("Bug", "Persistent issue", Guid.NewGuid()));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        // Admin attempts to delete user
        var deleteResp = await adminClient.DeleteAsync($"/api/admin/users/{student.Id}");
        Assert.Equal(HttpStatusCode.Conflict, deleteResp.StatusCode);

        // User must still exist
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.FindAsync(student.Id);
        Assert.NotNull(user);
    }
}
