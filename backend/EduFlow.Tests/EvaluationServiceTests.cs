using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Evaluation;
using EduFlow.Infrastructure.Services.Evaluation;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Marking rules of the production <see cref="EvaluationService"/>: one evaluator per question
/// type, explicit normalization, marks always within 0..max, and subjective answers never guessed.
/// </summary>
public class EvaluationServiceTests
{
    private static readonly EvaluationService Service = new(EvaluationService.DefaultEvaluators());

    private static Question Q(QuestionType type, string correct, int points = 10, string[]? options = null,
        object? metadata = null, (string Text, bool Correct)[]? optionRows = null)
    {
        var q = new Question
        {
            Id = Guid.NewGuid(),
            Prompt = $"{type} question",
            Type = type,
            CorrectAnswer = correct,
            Points = points,
            OptionsJson = JsonSerializer.Serialize(options ?? Array.Empty<string>()),
            MetadataJson = metadata == null ? "{}" : JsonSerializer.Serialize(metadata)
        };
        int order = 1;
        foreach (var (text, isCorrect) in optionRows ?? Array.Empty<(string, bool)>())
        {
            q.Options.Add(new QuestionOption { OptionText = text, IsCorrect = isCorrect, DisplayOrder = order++ });
        }
        return q;
    }

    private static QuestionEvaluationResult Mark(Question q, string answer)
        => Service.EvaluateAttempt(new[] { q }, new Dictionary<Guid, string> { [q.Id] = answer }).Single().Result;

    // --- Single choice ---------------------------------------------------------------

    [Theory]
    [InlineData("B-tree", 10)]
    [InlineData("  b-TREE ", 10)]
    [InlineData("Hash", 0)]
    [InlineData("", 0)]
    public void SingleChoice_MatchesTheCorrectOptionAfterNormalization(string answer, int expected)
    {
        var q = Q(QuestionType.MultipleChoice, "B-tree", options: new[] { "B-tree", "Hash" });
        var result = Mark(q, answer);
        Assert.Equal(expected, result.AwardedMarks);
        Assert.Equal(EvaluationMethod.Deterministic, result.Method);
        Assert.Equal(AnswerEvaluationStatus.Evaluated, result.Status);
    }

    [Fact]
    public void SingleChoice_OptionRowsAreTheAnswerKeyWhenPresent()
    {
        // The legacy CorrectAnswer text disagrees with the option rows; the rows win.
        var q = Q(QuestionType.MultipleChoice, "Hash", optionRows: new[] { ("B-tree", true), ("Hash", false) });
        Assert.Equal(10, Mark(q, "B-tree").AwardedMarks);
        Assert.Equal(0, Mark(q, "Hash").AwardedMarks);
    }

    // --- True / False ------------------------------------------------------------------

    [Theory]
    [InlineData("True", 5)]
    [InlineData("true", 5)]
    [InlineData("False", 0)]
    [InlineData("yes", 0)]
    public void TrueFalse_AcceptsOnlyTrueOrFalse(string answer, int expected)
        => Assert.Equal(expected, Mark(Q(QuestionType.TrueFalse, "True", points: 5), answer).AwardedMarks);

    // --- Multiple select ----------------------------------------------------------------

    [Fact]
    public void MultipleSelect_IsAllOrNothingByDefault()
    {
        var q = Q(QuestionType.MultipleSelect, "A, C", options: new[] { "A", "B", "C" });
        Assert.Equal(10, Mark(q, "[\"C\",\"A\"]").AwardedMarks);
        Assert.Equal(10, Mark(q, "a; c").AwardedMarks);
        Assert.Equal(0, Mark(q, "A").AwardedMarks);
        Assert.Equal(0, Mark(q, "A, B, C").AwardedMarks);
    }

    [Fact]
    public void MultipleSelect_PartialCredit_PenalizesWrongPicks()
    {
        var q = Q(QuestionType.MultipleSelect, "A, C", options: new[] { "A", "B", "C" }, metadata: new { partialCredit = true });
        Assert.Equal(5, Mark(q, "A").AwardedMarks);
        Assert.Equal(0, Mark(q, "A, B").AwardedMarks);
    }

    [Fact]
    public void MultipleSelect_OptionsContainingCommasAreMarkedFromAJsonArray()
    {
        var q = Q(QuestionType.MultipleSelect, "[\"Read, then write\",\"Lock all\"]",
            options: new[] { "Read, then write", "Lock all", "Ignore" });
        Assert.Equal(10, Mark(q, "[\"Lock all\",\"Read, then write\"]").AwardedMarks);
    }

    // --- Fill in the blank -----------------------------------------------------------------

    [Theory]
    [InlineData("B-Tree index", 10)]
    [InlineData("btree index", 10)]
    [InlineData("b tree index.", 0)]
    [InlineData("it is not a b-tree index", 0)]
    public void FillInBlank_RequiresAnExactNormalizedMatch_NotASubstring(string answer, int expected)
        => Assert.Equal(expected, Mark(Q(QuestionType.FillInBlank, "b-tree index"), answer).AwardedMarks);

    [Fact]
    public void FillInBlank_AcceptsListedAlternatives()
    {
        var q = Q(QuestionType.FillInBlank, "isolation|isolated", metadata: new { acceptedAnswers = new[] { "ISOLATION LEVEL" } });
        Assert.Equal(10, Mark(q, "Isolated").AwardedMarks);
        Assert.Equal(10, Mark(q, "isolation level").AwardedMarks);
        Assert.Equal(0, Mark(q, "durability").AwardedMarks);
    }

    // --- Numerical ------------------------------------------------------------------------

    [Theory]
    [InlineData("3.14", 10)]
    [InlineData("3.149", 10)]
    [InlineData("3.2", 0)]
    [InlineData("pi", 0)]
    public void Numerical_UsesTheConfiguredTolerance(string answer, int expected)
        => Assert.Equal(expected, Mark(Q(QuestionType.Numerical, "3.14159", metadata: new { tolerance = 0.01 }), answer).AwardedMarks);

    // --- Matching --------------------------------------------------------------------------

    [Fact]
    public void Matching_WrongAnswerScoresZero_UnlessPartialCreditIsConfigured()
    {
        var strict = Q(QuestionType.Matching, "a-1; b-2", points: 4);
        Assert.Equal(4, Mark(strict, "b->2, a->1").AwardedMarks);
        Assert.Equal(0, Mark(strict, "a-1; b-3").AwardedMarks);
        Assert.Equal(0, Mark(strict, "anything").AwardedMarks);

        var partial = Q(QuestionType.Matching, "a-1; b-2", points: 4, metadata: new { partialCredit = true });
        Assert.Equal(2, Mark(partial, "a-1; b-3").AwardedMarks);
    }

    // --- Ordering --------------------------------------------------------------------------

    [Fact]
    public void Ordering_RequiresTheExactSequence()
    {
        var q = Q(QuestionType.Ordering, "[\"Parse\",\"Plan\",\"Execute\"]", options: new[] { "Execute", "Parse", "Plan" });
        Assert.Equal(10, Mark(q, "Parse, Plan, Execute").AwardedMarks);
        Assert.Equal(0, Mark(q, "Plan, Parse, Execute").AwardedMarks);
    }

    // --- Subjective ------------------------------------------------------------------------

    [Theory]
    [InlineData(QuestionType.ShortAnswer)]
    [InlineData(QuestionType.OpenEnded)]
    [InlineData(QuestionType.ScenarioBased)]
    [InlineData(QuestionType.CodeSnippet)]
    public void SubjectiveAnswers_AwaitReview_AndAreNeverKeywordGuessed(QuestionType type)
    {
        // The answer repeats every word of the model answer: the old keyword heuristic would award full marks.
        var q = Q(type, "write ahead logging guarantees durability", points: 2);
        var result = Mark(q, "write ahead logging guarantees durability");
        Assert.Equal(0, result.AwardedMarks);
        Assert.Equal(AnswerEvaluationStatus.NeedsReview, result.Status);
    }

    [Fact]
    public void SubjectiveAnswer_LeftBlank_IsMarkedZeroImmediately()
    {
        var result = Mark(Q(QuestionType.ShortAnswer, "model answer", points: 2), "   ");
        Assert.Equal(0, result.AwardedMarks);
        Assert.Equal(AnswerEvaluationStatus.Evaluated, result.Status);
    }

    // --- Attempt-level calculation -----------------------------------------------------------

    [Fact]
    public void AllQuestionTypes_HaveAnEvaluator_AndNeverExceedMaximumMarks()
    {
        foreach (var type in Enum.GetValues<QuestionType>())
        {
            var q = Q(type, "x", points: 3, options: new[] { "x", "y" });
            var result = Mark(q, "x");
            Assert.InRange(result.AwardedMarks, 0, 3);
            Assert.Equal(3, result.MaxMarks);
        }
    }

    [Fact]
    public void UnansweredQuestions_ScoreZero_AndCountTowardTotalMarks()
    {
        var q1 = Q(QuestionType.MultipleChoice, "A", points: 6, options: new[] { "A", "B" });
        var q2 = Q(QuestionType.MultipleChoice, "B", points: 4, options: new[] { "A", "B" });
        var outcomes = Service.EvaluateAttempt(new[] { q1, q2 }, new Dictionary<Guid, string> { [q1.Id] = "A" });

        var marks = Service.CalculateMarks(outcomes.Select(o => (o.Result.AwardedMarks, o.Result.MaxMarks, o.Result.Status)));
        Assert.Equal(6, marks.ObtainedMarks);
        Assert.Equal(10, marks.TotalMarks);
        Assert.Equal(60, marks.Percentage);
        Assert.True(marks.IsFullyEvaluated);
    }

    [Fact]
    public void PendingSubjectiveAnswers_KeepTheAttemptNotFullyEvaluated()
    {
        var mcq = Q(QuestionType.MultipleChoice, "A", options: new[] { "A", "B" });
        var essay = Q(QuestionType.OpenEnded, "");
        var outcomes = Service.EvaluateAttempt(new[] { mcq, essay },
            new Dictionary<Guid, string> { [mcq.Id] = "A", [essay.Id] = "A thoughtful essay." });

        var marks = Service.CalculateMarks(outcomes.Select(o => (o.Result.AwardedMarks, o.Result.MaxMarks, o.Result.Status)));
        Assert.Equal(1, marks.PendingReviewCount);
        Assert.False(marks.IsFullyEvaluated);
    }

    [Fact]
    public void Snapshot_CapturesTheAnswerKeyAndRulesAtMarkingTime()
    {
        var q = Q(QuestionType.Numerical, "42", points: 7, metadata: new { tolerance = 0.5 });
        var snapshot = Service.Snapshot(q);

        q.CorrectAnswer = "43";
        q.Points = 1;

        Assert.Equal(new[] { "42" }, snapshot.CorrectAnswers);
        Assert.Equal(7, snapshot.MaxMarks);
        Assert.Equal(0.5m, snapshot.Rules.NumericTolerance);
        var roundTrip = JsonSerializer.Deserialize<QuestionSnapshot>(JsonSerializer.Serialize(snapshot))!;
        Assert.Equal(snapshot.CorrectAnswers, roundTrip.CorrectAnswers);
        Assert.Equal(snapshot.Rules, roundTrip.Rules);
    }
}
