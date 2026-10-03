using System.Security.Claims;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Security;

public static class AccountTokenValidation
{
    public static async Task ValidateAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        var idClaim = principal?.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal?.FindFirstValue("uid");
        if (!Guid.TryParse(idClaim, out var userId))
        {
            context.Fail("Invalid account identity.");
            return;
        }
        var db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, context.HttpContext.RequestAborted);
        // Deactivation and role changes take effect for already-issued access tokens.
        if (user == null || !user.IsActive || principal?.FindFirstValue(ClaimTypes.Role) != user.Role.ToString())
            context.Fail("Account is inactive or its authorization has changed.");
    }
}
