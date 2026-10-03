using System;
using System.Security.Claims;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request, HttpContext.RequestAborted);
            return CreatedAtAction(nameof(GetProfile), result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request, HttpContext.RequestAborted);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(request, HttpContext.RequestAborted);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Revokes the provided refresh token, effectively logging the user out.
    /// Idempotent — returns 200 even if the token was already revoked or not found.
    /// </summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
    {
        await _authService.LogoutAsync(request.RefreshToken, HttpContext.RequestAborted);
        return Ok(new { message = "Logged out successfully." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var userId))
        {
            return Unauthorized();
        }

        var profile = await _authService.GetUserProfileAsync(userId, HttpContext.RequestAborted);
        return Ok(profile);
    }

    /// <summary>
    /// Returns the public profile of any user by their ID.
    /// Admins can access any user; Students and Instructors can only access their own.
    /// </summary>
    [HttpGet("users/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetUserById(Guid id)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var requestingUserId = Guid.TryParse(uidClaim, out var parsedId) ? parsedId : Guid.Empty;
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        // Non-admins can only view their own profile via this endpoint
        if (!role.Equals("Admin", StringComparison.OrdinalIgnoreCase) && requestingUserId != id)
        {
            return Forbid();
        }

        try
        {
            var profile = await _authService.GetUserByIdAsync(id);
            return Ok(profile);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Updates the authenticated user's own profile (full name and avatar URL).
    /// Admins may also call this endpoint for any user.
    /// </summary>
    [HttpPut("users/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] UpdateProfileRequest request)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var requestingUserId = Guid.TryParse(uidClaim, out var parsedId) ? parsedId : Guid.Empty;
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        // Only allow updating own profile unless Admin
        if (!role.Equals("Admin", StringComparison.OrdinalIgnoreCase) && requestingUserId != id)
        {
            return Forbid();
        }

        try
        {
            var updated = await _authService.UpdateProfileAsync(id, request);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

