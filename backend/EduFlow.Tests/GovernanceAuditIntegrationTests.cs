using System.Security.Claims;
using System.Text.Json;
using EduFlow.Api.Controllers;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace EduFlow.Tests;

public class GovernanceAuditIntegrationTests
{
    private static ApplicationDbContext Db()
    {
        var connection = Environment.GetEnvironmentVariable("EDUFLOW_AUDIT_TEST_POSTGRES");
        if (!string.IsNullOrWhiteSpace(connection)) return NewPostgresDb(connection);
        return new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    }

    private static ApplicationDbContext NewPostgresDb(string connection,
        params Microsoft.EntityFrameworkCore.Diagnostics.IInterceptor[] interceptors)
    {
        var cs = new Npgsql.NpgsqlConnectionStringBuilder(connection);
        // These tests create databases only on an explicitly provided disposable local cluster.
        if (cs.Host != "127.0.0.1" || cs.Database != "eduflow_audit_regression")
            throw new InvalidOperationException("Use a disposable loopback cluster and the eduflow_audit_regression database.");
        cs.Database = "eduflow_audit_" + Guid.NewGuid().ToString("N");
        var db = ConnectPostgres(cs.ConnectionString, interceptors);
        db.Database.EnsureCreated();
        return db;
    }

    private static ApplicationDbContext ConnectPostgres(string connection,
        params Microsoft.EntityFrameworkCore.Diagnostics.IInterceptor[] interceptors) =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connection, options => options.EnableRetryOnFailure(3, TimeSpan.Zero, null))
            .AddInterceptors(interceptors).Options);

    public sealed class AuditPostgresFactAttribute : FactAttribute
    {
        public AuditPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("EDUFLOW_AUDIT_TEST_POSTGRES")))
                Skip = "Set EDUFLOW_AUDIT_TEST_POSTGRES to a disposable local PostgreSQL cluster.";
        }
    }

    private static User Account(UserRole role) => new()
    {
        FullName = "Audit test", Email = $"{Guid.NewGuid()}@test.local", Role = role, IsActive = true,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!", 4)
    };

    private static T As<T>(T controller, User user) where T : ControllerBase
    {
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            }, "Test"))
        }};
        return controller;
    }

    private static CoursesController Courses(ApplicationDbContext db, User actor) => As(
        new CoursesController(db, Mock.Of<IGamificationService>(), Mock.Of<IRatingService>()), actor);

    private static InstructorController Instructor(ApplicationDbContext db, User actor) => As(
        new InstructorController(db, Mock.Of<IRatingService>()), actor);

    private static AdminController Admin(ApplicationDbContext db, User actor) => As(
        new AdminController(db, new AuthService(db, Configuration()), NullLogger<AdminController>.Instance), actor);

    private static IConfiguration Configuration() => new ConfigurationBuilder().AddInMemoryCollection(
        new Dictionary<string, string?> { ["JwtSettings:Secret"] = "audit-test-secret-with-at-least-32-characters" }).Build();

    [Theory]
    [InlineData(UserRole.Admin)]
    [InlineData(UserRole.Instructor)]
    public async Task CourseLifecycle_OneEventPerRealChange_NoContentValuesOrDuplicateEvents(UserRole role)
    {
        await using var db = Db();
        var actor = Account(role);
        db.Users.Add(actor);
        await db.SaveChangesAsync();
        var controller = Courses(db, actor);
        var request = new CreateCourseRequest("AUDIT", "Private title", "Sensitive course body", "CS", null);
        Assert.IsType<CreatedAtActionResult>(await controller.CreateCourse(request));
        var course = await db.Courses.SingleAsync();
        Assert.IsType<ConflictObjectResult>(await controller.CreateCourse(request));
        await controller.UpdateCourse(course.Id, request);
        Assert.Single(await db.AuditLogs.ToListAsync());
        await controller.UpdateCourse(course.Id, request with { Title = "Changed private title" });
        await controller.UpdateCourse(course.Id, request with { Title = "Changed private title" });
        await controller.PublishCourse(course.Id, new(true));
        await controller.PublishCourse(course.Id, new(true));
        await controller.PublishCourse(course.Id, new(false));
        await controller.PublishCourse(course.Id, new(false));
        await controller.DeleteCourse(course.Id);
        Assert.IsType<NotFoundObjectResult>(await controller.DeleteCourse(course.Id));
        var logs = await db.AuditLogs.ToListAsync();
        Assert.Equal(new[] { "Course.Created", "Course.Deleted", "Course.Published", "Course.Unpublished", "Course.Updated" },
            logs.Select(x => x.Action).OrderBy(x => x));
        Assert.All(logs, log =>
        {
            Assert.Equal(actor.Id, log.ActorId);
            Assert.Equal(course.Id.ToString(), log.EntityId);
            Assert.Equal(DateTimeKind.Utc, log.CreatedAt.Kind);
            Assert.DoesNotContain("private", log.Details, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("Sensitive", log.Details);
            Assert.False(AdminAuditLogService.ParseSafeMetadata(log.Action, log.Details).MetadataUnavailable);
        });
        Assert.Equal("Title", AdminAuditLogService.ParseSafeMetadata("Course.Updated",
            logs.Single(x => x.Action == "Course.Updated").Details).Metadata["changedFields"]);
    }

    [Fact]
    public async Task CourseFailureAndDeniedOwnership_DoNotRecordSuccess()
    {
        await using var db = Db();
        var actor = Account(UserRole.Instructor);
        var owner = Account(UserRole.Instructor);
        var course = new Course { InstructorId = owner.Id, Code = "C", Title = "Course" };
        db.AddRange(actor, owner, course);
        await db.SaveChangesAsync();
        var controller = Courses(db, actor);
        var request = new CreateCourseRequest("C", "Title", "Desc", "CS", null);
        Assert.IsType<ForbidResult>(await controller.UpdateCourse(course.Id, request));
        Assert.IsType<ForbidResult>(await controller.PublishCourse(course.Id, new(true)));
        Assert.IsType<ForbidResult>(await controller.DeleteCourse(course.Id));
        Assert.IsType<BadRequestObjectResult>(await controller.CreateCourse(request with { Code = "" }));
        Assert.Empty(await db.AuditLogs.ToListAsync());
    }

    [Theory]
    [InlineData(true, UserRole.Admin)]
    [InlineData(false, UserRole.Admin)]
    [InlineData(true, UserRole.Instructor)]
    [InlineData(false, UserRole.Instructor)]
    public async Task EnrollmentDecision_IsAuditedOnce_NotesAreExcluded(bool approve, UserRole role)
    {
        await using var db = Db();
        var actor = Account(role);
        var student = Account(UserRole.Student);
        var course = new Course { InstructorId = actor.Id, IsFree = true, IsPublished = true };
        var enrollment = new Enrollment { CourseId = course.Id, StudentId = student.Id, Status = EnrollmentStatus.Pending };
        db.AddRange(actor, student, course, enrollment);
        await db.SaveChangesAsync();
        var controller = Instructor(db, actor);
        var request = new EnrollmentDecisionRequest("Secret review notes");
        async Task<IActionResult> Decide() => approve
            ? await controller.ApproveEnrollmentRequest(enrollment.Id, request)
            : await controller.RejectEnrollmentRequest(enrollment.Id, request);
        Assert.IsType<OkObjectResult>(await Decide());
        Assert.IsType<ConflictObjectResult>(await Decide());
        var log = await db.AuditLogs.SingleAsync();
        Assert.Equal(approve ? "Enrollment.Approved" : "Enrollment.Rejected", log.Action);
        Assert.Equal(enrollment.Id.ToString(), log.EntityId);
        Assert.Equal(actor.Id, log.ActorId);
        Assert.DoesNotContain(request.Notes!, log.Details);
        var metadata = AdminAuditLogService.ParseSafeMetadata(log.Action, log.Details).Metadata;
        Assert.Equal(student.Id.ToString(), metadata["studentId"]);
        Assert.Equal(course.Id.ToString(), metadata["courseId"]);
        Assert.Single(await db.Notifications.ToListAsync());
    }

    [Fact]
    public async Task EnrollmentPaymentFailure_ProducesNoAuditOrNotification()
    {
        await using var db = Db();
        var actor = Account(UserRole.Instructor);
        var student = Account(UserRole.Student);
        var course = new Course { InstructorId = actor.Id, IsFree = false, Price = 100 };
        var enrollment = new Enrollment { CourseId = course.Id, StudentId = student.Id, Status = EnrollmentStatus.Pending };
        db.AddRange(actor, student, course, enrollment);
        await db.SaveChangesAsync();
        var result = Assert.IsType<ObjectResult>(await Instructor(db, actor).ApproveEnrollmentRequest(enrollment.Id, null));
        Assert.Equal(402, result.StatusCode);
        Assert.Empty(await db.AuditLogs.ToListAsync());
        Assert.Empty(await db.Notifications.ToListAsync());
        Assert.Equal(EnrollmentStatus.Pending, enrollment.Status);
    }

    [Fact]
    public async Task RosterAndStudentWithdrawal_IgnoreIdempotentReplays()
    {
        await using var db = Db();
        var actor = Account(UserRole.Admin);
        var student = Account(UserRole.Student);
        var course = new Course { InstructorId = actor.Id, IsFree = true };
        db.AddRange(actor, student, course);
        await db.SaveChangesAsync();
        var admin = Courses(db, actor);
        await admin.AddStudentToCourse(course.Id, new(student.Id, null));
        await admin.AddStudentToCourse(course.Id, new(student.Id, null));
        await admin.RemoveStudentFromCourse(course.Id, student.Id);
        await admin.RemoveStudentFromCourse(course.Id, student.Id);
        await admin.AddStudentToCourse(course.Id, new(student.Id, null));
        var learner = Courses(db, student);
        await learner.UnenrollFromCourse(course.Id);
        await learner.UnenrollFromCourse(course.Id);
        Assert.Equal(2, await db.AuditLogs.CountAsync(a => a.Action == "Enrollment.Added"));
        Assert.Equal(2, await db.AuditLogs.CountAsync(a => a.Action == "Enrollment.Dropped"));
        Assert.Single(await db.AuditLogs.Where(a => a.ActorId == student.Id).ToListAsync());
        var enrollment = await db.Enrollments.SingleAsync();
        enrollment.Status = EnrollmentStatus.Pending;
        await db.SaveChangesAsync();
        await learner.UnenrollFromCourse(course.Id);
        await learner.UnenrollFromCourse(course.Id);
        Assert.Single(await db.AuditLogs.Where(a => a.Action == "Enrollment.Cancelled").ToListAsync());
    }

    [Fact]
    public async Task AccountCreationRoleStatusAndLogin_StillPermitUnusedAccountDeletion_DeletionIsAudited()
    {
        await using var db = Db();
        var actor = Account(UserRole.Admin);
        db.Users.Add(actor);
        await db.SaveChangesAsync();
        var auth = new AuthService(db, Configuration());
        var user = await auth.CreateUserAsync(new("Unused", "unused@test.local", "Password123!", UserRole.Student));
        var admin = Admin(db, actor);
        await admin.ChangeUserRole(user.Id, new("Instructor"));
        await admin.ToggleUserStatus(user.Id);
        await admin.ToggleUserStatus(user.Id);
        var session = await auth.LoginAsync(new(user.Email, "Password123!"));
        var refreshed = await auth.RefreshTokenAsync(new(session.Token, session.RefreshToken));
        await auth.LogoutAsync(refreshed.RefreshToken);
        Assert.Empty(await db.AuditLogs.ToListAsync());
        Assert.IsType<NoContentResult>(await admin.DeleteUser(user.Id));
        Assert.Null(await db.Users.FindAsync(user.Id));
        Assert.Empty(await db.RefreshTokens.Where(t => t.UserId == user.Id).ToListAsync());
        var log = await db.AuditLogs.SingleAsync();
        Assert.Equal("User.Deleted", log.Action);
        Assert.Equal(user.Id.ToString(), log.EntityId);
        Assert.Equal(actor.Id, log.ActorId);
        Assert.DoesNotContain("Password", log.Details);
        Assert.DoesNotContain(session.Token, log.Details);
        Assert.IsType<NotFoundObjectResult>(await admin.DeleteUser(user.Id));
        Assert.Single(await db.AuditLogs.ToListAsync());
    }

    [Fact]
    public async Task ProtectedUserDeletion_DoesNotEmitDeletedEvent()
    {
        await using var db = Db();
        var actor = Account(UserRole.Admin);
        var target = Account(UserRole.Student);
        db.AddRange(actor, target, new AuditLog { EntityType = "User", EntityId = target.Id.ToString() });
        await db.SaveChangesAsync();
        Assert.IsType<ConflictObjectResult>(await Admin(db, actor).DeleteUser(target.Id));
        Assert.NotNull(await db.Users.FindAsync(target.Id));
        Assert.False(await db.AuditLogs.AnyAsync(a => a.Action == "User.Deleted"));
    }

    [Theory]
    [InlineData("password", "Password123!")]
    [InlineData("changedFields", "PasswordHash")]
    [InlineData("changedFields", "Title,private-secret")]
    public void WriterRejectsUnknownKeysAndUnsafeValues(string key, string value)
    {
        using var db = Db();
        Assert.Throws<ArgumentException>(() => new AuditLogWriter(db).AddEntry(Guid.NewGuid(), "Admin",
            "Course.Updated", "Course", Guid.NewGuid().ToString(), new Dictionary<string, object?> { [key] = value }));
        Assert.Empty(db.ChangeTracker.Entries<AuditLog>());
    }

    [Fact]
    public void WriterRejectsMismatchedResourceAndInvalidActorOrId()
    {
        using var db = Db();
        var writer = new AuditLogWriter(db);
        Assert.Throws<ArgumentException>(() => writer.AddEntry(Guid.NewGuid(), "Admin", "Course.Created", "User", Guid.NewGuid().ToString()));
        Assert.Throws<ArgumentException>(() => writer.AddEntry(null, "Admin", "Course.Created", "Course", Guid.NewGuid().ToString()));
        Assert.Throws<ArgumentException>(() => writer.AddEntry(Guid.NewGuid(), "Admin", "Course.Created", "Course", "not-a-guid"));
        Assert.Empty(db.ChangeTracker.Entries<AuditLog>());
    }

    private sealed class FailAfterSave(bool transient) : Microsoft.EntityFrameworkCore.Diagnostics.SaveChangesInterceptor
    {
        public bool Armed { get; set; }
        public int Failures { get; private set; }
        public override ValueTask<int> SavedChangesAsync(Microsoft.EntityFrameworkCore.Diagnostics.SaveChangesCompletedEventData eventData,
            int result, CancellationToken cancellationToken = default)
        {
            if (!Armed) return ValueTask.FromResult(result);
            Armed = false;
            Failures++;
            if (transient) throw new TimeoutException("Injected pre-commit transient failure");
            throw new InvalidOperationException("Injected pre-commit permanent failure");
        }
    }

    private sealed class FailAfterCommit : Microsoft.EntityFrameworkCore.Diagnostics.DbTransactionInterceptor
    {
        public bool Armed { get; set; }
        public int Failures { get; private set; }
        public override Task TransactionCommittedAsync(System.Data.Common.DbTransaction transaction,
            Microsoft.EntityFrameworkCore.Diagnostics.TransactionEndEventData eventData,
            CancellationToken cancellationToken = default)
        {
            if (Armed)
            {
                Armed = false;
                Failures++;
                throw new TimeoutException("Injected lost commit acknowledgement");
            }
            return Task.CompletedTask;
        }
    }

    private static async Task<(User Actor, Enrollment Enrollment)> Pending(ApplicationDbContext db)
    {
        var actor = Account(UserRole.Instructor);
        var student = Account(UserRole.Student);
        var course = new Course { InstructorId = actor.Id, IsFree = true, Code = Guid.NewGuid().ToString(), Title = "Transaction test" };
        var enrollment = new Enrollment { CourseId = course.Id, StudentId = student.Id, Status = EnrollmentStatus.Pending };
        db.AddRange(actor, student, course, enrollment);
        await db.SaveChangesAsync();
        return (actor, enrollment);
    }

    [AuditPostgresFact]
    public async Task PostgreSql_PermanentFailureRollsBackDecisionNotificationAndAudit()
    {
        var failure = new FailAfterSave(false);
        await using var db = NewPostgresDb(Environment.GetEnvironmentVariable("EDUFLOW_AUDIT_TEST_POSTGRES")!, failure);
        var (actor, enrollment) = await Pending(db);
        failure.Armed = true;
        await Assert.ThrowsAsync<InvalidOperationException>(() => Instructor(db, actor).ApproveEnrollmentRequest(enrollment.Id, null));
        await using var check = ConnectPostgres(db.Database.GetConnectionString()!);
        Assert.Equal(EnrollmentStatus.Pending, (await check.Enrollments.SingleAsync()).Status);
        Assert.Empty(await check.AuditLogs.ToListAsync());
        Assert.Empty(await check.Notifications.ToListAsync());
        Assert.Equal(1, failure.Failures);
    }

    [AuditPostgresFact]
    public async Task PostgreSql_TransientFailureRetriesSameDecisionAndAuditExactlyOnce()
    {
        var failure = new FailAfterSave(true);
        await using var db = NewPostgresDb(Environment.GetEnvironmentVariable("EDUFLOW_AUDIT_TEST_POSTGRES")!, failure);
        var (actor, enrollment) = await Pending(db);
        failure.Armed = true;
        Assert.IsType<OkObjectResult>(await Instructor(db, actor).ApproveEnrollmentRequest(enrollment.Id, null));
        await using var check = ConnectPostgres(db.Database.GetConnectionString()!);
        Assert.Equal(EnrollmentStatus.Active, (await check.Enrollments.SingleAsync()).Status);
        Assert.Single(await check.AuditLogs.ToListAsync());
        Assert.Single(await check.Notifications.ToListAsync());
        Assert.Equal(1, failure.Failures);
    }

    [AuditPostgresFact]
    public async Task PostgreSql_LostCommitAcknowledgementDoesNotDuplicateEventOrNotification()
    {
        var failure = new FailAfterCommit();
        await using var db = NewPostgresDb(Environment.GetEnvironmentVariable("EDUFLOW_AUDIT_TEST_POSTGRES")!, failure);
        var (actor, enrollment) = await Pending(db);
        failure.Armed = true;
        Assert.IsType<OkObjectResult>(await Instructor(db, actor).RejectEnrollmentRequest(enrollment.Id, null));
        await using var check = ConnectPostgres(db.Database.GetConnectionString()!);
        Assert.Equal(EnrollmentStatus.Rejected, (await check.Enrollments.SingleAsync()).Status);
        Assert.Single(await check.AuditLogs.ToListAsync());
        Assert.Single(await check.Notifications.ToListAsync());
        Assert.Equal(1, failure.Failures);
    }

    [AuditPostgresFact]
    public async Task PostgreSql_ConcurrentDecisionsHaveOneWinnerAndOneAudit()
    {
        await using var seed = NewPostgresDb(Environment.GetEnvironmentVariable("EDUFLOW_AUDIT_TEST_POSTGRES")!);
        var (actor, enrollment) = await Pending(seed);
        await using var first = ConnectPostgres(seed.Database.GetConnectionString()!);
        await using var second = ConnectPostgres(seed.Database.GetConnectionString()!);
        var results = await Task.WhenAll(
            Instructor(first, actor).ApproveEnrollmentRequest(enrollment.Id, null),
            Instructor(second, actor).RejectEnrollmentRequest(enrollment.Id, null));
        Assert.Single(results.OfType<OkObjectResult>());
        Assert.Single(results.OfType<ConflictObjectResult>());
        Assert.Single(await seed.AuditLogs.ToListAsync());
        Assert.Single(await seed.Notifications.ToListAsync());
    }

    [AuditPostgresFact]
    public async Task PostgreSql_SupportCreateReplayAndResolveKeepExistingEventsAndPrivacy()
    {
        await using var db = NewPostgresDb(Environment.GetEnvironmentVariable("EDUFLOW_AUDIT_TEST_POSTGRES")!);
        var admin = Account(UserRole.Admin);
        var student = Account(UserRole.Student);
        db.AddRange(admin, student);
        await db.SaveChangesAsync();
        var service = new SupportTicketService(db, NullLogger<SupportTicketService>.Instance);
        var request = new CreateSupportTicketRequest("Bug", "Private support message", Guid.NewGuid());
        var created = await service.CreateTicketAsync(student.Id, request);
        var replay = await service.CreateTicketAsync(student.Id, request);
        Assert.True(replay.IsReplay);
        Assert.Equal(created.Detail!.Id, replay.Detail!.Id);
        var resolved = await service.UpdateAdminTicketAsync(admin.Id, created.Detail.Id,
            new UpdateAdminSupportTicketRequest("Resolved", "Private support reply", created.Detail.Version));
        Assert.Null(resolved.ErrorCode);
        Assert.Equal(new[] { "SupportTicket.Created", "SupportTicket.Replied", "SupportTicket.Resolved" },
            (await db.AuditLogs.ToListAsync()).Select(a => a.Action).OrderBy(a => a));
        Assert.All(await db.AuditLogs.ToListAsync(), log => Assert.DoesNotContain("Private", log.Details));
    }
}
