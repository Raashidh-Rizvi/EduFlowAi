using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Evaluation;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

public class AttemptGradingService : IAttemptGradingService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IEvaluationService _evaluationService;
    private readonly IGamificationService _gamificationService;
    private readonly IAssessmentAccessService _accessService;
    private readonly IAuditLogWriter _auditLogWriter;
    private readonly IGradeService _gradeService;
    private readonly IProgressService _progressService;

    public AttemptGradingService(
        ApplicationDbContext dbContext,
        IEvaluationService evaluationService,
        IGamificationService gamificationService,
        IAssessmentAccessService accessService,
        IAuditLogWriter auditLogWriter,
        IGradeService gradeService,
        IProgressService progressService)
    {
        _dbContext = dbContext;
        _evaluationService = evaluationService;
        _gamificationService = gamificationService;
        _accessService = accessService;
        _auditLogWriter = auditLogWriter;
        _gradeService = gradeService;
        _progressService = progressService;
    }

    public async Task<GradedAttempt> SubmitAsync(
        Assessment assessment,
        Submission attempt,
        bool isNewAttempt,
        IReadOnlyDictionary<Guid, string> answers,
        CancellationToken ct = default)
    {
        var outcomes = _evaluationService.EvaluateAttempt(assessment.Questions, answers);
        var marks = _evaluationService.CalculateMarks(
            outcomes.Select(o => (o.Result.AwardedMarks, o.Result.MaxMarks, o.Result.Status)));

        var now = DateTime.UtcNow;
        var answerRows = outcomes.Select(o => new SubmissionAnswer
        {
            SubmissionId = attempt.Id,
            QuestionId = o.Question.QuestionId,
            SelectedAnswer = o.StudentAnswer,
            IsCorrect = o.Result.IsCorrect,
            PointsAwarded = o.Result.AwardedMarks,
            MaxMarks = o.Result.MaxMarks,
            Feedback = o.Result.Feedback,
            EvaluationMethod = o.Result.Method,
            EvaluationStatus = o.Result.Status,
            QuestionSnapshotJson = JsonSerializer.Serialize(o.Question)
        }).ToList();

        attempt.SubmittedAt = now;
        attempt.IsAutoGraded = marks.IsFullyEvaluated;
        ApplyMarks(attempt, marks, assessment.PassingScorePercent, now);

        return await _dbContext.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            _dbContext.ChangeTracker.Clear();
            await using var transaction = _dbContext.Database.IsRelational()
                ? await _dbContext.Database.BeginTransactionAsync(ct)
                : null;

            if (isNewAttempt)
            {
                _dbContext.Submissions.Add(attempt);
            }
            else
            {
                _dbContext.Submissions.Attach(attempt);
                _dbContext.Entry(attempt).State = EntityState.Modified;
            }
            _dbContext.SubmissionAnswers.AddRange(answerRows);
            await _dbContext.SaveChangesAsync(ct);

            var reward = marks.IsFullyEvaluated
                ? await AwardRewardAsync(assessment, attempt, outcomes.Select(o => (o.Question, o.Result.IsCorrect)), ct)
                : null;

            // Course result and progress follow the evaluated attempt in the same transaction.
            if (marks.IsFullyEvaluated)
            {
                await _gradeService.RecalculateAsync(assessment.CourseId, attempt.StudentId, ct);
                await _progressService.RefreshEnrollmentAsync(assessment.CourseId, attempt.StudentId, ct);
                await _dbContext.SaveChangesAsync(ct);
            }

            if (transaction != null) await transaction.CommitAsync(ct);
            return new GradedAttempt(attempt, outcomes, marks, reward);
        });
    }

    public async Task<ManualMarkResult> MarkAnswerAsync(
        Guid attemptId,
        Guid questionId,
        int awardedMarks,
        string? feedback,
        string? reason,
        Guid actorId,
        string actorRole,
        CancellationToken ct = default)
    {
        // The mark, its history, the audit entry, recalculated totals and any XP commit together.
        return await _dbContext.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            _dbContext.ChangeTracker.Clear();
            await using var transaction = _dbContext.Database.IsRelational()
                ? await _dbContext.Database.BeginTransactionAsync(ct)
                : null;

            var result = await MarkAnswerCoreAsync(attemptId, questionId, awardedMarks, feedback, reason, actorId, actorRole, ct);
            if (result.Succeeded && transaction != null) await transaction.CommitAsync(ct);
            return result;
        });
    }

    private async Task<ManualMarkResult> MarkAnswerCoreAsync(
        Guid attemptId,
        Guid questionId,
        int awardedMarks,
        string? feedback,
        string? reason,
        Guid actorId,
        string actorRole,
        CancellationToken ct)
    {
        var attempt = await _dbContext.Submissions
            .Include(s => s.Answers)
            .Include(s => s.Assessment!).ThenInclude(a => a.Questions)
            .FirstOrDefaultAsync(s => s.Id == attemptId, ct);
        if (attempt?.Assessment == null)
            return new ManualMarkResult(ManualMarkError.AttemptNotFound, "Attempt not found.");

        if (!await _accessService.CanManageCourseAsync(attempt.Assessment.CourseId, actorId, actorRole, ct))
            return new ManualMarkResult(ManualMarkError.NotAllowed, "Only the course instructor or an admin can mark this attempt.");

        if (attempt.Status is AttemptStatus.InProgress or AttemptStatus.Cancelled)
            return new ManualMarkResult(ManualMarkError.AttemptNotSubmitted, "Only submitted attempts can be marked.");

        var answer = attempt.Answers.FirstOrDefault(a => a.QuestionId == questionId);
        if (answer == null)
            return new ManualMarkResult(ManualMarkError.AnswerNotFound, "This attempt has no answer for that question.");

        if (awardedMarks < 0 || awardedMarks > answer.MaxMarks)
            return new ManualMarkResult(ManualMarkError.MarksOutOfRange, $"Marks must be between 0 and {answer.MaxMarks}.");

        bool isOverride = answer.EvaluationStatus == AnswerEvaluationStatus.Evaluated;
        if (isOverride && string.IsNullOrWhiteSpace(reason))
            return new ManualMarkResult(ManualMarkError.ReasonRequired, "A reason is required to change an existing mark.");

        bool wasFullyEvaluated = attempt.Status == AttemptStatus.Evaluated;
        var now = DateTime.UtcNow;

        _dbContext.MarkAdjustments.Add(new MarkAdjustment
        {
            SubmissionAnswerId = answer.Id,
            ActorId = actorId,
            PreviousMarks = answer.PointsAwarded,
            NewMarks = awardedMarks,
            PreviousStatus = answer.EvaluationStatus,
            Reason = (reason ?? "Initial marking of a response awaiting review.").Trim()
        });
        _auditLogWriter.AddEntry(actorId, actorRole, "Submission.Marked", "Submission", attempt.Id.ToString(),
            new Dictionary<string, object?>
            {
                ["questionId"] = questionId.ToString(),
                ["previousMarks"] = answer.PointsAwarded.ToString(CultureInfo.InvariantCulture),
                ["newMarks"] = awardedMarks.ToString(CultureInfo.InvariantCulture)
            });

        answer.PointsAwarded = awardedMarks;
        answer.IsCorrect = awardedMarks == answer.MaxMarks;
        answer.Feedback = string.IsNullOrWhiteSpace(feedback) ? answer.Feedback : feedback.Trim();
        answer.EvaluationMethod = EvaluationMethod.Manual;
        answer.EvaluationStatus = AnswerEvaluationStatus.Evaluated;
        answer.UpdatedAt = now;

        var marks = _evaluationService.CalculateMarks(
            attempt.Answers.Select(a => (a.PointsAwarded, a.MaxMarks, a.EvaluationStatus)));
        ApplyMarks(attempt, marks, attempt.Assessment.PassingScorePercent, now);

        // XP is awarded once, when the attempt first becomes fully evaluated.
        if (!wasFullyEvaluated && marks.IsFullyEvaluated)
        {
            var outcomes = attempt.Answers.Select(a => (Snapshot(a), a.IsCorrect));
            await AwardRewardAsync(attempt.Assessment, attempt, outcomes, ct);
        }

        // Any change to an evaluated attempt's marks flows into the course result. The grade
        // service reads attempts from the database, so the new marks are saved first (the
        // surrounding transaction still makes the whole operation atomic).
        if (marks.IsFullyEvaluated)
        {
            await _dbContext.SaveChangesAsync(ct);
            await _gradeService.RecalculateAsync(attempt.Assessment.CourseId, attempt.StudentId, ct);
            await _progressService.RefreshEnrollmentAsync(attempt.Assessment.CourseId, attempt.StudentId, ct);
        }

        await _dbContext.SaveChangesAsync(ct);
        return new ManualMarkResult(ManualMarkError.None, "Mark recorded.", attempt, marks);
    }

    /// <summary>The only place attempt totals, pass/fail and status are written.</summary>
    private static void ApplyMarks(Submission attempt, AttemptMarks marks, int passingScorePercent, DateTime now)
    {
        attempt.ScoreObtained = marks.ObtainedMarks;
        attempt.MaxScore = marks.TotalMarks;
        attempt.PercentageScore = marks.Percentage;
        attempt.Passed = marks.IsFullyEvaluated && marks.Percentage >= passingScorePercent;
        attempt.Status = marks.IsFullyEvaluated ? AttemptStatus.Evaluated : AttemptStatus.Evaluating;
        attempt.EvaluatedAt = marks.IsFullyEvaluated ? now : null;
        attempt.UpdatedAt = now;
    }

    private Task<QuizRewardResultDto> AwardRewardAsync(
        Assessment assessment,
        Submission attempt,
        IEnumerable<(QuestionSnapshot Question, bool IsCorrect)> outcomes,
        CancellationToken ct)
    {
        int timeSpentSeconds = attempt.StartedAt.HasValue && attempt.SubmittedAt.HasValue
            ? Math.Max(0, (int)(attempt.SubmittedAt.Value - attempt.StartedAt.Value).TotalSeconds)
            : 0;

        var questionOutcomes = outcomes
            .Select(o => (assessment.TopicId, assessment.Title, assessment.Title, o.IsCorrect))
            .ToList();

        return _gamificationService.CalculateAndAwardQuizRewardAsync(
            studentId: attempt.StudentId,
            assessmentId: assessment.Id,
            scorePercent: (int)Math.Round(attempt.PercentageScore),
            passed: attempt.Passed,
            timeSpentSeconds: timeSpentSeconds,
            difficulty: assessment.Difficulty,
            scopeType: assessment.ScopeType,
            questionOutcomes: questionOutcomes,
            ct: ct);
    }

    private static QuestionSnapshot Snapshot(SubmissionAnswer answer)
        => string.IsNullOrWhiteSpace(answer.QuestionSnapshotJson)
            ? new QuestionSnapshot(answer.QuestionId, QuestionType.MultipleChoice, string.Empty,
                Array.Empty<string>(), Array.Empty<string>(), answer.MaxMarks, string.Empty, QuestionMarkingRules.Default)
            : JsonSerializer.Deserialize<QuestionSnapshot>(answer.QuestionSnapshotJson)!;
}
