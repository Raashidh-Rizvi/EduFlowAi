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
    int QuestionsCount,
    QuizScopeType ScopeType = QuizScopeType.Course,
    Guid? ScopeId = null,
    string? ScopeName = null,
    QuizStatus Status = QuizStatus.Published,
    DifficultyLevel Difficulty = DifficultyLevel.Medium,
    int TimeLimitSeconds = 900,
    int AttemptsAllowed = 3,
    bool RandomizeQuestions = true,
    bool RandomizeOptions = true,
    FeedbackMode FeedbackMode = FeedbackMode.Immediate,
    bool ShowCorrectAnswers = true,
    bool GeneratedByAI = false,
    string? GenerationWorkflowId = null,
    DateTime? CreatedAt = null
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
    List<QuizQuestionDto> Questions,
    QuizScopeType ScopeType = QuizScopeType.Course,
    Guid? ScopeId = null,
    string? ScopeName = null,
    QuizStatus Status = QuizStatus.Published,
    DifficultyLevel Difficulty = DifficultyLevel.Medium,
    int TimeLimitSeconds = 900,
    int AttemptsAllowed = 3,
    bool RandomizeQuestions = true,
    bool RandomizeOptions = true,
    FeedbackMode FeedbackMode = FeedbackMode.Immediate,
    bool ShowCorrectAnswers = true,
    bool GeneratedByAI = false,
    string? GenerationWorkflowId = null,
    QuizConfigurationDto? Configuration = null
);

public record QuizConfigurationDto(
    int QuestionCount,
    Dictionary<string, int> QuestionTypeDistribution,
    Dictionary<string, int> DifficultyDistribution,
    List<Guid> SelectedTopicIds,
    List<Guid> SelectedContentIds,
    int TimeLimitSeconds,
    int PassPercentage,
    int AttemptsAllowed,
    bool RandomizeQuestions,
    bool RandomizeOptions,
    FeedbackMode FeedbackMode,
    bool NegativeMarking
);

public record QuizQuestionDto(
    Guid Id,
    string Prompt,
    QuestionType Type,
    List<string> Options,
    int Points,
    int OrderIndex,
    string? CorrectAnswer = null,
    string? Explanation = null,
    DifficultyLevel Difficulty = DifficultyLevel.Medium,
    Guid? SourceContentId = null,
    string? LearningObjective = null,
    string MetadataJson = "{}",
    List<QuestionOptionDto>? OptionDetails = null
);

public record QuestionOptionDto(
    Guid? Id,
    string OptionText,
    bool IsCorrect,
    int DisplayOrder
);

public record StartQuizAttemptResponse(
    Guid AttemptId,
    Guid QuizId,
    string QuizTitle,
    int TimeLimitMinutes,
    int TimeLimitSeconds,
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
    List<QuestionResultItem> QuestionBreakdown,
    string ScopeType = "COURSE",
    string? BadgeUnlocked = null
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
    List<CreateQuestionRequest> Questions,
    QuizScopeType ScopeType = QuizScopeType.Course,
    Guid? ScopeId = null,
    DifficultyLevel Difficulty = DifficultyLevel.Medium,
    int TimeLimitSeconds = 900,
    int AttemptsAllowed = 3,
    bool RandomizeQuestions = true,
    bool RandomizeOptions = true,
    FeedbackMode FeedbackMode = FeedbackMode.Immediate,
    bool ShowCorrectAnswers = true,
    QuizStatus Status = QuizStatus.Published,
    bool GeneratedByAI = false,
    string? GenerationWorkflowId = null,
    QuizConfigurationDto? Configuration = null
);

public record CreateQuestionRequest(
    string Prompt,
    QuestionType Type,
    List<string> Options,
    string CorrectAnswer,
    string Explanation,
    int Points,
    int OrderIndex,
    DifficultyLevel Difficulty = DifficultyLevel.Medium,
    Guid? SourceContentId = null,
    string? LearningObjective = null,
    string MetadataJson = "{}",
    List<QuestionOptionDto>? OptionDetails = null
);

public record GenerateAiQuizRequest(
    Guid CourseId,
    string Topic,
    string Difficulty,
    int QuestionCount,
    int TimeLimitMinutes = 15,
    int PassingScorePercent = 70,
    int XpReward = 60,
    int CoinReward = 25,
    QuizScopeType ScopeType = QuizScopeType.Course,
    Guid? ScopeId = null,
    List<string>? QuestionTypes = null,
    Dictionary<string, int>? QuestionTypeDistribution = null,
    Dictionary<string, int>? DifficultyDistribution = null,
    List<string>? LearningObjectives = null
);

public record UploadQuizRequest(
    Guid CourseId,
    string Title,
    string Description,
    int TimeLimitMinutes,
    int PassingScorePercent,
    int XpReward,
    int CoinReward,
    string? SourceFileName,
    List<CreateQuestionRequest> Questions,
    QuizScopeType ScopeType = QuizScopeType.Course,
    Guid? ScopeId = null
);

public record ValidateQuizResponse(
    bool IsValid,
    List<string> Errors,
    List<string> Warnings,
    int ValidatedQuestionCount,
    int TotalMarks,
    bool DistributionMatched
);

public record SingleQuestionRegenerateRequest(
    Guid QuestionId,
    string? FocusTopic = null,
    string? PromptGuidance = null,
    QuestionType? TargetType = null,
    DifficultyLevel? TargetDifficulty = null
);

public record DuplicateQuizResponse(
    Guid OriginalQuizId,
    Guid NewQuizId,
    string NewQuizTitle,
    string Message
);

