using System;
using System.Collections.Generic;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Evaluation;

namespace EduFlow.Core.Interfaces;

/// <summary>Marks one kind of question. Implementations must be deterministic and side-effect free.</summary>
public interface IQuestionEvaluator
{
    IReadOnlyCollection<QuestionType> SupportedTypes { get; }

    QuestionEvaluationResult Evaluate(QuestionSnapshot question, string studentAnswer);
}

/// <summary>
/// The single authority for turning answers into marks. Pure: it neither reads nor writes
/// the database, so marking rules can be tested in isolation.
/// </summary>
public interface IEvaluationService
{
    /// <summary>Captures the question and its answer key as they are now.</summary>
    QuestionSnapshot Snapshot(Question question);

    /// <summary>Marks every question of the assessment; unanswered questions score zero.</summary>
    IReadOnlyList<AnswerOutcome> EvaluateAttempt(IEnumerable<Question> questions, IReadOnlyDictionary<Guid, string> answers);

    /// <summary>The canonical attempt mark calculation (sum of awarded / sum of maximum marks).</summary>
    AttemptMarks CalculateMarks(IEnumerable<(int AwardedMarks, int MaxMarks, AnswerEvaluationStatus Status)> answers);
}
