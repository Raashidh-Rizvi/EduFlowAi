using System;
using System.Collections.Generic;
using EduFlow.Core.Enums;

namespace EduFlow.Core.DTOs;

public record QuizDto(
    Guid Id,
    Guid CourseId,
    string Title,
    string Description,
    AssessmentType Type,
    int TimeLimitMinutes,
    int PassingScorePercent,
    int XpReward,
    int CoinReward,
    int QuestionsCount
);

public record QuizDetailDto(
    Guid Id,
    Guid CourseId,
    string Title,
    string Description,
    int TimeLimitMinutes,
    int PassingScorePercent,
    int XpReward,
    int CoinReward,
    List<QuizQuestionDto> Questions
);

public record QuizQuestionDto(
    Guid Id,
    string Prompt,
    QuestionType Type,
    List<string> Options,
    int Points,
    int OrderIndex
);

public record StartQuizAttemptResponse(
    Guid AttemptId,
    Guid QuizId,
    string QuizTitle,
    int TimeLimitMinutes,
    List<QuizQuestionDto> Questions
);

public record SubmitQuizRequest(
    Guid QuizId,
    List<QuestionAnswerSubmission> Answers
);

public record QuestionAnswerSubmission(
    Guid QuestionId,
    string SelectedAnswer
);

public record QuizResultDto(
    Guid SubmissionId,
    Guid QuizId,
    int ScoreObtained,
    int MaxScore,
    double PercentageScore,
    bool Passed,
    int XpEarned,
    int CoinsEarned,
    string? Feedback,
    List<QuestionResultItem> QuestionBreakdown
);

public record QuestionResultItem(
    Guid QuestionId,
    string Prompt,
    string SelectedAnswer,
    string CorrectAnswer,
    bool IsCorrect,
    int PointsAwarded,
    string Explanation
);

public record CreateQuizRequest(
    Guid CourseId,
    string Title,
    string Description,
    int TimeLimitMinutes,
    int PassingScorePercent,
    int XpReward,
    int CoinReward,
    List<CreateQuestionRequest> Questions
);

public record CreateQuestionRequest(
    string Prompt,
    QuestionType Type,
    List<string> Options,
    string CorrectAnswer,
    string Explanation,
    int Points,
    int OrderIndex
);
