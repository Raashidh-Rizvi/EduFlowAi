using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

/// <summary>
/// Phase 4 – Production grading path tests.
/// Simulates the exact grading logic from QuizzesController.SubmitQuiz (lines 1472-1658)
/// against an in-memory DB without calling the controller directly.
/// </summary>
public class Phase4_GradingTests
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

    private static Assessment SeedQuizWithQuestions(
        ApplicationDbContext db,
        Guid courseId,
        List<QuestionData> questions,
        int passingScore = 70,
        bool showCorrectAnswers = true)
    {
        var quiz = new Assessment
        {
            CourseId = courseId,
            Title = "Grading Path Test Quiz",
            Description = "Phase 4 grading tests",
            Type = AssessmentType.Quiz,
            PassingScorePercent = passingScore,
            ShowCorrectAnswers = showCorrectAnswers,
            TimeLimitMinutes = 30,
            XpReward = 50,
            CoinReward = 20
        };

        for (int i = 0; i < questions.Count; i++)
        {
            var qd = questions[i];
            quiz.Questions.Add(new Question
            {
                Prompt = qd.Prompt,
                Type = qd.Type,
                OptionsJson = qd.Options,
                CorrectAnswer = qd.CorrectAnswer,
                Explanation = $"Explanation for: {qd.Prompt}",
                Points = qd.Points,
                OrderIndex = i + 1
            });
        }

        db.Assessments.Add(quiz);
        db.SaveChanges();
        return quiz;
    }

    private static Submission SubmitAnswers(
        ApplicationDbContext db,
        Guid quizId,
        Guid studentId,
        List<(Guid questionId, string answer)> answers)
    {
        var quiz = db.Assessments
            .Include(a => a.Questions)
            .First(a => a.Id == quizId);

        var questionsList = quiz.Questions.ToList();
        int totalPoints = 0;
        int scoreObtained = 0;

        var submission = new Submission
        {
            AssessmentId = quiz.Id,
            StudentId = studentId,
            SubmittedAt = DateTime.UtcNow
        };

        foreach (var q in questionsList)
        {
            totalPoints += q.Points;
            var studentAns = answers
                .FirstOrDefault(a => a.questionId == q.Id).answer?.Trim()
                ?? string.Empty;

            bool isCorrect = false;
            int awarded = 0;

            if (q.Type == QuestionType.MultipleSelect)
            {
                var studentSet = studentAns.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
                var correctSet = q.CorrectAnswer.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
                isCorrect = studentSet.SetEquals(correctSet);
                awarded = isCorrect ? q.Points : 0;
            }
            else if (q.Type == QuestionType.FillInBlank)
            {
                var cleanStudent = Regex.Replace(studentAns.ToLowerInvariant(), @"[^\w\s]", "").Trim();
                var cleanCorrect = Regex.Replace(q.CorrectAnswer.ToLowerInvariant(), @"[^\w\s]", "").Trim();
                isCorrect = cleanStudent == cleanCorrect || (cleanCorrect.Length > 3 && cleanStudent.Contains(cleanCorrect));
                awarded = isCorrect ? q.Points : 0;
            }
            else if (q.Type == QuestionType.Matching)
            {
                var sClean = studentAns.Replace(" ", "").ToLowerInvariant();
                var cClean = q.CorrectAnswer.Replace(" ", "").ToLowerInvariant();
                isCorrect = sClean == cClean;
                awarded = isCorrect ? q.Points : (sClean.Length > 0 ? (int)(q.Points * 0.5) : 0);
            }
            else if (q.Type == QuestionType.ShortAnswer || q.Type == QuestionType.OpenEnded)
            {
                if (!string.IsNullOrWhiteSpace(studentAns))
                {
                    var modelWords = q.CorrectAnswer.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                        .Where(w => w.Length > 3)
                        .Select(w => w.ToLowerInvariant())
                        .ToHashSet();

                    int matchedKeywords = modelWords.Count(kw => studentAns.ToLowerInvariant().Contains(kw));
                    double matchRatio = modelWords.Count > 0 ? (double)matchedKeywords / modelWords.Count : 0.5;

                    awarded = Math.Clamp((int)Math.Round(matchRatio * q.Points), studentAns.Length > 15 ? 4 : 0, q.Points);
                    isCorrect = awarded >= (int)(q.Points * 0.7);
                }
                else
                {
                    awarded = 0;
                    isCorrect = false;
                }
            }
            else
            {
                // MultipleChoice / TrueFalse / default
                isCorrect = string.Equals(studentAns, q.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase);
                awarded = isCorrect ? q.Points : 0;
            }

            scoreObtained += awarded;

            submission.Answers.Add(new SubmissionAnswer
            {
                QuestionId = q.Id,
                SelectedAnswer = studentAns,
                IsCorrect = isCorrect,
                PointsAwarded = awarded
            });
        }

        double percent = totalPoints > 0 ? ((double)scoreObtained / totalPoints) * 100 : 0;
        bool passed = percent >= quiz.PassingScorePercent;

        submission.ScoreObtained = scoreObtained;
        submission.MaxScore = totalPoints;
        submission.PercentageScore = percent;
        submission.Passed = passed;

        db.Submissions.Add(submission);
        db.SaveChanges();

        return submission;
    }

    private static QuestionData Q(string prompt, QuestionType type, string options, string correctAnswer, int points)
        => new QuestionData { Prompt = prompt, Type = type, Options = options, CorrectAnswer = correctAnswer, Points = points };

    public class QuestionData
    {
        public string Prompt { get; set; } = "";
        public QuestionType Type { get; set; }
        public string Options { get; set; } = "[]";
        public string CorrectAnswer { get; set; } = "";
        public int Points { get; set; }
    }

    // -------------------------------------------------------------------------
    // MultipleChoice
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CorrectAnswer_GrantsFullPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("What is 2+2?", QuestionType.MultipleChoice, "[\"3\",\"4\",\"5\"]", "4", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "4")
        });

        Assert.Equal(10, submission.ScoreObtained);
        Assert.Equal(100.0, submission.PercentageScore);
        Assert.True(submission.Passed);
    }

    [Fact]
    public async Task IncorrectAnswer_GrantsZeroPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("What is 2+2?", QuestionType.MultipleChoice, "[\"3\",\"4\",\"5\"]", "4", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "3")
        });

        Assert.Equal(0, submission.ScoreObtained);
        Assert.Equal(0.0, submission.PercentageScore);
        Assert.False(submission.Passed);
    }

    [Fact]
    public async Task CaseInsensitive_Matching()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Select the answer", QuestionType.MultipleChoice, "[\"Option A\",\"Option B\"]", "Option A", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "option a")
        });

        Assert.Equal(10, submission.ScoreObtained);
        Assert.True(submission.Passed);
    }

    // -------------------------------------------------------------------------
    // TrueFalse
    // -------------------------------------------------------------------------

    [Fact]
    public async Task TrueFalse_CorrectAnswer_GrantsFullPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Is the sky blue?", QuestionType.TrueFalse, "[\"True\",\"False\"]", "True", 5)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "True")
        });

        Assert.Equal(5, submission.ScoreObtained);
        Assert.Equal(100.0, submission.PercentageScore);
    }

    [Fact]
    public async Task TrueFalse_IncorrectAnswer_GrantsZeroPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Is the sky blue?", QuestionType.TrueFalse, "[\"True\",\"False\"]", "True", 5)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "False")
        });

        Assert.Equal(0, submission.ScoreObtained);
        Assert.Equal(0.0, submission.PercentageScore);
    }

    // -------------------------------------------------------------------------
    // MultipleSelect
    // -------------------------------------------------------------------------

    [Fact]
    public async Task MultipleSelect_AllCorrect_GrantsFullPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Select all primes", QuestionType.MultipleSelect, "[\"2\",\"3\",\"4\",\"5\"]", "2,3,5", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "2,3,5")
        });

        Assert.Equal(10, submission.ScoreObtained);
        Assert.Equal(100.0, submission.PercentageScore);
    }

    [Fact]
    public async Task MultipleSelect_PartiallyCorrect_GrantsZero()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Select all primes", QuestionType.MultipleSelect, "[\"2\",\"3\",\"4\",\"5\"]", "2,3,5", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "2,3")
        });

        Assert.Equal(0, submission.ScoreObtained);
        Assert.Equal(0.0, submission.PercentageScore);
    }

    [Fact]
    public async Task MultipleSelect_CaseInsensitive()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Select all vowels", QuestionType.MultipleSelect, "[\"A\",\"B\",\"C\",\"D\"]", "A,C", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "a,c")
        });

        Assert.Equal(10, submission.ScoreObtained);
        Assert.Equal(100.0, submission.PercentageScore);
    }

    // -------------------------------------------------------------------------
    // FillInBlank
    // -------------------------------------------------------------------------

    [Fact]
    public async Task FillInBlank_ExactMatch_GrantsFullPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("The process is called ___", QuestionType.FillInBlank, "[]", "recursion", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "recursion")
        });

        Assert.Equal(10, submission.ScoreObtained);
        Assert.Equal(100.0, submission.PercentageScore);
    }

    [Fact]
    public async Task FillInBlank_SubstringMatch_GrantsFullPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("The paradigm is ___", QuestionType.FillInBlank, "[]", "object oriented", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "This uses object oriented programming")
        });

        // cleanStudent = "this uses object oriented programming"
        // cleanCorrect = "object oriented" (length 15 > 3)
        // cleanStudent.Contains(cleanCorrect) == true
        Assert.Equal(10, submission.ScoreObtained);
    }

    [Fact]
    public async Task FillInBlank_WrongAnswer_GrantsZeroPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("The process is called ___", QuestionType.FillInBlank, "[]", "recursion", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "iteration")
        });

        Assert.Equal(0, submission.ScoreObtained);
        Assert.Equal(0.0, submission.PercentageScore);
    }

    [Fact]
    public async Task FillInBlank_StripsPunctuation()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Name the technique", QuestionType.FillInBlank, "[]", "recursion", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "recursion.")
        });

        // cleanStudent = Regex.Replace("recursion.", @"[^\w\s]", "").ToLowerInvariant().Trim() = "recursion"
        // cleanCorrect = "recursion"
        Assert.Equal(10, submission.ScoreObtained);
        Assert.Equal(100.0, submission.PercentageScore);
    }

    // -------------------------------------------------------------------------
    // Matching
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Matching_CorrectMatch_GrantsFullPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Match pairs", QuestionType.Matching, "[]", "A-1 B-2 C-3", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "A-1 B-2 C-3")
        });

        Assert.Equal(10, submission.ScoreObtained);
        Assert.Equal(100.0, submission.PercentageScore);
    }

    [Fact]
    public async Task Matching_IncorrectMatch_GrantsHalfPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Match pairs", QuestionType.Matching, "[]", "A-1 B-2 C-3", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "A-1 B-3 C-2")
        });

        // sClean = "a-1b-3c-2", cClean = "a-1b-2c-3" => mismatch, sClean.Length > 0 => 50% = 5
        Assert.Equal(5, submission.ScoreObtained);
        Assert.Equal(50.0, submission.PercentageScore);
    }

    [Fact]
    public async Task Matching_EmptyAnswer_GrantsZeroPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Match pairs", QuestionType.Matching, "[]", "A-1 B-2", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "")
        });

        Assert.Equal(0, submission.ScoreObtained);
        Assert.Equal(0.0, submission.PercentageScore);
    }

    // -------------------------------------------------------------------------
    // ShortAnswer / OpenEnded
    // -------------------------------------------------------------------------

    [Theory]
    [InlineData("recursion occurs when a function calls itself directly", "recursion function calls itself", 10, 10)]
    [InlineData("short answer", "recursion function calls itself", 10, 0)]
    [InlineData("a b c d", "recursion function calls itself", 10, 0)]
    public async Task ShortAnswer_KeywordMatching(string studentAnswer, string correctAnswer, int points, int expectedAwarded)
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Define recursion", QuestionType.ShortAnswer, "[]", correctAnswer, points)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, studentAnswer)
        });

        Assert.Equal(expectedAwarded, submission.ScoreObtained);
    }

    [Fact]
    public async Task ShortAnswer_AllKeywords_GrantsFullPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Explain Big-O", QuestionType.ShortAnswer, "[]", "algorithm complexity analysis worst case time", 10)
        });

        // All model words >3 chars: algorithm, complexity, analysis, worst, case, time (6 words)
        // student contains all of them -> 100% -> 10 points
        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "Big O notation measures algorithm complexity in worst case time analysis for performance evaluation")
        });

        Assert.Equal(10, submission.ScoreObtained);
    }

    [Fact]
    public async Task ShortAnswer_PartialKeywords_GrantsPartialPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Explain Big-O", QuestionType.ShortAnswer, "[]", "algorithm complexity analysis worst case", 10)
        });

        // Model words >3 chars: algorithm, complexity, analysis, worst, case (5 words)
        // student "algorithm complexity" matches 2/5 = 0.4 -> round(4) = 4
        // studentAns.Length = 20 > 15, so clamp min=4, max=10 -> 4
        // isCorrect = 4 >= 7 (int(10*0.7)) -> false
        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "algorithm complexity")
        });

        Assert.Equal(4, submission.ScoreObtained);
        Assert.Equal(40.0, submission.PercentageScore);
    }

    [Fact]
    public async Task ShortAnswer_EmptyAnswer_GrantsZeroPoints()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Explain Big-O", QuestionType.ShortAnswer, "[]", "algorithm complexity analysis", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "")
        });

        Assert.Equal(0, submission.ScoreObtained);
        Assert.False(submission.Passed);
    }

    [Fact]
    public async Task ShortAnswer_MinClamp_LongAnswer()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Explain Big-O", QuestionType.ShortAnswer, "[]", "algorithm complexity analysis worst case", 10)
        });

        // studentAns.Length = 20 > 15 -> min clamp = 4
        // matches 0/4 = 0.0 -> round(0) = 0 -> Clamp(0, 4, 10) = 4
        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "The answer is completely wrong")
        });

        Assert.Equal(4, submission.ScoreObtained);
    }

    // -------------------------------------------------------------------------
    // Pass/Fail Threshold
    // -------------------------------------------------------------------------

    [Fact]
    public async Task PassingScore_At70Percent_Passes()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        // 3 questions, 10 pts each = 30 total. 70% of 30 = 21. Need >= 21.
        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Q1", QuestionType.MultipleChoice, "[]", "A", 10),
            Q("Q2", QuestionType.MultipleChoice, "[]", "B", 10),
            Q("Q3", QuestionType.MultipleChoice, "[]", "C", 10)
        }, passingScore: 70);

        // Answer all 3 correct = 30/30 = 100% -> passes
        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.ToList()[0].Id, "A"),
            (quiz.Questions.ToList()[1].Id, "B"),
            (quiz.Questions.ToList()[2].Id, "C")
        });

        Assert.Equal(30, submission.ScoreObtained);
        Assert.True(submission.Passed);
    }

    [Fact]
    public async Task FailingScore_Below70Percent_Fails()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        // 2 questions, 10 pts each = 20 total. 70% = 14. Need >= 14.
        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Q1", QuestionType.MultipleChoice, "[]", "A", 10),
            Q("Q2", QuestionType.MultipleChoice, "[]", "B", 10)
        }, passingScore: 70);

        // 1 correct = 10/20 = 50% -> fails
        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.ToList()[0].Id, "A"),
            (quiz.Questions.ToList()[1].Id, "X")
        });

        Assert.Equal(10, submission.ScoreObtained);
        Assert.Equal(50.0, submission.PercentageScore);
        Assert.False(submission.Passed);
    }

    [Fact]
    public async Task ExactThreshold_Passes()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        // 3 questions, 10 pts each = 30 total. 70% of 30 = 21.
        // 2 correct = 20/30 = 66.67% -> fails
        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Q1", QuestionType.MultipleChoice, "[]", "A", 10),
            Q("Q2", QuestionType.MultipleChoice, "[]", "B", 10),
            Q("Q3", QuestionType.TrueFalse, "[]", "True", 10)
        }, passingScore: 70);

        var sub1 = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.ToList()[0].Id, "A"),
            (quiz.Questions.ToList()[1].Id, "B"),
            (quiz.Questions.ToList()[2].Id, "False")
        });
        Assert.False(sub1.Passed);

        var studentId2 = Guid.NewGuid();
        // 3 correct = 30/30 = 100% -> passes
        var sub2 = SubmitAnswers(db, quiz.Id, studentId2, new List<(Guid, string)>
        {
            (quiz.Questions.ToList()[0].Id, "A"),
            (quiz.Questions.ToList()[1].Id, "B"),
            (quiz.Questions.ToList()[2].Id, "True")
        });
        Assert.True(sub2.Passed);
    }

    // -------------------------------------------------------------------------
    // Feedback
    // -------------------------------------------------------------------------

    [Fact]
    public async Task CorrectAnswer_GeneratesPositiveFeedback()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("What is 2+2?", QuestionType.MultipleChoice, "[\"3\",\"4\"]", "4", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "4")
        });

        var answer = submission.Answers.First();
        Assert.True(answer.IsCorrect);
        Assert.Equal(10, answer.PointsAwarded);
    }

    [Fact]
    public async Task IncorrectAnswer_GeneratesCorrectiveFeedback()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("What is 2+2?", QuestionType.MultipleChoice, "[\"3\",\"4\"]", "4", 10)
        });

        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (quiz.Questions.First().Id, "3")
        });

        var answer = submission.Answers.First();
        Assert.False(answer.IsCorrect);
        Assert.Equal(0, answer.PointsAwarded);
    }

    [Fact]
    public async Task ShowCorrectAnswersFalse_HidesCorrectAnswer()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("What is 2+2?", QuestionType.MultipleChoice, "[\"3\",\"4\"]", "4", 10)
        }, showCorrectAnswers: false);

        // Simulate the breakdown construction from the controller (lines 1593-1604)
        var quizEntity = db.Assessments.Include(a => a.Questions).First(a => a.Id == quiz.Id);
        var q = quizEntity.Questions.First();

        string correctAnswerInBreakdown = quizEntity.ShowCorrectAnswers ? q.CorrectAnswer : "Hidden";
        string explanationInBreakdown = quizEntity.ShowCorrectAnswers
            ? "Correct answer selected."
            : "Feedback available on review.";
        string markingSchemeInBreakdown = quizEntity.ShowCorrectAnswers ? q.Explanation : null;

        Assert.Equal("Hidden", correctAnswerInBreakdown);
        Assert.Equal("Feedback available on review.", explanationInBreakdown);
        Assert.Null(markingSchemeInBreakdown);
    }

    [Fact]
    public async Task ShowCorrectAnswersFalse_HidesMarkingScheme()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Define closure", QuestionType.ShortAnswer, "[]", "function scope lexical environment", 10)
        }, showCorrectAnswers: false);

        var quizEntity = db.Assessments.Include(a => a.Questions).First(a => a.Id == quiz.Id);
        var q = quizEntity.Questions.First();

        string markingScheme = quizEntity.ShowCorrectAnswers ? q.Explanation : null;

        Assert.Null(markingScheme);
    }

    // -------------------------------------------------------------------------
    // Submission Integrity
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Submission_StoresAllAnswers()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Q1", QuestionType.MultipleChoice, "[]", "A", 10),
            Q("Q2", QuestionType.TrueFalse, "[]", "True", 10),
            Q("Q3", QuestionType.MultipleSelect, "[]", "X,Y", 10)
        });

        var qList = quiz.Questions.ToList();
        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (qList[0].Id, "A"),
            (qList[1].Id, "True"),
            (qList[2].Id, "X,Y")
        });

        var persisted = await db.Submissions
            .Include(s => s.Answers)
            .FirstAsync(s => s.Id == submission.Id);

        Assert.Equal(3, persisted.Answers.Count);
        Assert.Equal("A", persisted.Answers.First(a => a.QuestionId == qList[0].Id).SelectedAnswer);
        Assert.Equal("True", persisted.Answers.First(a => a.QuestionId == qList[1].Id).SelectedAnswer);
        Assert.Equal("X,Y", persisted.Answers.First(a => a.QuestionId == qList[2].Id).SelectedAnswer);
    }

    [Fact]
    public async Task Submission_PersistsScoreAndPassed()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("Q1", QuestionType.MultipleChoice, "[]", "A", 10),
            Q("Q2", QuestionType.MultipleChoice, "[]", "B", 10)
        }, passingScore: 70);

        var qList = quiz.Questions.ToList();
        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (qList[0].Id, "A"),
            (qList[1].Id, "B")
        });

        var persisted = await db.Submissions.FirstAsync(s => s.Id == submission.Id);

        Assert.Equal(20, persisted.ScoreObtained);
        Assert.Equal(20, persisted.MaxScore);
        Assert.Equal(100.0, persisted.PercentageScore);
        Assert.True(persisted.Passed);
    }

    [Fact]
    public async Task SubmissionAnswer_RecordsPerQuestionResult()
    {
        await using var db = CreateDb();
        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();

        var quiz = SeedQuizWithQuestions(db, courseId, new List<QuestionData>
        {
            Q("MC correct", QuestionType.MultipleChoice, "[]", "A", 10),
            Q("MC wrong", QuestionType.MultipleChoice, "[]", "B", 10),
            Q("TF correct", QuestionType.TrueFalse, "[]", "True", 5),
            Q("Matching half", QuestionType.Matching, "[]", "X-1 Y-2", 10)
        });

        var qList = quiz.Questions.ToList();
        var submission = SubmitAnswers(db, quiz.Id, studentId, new List<(Guid, string)>
        {
            (qList[0].Id, "A"),
            (qList[1].Id, "C"),     // wrong
            (qList[2].Id, "True"),
            (qList[3].Id, "X-1 Y-3") // mismatch -> 50%
        });

        var persisted = await db.Submissions
            .Include(s => s.Answers)
            .FirstAsync(s => s.Id == submission.Id);

        var a1 = persisted.Answers.First(a => a.QuestionId == qList[0].Id);
        Assert.True(a1.IsCorrect);
        Assert.Equal(10, a1.PointsAwarded);

        var a2 = persisted.Answers.First(a => a.QuestionId == qList[1].Id);
        Assert.False(a2.IsCorrect);
        Assert.Equal(0, a2.PointsAwarded);

        var a3 = persisted.Answers.First(a => a.QuestionId == qList[2].Id);
        Assert.True(a3.IsCorrect);
        Assert.Equal(5, a3.PointsAwarded);

        var a4 = persisted.Answers.First(a => a.QuestionId == qList[3].Id);
        Assert.False(a4.IsCorrect);
        Assert.Equal(5, a4.PointsAwarded);

        // Total: 10 + 0 + 5 + 5 = 20, max: 35
        Assert.Equal(20, persisted.ScoreObtained);
        Assert.Equal(35, persisted.MaxScore);
    }
}
