using System;
using System.Collections.Generic;
using System.Linq;
using EduFlow.Core.Constants;
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
        // optionsBuilder.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
    }

    // Auth & Identity
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<InstructorProfile> InstructorProfiles => Set<InstructorProfile>();

    // Curriculum & Learning (Hierarchical)
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseReview> CourseReviews => Set<CourseReview>();
    public DbSet<Module> Modules => Set<Module>();
    public DbSet<Topic> Topics => Set<Topic>();
    public DbSet<ContentItem> ContentItems => Set<ContentItem>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<LessonCompletion> LessonCompletions => Set<LessonCompletion>();

    // Assessments & Quizzes (Unified Scope Engine)
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<QuizConfiguration> QuizConfigurations => Set<QuizConfiguration>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
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
    public DbSet<SkillMastery> SkillMasteries => Set<SkillMastery>();
    public DbSet<PersonalBestRecord> PersonalBestRecords => Set<PersonalBestRecord>();
    public DbSet<StudentDailyMission> StudentDailyMissions => Set<StudentDailyMission>();
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

    // Support Desk & Inquiries
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<SupportTicketResponse> SupportTicketResponses => Set<SupportTicketResponse>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- Support Desk & Inquiries ---
        modelBuilder.Entity<SupportTicket>(entity =>
        {
            entity.ToTable("SupportTickets");

            entity.Property(t => t.Type)
                  .HasConversion<string>()
                  .HasMaxLength(20)
                  .IsRequired();

            entity.Property(t => t.Status)
                  .HasConversion<string>()
                  .HasMaxLength(20)
                  .IsRequired();

            entity.Property(t => t.Message)
                  .HasMaxLength(5000)
                  .IsRequired();

            entity.Property(t => t.Version)
                  .IsConcurrencyToken()
                  .IsRequired();

            entity.Property(t => t.ClientRequestId)
                  .IsRequired();

            entity.HasOne(t => t.SubmittedByUser)
                  .WithMany(u => u.SubmittedSupportTickets)
                  .HasForeignKey(t => t.SubmittedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(t => new { t.SubmittedByUserId, t.ClientRequestId })
                  .IsUnique();

            entity.HasIndex(t => new { t.SubmittedByUserId, t.CreatedAt, t.Id });
            entity.HasIndex(t => new { t.Status, t.CreatedAt, t.Id });
            entity.HasIndex(t => new { t.Type, t.CreatedAt, t.Id });
            entity.HasIndex(t => new { t.CreatedAt, t.Id });
        });

        modelBuilder.Entity<SupportTicketResponse>(entity =>
        {
            entity.ToTable("SupportTicketResponses");

            entity.Property(r => r.Message)
                  .HasMaxLength(5000)
                  .IsRequired();

            entity.HasOne(r => r.SupportTicket)
                  .WithMany(t => t.Responses)
                  .HasForeignKey(r => r.SupportTicketId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.AdminUser)
                  .WithMany(u => u.AuthoredSupportTicketResponses)
                  .HasForeignKey(r => r.AdminUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(r => new { r.SupportTicketId, r.CreatedAt, r.Id });
        });

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

        modelBuilder.Entity<InstructorProfile>(entity =>
        {
            // Exactly one public profile per instructor account.
            entity.HasIndex(p => p.UserId).IsUnique();
            entity.Property(p => p.Bio).HasMaxLength(2000);
            entity.Property(p => p.Headline).HasMaxLength(200);
            entity.Property(p => p.Expertise).HasMaxLength(500);
            entity.HasOne(p => p.User)
                  .WithOne(u => u.InstructorProfile)
                  .HasForeignKey<InstructorProfile>(p => p.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Courses & Curriculum Hierarchy ---
        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasIndex(c => c.Code).IsUnique();
            entity.Property(c => c.Difficulty).HasConversion<string>();
            entity.Property(c => c.Price).HasPrecision(18, 2);
            entity.HasOne(c => c.Instructor)
                  .WithMany()
                  .HasForeignKey(c => c.InstructorId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CourseReview>(entity =>
        {
            // One review per student per course.
            entity.HasIndex(e => new { e.CourseId, e.StudentId }).IsUnique();
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_CourseReviews_Rating_Range", "\"Rating\" >= 1 AND \"Rating\" <= 5"));
            entity.Property(e => e.Status).HasConversion<string>();
            entity.HasIndex(e => new { e.CourseId, e.Status });
            entity.HasOne(r => r.Course)
                  .WithMany(c => c.Reviews)
                  .HasForeignKey(r => r.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(r => r.Student)
                  .WithMany()
                  .HasForeignKey(r => r.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Module>(entity =>
        {
            entity.HasOne(m => m.Course)
                  .WithMany(c => c.Modules)
                  .HasForeignKey(m => m.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Topic>(entity =>
        {
            entity.HasOne(t => t.Module)
                  .WithMany(m => m.Topics)
                  .HasForeignKey(t => t.ModuleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ContentItem>(entity =>
        {
            entity.HasOne(ci => ci.Module)
                  .WithMany(m => m.ContentItems)
                  .HasForeignKey(ci => ci.ModuleId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ci => ci.Topic)
                  .WithMany(t => t.ContentItems)
                  .HasForeignKey(ci => ci.TopicId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(ci => ci.ParentContent)
                  .WithMany(p => p.ChildContentItems)
                  .HasForeignKey(ci => ci.ParentContentId)
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
            // Database-level uniqueness: one enrollment row per (course, student) pair.
            // The approval workflow mutates Status on this single row instead of inserting
            // a second request, so a student can never hold duplicate active requests.
            entity.HasIndex(e => new { e.CourseId, e.StudentId }).IsUnique();
            entity.Property(e => e.Status).HasConversion<string>();
            entity.HasIndex(e => e.Status);
            entity.Property(e => e.ReviewNotes).HasMaxLength(1000);
            entity.HasOne(e => e.Course)
                  .WithMany(c => c.Enrollments)
                  .HasForeignKey(e => e.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Student)
                  .WithMany(u => u.Enrollments)
                  .HasForeignKey(e => e.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.ReviewedByInstructor)
                  .WithMany()
                  .HasForeignKey(e => e.ReviewedByInstructorId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<LessonCompletion>(entity =>
        {
            entity.HasOne(lc => lc.Lesson)
                  .WithMany(l => l.Completions)
                  .HasForeignKey(lc => lc.LessonId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(lc => lc.ContentItem)
                  .WithMany(ci => ci.Completions)
                  .HasForeignKey(lc => lc.ContentItemId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(lc => lc.Student)
                  .WithMany(u => u.LessonCompletions)
                  .HasForeignKey(lc => lc.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Assessments & Quizzes ---
        modelBuilder.Entity<Assessment>(entity =>
        {
            entity.Property(a => a.Type).HasConversion<string>();
            entity.Property(a => a.ScopeType).HasConversion<string>();
            entity.Property(a => a.Difficulty).HasConversion<string>();
            entity.Property(a => a.Status).HasConversion<string>();
            entity.Property(a => a.FeedbackMode).HasConversion<string>();

            entity.HasOne(a => a.Course)
                  .WithMany(c => c.Assessments)
                  .HasForeignKey(a => a.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.Configuration)
                  .WithOne(qc => qc.Quiz)
                  .HasForeignKey<QuizConfiguration>(qc => qc.QuizId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizConfiguration>(entity =>
        {
            entity.Property(qc => qc.FeedbackMode).HasConversion<string>();
        });

        modelBuilder.Entity<Question>(entity =>
        {
            entity.Property(q => q.Type).HasConversion<string>();
            entity.Property(q => q.Difficulty).HasConversion<string>();
            entity.HasOne(q => q.Assessment)
                  .WithMany(a => a.Questions)
                  .HasForeignKey(q => q.AssessmentId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(q => q.SourceContentItem)
                  .WithMany()
                  .HasForeignKey(q => q.SourceContentId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<QuestionOption>(entity =>
        {
            entity.HasOne(qo => qo.Question)
                  .WithMany(q => q.Options)
                  .HasForeignKey(qo => qo.QuestionId)
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
        // Sourced from LevelCurve, the single source of truth shared with GamificationService,
        // so the seeded table can never drift from the runtime level calculations again.
        modelBuilder.Entity<Level>().HasData(
            LevelCurve.Tiers.Select(t => new Level
            {
                Id = t.Level,
                Name = t.Name,
                MinimumXp = t.MinXp,
                MaximumXp = t.MaxXp,
                RewardCoins = t.RewardCoins,
                BadgeIcon = t.BadgeIcon
            }).ToArray()
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

        // Real bcrypt hash of "Password123!" (verified against BCrypt.Net)
        var defaultPasswordHash = "$2b$11$XttOyjKFmPO5VWTsm9VBpu4qGcJOb/40AFmKfMSVPoBc6FW8ehWYK";

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
