using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using EduFlow.Core.Enums;
using EduFlow.Core.Evaluation;
using EduFlow.Core.Interfaces;

namespace EduFlow.Infrastructure.Services.Evaluation;

/// <summary>
/// Single correct option (MultipleChoice, TimedChallenge). The answer must equal the
/// correct option text after <see cref="AnswerText.Normalize"/>.
/// </summary>
public sealed class SingleChoiceEvaluator : IQuestionEvaluator
{
    public IReadOnlyCollection<QuestionType> SupportedTypes { get; } =
        new[] { QuestionType.MultipleChoice, QuestionType.TimedChallenge };

    public QuestionEvaluationResult Evaluate(QuestionSnapshot q, string answer)
    {
        if (string.IsNullOrWhiteSpace(answer))
            return QuestionEvaluationResult.Deterministic(0, q.MaxMarks, "No answer submitted.");

        bool correct = q.CorrectAnswers.Any(c => AnswerText.EqualsNormalized(c, answer));
        return QuestionEvaluationResult.Deterministic(correct ? q.MaxMarks : 0, q.MaxMarks,
            correct ? "Correct answer selected." : $"Incorrect. Correct option: {string.Join(", ", q.CorrectAnswers)}");
    }
}

/// <summary>True/False: the answer must be "true" or "false" (case-insensitive) and match the key.</summary>
public sealed class TrueFalseEvaluator : IQuestionEvaluator
{
    public IReadOnlyCollection<QuestionType> SupportedTypes { get; } = new[] { QuestionType.TrueFalse };

    public QuestionEvaluationResult Evaluate(QuestionSnapshot q, string answer)
    {
        if (string.IsNullOrWhiteSpace(answer))
            return QuestionEvaluationResult.Deterministic(0, q.MaxMarks, "No answer submitted.");

        bool? submitted = Parse(answer);
        bool? expected = q.CorrectAnswers.Select(Parse).FirstOrDefault(v => v.HasValue);
        bool correct = submitted.HasValue && expected.HasValue && submitted == expected;
        return QuestionEvaluationResult.Deterministic(correct ? q.MaxMarks : 0, q.MaxMarks,
            correct ? "Correct." : $"Incorrect. The statement is {(expected == true ? "True" : "False")}.");
    }

    private static bool? Parse(string value) => AnswerText.Normalize(value) switch
    {
        "true" => true,
        "false" => false,
        _ => null
    };
}

/// <summary>
/// Several correct options. The answer is a JSON array of option texts (or a comma/semicolon
/// list when no option contains those characters). All-or-nothing unless the question enables
/// partial credit, which awards correct-picks minus wrong-picks over the number of correct options.
/// </summary>
public sealed class MultipleSelectEvaluator : IQuestionEvaluator
{
    public IReadOnlyCollection<QuestionType> SupportedTypes { get; } = new[] { QuestionType.MultipleSelect };

    public QuestionEvaluationResult Evaluate(QuestionSnapshot q, string answer)
    {
        var expected = q.CorrectAnswers.Select(AnswerText.Normalize).ToHashSet();
        var chosen = AnswerText.SplitList(answer, q.Options).Select(AnswerText.Normalize).ToHashSet();
        if (chosen.Count == 0)
            return QuestionEvaluationResult.Deterministic(0, q.MaxMarks, "No answer submitted.");

        if (chosen.SetEquals(expected))
            return QuestionEvaluationResult.Deterministic(q.MaxMarks, q.MaxMarks, "All selected options are correct.");

        int awarded = 0;
        if (q.Rules.PartialCredit && expected.Count > 0)
        {
            int hits = chosen.Count(expected.Contains);
            int misses = chosen.Count - hits;
            awarded = (int)Math.Floor((double)Math.Max(0, hits - misses) / expected.Count * q.MaxMarks);
        }

        return QuestionEvaluationResult.Deterministic(awarded, q.MaxMarks,
            $"Selected options differ from the solution: {string.Join(", ", q.CorrectAnswers)}");
    }
}

/// <summary>
/// Typed term. The answer must equal one accepted answer after
/// <see cref="AnswerText.NormalizeLoose"/> (case, whitespace and punctuation ignored).
/// Containing the answer inside a longer response is NOT correct.
/// </summary>
public sealed class FillInBlankEvaluator : IQuestionEvaluator
{
    public IReadOnlyCollection<QuestionType> SupportedTypes { get; } = new[] { QuestionType.FillInBlank };

    public QuestionEvaluationResult Evaluate(QuestionSnapshot q, string answer)
    {
        var submitted = AnswerText.NormalizeLoose(answer);
        if (submitted.Length == 0)
            return QuestionEvaluationResult.Deterministic(0, q.MaxMarks, "No answer submitted.");

        bool correct = q.CorrectAnswers.Any(c => AnswerText.NormalizeLoose(c) == submitted);
        return QuestionEvaluationResult.Deterministic(correct ? q.MaxMarks : 0, q.MaxMarks,
            correct ? "Correct term provided." : $"Expected: '{string.Join("' or '", q.CorrectAnswers)}'.");
    }
}

/// <summary>
/// Number within the question's absolute tolerance (default exact). Numbers use the
/// invariant culture ('.' decimal separator).
/// </summary>
public sealed class NumericalEvaluator : IQuestionEvaluator
{
    public IReadOnlyCollection<QuestionType> SupportedTypes { get; } = new[] { QuestionType.Numerical };

    public QuestionEvaluationResult Evaluate(QuestionSnapshot q, string answer)
    {
        if (!TryParse(answer, out var submitted))
            return QuestionEvaluationResult.Deterministic(0, q.MaxMarks,
                string.IsNullOrWhiteSpace(answer) ? "No answer submitted." : "The answer is not a valid number.");

        bool correct = q.CorrectAnswers.Any(c => TryParse(c, out var expected)
            && Math.Abs(expected - submitted) <= q.Rules.NumericTolerance);
        return QuestionEvaluationResult.Deterministic(correct ? q.MaxMarks : 0, q.MaxMarks,
            correct ? "Correct value." : $"Expected {string.Join(" or ", q.CorrectAnswers)}.");
    }

    private static bool TryParse(string? text, out decimal value)
        => decimal.TryParse(text?.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out value);
}

/// <summary>
/// Pairs "left->right" separated by ';', ',' or new lines ("=>", ":" and "-" are also
/// accepted as the pair separator). All pairs must match unless partial credit is enabled,
/// which awards marks in proportion to correctly matched pairs. A wrong answer never earns
/// marks by default.
/// </summary>
public sealed class MatchingEvaluator : IQuestionEvaluator
{
    public IReadOnlyCollection<QuestionType> SupportedTypes { get; } = new[] { QuestionType.Matching };

    public QuestionEvaluationResult Evaluate(QuestionSnapshot q, string answer)
    {
        var expected = ParsePairs(string.Join(";", q.CorrectAnswers));
        var submitted = ParsePairs(answer);
        if (submitted.Count == 0)
            return QuestionEvaluationResult.Deterministic(0, q.MaxMarks, "No answer submitted.");

        int correctPairs = expected.Count(p => submitted.TryGetValue(p.Key, out var right) && right == p.Value);
        if (expected.Count > 0 && correctPairs == expected.Count && submitted.Count == expected.Count)
            return QuestionEvaluationResult.Deterministic(q.MaxMarks, q.MaxMarks, "All pairs matched correctly.");

        int awarded = q.Rules.PartialCredit && expected.Count > 0
            ? (int)Math.Floor((double)correctPairs / expected.Count * q.MaxMarks)
            : 0;
        return QuestionEvaluationResult.Deterministic(awarded, q.MaxMarks,
            $"{correctPairs} of {expected.Count} pairs matched. Solution: {string.Join("; ", q.CorrectAnswers)}");
    }

    private static Dictionary<string, string> ParsePairs(string? raw)
    {
        var pairs = new Dictionary<string, string>();
        foreach (var entry in AnswerText.SplitList(raw, null, ';', ',', '\n'))
        {
            string[] parts = Split(entry);
            if (parts.Length != 2) continue;
            var left = AnswerText.Normalize(parts[0]);
            if (left.Length > 0) pairs[left] = AnswerText.Normalize(parts[1]);
        }
        return pairs;
    }

    private static string[] Split(string entry)
    {
        foreach (var sep in new[] { "->", "=>", ":" })
        {
            int idx = entry.IndexOf(sep, StringComparison.Ordinal);
            if (idx > 0) return new[] { entry[..idx], entry[(idx + sep.Length)..] };
        }
        int dash = entry.IndexOf('-');
        return dash > 0 ? new[] { entry[..dash], entry[(dash + 1)..] } : Array.Empty<string>();
    }
}

/// <summary>Items in sequence (JSON array or comma list). Only the exact order is correct.</summary>
public sealed class OrderingEvaluator : IQuestionEvaluator
{
    public IReadOnlyCollection<QuestionType> SupportedTypes { get; } = new[] { QuestionType.Ordering };

    public QuestionEvaluationResult Evaluate(QuestionSnapshot q, string answer)
    {
        var expected = q.CorrectAnswers.Count == 1
            ? AnswerText.SplitList(q.CorrectAnswers[0], q.Options)
            : q.CorrectAnswers.ToList();
        var submitted = AnswerText.SplitList(answer, q.Options);
        if (submitted.Count == 0)
            return QuestionEvaluationResult.Deterministic(0, q.MaxMarks, "No answer submitted.");

        bool correct = submitted.Count == expected.Count
            && submitted.Zip(expected).All(p => AnswerText.EqualsNormalized(p.First, p.Second));
        return QuestionEvaluationResult.Deterministic(correct ? q.MaxMarks : 0, q.MaxMarks,
            correct ? "Correct order." : $"Correct order: {string.Join(", ", expected)}");
    }
}

/// <summary>
/// Free-text responses (short answer, open-ended, scenario, code). These are never
/// keyword-guessed: they wait for AI-assisted or instructor marking.
/// </summary>
public sealed class SubjectiveAnswerEvaluator : IQuestionEvaluator
{
    public IReadOnlyCollection<QuestionType> SupportedTypes { get; } = new[]
    {
        QuestionType.ShortAnswer, QuestionType.OpenEnded, QuestionType.ScenarioBased, QuestionType.CodeSnippet
    };

    public QuestionEvaluationResult Evaluate(QuestionSnapshot q, string answer)
        => string.IsNullOrWhiteSpace(answer)
            ? QuestionEvaluationResult.Deterministic(0, q.MaxMarks, "No answer submitted.")
            : QuestionEvaluationResult.AwaitingReview(q.MaxMarks);
}
