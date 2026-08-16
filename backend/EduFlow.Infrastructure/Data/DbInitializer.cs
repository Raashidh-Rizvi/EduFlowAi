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
            script = script.Replace("CREATE TABLE \"", "CREATE TABLE IF NOT EXISTS \"");
            script = script.Replace("CREATE UNIQUE INDEX \"", "CREATE UNIQUE INDEX IF NOT EXISTS \"");
            script = script.Replace("CREATE INDEX \"", "CREATE INDEX IF NOT EXISTS \"");
            context.Database.ExecuteSqlRaw(script);
        }
        catch
        {
            try { context.Database.EnsureCreated(); } catch { }
        }

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

        // 4. Ensure Default Course, Modules, Lessons, and Assessments
        var courseId = Guid.Parse("44444444-4444-4444-4444-444444444444");
        try
        {
            if (!context.Courses.Any(c => c.Id == courseId))
            {
                var defaultCourse = new Course
                {
                    Id = courseId,
                    Code = "SE3090",
                    Title = "Software Engineering & Architecture",
                    Description = "Master enterprise clean architecture, distributed transactions, database indexing, and deterministic multi-agent systems.",
                    Category = "Software Engineering",
                    IsPublished = true,
                    InstructorId = instructorId,
                    CreatedAt = DateTime.UtcNow
                };

                var mod1Id = Guid.Parse("55555555-5555-5555-5555-555555555551");
                var mod1 = new Module
                {
                    Id = mod1Id,
                    CourseId = courseId,
                    Title = "Relational Modeling & Indexing",
                    Description = "PostgreSQL schema design, composite B-Tree indexes, lock contention mitigation, and query execution plans.",
                    OrderIndex = 1,
                    CreatedAt = DateTime.UtcNow
                };

                mod1.Lessons.Add(new Lesson
                {
                    Id = Guid.Parse("66666666-6666-6666-6666-666666666661"),
                    ModuleId = mod1Id,
                    Title = "B-Tree Indexes & Composite Key Slicing",
                    Content = "Understand how composite index column order dictates index seek paths vs sequential scans in PostgreSQL.",
                    XpReward = 30,
                    EstimatedMinutes = 25,
                    OrderIndex = 1,
                    CreatedAt = DateTime.UtcNow
                });

                mod1.Lessons.Add(new Lesson
                {
                    Id = Guid.Parse("66666666-6666-6666-6666-666666666662"),
                    ModuleId = mod1Id,
                    Title = "Query Optimization & EXPLAIN ANALYZE",
                    Content = "Analyze query execution plans, buffer hits, and scan costs using PostgreSQL EXPLAIN ANALYZE.",
                    XpReward = 40,
                    EstimatedMinutes = 30,
                    OrderIndex = 2,
                    CreatedAt = DateTime.UtcNow
                });

                var mod2Id = Guid.Parse("55555555-5555-5555-5555-555555555552");
                var mod2 = new Module
                {
                    Id = mod2Id,
                    CourseId = courseId,
                    Title = "Clean Architecture & Domain Boundaries",
                    Description = "Dependency Inversion Principle, aggregate roots, repository patterns, and deterministic validation pipelines.",
                    OrderIndex = 2,
                    CreatedAt = DateTime.UtcNow
                };

                mod2.Lessons.Add(new Lesson
                {
                    Id = Guid.Parse("66666666-6666-6666-6666-666666666663"),
                    ModuleId = mod2Id,
                    Title = "Dependency Inversion & Repository Abstractions",
                    Content = "Decouple core domain business logic from database infrastructure and controller frameworks.",
                    XpReward = 35,
                    EstimatedMinutes = 25,
                    OrderIndex = 1,
                    CreatedAt = DateTime.UtcNow
                });

                mod2.Lessons.Add(new Lesson
                {
                    Id = Guid.Parse("66666666-6666-6666-6666-666666666664"),
                    ModuleId = mod2Id,
                    Title = "Deterministic Multi-Agent Validation Guards",
                    Content = "Multi-layer deterministic validation enforcing schema, syllabus references, and gamification economy bounds.",
                    XpReward = 50,
                    EstimatedMinutes = 35,
                    OrderIndex = 2,
                    CreatedAt = DateTime.UtcNow
                });

                defaultCourse.Modules.Add(mod1);
                defaultCourse.Modules.Add(mod2);

                // Default Assessment
                var defaultQuiz = new Assessment
                {
                    Id = Guid.Parse("77777777-7777-7777-7777-777777777777"),
                    CourseId = courseId,
                    Title = "Diagnostic Quiz: Relational Indexing & Architecture",
                    Description = "Evaluate knowledge on PostgreSQL indexing selectivity, clean architecture dependencies, and invariant enforcement.",
                    Type = AssessmentType.Quiz,
                    TimeLimitMinutes = 15,
                    PassingScorePercent = 70,
                    XpReward = 100,
                    CoinReward = 30,
                    CreatedAt = DateTime.UtcNow
                };

                defaultQuiz.Questions.Add(new Question
                {
                    Prompt = "Which index configuration best optimizes multi-column WHERE clause filtering in PostgreSQL?",
                    Type = QuestionType.MultipleChoice,
                    OptionsJson = JsonSerializer.Serialize(new List<string>
                    {
                        "Composite B-Tree index ordered by column selectivity",
                        "Sequential full table scans without indexes",
                        "Random hash distributed unaligned indices",
                        "Single-column bitmap scan on text blobs"
                    }),
                    CorrectAnswer = "Composite B-Tree index ordered by column selectivity",
                    Explanation = "Composite indexes evaluate filters from left-to-right matching highest selectivity columns first.",
                    Points = 10,
                    OrderIndex = 1
                });

                defaultQuiz.Questions.Add(new Question
                {
                    Prompt = "What is the fundamental dependency rule of Clean Architecture?",
                    Type = QuestionType.MultipleChoice,
                    OptionsJson = JsonSerializer.Serialize(new List<string>
                    {
                        "Dependencies point inward exclusively toward Domain core",
                        "Domain layers depend directly on UI Frameworks and DB Drivers",
                        "All database models inherit directly from Controller classes",
                        "Circular references between domain and presentation layers"
                    }),
                    CorrectAnswer = "Dependencies point inward exclusively toward Domain core",
                    Explanation = "Clean architecture dictates that inner layers know nothing of outer layers or third-party frameworks.",
                    Points = 10,
                    OrderIndex = 2
                });

                defaultCourse.Assessments.Add(defaultQuiz);

                context.Courses.Add(defaultCourse);
                context.SaveChanges();
            }

            // Default Enrollment
            if (!context.Enrollments.Any(e => e.CourseId == courseId && e.StudentId == student1Id))
            {
                context.Enrollments.Add(new Enrollment
                {
                    CourseId = courseId,
                    StudentId = student1Id,
                    ProgressPercentage = 35.0,
                    Status = EnrollmentStatus.Active,
                    CreatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
            }
        }
        catch
        {
            // Seed already applied or concurrent initialization
        }
    }
}
