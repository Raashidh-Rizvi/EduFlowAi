using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Evaluation;
using EduFlow.Core.Interfaces;

namespace EduFlow.Infrastructure.Services.Evaluation;

public class EvaluationService : IEvaluationService
{
    private readonly Dictionary<QuestionType, IQuestionEvaluator> _evaluators;

    public EvaluationService(IEnumerable<IQuestionEvaluator> evaluators)
    {
        _evaluators = new Dictionary<QuestionType, IQuestionEvaluator>();
        foreach (var evaluator in evaluators)
        {
            foreach (var type in evaluator.SupportedTypes)
            {
                if (!_evaluators.TryAdd(type, evaluator))
                    throw new InvalidOperationException($"More than one evaluator registered for {type}.");
            }
        }

        var missing = Enum.GetValues<QuestionType>().Where(t => !_evaluators.ContainsKey(t)).ToList();
        if (missing.Count > 0)
            throw new InvalidOperationException($"No evaluator registered for: {string.Join(", ", missing)}.");
    }

    /// <summary>All built-in evaluators; used by DI registration and tests.</summary>
    public static IReadOnlyList<IQuestionEvaluator> DefaultEvaluators() => new IQuestionEvaluator[]
    {
        new SingleChoiceEvaluator(),
        new TrueFalseEvaluator(),
        new MultipleSelectEvaluator(),
        new FillInBlankEvaluator(),
        new NumericalEvaluator(),
        new MatchingEvaluator(),
        new OrderingEvaluator(),
        new SubjectiveAnswerEvaluator()
    };

    public QuestionSnapshot Snapshot(Question question)
    {
        var metadata = ParseMetadata(question.MetadataJson);
        var options = question.Options.Count > 0
            ? question.Options.OrderBy(o => o.DisplayOrder).Select(o => o.OptionText).ToList()
            : DeserializeList(question.OptionsJson);

        return new QuestionSnapshot(
            question.Id,
            question.Type,
            question.Prompt,
            options,
            ResolveCorrectAnswers(question, options, metadata),
            question.Points,
            question.Explanation,
            new QuestionMarkingRules(
                PartialCredit: metadata.TryGetValue("partialCredit", out var pc) && pc.ValueKind == JsonValueKind.True,
                NumericTolerance: metadata.TryGetValue("tolerance", out var tol) && TryGetDecimal(tol, out var t) ? Math.Abs(t) : 0m));
    }

    public IReadOnlyList<AnswerOutcome> EvaluateAttempt(IEnumerable<Question> questions, IReadOnlyDictionary<Guid, string> answers)
    {
        var outcomes = new List<AnswerOutcome>();
        foreach (var question in questions.OrderBy(q => q.OrderIndex))
        {
            var snapshot = Snapshot(question);
            var studentAnswer = answers.TryGetValue(question.Id, out var a) ? a?.Trim() ?? string.Empty : string.Empty;
            var result = _evaluators[question.Type].Evaluate(snapshot, studentAnswer);

            // Defence in depth: no evaluator can award more than the question is worth.
            if (result.AwardedMarks < 0 || result.AwardedMarks > snapshot.MaxMarks || result.MaxMarks != snapshot.MaxMarks)
                throw new InvalidOperationException($"Evaluator for {question.Type} produced invalid marks.");

            outcomes.Add(new AnswerOutcome(snapshot, studentAnswer, result));
        }
        return outcomes;
    }

    public AttemptMarks CalculateMarks(IEnumerable<(int AwardedMarks, int MaxMarks, AnswerEvaluationStatus Status)> answers)
    {
        var list = answers.ToList();
        int total = list.Sum(a => a.MaxMarks);
        int obtained = list.Sum(a => a.AwardedMarks);
        int pending = list.Count(a => a.Status != AnswerEvaluationStatus.Evaluated);
        double percentage = total > 0 ? Math.Round((double)obtained / total * 100, 2) : 0;
        return new AttemptMarks(obtained, total, percentage, pending);
    }

    /// <summary>
    /// Answer key, in order of authority: option rows flagged IsCorrect; otherwise the
    /// CorrectAnswer text (a whole option, a JSON array, or a ','/';' list; '|' separates
    /// alternatives for typed answers) plus any metadata "acceptedAnswers".
    /// </summary>
    private static IReadOnlyList<string> ResolveCorrectAnswers(Question question, List<string> options, Dictionary<string, JsonElement> metadata)
    {
        var flagged = question.Options.Where(o => o.IsCorrect).OrderBy(o => o.DisplayOrder).Select(o => o.OptionText).ToList();
        if (flagged.Count > 0) return flagged;

        var raw = question.CorrectAnswer ?? string.Empty;
        List<string> answers = question.Type switch
        {
            QuestionType.FillInBlank or QuestionType.Numerical =>
                raw.Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).ToList(),
            QuestionType.MultipleSelect => AnswerText.SplitList(raw, options),
            QuestionType.Matching or QuestionType.Ordering => string.IsNullOrWhiteSpace(raw) ? new List<string>() : new List<string> { raw.Trim() },
            _ => string.IsNullOrWhiteSpace(raw) ? new List<string>() : new List<string> { raw.Trim() }
        };

        if (metadata.TryGetValue("acceptedAnswers", out var accepted) && accepted.ValueKind == JsonValueKind.Array)
        {
            answers.AddRange(accepted.EnumerateArray()
                .Where(e => e.ValueKind == JsonValueKind.String)
                .Select(e => e.GetString()!.Trim())
                .Where(s => s.Length > 0));
        }

        return answers.Distinct().ToList();
    }

    private static List<string> DeserializeList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch (JsonException)
        {
            return new List<string>();
        }
    }

    private static Dictionary<string, JsonElement> ParseMetadata(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, JsonElement>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return new Dictionary<string, JsonElement>();
            return doc.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.Clone(), StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            return new Dictionary<string, JsonElement>();
        }
    }

    private static bool TryGetDecimal(JsonElement element, out decimal value)
    {
        value = 0m;
        return element.ValueKind switch
        {
            JsonValueKind.Number => element.TryGetDecimal(out value),
            JsonValueKind.String => decimal.TryParse(element.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out value),
            _ => false
        };
    }
}
