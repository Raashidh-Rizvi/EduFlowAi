using System.Net;
using System.Security.Claims;
using System.Text.Json;
using EduFlow.Api.Controllers;
using EduFlow.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace EduFlow.Tests;

public class LearningAgentGatewayTests
{
    private sealed class StubHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => send(request);
    }

    private static AiGatewayClient Gateway(Func<HttpRequestMessage, Task<HttpResponseMessage>> send)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AiService:BaseUrl"] = "http://python.test:8888"
        }).Build();
        return new AiGatewayClient(new HttpClient(new StubHandler(send)), config);
    }

    private static AiReviewController Controller(AiGatewayClient gateway, Guid? userId = null)
    {
        var claims = userId.HasValue
            ? new[] { new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()) }
            : Array.Empty<Claim>();
        return new AiReviewController(null!, gateway, NullLogger<AiReviewController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test")) }
            }
        };
    }

    [Theory]
    [InlineData(200)]
    [InlineData(404)]
    [InlineData(422)]
    [InlineData(503)]
    public async Task Learn_PreservesPythonStatusAndBody_AndUsesAuthenticatedIdentity(int status)
    {
        var userId = Guid.NewGuid();
        const string body = "{\"detail\":\"upstream result\"}";
        var gateway = Gateway(async req =>
        {
            Assert.Equal("/api/v1/agent/learn", req.RequestUri!.AbsolutePath);
            Assert.Equal(HttpMethod.Post, req.Method);
            using var json = JsonDocument.Parse(await req.Content!.ReadAsStringAsync());
            Assert.Equal(userId.ToString(), json.RootElement.GetProperty("student_id").GetString());
            Assert.Equal("session-a", json.RootElement.GetProperty("session_id").GetString());
            Assert.Equal("lecture.pdf", json.RootElement.GetProperty("source_file").GetString());
            return new HttpResponseMessage((HttpStatusCode)status) { Content = new StringContent(body) };
        });
        var response = Assert.IsType<ContentResult>(await Controller(gateway, userId).Learn(
            new LearningAgentApiRequest("spoofed-student", "course-a", "lecture.pdf", "plan", "session-a")));
        Assert.Equal(status, response.StatusCode);
        Assert.Equal(body, response.Content);
    }

    [Fact]
    public async Task Coach_ForwardsSession_AndUsesAuthenticatedIdentity()
    {
        var userId = Guid.NewGuid();
        var gateway = Gateway(async req =>
        {
            Assert.Equal("/ai-coach-chat", req.RequestUri!.AbsolutePath);
            using var json = JsonDocument.Parse(await req.Content!.ReadAsStringAsync());
            Assert.Equal(userId.ToString(), json.RootElement.GetProperty("student_id").GetString());
            Assert.Equal("session-a", json.RootElement.GetProperty("session_id").GetString());
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"reply\":\"answer\"}") };
        });
        Assert.IsType<ContentResult>(await Controller(gateway, userId).ChatWithCoach(
            new CoachChatApiRequest("spoofed-student", "course-a", "question", "lecture.pdf", "session-a")));
    }

    [Fact]
    public async Task Learn_WithoutTrustedIdentity_IsRejectedBeforeCallingPython()
    {
        var called = false;
        var gateway = Gateway(_ => { called = true; throw new Exception("Must not reach Python"); });
        Assert.IsType<UnauthorizedResult>(await Controller(gateway).Learn(
            new LearningAgentApiRequest("student-a", "course-a", "lecture.pdf", "plan", "session-a")));
        Assert.False(called);
    }

    [Fact]
    public async Task LectureDiscovery_IsProxiedThroughTheGateway()
    {
        var gateway = Gateway(req =>
        {
            Assert.Equal(HttpMethod.Get, req.Method);
            Assert.Equal("/api/v1/rag/slide-decks", req.RequestUri!.AbsolutePath);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"slide_decks\":[]}") });
        });
        var response = Assert.IsType<ContentResult>(await Controller(gateway, Guid.NewGuid()).GetLearningSlideDecks());
        Assert.Equal(200, response.StatusCode);
        Assert.Equal("{\"slide_decks\":[]}", response.Content);
    }

    [Fact]
    public async Task LearningNetworkFailure_Returns503WithoutFakeContent()
    {
        var response = await Gateway(_ => throw new HttpRequestException("offline")).LearnAsync(new { });
        Assert.Equal(503, response.StatusCode);
        Assert.Contains("unavailable", response.Body);
    }

    [Fact]
    public async Task RagChat_PreservesModuleScopeAndCitationResponse()
    {
        const string body = "{\"answer\":\"Slide 2\",\"citations\":[{\"page_number\":2}]}";
        var userId = Guid.NewGuid();
        var gateway = Gateway(async req =>
        {
            Assert.Equal("/api/v1/rag/chat", req.RequestUri!.AbsolutePath);
            using var json = JsonDocument.Parse(await req.Content!.ReadAsStringAsync());
            Assert.Equal("module-a", json.RootElement.GetProperty("module_id").GetString());
            Assert.Equal(2, json.RootElement.GetProperty("max_citations").GetInt32());
            Assert.Equal(userId.ToString(), json.RootElement.GetProperty("student_id").GetString());
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) };
        });
        var result = Assert.IsType<ContentResult>(await Controller(gateway, userId).RagChat(
            new RagChatApiRequest("question", "course-a", "module-a", "lecture.pdf", 2)));
        Assert.Equal(body, result.Content);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task LearningTimeout_Returns504WithoutFakeContent()
    {
        var response = await Gateway(_ => throw new TaskCanceledException()).LearnAsync(new { });
        Assert.Equal(504, response.StatusCode);
        Assert.Contains("retry", response.Body);
    }

    [Theory]
    [InlineData(200, "{\"reply\":\"Actual slide text\",\"source\":\"extractive_rag\",\"citations\":[{\"page_number\":2}]}")]
    [InlineData(503, "{\"detail\":\"Retrieval unavailable\"}")]
    public async Task Coach_PreservesExtractiveAnswersAndUpstreamErrors(int status, string body)
    {
        var gateway = Gateway(_ => Task.FromResult(new HttpResponseMessage((HttpStatusCode)status)
        { Content = new StringContent(body) }));
        var response = Assert.IsType<ContentResult>(await Controller(gateway, Guid.NewGuid()).ChatWithCoach(
            new CoachChatApiRequest(null, "course-a", "question", "lecture.pdf", "session-a")));
        Assert.Equal(status, response.StatusCode);
        Assert.Equal(body, response.Content);
    }

    // -------------------------------------------------------------------------
    // Single-question regeneration must never substitute a canned question:
    // upstream failures are passed through as errors so the controller leaves
    // the instructor's original question untouched (LMS refactor PR 7).
    // -------------------------------------------------------------------------

    [Theory]
    [InlineData(404, "{\"detail\":\"Not Found\"}")]
    [InlineData(422, "{\"detail\":\"No course material available\"}")]
    [InlineData(502, "{\"detail\":\"AI quiz output failed validation\"}")]
    [InlineData(503, "{\"detail\":\"GEMINI_API_KEY is not configured\"}")]
    public async Task RegenerateQuestion_UpstreamErrors_PassthroughInsteadOfCannedQuestion(int status, string body)
    {
        var gateway = Gateway(req =>
        {
            Assert.Equal(HttpMethod.Post, req.Method);
            var expected = $"/api/v1/ai/questions/{_regenerateQuestionId}/regenerate";
            Assert.Equal(expected, req.RequestUri!.AbsolutePath);
            return Task.FromResult(new HttpResponseMessage((HttpStatusCode)status) { Content = new StringContent(body) });
        });

        var response = await gateway.RegenerateQuestionAsync(_regenerateQuestionId.ToString(), new { focus_topic = "Indexes" });
        using var json = JsonDocument.Parse(response);
        var root = json.RootElement;

        Assert.Equal("error", root.GetProperty("status").GetString());
        Assert.Equal(status, root.GetProperty("status_code").GetInt32());
        Assert.False(root.TryGetProperty("question", out _),
            "An error response must never carry a canned 'question' payload.");
        // The upstream reason must reach the caller (parsed from the structured
        // envelope), but the raw JSON body is not forwarded verbatim.
        using var upstream = JsonDocument.Parse(body);
        var reason = upstream.RootElement.GetProperty("detail").GetString()!;
        Assert.Contains(reason, root.GetProperty("message").GetString());
        Assert.DoesNotContain(body, root.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RegenerateQuestion_NetworkFailure_ReportsErrorWithoutFakeQuestion()
    {
        var gateway = Gateway(_ => throw new HttpRequestException("offline"));
        var response = await gateway.RegenerateQuestionAsync(_regenerateQuestionId.ToString(), new { });
        using var json = JsonDocument.Parse(response);
        var root = json.RootElement;

        Assert.Equal("error", root.GetProperty("status").GetString());
        Assert.Equal(503, root.GetProperty("status_code").GetInt32());
        Assert.False(root.TryGetProperty("question", out _));
        Assert.Contains("Unable to connect", root.GetProperty("message").GetString());
    }

    [Fact]
    public async Task RegenerateQuestion_Success_ReturnsPythonBodyUnchanged()
    {
        const string body = "{\"question\":{\"question_text\":\"Grounded?\",\"question_type\":\"MULTIPLE_CHOICE\",\"options\":[\"A\",\"B\"],\"correct_answer\":\"A\",\"explanation\":\"Slide 2\"},\"validation_passed\":true,\"source\":\"gemini\"}";
        var gateway = Gateway(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) }));
        var response = await gateway.RegenerateQuestionAsync(_regenerateQuestionId.ToString(), new { focus_topic = "Indexes" });
        Assert.Equal(body, response);
    }

    private static readonly Guid _regenerateQuestionId = Guid.NewGuid();
}
