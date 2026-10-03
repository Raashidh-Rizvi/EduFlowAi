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
        var (refreshToken, refreshValue) = GenerateRefreshToken(user.Id);
        await _dbContext.RefreshTokens.AddAsync(refreshToken, ct);

        await SaveNewUserAsync(ct);

        return new AuthResponse(
            UserId: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            Role: user.Role.ToString(),
            Token: token,
            RefreshToken: refreshValue,
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
        if (!AuthValidation.ValidName(request.FullName)) throw new InvalidOperationException(AuthValidation.NameMessage);
        var email = AuthValidation.NormalizeEmail(request.Email);
        if (!AuthValidation.ValidEmail(email)) throw new InvalidOperationException(AuthValidation.EmailMessage);
        if (!AuthValidation.ValidPassword(request.Password)) throw new InvalidOperationException(AuthValidation.PasswordMessage);
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
                // Every coin comes from a ledgered award; a new profile starts empty.
                Coins = 0
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
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation, ConstraintName: "IX_Users_Email" or "IX_Users_NormalizedEmail" })
        {
            // The unique email index also protects simultaneous creation requests.
            throw new InvalidOperationException("A user with this email address already exists.", ex);
        }
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        if (!AuthValidation.ValidEmail(request.Email)) throw new ArgumentException(AuthValidation.EmailMessage);
        if (!AuthValidation.ValidLoginPassword(request.Password)) throw new ArgumentException(AuthValidation.LoginPasswordMessage);
        var email = AuthValidation.NormalizeEmail(request.Email);
        var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email.ToLower() == email, ct);
        if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Your account is inactive. Contact an administrator.");
        }

        var (token, expiresAt) = GenerateJwtToken(user);
        var (refreshToken, refreshValue) = GenerateRefreshToken(user.Id);
        await _dbContext.RefreshTokens.AddAsync(refreshToken, ct);

        await _dbContext.SaveChangesAsync(ct);

        return new AuthResponse(
            UserId: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            Role: user.Role.ToString(),
            Token: token,
            RefreshToken: refreshValue,
            ExpiresAt: expiresAt
        );
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        if (!AuthValidation.ValidRefreshToken(request.RefreshToken) || request.RefreshToken.StartsWith("sha256:", StringComparison.Ordinal))
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");
        var tokenHash = HashRefreshToken(request.RefreshToken);
        var tokenEntity = await _dbContext.RefreshTokens
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => (r.Token == tokenHash || r.Token == request.RefreshToken) && !r.IsRevoked, ct);

        if (tokenEntity == null || tokenEntity.ExpiresAt <= DateTime.UtcNow || tokenEntity.User == null || !tokenEntity.User.IsActive)
        {
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");
        }

        tokenEntity.IsRevoked = true;

        var (newToken, expiresAt) = GenerateJwtToken(tokenEntity.User);
        var (newRefreshToken, refreshValue) = GenerateRefreshToken(tokenEntity.UserId);
        await _dbContext.RefreshTokens.AddAsync(newRefreshToken, ct);

        try { await _dbContext.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            // Exactly one rotation may consume a token, including parallel clients.
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");
        }

        return new AuthResponse(
            UserId: tokenEntity.User.Id,
            FullName: tokenEntity.User.FullName,
            Email: tokenEntity.User.Email,
            Role: tokenEntity.User.Role.ToString(),
            Token: newToken,
            RefreshToken: refreshValue,
            ExpiresAt: expiresAt
        );
    }

    public async Task<UserProfileDto> GetUserProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _dbContext.Users.FindAsync(new object[] { userId }, ct);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        if (!user.IsActive) throw new UnauthorizedAccessException("Your account is inactive. Contact an administrator.");

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
        if (!AuthValidation.ValidRefreshToken(refreshToken) || refreshToken.StartsWith("sha256:", StringComparison.Ordinal)) return;
        var tokenHash = HashRefreshToken(refreshToken);
        var tokenEntity = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(r => (r.Token == tokenHash || r.Token == refreshToken) && !r.IsRevoked, ct);

        if (tokenEntity != null)
        {
            tokenEntity.IsRevoked = true;
            try { await _dbContext.SaveChangesAsync(ct); }
            catch (DbUpdateConcurrencyException) { /* Already consumed/revoked by another request. */ }
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

        Validator.ValidateObject(request, new ValidationContext(request), validateAllProperties: true);
        user.FullName = request.FullName.Trim();
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

        // Session lifetime comes from configuration (JwtSettings:ExpiryMinutes) and falls
        // back to 12 hours when unset. The refresh token (7 days) extends the session via
        // /api/auth/refresh; logout revokes it.
        var expiryMinutes = 720;
        var expiryConfig = _configuration["JwtSettings:ExpiryMinutes"];
        if (int.TryParse(expiryConfig, out var configuredMinutes) && configuredMinutes > 0)
        {
            expiryMinutes = configuredMinutes;
        }
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

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

    private static (RefreshToken Entity, string Value) GenerateRefreshToken(Guid userId)
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);

        var value = Convert.ToBase64String(randomBytes);
        return (new RefreshToken
        {
            UserId = userId,
            Token = HashRefreshToken(value),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        }, value);
    }

    private static string HashRefreshToken(string value)
        => "sha256:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static string HashPassword(string password)
        => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

    private static bool VerifyPassword(string password, string storedHash)
    {
        try { return BCrypt.Net.BCrypt.Verify(password, storedHash); }
        catch (BCrypt.Net.SaltParseException) { return false; }
        catch (ArgumentException) { return false; }
    }
}
