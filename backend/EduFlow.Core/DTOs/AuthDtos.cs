using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using EduFlow.Core.Enums;

namespace EduFlow.Core.DTOs;

public record RegisterRequest(string FullName, string Email, string Password, UserRole Role = UserRole.Student) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (!AuthValidation.ValidName(FullName)) yield return new(AuthValidation.NameMessage, new[] { nameof(FullName) });
        if (!AuthValidation.ValidEmail(Email)) yield return new(AuthValidation.EmailMessage, new[] { nameof(Email) });
        if (!AuthValidation.ValidPassword(Password)) yield return new(AuthValidation.PasswordMessage, new[] { nameof(Password) });
        if (Role != UserRole.Student) yield return new("Public registration only allows Student accounts.", new[] { nameof(Role) });
    }
}

public record LoginRequest(string Email, string Password) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (!AuthValidation.ValidEmail(Email)) yield return new(AuthValidation.EmailMessage, new[] { nameof(Email) });
        if (!AuthValidation.ValidLoginPassword(Password)) yield return new(AuthValidation.LoginPasswordMessage, new[] { nameof(Password) });
    }
}

// Token remains optional: refresh identity comes exclusively from the persisted refresh credential.
public record RefreshTokenRequest(string? Token,
    [Required(ErrorMessage = AuthValidation.RefreshMessage)]
    [StringLength(512, ErrorMessage = AuthValidation.RefreshMessage)] string RefreshToken);

public record LogoutRequest(
    [Required(ErrorMessage = AuthValidation.RefreshMessage)]
    [StringLength(512, ErrorMessage = AuthValidation.RefreshMessage)] string RefreshToken);

public record UpdateProfileRequest(string FullName, [StringLength(2048)] string? AvatarUrl) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (!AuthValidation.ValidName(FullName)) yield return new(AuthValidation.NameMessage, new[] { nameof(FullName) });
        if (AvatarUrl != null && (!Uri.TryCreate(AvatarUrl, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https")))
            yield return new("Avatar URL must be an HTTP or HTTPS URL.", new[] { nameof(AvatarUrl) });
    }
}

public record AuthResponse(Guid UserId, string FullName, string Email, string Role, string Token, string RefreshToken, DateTime ExpiresAt);
public record UserProfileDto(Guid Id, string FullName, string Email, string Role, string? AvatarUrl, bool IsActive);
public record CreatedUserDto(Guid Id, string FullName, string Email, string Role, bool IsActive, DateTime CreatedAt);
public record CreateUserRequest(string FullName, string Email, string Password, string Role);
