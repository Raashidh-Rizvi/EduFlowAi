using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services.Gamification;

/// <summary>
/// Unlocks achievements (badges) whose persisted criteria and threshold are met, measured from
/// real LMS records. Each badge's XP bonus is paid once through the points ledger.
/// </summary>
public class AchievementService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly PointsLedger _ledger;

    public AchievementService(ApplicationDbContext dbContext, PointsLedger ledger)
    {
        _dbContext = dbContext;
        _ledger = ledger;
    }

    /// <returns>Ids of badges unlocked by this evaluation.</returns>
    public async Task<List<string>> EvaluateAsync(Guid studentId, CancellationToken ct = default)
    {
        var unlockedIds = (await _dbContext.StudentBadges
                .Where(sb => sb.StudentId == studentId)
                .Select(sb => sb.BadgeId)
                .ToListAsync(ct))
            .Concat(_dbContext.StudentBadges.Local.Where(sb => sb.StudentId == studentId).Select(sb => sb.BadgeId))
            .ToHashSet();

        var candidates = await _dbContext.Badges.AsNoTracking()
            .Where(b => b.Criteria != AchievementCriteria.None)
            .ToListAsync(ct);

        var measures = new Dictionary<AchievementCriteria, int>();
        var newlyUnlocked = new List<string>();
        foreach (var badge in candidates.Where(b => !unlockedIds.Contains(b.Id)))
        {
            if (!measures.TryGetValue(badge.Criteria, out var value))
            {
                value = await MeasureAsync(studentId, badge.Criteria, ct);
                measures[badge.Criteria] = value;
            }
            if (value < Math.Max(1, badge.Threshold)) continue;

            _dbContext.StudentBadges.Add(new StudentBadge { StudentId = studentId, BadgeId = badge.Id, UnlockedAt = DateTime.UtcNow });
            await _ledger.GrantAsync(studentId, new[]
            {
                new LedgerEntry(XpSourceType.BadgeUnlocked, studentId, Math.Max(0, badge.XpBonus), 0,
                    $"Achievement unlocked: {badge.Title}", $"badge:{badge.Id}")
            }, ct);
            newlyUnlocked.Add(badge.Id);
        }
        return newlyUnlocked;
    }

    private async Task<int> MeasureAsync(Guid studentId, AchievementCriteria criteria, CancellationToken ct) => criteria switch
    {
        AchievementCriteria.LessonsCompleted => await _dbContext.LessonCompletions
            .CountAsync(lc => lc.StudentId == studentId && lc.ContentItemId != null, ct),

        AchievementCriteria.StreakDays => (_dbContext.StudentStreaks.Local.FirstOrDefault(s => s.StudentId == studentId)
            ?? await _dbContext.StudentStreaks.AsNoTracking().FirstOrDefaultAsync(s => s.StudentId == studentId, ct))?.CurrentStreak ?? 0,

        AchievementCriteria.PerfectScores => await _dbContext.Submissions
            .CountAsync(s => s.StudentId == studentId && s.Status == AttemptStatus.Evaluated && s.PercentageScore >= 100, ct),

        AchievementCriteria.AssessmentsPassed => await _dbContext.Submissions
            .Where(s => s.StudentId == studentId && s.Status == AttemptStatus.Evaluated && s.Passed)
            .Select(s => s.AssessmentId).Distinct().CountAsync(ct),

        AchievementCriteria.BossAssessmentsPassed => await _dbContext.Submissions
            .Where(s => s.StudentId == studentId && s.Status == AttemptStatus.Evaluated && s.Passed
                && s.Assessment!.Difficulty == DifficultyLevel.Boss)
            .Select(s => s.AssessmentId).Distinct().CountAsync(ct),

        AchievementCriteria.ImprovementBonusesEarned =>
            _dbContext.XpTransactions.Local.Count(x => x.StudentId == studentId && x.SourceType == XpSourceType.ImprovementBonus
                && _dbContext.Entry(x).State == EntityState.Added)
            + await _dbContext.XpTransactions.CountAsync(x => x.StudentId == studentId && x.SourceType == XpSourceType.ImprovementBonus, ct),

        AchievementCriteria.ChallengesCompleted => await _dbContext.StudentChallenges
            .CountAsync(sc => sc.StudentId == studentId && sc.Status == ChallengeStatus.Completed, ct),

        AchievementCriteria.CoursesCompleted => await _dbContext.Enrollments
            .CountAsync(e => e.StudentId == studentId && e.Status == EnrollmentStatus.Completed, ct),

        AchievementCriteria.TeamMemberships => await _dbContext.TeamMembers
            .CountAsync(tm => tm.StudentId == studentId, ct),

        _ => 0
    };
}
