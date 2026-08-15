using System;
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

        // 1. Award 300 XP
        var result = await service.AwardXpAsync(
            studentId,
            XpSourceType.LessonCompleted,
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

        var totalTxCount = await db.XpTransactions.CountAsync(x => x.StudentId == studentId);
        Assert.Equal(2, totalTxCount);
    }

    [Fact]
    public async Task AwardXpAsync_UnlocksFirstLessonBadge_OnFirstLessonCompletion()
    {
        using var db = CreateInMemoryDbContext();
        var service = new GamificationService(db);
        var studentId = Guid.NewGuid();

        var result = await service.AwardXpAsync(
            studentId,
            XpSourceType.LessonCompleted,
            Guid.NewGuid(),
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
}
