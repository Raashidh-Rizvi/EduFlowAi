using System;
using System.ComponentModel.DataAnnotations;
using Npgsql;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace EduFlow.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IConfiguration _configuration;

    public AuthService(ApplicationDbContext dbContext, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _configuration = configuration;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        if (request.Role != UserRole.Student)
        {
            throw new InvalidOperationException("Public registration only allows Student accounts.");
        }

        var user = await PrepareUserAsync(request, ct);

        var (token, expiresAt) = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken(user.Id);
        await _dbContext.RefreshTokens.AddAsync(refreshToken, ct);

        await SaveNewUserAsync(ct);

        return new AuthResponse(
            UserId: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            Role: user.Role.ToString(),
            Token: token,
            RefreshToken: refreshToken.Token,
            ExpiresAt: expiresAt
        );
    }

    public async Task<CreatedUserDto> CreateUserAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var user = await PrepareUserAsync(request, ct);
        await SaveNewUserAsync(ct);
        return new CreatedUserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.IsActive, user.CreatedAt);
    }

    private async Task<User> PrepareUserAsync(RegisterRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length > 200)
            throw new InvalidOperationException("Full name is required and must be at most 200 characters.");
        var email = request.Email?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254 || !new EmailAddressAttribute().IsValid(email))
            throw new InvalidOperationException("A valid email address is required.");
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8 || Encoding.UTF8.GetByteCount(request.Password) > 72)
            throw new InvalidOperationException("Password must be at least 8 characters and at most 72 UTF-8 bytes.");
        if (request.Role is not (UserRole.Student or UserRole.Instructor or UserRole.Admin))
            throw new InvalidOperationException("Role must be Student, Instructor, or Admin.");

        var existingUser = await _dbContext.Users.AnyAsync(u => u.Email.ToLower() == email, ct);
        if (existingUser)
        {
            throw new InvalidOperationException("A user with this email address already exists.");
        }

        var passwordHash = HashPassword(request.Password);
        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = passwordHash,
            Role = request.Role,
            IsActive = true
        };

        await _dbContext.Users.AddAsync(user, ct);

        // Initialize Gamification profile if student
        if (user.Role == UserRole.Student)
        {
            var studentXp = new StudentXp
            {
                StudentId = user.Id,
                TotalXp = 0,
                CurrentLevel = 1,
                Coins = 50
            };
            var studentStreak = new StudentStreak
            {
                StudentId = user.Id,
                CurrentStreak = 0,
                LongestStreak = 0,
                FreezeTokensAvailable = 2
            };
            await _dbContext.StudentXp.AddAsync(studentXp, ct);
            await _dbContext.StudentStreaks.AddAsync(studentStreak, ct);
        }

        return user;
    }

    private async Task SaveNewUserAsync(CancellationToken ct)
    {
        try
        {
            await _dbContext.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation, ConstraintName: "IX_Users_Email" })
        {
            // The unique email index also protects simultaneous creation requests.
            throw new InvalidOperationException("A user with this email address already exists.", ex);
        }
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower(), ct);
        if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("This user account is inactive.");
        }

        var (token, expiresAt) = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken(user.Id);
        await _dbContext.RefreshTokens.AddAsync(refreshToken, ct);

        await _dbContext.SaveChangesAsync(ct);

        return new AuthResponse(
            UserId: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            Role: user.Role.ToString(),
            Token: token,
            RefreshToken: refreshToken.Token,
            ExpiresAt: expiresAt
        );
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        var tokenEntity = await _dbContext.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken && !r.IsRevoked, ct);

        if (tokenEntity == null || tokenEntity.ExpiresAt < DateTime.UtcNow || tokenEntity.User == null)
        {
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");
        }

        tokenEntity.IsRevoked = true;

        var (newToken, expiresAt) = GenerateJwtToken(tokenEntity.User);
        var newRefreshToken = GenerateRefreshToken(tokenEntity.UserId);
        await _dbContext.RefreshTokens.AddAsync(newRefreshToken, ct);

        await _dbContext.SaveChangesAsync(ct);

        return new AuthResponse(
            UserId: tokenEntity.User.Id,
            FullName: tokenEntity.User.FullName,
            Email: tokenEntity.User.Email,
            Role: tokenEntity.User.Role.ToString(),
            Token: newToken,
            RefreshToken: newRefreshToken.Token,
            ExpiresAt: expiresAt
        );
    }

    public async Task<UserProfileDto> GetUserProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        return new UserProfileDto(
            Id: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            Role: user.Role.ToString(),
            AvatarUrl: user.AvatarUrl,
            IsActive: user.IsActive
        );
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var tokenEntity = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == refreshToken && !r.IsRevoked, ct);

        if (tokenEntity != null)
        {
            tokenEntity.IsRevoked = true;
            await _dbContext.SaveChangesAsync(ct);
        }
        // Silently succeed even if token not found (idempotent logout)
    }

    public async Task<UserProfileDto> GetUserByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        return new UserProfileDto(
            Id: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            Role: user.Role.ToString(),
            AvatarUrl: user.AvatarUrl,
            IsActive: user.IsActive
        );
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        user.FullName = request.FullName;
        if (request.AvatarUrl != null)
        {
            user.AvatarUrl = request.AvatarUrl;
        }
        user.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(ct);

        return new UserProfileDto(
            Id: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            Role: user.Role.ToString(),
            AvatarUrl: user.AvatarUrl,
            IsActive: user.IsActive
        );
    }

    private (string Token, DateTime ExpiresAt) GenerateJwtToken(User user)
    {
        var jwtSecret = _configuration["JwtSettings:Secret"]
            ?? throw new InvalidOperationException("JwtSettings:Secret is not configured. Set it via user-secrets or the JwtSettings__Secret environment variable.");
        var key = Encoding.UTF8.GetBytes(jwtSecret);
        var expiresAt = DateTime.UtcNow.AddHours(12);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("uid", user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAt,
            Issuer = _configuration["JwtSettings:Issuer"] ?? "EduFlowAPI",
            Audience = _configuration["JwtSettings:Audience"] ?? "EduFlowClients",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return (tokenHandler.WriteToken(token), expiresAt);
    }

    private static RefreshToken GenerateRefreshToken(Guid userId)
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);

        return new RefreshToken
        {
            UserId = userId,
            Token = Convert.ToBase64String(randomBytes),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        };
    }

    private static string HashPassword(string password)
        => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

    private static bool VerifyPassword(string password, string storedHash)
        => BCrypt.Net.BCrypt.Verify(password, storedHash);
}
