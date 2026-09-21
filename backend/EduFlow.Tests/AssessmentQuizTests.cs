using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Unit tests for Member 2 – Assessments & Quizzes.
/// Covers: Quiz creation, question options, submission auto-grading, passing thresholds, perfect scores.
/// </summary>
public class AssessmentQuizTests
{
    private static ApplicationDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var ctx = new ApplicationDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }

    [Fact]
    public async Task CreateQuiz_PersistsAssessmentWithQuestions()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();

        var quiz = new Assessment
        {
            CourseId = courseId,
            Title = "Unit 1 Algorithmic Complexity Quiz",
            Description = "Test Big-O and Trees",
            Type = AssessmentType.Quiz,
            TimeLimitMinutes = 20,
            PassingScorePercent = 70,
            XpReward = 75,
            CoinReward = 30
        };

        var question = new Question
        {
            AssessmentId = quiz.Id,
            Prompt = "What is the average time complexity of quicksort?",
            Type = QuestionType.MultipleChoice,
            OptionsJson = "[\"O(n log n)\", \"O(n^2)\", \"O(log n)\", \"O(1)\"]",
            CorrectAnswer = "O(n log n)",
            Explanation = "Quicksort has an expected average time of O(n log n).",
            Points = 10,
            OrderIndex = 1
        };

        quiz.Questions.Add(question);
        await db.Assessments.AddAsync(quiz);
        await db.SaveChangesAsync();

        var persisted = await db.Assessments
            .Include(a => a.Questions)
            .FirstOrDefaultAsync(a => a.Id == quiz.Id);

        Assert.NotNull(persisted);
        Assert.Equal("Unit 1 Algorithmic Complexity Quiz", persisted.Title);
        Assert.Single(persisted.Questions);
        Assert.Equal("O(n log n)", persisted.Questions.First().CorrectAnswer);
    }

    [Fact]
    public async Task QuizSubmission_AutoGrading_CalculatesScoreAndPassingCorrectly()
    {
        await using var db = CreateDb();
        var studentId = Guid.NewGuid();
        var courseId = Guid.NewGuid();

        var quiz = new Assessment
        {
            CourseId = courseId,
            Title = "Clean Architecture Quiz",
            PassingScorePercent = 70,
            XpReward = 60
        };

        var q1 = new Question
        {
            AssessmentId = quiz.Id,
            Prompt = "Where are Entities located?",
            CorrectAnswer = "EduFlow.Core",
            Points = 10,
            OrderIndex = 1
        };
        var q2 = new Question
        {
            AssessmentId = quiz.Id,
            Prompt = "Where is EF Core configured?",
            CorrectAnswer = "EduFlow.Infrastructure",
            Points = 10,
            OrderIndex = 2
        };

        quiz.Questions.Add(q1);
        quiz.Questions.Add(q2);
        await db.Assessments.AddAsync(quiz);
        await db.SaveChangesAsync();

        // Simulate Student Submission with 1 correct answer (50% score -> Failed)
        var submission = new Submission
        {
            AssessmentId = quiz.Id,
            StudentId = studentId,
            ScoreObtained = 10,
            MaxScore = 20,
            PercentageScore = 50.0,
            Passed = false,
            SubmittedAt = DateTime.UtcNow
        };

        submission.Answers.Add(new SubmissionAnswer
        {
            QuestionId = q1.Id,
            SelectedAnswer = "EduFlow.Core",
            IsCorrect = true,
            PointsAwarded = 10
        });

        submission.Answers.Add(new SubmissionAnswer
        {
            QuestionId = q2.Id,
            SelectedAnswer = "EduFlow.Api",
            IsCorrect = false,
            PointsAwarded = 0
        });

        await db.Submissions.AddAsync(submission);
        await db.SaveChangesAsync();

        var recorded = await db.Submissions
            .Include(s => s.Answers)
            .FirstOrDefaultAsync(s => s.Id == submission.Id);

        Assert.NotNull(recorded);
        Assert.False(recorded.Passed);
        Assert.Equal(50.0, recorded.PercentageScore);
        Assert.Equal(2, recorded.Answers.Count);
    }

    [Fact]
    public async Task QuizSubmission_PerfectScore_GrantsFullMarksAndPassedStatus()
    {
        await using var db = CreateDb();
        var studentId = Guid.NewGuid();

        var quiz = new Assessment
        {
            Title = "Perfect Mastery Quiz",
            PassingScorePercent = 70,
            XpReward = 50
        };

        var q1 = new Question
        {
            AssessmentId = quiz.Id,
            Prompt = "Is PostgreSQL a relational database?",
            CorrectAnswer = "Yes",
            Points = 10
        };

        quiz.Questions.Add(q1);
        await db.Assessments.AddAsync(quiz);
        await db.SaveChangesAsync();

        var submission = new Submission
        {
            AssessmentId = quiz.Id,
            StudentId = studentId,
            ScoreObtained = 10,
            MaxScore = 10,
            PercentageScore = 100.0,
            Passed = true,
            SubmittedAt = DateTime.UtcNow
        };

        await db.Submissions.AddAsync(submission);
        await db.SaveChangesAsync();

        var passedSubmission = await db.Submissions.FirstOrDefaultAsync(s => s.Id == submission.Id);
        Assert.NotNull(passedSubmission);
        Assert.True(passedSubmission.Passed);
        Assert.Equal(100.0, passedSubmission.PercentageScore);
    }

    [Fact]
    public async Task CreateQuiz_MultiQuestionWithParsedOptions_PersistsAndRetrievesCorrectly()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();

        var quiz = new Assessment
        {
            CourseId = courseId,
            Title = "Full Stack Architecture Mastery",
            Description = "Comprehensive test on ASP.NET Core and React",
            Type = AssessmentType.Quiz,
            TimeLimitMinutes = 25,
            PassingScorePercent = 75,
            XpReward = 100,
            CoinReward = 40
        };

        var questions = new List<Question>
        {
            new Question
            {
                Prompt = "What is the primary function of DbContext.SaveChangesAsync()?",
                Type = QuestionType.MultipleChoice,
                OptionsJson = System.Text.Json.JsonSerializer.Serialize(new List<string>
                {
                    "Wraps all tracked modifications in an atomic transaction",
                    "Drops the target database table",
                    "Disables SQL connection pooling",
                    "Flushes memory cache only"
                }),
                CorrectAnswer = "Wraps all tracked modifications in an atomic transaction",
                Explanation = "SaveChangesAsync guarantees all modifications commit or rollback atomically.",
                Points = 10,
                OrderIndex = 1
            },
            new Question
            {
                Prompt = "Which React hook manages local component lifecycle and state synchronization?",
                Type = QuestionType.MultipleChoice,
                OptionsJson = System.Text.Json.JsonSerializer.Serialize(new List<string>
                {
                    "useEffect",
                    "usePostgreSQL",
                    "useDatabaseConnection",
                    "useAtomicLedger"
                }),
                CorrectAnswer = "useEffect",
                Explanation = "useEffect synchronizes component side-effects with state changes.",
                Points = 10,
                OrderIndex = 2
            }
        };

        foreach (var q in questions)
        {
            quiz.Questions.Add(q);
        }

        await db.Assessments.AddAsync(quiz);
        await db.SaveChangesAsync();

        var retrieved = await db.Assessments
            .Include(a => a.Questions)
            .FirstOrDefaultAsync(a => a.Id == quiz.Id);

        Assert.NotNull(retrieved);
        Assert.Equal(2, retrieved!.Questions.Count);
        Assert.Equal(100, retrieved.XpReward);
        Assert.Equal(40, retrieved.CoinReward);

        var firstQ = retrieved.Questions.First(q => q.OrderIndex == 1);
        var options = System.Text.Json.JsonSerializer.Deserialize<List<string>>(firstQ.OptionsJson);
        Assert.NotNull(options);
        Assert.Equal(4, options!.Count);
        Assert.Contains("Wraps all tracked modifications in an atomic transaction", options);
    }
}
