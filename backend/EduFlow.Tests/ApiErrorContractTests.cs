using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Api.Errors;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Verifies the shared error contract wired by <see cref="ApiErrorHandling"/>:
/// {success:false, message, code, errors, traceId}, the X-Correlation-ID round trip,
/// and that exception details never reach the client.
/// </summary>
public class ApiErrorContractTests
{
    internal const string SecretExceptionText = "Npgsql connection to db.internal:5432 failed at C:\\srv\\EduFlow\\Secret.cs";

    private static async Task<WebApplication> StartHostAsync(string environment)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = environment,
            ContentRootPath = System.IO.Path.GetTempPath()
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Logging.ClearProviders();

        builder.Services.AddAuthentication("ErrorContractTest")
            .AddScheme<AuthenticationSchemeOptions, HeaderAuthHandler>("ErrorContractTest", _ => { });
        builder.Services.AddAuthorization(EduFlow.Api.Security.AuthorizationPolicies.Configure);
        builder.Services.AddControllers()
            .AddApplicationPart(typeof(ApiErrorContractTests).Assembly)
            .ConfigureApiBehaviorOptions(ApiErrorHandling.ConfigureInvalidModelState);

        var app = builder.Build();
        app.UseApiErrorHandling();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        await app.StartAsync();
        return app;
    }

    private static HttpClient Client(WebApplication app, bool authenticated = true)
    {
        var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
        var client = new HttpClient { BaseAddress = new Uri(addresses.Addresses.Single()) };
        if (authenticated) client.DefaultRequestHeaders.Add("X-Test-User", Guid.NewGuid().ToString());
        return client;
    }

    private static void AssertContract(JsonElement body, string expectedCode, string traceHeader)
    {
        Assert.False(body.GetProperty("success").GetBoolean());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("message").GetString()));
        Assert.Equal(expectedCode, body.GetProperty("code").GetString());
        Assert.True(body.TryGetProperty("errors", out _));
        Assert.Equal(traceHeader, body.GetProperty("traceId").GetString());
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Production")]
    public async Task UnhandledException_Returns500Contract_WithoutExceptionDetails(string environment)
    {
        await using var app = await StartHostAsync(environment);
        using var client = Client(app);

        var response = await client.GetAsync("/api/error-contract-test/throw");
        var raw = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.DoesNotContain("Npgsql", raw);
        Assert.DoesNotContain("Secret.cs", raw);
        Assert.DoesNotContain("InvalidOperationException", raw);
        Assert.DoesNotContain("   at ", raw);

        var traceHeader = response.Headers.GetValues(ApiErrorHandling.CorrelationHeader).Single();
        AssertContract(JsonDocument.Parse(raw).RootElement, "INTERNAL_ERROR", traceHeader);
    }

    [Fact]
    public async Task AnonymousRequest_ToProtectedRoute_Returns401Contract()
    {
        await using var app = await StartHostAsync("Production");
        using var client = Client(app, authenticated: false);

        var response = await client.GetAsync("/api/error-contract-test/ok");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var traceHeader = response.Headers.GetValues(ApiErrorHandling.CorrelationHeader).Single();
        AssertContract(await response.Content.ReadFromJsonAsync<JsonElement>(), "UNAUTHENTICATED", traceHeader);
    }

    [Fact]
    public async Task UnknownRoute_Returns404Contract()
    {
        await using var app = await StartHostAsync("Production");
        using var client = Client(app);

        var response = await client.GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var traceHeader = response.Headers.GetValues(ApiErrorHandling.CorrelationHeader).Single();
        AssertContract(await response.Content.ReadFromJsonAsync<JsonElement>(), "NOT_FOUND", traceHeader);
    }

    [Fact]
    public async Task ExplicitErrorBodies_AreNotOverwritten()
    {
        await using var app = await StartHostAsync("Production");
        using var client = Client(app);

        var response = await client.GetAsync("/api/error-contract-test/curated-not-found");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("Quiz not found.", body.GetProperty("message").GetString());
    }

    [Fact]
    public async Task ModelValidationFailure_KeepsProblemDetailsShape_AndAddsContractFields()
    {
        await using var app = await StartHostAsync("Production");
        using var client = Client(app);

        var response = await client.PostAsJsonAsync("/api/error-contract-test/validate", new { name = "" });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(body.TryGetProperty("title", out _));
        Assert.True(body.GetProperty("errors").TryGetProperty("Name", out _));
        Assert.False(body.GetProperty("success").GetBoolean());
        Assert.Equal("VALIDATION_FAILED", body.GetProperty("code").GetString());
        Assert.Equal(response.Headers.GetValues(ApiErrorHandling.CorrelationHeader).Single(),
            body.GetProperty("traceId").GetString());
    }

    [Fact]
    public async Task SafeIncomingCorrelationId_IsEchoed()
    {
        await using var app = await StartHostAsync("Production");
        using var client = Client(app);
        client.DefaultRequestHeaders.Add(ApiErrorHandling.CorrelationHeader, "client-req.42_abc");

        var response = await client.GetAsync("/api/error-contract-test/ok");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("client-req.42_abc", response.Headers.GetValues(ApiErrorHandling.CorrelationHeader).Single());
        Assert.Equal("client-req.42_abc", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("traceId").GetString());
    }

    [Theory]
    [InlineData("bad id with spaces")]
    [InlineData("<script>")]
    [InlineData("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")]
    public async Task UnsafeIncomingCorrelationId_IsReplaced(string incoming)
    {
        await using var app = await StartHostAsync("Production");
        using var client = Client(app);
        client.DefaultRequestHeaders.TryAddWithoutValidation(ApiErrorHandling.CorrelationHeader, incoming);

        var response = await client.GetAsync("/api/error-contract-test/ok");
        var echoed = response.Headers.GetValues(ApiErrorHandling.CorrelationHeader).Single();

        Assert.NotEqual(incoming, echoed);
        Assert.Matches("^[A-Za-z0-9._-]{1,64}$", echoed);
    }

    public sealed class HeaderAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public HeaderAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
            : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var userId = Request.Headers["X-Test-User"].ToString();
            if (string.IsNullOrEmpty(userId)) return Task.FromResult(AuthenticateResult.NoResult());
            var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId) }, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
        }
    }
}

public sealed class ErrorContractValidationRequest
{
    [Required]
    public string? Name { get; set; }
}

[ApiController]
[Route("api/error-contract-test")]
public sealed class ErrorContractTestController : ControllerBase
{
    [HttpGet("throw")]
    public IActionResult Throw() =>
        throw new InvalidOperationException(ApiErrorContractTests.SecretExceptionText);

    [HttpGet("ok")]
    public IActionResult Ok200() => Ok(new { traceId = HttpContext.TraceIdentifier });

    [HttpGet("curated-not-found")]
    public IActionResult CuratedNotFound() => NotFound(new { message = "Quiz not found." });

    [HttpPost("validate")]
    public IActionResult Validate(ErrorContractValidationRequest request) => Ok();
}
