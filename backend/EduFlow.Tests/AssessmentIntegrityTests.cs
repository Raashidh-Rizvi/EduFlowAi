using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Api.Controllers;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using EduFlow.Infrastructure.Services.Evaluation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// HTTP-level tests for assessment security and academic integrity (LMS refactor PR 1):
/// answer-key exposure, attempt eligibility, identity spoofing, history preservation,
/// idempotent XP and the removal of fabricated gamification data.
/// </summary>
public class AssessmentIntegrityTests
{
    private const string TestPassword = "Password123!";
    private const string JwtSecret = "assessment-integrity-test-secret-at-least-32-chars";

    // -------------------------------------------------------------------------
    // Test host
    // -------------------------------------------------------------------------

    private static async Task<WebApplication> StartApp()
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
            ["JwtSettings:Secret"] = JwtSecret,
            ["JwtSettings:Issuer"] = "EduFlowAPI",
            ["JwtSettings:Audience"] = "EduFlowClients",
            ["JwtSettings:ExpiryMinutes"] = "15",
            // Unroutable AI endpoint: any AI call fails fast instead of reaching a real service.
            ["AiService:BaseUrl"] = "http://127.0.0.1:1",
            ["AiService:TimeoutSeconds"] = "5"
        });

        var databaseName = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseInMemoryDatabase(databaseName));
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddLmsDomainServices();
        builder.Services.AddScoped<ITeamService, TeamService>();
        builder.Services.AddScoped<IRatingService, RatingService>();
        builder.Services.Configure<EduFlow.Core.Options.ReviewModerationOptions>(builder.Configuration.GetSection("ReviewModeration"));
        builder.Services.AddHttpClient<IAiGatewayClient, AiGatewayClient>();

        builder.Services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret)),
                    ValidateIssuer = true,
                    ValidIssuer = "EduFlowAPI",
                    ValidateAudience = true,
                    ValidAudience = "EduFlowClients",
                    ClockSkew = TimeSpan.Zero
                };
            });
        builder.Services.AddAuthorization(EduFlow.Api.Security.AuthorizationPolicies.Configure);
        builder.Services.AddControllers().AddApplicationPart(typeof(QuizzesController).Assembly);

        var app = builder.Build();
        using (var scope = app.Services.CreateScope())
        {
            // Applies model seed data (e.g. the institution default grading policy).
            scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Database.EnsureCreated();
        }
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

    private static async Task<HttpClient> LoginAs(WebApplication app, User user)
    {
        var client = CreateClient(app);
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(user.Email, TestPassword));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        return client;
    }

    private static async Task<T> WithDb<T>(WebApplication app, Func<ApplicationDbContext, Task<T>> action)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await action(db);
    }

    private static Task<User> SeedUser(WebApplication app, string name, UserRole role) => WithDb(app, async db =>
    {
        var user = new User
        {
            FullName = name,
            Email = $"{name.Replace(" ", ".").ToLowerInvariant()}@eduflow.test",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword, workFactor: 4),
            Role = role,
            IsActive = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    });

    private sealed record Fixture(User Instructor, User Student, User Outsider, Course Course, Assessment Quiz, Question Mcq, Question Short);

    private static async Task<Fixture> SeedCourseWithQuiz(
        WebApplication app,
        QuizStatus status = QuizStatus.Published,
        int attemptsAllowed = 0,
        DateTime? dueDate = null,
        int shortAnswerPoints = 10)
    {
        var instructor = await SeedUser(app, "Instructor One", UserRole.Instructor);
        var student = await SeedUser(app, "Student Enrolled", UserRole.Student);
        var outsider = await SeedUser(app, "Student Outsider", UserRole.Student);

        return await WithDb(app, async db =>
        {
            var course = new Course { Code = "LMS-101", Title = "LMS 101", InstructorId = instructor.Id, IsFree = true };
            var module = new Module { Course = course, Title = "Module 1", OrderIndex = 1 };
            var quiz = new Assessment
            {
                Course = course,
                Title = "Module 1 Quiz",
                Status = status,
                AttemptsAllowed = attemptsAllowed,
                DueDate = dueDate,
                PassingScorePercent = 50,
                ShowCorrectAnswers = true,
                RandomizeOptions = false,
                RandomizeQuestions = false
            };
            quiz.ScopeType = QuizScopeType.Module;
            quiz.Module = module;

            var mcq = new Question
            {
                Prompt = "Which index type supports range scans?",
                Type = QuestionType.MultipleChoice,
                OptionsJson = JsonSerializer.Serialize(new[] { "B-tree", "Hash" }),
                CorrectAnswer = "B-tree",
                Explanation = "B-trees keep keys ordered.",
                MetadataJson = "{\"markingScheme\":\"secret rubric\"}",
                Points = 10,
                OrderIndex = 1
            };
            mcq.Options.Add(new QuestionOption { OptionText = "B-tree", IsCorrect = true, DisplayOrder = 1 });
            mcq.Options.Add(new QuestionOption { OptionText = "Hash", IsCorrect = false, DisplayOrder = 2 });

            var shortQ = new Question
            {
                Prompt = "Explain write-ahead logging.",
                Type = QuestionType.ShortAnswer,
                CorrectAnswer = "durability log records written before data pages",
                Points = shortAnswerPoints,
                OrderIndex = 2
            };
            quiz.Questions.Add(mcq);
            quiz.Questions.Add(shortQ);

            db.Assessments.Add(quiz);
            db.Enrollments.Add(new Enrollment { Course = course, StudentId = student.Id, Status = EnrollmentStatus.Active });
            await db.SaveChangesAsync();
            return new Fixture(instructor, student, outsider, course, quiz, mcq, shortQ);
        });
    }

    private static object SubmitBody(Fixture f, string mcqAnswer = "B-tree", string shortAnswer = "")
        => new
        {
            quizId = f.Quiz.Id,
            answers = new[]
            {
                new { questionId = f.Mcq.Id, selectedAnswer = mcqAnswer },
                new { questionId = f.Short.Id, selectedAnswer = shortAnswer }
            }
        };

    private static async Task<JsonElement> Json(HttpResponseMessage response)
        => JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    // =========================================================================
    // Answer-key exposure
    // =========================================================================

    [Fact]
    public async Task AnonymousCaller_CannotReadQuiz()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var anonymous = CreateClient(app);

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/api/quizzes/{f.Quiz.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/api/quizzes/course/{f.Course.Id}")).StatusCode);
    }

    [Theory]
    [InlineData("/api/leaderboard/global")]
    [InlineData("/api/leaderboard/weekly")]
    [InlineData("/api/gamification/leaderboard")]
    public async Task FallbackPolicy_RejectsAnonymousCallsToEndpointsWithoutExplicitAuth(string path)
    {
        await using var app = await StartApp();
        using var anonymous = CreateClient(app);

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(path)).StatusCode);
    }

    [Fact]
    public async Task FallbackPolicy_KeepsExplicitlyPublicEndpointsReachable()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var anonymous = CreateClient(app);

        Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync("/api/marketplace/courses")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync($"/api/courses/{f.Course.Id}/reviews")).StatusCode);
        var login = await anonymous.PostAsJsonAsync("/api/auth/login", new LoginRequest(f.Student.Email, TestPassword));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var badLogin = await anonymous.PostAsJsonAsync("/api/auth/login", new LoginRequest(f.Student.Email, "wrong-password"));
        Assert.Equal(HttpStatusCode.Unauthorized, badLogin.StatusCode);
    }

    [Fact]
    public async Task EnrolledStudent_ReceivesQuizWithoutAnswerKeys()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);

        var response = await student.GetAsync($"/api/quizzes/{f.Quiz.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var raw = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("B-trees keep keys ordered", raw);
        Assert.DoesNotContain("secret rubric", raw);
        foreach (var q in (await Json(response)).GetProperty("questions").EnumerateArray())
        {
            Assert.Equal(JsonValueKind.Null, q.GetProperty("correctAnswer").ValueKind);
            Assert.Equal(JsonValueKind.Null, q.GetProperty("optionDetails").ValueKind);
        }

        var start = await student.PostAsync($"/api/quizzes/{f.Quiz.Id}/start", null);
        Assert.Equal(HttpStatusCode.OK, start.StatusCode);
        Assert.DoesNotContain("secret rubric", await start.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task CourseOwner_ReceivesAnswerKeys()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var instructor = await LoginAs(app, f.Instructor);

        var body = await Json(await instructor.GetAsync($"/api/quizzes/{f.Quiz.Id}"));
        var mcq = body.GetProperty("questions").EnumerateArray().Single(q => q.GetProperty("id").GetGuid() == f.Mcq.Id);
        Assert.Equal("B-tree", mcq.GetProperty("correctAnswer").GetString());
    }

    [Fact]
    public async Task Student_CannotSeeDraftQuizzes()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, status: QuizStatus.Draft);
        using var student = await LoginAs(app, f.Student);

        Assert.Equal(HttpStatusCode.Forbidden, (await student.GetAsync($"/api/quizzes/{f.Quiz.Id}")).StatusCode);
        var list = await Json(await student.GetAsync($"/api/quizzes/course/{f.Course.Id}"));
        Assert.Equal(0, list.GetArrayLength());
    }

    [Fact]
    public async Task UnenrolledStudent_CannotListOrReadCourseQuizzes()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var outsider = await LoginAs(app, f.Outsider);

        Assert.Equal(HttpStatusCode.Forbidden, (await outsider.GetAsync($"/api/quizzes/{f.Quiz.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await outsider.GetAsync($"/api/quizzes/course/{f.Course.Id}")).StatusCode);
    }

    // =========================================================================
    // Attempt eligibility
    // =========================================================================

    [Fact]
    public async Task UnenrolledStudent_CannotStartOrSubmit()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var outsider = await LoginAs(app, f.Outsider);

        Assert.Equal(HttpStatusCode.Forbidden, (await outsider.PostAsync($"/api/quizzes/{f.Quiz.Id}/start", null)).StatusCode);
        var submit = await outsider.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f));
        Assert.Equal(HttpStatusCode.Forbidden, submit.StatusCode);
        Assert.Equal("NotEnrolled", (await Json(submit)).GetProperty("code").GetString());
        Assert.Equal(0, await WithDb(app, db => db.Submissions.CountAsync()));
    }

    [Fact]
    public async Task Student_CannotSubmitDraftAssessment()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, status: QuizStatus.Draft);
        using var student = await LoginAs(app, f.Student);

        var submit = await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f));
        Assert.Equal(HttpStatusCode.Forbidden, submit.StatusCode);
        Assert.Equal("NotPublished", (await Json(submit)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Student_CannotSubmitAfterAvailabilityWindowCloses()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, dueDate: DateTime.UtcNow.AddMinutes(-1));
        using var student = await LoginAs(app, f.Student);

        var submit = await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f));
        Assert.Equal(HttpStatusCode.Forbidden, submit.StatusCode);
        Assert.Equal("Closed", (await Json(submit)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task AttemptLimit_IsEnforcedServerSide()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, attemptsAllowed: 1);
        using var student = await LoginAs(app, f.Student);

        Assert.Equal(HttpStatusCode.OK, (await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f))).StatusCode);

        var second = await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f));
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("AttemptLimitReached", (await Json(second)).GetProperty("code").GetString());
        Assert.Equal(1, await WithDb(app, db => db.Submissions.CountAsync()));
    }

    [Fact]
    public async Task Submit_RejectsAnswersForQuestionsOutsideTheQuiz()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);

        var response = await student.PostAsJsonAsync("/api/quizzes/submit", new
        {
            quizId = f.Quiz.Id,
            answers = new[] { new { questionId = Guid.NewGuid(), selectedAnswer = "B-tree" } }
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ShortAnswer_WithFewMarks_DoesNotCrashAndNeverExceedsMaximum()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, shortAnswerPoints: 2);
        using var student = await LoginAs(app, f.Student);

        var response = await student.PostAsJsonAsync("/api/quizzes/submit",
            SubmitBody(f, shortAnswer: "a long answer that mentions nothing relevant at all"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var shortAnswer = await WithDb(app, db => db.SubmissionAnswers.SingleAsync(a => a.QuestionId == f.Short.Id));
        Assert.InRange(shortAnswer.PointsAwarded, 0, 2);
    }

    // =========================================================================
    // Idempotent XP
    // =========================================================================

    [Fact]
    public async Task RepeatSubmission_DoesNotRepayCompletionOrPassXp()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);

        var first = await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f)));
        Assert.True(first.GetProperty("xpEarned").GetInt32() > 0);

        var second = await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f)));
        Assert.Equal(0, second.GetProperty("xpEarned").GetInt32());

        var ledger = await WithDb(app, db => db.XpTransactions.Where(x => x.StudentId == f.Student.Id).ToListAsync());
        Assert.Single(ledger, x => x.SourceType == XpSourceType.QuizCompleted);
        Assert.Single(ledger, x => x.SourceType == XpSourceType.PassBonus);
    }

    [Fact]
    public async Task PassBonus_UsesTheAssessmentsPassingScore()
    {
        // The quiz passes at 50%; one of two equal-mark questions correct must earn the pass bonus.
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);

        var result = await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f)));
        Assert.True(result.GetProperty("passed").GetBoolean());
        Assert.True(result.GetProperty("xpBreakdown").GetProperty("passBonus").GetInt32() > 0);
    }

    // =========================================================================
    // History preservation
    // =========================================================================

    [Fact]
    public async Task QuizWithAttempts_CannotBeDeletedOrEdited_ButCanBeArchived()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using (var student = await LoginAs(app, f.Student))
        {
            Assert.Equal(HttpStatusCode.OK, (await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f))).StatusCode);
        }

        using var instructor = await LoginAs(app, f.Instructor);
        Assert.Equal(HttpStatusCode.Conflict, (await instructor.DeleteAsync($"/api/quizzes/{f.Quiz.Id}")).StatusCode);

        var edit = await instructor.PutAsJsonAsync($"/api/quizzes/{f.Quiz.Id}", new
        {
            courseId = f.Course.Id,
            title = "Edited",
            description = "",
            timeLimitMinutes = 10,
            passingScorePercent = 50,
            xpReward = 10,
            coinReward = 0,
            questions = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.Conflict, edit.StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await instructor.PostAsync($"/api/quizzes/{f.Quiz.Id}/archive", null)).StatusCode);

        var (submissions, questions, status) = await WithDb(app, async db => (
            await db.Submissions.CountAsync(),
            await db.Questions.CountAsync(q => q.AssessmentId == f.Quiz.Id),
            (await db.Assessments.SingleAsync(a => a.Id == f.Quiz.Id)).Status));
        Assert.Equal(1, submissions);
        Assert.Equal(2, questions);
        Assert.Equal(QuizStatus.Archived, status);
        Assert.Equal(1, await WithDb(app, db => db.AuditLogs.CountAsync(a =>
            a.Action == "Assessment.Archived" && a.EntityId == f.Quiz.Id.ToString() && a.ActorId == f.Instructor.Id)));
    }

    [Fact]
    public async Task CreateQuiz_CannotPublishInvalidQuizDirectly()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var instructor = await LoginAs(app, f.Instructor);

        var response = await instructor.PostAsJsonAsync("/api/quizzes", new
        {
            courseId = f.Course.Id,
            title = "Empty but published",
            description = "",
            timeLimitMinutes = 10,
            passingScorePercent = 50,
            xpReward = 10,
            coinReward = 0,
            status = (int)QuizStatus.Published,
            questions = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ModuleScopedQuiz_WithoutModule_IsRejected()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var instructor = await LoginAs(app, f.Instructor);

        var response = await instructor.PostAsJsonAsync("/api/quizzes", new
        {
            courseId = f.Course.Id,
            title = "Module quiz",
            description = "",
            timeLimitMinutes = 10,
            passingScorePercent = 50,
            xpReward = 10,
            coinReward = 0,
            scopeType = (int)QuizScopeType.Module,
            questions = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task RegenerateQuestion_OnAnotherInstructorsQuiz_IsForbidden()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        var otherInstructor = await SeedUser(app, "Instructor Two", UserRole.Instructor);
        using var client = await LoginAs(app, otherInstructor);

        var response = await client.PostAsJsonAsync($"/api/quizzes/questions/{f.Mcq.Id}/regenerate",
            new { questionId = f.Mcq.Id });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RegenerateQuestion_WhenAiUnavailable_LeavesQuestionUnchanged()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, status: QuizStatus.Draft);
        using var instructor = await LoginAs(app, f.Instructor);

        var response = await instructor.PostAsJsonAsync($"/api/quizzes/questions/{f.Mcq.Id}/regenerate",
            new { questionId = f.Mcq.Id });
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);

        var question = await WithDb(app, db => db.Questions.SingleAsync(q => q.Id == f.Mcq.Id));
        Assert.Equal("Which index type supports range scans?", question.Prompt);
        Assert.Equal("B-tree", question.CorrectAnswer);
    }

    // =========================================================================
    // Persisted attempts (PR 2)
    // =========================================================================

    [Fact]
    public async Task Start_PersistsAnAttempt_AndResumesTheSameOpenAttempt()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);

        var first = await Json(await student.PostAsync($"/api/quizzes/{f.Quiz.Id}/start", null));
        var second = await Json(await student.PostAsync($"/api/quizzes/{f.Quiz.Id}/start", null));

        Assert.True(first.GetProperty("isRecorded").GetBoolean());
        Assert.Equal(1, first.GetProperty("attemptNumber").GetInt32());
        Assert.Equal(first.GetProperty("attemptId").GetGuid(), second.GetProperty("attemptId").GetGuid());

        var attempt = await WithDb(app, db => db.Submissions.SingleAsync());
        Assert.Equal(AttemptStatus.InProgress, attempt.Status);
        Assert.NotNull(attempt.StartedAt);
        Assert.Null(attempt.SubmittedAt);
    }

    [Fact]
    public async Task Submit_CompletesTheStartedAttempt_WithPerAnswerEvaluation()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);

        var start = await Json(await student.PostAsync($"/api/quizzes/{f.Quiz.Id}/start", null));
        var attemptId = start.GetProperty("attemptId").GetGuid();

        var body = new
        {
            quizId = f.Quiz.Id,
            attemptId,
            answers = new[]
            {
                new { questionId = f.Mcq.Id, selectedAnswer = "B-tree" },
                new { questionId = f.Short.Id, selectedAnswer = "" }
            }
        };
        var submit = await student.PostAsJsonAsync("/api/quizzes/submit", body);
        Assert.Equal(HttpStatusCode.OK, submit.StatusCode);
        Assert.Equal(attemptId, (await Json(submit)).GetProperty("attemptId").GetGuid());

        var (attempt, answers) = await WithDb(app, async db => (
            await db.Submissions.SingleAsync(),
            await db.SubmissionAnswers.ToListAsync()));
        Assert.Equal(attemptId, attempt.Id);
        Assert.Equal(AttemptStatus.Evaluated, attempt.Status);
        Assert.NotNull(attempt.SubmittedAt);
        Assert.NotNull(attempt.EvaluatedAt);
        Assert.Equal(2, answers.Count);
        Assert.All(answers, a =>
        {
            Assert.Equal(AnswerEvaluationStatus.Evaluated, a.EvaluationStatus);
            Assert.InRange(a.PointsAwarded, 0, a.MaxMarks);
        });
        Assert.Equal(10, answers.Single(a => a.QuestionId == f.Mcq.Id).MaxMarks);

        // The same attempt cannot be submitted twice.
        Assert.Equal(HttpStatusCode.Conflict, (await student.PostAsJsonAsync("/api/quizzes/submit", body)).StatusCode);
    }

    [Fact]
    public async Task Submit_WithAnotherStudentsAttemptId_IsRejected()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);
        var attemptId = (await Json(await student.PostAsync($"/api/quizzes/{f.Quiz.Id}/start", null)))
            .GetProperty("attemptId").GetGuid();

        await WithDb(app, async db =>
        {
            db.Enrollments.Add(new Enrollment { CourseId = f.Course.Id, StudentId = f.Outsider.Id, Status = EnrollmentStatus.Active });
            return await db.SaveChangesAsync();
        });
        using var other = await LoginAs(app, f.Outsider);

        var response = await other.PostAsJsonAsync("/api/quizzes/submit", new
        {
            quizId = f.Quiz.Id,
            attemptId,
            answers = new[] { new { questionId = f.Mcq.Id, selectedAnswer = "B-tree" } }
        });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(AttemptStatus.InProgress, (await WithDb(app, db => db.Submissions.SingleAsync())).Status);
    }

    [Fact]
    public async Task StartedAttempts_CountTowardTheAttemptLimit()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, attemptsAllowed: 1);
        using var student = await LoginAs(app, f.Student);

        Assert.Equal(HttpStatusCode.OK, (await student.PostAsync($"/api/quizzes/{f.Quiz.Id}/start", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f))).StatusCode);

        // The only allowed attempt is used up; starting again is refused.
        Assert.Equal(HttpStatusCode.Conflict, (await student.PostAsync($"/api/quizzes/{f.Quiz.Id}/start", null)).StatusCode);
    }

    [Fact]
    public async Task InstructorPreview_IsNotRecordedAsAnAttempt()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, status: QuizStatus.Draft);
        using var instructor = await LoginAs(app, f.Instructor);

        var preview = await Json(await instructor.PostAsync($"/api/quizzes/{f.Quiz.Id}/start", null));
        Assert.False(preview.GetProperty("isRecorded").GetBoolean());
        Assert.Equal(0, await WithDb(app, db => db.Submissions.CountAsync()));
    }

    // =========================================================================
    // Canonical placement: every assessment belongs to a module (PR 2)
    // =========================================================================

    [Fact]
    public async Task CourseLevelQuiz_RequiresAModule_AndIsPlacedInIt()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        var moduleId = f.Quiz.ModuleId;
        using var instructor = await LoginAs(app, f.Instructor);

        object Body(Guid? module) => new
        {
            courseId = f.Course.Id,
            title = "Course quiz",
            description = "",
            timeLimitMinutes = 10,
            passingScorePercent = 50,
            xpReward = 10,
            coinReward = 0,
            scopeType = (int)QuizScopeType.Course,
            status = (int)QuizStatus.Draft,
            moduleId = module,
            questions = Array.Empty<object>()
        };

        Assert.Equal(HttpStatusCode.BadRequest, (await instructor.PostAsJsonAsync("/api/quizzes", Body(null))).StatusCode);

        var created = await instructor.PostAsJsonAsync("/api/quizzes", Body(moduleId));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await Json(created)).GetProperty("id").GetGuid();

        var stored = await WithDb(app, db => db.Assessments.SingleAsync(a => a.Id == id));
        Assert.Equal(moduleId, stored.ModuleId);
        Assert.Equal(QuizScopeType.Module, stored.ScopeType);
        Assert.Equal(moduleId, stored.ScopeId);
    }

    [Fact]
    public async Task TopicQuiz_IsPlacedInTheTopicsModule()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        var topic = await WithDb(app, async db =>
        {
            var t = new Topic { ModuleId = f.Quiz.ModuleId, Title = "Indexes" };
            db.Topics.Add(t);
            await db.SaveChangesAsync();
            return t;
        });
        using var instructor = await LoginAs(app, f.Instructor);

        var created = await instructor.PostAsJsonAsync("/api/quizzes", new
        {
            courseId = f.Course.Id,
            title = "Topic quiz",
            description = "",
            timeLimitMinutes = 10,
            passingScorePercent = 50,
            xpReward = 10,
            coinReward = 0,
            scopeType = (int)QuizScopeType.Topic,
            scopeId = topic.Id,
            status = (int)QuizStatus.Draft,
            questions = Array.Empty<object>()
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await Json(created)).GetProperty("id").GetGuid();

        var stored = await WithDb(app, db => db.Assessments.SingleAsync(a => a.Id == id));
        Assert.Equal(f.Quiz.ModuleId, stored.ModuleId);
        Assert.Equal(topic.Id, stored.TopicId);
    }

    [Fact]
    public async Task CourseDetail_HidesDraftAssessmentsFromStudents()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, status: QuizStatus.Draft);
        using var student = await LoginAs(app, f.Student);
        using var instructor = await LoginAs(app, f.Instructor);

        static int QuizCount(JsonElement course) => course.GetProperty("modules").EnumerateArray()
            .Sum(m => m.TryGetProperty("quizzes", out var q) && q.ValueKind == JsonValueKind.Array ? q.GetArrayLength() : 0);

        Assert.Equal(0, QuizCount(await Json(await student.GetAsync($"/api/courses/{f.Course.Id}"))));
        Assert.Equal(1, QuizCount(await Json(await instructor.GetAsync($"/api/courses/{f.Course.Id}"))));
    }

    // =========================================================================
    // Marking, manual review and results (PR 3)
    // =========================================================================

    private static object MarkBody(int marks, string? reason = null, string? feedback = null)
        => new { awardedMarks = marks, reason, feedback };

    [Fact]
    public async Task SubjectiveAnswer_WaitsForMarking_ThenXpIsAwardedOnce()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);

        var submit = await Json(await student.PostAsJsonAsync("/api/quizzes/submit",
            SubmitBody(f, shortAnswer: "WAL writes log records before data pages.")));
        Assert.Equal("Evaluating", submit.GetProperty("status").GetString());
        Assert.Equal(1, submit.GetProperty("pendingReviewCount").GetInt32());
        Assert.False(submit.GetProperty("passed").GetBoolean());
        Assert.Equal(0, submit.GetProperty("xpEarned").GetInt32());
        Assert.Equal(0, await WithDb(app, db => db.XpTransactions.CountAsync()));
        var attemptId = submit.GetProperty("attemptId").GetGuid();

        using var instructor = await LoginAs(app, f.Instructor);
        var mark = await instructor.PostAsJsonAsync(
            $"/api/quizzes/attempts/{attemptId}/answers/{f.Short.Id}/mark", MarkBody(8, feedback: "Good explanation."));
        Assert.Equal(HttpStatusCode.OK, mark.StatusCode);
        var marked = await Json(mark);
        Assert.Equal("Evaluated", marked.GetProperty("status").GetString());
        Assert.Equal(18, marked.GetProperty("scoreObtained").GetInt32());
        Assert.True(marked.GetProperty("passed").GetBoolean());

        var (completionXp, adjustments, audits) = await WithDb(app, async db => (
            await db.XpTransactions.CountAsync(x => x.SourceType == XpSourceType.QuizCompleted),
            await db.MarkAdjustments.ToListAsync(),
            await db.AuditLogs.CountAsync(a => a.Action == "Submission.Marked")));
        Assert.Equal(1, completionXp);
        var adjustment = Assert.Single(adjustments);
        Assert.Equal(0, adjustment.PreviousMarks);
        Assert.Equal(8, adjustment.NewMarks);
        Assert.Equal(AnswerEvaluationStatus.NeedsReview, adjustment.PreviousStatus);
        Assert.Equal(f.Instructor.Id, adjustment.ActorId);
        Assert.Equal(1, audits);
    }

    [Fact]
    public async Task OverridingAnExistingMark_RequiresAReason_AndRecalculatesTheAttempt()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);
        var attemptId = (await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f, mcqAnswer: "Hash"))))
            .GetProperty("attemptId").GetGuid();

        using var instructor = await LoginAs(app, f.Instructor);
        var url = $"/api/quizzes/attempts/{attemptId}/answers/{f.Mcq.Id}/mark";

        Assert.Equal(HttpStatusCode.BadRequest, (await instructor.PostAsJsonAsync(url, MarkBody(10))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await instructor.PostAsJsonAsync(url, MarkBody(11, "Over max"))).StatusCode);

        var ok = await instructor.PostAsJsonAsync(url, MarkBody(10, "Option text was ambiguous; accepted."));
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        Assert.Equal(10, (await Json(ok)).GetProperty("scoreObtained").GetInt32());

        var adjustment = await WithDb(app, db => db.MarkAdjustments.SingleAsync());
        Assert.Equal(0, adjustment.PreviousMarks);
        Assert.Equal("Option text was ambiguous; accepted.", adjustment.Reason);
    }

    [Fact]
    public async Task OnlyTheCourseInstructorCanMark()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);
        var attemptId = (await Json(await student.PostAsJsonAsync("/api/quizzes/submit",
            SubmitBody(f, shortAnswer: "An answer.")))).GetProperty("attemptId").GetGuid();

        var otherInstructor = await SeedUser(app, "Instructor Two", UserRole.Instructor);
        using var other = await LoginAs(app, otherInstructor);
        var url = $"/api/quizzes/attempts/{attemptId}/answers/{f.Short.Id}/mark";

        Assert.Equal(HttpStatusCode.Forbidden, (await other.PostAsJsonAsync(url, MarkBody(5))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await student.PostAsJsonAsync(url, MarkBody(10))).StatusCode);
        Assert.Equal(0, await WithDb(app, db => db.MarkAdjustments.CountAsync()));
    }

    [Fact]
    public async Task AttemptResult_IsVisibleToItsStudentAndInstructorOnly()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);
        var attemptId = (await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f))))
            .GetProperty("attemptId").GetGuid();
        var url = $"/api/quizzes/attempts/{attemptId}/result";

        var own = await student.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, own.StatusCode);
        Assert.Equal(2, (await Json(own)).GetProperty("questionBreakdown").GetArrayLength());

        using var instructor = await LoginAs(app, f.Instructor);
        Assert.Equal(HttpStatusCode.OK, (await instructor.GetAsync(url)).StatusCode);

        using var outsider = await LoginAs(app, f.Outsider);
        Assert.Equal(HttpStatusCode.NotFound, (await outsider.GetAsync(url)).StatusCode);
    }

    [Fact]
    public async Task AttemptResult_IsReproducibleAfterTheQuestionChanges()
    {
        await using var app = await StartApp();
        // Single attempt: keys are only revealed to students once no attempts remain.
        var f = await SeedCourseWithQuiz(app, attemptsAllowed: 1);
        using var student = await LoginAs(app, f.Student);
        var attemptId = (await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f))))
            .GetProperty("attemptId").GetGuid();

        // Change the live question and its answer key after the attempt was marked.
        await WithDb(app, async db =>
        {
            var q = await db.Questions.Include(x => x.Options).SingleAsync(x => x.Id == f.Mcq.Id);
            q.Prompt = "Rewritten prompt";
            q.CorrectAnswer = "Hash";
            q.Points = 1;
            foreach (var o in q.Options) o.IsCorrect = o.OptionText == "Hash";
            return await db.SaveChangesAsync();
        });

        var result = await Json(await student.GetAsync($"/api/quizzes/attempts/{attemptId}/result"));
        var mcq = result.GetProperty("questionBreakdown").EnumerateArray()
            .Single(q => q.GetProperty("questionId").GetGuid() == f.Mcq.Id);
        Assert.Equal("Which index type supports range scans?", mcq.GetProperty("prompt").GetString());
        Assert.Equal("B-tree", mcq.GetProperty("correctAnswer").GetString());
        Assert.Equal(10, mcq.GetProperty("pointsAwarded").GetInt32());
        Assert.Equal(10, mcq.GetProperty("maxMarks").GetInt32());
        Assert.Equal(10, result.GetProperty("scoreObtained").GetInt32());
    }

    [Fact]
    public async Task AttemptResult_HidesAnswerKeysFromStudentsWhenConfigured()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        await WithDb(app, async db =>
        {
            (await db.Assessments.SingleAsync(a => a.Id == f.Quiz.Id)).ShowCorrectAnswers = false;
            return await db.SaveChangesAsync();
        });
        using var student = await LoginAs(app, f.Student);
        var attemptId = (await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f, mcqAnswer: "Hash"))))
            .GetProperty("attemptId").GetGuid();

        var raw = await (await student.GetAsync($"/api/quizzes/attempts/{attemptId}/result")).Content.ReadAsStringAsync();
        Assert.DoesNotContain("B-tree", raw.Replace("Which index type", ""));
        Assert.DoesNotContain("B-trees keep keys ordered", raw);
    }

    private static JsonElement McqItem(JsonElement body, Fixture f)
        => body.GetProperty("questionBreakdown").EnumerateArray()
            .Single(q => q.GetProperty("questionId").GetGuid() == f.Mcq.Id);

    private static void AssertKeysHidden(JsonElement body, Fixture f, string raw)
    {
        Assert.Equal("Hidden", McqItem(body, f).GetProperty("correctAnswer").GetString());
        Assert.DoesNotContain("B-trees keep keys ordered", raw);
        Assert.DoesNotContain("secret rubric", raw);
    }

    [Fact]
    public async Task Submit_DoesNotRevealAnswerKeys_WhileAttemptsRemain()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, attemptsAllowed: 2);
        using var student = await LoginAs(app, f.Student);

        var firstResponse = await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f, mcqAnswer: "Hash"));
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        var firstRaw = await firstResponse.Content.ReadAsStringAsync();
        var first = JsonDocument.Parse(firstRaw).RootElement;
        AssertKeysHidden(first, f, firstRaw);

        var resultResponse = await student.GetAsync($"/api/quizzes/attempts/{first.GetProperty("attemptId").GetGuid()}/result");
        var resultRaw = await resultResponse.Content.ReadAsStringAsync();
        AssertKeysHidden(JsonDocument.Parse(resultRaw).RootElement, f, resultRaw);

        // Final attempt: nothing left to gain, so the configured answers are shown.
        var last = await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f, mcqAnswer: "Hash")));
        Assert.Equal("B-tree", McqItem(last, f).GetProperty("correctAnswer").GetString());

        // ...and the earlier attempt's result now reveals them too.
        var earlier = await Json(await student.GetAsync($"/api/quizzes/attempts/{first.GetProperty("attemptId").GetGuid()}/result"));
        Assert.Equal("B-tree", McqItem(earlier, f).GetProperty("correctAnswer").GetString());
    }

    [Fact]
    public async Task UnlimitedAttemptQuiz_NeverRevealsAnswerKeysToStudents_WhileOpen()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);
        using var instructor = await LoginAs(app, f.Instructor);

        var response = await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f, mcqAnswer: "Hash"));
        var raw = await response.Content.ReadAsStringAsync();
        var body = JsonDocument.Parse(raw).RootElement;
        AssertKeysHidden(body, f, raw);

        var url = $"/api/quizzes/attempts/{body.GetProperty("attemptId").GetGuid()}/result";
        var resultRaw = await (await student.GetAsync(url)).Content.ReadAsStringAsync();
        AssertKeysHidden(JsonDocument.Parse(resultRaw).RootElement, f, resultRaw);

        // The course instructor always sees the key.
        Assert.Equal("B-tree", McqItem(await Json(await instructor.GetAsync(url)), f).GetProperty("correctAnswer").GetString());
    }

    [Fact]
    public async Task AttemptResult_RevealsAnswerKeys_AfterTheQuizCloses()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);
        var attemptId = (await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f, mcqAnswer: "Hash"))))
            .GetProperty("attemptId").GetGuid();

        await WithDb(app, async db =>
        {
            (await db.Assessments.SingleAsync(a => a.Id == f.Quiz.Id)).DueDate = DateTime.UtcNow.AddMinutes(-1);
            return await db.SaveChangesAsync();
        });

        var result = await Json(await student.GetAsync($"/api/quizzes/attempts/{attemptId}/result"));
        Assert.Equal("B-tree", McqItem(result, f).GetProperty("correctAnswer").GetString());
    }

    [Fact]
    public async Task AttemptResult_HidesAnswerKeys_WhileAnotherAttemptIsOpen()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, attemptsAllowed: 2);
        using var student = await LoginAs(app, f.Student);
        var attemptId = (await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f, mcqAnswer: "Hash"))))
            .GetProperty("attemptId").GetGuid();

        // Starting the last attempt uses up the limit but must not unlock the key mid-attempt.
        Assert.Equal(HttpStatusCode.OK, (await student.PostAsync($"/api/quizzes/{f.Quiz.Id}/start", null)).StatusCode);

        var raw = await (await student.GetAsync($"/api/quizzes/attempts/{attemptId}/result")).Content.ReadAsStringAsync();
        AssertKeysHidden(JsonDocument.Parse(raw).RootElement, f, raw);
    }

    // =========================================================================
    // Grading (PR 4)
    // =========================================================================

    [Fact]
    public async Task CourseGrade_FollowsEvaluatedAttempts_ThroughTheConfiguredWeights()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var instructor = await LoginAs(app, f.Instructor);
        using var student = await LoginAs(app, f.Student);

        // Students cannot configure grading or read anyone else's grade.
        Assert.Equal(HttpStatusCode.Forbidden, (await student.PutAsJsonAsync($"/api/courses/{f.Course.Id}/grading",
            new { attemptScoring = 0, weights = new[] { new { assessmentId = f.Quiz.Id, weightPercent = 100 } } })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await student.GetAsync($"/api/courses/{f.Course.Id}/grade?studentId={f.Outsider.Id}")).StatusCode);

        // Before activation there is no grade.
        Assert.Equal("NotConfigured", (await Json(await student.GetAsync($"/api/courses/{f.Course.Id}/grade")))
            .GetProperty("gradingStatus").GetString());

        Assert.Equal(HttpStatusCode.OK, (await instructor.PutAsJsonAsync($"/api/courses/{f.Course.Id}/grading",
            new { attemptScoring = 0, weights = new[] { new { assessmentId = f.Quiz.Id, weightPercent = 100 } } })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await instructor.PostAsync($"/api/courses/{f.Course.Id}/grading/activate", null)).StatusCode);

        // MCQ correct (10/20) and a short answer awaiting marking: no course percentage yet.
        var attemptId = (await Json(await student.PostAsJsonAsync("/api/quizzes/submit",
            SubmitBody(f, shortAnswer: "Log records are flushed before pages.")))).GetProperty("attemptId").GetGuid();
        var pending = await Json(await student.GetAsync($"/api/courses/{f.Course.Id}/grade"));
        Assert.Equal(0m, pending.GetProperty("coursePercentage").GetDecimal());
        Assert.Equal("F", pending.GetProperty("grade").GetString());

        // Marking completes the attempt; the course grade follows.
        Assert.Equal(HttpStatusCode.OK, (await instructor.PostAsJsonAsync(
            $"/api/quizzes/attempts/{attemptId}/answers/{f.Short.Id}/mark", new { awardedMarks = 7 })).StatusCode);
        var graded = await Json(await student.GetAsync($"/api/courses/{f.Course.Id}/grade"));
        Assert.Equal(85m, graded.GetProperty("coursePercentage").GetDecimal());
        Assert.Equal("A+", graded.GetProperty("grade").GetString());
        Assert.True(graded.GetProperty("isComplete").GetBoolean());

        var roster = await Json(await instructor.GetAsync($"/api/courses/{f.Course.Id}/grades"));
        Assert.Equal("A+", roster.EnumerateArray().Single().GetProperty("calculatedGrade").GetString());
    }

    [Fact]
    public async Task WeightedQuiz_CannotBeDeletedWhileGradingIsActive()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app, status: QuizStatus.Draft);
        using var instructor = await LoginAs(app, f.Instructor);
        await instructor.PutAsJsonAsync($"/api/courses/{f.Course.Id}/grading",
            new { attemptScoring = 0, weights = new[] { new { assessmentId = f.Quiz.Id, weightPercent = 100 } } });
        await instructor.PostAsync($"/api/courses/{f.Course.Id}/grading/activate", null);

        Assert.Equal(HttpStatusCode.Conflict, (await instructor.DeleteAsync($"/api/quizzes/{f.Quiz.Id}")).StatusCode);
    }

    // =========================================================================
    // Content tree and progress (PR 5)
    // =========================================================================

    [Fact]
    public async Task LessonCompletion_AndPassingAQuiz_DriveCourseProgress()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        var lesson = await WithDb(app, async db =>
        {
            var item = new ContentItem { ModuleId = f.Quiz.ModuleId, Title = "Lesson 1", ContentType = "Lesson", XpReward = 10 };
            db.ContentItems.Add(item);
            await db.SaveChangesAsync();
            return item;
        });
        using var student = await LoginAs(app, f.Student);

        var start = await Json(await student.GetAsync($"/api/courses/{f.Course.Id}/progress"));
        Assert.Equal(2, start.GetProperty("totalUnits").GetInt32());
        Assert.Equal(0m, start.GetProperty("percentage").GetDecimal());

        Assert.Equal(HttpStatusCode.OK, (await student.PostAsync($"/api/courses/lessons/{lesson.Id}/complete", null)).StatusCode);
        var afterLesson = await Json(await student.GetAsync($"/api/courses/{f.Course.Id}/progress"));
        Assert.Equal(50m, afterLesson.GetProperty("percentage").GetDecimal());

        // Passing the quiz (MCQ correct, short answer left blank: 10/20 meets the 50% pass mark) completes the course.
        Assert.Equal(HttpStatusCode.OK, (await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f))).StatusCode);
        var done = await Json(await student.GetAsync($"/api/courses/{f.Course.Id}/progress"));
        Assert.Equal(100m, done.GetProperty("percentage").GetDecimal());
        Assert.True(done.GetProperty("isComplete").GetBoolean());

        var enrollment = await WithDb(app, db => db.Enrollments.SingleAsync(e => e.StudentId == f.Student.Id));
        Assert.Equal(100.0, enrollment.ProgressPercentage);
        Assert.Equal(EnrollmentStatus.Completed, enrollment.Status);
    }

    [Fact]
    public async Task Progress_OfAnotherStudent_IsNotVisible()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var outsider = await LoginAs(app, f.Outsider);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await outsider.GetAsync($"/api/courses/{f.Course.Id}/progress?studentId={f.Student.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await outsider.GetAsync($"/api/courses/{f.Course.Id}/progress")).StatusCode);
    }

    // =========================================================================
    // Event-driven gamification (PR 6)
    // =========================================================================

    [Fact]
    public async Task CourseCompletion_IsPublishedOnce_AndPaysItsConfiguredReward()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        int courseXp = await WithDb(app, async db =>
            (int)(await db.GamificationRules.SingleAsync(r => r.Key == EduFlow.Core.Constants.GamificationRuleKeys.CourseCompletedXp)).Value);
        using var student = await LoginAs(app, f.Student);

        // The quiz is the course's only unit: passing it completes the course.
        Assert.Equal(HttpStatusCode.OK, (await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f))).StatusCode);
        // Reading progress again must not publish the event a second time.
        Assert.Equal(HttpStatusCode.OK, (await student.GetAsync($"/api/courses/{f.Course.Id}/progress")).StatusCode);

        var (courseRows, graduate) = await WithDb(app, async db => (
            await db.XpTransactions.Where(x => x.StudentId == f.Student.Id && x.SourceType == XpSourceType.CourseCompleted).ToListAsync(),
            await db.StudentBadges.AnyAsync(b => b.StudentId == f.Student.Id && b.BadgeId == "COURSE_GRADUATE")));
        Assert.Equal(courseXp, Assert.Single(courseRows).XpAmount);
        Assert.True(graduate);
    }

    [Fact]
    public async Task GamificationRules_AreAdminOnly_AndChangesAreAudited()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        var admin = await SeedUser(app, "Platform Admin", UserRole.Admin);
        using var instructor = await LoginAs(app, f.Instructor);
        using var adminClient = await LoginAs(app, admin);
        var key = EduFlow.Core.Constants.GamificationRuleKeys.QuizPassBonus;

        Assert.Equal(HttpStatusCode.Forbidden, (await instructor.GetAsync("/api/gamification/rules")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await instructor.PutAsJsonAsync($"/api/gamification/rules/{key}", new { value = 999 })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await adminClient.PutAsJsonAsync($"/api/gamification/rules/{key}", new { value = 35 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await adminClient.PostAsJsonAsync("/api/gamification/multiplier", new { multiplier = 9 })).StatusCode);

        var (value, audits) = await WithDb(app, async db => (
            (await db.GamificationRules.SingleAsync(r => r.Key == key)).Value,
            await db.AuditLogs.CountAsync(a => a.Action == "GamificationRule.Updated")));
        Assert.Equal(35m, value);
        Assert.Equal(1, audits);

        // The new value is what students are paid.
        using var student = await LoginAs(app, f.Student);
        var result = await Json(await student.PostAsJsonAsync("/api/quizzes/submit", SubmitBody(f)));
        Assert.Equal(35, result.GetProperty("xpBreakdown").GetProperty("passBonus").GetInt32());
    }

    [Fact]
    public async Task FocusSessions_AreCappedPerDayAndInDuration()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        int limit = await WithDb(app, async db =>
            (int)(await db.GamificationRules.SingleAsync(r => r.Key == EduFlow.Core.Constants.GamificationRuleKeys.FocusDailySessionLimit)).Value);
        using var student = await LoginAs(app, f.Student);
        object Body() => new { studentId = Guid.Empty, durationMinutes = 100000, topicOrTask = "Study", focusTechnique = "Pomodoro" };

        for (int i = 0; i < limit; i++)
        {
            Assert.True((await Json(await student.PostAsJsonAsync("/api/gamification/focus-session", Body())))
                .GetProperty("xpAwarded").GetInt32() > 0);
        }
        Assert.Equal(0, (await Json(await student.PostAsJsonAsync("/api/gamification/focus-session", Body())))
            .GetProperty("xpAwarded").GetInt32());

        // 100000 claimed minutes are credited as the configured maximum.
        var maxXp = await WithDb(app, async db => await db.XpTransactions
            .Where(x => x.StudentId == f.Student.Id && x.SourceType == XpSourceType.FocusSession).MaxAsync(x => x.XpAmount));
        Assert.True(maxXp < 1000, $"Focus XP {maxXp} should reflect the capped duration.");
    }

    // =========================================================================
    // Identity and gamification
    // =========================================================================

    [Fact]
    public async Task FocusSession_AwardsXpOnlyToTheAuthenticatedCaller()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var outsider = await LoginAs(app, f.Outsider);

        var response = await outsider.PostAsJsonAsync("/api/gamification/focus-session", new
        {
            studentId = f.Student.Id,
            durationMinutes = 25,
            topicOrTask = "Indexing",
            focusTechnique = "Pomodoro"
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var ledger = await WithDb(app, db => db.XpTransactions.ToListAsync());
        Assert.DoesNotContain(ledger, x => x.StudentId == f.Student.Id);
        Assert.Contains(ledger, x => x.StudentId == f.Outsider.Id);
    }

    [Fact]
    public async Task Challenge_CannotBeCompletedTwiceForXp()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        var challenge = await WithDb(app, async db =>
        {
            var c = new Challenge { CourseId = f.Course.Id, Title = "Daily", XpReward = 100, IsActive = true };
            db.Challenges.Add(c);
            await db.SaveChangesAsync();
            return c;
        });
        using var student = await LoginAs(app, f.Student);
        var body = new { challengeId = challenge.Id, answers = Array.Empty<object>() };

        Assert.Equal(HttpStatusCode.OK, (await student.PostAsJsonAsync($"/api/challenges/{challenge.Id}/submit", body)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await student.PostAsJsonAsync($"/api/challenges/{challenge.Id}/submit", body)).StatusCode);

        Assert.Equal(1, await WithDb(app, db => db.XpTransactions.CountAsync(x => x.SourceId == challenge.Id)));
    }

    [Fact]
    public async Task NewStudentDashboard_ShowsRealEmptyState_AndGrandRewardIsNotClaimable()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var student = await LoginAs(app, f.Student);

        var dashboard = await Json(await student.GetAsync($"/api/gamification/dashboard/{f.Student.Id}"));
        var profile = dashboard.GetProperty("profile");
        Assert.Equal(0, profile.GetProperty("totalXp").GetInt32());
        Assert.Equal(0, profile.GetProperty("coins").GetInt32());
        Assert.Equal(0, profile.GetProperty("currentStreak").GetInt32());
        Assert.Equal(0, profile.GetProperty("recentBadges").GetArrayLength());
        Assert.Equal(0, dashboard.GetProperty("masteryMatrix").GetProperty("skills").GetArrayLength());
        Assert.All(dashboard.GetProperty("dailyMissions").EnumerateArray(),
            m => Assert.False(m.GetProperty("isCompleted").GetBoolean()));
        Assert.False(dashboard.GetProperty("canClaimGrandReward").GetBoolean());

        var ledger = await Json(await student.GetAsync($"/api/gamification/ledger/{f.Student.Id}"));
        Assert.Equal(0, ledger.GetArrayLength());

        var claim = await student.PostAsync($"/api/gamification/missions/claim-grand/{f.Student.Id}", null);
        Assert.Equal(HttpStatusCode.BadRequest, claim.StatusCode);
        Assert.Equal(0, await WithDb(app, db => db.XpTransactions.CountAsync()));
    }

    [Fact]
    public async Task StudentBadgeState_IsNotVisibleToOtherStudents()
    {
        await using var app = await StartApp();
        var f = await SeedCourseWithQuiz(app);
        using var outsider = await LoginAs(app, f.Outsider);

        Assert.Equal(HttpStatusCode.Forbidden,
            (await outsider.GetAsync($"/api/gamification/badges?studentId={f.Student.Id}")).StatusCode);
    }
}
