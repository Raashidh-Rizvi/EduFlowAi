using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Constants;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services.Gamification;

/// <summary>Reads gamification rule values from the database (once per scope).</summary>
public class GamificationRuleSet
{
    private readonly ApplicationDbContext _dbContext;
    private Dictionary<string, decimal>? _values;

    public GamificationRuleSet(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<decimal> GetAsync(string key, CancellationToken ct = default)
    {
        _values ??= await _dbContext.GamificationRules.AsNoTracking().ToDictionaryAsync(r => r.Key, r => r.Value, ct);
        return _values.TryGetValue(key, out var value)
            ? value
            : throw new InvalidOperationException($"Gamification rule '{key}' is not configured.");
    }

    public async Task<int> GetIntAsync(string key, CancellationToken ct = default)
        => (int)Math.Round(await GetAsync(key, ct));

    /// <summary>Drops cached values after a rule changes in this scope.</summary>
    public void Invalidate() => _values = null;
}

/// <param name="IdempotencyKey">Same key, same student = the entry is never written twice.</param>
public sealed record LedgerEntry(
    XpSourceType SourceType,
    Guid SourceId,
    int Xp,
    int Coins,
    string Description,
    string IdempotencyKey);

public sealed record LedgerResult(
    int XpAwarded,
    int CoinsAwarded,
    int NewTotalXp,
    int NewCoins,
    int OldLevel,
    int NewLevel,
    IReadOnlyList<LedgerEntry> Written)
{
    public bool LevelUp => NewLevel > OldLevel;
}

/// <summary>
/// The only writer of points. Every award becomes ledger rows (<see cref="XpTransaction"/>);
/// the <see cref="StudentXp"/> aggregate (XP, coins, level) is updated from those rows only.
/// Entries whose idempotency key was already paid are skipped.
/// </summary>
public class PointsLedger
{
    private readonly ApplicationDbContext _dbContext;
    private readonly GamificationRuleSet _rules;

    public PointsLedger(ApplicationDbContext dbContext, GamificationRuleSet rules)
    {
        _dbContext = dbContext;
        _rules = rules;
    }

    public async Task<bool> WasPaidAsync(Guid studentId, string idempotencyKey, CancellationToken ct = default)
        => _dbContext.XpTransactions.Local.Any(x => x.StudentId == studentId && x.IdempotencyKey == idempotencyKey)
           || await _dbContext.XpTransactions.AnyAsync(x => x.StudentId == studentId && x.IdempotencyKey == idempotencyKey, ct);

    public async Task<LedgerResult> GrantAsync(Guid studentId, IEnumerable<LedgerEntry> entries, CancellationToken ct = default)
    {
        decimal multiplier = await _rules.GetAsync(GamificationRuleKeys.XpMultiplier, ct);

        var written = new List<LedgerEntry>();
        foreach (var entry in entries)
        {
            if (entry.Xp < 0 || entry.Coins < 0)
                throw new ArgumentException("Ledger entries cannot be negative.", nameof(entries));
            if ((entry.Xp == 0 && entry.Coins == 0) || await WasPaidAsync(studentId, entry.IdempotencyKey, ct))
                continue;

            int xp = (int)Math.Round(entry.Xp * multiplier);
            var applied = entry with { Xp = xp };
            _dbContext.XpTransactions.Add(new XpTransaction
            {
                StudentId = studentId,
                SourceType = applied.SourceType,
                SourceId = applied.SourceId,
                XpAmount = applied.Xp,
                CoinAmount = applied.Coins,
                Description = applied.Description,
                IdempotencyKey = applied.IdempotencyKey
            });
            written.Add(applied);
        }

        var profile = await _dbContext.StudentXp.FirstOrDefaultAsync(s => s.StudentId == studentId, ct)
            ?? _dbContext.StudentXp.Local.FirstOrDefault(s => s.StudentId == studentId);
        if (profile == null)
        {
            profile = new StudentXp { StudentId = studentId, TotalXp = 0, CurrentLevel = 1, Coins = 0 };
            _dbContext.StudentXp.Add(profile);
        }

        int oldLevel = profile.CurrentLevel;
        profile.TotalXp += written.Sum(e => e.Xp);
        profile.Coins += written.Sum(e => e.Coins);
        int newLevel = LevelCurve.GetLevelForXp(profile.TotalXp);

        if (newLevel > oldLevel)
        {
            int perLevel = await _rules.GetIntAsync(GamificationRuleKeys.LevelUpCoinsPerLevel, ct);
            var levelUp = new LedgerEntry(XpSourceType.LevelUp, studentId, 0, newLevel * perLevel,
                $"Reached level {newLevel}", $"level-up:{newLevel}");
            if (!await WasPaidAsync(studentId, levelUp.IdempotencyKey, ct))
            {
                _dbContext.XpTransactions.Add(new XpTransaction
                {
                    StudentId = studentId,
                    SourceType = levelUp.SourceType,
                    SourceId = levelUp.SourceId,
                    CoinAmount = levelUp.Coins,
                    Description = levelUp.Description,
                    IdempotencyKey = levelUp.IdempotencyKey
                });
                profile.Coins += levelUp.Coins;
                written.Add(levelUp);
            }
        }

        profile.CurrentLevel = Math.Max(oldLevel, newLevel);
        profile.UpdatedAt = DateTime.UtcNow;

        return new LedgerResult(
            written.Sum(e => e.Xp), written.Sum(e => e.Coins), profile.TotalXp, profile.Coins, oldLevel, profile.CurrentLevel, written);
    }
}
