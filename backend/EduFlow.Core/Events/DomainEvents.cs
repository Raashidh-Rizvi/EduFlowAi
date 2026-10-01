using System;
using System.Collections.Generic;
using EduFlow.Core.Enums;

namespace EduFlow.Core.Events;

/// <summary>A fact about the LMS that other parts of the system (e.g. gamification) react to.</summary>
public interface IDomainEvent
{
    Guid StudentId { get; }
}

/// <summary>An attempt became fully evaluated (all answers marked).</summary>
public sealed record AssessmentEvaluated(
    Guid StudentId,
    Guid CourseId,
    Guid AssessmentId,
    Guid AttemptId,
    string AssessmentTitle,
    double Percentage,
    bool Passed,
    int TimeSpentSeconds,
    DifficultyLevel Difficulty,
    QuizScopeType ScopeType,
    Guid? TopicId,
    IReadOnlyList<bool> AnswerCorrectness) : IDomainEvent;

/// <summary>A student completed a content item (lesson) for the first time.</summary>
public sealed record LessonCompleted(
    Guid StudentId,
    Guid CourseId,
    Guid ContentItemId,
    string Title,
    int XpReward) : IDomainEvent;

/// <summary>A student completed every learning unit of a course.</summary>
public sealed record CourseCompleted(Guid StudentId, Guid CourseId) : IDomainEvent;

/// <summary>A student completed a challenge for the first time.</summary>
public sealed record ChallengeCompleted(
    Guid StudentId,
    Guid ChallengeId,
    string Title,
    int XpReward) : IDomainEvent;
