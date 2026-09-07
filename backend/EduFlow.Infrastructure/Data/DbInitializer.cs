using Microsoft.EntityFrameworkCore;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;

namespace EduFlow.Infrastructure.Data;

public static class DbInitializer
{
    /// <summary>
    /// Applies any pending EF Core migrations, creating the database if it doesn't exist yet.
    /// Ensures demo users (admin, instructor, student) are seeded with valid credentials.
    /// </summary>
    public static void Initialize(ApplicationDbContext context)
    {
        try
        {
            context.Database.Migrate();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DbInitializer] Migration failed: {ex.Message} -> {ex.InnerException?.Message}");
        }

        try
        {
            var adminId = Guid.Parse("11111111-1111-1111-1111-111111111111");
            var instructorId = Guid.Parse("22222222-2222-2222-2222-222222222222");
            var student1Id = Guid.Parse("33333333-3333-3333-3333-333333333333");
            var validPasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!", 11);

            var existingUsers = context.Users.ToList();

            var admin = existingUsers.FirstOrDefault(u => u.Email.ToLower() == "admin@eduflow.ai");
            if (admin == null)
            {
                context.Users.Add(new User
                {
                    Id = adminId,
                    FullName = "System Administrator",
                    Email = "admin@eduflow.ai",
                    PasswordHash = validPasswordHash,
                    Role = UserRole.Admin,
                    IsActive = true
                });
            }
            else
            {
                admin.PasswordHash = validPasswordHash;
                admin.IsActive = true;
            }

            var instructor = existingUsers.FirstOrDefault(u => u.Email.ToLower() == "instructor@eduflow.ai");
            if (instructor == null)
            {
                context.Users.Add(new User
                {
                    Id = instructorId,
                    FullName = "Dr. Sarah Jenkins",
                    Email = "instructor@eduflow.ai",
                    PasswordHash = validPasswordHash,
                    Role = UserRole.Instructor,
                    IsActive = true
                });
            }
            else
            {
                instructor.PasswordHash = validPasswordHash;
                instructor.IsActive = true;
            }

            var student = existingUsers.FirstOrDefault(u => u.Email.ToLower() == "student@eduflow.ai");
            if (student == null)
            {
                context.Users.Add(new User
                {
                    Id = student1Id,
                    FullName = "Alex Rivera",
                    Email = "student@eduflow.ai",
                    PasswordHash = validPasswordHash,
                    Role = UserRole.Student,
                    IsActive = true
                });
            }
            else
            {
                student.PasswordHash = validPasswordHash;
                student.IsActive = true;
            }

            context.SaveChanges();

            // Ensure student gamification baseline
            var studentActual = student ?? context.Users.First(u => u.Email.ToLower() == "student@eduflow.ai");
            if (!context.StudentXp.Any(x => x.StudentId == studentActual.Id))
            {
                context.StudentXp.Add(new StudentXp
                {
                    StudentId = studentActual.Id,
                    TotalXp = 250,
                    CurrentLevel = 2,
                    Coins = 100,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            if (!context.StudentStreaks.Any(s => s.StudentId == studentActual.Id))
            {
                context.StudentStreaks.Add(new StudentStreak
                {
                    StudentId = studentActual.Id,
                    CurrentStreak = 3,
                    LongestStreak = 5,
                    FreezeTokensAvailable = 2,
                    LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    UpdatedAt = DateTime.UtcNow
                });
            }

            // Seed additional cohort students if missing
            var cohortSeedData = new[]
            {
                new { Id = Guid.Parse("33333333-3333-3333-3333-333333333334"), Name = "Sarah Chen", Email = "sarah.chen@eduflow.ai", Xp = 1420, Level = 4, Streak = 8, Coins = 240 },
                new { Id = Guid.Parse("33333333-3333-3333-3333-333333333335"), Name = "Daniel Miller", Email = "daniel.miller@eduflow.ai", Xp = 1150, Level = 3, Streak = 6, Coins = 190 },
                new { Id = Guid.Parse("33333333-3333-3333-3333-333333333336"), Name = "Marcus Vance", Email = "marcus.vance@eduflow.ai", Xp = 890, Level = 3, Streak = 4, Coins = 150 },
                new { Id = Guid.Parse("33333333-3333-3333-3333-333333333337"), Name = "Priya Patel", Email = "priya.patel@eduflow.ai", Xp = 720, Level = 2, Streak = 5, Coins = 120 },
                new { Id = Guid.Parse("33333333-3333-3333-3333-333333333338"), Name = "Elena Rostova", Email = "elena.rostova@eduflow.ai", Xp = 480, Level = 2, Streak = 2, Coins = 80 }
            };

            foreach (var cs in cohortSeedData)
            {
                if (!context.Users.Any(u => u.Email.ToLower() == cs.Email.ToLower()))
                {
                    context.Users.Add(new User
                    {
                        Id = cs.Id,
                        FullName = cs.Name,
                        Email = cs.Email,
                        PasswordHash = validPasswordHash,
                        Role = UserRole.Student,
                        IsActive = true
                    });
                }

                if (!context.StudentXp.Any(x => x.StudentId == cs.Id))
                {
                    context.StudentXp.Add(new StudentXp
                    {
                        StudentId = cs.Id,
                        TotalXp = cs.Xp,
                        CurrentLevel = cs.Level,
                        Coins = cs.Coins,
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                if (!context.StudentStreaks.Any(s => s.StudentId == cs.Id))
                {
                    context.StudentStreaks.Add(new StudentStreak
                    {
                        StudentId = cs.Id,
                        CurrentStreak = cs.Streak,
                        LongestStreak = cs.Streak + 2,
                        FreezeTokensAvailable = 2,
                        LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow),
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
            context.SaveChanges();

            if (!context.Teams.Any())
            {
                var starterTeamId = Guid.Parse("99999999-9999-9999-9999-999999999991");
                var starterTeam = new Team
                {
                    Id = starterTeamId,
                    Name = "Quantum Coders",
                    Description = "Quest: Master ACID concurrency & EF Core query optimization",
                    AvatarUrl = "🚀",
                    LeaderId = Guid.Parse("33333333-3333-3333-3333-333333333334"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                context.Teams.Add(starterTeam);
                context.TeamMembers.Add(new TeamMember
                {
                    TeamId = starterTeamId,
                    StudentId = Guid.Parse("33333333-3333-3333-3333-333333333334"),
                    Role = TeamRole.Leader,
                    JoinedAt = DateTime.UtcNow
                });
                context.TeamMembers.Add(new TeamMember
                {
                    TeamId = starterTeamId,
                    StudentId = Guid.Parse("33333333-3333-3333-3333-333333333335"),
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow
                });
                context.SaveChanges();
            }

            // Ensure default course CS-301 exists
            var courseId = Guid.Parse("44444444-4444-4444-4444-444444444444");
            var course = context.Courses.FirstOrDefault(c => c.Code == "CS-301" || c.Id == courseId);
            if (course == null)
            {
                course = new Course
                {
                    Id = courseId,
                    Code = "CS-301",
                    Title = "Advanced Database Architecture & EF Core",
                    Description = "Deep dive into relational storage engines, B-tree indexing, query plan analysis, ACID transactions, and distributed concurrency.",
                    Category = "Computer Science",
                    InstructorId = instructorId,
                    IsPublished = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                context.Courses.Add(course);
                context.SaveChanges();

                var mod1 = new Module
                {
                    Id = Guid.Parse("55555555-5555-5555-5555-555555555551"),
                    CourseId = courseId,
                    Title = "High-Performance Indexing & Query Execution",
                    Description = "Master B-Tree search mechanisms, selectivity, composite index ordering, and EXPLAIN ANALYZE execution cost profiling.",
                    OrderIndex = 1,
                    Status = "Published",
                    AttachmentFileName = "PostgreSQL_Indexing_Architecture.pdf"
                };

                var mod2 = new Module
                {
                    Id = Guid.Parse("55555555-5555-5555-5555-555555555552"),
                    CourseId = courseId,
                    Title = "Transactional Integrity & Deadlock Resolution",
                    Description = "Explore ACID anomalies, isolation levels (Read Committed through Serializable), two-phase locking, and wait-for graph deadlocks.",
                    OrderIndex = 2,
                    Status = "Published",
                    AttachmentFileName = "ACID_Transactions_Concurrency.pdf"
                };

                context.Modules.AddRange(mod1, mod2);
                context.SaveChanges();
            }

            // Ensure Alex Rivera is enrolled in CS-301
            if (!context.Enrollments.Any(e => e.StudentId == student1Id && e.CourseId == course.Id))
            {
                context.Enrollments.Add(new Enrollment
                {
                    StudentId = student1Id,
                    CourseId = course.Id,
                    CreatedAt = DateTime.UtcNow,
                    ProgressPercentage = 45,
                    Status = EnrollmentStatus.Active
                });
                context.SaveChanges();
            }

            // Ensure baseline diagnostic assessment exists for CS-301
            var quizId = Guid.Parse("66666666-6666-6666-6666-666666666666");
            var existingQuiz = context.Assessments.FirstOrDefault(a => a.Id == quizId || (a.CourseId == course.Id && a.Title.Contains("Clean Architecture & PostgreSQL")));
            if (existingQuiz == null)
            {
                var quiz = new Assessment
                {
                    Id = quizId,
                    CourseId = course.Id,
                    Title = "Clean Architecture & PostgreSQL Indexing Diagnostic",
                    Description = "Official diagnostic assessment for CS-301 covering ACID transactions, B-Tree index selectivity, and Clean Architecture boundaries.",
                    Type = AssessmentType.Quiz,
                    TimeLimitMinutes = 15,
                    TimeLimitSeconds = 900,
                    PassingScorePercent = 70,
                    XpReward = 80,
                    CoinReward = 30,
                    ScopeType = QuizScopeType.Course,
                    ScopeId = course.Id,
                    Status = QuizStatus.Published,
                    Difficulty = DifficultyLevel.Medium,
                    AttemptsAllowed = 3,
                    RandomizeQuestions = false,
                    RandomizeOptions = false,
                    FeedbackMode = FeedbackMode.Immediate,
                    ShowCorrectAnswers = true,
                    GeneratedByAI = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var q1 = new Question
                {
                    Id = Guid.Parse("77777777-7777-7777-7777-777777777771"),
                    AssessmentId = quizId,
                    Prompt = "What does the 'I' represent in the ACID properties of relational databases?",
                    Type = QuestionType.MultipleChoice,
                    OptionsJson = System.Text.Json.JsonSerializer.Serialize(new List<string> { "Isolation", "Integration", "Iteration", "Indexing" }),
                    CorrectAnswer = "Isolation",
                    Explanation = "Isolation ensures concurrent transactions execute independently without interfering with each other.",
                    Difficulty = DifficultyLevel.Medium,
                    Points = 10,
                    OrderIndex = 1,
                    LearningObjective = "ACID Transaction Foundations"
                };

                var q2 = new Question
                {
                    Id = Guid.Parse("77777777-7777-7777-7777-777777777772"),
                    AssessmentId = quizId,
                    Prompt = "In PostgreSQL, how are composite B-Tree indexes (colA, colB) evaluated during queries?",
                    Type = QuestionType.MultipleChoice,
                    OptionsJson = System.Text.Json.JsonSerializer.Serialize(new List<string> { "Left-to-right starting with colA", "Right-to-left starting with colB", "Any order arbitrarily", "Only when both columns are hashed" }),
                    CorrectAnswer = "Left-to-right starting with colA",
                    Explanation = "Composite B-Tree indexes evaluate left-to-right; the leading column must be present in the WHERE clause.",
                    Difficulty = DifficultyLevel.Medium,
                    Points = 10,
                    OrderIndex = 2,
                    LearningObjective = "B-Tree Indexing Fundamentals"
                };

                var q3 = new Question
                {
                    Id = Guid.Parse("77777777-7777-7777-7777-777777777773"),
                    AssessmentId = quizId,
                    Prompt = "What is the primary role of the ValidationGuardAgent in EduFlow's LangGraph pipeline?",
                    Type = QuestionType.MultipleChoice,
                    OptionsJson = System.Text.Json.JsonSerializer.Serialize(new List<string> { "Enforce safety invariants like ≤ 20h/wk workload ceiling", "Generate random quiz questions", "Bypass instructor approval", "Format CSS stylesheets" }),
                    CorrectAnswer = "Enforce safety invariants like ≤ 20h/wk workload ceiling",
                    Explanation = "ValidationGuardAgent enforces pedagogical safety, workload limits, and schema invariants.",
                    Difficulty = DifficultyLevel.Medium,
                    Points = 10,
                    OrderIndex = 3,
                    LearningObjective = "LangGraph Multi-Agent Safety"
                };

                context.Assessments.Add(quiz);
                context.Questions.AddRange(q1, q2, q3);
                context.SaveChanges();
            }
        }
        catch
        {
            // Ignore if already configured
        }
    }
}
