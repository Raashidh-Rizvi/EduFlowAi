using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EduFlow.Api.Filters;

/// <summary>
/// Guards service-to-service-only routes (e.g. <see cref="Controllers.InternalAiToolsController"/>)
/// with a shared-secret header check, instead of the JWT bearer scheme used for user-facing routes.
///
/// The Python ai-agent enforces the same shared secret ("AiService:ApiKey" here,
/// "INTERNAL_SERVICE_TOKEN" env var on the Python side) on its own routes.
///
/// - The expected secret is read from configuration key "AiService:ApiKey" on every request (not
///   cached at startup), so a rotated secret is picked up without a process restart.
/// - Fail-closed: when the secret is not configured, requests are rejected with 503. The only
///   exception is the Development environment with "AiService:AllowUnauthenticatedInternalCalls"
///   explicitly set to true.
/// - When configured, the incoming "X-Internal-Api-Key" header must match it (constant-time
///   comparison), otherwise the request is short-circuited with 401 Unauthorized.
///
/// Applied via [TypeFilter(typeof(InternalServiceAuthFilter))] on the controller (not [ServiceFilter]),
/// so no DI registration in Program.cs is required.
/// </summary>
public class InternalServiceAuthFilter : IAsyncActionFilter
{
    private const string InternalApiKeyHeaderName = "X-Internal-Api-Key";

    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<InternalServiceAuthFilter> _logger;

    public InternalServiceAuthFilter(IConfiguration configuration, IHostEnvironment environment, ILogger<InternalServiceAuthFilter> logger)
    {
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var expectedKey = _configuration["AiService:ApiKey"];

        if (string.IsNullOrEmpty(expectedKey))
        {
            if (_environment.IsDevelopment() && _configuration.GetValue<bool>("AiService:AllowUnauthenticatedInternalCalls"))
            {
                _logger.LogWarning(
                    "AiService:ApiKey is not configured and AllowUnauthenticatedInternalCalls is enabled -- " +
                    "internal service authentication is NOT enforced for {Path} (Development only).",
                    context.HttpContext.Request.Path);
                await next();
                return;
            }

            _logger.LogError(
                "AiService:ApiKey is not configured -- rejecting internal call to {Path}. Set AiService__ApiKey " +
                "(environment variable) or AiService:ApiKey (user-secrets).",
                context.HttpContext.Request.Path);
            context.Result = new ObjectResult(new
            {
                success = false,
                message = "Internal service authentication is not configured.",
                code = "INTERNAL_AUTH_NOT_CONFIGURED",
                traceId = context.HttpContext.TraceIdentifier
            })
            { StatusCode = StatusCodes.Status503ServiceUnavailable };
            return;
        }

        var providedKey = context.HttpContext.Request.Headers[InternalApiKeyHeaderName].ToString();

        if (!KeysMatch(providedKey, expectedKey))
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                success = false,
                message = "Invalid or missing internal service token.",
                code = "INTERNAL_AUTH_FAILED",
                traceId = context.HttpContext.TraceIdentifier
            });
            return;
        }

        await next();
    }

    internal static bool KeysMatch(string? provided, string expected)
    {
        if (string.IsNullOrEmpty(provided)) return false;
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(provided),
            Encoding.UTF8.GetBytes(expected));
    }
}
