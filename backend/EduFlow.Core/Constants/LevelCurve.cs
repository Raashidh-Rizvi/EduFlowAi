using System.Collections.Generic;
using System.Linq;

namespace EduFlow.Core.Constants;

/// <summary>
/// Single source of truth for the gamification level curve (8 tiers).
/// Mirrors the shape of <see cref="EduFlow.Core.Entities.Level"/> so both the
/// EF Core seed data (ApplicationDbContext.SeedData) and the runtime level
/// calculations (GamificationService.CalculateLevel / GetLevelBounds) derive
/// from the exact same numbers instead of hand-typing the curve twice.
/// </summary>
public sealed record LevelCurveEntry(
    int Level,
    string Name,
    int MinXp,
    int MaxXp,
    int RewardCoins,
    string BadgeIcon
);

public static class LevelCurve
{
    public static readonly IReadOnlyList<LevelCurveEntry> Tiers = new List<LevelCurveEntry>
    {
        new(1, "Novice Explorer", 0, 499, 50, "🌱"),
        new(2, "Code Apprentice", 500, 1499, 100, "⚡"),
        new(3, "Logic Adept", 1500, 2999, 150, "🧩"),
        new(4, "Data Scholar", 3000, 4999, 200, "📚"),
        new(5, "Algorithm Knight", 5000, 7999, 300, "⚔️"),
        new(6, "Architecture Master", 8000, 11999, 400, "🏰"),
        new(7, "AI Grandmaster", 12000, 19999, 500, "👑"),
        new(8, "EduFlow Legend", 20000, 999999, 1000, "🌟")
    };

    /// <summary>
    /// Resolves the level number for a given total XP. XP at or beyond the
    /// final tier's minimum caps at the final (Legend) level.
    /// </summary>
    public static int GetLevelForXp(int totalXp)
    {
        for (int i = Tiers.Count - 1; i >= 0; i--)
        {
            if (totalXp >= Tiers[i].MinXp)
            {
                return Tiers[i].Level;
            }
        }

        return Tiers[0].Level;
    }

    /// <summary>
    /// Resolves the curve entry for a given level number. Levels below the
    /// first tier clamp to the first tier; levels beyond the last tier clamp
    /// to the last (Legend) tier.
    /// </summary>
    public static LevelCurveEntry GetEntryForLevel(int level)
    {
        var match = Tiers.FirstOrDefault(t => t.Level == level);
        if (match != null)
        {
            return match;
        }

        return level < Tiers[0].Level ? Tiers[0] : Tiers[^1];
    }
}
