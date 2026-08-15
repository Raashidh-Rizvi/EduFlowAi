using System;
using EduFlow.Core.Enums;

namespace EduFlow.Core.DTOs;

public record RegisterRequest(
    string FullName,
    string Email,
    string Password,
    UserRole Role
);

public record LoginRequest(
    string Email,
    string Password
);

public record RefreshTokenRequest(
    string Token,
    string RefreshToken
);

public record AuthResponse(
    Guid UserId,
    string FullName,
    string Email,
    string Role,
    string Token,
    string RefreshToken,
    DateTime ExpiresAt
);

public record UserProfileDto(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    string? AvatarUrl,
    bool IsActive
);
