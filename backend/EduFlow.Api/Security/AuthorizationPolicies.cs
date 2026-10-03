using Microsoft.AspNetCore.Authorization;

namespace EduFlow.Api.Security;

/// <summary>
/// Authorization policies shared by Program.cs and the integration-test hosts, so tests run
/// against the same deny-by-default configuration as production.
/// </summary>
public static class AuthorizationPolicies
{
    public static void Configure(AuthorizationOptions options)
    {
        // Deny by default: endpoints without an explicit [Authorize]/[AllowAnonymous] require a signed-in user.
        options.FallbackPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build();
        options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
        options.AddPolicy("InstructorOnly", policy => policy.RequireRole("Instructor"));
        options.AddPolicy("StudentOnly", policy => policy.RequireRole("Student"));
        options.AddPolicy("InstructorOrAdmin", policy => policy.RequireRole("Instructor", "Admin"));
    }
}
