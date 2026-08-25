using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Data;

public static class DbInitializer
{
    /// <summary>
    /// Applies any pending EF Core migrations, creating the database if it doesn't exist yet.
    /// All seed data (Levels, Badges, demo Users, baseline StudentXp/StudentStreak rows) is defined
    /// via ModelBuilder.HasData() in ApplicationDbContext.SeedData and is applied automatically as
    /// part of the migration -- there is no separate runtime seeding step.
    /// </summary>
    public static void Initialize(ApplicationDbContext context)
    {
        context.Database.Migrate();
    }
}
