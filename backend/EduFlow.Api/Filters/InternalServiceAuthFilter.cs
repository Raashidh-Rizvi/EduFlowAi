using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EduFlow.Api.Filters;

/// <summary>
/// Guards service-to-service-only routes (e.g. <see cref="Controllers.InternalAiToolsController"/>)
/// with a shared-secret header check, instead of the JWT bearer scheme used for user-facing routes.
///
/// Mirrors the Python-side equivalent guard (ai-agent/core/internal_auth.py) so both sides of the
/// EduFlow.Api &lt;-&gt; ai-agent boundary enforce the exact same shared secret ("AiService:ApiKey" here,
/// "INTERNAL_SERVICE_TOKEN" env var on the Python side) with the exact same fail-open behavior:
///
/// - The expected secret is read from configuration key "AiService:ApiKey" on every request (not
///   cached at startup), so a rotated secret is picked up without a process restart.
/// - When that config value is empty/unset (the checked-in appsettings.json default), enforcement is
///   skipped and a warning is logged -- this keeps local dev/CI working before the real secret has
///   been provisioned via user-secrets or the AiService__ApiKey environment variable.
/// - When it IS configured, the incoming "X-Internal-Api-Key" request header must match it exactly,
///   otherwise the request is short-circuited with 401 Unauthorized before the action executes.
///
/// Applied via [TypeFilter(typeof(InternalServiceAuthFilter))] on the controller (not [ServiceFilter]),
/// so no DI registration in Program.cs is required -- ActivatorUtilities resolves IConfiguration and
/// ILogger&lt;InternalServiceAuthFilter&gt; from the existing DI container per-request on its own.
/// </summary>
public class InternalServiceAuthFilter : IAsyncActionFilter
{
    private const string InternalApiKeyHeaderName = "X-Internal-Api-Key";

    private readonly IConfiguration _configuration;
    private readonly ILogger<InternalServiceAuthFilter> _logger;

    public InternalServiceAuthFilter(IConfiguration configuration, ILogger<InternalServiceAuthFilter> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var expectedKey = _configuration["AiService:ApiKey"];

        // Fail-open when the secret hasn't been configured yet (local dev/CI) -- mirrors
        // ai-agent/core/internal_auth.py's verify_internal_token behavior exactly.
        if (string.IsNullOrEmpty(expectedKey))
        {
            _logger.LogWarning(
                "AiService:ApiKey is not configured -- internal service authentication is NOT being " +
                "enforced for {Path}. Set AiService:ApiKey (via user-secrets in dev, or the " +
                "AiService__ApiKey environment variable in CI/deployment) to require callers to send " +
                "a matching {HeaderName} header.",
                context.HttpContext.Request.Path,
                InternalApiKeyHeaderName);

            await next();
            return;
        }

        var providedKey = context.HttpContext.Request.Headers[InternalApiKeyHeaderName].ToString();

        if (string.IsNullOrEmpty(providedKey) || !string.Equals(providedKey, expectedKey, StringComparison.Ordinal))
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Invalid or missing internal service token." });
            return;
        }

        await next();
    }
}
