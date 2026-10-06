using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EduFlow.Api.Errors;

/// <summary>
/// The error body every API failure returns. <c>message</c> is safe to show to the user;
/// <c>code</c> is a stable machine-readable identifier; <c>traceId</c> matches the
/// X-Correlation-ID response header and the CorrelationId log scope.
/// Never put exception messages, stack traces or internal details in here.
/// </summary>
public sealed record ApiErrorResponse(bool Success, string Message, string Code, object? Errors, string TraceId);

/// <summary>
/// Shared error-contract and correlation-id wiring. Program.cs and the integration test hosts
/// call the same methods so tests exercise the real pipeline configuration.
/// </summary>
public static partial class ApiErrorHandling
{
    public const string CorrelationHeader = "X-Correlation-ID";

    // Accept only short, header-safe ids from callers; anything else is replaced so the
    // value can never be used for log or header injection.
    [GeneratedRegex("^[A-Za-z0-9._-]{1,64}$")]
    private static partial Regex SafeCorrelationId();

    public static ApiErrorResponse Create(HttpContext context, string message, string code, object? errors = null)
        => new(false, message, code, errors, context.TraceIdentifier);

    /// <summary>
    /// [ApiController] model-validation failures keep the ValidationProblemDetails shape
    /// (title/errors, read by existing clients) and gain the contract fields.
    /// </summary>
    public static void ConfigureInvalidModelState(ApiBehaviorOptions options)
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var problem = new ValidationProblemDetails(context.ModelState)
            {
                Status = StatusCodes.Status400BadRequest
            };
            problem.Extensions["success"] = false;
            problem.Extensions["message"] = "One or more fields are invalid.";
            problem.Extensions["code"] = "VALIDATION_FAILED";
            problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
            return new BadRequestObjectResult(problem);
        };
    }

    /// <summary>
    /// Adds, in order: correlation id, global exception handler, and contract bodies for
    /// empty 4xx/5xx responses (auth challenges, unknown routes, bare NotFound()/Forbid()).
    /// Call before UseAuthentication/UseAuthorization.
    /// </summary>
    public static void UseApiErrorHandling(this IApplicationBuilder app)
    {
        app.Use(CorrelationIdMiddleware);

        app.UseExceptionHandler(errorApp => errorApp.Run(HandleExceptionAsync));

        app.UseStatusCodePages(async statusContext =>
        {
            var http = statusContext.HttpContext;
            var (message, code) = DescribeStatus(http.Response.StatusCode);
            await http.Response.WriteAsJsonAsync(Create(http, message, code));
        });
    }

    private static async Task CorrelationIdMiddleware(HttpContext context, Func<Task> next)
    {
        var incoming = context.Request.Headers[CorrelationHeader].ToString();
        var correlationId = SafeCorrelationId().IsMatch(incoming)
            ? incoming
            : Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString("N");

        context.TraceIdentifier = correlationId;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[CorrelationHeader] = correlationId;
            return Task.CompletedTask;
        });

        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("EduFlow.Api.Request");
        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await next();
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context)
    {
        var exception = context.Features.Get<IExceptionHandlerPathFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("EduFlow.Api.Errors");

        if (exception is OperationCanceledException && context.RequestAborted.IsCancellationRequested)
        {
            // The client went away; nothing useful can be sent and this is not a server fault.
            logger.LogInformation("Request {Method} {Path} was cancelled by the client.",
                context.Request.Method, context.Request.Path);
            context.Response.StatusCode = 499;
            return;
        }

        // Full exception goes to the server log only (path, not query string, to avoid logging tokens).
        logger.LogError(exception, "Unhandled exception for {Method} {Path}.", context.Request.Method, context.Request.Path);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(Create(context,
            "An unexpected server error occurred. Please try again later.", "INTERNAL_ERROR"));
    }

    private static (string Message, string Code) DescribeStatus(int status) => status switch
    {
        400 => ("The request was invalid.", "BAD_REQUEST"),
        401 => ("Authentication is required. Please sign in.", "UNAUTHENTICATED"),
        403 => ("You do not have permission to perform this action.", "FORBIDDEN"),
        404 => ("The requested resource was not found.", "NOT_FOUND"),
        405 => ("This HTTP method is not supported for this resource.", "METHOD_NOT_ALLOWED"),
        409 => ("The request conflicts with the current state of the resource.", "CONFLICT"),
        413 => ("The request is too large.", "PAYLOAD_TOO_LARGE"),
        415 => ("The request content type is not supported.", "UNSUPPORTED_MEDIA_TYPE"),
        429 => ("Too many requests. Please try again shortly.", "RATE_LIMITED"),
        502 => ("An upstream service returned an invalid response.", "BAD_GATEWAY"),
        503 => ("The service is temporarily unavailable.", "SERVICE_UNAVAILABLE"),
        504 => ("An upstream service timed out.", "GATEWAY_TIMEOUT"),
        >= 500 => ("An unexpected server error occurred. Please try again later.", "INTERNAL_ERROR"),
        _ => ("The request could not be completed.", "REQUEST_FAILED")
    };
}
