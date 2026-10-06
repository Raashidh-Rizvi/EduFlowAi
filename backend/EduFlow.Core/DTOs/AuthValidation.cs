using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.RegularExpressions;

namespace EduFlow.Core.DTOs;

// Shared by DTO validation and service calls (including controlled admin creation).
public static class AuthValidation
{
    public const string NameMessage = "Full name must be between 2 and 200 characters.";
    public const string EmailMessage = "Enter a valid email address of at most 254 characters.";
    public const string PasswordMessage = "Password must be at least 8 characters, include uppercase, lowercase, a number and a special character, and be at most 72 UTF-8 bytes.";
    public const string LoginPasswordMessage = "Password is required and must be at most 72 UTF-8 bytes.";
    public const string RefreshMessage = "Refresh token is required and must be at most 512 characters.";

    public static string NormalizeEmail(string? email) => email?.Trim().ToLowerInvariant() ?? string.Empty;
    public static bool ValidName(string? name) => name?.Trim().Length is >= 2 and <= 200;
    public static bool ValidEmail(string? email)
    {
        var normalized = NormalizeEmail(email);
        return normalized.Length <= 254 && Regex.IsMatch(normalized, @"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$", RegexOptions.CultureInvariant)
            && new EmailAddressAttribute().IsValid(normalized);
    }
    public static bool ValidLoginPassword(string? password) => !string.IsNullOrWhiteSpace(password)
        && Encoding.UTF8.GetByteCount(password) <= 72 && !password.Contains('\0');
    public static bool ValidPassword(string? password) => ValidLoginPassword(password) && password!.Length >= 8
        && Regex.IsMatch(password, "[A-Z]") && Regex.IsMatch(password, "[a-z]")
        && Regex.IsMatch(password, "[0-9]") && Regex.IsMatch(password, "[^A-Za-z0-9\\s]");
    public static bool ValidRefreshToken(string? token) => !string.IsNullOrWhiteSpace(token) && token.Length <= 512;
}
