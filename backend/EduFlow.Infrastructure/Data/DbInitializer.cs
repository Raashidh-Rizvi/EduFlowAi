using Microsoft.EntityFrameworkCore;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;

namespace EduFlow.Infrastructure.Data;

public static class DbInitializer
{
    /// <summary>
    /// Applies any pending EF Core migrations, creating the database if it doesn't exist yet.
    /// Failure is NOT swallowed: the caller (Program.cs) rethrows so the application refuses
    /// to start with an out-of-sync schema.
    /// </summary>
    public static void Initialize(ApplicationDbContext context)
    {
        context.Database.Migrate();
    }

    /// <summary>
    /// Seeds demo accounts and demo course content. Development only: the caller must check
    /// the hosting environment, and exceptions propagate so the caller can log them.
    /// </summary>
    public static void SeedDevelopmentData(ApplicationDbContext context)
    {
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
                student = new User
                {
                    Id = student1Id,
                    FullName = "Alex Rivera",
                    Email = "student@eduflow.ai",
                    PasswordHash = validPasswordHash,
                    Role = UserRole.Student,
                    IsActive = true,
                    AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                };
                context.Users.Add(student);
            }
            else
            {
                student.FullName = "Alex Rivera";
                student.PasswordHash = validPasswordHash;
                student.IsActive = true;
                if (string.IsNullOrEmpty(student.AvatarUrl))
                {
                    student.AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
                }
            }

            context.SaveChanges();

            // Ensure student gamification baseline (Level 3, 1,850 XP, 450 Coins, 5-day streak)
            var studentActual = student ?? context.Users.First(u => u.Email.ToLower() == "student@eduflow.ai");
            
            var studentXp = context.StudentXp.FirstOrDefault(x => x.StudentId == studentActual.Id);
            if (studentXp == null)
            {
                context.StudentXp.Add(new StudentXp
                {
                    StudentId = studentActual.Id,
                    TotalXp = 1850,
                    CurrentLevel = 3,
                    Coins = 450,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                studentXp.TotalXp = 1850;
                studentXp.CurrentLevel = 3;
                studentXp.Coins = 450;
                studentXp.UpdatedAt = DateTime.UtcNow;
            }

            var studentStreak = context.StudentStreaks.FirstOrDefault(s => s.StudentId == studentActual.Id);
            if (studentStreak == null)
            {
                context.StudentStreaks.Add(new StudentStreak
                {
                    StudentId = studentActual.Id,
                    CurrentStreak = 5,
                    LongestStreak = 12,
                    FreezeTokensAvailable = 2,
                    LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                studentStreak.CurrentStreak = 5;
                studentStreak.LongestStreak = 12;
                studentStreak.FreezeTokensAvailable = 2;
                studentStreak.LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow);
                studentStreak.UpdatedAt = DateTime.UtcNow;
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

            // Seed Badges & Unlock for Alex Rivera
            var badgesToEnsure = new[]
            {
                new Badge { Id = "FIRST_LESSON", Title = "First Step", Description = "Completed your first lesson in EduFlow AI", IconUrl = "🚀", Category = BadgeCategory.Learning, XpBonus = 50 },
                new Badge { Id = "QUIZ_MASTER", Title = "Quiz Ace", Description = "Achieved 100% on any interactive quiz", IconUrl = "🎯", Category = BadgeCategory.Assessment, XpBonus = 100 },
                new Badge { Id = "SEVEN_DAY_STREAK", Title = "Unstoppable", Description = "Maintained a 7-day continuous learning streak", IconUrl = "🔥", Category = BadgeCategory.Streak, XpBonus = 200 },
                new Badge { Id = "CHALLENGE_CHAMPION", Title = "Boss Slayer", Description = "Completed 5 daily challenges or boss encounters", IconUrl = "🏆", Category = BadgeCategory.Milestone, XpBonus = 250 },
                new Badge { Id = "SQUAD_GOALS", Title = "Team Player", Description = "Joined a student learning squad", IconUrl = "🤝", Category = BadgeCategory.Social, XpBonus = 75 }
            };

            foreach (var b in badgesToEnsure)
            {
                if (!context.Badges.Any(x => x.Id == b.Id))
                {
                    context.Badges.Add(b);
                }
            }
            context.SaveChanges();

            var alexBadgeIds = new[] { "FIRST_LESSON", "QUIZ_MASTER", "SEVEN_DAY_STREAK", "SQUAD_GOALS", "CHALLENGE_CHAMPION" };
            foreach (var badgeId in alexBadgeIds)
            {
                if (!context.StudentBadges.Any(sb => sb.StudentId == studentActual.Id && sb.BadgeId == badgeId))
                {
                    context.StudentBadges.Add(new StudentBadge
                    {
                        StudentId = studentActual.Id,
                        BadgeId = badgeId,
                        UnlockedAt = DateTime.UtcNow.AddDays(-3)
                    });
                }
            }
            context.SaveChanges();

            // Seed Team & Alex Rivera Team Membership
            var starterTeamId = Guid.Parse("99999999-9999-9999-9999-999999999991");
            if (!context.Teams.Any(t => t.Id == starterTeamId))
            {
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
                context.SaveChanges();
            }

            if (!context.TeamMembers.Any(tm => tm.TeamId == starterTeamId && tm.StudentId == studentActual.Id))
            {
                context.TeamMembers.Add(new TeamMember
                {
                    TeamId = starterTeamId,
                    StudentId = studentActual.Id,
                    Role = TeamRole.Member,
                    JoinedAt = DateTime.UtcNow.AddDays(-10)
                });
                context.SaveChanges();
            }

            // Clean up any test/junk courses in DB and ensure real term is populated
            var allCourses = context.Courses.ToList();
            foreach (var c in allCourses)
            {
                if (string.IsNullOrWhiteSpace(c.Term))
                {
                    c.Term = "Fall 2026";
                }
                if (c.Code == "NVNGV" || c.Title == "nhvhhv")
                {
                    c.Code = "SE-302";
                    c.Title = "Software Architecture & System Design";
                    c.Category = "Software Engineering";
                    c.Term = "Spring 2026";
                    c.Description = "Enterprise architecture patterns, microservices decomposition, multi-agent orchestrations, and deterministic system safety.";
                }
            }
            context.SaveChanges();

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
                    Term = "Fall 2026",
                    InstructorId = instructorId,
                    IsPublished = true,
                    Status = "Published",
                    Difficulty = EduFlow.Core.Enums.DifficultyLevel.Medium,
                    DurationHours = 18,
                    Price = 0m,
                    IsFree = true,
                    AverageRating = 4.8,
                    RatingCount = 2,
                    ThumbnailUrl = "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600",
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
                    PdfUrl = "/uploads/pdfs/ac72c5cd-dd0b-4f50-8d10-b3729f61779c_IT3012___Lecture_4_Notes_ V1.pdf",
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
                    PdfUrl = "/uploads/pdfs/c405c0f4-4b45-46a3-b785-33801d40735e_IT3012___Lecture_6_Draft.pdf",
                    AttachmentFileName = "ACID_Transactions_Concurrency.pdf"
                };

                context.Modules.AddRange(mod1, mod2);
                context.SaveChanges();
            }
            else
            {
                if (string.IsNullOrWhiteSpace(course.Term))
                {
                    course.Term = "Fall 2026";
                    context.SaveChanges();
                }
            }

            // Ensure modules have valid PdfUrls populated if currently missing
            var modulesToFix = context.Modules.Where(m => string.IsNullOrEmpty(m.PdfUrl)).ToList();
            if (modulesToFix.Any())
            {
                foreach (var mod in modulesToFix)
                {
                    if (mod.OrderIndex == 1 || mod.Id == Guid.Parse("55555555-5555-5555-5555-555555555551"))
                    {
                        mod.PdfUrl = "/uploads/pdfs/ac72c5cd-dd0b-4f50-8d10-b3729f61779c_IT3012___Lecture_4_Notes_ V1.pdf";
                    }
                    else
                    {
                        mod.PdfUrl = "/uploads/pdfs/c405c0f4-4b45-46a3-b785-33801d40735e_IT3012___Lecture_6_Draft.pdf";
                    }
                }
                context.SaveChanges();
            }

            // Ensure Alex Rivera is enrolled in CS-301 with 65% progress
            var alexEnrollment = context.Enrollments.FirstOrDefault(e => e.StudentId == studentActual.Id && e.CourseId == course.Id);
            if (alexEnrollment == null)
            {
                context.Enrollments.Add(new Enrollment
                {
                    StudentId = studentActual.Id,
                    CourseId = course.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-14),
                    ProgressPercentage = 65.0,
                    Status = EnrollmentStatus.Active
                });
                context.SaveChanges();
            }
            else
            {
                alexEnrollment.ProgressPercentage = 65.0;
                alexEnrollment.Status = EnrollmentStatus.Active;
                context.SaveChanges();
            }

            // -------------------------------------------------------------------------
            // Second instructor (Instructor B) + owned course.
            // Demonstrates that two instructors can never see or edit each other's data.
            // -------------------------------------------------------------------------
            var instructorBId = Guid.Parse("22222222-2222-2222-2222-222222222223");
            var instructorB = context.Users.FirstOrDefault(u =>
                u.Id == instructorBId || u.Email.ToLower() == "instructor.b@eduflow.ai");
            if (instructorB == null)
            {
                instructorB = new User
                {
                    Id = instructorBId,
                    FullName = "Dr. Marcus Hale",
                    Email = "instructor.b@eduflow.ai",
                    PasswordHash = validPasswordHash,
                    Role = UserRole.Instructor,
                    IsActive = true
                };
                context.Users.Add(instructorB);
            }
            else
            {
                instructorB.FullName = "Dr. Marcus Hale";
                instructorB.PasswordHash = validPasswordHash;
                instructorB.IsActive = true;
            }
            context.SaveChanges();

            var courseBId = Guid.Parse("44444444-4444-4444-4444-444444444445");
            var courseB = context.Courses.FirstOrDefault(c =>
                c.Id == courseBId || c.Code == "SE-4100" || c.InstructorId == instructorB.Id);
            if (courseB == null)
            {
                courseB = new Course
                {
                    Id = courseBId,
                    Code = "SE-4100",
                    Title = "Distributed Systems & Event-Driven Architecture",
                    Description = "Design resilient distributed systems with message brokers, sagas, idempotent consumers, and observable event-driven pipelines.",
                    Category = "Software Engineering",
                    Term = "Fall 2026",
                    ThumbnailUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600",
                    InstructorId = instructorB.Id,
                    IsPublished = true,
                    Status = "Published",
                    Difficulty = EduFlow.Core.Enums.DifficultyLevel.Hard,
                    DurationHours = 24,
                    Price = 49.99m,
                    IsFree = false,
                    AverageRating = 4.6,
                    RatingCount = 3,
                    CreatedAt = DateTime.UtcNow.AddDays(-30),
                    UpdatedAt = DateTime.UtcNow.AddDays(-30)
                };
                context.Courses.Add(courseB);
                context.SaveChanges();
            }

            // A pending enrollment request awaiting Instructor B's approval.
            var pendingStudentId = Guid.Parse("33333333-3333-3333-3333-333333333334");
            if (!context.Enrollments.Any(e => e.CourseId == courseB.Id && e.StudentId == pendingStudentId))
            {
                context.Enrollments.Add(new Enrollment
                {
                    CourseId = courseB.Id,
                    StudentId = pendingStudentId,
                    ProgressPercentage = 0.0,
                    Status = EnrollmentStatus.Pending,
                    CreatedAt = DateTime.UtcNow.AddDays(-2)
                });
                context.SaveChanges();
            }

            // An approved student on Instructor B's course (eligible to leave a review).
            var courseBStudentId = Guid.Parse("33333333-3333-3333-3333-333333333335");
            if (!context.Enrollments.Any(e => e.CourseId == courseB.Id && e.StudentId == courseBStudentId))
            {
                context.Enrollments.Add(new Enrollment
                {
                    CourseId = courseB.Id,
                    StudentId = courseBStudentId,
                    ProgressPercentage = 42.0,
                    Status = EnrollmentStatus.Active,
                    CreatedAt = DateTime.UtcNow.AddDays(-20)
                });
                context.SaveChanges();
            }

            // Sample student reviews (kept in sync with the denormalized rating columns).
            var sampleReviews = new[]
            {
                new { CourseId = course.Id, StudentId = studentActual.Id, Rating = 5, Comment = "Best indexing deep-dive I've taken. The EXPLAIN ANALYZE labs were excellent." },
                new { CourseId = course.Id, StudentId = Guid.Parse("33333333-3333-3333-3333-333333333334"), Rating = 4, Comment = "Great pacing and very clear module structure." },
                new { CourseId = courseB.Id, StudentId = Guid.Parse("33333333-3333-3333-3333-333333333335"), Rating = 5, Comment = "Saga and idempotency patterns were immediately useful at work." }
            };

            foreach (var sr in sampleReviews)
            {
                // A review is only legitimate for a student enrolled in the course.
                if (!context.Enrollments.Any(e => e.CourseId == sr.CourseId && e.StudentId == sr.StudentId))
                {
                    context.Enrollments.Add(new Enrollment
                    {
                        CourseId = sr.CourseId,
                        StudentId = sr.StudentId,
                        ProgressPercentage = 50.0,
                        Status = EnrollmentStatus.Active,
                        CreatedAt = DateTime.UtcNow.AddDays(-25)
                    });
                }

                if (!context.CourseReviews.Any(r => r.CourseId == sr.CourseId && r.StudentId == sr.StudentId))
                {
                    context.CourseReviews.Add(new CourseReview
                    {
                        CourseId = sr.CourseId,
                        StudentId = sr.StudentId,
                        Rating = sr.Rating,
                        Comment = sr.Comment
                    });
                }
            }
            context.SaveChanges();

            foreach (var rid in new[] { course.Id, courseB.Id })
            {
                var courseRatings = context.CourseReviews
                    .Where(r => r.CourseId == rid)
                    .Select(r => r.Rating)
                    .ToList();
                if (courseRatings.Count == 0) continue;

                var ownedCourse = context.Courses.First(c => c.Id == rid);
                ownedCourse.RatingCount = courseRatings.Count;
                ownedCourse.AverageRating = Math.Round(courseRatings.Average(), 2);
            }
            context.SaveChanges();

            // Ensure public instructor profiles exist for the seeded instructors so
            // every instructor has a unique public profile out of the box.
            var instructorProfileSeeds = new[]
            {
                new
                {
                    UserId = instructorId,
                    Headline = "Database systems and backend architecture",
                    Bio = "Instructor of Advanced Database Architecture & EF Core. I teach how relational engines really work — storage, indexing, transactions and concurrency — with hands-on labs on PostgreSQL and EF Core.",
                    Expertise = "PostgreSQL, EF Core, Indexing, Transactions, Concurrency"
                },
                new
                {
                    UserId = instructorB.Id,
                    Headline = "Distributed systems and event-driven design",
                    Bio = "Instructor of Distributed Systems & Event-Driven Architecture. I help engineers design resilient systems with message brokers, sagas, idempotent consumers and observable pipelines.",
                    Expertise = "Distributed Systems, Messaging, Sagas, Observability"
                }
            };

            foreach (var seed in instructorProfileSeeds)
            {
                var existingProfile = context.InstructorProfiles
                    .FirstOrDefault(p => p.UserId == seed.UserId);
                if (existingProfile == null)
                {
                    context.InstructorProfiles.Add(new InstructorProfile
                    {
                        UserId = seed.UserId,
                        Headline = seed.Headline,
                        Bio = seed.Bio,
                        Expertise = seed.Expertise
                    });
                }
                else if (string.IsNullOrWhiteSpace(existingProfile.Bio))
                {
                    existingProfile.Headline = seed.Headline;
                    existingProfile.Bio = seed.Bio;
                    existingProfile.Expertise = seed.Expertise;
                }
            }
            context.SaveChanges();

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

            // Seed Alex Rivera Quiz Submission & Personal Best
            var alexSubmission = context.Submissions.FirstOrDefault(s => s.StudentId == studentActual.Id && s.AssessmentId == quizId);
            if (alexSubmission == null)
            {
                var subId = Guid.Parse("88888888-8888-8888-8888-888888888881");
                var sub = new Submission
                {
                    Id = subId,
                    AssessmentId = quizId,
                    StudentId = studentActual.Id,
                    ScoreObtained = 30,
                    MaxScore = 30,
                    PercentageScore = 100.0,
                    Passed = true,
                    IsAutoGraded = true,
                    InstructorFeedback = "Outstanding performance on relational indexing and isolation levels!",
                    SubmittedAt = DateTime.UtcNow.AddDays(-2)
                };
                context.Submissions.Add(sub);

                var q1Id = Guid.Parse("77777777-7777-7777-7777-777777777771");
                var q2Id = Guid.Parse("77777777-7777-7777-7777-777777777772");
                var q3Id = Guid.Parse("77777777-7777-7777-7777-777777777773");

                context.SubmissionAnswers.AddRange(
                    new SubmissionAnswer { SubmissionId = subId, QuestionId = q1Id, SelectedAnswer = "Isolation", IsCorrect = true, PointsAwarded = 10 },
                    new SubmissionAnswer { SubmissionId = subId, QuestionId = q2Id, SelectedAnswer = "Left-to-right starting with colA", IsCorrect = true, PointsAwarded = 10 },
                    new SubmissionAnswer { SubmissionId = subId, QuestionId = q3Id, SelectedAnswer = "Enforce safety invariants like ≤ 20h/wk workload ceiling", IsCorrect = true, PointsAwarded = 10 }
                );

                if (!context.PersonalBestRecords.Any(pb => pb.StudentId == studentActual.Id && pb.AssessmentId == quizId))
                {
                    context.PersonalBestRecords.Add(new PersonalBestRecord
                    {
                        StudentId = studentActual.Id,
                        AssessmentId = quizId,
                        BestScorePercent = 100,
                        BestTimeSeconds = 420,
                        AchievedAt = DateTime.UtcNow.AddDays(-2)
                    });
                }
                context.SaveChanges();
            }

            // Seed Alex Rivera XP Transactions
            if (!context.XpTransactions.Any(x => x.StudentId == studentActual.Id))
            {
                context.XpTransactions.AddRange(
                    new XpTransaction
                    {
                        StudentId = studentActual.Id,
                        SourceType = XpSourceType.QuizCompleted,
                        SourceId = quizId,
                        XpAmount = 80,
                        Description = "Completed Diagnostic Quiz: Clean Architecture & PostgreSQL",
                        CreatedAt = DateTime.UtcNow.AddDays(-5)
                    },
                    new XpTransaction
                    {
                        StudentId = studentActual.Id,
                        SourceType = XpSourceType.DailyChallenge,
                        SourceId = Guid.NewGuid(),
                        XpAmount = 120,
                        Description = "Completed Daily Mission: PostgreSQL Indexing Scans",
                        CreatedAt = DateTime.UtcNow.AddDays(-4)
                    },
                    new XpTransaction
                    {
                        StudentId = studentActual.Id,
                        SourceType = XpSourceType.LessonCompleted,
                        SourceId = Guid.NewGuid(),
                        XpAmount = 150,
                        Description = "Completed Lesson: B-Tree Indexing Masterclass",
                        CreatedAt = DateTime.UtcNow.AddDays(-3)
                    },
                    new XpTransaction
                    {
                        StudentId = studentActual.Id,
                        SourceType = XpSourceType.StreakBonus,
                        SourceId = Guid.NewGuid(),
                        XpAmount = 200,
                        Description = "Streak Reward: 5-Day Continuous Learning Streak",
                        CreatedAt = DateTime.UtcNow.AddDays(-2)
                    },
                    new XpTransaction
                    {
                        StudentId = studentActual.Id,
                        SourceType = XpSourceType.TeamChallenge,
                        SourceId = Guid.NewGuid(),
                        XpAmount = 250,
                        Description = "Team Quest Contribution: Master ACID Concurrency",
                        CreatedAt = DateTime.UtcNow.AddDays(-1)
                    }
                );
                context.SaveChanges();
            }

            // Seed Alex Rivera Skill Masteries
            if (!context.SkillMasteries.Any(sm => sm.StudentId == studentActual.Id))
            {
                context.SkillMasteries.AddRange(
                    new SkillMastery
                    {
                        StudentId = studentActual.Id,
                        CourseId = courseId,
                        TopicName = "B-Tree Indexing",
                        SkillName = "Index Selectivity & Search Scans",
                        MasteryPercentage = 92,
                        TotalAttempts = 5,
                        CorrectAttempts = 5,
                        LastAssessedAt = DateTime.UtcNow.AddDays(-1)
                    },
                    new SkillMastery
                    {
                        StudentId = studentActual.Id,
                        CourseId = courseId,
                        TopicName = "ACID Concurrency",
                        SkillName = "Isolation Levels & Anomalies",
                        MasteryPercentage = 85,
                        TotalAttempts = 4,
                        CorrectAttempts = 3,
                        LastAssessedAt = DateTime.UtcNow.AddDays(-1)
                    },
                    new SkillMastery
                    {
                        StudentId = studentActual.Id,
                        CourseId = courseId,
                        TopicName = "EF Core ORM",
                        SkillName = "Query Profiling & Compiled Queries",
                        MasteryPercentage = 78,
                        TotalAttempts = 3,
                        CorrectAttempts = 2,
                        LastAssessedAt = DateTime.UtcNow.AddDays(-2)
                    }
                );
                context.SaveChanges();
            }

            // Seed Alex Rivera Daily Missions
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (!context.StudentDailyMissions.Any(dm => dm.StudentId == studentActual.Id && dm.Date == today))
            {
                context.StudentDailyMissions.AddRange(
                    new StudentDailyMission
                    {
                        StudentId = studentActual.Id,
                        Date = today,
                        MissionKey = "LESSON_COMPLETE",
                        Title = "Deep Dive Lesson",
                        Description = "Complete 1 core curriculum lesson in CS-301",
                        CurrentCount = 1,
                        TargetCount = 1,
                        IsCompleted = true,
                        Claimed = true,
                        RewardXp = 50,
                        RewardCoins = 15
                    },
                    new StudentDailyMission
                    {
                        StudentId = studentActual.Id,
                        Date = today,
                        MissionKey = "PRACTICE_5_QUESTIONS",
                        Title = "Practice Master",
                        Description = "Answer 5 diagnostic or topic quiz questions",
                        CurrentCount = 5,
                        TargetCount = 5,
                        IsCompleted = true,
                        Claimed = true,
                        RewardXp = 60,
                        RewardCoins = 20
                    },
                    new StudentDailyMission
                    {
                        StudentId = studentActual.Id,
                        Date = today,
                        MissionKey = "AI_CHALLENGE",
                        Title = "AI Boss Battle",
                        Description = "Conquer an AI-generated challenge scenario",
                        CurrentCount = 1,
                        TargetCount = 1,
                        IsCompleted = true,
                        Claimed = false,
                        RewardXp = 100,
                        RewardCoins = 30
                    }
                );
                context.SaveChanges();
            }

            // Seed Alex Rivera Pending Study Plan for HITL AI Review & Governance
            var pendingPlanId = Guid.Parse("5e2966dc-5758-4f43-b5e9-0afc9fc6ae9a");
            if (!context.StudyPlans.Any(sp => sp.Id == pendingPlanId))
            {
                var pendingStudyPlan = new StudyPlan
                {
                    Id = pendingPlanId,
                    StudentId = studentActual.Id,
                    CourseId = courseId,
                    TargetGoal = "Remediate deadlock prevention, transaction isolation levels, and preparation for Midterm 2.",
                    TargetWeeks = 2,
                    HoursPerWeek = 8.0,
                    Status = StudyPlanStatus.PendingInstructorApproval,
                    CreatedAt = DateTime.UtcNow.AddHours(-2),
                    UpdatedAt = DateTime.UtcNow.AddHours(-2)
                };
                context.StudyPlans.Add(pendingStudyPlan);

                context.StudyPlanItems.AddRange(
                    new StudyPlanItem
                    {
                        StudyPlanId = pendingPlanId,
                        DayNumber = 1,
                        ActivityTitle = "Conceptual Diagnostic Review",
                        Description = "Study baseline concepts.",
                        EstimatedMinutes = 60,
                        IsCompleted = false
                    },
                    new StudyPlanItem
                    {
                        StudyPlanId = pendingPlanId,
                        DayNumber = 3,
                        ActivityTitle = "Hands-on Lab Exercise",
                        Description = "Interactive coding lab.",
                        EstimatedMinutes = 90,
                        IsCompleted = false
                    }
                );
                context.SaveChanges();
            }

            // Seed Alex Rivera Study Plan
            if (!context.StudyPlans.Any(sp => sp.StudentId == studentActual.Id))
            {
                var planId = Guid.Parse("aaaaaaa1-1111-1111-1111-111111111111");
                var studyPlan = new StudyPlan
                {
                    Id = planId,
                    StudentId = studentActual.Id,
                    CourseId = courseId,
                    TargetGoal = "Master Relational Query Execution, Index Optimization & ACID Concurrency",
                    TargetWeeks = 4,
                    HoursPerWeek = 8.0,
                    Status = StudyPlanStatus.Approved,
                    InstructorNotes = "Approved by Dr. Sarah Jenkins. Workload is well balanced (8 hrs/week).",
                    ApprovedByInstructorId = instructorId,
                    ApprovedAt = DateTime.UtcNow.AddDays(-7),
                    CreatedAt = DateTime.UtcNow.AddDays(-7),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1)
                };
                context.StudyPlans.Add(studyPlan);

                context.StudyPlanItems.AddRange(
                    new StudyPlanItem
                    {
                        StudyPlanId = planId,
                        DayNumber = 1,
                        ActivityTitle = "B-Tree Index Anatomy & Leaf Nodes",
                        Description = "Read PostgreSQL B-Tree internals documentation & complete indexing quiz",
                        EstimatedMinutes = 45,
                        IsCompleted = true
                    },
                    new StudyPlanItem
                    {
                        StudyPlanId = planId,
                        DayNumber = 2,
                        ActivityTitle = "EXPLAIN ANALYZE Execution Cost Profiling",
                        Description = "Analyze sequential scan vs index scan costs in psql CLI",
                        EstimatedMinutes = 60,
                        IsCompleted = true
                    },
                    new StudyPlanItem
                    {
                        StudyPlanId = planId,
                        DayNumber = 3,
                        ActivityTitle = "ACID Transaction Isolation & Deadlocks",
                        Description = "Practice resolving two-phase lock deadlocks in EF Core DbContext",
                        EstimatedMinutes = 50,
                        IsCompleted = true
                    },
                    new StudyPlanItem
                    {
                        StudyPlanId = planId,
                        DayNumber = 4,
                        ActivityTitle = "LangGraph Multi-Agent Architecture",
                        Description = "Review safety invariant validation guardrails in EduFlow AI",
                        EstimatedMinutes = 40,
                        IsCompleted = false
                    }
                );
                context.SaveChanges();
            }

            // Seed Alex Rivera Notifications
            if (!context.Notifications.Any(n => n.UserId == studentActual.Id))
            {
                context.Notifications.AddRange(
                    new Notification
                    {
                        UserId = studentActual.Id,
                        Title = "Welcome to EduFlow AI!",
                        Message = "Hi Alex, welcome to CS-301! Your AI learning assistant is ready.",
                        Type = "General",
                        IsRead = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-7)
                    },
                    new Notification
                    {
                        UserId = studentActual.Id,
                        Title = "Level Up! 🧩",
                        Message = "Congratulations! You reached Level 3: Logic Adept with 1,850 XP!",
                        Type = "LevelUp",
                        IsRead = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-2)
                    },
                    new Notification
                    {
                        UserId = studentActual.Id,
                        Title = "Badge Unlocked 🎯",
                        Message = "You unlocked the Quiz Ace badge for scoring 100% on Diagnostic Quiz!",
                        Type = "BadgeUnlocked",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow.AddDays(-1)
                    },
                    new Notification
                    {
                        UserId = studentActual.Id,
                        Title = "5-Day Streak Active! 🔥",
                        Message = "Keep going! You are on a 5-day continuous learning streak.",
                        Type = "StreakAlert",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow.AddHours(-3)
                    }
                );
                context.SaveChanges();
            }

            // Public storefront catalogue (published courses, curriculum, reviews).
            MarketplaceSeedData.Seed(context);
        }
    }
}
