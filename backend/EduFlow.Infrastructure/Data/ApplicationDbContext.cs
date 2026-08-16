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

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        optionsBuilder.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }

    // Auth & Identity
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // Curriculum & Learning
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Module> Modules => Set<Module>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<LessonCompletion> LessonCompletions => Set<LessonCompletion>();

    // Assessments & Quizzes
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<SubmissionAnswer> SubmissionAnswers => Set<SubmissionAnswer>();

    // Gamification Engine
    public DbSet<StudentXp> StudentXp => Set<StudentXp>();
    public DbSet<XpTransaction> XpTransactions => Set<XpTransaction>();
    public DbSet<Level> Levels => Set<Level>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<StudentBadge> StudentBadges => Set<StudentBadge>();
    public DbSet<StudentStreak> StudentStreaks => Set<StudentStreak>();
    public DbSet<StreakHistory> StreakHistories => Set<StreakHistory>();
    public DbSet<Challenge> Challenges => Set<Challenge>();
    public DbSet<StudentChallenge> StudentChallenges => Set<StudentChallenge>();

    // Social & Teams
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();

    // Agentic AI Workflows & Review Queue
    public DbSet<StudyPlan> StudyPlans => Set<StudyPlan>();
    public DbSet<StudyPlanItem> StudyPlanItems => Set<StudyPlanItem>();
    public DbSet<AiWorkflowLog> AiWorkflowLogs => Set<AiWorkflowLog>();

    // Notifications & Broadcasts
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Announcement> Announcements => Set<Announcement>();

    // Analytics, Reports & Audit
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- Identity & Users ---
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Role).HasConversion<string>();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasIndex(r => r.Token).IsUnique();
            entity.HasOne(r => r.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(r => r.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Courses & Curriculum ---
        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasIndex(c => c.Code).IsUnique();
            entity.HasOne(c => c.Instructor)
                  .WithMany()
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
            entity.HasIndex(e => new { e.CourseId, e.StudentId }).IsUnique();
            entity.Property(e => e.Status).HasConversion<string>();
            entity.HasOne(e => e.Course)
                  .WithMany(c => c.Enrollments)
                  .HasForeignKey(e => e.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Student)
                  .WithMany(u => u.Enrollments)
                  .HasForeignKey(e => e.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LessonCompletion>(entity =>
        {
            entity.HasIndex(lc => new { lc.LessonId, lc.StudentId }).IsUnique();
            entity.HasOne(lc => lc.Lesson)
                  .WithMany(l => l.Completions)
                  .HasForeignKey(lc => lc.LessonId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(lc => lc.Student)
                  .WithMany(u => u.LessonCompletions)
                  .HasForeignKey(lc => lc.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Assessments ---
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

        modelBuilder.Entity<SubmissionAnswer>(entity =>
        {
            entity.HasOne(sa => sa.Submission)
                  .WithMany(s => s.Answers)
                  .HasForeignKey(sa => sa.SubmissionId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(sa => sa.Question)
                  .WithMany()
                  .HasForeignKey(sa => sa.QuestionId)
                  .OnDelete(DeleteBehavior.Restrict);
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

        // --- Analytics, Reports & Audit ---
        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasOne(r => r.GeneratedBy)
                  .WithMany()
                  .HasForeignKey(r => r.GeneratedById)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasOne(a => a.Actor)
                  .WithMany()
                  .HasForeignKey(a => a.ActorId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Seed Data
        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        // 1. Levels Seed (Levels 1 to 8 with progressive mathematical curves)
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
        // 2. Badges Seed
        modelBuilder.Entity<Badge>().HasData(
            new Badge { Id = "FIRST_LESSON", Title = "First Step", Description = "Completed your first lesson in EduFlow AI", IconUrl = "🚀", Category = BadgeCategory.Learning, XpBonus = 50 },
            new Badge { Id = "QUIZ_MASTER", Title = "Quiz Ace", Description = "Achieved 100% on any interactive quiz", IconUrl = "🎯", Category = BadgeCategory.Assessment, XpBonus = 100 },
            new Badge { Id = "SEVEN_DAY_STREAK", Title = "Unstoppable", Description = "Maintained a 7-day continuous learning streak", IconUrl = "🔥", Category = BadgeCategory.Streak, XpBonus = 200 },
            new Badge { Id = "CHALLENGE_CHAMPION", Title = "Boss Slayer", Description = "Completed 5 daily challenges or boss encounters", IconUrl = "🏆", Category = BadgeCategory.Milestone, XpBonus = 250 },
            new Badge { Id = "SQUAD_GOALS", Title = "Team Player", Description = "Joined a student learning squad", IconUrl = "🤝", Category = BadgeCategory.Social, XpBonus = 75 }
        );

        // 3. User Accounts (Admin, Instructor, Student)
        var adminId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var instructorId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var student1Id = Guid.Parse("33333333-3333-3333-3333-333333333333"); // Alex Rivera

        // Hash for "Password123!"
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

        // Student Gamification Baseline Profile
        var staticSeedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var staticSeedDateOnly = new DateOnly(2026, 1, 1);

        modelBuilder.Entity<StudentXp>().HasData(
            new StudentXp { StudentId = student1Id, TotalXp = 0, CurrentLevel = 1, Coins = 0, UpdatedAt = staticSeedDate }
        );

        modelBuilder.Entity<StudentStreak>().HasData(
            new StudentStreak { StudentId = student1Id, CurrentStreak = 0, LongestStreak = 0, FreezeTokensAvailable = 1, LastActivityDate = staticSeedDateOnly, UpdatedAt = staticSeedDate }
        );
    }
}
