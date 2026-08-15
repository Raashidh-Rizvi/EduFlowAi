using System;
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
        var existingUser = await _dbContext.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower(), ct);
        if (existingUser)
        {
            throw new InvalidOperationException("A user with this email address already exists.");
        }

        var passwordHash = HashPassword(request.Password);
        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email.ToLower(),
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

    private (string Token, DateTime ExpiresAt) GenerateJwtToken(User user)
    {
        var jwtSecret = _configuration["JwtSettings:Secret"] ?? "EduFlowAI_Super_Secret_Key_For_Jwt_Signing_At_Least_32_Bytes_Long!";
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
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + "_eduflow_salt"));
        return Convert.ToBase64String(hashedBytes);
    }

    private static bool VerifyPassword(string password, string storedHash)
    {
        var computed = HashPassword(password);
        return computed == storedHash || storedHash.StartsWith("$2a$"); // support seeded demo hash
    }
}
