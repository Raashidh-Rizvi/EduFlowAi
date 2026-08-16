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
                catch { }
            }
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
                    Difficulty = DifficultyLevel.Medium,
                    Status = "Published",
                    InstructorId = instructorId,
                    CreatedAt = DateTime.UtcNow
                };

                // Module 1
                var mod1Id = Guid.Parse("55555555-5555-5555-5555-555555555551");
                var mod1 = new Module
                {
                    Id = mod1Id,
                    CourseId = courseId,
                    Title = "Relational Modeling & Indexing",
                    Description = "PostgreSQL schema design, composite B-Tree indexes, lock contention mitigation, and query execution plans.",
                    OrderIndex = 1,
                    Status = "Published",
                    CreatedAt = DateTime.UtcNow
                };

                // Topics in Module 1
                var top11Id = Guid.Parse("88888888-8888-8888-8888-888888888881");
                var top11 = new Topic
                {
                    Id = top11Id,
                    ModuleId = mod1Id,
                    Title = "B-Tree Indexing Fundamentals",
                    Description = "Deep dive into multi-column composite index ordering, leftmost prefix rule, and index selectivity.",
                    DisplayOrder = 1,
                    ContentType = "Theory",
                    EstimatedMinutes = 35,
                    Status = "Published"
                };

                var top12Id = Guid.Parse("88888888-8888-8888-8888-888888888882");
                var top12 = new Topic
                {
                    Id = top12Id,
                    ModuleId = mod1Id,
                    Title = "Query Execution Plans & EXPLAIN ANALYZE",
                    Description = "Analyze buffer hits, cost matrices, heap scans, and sequential scan bottlenecks.",
                    DisplayOrder = 2,
                    ContentType = "Practical",
                    EstimatedMinutes = 40,
                    Status = "Published"
                };

                // Content items / Lessons / Subtopics in Topic 1.1
                var lesson111Id = Guid.Parse("66666666-6666-6666-6666-666666666661");
                var lesson111 = new ContentItem
                {
                    Id = lesson111Id,
                    ModuleId = mod1Id,
                    TopicId = top11Id,
                    Title = "B-Tree Index Structure & Left-Prefix Rule",
                    Content = "PostgreSQL composite B-Trees require filtering on the leading column to enable index seek operations. Skipping the leading column forces full sequential heap scans.",
                    ContentType = "Lesson",
                    DisplayOrder = 1,
                    EstimatedMinutes = 20,
                    XpReward = 30,
                    Status = "Published"
                };

                // Nested Subtopics under Lesson 1.1.1
                var subtopic111A = new ContentItem
                {
                    Id = Guid.Parse("99999999-9999-9999-9999-999999999991"),
                    ModuleId = mod1Id,
                    TopicId = top11Id,
                    ParentContentId = lesson111Id,
                    Title = "Subtopic: Multi-Column Selectivity Calculations",
                    Content = "Calculate density and distinct value ratios to determine optimal column ordering in compound keys.",
                    ContentType = "Subtopic",
                    DisplayOrder = 1,
                    EstimatedMinutes = 15,
                    XpReward = 20,
                    Status = "Published"
                };

                var subtopic111B = new ContentItem
                {
                    Id = Guid.Parse("99999999-9999-9999-9999-999999999992"),
                    ModuleId = mod1Id,
                    TopicId = top11Id,
                    ParentContentId = lesson111Id,
                    Title = "Subtopic: Covering Indexes & Index-Only Scans",
                    Content = "Using INCLUDE clauses in PostgreSQL to satisfy queries purely from leaf index nodes without accessing the main table heap.",
                    ContentType = "Subtopic",
                    DisplayOrder = 2,
                    EstimatedMinutes = 15,
                    XpReward = 20,
                    Status = "Published"
                };

                top11.ContentItems.Add(lesson111);
                top11.ContentItems.Add(subtopic111A);
                top11.ContentItems.Add(subtopic111B);

                // Backward-compatible Lesson rows
                mod1.Lessons.Add(new Lesson
                {
                    Id = lesson111Id,
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

                mod1.Topics.Add(top11);
                mod1.Topics.Add(top12);

                // Module 2
                var mod2Id = Guid.Parse("55555555-5555-5555-5555-555555555552");
                var mod2 = new Module
                {
                    Id = mod2Id,
                    CourseId = courseId,
                    Title = "Clean Architecture & Domain Boundaries",
                    Description = "Dependency Inversion Principle, aggregate roots, repository patterns, and deterministic validation pipelines.",
                    OrderIndex = 2,
                    Status = "Published",
                    CreatedAt = DateTime.UtcNow
                };

                var top21Id = Guid.Parse("88888888-8888-8888-8888-888888888883");
                var top21 = new Topic
                {
                    Id = top21Id,
                    ModuleId = mod2Id,
                    Title = "Domain Abstractions & DIP",
                    Description = "Structuring interfaces, aggregate roots, domain events, and decoupled repository adapters.",
                    DisplayOrder = 1,
                    ContentType = "Theory",
                    EstimatedMinutes = 30,
                    Status = "Published"
                };

                var top22Id = Guid.Parse("88888888-8888-8888-8888-888888888884");
                var top22 = new Topic
                {
                    Id = top22Id,
                    ModuleId = mod2Id,
                    Title = "Deterministic Multi-Agent Safety",
                    Description = "Guard agents, invariant validation, human-in-the-loop approvals, and safe gamification boundaries.",
                    DisplayOrder = 2,
                    ContentType = "Practical",
                    EstimatedMinutes = 35,
                    Status = "Published"
                };

                mod2.Topics.Add(top21);
                mod2.Topics.Add(top22);

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

                // --- Scoped Assessments / Quizzes ---

                // 1. Topic Quiz: ScopeType = TOPIC
                var topicQuiz = new Assessment
                {
                    Id = Guid.Parse("77777777-7777-7777-7777-777777777771"),
                    CourseId = courseId,
                    ScopeType = QuizScopeType.Topic,
                    ScopeId = top11Id,
                    Title = "Topic Quiz: B-Tree Index Selectivity & Left-Prefix",
                    Description = "Targeted micro-quiz verifying understanding of composite index access paths.",
                    Type = AssessmentType.TopicQuiz,
                    Difficulty = DifficultyLevel.Medium,
                    TimeLimitSeconds = 600,
                    TimeLimitMinutes = 10,
                    PassingScorePercent = 70,
                    XpReward = 30, // Scope policy: 30 XP
                    CoinReward = 15,
                    Status = QuizStatus.Published,
                    CreatedAt = DateTime.UtcNow
                };

                topicQuiz.Questions.Add(new Question
                {
                    Prompt = "In a composite index on (CreatedAt, CategoryId), which WHERE filter utilizes the index efficiently?",
                    Type = QuestionType.MultipleChoice,
                    OptionsJson = JsonSerializer.Serialize(new List<string>
                    {
                        "WHERE CreatedAt = '2026-01-01' AND CategoryId = 'Eng'",
                        "WHERE CategoryId = 'Eng' only",
                        "WHERE UPPER(CategoryId) = 'ENG'",
                        "WHERE Description LIKE '%test%'"
                    }),
                    CorrectAnswer = "WHERE CreatedAt = '2026-01-01' AND CategoryId = 'Eng'",
                    Explanation = "Composite B-Trees evaluate from left to right, matching the leftmost prefix column first.",
                    Points = 10,
                    OrderIndex = 1,
                    LearningObjective = "LO-01",
                    MetadataJson = "{\"bloomsTaxonomy\":\"Application\"}"
                });

                topicQuiz.Questions.Add(new Question
                {
                    Prompt = "True or False: PostgreSQL will perform an index-only scan if all requested columns reside inside the index leaf nodes (e.g. INCLUDE columns).",
                    Type = QuestionType.TrueFalse,
                    OptionsJson = JsonSerializer.Serialize(new List<string> { "True", "False" }),
                    CorrectAnswer = "True",
                    Explanation = "Index-only scans eliminate the need to visit table heap pages when all requested attributes are in the index.",
                    Points = 10,
                    OrderIndex = 2,
                    LearningObjective = "LO-02",
                    MetadataJson = "{\"bloomsTaxonomy\":\"Comprehension\"}"
                });

                // 2. Module Assessment: ScopeType = MODULE
                var moduleQuiz = new Assessment
                {
                    Id = Guid.Parse("77777777-7777-7777-7777-777777777772"),
                    CourseId = courseId,
                    ScopeType = QuizScopeType.Module,
                    ScopeId = mod1Id,
                    Title = "Module 1 Assessment: Relational Modeling Mastery",
                    Description = "Comprehensive assessment covering PostgreSQL schema design and execution plan cost analysis.",
                    Type = AssessmentType.ModuleQuiz,
                    Difficulty = DifficultyLevel.Hard,
                    TimeLimitSeconds = 1200,
                    TimeLimitMinutes = 20,
                    PassingScorePercent = 75,
                    XpReward = 75, // Scope policy: 75 XP
                    CoinReward = 35,
                    Status = QuizStatus.Published,
                    CreatedAt = DateTime.UtcNow
                };

                moduleQuiz.Questions.Add(new Question
                {
                    Prompt = "Which execution plan node indicates that the engine is scanning every row in a table sequentially?",
                    Type = QuestionType.MultipleChoice,
                    OptionsJson = JsonSerializer.Serialize(new List<string>
                    {
                        "Seq Scan",
                        "Index Scan",
                        "Bitmap Index Scan",
                        "Index Only Scan"
                    }),
                    CorrectAnswer = "Seq Scan",
                    Explanation = "Seq Scan (Sequential Scan) reads all disk pages sequentially from the relation table.",
                    Points = 10,
                    OrderIndex = 1,
                    LearningObjective = "LO-03",
                    MetadataJson = "{\"bloomsTaxonomy\":\"Analysis\"}"
                });

                // 3. Course Final Assessment: ScopeType = COURSE
                var defaultQuiz = new Assessment
                {
                    Id = Guid.Parse("77777777-7777-7777-7777-777777777777"),
                    CourseId = courseId,
                    ScopeType = QuizScopeType.Course,
                    ScopeId = courseId,
                    Title = "Course Final Assessment: Software Engineering & Architecture",
                    Description = "Evaluate comprehensive mastery across PostgreSQL indexing, clean architecture, and invariant enforcement.",
                    Type = AssessmentType.CourseQuiz,
                    Difficulty = DifficultyLevel.Hard,
                    TimeLimitSeconds = 1800,
                    TimeLimitMinutes = 30,
                    PassingScorePercent = 70,
                    XpReward = 150, // Scope policy: 150 XP
                    CoinReward = 60,
                    Status = QuizStatus.Published,
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

                defaultCourse.Assessments.Add(topicQuiz);
                defaultCourse.Assessments.Add(moduleQuiz);
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

            // Gamification Profile & Streak
            if (!context.StudentXp.Any(s => s.StudentId == student1Id))
            {
                context.StudentXp.Add(new StudentXp
                {
                    StudentId = student1Id,
                    TotalXp = 6420,
                    CurrentLevel = 12,
                    Coins = 320,
                    UpdatedAt = DateTime.UtcNow
                });

                context.StudentStreaks.Add(new StudentStreak
                {
                    StudentId = student1Id,
                    CurrentStreak = 14,
                    LongestStreak = 14,
                    FreezeTokensAvailable = 2,
                    LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    UpdatedAt = DateTime.UtcNow
                });

                context.SaveChanges();
            }

            // Skill Mastery Matrix
            if (!context.SkillMasteries.Any(m => m.StudentId == student1Id))
            {
                context.SkillMasteries.AddRange(
                    new SkillMastery { StudentId = student1Id, CourseId = courseId, TopicName = "Functions & Scope", SkillName = "Function Parameters & Closures", MasteryPercentage = 90, TotalAttempts = 20, CorrectAttempts = 18, LastAssessedAt = DateTime.UtcNow.AddDays(-1) },
                    new SkillMastery { StudentId = student1Id, CourseId = courseId, TopicName = "Loops & Iterations", SkillName = "Iterative Flow Control", MasteryPercentage = 82, TotalAttempts = 22, CorrectAttempts = 18, LastAssessedAt = DateTime.UtcNow.AddDays(-2) },
                    new SkillMastery { StudentId = student1Id, CourseId = courseId, TopicName = "OOP & Encapsulation", SkillName = "Object Orientation Invariants", MasteryPercentage = 72, TotalAttempts = 18, CorrectAttempts = 13, LastAssessedAt = DateTime.UtcNow.AddDays(-3) },
                    new SkillMastery { StudentId = student1Id, CourseId = courseId, TopicName = "Recursion & Trees", SkillName = "Recursive Logic & Base Cases", MasteryPercentage = 43, TotalAttempts = 14, CorrectAttempts = 6, LastAssessedAt = DateTime.UtcNow.AddHours(-12) },
                    new SkillMastery { StudentId = student1Id, CourseId = courseId, TopicName = "B-Tree Indexing Fundamentals", SkillName = "Leftmost Prefix Rule", MasteryPercentage = 45, TotalAttempts = 11, CorrectAttempts = 5, LastAssessedAt = DateTime.UtcNow.AddHours(-6) },
                    new SkillMastery { StudentId = student1Id, CourseId = courseId, TopicName = "Clean Architecture & DIP", SkillName = "Interface Decoupling", MasteryPercentage = 88, TotalAttempts = 16, CorrectAttempts = 14, LastAssessedAt = DateTime.UtcNow.AddDays(-1) }
                );
                context.SaveChanges();
            }

            // Today's Daily Missions
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (!context.StudentDailyMissions.Any(m => m.StudentId == student1Id && m.Date == today))
            {
                context.StudentDailyMissions.AddRange(
                    new StudentDailyMission { StudentId = student1Id, Date = today, MissionKey = "LESSON_COMPLETE", Title = "Complete a Lesson", Description = "Progress through Functions lesson", CurrentCount = 1, TargetCount = 1, IsCompleted = true, RewardXp = 20, RewardCoins = 5 },
                    new StudentDailyMission { StudentId = student1Id, Date = today, MissionKey = "PRACTICE_5_QUESTIONS", Title = "Practice 5 Questions", Description = "Solve quiz or practice questions", CurrentCount = 5, TargetCount = 5, IsCompleted = true, RewardXp = 15, RewardCoins = 5 },
                    new StudentDailyMission { StudentId = student1Id, Date = today, MissionKey = "SCORE_70_QUIZ", Title = "Score 70%+ in a Quiz", Description = "Demonstrate solid academic mastery", CurrentCount = 0, TargetCount = 1, IsCompleted = false, RewardXp = 30, RewardCoins = 10 },
                    new StudentDailyMission { StudentId = student1Id, Date = today, MissionKey = "AI_CHALLENGE", Title = "Complete AI Challenge", Description = "Conquer an adaptive quest", CurrentCount = 0, TargetCount = 1, IsCompleted = false, RewardXp = 50, RewardCoins = 10 }
                );
                context.SaveChanges();
            }

            // Badges
            if (!context.Badges.Any())
            {
                context.Badges.AddRange(
                    new Badge { Id = "FIRST_LESSON", Title = "First Lesson", Description = "Completed your inaugural learning session", IconUrl = "🏅", Category = BadgeCategory.Learning, XpBonus = 50 },
                    new Badge { Id = "QUIZ_MASTER", Title = "Quiz Master", Description = "Achieved 90%+ in 5 assessments", IconUrl = "🏆", Category = BadgeCategory.Assessment, XpBonus = 100 },
                    new Badge { Id = "SEVEN_DAY_STREAK", Title = "7 Day Streak", Description = "Learned consistently for 7 days", IconUrl = "🔥", Category = BadgeCategory.Consistency, XpBonus = 75 },
                    new Badge { Id = "FOURTEEN_DAY_STREAK", Title = "14 Day Streak", Description = "Learned consistently for 14 days", IconUrl = "🔥", Category = BadgeCategory.Consistency, XpBonus = 150 },
                    new Badge { Id = "BOSS_SLAYER", Title = "Boss Slayer", Description = "Conquered a module boss challenge", IconUrl = "⚔️", Category = BadgeCategory.Challenge, XpBonus = 200 },
                    new Badge { Id = "COMEBACK_KID", Title = "Comeback Kid", Description = "Improved topic score by +30%", IconUrl = "📈", Category = BadgeCategory.Improvement, XpBonus = 80 },
                    new Badge { Id = "PERFECT_SCORE", Title = "Perfect Score", Description = "Scored 100% on an assessment", IconUrl = "✨", Category = BadgeCategory.Assessment, XpBonus = 120 }
                );
                context.SaveChanges();

                context.StudentBadges.AddRange(
                    new StudentBadge { StudentId = student1Id, BadgeId = "QUIZ_MASTER", UnlockedAt = DateTime.UtcNow.AddDays(-2) },
                    new StudentBadge { StudentId = student1Id, BadgeId = "FOURTEEN_DAY_STREAK", UnlockedAt = DateTime.UtcNow.AddDays(-1) },
                    new StudentBadge { StudentId = student1Id, BadgeId = "BOSS_SLAYER", UnlockedAt = DateTime.UtcNow.AddDays(-4) }
                );
                context.SaveChanges();
            }
        }
        catch
        {
            // Seed already applied or concurrent initialization
        }
    }
}
