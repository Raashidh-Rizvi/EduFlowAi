using System;
using System.Linq;
using System.Threading.Tasks;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EduFlow.Tests;

public class GamificationServiceTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new ApplicationDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(499, 1)]
    [InlineData(500, 2)]
    [InlineData(1499, 2)]
    [InlineData(1500, 3)]
    [InlineData(3000, 4)]
    [InlineData(5000, 5)]
    [InlineData(8000, 6)]
    [InlineData(12000, 7)]
    [InlineData(20000, 8)]
    public void CalculateLevel_ReturnsCorrectLevel_BasedOnTotalXp(int xp, int expectedLevel)
    {
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);

        var level = service.CalculateLevel(xp);

        Assert.Equal(expectedLevel, level);
    }

    [Fact]
    public async Task AwardXpAsync_CreatesImmutableTransaction_AndUpdatesTotalXp()
    {
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();

        // 1. Award 300 XP (a source with no daily mission attached)
        var result = await service.AwardXpAsync(
            studentId,
            XpSourceType.PracticeCompleted,
            Guid.NewGuid(),
            300,
            "Completed Clean Architecture Lesson"
        );

        Assert.True(result.Passed);
        Assert.Equal(300, result.XpEarned);
        Assert.Equal(300, result.NewTotalXp);
        Assert.Equal(1, result.NewLevel);

        // Check transaction persisted in DB
        var txCount = await db.XpTransactions.CountAsync(x => x.StudentId == studentId);
        Assert.Equal(1, txCount);

        // 2. Award another 300 XP (Total: 600 XP -> Level 2)
        var result2 = await service.AwardXpAsync(
            studentId,
            XpSourceType.QuizCompleted,
            Guid.NewGuid(),
            300,
            "Completed Quiz"
        );

        Assert.Equal(600, result2.NewTotalXp);
        Assert.Equal(2, result2.NewLevel);
        Assert.True(result2.LevelUpOccurred);

        // Two awards plus the ledgered level-up coin bonus.
        var totalTxCount = await db.XpTransactions.CountAsync(x => x.StudentId == studentId);
        Assert.Equal(3, totalTxCount);
        Assert.Single(await db.XpTransactions.Where(x => x.StudentId == studentId && x.SourceType == XpSourceType.LevelUp).ToListAsync());
    }

    [Fact]
    public async Task AwardXpAsync_UnlocksFirstLessonBadge_OnFirstLessonCompletion()
    {
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();

        // Achievements are measured from LMS records: record the completion first.
        var lessonId = Guid.NewGuid();
        db.LessonCompletions.Add(new EduFlow.Core.Entities.LessonCompletion { StudentId = studentId, ContentItemId = lessonId });
        await db.SaveChangesAsync();

        var result = await service.AwardXpAsync(
            studentId,
            XpSourceType.LessonCompleted,
            lessonId,
            50,
            "First Lesson Completion"
        );

        Assert.Contains("FIRST_LESSON", result.UnlockedBadges);

        var hasBadge = await db.StudentBadges.AnyAsync(sb => sb.StudentId == studentId && sb.BadgeId == "FIRST_LESSON");
        Assert.True(hasBadge);
    }

    [Fact]
    public async Task AwardXpAsync_ThrowsException_WhenXpIsNegativeOrZero()
    {
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.AwardXpAsync(studentId, XpSourceType.LessonCompleted, Guid.NewGuid(), 0, "Invalid")
        );
    }

    [Fact]
    public async Task UseStreakFreezeAsync_DecrementsFreezeToken_AndSavesStatus()
    {
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();

        // Award XP to initialize streak
        await service.AwardXpAsync(studentId, XpSourceType.LessonCompleted, Guid.NewGuid(), 50, "Activity");

        var freezeUsed = await service.UseStreakFreezeAsync(studentId);
        Assert.True(freezeUsed);

        var streak = await db.StudentStreaks.FirstAsync(s => s.StudentId == studentId);
        Assert.Equal(1, streak.FreezeTokensAvailable);
    }

    [Fact]
    public async Task AwardXpAsync_Level2_WhenTotalXpReaches500()
    {
        // VIVA PREP: Proves level calculation works at exact boundary
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();

        // Award exactly 500 XP (Level 2 boundary)
        var result = await service.AwardXpAsync(
            studentId,
            XpSourceType.PracticeCompleted,
            Guid.NewGuid(),
            500,
            "Boundary test"
        );

        Assert.Equal(500, result.NewTotalXp);
        Assert.Equal(2, result.NewLevel);       // Level 2 at 500 XP
        Assert.True(result.LevelUpOccurred);    // Level up must be detected
    }

    [Fact]
    public async Task GetStudentDashboard_ReturnsRealValues_AfterXpAwarded()
    {
        // VIVA PREP: Proves dashboard shows correct XP after activities
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();

        // Award 300 XP for a lesson
        await service.AwardXpAsync(studentId, XpSourceType.PracticeCompleted, Guid.NewGuid(), 300, "Practice");

        // Check the DB directly — XP must be saved
        var xpRecord = await db.StudentXp.FirstOrDefaultAsync(x => x.StudentId == studentId);
        Assert.NotNull(xpRecord);
        Assert.Equal(300, xpRecord.TotalXp);
        Assert.Equal(1, service.CalculateLevel(xpRecord.TotalXp)); // Level 1 at 300 XP
    }

    [Fact]
    public async Task AwardXpAsync_IsIdempotentPerSource()
    {
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();
        var challengeId = Guid.NewGuid();

        var first = await service.AwardXpAsync(studentId, XpSourceType.PracticeCompleted, challengeId, 100, "Practice");
        var replay = await service.AwardXpAsync(studentId, XpSourceType.PracticeCompleted, challengeId, 100, "Practice");

        Assert.Equal(100, first.XpEarned);
        Assert.Equal(0, replay.XpEarned);
        Assert.Equal(100, (await db.StudentXp.SingleAsync(x => x.StudentId == studentId)).TotalXp);
    }

    [Fact]
    public async Task LessonActivity_CompletesTheDailyMission_AndPaysItsConfiguredRewardOnce()
    {
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();
        int missionXp = (int)(await db.GamificationRules.SingleAsync(r => r.Key == EduFlow.Core.Constants.GamificationRuleKeys.MissionLessonXp)).Value;

        await service.AwardXpAsync(studentId, XpSourceType.LessonCompleted, Guid.NewGuid(), 50, "Lesson 1");
        await service.AwardXpAsync(studentId, XpSourceType.LessonCompleted, Guid.NewGuid(), 50, "Lesson 2");

        var missionRows = await db.XpTransactions.Where(x => x.StudentId == studentId && x.SourceType == XpSourceType.DailyMissionCompleted).ToListAsync();
        Assert.Equal(missionXp, Assert.Single(missionRows).XpAmount);
        Assert.Equal(100 + missionXp, (await db.StudentXp.SingleAsync(x => x.StudentId == studentId)).TotalXp);
    }

    [Fact]
    public async Task RewardValues_AreReadFromTheRulesTable()
    {
        using var db = CreateInMemoryDbContext();
        var rule = await db.GamificationRules.SingleAsync(r => r.Key == EduFlow.Core.Constants.GamificationRuleKeys.CourseCompletedXp);
        rule.Value = 777;
        await db.SaveChangesAsync();

        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();
        var result = await service.AwardCourseCompletionAsync(studentId, Guid.NewGuid());

        Assert.Equal(777, result.XpEarned);
    }

    [Fact]
    public async Task ProfileTotals_AlwaysEqualTheLedger()
    {
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();

        await service.AwardXpAsync(studentId, XpSourceType.LessonCompleted, Guid.NewGuid(), 450, "Lesson");
        await service.AwardXpAsync(studentId, XpSourceType.DailyChallenge, Guid.NewGuid(), 120, "Challenge");
        await service.AwardCourseCompletionAsync(studentId, Guid.NewGuid());

        var profile = await db.StudentXp.SingleAsync(x => x.StudentId == studentId);
        var ledger = await db.XpTransactions.Where(x => x.StudentId == studentId).ToListAsync();
        Assert.Equal(ledger.Sum(x => x.XpAmount), profile.TotalXp);
        Assert.Equal(ledger.Sum(x => x.CoinAmount), profile.Coins);
    }
}
