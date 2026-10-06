using System;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;

namespace EduFlow.Core.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<CreatedUserDto> CreateUserAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken ct = default);
    Task LogoutAsync(string refreshToken, CancellationToken ct = default);
    Task<UserProfileDto> GetUserProfileAsync(Guid userId, CancellationToken ct = default);
    Task<UserProfileDto> GetUserByIdAsync(Guid userId, CancellationToken ct = default);
    Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default);
}

