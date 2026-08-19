using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Data;

public static class DbInitializer
{
    public static void Initialize(ApplicationDbContext context)
    {
        // 1. Ensure all database tables and constraints are created in PostgreSQL
        try
        {
            var script = context.Database.GenerateCreateScript();
            var statements = script.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var stmt in statements)
            {
                if (string.IsNullOrWhiteSpace(stmt)) continue;
                try
                {
                    var safeStmt = stmt.Replace("CREATE TABLE \"", "CREATE TABLE IF NOT EXISTS \"")
                                       .Replace("CREATE UNIQUE INDEX \"", "CREATE UNIQUE INDEX IF NOT EXISTS \"")
                                       .Replace("CREATE INDEX \"", "CREATE INDEX IF NOT EXISTS \"");
                    context.Database.ExecuteSqlRaw(safeStmt);
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Error creating table: " + ex.Message);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error generating script: " + ex.Message);
        }

        // Patch schema updates for existing tables
        try
        {
            context.Database.ExecuteSqlRaw(@"
                ALTER TABLE ""Assessments"" ADD COLUMN IF NOT EXISTS ""AttemptsAllowed"" integer NOT NULL DEFAULT 3;
                ALTER TABLE ""Assessments"" ADD COLUMN IF NOT EXISTS ""RandomizeQuestions"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Assessments"" ADD COLUMN IF NOT EXISTS ""RandomizeOptions"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Assessments"" ADD COLUMN IF NOT EXISTS ""FeedbackMode"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""Assessments"" ADD COLUMN IF NOT EXISTS ""ShowCorrectAnswers"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Assessments"" ADD COLUMN IF NOT EXISTS ""GeneratedByAI"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Assessments"" ADD COLUMN IF NOT EXISTS ""GenerationWorkflowId"" text;
                ALTER TABLE ""Assessments"" ADD COLUMN IF NOT EXISTS ""Difficulty"" integer NOT NULL DEFAULT 1;
                ALTER TABLE ""Assessments"" ADD COLUMN IF NOT EXISTS ""TimeLimitSeconds"" integer NOT NULL DEFAULT 900;
                
                ALTER TABLE ""Questions"" ADD COLUMN IF NOT EXISTS ""Difficulty"" integer NOT NULL DEFAULT 1;
                ALTER TABLE ""Questions"" ADD COLUMN IF NOT EXISTS ""SourceContentId"" uuid;
                ALTER TABLE ""Questions"" ADD COLUMN IF NOT EXISTS ""LearningObjective"" text;
                ALTER TABLE ""Questions"" ADD COLUMN IF NOT EXISTS ""MetadataJson"" text NOT NULL DEFAULT '{}';

                ALTER TABLE ""Courses"" ADD COLUMN IF NOT EXISTS ""Difficulty"" integer NOT NULL DEFAULT 1;
                ALTER TABLE ""Courses"" ADD COLUMN IF NOT EXISTS ""Status"" text NOT NULL DEFAULT 'Published';
            ");
        }
        catch { }

        var adminId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var instructorId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var student1Id = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var defaultPasswordHash = "$2a$11$e8.Z/qUj5k.P5jRzY9E4ee46h2Q9D7G5m3D6Q9a5Z8r.X6m8Z4K8S"; // "Password123!"

        // 2. Ensure Default Users
        if (!context.Users.Any())
        {
            context.Users.AddRange(
                new User
                {
                    Id = adminId,
                    FullName = "System Administrator",
                    Email = "admin@eduflow.ai",
                    PasswordHash = defaultPasswordHash,
                    Role = UserRole.Admin,
                    IsActive = true
                },
                new User
                {
                    Id = instructorId,
                    FullName = "Dr. Sarah Jenkins",
                    Email = "instructor@eduflow.ai",
                    PasswordHash = defaultPasswordHash,
                    Role = UserRole.Instructor,
                    IsActive = true
                },
                new User
                {
                    Id = student1Id,
                    FullName = "Alex Rivera",
                    Email = "student@eduflow.ai",
                    PasswordHash = defaultPasswordHash,
                    Role = UserRole.Student,
                    IsActive = true
                }
            );
            context.SaveChanges();
        }

        // 3. Ensure Default Student Gamification Record
        if (!context.StudentXp.Any(s => s.StudentId == student1Id))
        {
            context.StudentXp.Add(new StudentXp
            {
                StudentId = student1Id,
                TotalXp = 350,
                CurrentLevel = 1,
                Coins = 120,
                UpdatedAt = DateTime.UtcNow
            });
        }

        if (!context.StudentStreaks.Any(s => s.StudentId == student1Id))
        {
            context.StudentStreaks.Add(new StudentStreak
            {
                StudentId = student1Id,
                CurrentStreak = 5,
                LongestStreak = 8,
                FreezeTokensAvailable = 2,
                LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow),
                UpdatedAt = DateTime.UtcNow
            });
        }
        context.SaveChanges();

    }
}
