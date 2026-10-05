using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Api.Controllers;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
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
/// HTTP-level tests for the AI quiz generation pipeline hardening:
/// provider validation with stable error codes, the document-processing gate,
/// structured upstream error forwarding with request ids, idempotent generation,
/// and provider/model provenance persisted with the quiz.
/// </summary>
public class AiGenerationPipelineTests
{
    private const string TestPassword = "Password123!";
    private const string JwtSecret = "ai-pipeline-test-secret-at-least-32-chars-long";

    private const string DefaultCatalog =
        """
        {"providers":[
          {"provider":"gemini","label":"Gemini","configured":true,"missing":[],
           "models":["models/gemini-flash-latest"],"defaultModel":"models/gemini-flash-latest","active":true},
          {"provider":"groq","label":"Groq","configured":true,"missing":[],
           "models":["openai/gpt-oss-120b"],"defaultModel":"openai/gpt-oss-120b","active":false},
          {"provider":"azure","label":"Azure OpenAI","configured":false,
           "missing":["AZURE_OPENAI_API_KEY"],"models":[],"defaultModel":null,"active":false}
        ]}
        """;

    private const string SuccessBody =
        """
        {"quiz_id":"q-1","workflow_id":"wf-1","title":"Storage Assessment (Medium)",
         "target_topics":["Indexes"],"difficulty":"Medium","total_points":10,
         "validation_passed":true,"status":"PendingInstructorApproval","source":"groq",
         "model":"openai/gpt-oss-120b",
         "questions":[{"question_id":1,"question_text":"Which index speeds up range scans?",
           "question_type":"MULTIPLE_CHOICE","blooms_taxonomy_level":"Understanding",
           "options":["B-tree","Hash","Heap","Snapshot"],
           "correct_answer":"B-tree",
           "explanation":"B-trees keep keys ordered, which is what range scans need.",
           "marking_scheme":"10 points for B-tree.","learning_objective":null,
           "slide_citation":null,"points":10}]}
        """;

    // -------------------------------------------------------------------------
    // Stub gateway
    // -------------------------------------------------------------------------

    private sealed class StubAiGateway : IAiGatewayClient
    {
        public int ProvidersStatus { get; set; } = 200;
        public string ProvidersJson { get; set; } = DefaultCatalog;
        public Func<string, AiProxyResponse>? DocumentStatusHandler { get; set; }
        public Func<object, string?, string>? GenerateHandler { get; set; }
        public List<object> GeneratedPayloads { get; } = new();
        public List<object> IndexCalls { get; } = new();
        public SemaphoreSlim GenerateEntered { get; } = new(0);
        public TaskCompletionSource? GenerateGate { get; set; }

        public Task<AiProxyResponse> GetAiProvidersAsync(CancellationToken ct = default)
            => Task.FromResult(new AiProxyResponse(ProvidersStatus, ProvidersJson));

        public Task<AiProxyResponse> GetDocumentStatusAsync(string fileName, CancellationToken ct = default)
            => Task.FromResult(DocumentStatusHandler?.Invoke(fileName)
                ?? new AiProxyResponse(200, "{\"state\":\"READY\"}"));

        public Task<AiProxyResponse> IndexDocumentAsync(object requestPayload, CancellationToken ct = default)
        {
            lock (IndexCalls) IndexCalls.Add(requestPayload);
            return Task.FromResult(new AiProxyResponse(200, "{\"status\":\"success\",\"chunks_indexed\":3}"));
        }

        public async Task<string> GenerateQuizAsync(object requestPayload, CancellationToken ct = default, string? requestId = null)
        {
            lock (GeneratedPayloads) GeneratedPayloads.Add(requestPayload);
            GenerateEntered.Release();
            if (GenerateGate != null)
            {
                await GenerateGate.Task.WaitAsync(TimeSpan.FromSeconds(15));
            }
            return GenerateHandler != null
                ? GenerateHandler(requestPayload, requestId)
                : SuccessBody;
        }

        public Task<string> RegenerateQuestionAsync(string questionId, object requestPayload, CancellationToken ct = default, string? requestId = null)
            => Task.FromResult("{\"question\":{\"question_text\":\"Q?\",\"question_type\":\"MULTIPLE_CHOICE\",\"options\":[\"A\",\"B\"],\"correct_answer\":\"A\",\"explanation\":\"e\",\"blooms_taxonomy_level\":\"Applying\"},\"source\":\"groq\"}");

        public Task<string> GetAiStatusAsync(CancellationToken ct = default)
            => Task.FromResult("{\"status\":\"healthy\",\"can_generate\":true}");
        public Task<AiProxyResponse> LearnAsync(object requestPayload, CancellationToken ct = default)
            => Task.FromResult(new AiProxyResponse(501, "{}"));
        public Task<AiProxyResponse> RagChatAsync(object requestPayload, CancellationToken ct = default)
            => Task.FromResult(new AiProxyResponse(501, "{}"));
        public Task<AiProxyResponse> GetLearningSlideDecksAsync(CancellationToken ct = default)
            => Task.FromResult(new AiProxyResponse(200, "{\"slide_decks\":[]}"));
        public Task<string> OrchestrateStudyPlanAsync(object requestPayload, CancellationToken ct = default)
            => Task.FromResult("{}");
        public Task<string> GenerateAdaptiveChallengeAsync(object requestPayload, CancellationToken ct = default)
            => Task.FromResult("{}");
        public Task<string> AnalyzeRetentionAsync(object requestPayload, CancellationToken ct = default)
            => Task.FromResult("{}");
        public Task<AiProxyResponse> ChatWithCoachAsync(object requestPayload, CancellationToken ct = default)
            => Task.FromResult(new AiProxyResponse(501, "{}"));
        public Task<string> GetAgentsTopologyAsync(CancellationToken ct = default)
            => Task.FromResult("{}");
        public Task<string> ExecuteWorkflowAsync(object requestPayload, CancellationToken ct = default)
            => Task.FromResult("{}");
        public Task<string> SubmitWorkflowDecisionAsync(string workflowId, object requestPayload, CancellationToken ct = default)
            => Task.FromResult("{}");
        public Task<string> GetToolRegistryAsync(CancellationToken ct = default)
            => Task.FromResult("{}");
        public Task<string> GetObservabilityMetricsAsync(CancellationToken ct = default)
            => Task.FromResult("{}");
        public Task<string> CategorizeSlideTopicsAsync(object requestPayload, CancellationToken ct = default)
            => Task.FromResult("{}");
        public Task<string> GenerateSlideRAGQuizAsync(object requestPayload, CancellationToken ct = default)
            => Task.FromResult("{}");
        public Task<string> AutoGradeQuizSubmissionAsync(object requestPayload, CancellationToken ct = default)
            => Task.FromResult("{}");
    }

    // -------------------------------------------------------------------------
    // Test host
    // -------------------------------------------------------------------------

    private static async Task<(WebApplication App, StubAiGateway Gateway)> StartApp()
    {
        var gateway = new StubAiGateway();
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = "Testing",
            ContentRootPath = Path.GetTempPath()
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JwtSettings:Secret"] = JwtSecret,
            ["JwtSettings:Issuer"] = "EduFlowAPI",
            ["JwtSettings:Audience"] = "EduFlowClients",
            ["JwtSettings:ExpiryMinutes"] = "15"
        });

        var databaseName = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseInMemoryDatabase(databaseName));
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddLmsDomainServices();
        builder.Services.AddSingleton<IAiGatewayClient>(gateway);
        builder.Services.AddHttpClient();

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
            scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Database.EnsureCreated();
        }
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync();
        return (app, gateway);
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

    private static Task<User> SeedInstructor(WebApplication app, string name = "AI Pipeline Instructor") => WithDb(app, async db =>
    {
        var user = new User
        {
            FullName = name,
            Email = $"{name.Replace(" ", ".").ToLowerInvariant()}-{Guid.NewGuid().ToString("N")[..8]}@eduflow.test",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword, workFactor: 4),
            Role = UserRole.Instructor,
            IsActive = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    });

    private static async Task<(Course Course, Module Module)> SeedCourseWithModule(WebApplication app, User instructor, string? pdfUrl = null)
        => await WithDb(app, async db =>
        {
            var course = new Course
            {
                Code = $"AI-{Guid.NewGuid().ToString("N")[..6]}",
                Title = "AI Pipeline Course",
                InstructorId = instructor.Id,
                IsFree = true
            };
            var module = new Module { Course = course, Title = "Storage Module", OrderIndex = 1, PdfUrl = pdfUrl };
            db.Modules.Add(module);
            await db.SaveChangesAsync();
            return (course, module);
        });

    private static object GenerateBody(Course course, Module module, string? provider = null, string? model = null, bool autoPublish = false) => new
    {
        courseId = course.Id,
        topic = "Index Optimization",
        difficulty = "Medium",
        questionCount = 3,
        // The API binds enums as numbers (no string-enum converter registered).
        scopeType = (int)QuizScopeType.Module,
        scopeId = module.Id,
        moduleId = module.Id,
        provider,
        model,
        // Explicit here so this suite tests the draft path on purpose; the API
        // default (auto-publish) is covered by its own test below.
        autoPublish
    };

    /// <summary>Leaves <c>autoPublish</c> out of the payload so the API default applies.</summary>
    private static object GenerateBodyWithApiDefaults(Course course, Module module, string? provider = null) => new
    {
        courseId = course.Id,
        topic = "Index Optimization",
        difficulty = "Medium",
        questionCount = 3,
        scopeType = (int)QuizScopeType.Module,
        scopeId = module.Id,
        moduleId = module.Id,
        provider,
        model = (string?)null
    };

    private static async Task<JsonElement> Json(HttpResponseMessage response)
        => JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    /// <summary>Creates the document under every possible webroot the test host may resolve.</summary>
    private static string SeedDocumentFile(string relativeUrl)
    {
        var roots = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "wwwroot"),
            Path.Combine(Path.GetTempPath(), "wwwroot")
        };
        foreach (var root in roots)
        {
            var full = Path.GetFullPath(Path.Combine(root, relativeUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar)));
            Directory.CreateDirectory(Path.GetDirectoryName(full)!);
            File.WriteAllText(full, "%PDF-1.4 test stub");
        }
        return relativeUrl;
    }

    // =========================================================================
    // Provider validation
    // =========================================================================

    [Fact]
    public async Task UnknownProvider_ReturnsStableNotConfiguredError()
    {
        var (app, _) = await StartApp();
        await using var _ = app;
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module, provider: "llama-local"));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("AI_PROVIDER_NOT_CONFIGURED", body.GetProperty("code").GetString());
        Assert.Contains("llama-local", body.GetProperty("message").GetString());
        Assert.Contains("Supported providers", body.GetProperty("details").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("traceId").GetString()));
    }

    [Fact]
    public async Task UnconfiguredProvider_NamesRequiredVariable_WithoutAnySecret()
    {
        var (app, _) = await StartApp();
        await using var _ = app;
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module, provider: "azure"));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var raw = await response.Content.ReadAsStringAsync();
        var body = JsonDocument.Parse(raw).RootElement;
        Assert.Equal("AI_PROVIDER_NOT_CONFIGURED", body.GetProperty("code").GetString());
        Assert.Contains("AZURE_OPENAI_API_KEY", body.GetProperty("message").GetString());
        // The message names the variable; it must never contain a credential value.
        Assert.DoesNotContain("Bearer", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("sk-", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ModelOutsideAllowlist_ReturnsAiModelNotFound()
    {
        var (app, _) = await StartApp();
        await using var _ = app;
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module, provider: "groq", model: "gpt-9000"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("AI_MODEL_NOT_FOUND", body.GetProperty("code").GetString());
        Assert.Contains("gpt-9000", body.GetProperty("message").GetString());
        Assert.Contains("openai/gpt-oss-120b", body.GetProperty("details").GetString());
    }

    [Fact]
    public async Task ProviderCatalogUnreachable_ReturnsProviderUnavailable_WithoutStackTrace()
    {
        var (app, gateway) = await StartApp();
        await using var _ = app;
        gateway.ProvidersStatus = 503;
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module));

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var raw = await response.Content.ReadAsStringAsync();
        var body = JsonDocument.Parse(raw).RootElement;
        Assert.Equal("AI_PROVIDER_UNAVAILABLE", body.GetProperty("code").GetString());
        Assert.DoesNotContain("Exception", raw);
        Assert.DoesNotContain("   at ", raw);
    }

    // =========================================================================
    // Document-processing gate
    // =========================================================================

    [Fact]
    public async Task DocumentStillProcessing_Returns409DocumentNotProcessed()
    {
        var (app, gateway) = await StartApp();
        await using var _ = app;
        var url = SeedDocumentFile($"uploads/pdfs/processing-{Guid.NewGuid():N}.pdf");
        gateway.DocumentStatusHandler = _ => new AiProxyResponse(200, "{\"state\":\"PROCESSING\"}");
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor, url);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("DOCUMENT_NOT_PROCESSED", body.GetProperty("code").GetString());
        Assert.Contains("still being prepared", body.GetProperty("message").GetString());
        // The LLM was never called.
        Assert.Empty(gateway.GeneratedPayloads);
    }

    [Fact]
    public async Task DocumentIndexingFailed_RetriesIndexing_AndGenerationProceeds()
    {
        // A FAILED status only means background RAG indexing failed; it must not block
        // later generations from the same PDF (the agent parses the file synchronously).
        var (app, gateway) = await StartApp();
        await using var _ = app;
        var url = SeedDocumentFile($"uploads/pdfs/failed-{Guid.NewGuid():N}.pdf");
        gateway.DocumentStatusHandler = _ => new AiProxyResponse(200,
            "{\"state\":\"FAILED\",\"error\":\"ValueError: no text\"}");
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor, url);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var raw = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("ValueError", raw);
        Assert.NotEmpty(gateway.GeneratedPayloads);

        var deadline = DateTime.UtcNow.AddSeconds(10);
        while (DateTime.UtcNow < deadline)
        {
            lock (gateway.IndexCalls)
            {
                if (gateway.IndexCalls.Count > 0) break;
            }
            await Task.Delay(50);
        }
        lock (gateway.IndexCalls)
        {
            Assert.NotEmpty(gateway.IndexCalls);
        }
    }

    [Fact]
    public async Task UploadedDocument_TriggersBackgroundIndexing_AndGenerationProceeds()
    {
        var (app, gateway) = await StartApp();
        await using var _ = app;
        var fileName = $"uploaded-{Guid.NewGuid():N}.pdf";
        var url = SeedDocumentFile($"uploads/pdfs/{fileName}");
        gateway.DocumentStatusHandler = _ => new AiProxyResponse(200, "{\"state\":\"UPLOADED\"}");
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor, url);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Background indexing is scheduled for a never-indexed document.
        var deadline = DateTime.UtcNow.AddSeconds(10);
        while (DateTime.UtcNow < deadline)
        {
            lock (gateway.IndexCalls)
            {
                if (gateway.IndexCalls.Count > 0) break;
            }
            await Task.Delay(50);
        }
        lock (gateway.IndexCalls)
        {
            Assert.NotEmpty(gateway.IndexCalls);
        }
    }

    // =========================================================================
    // Structured upstream errors + request correlation
    // =========================================================================

    [Fact]
    public async Task UpstreamRateLimit_ForwardsCodeStatusAndRequestIds()
    {
        var (app, gateway) = await StartApp();
        await using var _ = app;
        gateway.GenerateHandler = (_, _) => """
            {"status":"error","status_code":429,"code":"AI_RATE_LIMITED",
             "message":"The Groq quota for this API key has been used up. Wait a few minutes and try again.",
             "detail":"The Groq quota for this API key has been used up. Wait a few minutes and try again.",
             "details":null,"requestId":"py-req-42"}
            """;
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module));

        Assert.Equal((HttpStatusCode)429, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("AI_RATE_LIMITED", body.GetProperty("code").GetString());
        Assert.Equal("py-req-42", body.GetProperty("requestId").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("traceId").GetString()));
        // No quiz was persisted on failure.
        Assert.Equal(0, await WithDb(app, db => db.Assessments.CountAsync()));
    }

    [Fact]
    public async Task UpstreamHtmlErrorBody_NeverLeaksRawContent()
    {
        var (app, gateway) = await StartApp();
        await using var _ = app;
        gateway.GenerateHandler = (_, _) => "<html><body>502 Bad Gateway nginx</body></html>";
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module));

        var raw = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("nginx", raw);
        var body = JsonDocument.Parse(raw).RootElement;
        Assert.Equal("AI_GENERATION_FAILED", body.GetProperty("code").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("message").GetString()));
    }

    // =========================================================================
    // Success path: provenance, truthful metadata, idempotency
    // =========================================================================

    [Fact]
    public async Task SuccessfulGeneration_PersistsProviderAndModel_AndRequestsSelectedProvider()
    {
        var (app, gateway) = await StartApp();
        await using var _ = app;
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module, provider: "groq"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await Json(response);
        Assert.Equal((int)QuizStatus.Draft, result.GetProperty("status").GetInt32());

        var quizId = result.GetProperty("id").GetGuid();
        var persisted = await WithDb(app, db => db.Assessments.AsNoTracking().FirstAsync(a => a.Id == quizId));
        Assert.True(persisted.GeneratedByAI);
        Assert.Equal("groq", persisted.AiProvider);
        Assert.Equal("openai/gpt-oss-120b", persisted.AiModel);
        Assert.DoesNotContain("LangGraph", persisted.Description, StringComparison.OrdinalIgnoreCase);

        // The gateway payload carried the validated provider selection.
        Assert.Single(gateway.GeneratedPayloads);
        var payloadJson = JsonSerializer.Serialize(gateway.GeneratedPayloads[0]);
        using var payload = JsonDocument.Parse(payloadJson);
        Assert.Equal("groq", payload.RootElement.GetProperty("provider").GetString());
    }

    [Fact]
    public async Task GeneratedQuiz_IsAutoPublishedByDefault_SoStudentsCanTakeItImmediately()
    {
        var (app, gateway) = await StartApp();
        await using var _ = app;
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBodyWithApiDefaults(course, module, provider: "groq"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await Json(response);
        Assert.Equal((int)QuizStatus.Published, result.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task NullCorrectIndexAndNullOptions_KeepTheRestOfTheBatch()
    {
        // LLM output regularly carries explicit JSON nulls for fields that do not
        // apply ("correct_index": null on a fill-in-the-blank question). Those
        // must not throw and discard an otherwise valid batch.
        var (app, gateway) = await StartApp();
        await using var _ = app;
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        gateway.GenerateHandler = (_, _) => """
        {"quiz_id":"q-2","title":"Null Field Assessment (Medium)","difficulty":"Medium",
         "total_points":20,"validation_passed":true,"source":"groq",
         "questions":[
           {"question_id":1,"question_text":"Fill the blank: BFS uses a ____ queue.",
            "question_type":"FILL_IN_BLANK","options":null,"correct_index":null,"points":null,
            "correct_answer":"FIFO","explanation":"BFS pops the oldest node first.",
            "marking_scheme":"Accept FIFO.","slide_citation":null},
           {"question_id":2,"question_text":"Which structure guarantees the shallowest solution?",
            "question_type":"MULTIPLE_CHOICE","options":["DFS","BFS","Random walk"],
            "correct_index":1,"points":10,"correct_answer":"BFS",
            "explanation":"BFS expands by depth.","marking_scheme":"BFS.","slide_citation":null}
         ]}
        """;

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module, provider: "groq"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await Json(response);
        var quizId = result.GetProperty("id").GetGuid();
        var persisted = await WithDb(app, db => db.Assessments
            .AsNoTracking().Include(a => a.Questions).FirstAsync(a => a.Id == quizId));

        // The null-field question and the healthy one both survive.
        Assert.Equal(2, persisted.Questions.Count);
        Assert.Contains(persisted.Questions, q => q.Type == QuestionType.FillInBlank);
        Assert.Contains(persisted.Questions, q => q.Type == QuestionType.MultipleChoice);
        Assert.Equal(10, persisted.Questions.Single(q => q.Type == QuestionType.MultipleChoice).Points);
    }

    [Fact]
    public async Task QuestionWithoutText_IsSkipped_WithoutFailingTheWholeQuiz()
    {
        var (app, gateway) = await StartApp();
        await using var _ = app;
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        gateway.GenerateHandler = (_, _) => """
        {"quiz_id":"q-3","title":"Partial Assessment (Medium)","difficulty":"Medium",
         "total_points":10,"validation_passed":true,"source":"groq",
         "questions":[
           {"question_id":1,"question_text":null,"question_type":"MULTIPLE_CHOICE"},
           {"question_id":2,"question_text":"Which is a B-tree property?",
            "question_type":"MULTIPLE_CHOICE","options":["Ordered keys","Random order"],
            "correct_index":0,"points":10,"correct_answer":"Ordered keys",
            "explanation":"B-trees keep keys sorted.","marking_scheme":"Ordered keys.","slide_citation":null}
         ]}
        """;

        var response = await client.PostAsJsonAsync("/api/quizzes/generate-ai",
            GenerateBody(course, module, provider: "groq"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await Json(response);
        var quizId = result.GetProperty("id").GetGuid();
        var persisted = await WithDb(app, db => db.Assessments
            .AsNoTracking().Include(a => a.Questions).FirstAsync(a => a.Id == quizId));

        Assert.Single(persisted.Questions);
        Assert.Equal("Which is a B-tree property?", persisted.Questions.Single().Prompt);
    }

    [Fact]
    public async Task DuplicateSubmission_IsRejectedWhileGenerationIsInFlight()
    {
        var (app, gateway) = await StartApp();
        await using var _ = app;
        gateway.GenerateGate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var instructor = await SeedInstructor(app);
        var (course, module) = await SeedCourseWithModule(app, instructor);
        using var client = await LoginAs(app, instructor);

        var firstTask = client.PostAsJsonAsync("/api/quizzes/generate-ai", GenerateBody(course, module));
        // Wait until the first request is actually inside the LLM call.
        var entered = await gateway.GenerateEntered.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.True(entered);

        var second = await client.PostAsJsonAsync("/api/quizzes/generate-ai", GenerateBody(course, module));
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        var body = await Json(second);
        Assert.Equal("AI_GENERATION_IN_PROGRESS", body.GetProperty("code").GetString());

        gateway.GenerateGate.SetResult();
        var first = await firstTask;
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        // The lock is released afterwards: a later request runs normally.
        var third = await client.PostAsJsonAsync("/api/quizzes/generate-ai", GenerateBody(course, module));
        Assert.Equal(HttpStatusCode.OK, third.StatusCode);
        Assert.Equal(2, await WithDb(app, db => db.Assessments.CountAsync()));
    }

    // =========================================================================
    // /api/ai/providers endpoint
    // =========================================================================

    [Fact]
    public async Task ProvidersEndpoint_ReturnsCatalogToInstructors_AndHidesItFromStudents()
    {
        var (app, gateway) = await StartApp();
        await using var _ = app;
        gateway.ProvidersJson = DefaultCatalog;
        var instructor = await SeedInstructor(app, "Catalog Instructor");
        await SeedCourseWithModule(app, instructor);

        using var instructorClient = await LoginAs(app, instructor);
        var ok = await instructorClient.GetAsync("/api/ai/providers");
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var raw = await ok.Content.ReadAsStringAsync();
        Assert.Contains("\"groq\"", raw);
        Assert.Contains("\"configured\"", raw);

        // A student may not enumerate provider configuration.
        var student = await WithDb(app, async db =>
        {
            var u = new User
            {
                FullName = "Catalog Student",
                Email = $"catalog.student-{Guid.NewGuid().ToString("N")[..8]}@eduflow.test",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword, workFactor: 4),
                Role = UserRole.Student,
                IsActive = true
            };
            db.Users.Add(u);
            await db.SaveChangesAsync();
            return u;
        });
        using var studentClient = await LoginAs(app, student);
        Assert.Equal(HttpStatusCode.Forbidden, (await studentClient.GetAsync("/api/ai/providers")).StatusCode);
    }
}
