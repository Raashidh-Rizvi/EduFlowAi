using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;

namespace EduFlow.Infrastructure.Services.Evaluation;

/// <summary>
/// The explicit normalization rules every evaluator uses. Keeping them in one place means
/// "case-insensitive" or "ignores punctuation" means the same thing for every question type.
/// </summary>
public static class AnswerText
{
    /// <summary>Trims, collapses internal whitespace and lower-cases (invariant culture).</summary>
    public static string Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var sb = new StringBuilder(text.Length);
        bool pendingSpace = false;
        foreach (var ch in text.Trim())
        {
            if (char.IsWhiteSpace(ch))
            {
                pendingSpace = true;
                continue;
            }
            if (pendingSpace && sb.Length > 0) sb.Append(' ');
            pendingSpace = false;
            sb.Append(char.ToLowerInvariant(ch));
        }
        return sb.ToString();
    }

    /// <summary>
    /// <see cref="Normalize"/> after removing every character that is not a letter, digit or
    /// whitespace. Used for typed short responses (fill-in-the-blank), never for substrings.
    /// </summary>
    public static string NormalizeLoose(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var kept = new string(text.Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c)).ToArray());
        return Normalize(kept);
    }

    public static bool EqualsNormalized(string? a, string? b) => Normalize(a) == Normalize(b);

    /// <summary>
    /// Parses a multi-value answer: a JSON array of strings, or a list separated by any of
    /// <paramref name="separators"/>. A value that exactly matches one of <paramref name="wholeValues"/>
    /// is kept whole, so option texts containing a separator are not split.
    /// </summary>
    public static List<string> SplitList(string? raw, IEnumerable<string>? wholeValues = null, params char[] separators)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new List<string>();
        var trimmed = raw.Trim();

        if (trimmed.StartsWith('['))
        {
            try
            {
                var values = JsonSerializer.Deserialize<List<string>>(trimmed);
                if (values != null) return values.Where(v => !string.IsNullOrWhiteSpace(v)).Select(v => v.Trim()).ToList();
            }
            catch (JsonException)
            {
                // Not a JSON array: fall through to delimiter parsing.
            }
        }

        if (wholeValues != null && wholeValues.Any(w => EqualsNormalized(w, trimmed)))
        {
            return new List<string> { trimmed };
        }

        var seps = separators.Length > 0 ? separators : new[] { ',', ';' };
        return trimmed.Split(seps, StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToList();
    }
}
