using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Constants;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;
using Xunit;

namespace EduFlow.Tests;

/// <summary>Course grade calculation, weights and grading scales (<see cref="GradeService"/>).</summary>
public class GradeServiceTests
{
    private sealed record Setup(ApplicationDbContext Db, GradeService Service, Course Course, User Instructor, User Student, List<Assessment> Assessments);

    private static async Task<Setup> CreateAsync(params decimal?[] weights)
    {
        var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Database.EnsureCreated(); // seeds the institution default grading policy

        var instructor = new User { FullName = "Instructor", Email = "i@test", Role = UserRole.Instructor };
        var student = new User { FullName = "Student", Email = "s@test", Role = UserRole.Student };
        var course = new Course { Code = "G-1", Title = "Grading", InstructorId = instructor.Id };
        var module = new Module { Course = course, Title = "M1" };
        db.AddRange(instructor, student, course, module);
        db.Enrollments.Add(new Enrollment { Course = course, StudentId = student.Id, Status = EnrollmentStatus.Active });

        var assessments = weights.Select((w, i) => new Assessment
        {
            Course = course,
            Module = module,
            Title = $"A{i + 1}",
            GradeWeightPercent = w,
            Status = QuizStatus.Published
        }).ToList();
        db.Assessments.AddRange(assessments);
        await db.SaveChangesAsync();

        return new Setup(db, new GradeService(db, new AuditLogWriter(db)), course, instructor, student, assessments);
    }

    private static void AddAttempt(Setup s, Assessment a, double percentage, int attemptNumber = 1, AttemptStatus status = AttemptStatus.Evaluated, int daysAgo = 0)
        => s.Db.Submissions.Add(new Submission
        {
            AssessmentId = a.Id,
            StudentId = s.Student.Id,
            AttemptNumber = attemptNumber,
            Status = status,
            PercentageScore = percentage,
            SubmittedAt = DateTime.UtcNow.AddDays(-daysAgo)
        });

    private static Task<GradingOperationResult> Activate(Setup s) => s.Service.ActivateAsync(s.Course.Id, s.Instructor.Id, "Instructor");

    // --- Grading scale --------------------------------------------------------------

    [Theory]
    [InlineData(100, "A+")]
    [InlineData(85, "A+")]
    [InlineData(84.99, "A")]
    [InlineData(80, "A")]
    [InlineData(75, "A-")]
    [InlineData(70, "B+")]
    [InlineData(65, "B")]
    [InlineData(60, "B-")]
    [InlineData(55, "C+")]
    [InlineData(50, "C")]
    [InlineData(45, "C-")]
    [InlineData(40, "D")]
    [InlineData(39.99, "F")]
    [InlineData(0, "F")]
    public async Task InstitutionDefaultScale_IsReadFromTheDatabase(decimal percentage, string expected)
    {
        var s = await CreateAsync();
        var bands = await s.Db.GradeBands.Where(b => b.GradingPolicyId == GradingDefaults.InstitutionPolicyId).ToListAsync();
        Assert.Equal(11, bands.Count);
        Assert.Equal(expected, s.Service.ResolveGrade(bands, percentage));
    }

    [Fact]
    public async Task BandValidation_RejectsGapsDuplicatesAndBadLabels()
    {
        var s = await CreateAsync();
        Assert.Empty(s.Service.ValidateBands(new[] { new GradeBandInput("Pass", 50), new GradeBandInput("Fail", 0) }));
        Assert.NotEmpty(s.Service.ValidateBands(new[] { new GradeBandInput("Pass", 50) }));                     // no 0% band
        Assert.NotEmpty(s.Service.ValidateBands(new[] { new GradeBandInput("A", 50), new GradeBandInput("A", 0) })); // duplicate label
        Assert.NotEmpty(s.Service.ValidateBands(new[] { new GradeBandInput("A", 0), new GradeBandInput("B", 0) }));  // duplicate threshold
        Assert.NotEmpty(s.Service.ValidateBands(new[] { new GradeBandInput("<script>", 0) }));
        Assert.NotEmpty(s.Service.ValidateBands(new[] { new GradeBandInput("A", 101), new GradeBandInput("F", 0) }));
    }

    // --- Weights and activation -------------------------------------------------------

    [Fact]
    public async Task Activation_RequiresWeightsTotallingExactly100_WithoutNormalizing()
    {
        var s = await CreateAsync(10, 20, 30);
        var result = await Activate(s);
        Assert.Equal(GradingError.WeightsDoNotTotal100, result.Error);
        Assert.Contains("60", result.Message);

        // Nothing was normalized or auto-filled.
        Assert.Equal(new decimal?[] { 10, 20, 30 }, await s.Db.Assessments.OrderBy(a => a.Title).Select(a => a.GradeWeightPercent).ToListAsync());
        Assert.Equal(GradingConfigurationStatus.Draft, (await s.Db.CourseGradingConfigurations.SingleAsync()).Status);
    }

    [Fact]
    public async Task DraftWeights_MayBeIncomplete_ButNeverExceed100()
    {
        var s = await CreateAsync(null, null);
        var save = (decimal?[] w) => s.Service.SaveConfigurationAsync(s.Course.Id,
            new GradingConfigurationInput(AttemptScoringRule.Highest,
                new[] { new AssessmentWeightInput(s.Assessments[0].Id, w[0]), new AssessmentWeightInput(s.Assessments[1].Id, w[1]) }),
            s.Instructor.Id, "Instructor");

        Assert.True((await save(new decimal?[] { 30, 20 })).Succeeded);
        Assert.Equal(GradingError.InvalidWeights, (await save(new decimal?[] { 70, 40 })).Error);
        Assert.Equal(GradingError.InvalidWeights, (await save(new decimal?[] { 0, 20 })).Error);
    }

    [Fact]
    public async Task ActiveGrading_RejectsWeightChangesThatBreak100()
    {
        var s = await CreateAsync(40, 60);
        Assert.True((await Activate(s)).Succeeded);

        var result = await s.Service.SaveConfigurationAsync(s.Course.Id,
            new GradingConfigurationInput(AttemptScoringRule.Highest, new[] { new AssessmentWeightInput(s.Assessments[0].Id, 30) }),
            s.Instructor.Id, "Instructor");
        Assert.Equal(GradingError.WeightsDoNotTotal100, result.Error);
    }

    // --- Configuration ------------------------------------------------------------------

    [Fact]
    public async Task GetOrCreateConfiguration_WhenLosingTheRaceToInsert_ReadsTheWinnersRow()
    {
        // Regression: the grading panel loads twice concurrently (React StrictMode
        // double-effect), so two GET /courses/{id}/grading requests race to insert the single
        // configuration row allowed per course (unique index IX_CourseGradingConfigurations_CourseId).
        // The loser used to surface the DbUpdateException as HTTP 500 while the winner rendered
        // the panel; it must instead re-read the winner's row.
        var databaseName = Guid.NewGuid().ToString();
        var store = new InMemoryDatabaseRoot(); // shared: the racing contexts build different
                                                // options (one has the interceptor), so the
                                                // name-only store would not be shared.

        using var seedDb = NewContext(databaseName, store);
        seedDb.Database.EnsureCreated(); // seeds the institution default grading policy

        var instructor = new User { FullName = "Instructor", Email = "i@test", Role = UserRole.Instructor };
        var course = new Course { Code = "G-1", Title = "Grading", InstructorId = instructor.Id };
        seedDb.AddRange(instructor, course);
        await seedDb.SaveChangesAsync();

        var raced = false;
        Guid winnerId = default;
        var interceptor = new RaceLosingInsertInterceptor(async () =>
        {
            raced = true;
            // The competing request commits its configuration row first...
            using var rivalDb = NewContext(databaseName, store);
            var rival = new CourseGradingConfiguration
            {
                CourseId = course.Id,
                GradingPolicyId = GradingDefaults.InstitutionPolicyId
            };
            rivalDb.CourseGradingConfigurations.Add(rival);
            await rivalDb.SaveChangesAsync();
            winnerId = rival.Id;
            // ...so this request's insert dies on the unique index, as it does on Postgres.
            throw new DbUpdateException(
                "Simulated unique index violation on IX_CourseGradingConfigurations_CourseId.");
        });

        using var racedContext = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName, store, null)
            .AddInterceptors(interceptor)
            .Options);
        var service = new GradeService(racedContext, new AuditLogWriter(racedContext));

        var configuration = await service.GetOrCreateConfigurationAsync(course.Id);

        Assert.True(raced, "the simulated losing insert must have run.");
        Assert.NotNull(configuration);
        Assert.Equal(winnerId, configuration!.Id); // the winner's row, not a second insert.
        Assert.Equal(GradingDefaults.InstitutionPolicyId, configuration.GradingPolicyId);

        using var assertDb = NewContext(databaseName, store);
        Assert.Equal(1, await assertDb.CourseGradingConfigurations.CountAsync(c => c.CourseId == course.Id));
    }

    private static ApplicationDbContext NewContext(string databaseName, InMemoryDatabaseRoot store)
        => new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName, store, null).Options);

    /// <summary>Throws a <see cref="DbUpdateException"/> instead of the first insert, as the
    /// unique index on <c>CourseGradingConfigurations.CourseId</c> would on a real database.</summary>
    private sealed class RaceLosingInsertInterceptor(Func<Task> losingInsert) : SaveChangesInterceptor
    {
        private bool _fired;

        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            if (!_fired)
            {
                _fired = true;
                await losingInsert();
            }
            return result;
        }
    }

    // --- Calculation ------------------------------------------------------------------

    [Fact]
    public async Task CourseGrade_IsTheWeightedSumOfAssessmentResults()
    {
        // Quiz 10%, Assignment 20%, Midterm 30%, Final 40%
        var s = await CreateAsync(10, 20, 30, 40);
        AddAttempt(s, s.Assessments[0], 90);   // 9
        AddAttempt(s, s.Assessments[1], 80);   // 16
        AddAttempt(s, s.Assessments[2], 70);   // 21
        AddAttempt(s, s.Assessments[3], 60);   // 24
        await s.Db.SaveChangesAsync();
        Assert.True((await Activate(s)).Succeeded);

        var result = await s.Db.CourseResults.SingleAsync();
        Assert.Equal(70m, result.CoursePercentage);
        Assert.Equal("B+", result.CalculatedGrade);
        Assert.True(result.IsComplete);
        Assert.Equal(100m, result.AssessedWeight);
    }

    [Fact]
    public async Task MissingResults_CountAsZero_WhileCurrentPercentageCoversAssessedWorkOnly()
    {
        var s = await CreateAsync(40, 60);
        AddAttempt(s, s.Assessments[0], 90);
        await s.Db.SaveChangesAsync();
        Assert.True((await Activate(s)).Succeeded);

        var result = await s.Db.CourseResults.SingleAsync();
        Assert.Equal(36m, result.CoursePercentage);
        Assert.Equal(90m, result.CurrentPercentage);
        Assert.Equal("F", result.CalculatedGrade);
        Assert.False(result.IsComplete);
    }

    [Fact]
    public async Task OnlyEvaluatedAttemptsCount_AndTheAttemptRuleIsApplied()
    {
        var s = await CreateAsync(100);
        AddAttempt(s, s.Assessments[0], 50, attemptNumber: 1, daysAgo: 2);
        AddAttempt(s, s.Assessments[0], 80, attemptNumber: 2, daysAgo: 1);
        AddAttempt(s, s.Assessments[0], 100, attemptNumber: 3, status: AttemptStatus.Evaluating);
        await s.Db.SaveChangesAsync();
        Assert.True((await Activate(s)).Succeeded);
        Assert.Equal(80m, (await s.Db.CourseResults.SingleAsync()).CoursePercentage);

        AddAttempt(s, s.Assessments[0], 60, attemptNumber: 4, daysAgo: 0);
        await s.Db.SaveChangesAsync();
        await s.Service.SaveConfigurationAsync(s.Course.Id,
            new GradingConfigurationInput(AttemptScoringRule.Latest, Array.Empty<AssessmentWeightInput>()), s.Instructor.Id, "Instructor");
        Assert.Equal(60m, (await s.Db.CourseResults.SingleAsync()).CoursePercentage);
    }

    [Fact]
    public async Task CustomCourseScale_ReplacesTheDefaultForThatCourse()
    {
        var s = await CreateAsync(100);
        AddAttempt(s, s.Assessments[0], 55);
        await s.Db.SaveChangesAsync();
        var save = await s.Service.SaveConfigurationAsync(s.Course.Id,
            new GradingConfigurationInput(AttemptScoringRule.Highest, Array.Empty<AssessmentWeightInput>(),
                new[] { new GradeBandInput("Pass", 50), new GradeBandInput("Fail", 0) }),
            s.Instructor.Id, "Instructor");
        Assert.True(save.Succeeded);
        Assert.True((await Activate(s)).Succeeded);

        Assert.Equal("Pass", (await s.Db.CourseResults.SingleAsync()).CalculatedGrade);
        // The institution default is untouched.
        Assert.Equal(11, await s.Db.GradeBands.CountAsync(b => b.GradingPolicyId == GradingDefaults.InstitutionPolicyId));
    }

    // --- Overrides ----------------------------------------------------------------------

    [Fact]
    public async Task Override_RequiresAReasonAndAKnownGrade_AndIsAudited()
    {
        var s = await CreateAsync(100);
        AddAttempt(s, s.Assessments[0], 62);
        await s.Db.SaveChangesAsync();
        Assert.True((await Activate(s)).Succeeded);

        Assert.Equal(GradingError.ReasonRequired,
            (await s.Service.OverrideGradeAsync(s.Course.Id, s.Student.Id, "A", "", s.Instructor.Id, "Instructor")).Error);
        Assert.Equal(GradingError.UnknownGrade,
            (await s.Service.OverrideGradeAsync(s.Course.Id, s.Student.Id, "Z", "Typo", s.Instructor.Id, "Instructor")).Error);

        var ok = await s.Service.OverrideGradeAsync(s.Course.Id, s.Student.Id, "B", "Medical consideration approved by faculty.", s.Instructor.Id, "Instructor");
        Assert.True(ok.Succeeded);

        var result = await s.Db.CourseResults.Include(r => r.Overrides).SingleAsync();
        Assert.Equal("B-", result.CalculatedGrade);
        Assert.Equal("B", result.EffectiveGrade);
        var entry = Assert.Single(result.Overrides);
        Assert.Equal("B-", entry.PreviousGrade);
        Assert.Equal("B", entry.NewGrade);
        Assert.Equal(s.Instructor.Id, entry.ActorId);
        Assert.Equal(1, await s.Db.AuditLogs.CountAsync(a => a.Action == "CourseResult.Overridden"));

        // Recalculation never discards the override.
        await s.Service.RecalculateCourseAsync(s.Course.Id);
        Assert.Equal("B", (await s.Db.CourseResults.SingleAsync()).EffectiveGrade);
    }
}
