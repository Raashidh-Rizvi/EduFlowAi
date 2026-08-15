using System;
using System.Collections.Generic;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    // 1. Identity
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // 2. Education & Curriculum
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Module> Modules => Set<Module>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<LessonCompletion> LessonCompletions => Set<LessonCompletion>();

    // 3. Assessment
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<SubmissionAnswer> SubmissionAnswers => Set<SubmissionAnswer>();

    // 4. Gamification
    public DbSet<XpTransaction> XpTransactions => Set<XpTransaction>();
    public DbSet<StudentXp> StudentXp => Set<StudentXp>();
    public DbSet<Level> Levels => Set<Level>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<StudentBadge> StudentBadges => Set<StudentBadge>();
    public DbSet<StudentStreak> StudentStreaks => Set<StudentStreak>();
    public DbSet<StreakHistory> StreakHistories => Set<StreakHistory>();
    public DbSet<Challenge> Challenges => Set<Challenge>();
    public DbSet<DailyChallenge> DailyChallenges => Set<DailyChallenge>();
    public DbSet<StudentChallenge> StudentChallenges => Set<StudentChallenge>();

    // 5. Social & Teams
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<TeamChallenge> TeamChallenges => Set<TeamChallenge>();

    // 6. AI & Governance
    public DbSet<StudyPlan> StudyPlans => Set<StudyPlan>();
    public DbSet<StudyPlanItem> StudyPlanItems => Set<StudyPlanItem>();
    public DbSet<AiWorkflowLog> AiWorkflowLogs => Set<AiWorkflowLog>();

    // 7. Notifications
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Announcement> Announcements => Set<Announcement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- Identity ---
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.FullName).HasMaxLength(150).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(150).IsRequired();
            entity.Property(u => u.Role).HasConversion<string>();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasOne(r => r.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(r => r.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Education ---
        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasIndex(c => c.Code).IsUnique();
            entity.Property(c => c.Title).HasMaxLength(200).IsRequired();
            entity.HasOne(c => c.Instructor)
                  .WithMany(u => u.InstructedCourses)
                  .HasForeignKey(c => c.InstructorId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Module>(entity =>
        {
            entity.HasOne(m => m.Course)
                  .WithMany(c => c.Modules)
                  .HasForeignKey(m => m.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.HasOne(l => l.Module)
                  .WithMany(m => m.Lessons)
                  .HasForeignKey(l => l.ModuleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Enrollment>(entity =>
        {
            entity.HasIndex(e => new { e.StudentId, e.CourseId }).IsUnique();
            entity.Property(e => e.Status).HasConversion<string>();
            entity.HasOne(e => e.Student)
                  .WithMany(u => u.Enrollments)
                  .HasForeignKey(e => e.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Course)
                  .WithMany(c => c.Enrollments)
                  .HasForeignKey(e => e.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Assessment ---
        modelBuilder.Entity<Assessment>(entity =>
        {
            entity.Property(a => a.Type).HasConversion<string>();
            entity.HasOne(a => a.Course)
                  .WithMany(c => c.Assessments)
                  .HasForeignKey(a => a.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Question>(entity =>
        {
            entity.Property(q => q.Type).HasConversion<string>();
            entity.HasOne(q => q.Assessment)
                  .WithMany(a => a.Questions)
                  .HasForeignKey(q => q.AssessmentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Submission>(entity =>
        {
            entity.HasOne(s => s.Assessment)
                  .WithMany(a => a.Submissions)
                  .HasForeignKey(s => s.AssessmentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(s => s.Student)
                  .WithMany(u => u.Submissions)
                  .HasForeignKey(s => s.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Gamification ---
        modelBuilder.Entity<StudentXp>(entity =>
        {
            entity.HasKey(s => s.StudentId);
            entity.HasOne(s => s.Student)
                  .WithOne(u => u.StudentXp)
                  .HasForeignKey<StudentXp>(s => s.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StudentStreak>(entity =>
        {
            entity.HasKey(s => s.StudentId);
            entity.HasOne(s => s.Student)
                  .WithOne(u => u.StudentStreak)
                  .HasForeignKey<StudentStreak>(s => s.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<XpTransaction>(entity =>
        {
            entity.Property(x => x.SourceType).HasConversion<string>();
            entity.HasIndex(x => x.StudentId);
            entity.HasOne(x => x.Student)
                  .WithMany(u => u.XpTransactions)
                  .HasForeignKey(x => x.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Badge>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Category).HasConversion<string>();
        });

        modelBuilder.Entity<StudentBadge>(entity =>
        {
            entity.HasIndex(sb => new { sb.StudentId, sb.BadgeId }).IsUnique();
            entity.HasOne(sb => sb.Student)
                  .WithMany(u => u.Badges)
                  .HasForeignKey(sb => sb.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(sb => sb.Badge)
                  .WithMany(b => b.StudentBadges)
                  .HasForeignKey(sb => sb.BadgeId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Challenge>(entity =>
        {
            entity.Property(c => c.Difficulty).HasConversion<string>();
            entity.Property(c => c.Type).HasConversion<string>();
            entity.HasOne(c => c.Course)
                  .WithMany(co => co.Challenges)
                  .HasForeignKey(c => c.CourseId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<StudentChallenge>(entity =>
        {
            entity.Property(sc => sc.Status).HasConversion<string>();
            entity.HasOne(sc => sc.Student)
                  .WithMany(u => u.StudentChallenges)
                  .HasForeignKey(sc => sc.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(sc => sc.Challenge)
                  .WithMany(c => c.StudentChallenges)
                  .HasForeignKey(sc => sc.ChallengeId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Social & Teams ---
        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasOne(t => t.Leader)
                  .WithMany()
                  .HasForeignKey(t => t.LeaderId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TeamMember>(entity =>
        {
            entity.HasIndex(tm => new { tm.TeamId, tm.StudentId }).IsUnique();
            entity.Property(tm => tm.Role).HasConversion<string>();
            entity.HasOne(tm => tm.Team)
                  .WithMany(t => t.Members)
                  .HasForeignKey(tm => tm.TeamId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(tm => tm.Student)
                  .WithMany(u => u.TeamMemberships)
                  .HasForeignKey(tm => tm.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- AI Workflows ---
        modelBuilder.Entity<StudyPlan>(entity =>
        {
            entity.Property(sp => sp.Status).HasConversion<string>();
            entity.HasOne(sp => sp.Student)
                  .WithMany(u => u.StudyPlans)
                  .HasForeignKey(sp => sp.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(sp => sp.ApprovedByInstructor)
                  .WithMany()
                  .HasForeignKey(sp => sp.ApprovedByInstructorId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Seed Data
        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        // 1. Levels Seed (Levels 1 to 10 with progressive curves)
        modelBuilder.Entity<Level>().HasData(
            new Level { Id = 1, Name = "Novice Explorer", MinimumXp = 0, MaximumXp = 499, RewardCoins = 50, BadgeIcon = "🌱" },
            new Level { Id = 2, Name = "Code Apprentice", MinimumXp = 500, MaximumXp = 1499, RewardCoins = 100, BadgeIcon = "⚡" },
            new Level { Id = 3, Name = "Logic Adept", MinimumXp = 1500, MaximumXp = 2999, RewardCoins = 150, BadgeIcon = "🧩" },
            new Level { Id = 4, Name = "Data Scholar", MinimumXp = 3000, MaximumXp = 4999, RewardCoins = 200, BadgeIcon = "📚" },
            new Level { Id = 5, Name = "Algorithm Knight", MinimumXp = 5000, MaximumXp = 7999, RewardCoins = 300, BadgeIcon = "⚔️" },
            new Level { Id = 6, Name = "Architecture Master", MinimumXp = 8000, MaximumXp = 11999, RewardCoins = 400, BadgeIcon = "🏰" },
            new Level { Id = 7, Name = "AI Grandmaster", MinimumXp = 12000, MaximumXp = 19999, RewardCoins = 500, BadgeIcon = "👑" },
            new Level { Id = 8, Name = "EduFlow Legend", MinimumXp = 20000, MaximumXp = 999999, RewardCoins = 1000, BadgeIcon = "🌟" }
        );

        // 2. Badges Seed
        modelBuilder.Entity<Badge>().HasData(
            new Badge { Id = "FIRST_LESSON", Title = "First Step", Description = "Completed your first lesson in EduFlow AI", IconUrl = "🚀", Category = BadgeCategory.Learning, XpBonus = 50 },
            new Badge { Id = "QUIZ_MASTER", Title = "Quiz Ace", Description = "Achieved 100% on any interactive quiz", IconUrl = "🎯", Category = BadgeCategory.Assessment, XpBonus = 100 },
            new Badge { Id = "SEVEN_DAY_STREAK", Title = "Unstoppable", Description = "Maintained a 7-day continuous learning streak", IconUrl = "🔥", Category = BadgeCategory.Streak, XpBonus = 200 },
            new Badge { Id = "CHALLENGE_CHAMPION", Title = "Boss Slayer", Description = "Completed 5 daily challenges or boss encounters", IconUrl = "🏆", Category = BadgeCategory.Milestone, XpBonus = 250 },
            new Badge { Id = "SQUAD_GOALS", Title = "Team Player", Description = "Joined a student learning squad", IconUrl = "🤝", Category = BadgeCategory.Social, XpBonus = 75 }
        );

        // 3. Demo Users
        var adminId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var instructorId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var studentId = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var courseId = Guid.Parse("44444444-4444-4444-4444-444444444444");

        // Plain BCrypt hash for "Password123!"
        var defaultPasswordHash = "$2a$11$e8.Z/qUj5k.P5jRzY9E4ee46h2Q9D7G5m3D6Q9a5Z8r.X6m8Z4K8S";

        modelBuilder.Entity<User>().HasData(
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
                FullName = "Prof. Alan Turing",
                Email = "instructor@eduflow.ai",
                PasswordHash = defaultPasswordHash,
                Role = UserRole.Instructor,
                IsActive = true
            },
            new User
            {
                Id = studentId,
                FullName = "Alex Rivera",
                Email = "student@eduflow.ai",
                PasswordHash = defaultPasswordHash,
                Role = UserRole.Student,
                IsActive = true
            }
        );

        modelBuilder.Entity<StudentXp>().HasData(
            new StudentXp
            {
                StudentId = studentId,
                TotalXp = 1250,
                CurrentLevel = 2,
                Coins = 180,
                UpdatedAt = DateTime.UtcNow
            }
        );

        modelBuilder.Entity<StudentStreak>().HasData(
            new StudentStreak
            {
                StudentId = studentId,
                CurrentStreak = 5,
                LongestStreak = 12,
                FreezeTokensAvailable = 2,
                LastActivityDate = DateOnly.FromDateTime(DateTime.UtcNow),
                UpdatedAt = DateTime.UtcNow
            }
        );

        // 4. Demo Course & Modules
        modelBuilder.Entity<Course>().HasData(
            new Course
            {
                Id = courseId,
                Code = "SE3090",
                Title = "Software Engineering Frameworks & Adaptive Systems",
                Description = "Master modern enterprise architectures, ASP.NET Core Clean Architecture, Flutter mobile design, and LangGraph multi-agent AI orchestration.",
                Category = "Software Engineering",
                IsPublished = true,
                InstructorId = instructorId
            }
        );

        var moduleId = Guid.Parse("55555555-5555-5555-5555-555555555555");
        modelBuilder.Entity<Module>().HasData(
            new Module
            {
                Id = moduleId,
                CourseId = courseId,
                Title = "Module 1: Clean Architecture & Gamification Mechanics",
                Description = "Domain modeling, repository patterns, event-driven XP accounting, and game loops.",
                OrderIndex = 1
            }
        );

        var lesson1Id = Guid.Parse("66666666-6666-6666-6666-666666666666");
        var lesson2Id = Guid.Parse("77777777-7777-7777-7777-777777777777");

        modelBuilder.Entity<Lesson>().HasData(
            new Lesson
            {
                Id = lesson1Id,
                ModuleId = moduleId,
                Title = "1.1 Introduction to Clean Architecture in .NET 8",
                Content = "Clean Architecture decouples core business logic and entities from external frameworks, databases, and UI representations.",
                VideoUrl = "https://www.youtube.com/watch?v=dK4Yb6-LxAk",
                XpReward = 30,
                EstimatedMinutes = 20,
                OrderIndex = 1
            },
            new Lesson
            {
                Id = lesson2Id,
                ModuleId = moduleId,
                Title = "1.2 Deterministic XP Ledgers & Game Mechanics",
                Content = "Never mutate user XP directly. Record every action as an immutable transaction in `xp_transactions` for auditability.",
                VideoUrl = "https://www.youtube.com/watch?v=Y4Z4Kj5n6mQ",
                XpReward = 40,
                EstimatedMinutes = 25,
                OrderIndex = 2
            }
        );

        // 5. Demo Challenge & Quiz
        var challengeId = Guid.Parse("88888888-8888-8888-8888-888888888888");
        modelBuilder.Entity<Challenge>().HasData(
            new Challenge
            {
                Id = challengeId,
                CourseId = courseId,
                Title = "Daily Mission: Clean Architecture Deep Dive",
                Description = "Complete 1 lesson and score >= 80% on the Clean Architecture Quiz to claim +100 XP!",
                Difficulty = DifficultyLevel.Medium,
                Type = ChallengeType.DailyMission,
                XpReward = 100,
                CoinReward = 40,
                TimeLimitMinutes = 15,
                QuestionsJson = "[{\"questionText\":\"Which layer should domain entities reside in?\",\"options\":[\"EduFlow.Core\",\"EduFlow.Api\",\"EduFlow.Infrastructure\"],\"correctIndex\":0,\"explanation\":\"Entities belong strictly in the Core domain layer.\"}]",
                GeneratedByAi = false,
                IsActive = true
            }
        );

        var quizId = Guid.Parse("99999999-9999-9999-9999-999999999999");
        modelBuilder.Entity<Assessment>().HasData(
            new Assessment
            {
                Id = quizId,
                CourseId = courseId,
                Title = "Module 1 Mastery Quiz",
                Description = "Evaluate your understanding of Clean Architecture and Gamification Engines.",
                Type = AssessmentType.Quiz,
                TimeLimitMinutes = 15,
                PassingScorePercent = 70,
                XpReward = 60,
                CoinReward = 25
            }
        );

        modelBuilder.Entity<Question>().HasData(
            new Question
            {
                Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                AssessmentId = quizId,
                Prompt = "What is the primary benefit of an immutable XP transaction ledger?",
                Type = QuestionType.MultipleChoice,
                OptionsJson = "[\"Eliminates duplicate awards and provides 100% auditability\",\"Makes database queries slower\",\"Requires no indexes\",\"Disables PostgreSQL foreign keys\"]",
                CorrectAnswer = "Eliminates duplicate awards and provides 100% auditability",
                Explanation = "An immutable ledger ensures every XP point can be traced back to a specific learning event.",
                Points = 10,
                OrderIndex = 1
            },
            new Question
            {
                Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                AssessmentId = quizId,
                Prompt = "Which architectural principle prevents the AI from directly mutating core business rules?",
                Type = QuestionType.MultipleChoice,
                OptionsJson = "[\"Deterministic Validation & Gateway Enforcment\",\"Unchecked LLM execution\",\"Client direct database access\",\"Single prompt scripting\"]",
                CorrectAnswer = "Deterministic Validation & Gateway Enforcment",
                Explanation = "The backend remains authoritative and validates all AI proposals against strict business rules.",
                Points = 10,
                OrderIndex = 2
            }
        );
    }
}
