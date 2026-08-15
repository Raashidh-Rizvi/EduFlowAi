using System;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Module> Modules => Set<Module>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<LessonCompletion> LessonCompletions => Set<LessonCompletion>();
    public DbSet<Assessment> Assessments => Set<Assessment>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<SubmissionAnswer> SubmissionAnswers => Set<SubmissionAnswer>();
    public DbSet<StudyPlan> StudyPlans => Set<StudyPlan>();
    public DbSet<StudyPlanItem> StudyPlanItems => Set<StudyPlanItem>();
    public DbSet<AiWorkflowLog> AiWorkflowLogs => Set<AiWorkflowLog>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Announcement> Announcements => Set<Announcement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.FullName).HasMaxLength(150).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(150).IsRequired();
            entity.Property(u => u.Role).HasConversion<string>();
        });

        // Course
        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasIndex(c => c.Code).IsUnique();
            entity.Property(c => c.Title).HasMaxLength(200).IsRequired();
            entity.HasOne(c => c.Instructor)
                  .WithMany(u => u.InstructedCourses)
                  .HasForeignKey(c => c.InstructorId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Enrollment
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

        // StudyPlan & AI Workflow Logs
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

        modelBuilder.Entity<AiWorkflowLog>(entity =>
        {
            entity.HasOne(l => l.StudyPlan)
                  .WithMany(sp => sp.Logs)
                  .HasForeignKey(l => l.StudyPlanId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed Initial Test Data
        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var adminId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var instructorId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var studentId = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var courseId = Guid.Parse("44444444-4444-4444-4444-444444444444");
        var moduleId = Guid.Parse("55555555-5555-5555-5555-555555555555");
        var lessonId = Guid.Parse("66666666-6666-6666-6666-666666666666");
        var assessmentId = Guid.Parse("77777777-7777-7777-7777-777777777777");

        // Hash for "Password123!" using BCrypt
        var defaultHash = "$2a$11$eE61K0f0q3hV4o4kK.XkIe4XhFwH8uXFq3tX0.Z1y0d3P5GqHhC.e";

        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = adminId,
                FullName = "Platform Administrator",
                Email = "admin@eduflow.ai",
                PasswordHash = defaultHash,
                Role = UserRole.Admin,
                CreatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = instructorId,
                FullName = "Dr. Sarah Jenkins",
                Email = "instructor@eduflow.ai",
                PasswordHash = defaultHash,
                Role = UserRole.Instructor,
                CreatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = studentId,
                FullName = "Alex Rivera",
                Email = "student@eduflow.ai",
                PasswordHash = defaultHash,
                Role = UserRole.Student,
                CreatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<Course>().HasData(
            new Course
            {
                Id = courseId,
                Code = "SE3090",
                Title = "Software Engineering Frameworks",
                Description = "Full-stack enterprise application engineering with ASP.NET Core, React, Flutter, and Agentic AI workflows.",
                Category = "Software Engineering",
                InstructorId = instructorId,
                IsPublished = true,
                CreatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<Module>().HasData(
            new Module
            {
                Id = moduleId,
                CourseId = courseId,
                Title = "Module 1: Enterprise Architectures & Agentic AI",
                Description = "Foundations of REST APIs, state machines, and multi-agent coordination.",
                OrderIndex = 1,
                CreatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<Lesson>().HasData(
            new Lesson
            {
                Id = lessonId,
                ModuleId = moduleId,
                Title = "Lesson 1: LangGraph State Graphs & Deterministic Validation",
                Content = "# Introduction to LangGraph\nLangGraph enables developers to build stateful multi-agent applications with cyclic flows and tool calls.",
                EstimatedMinutes = 45,
                OrderIndex = 1,
                CreatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<Assessment>().HasData(
            new Assessment
            {
                Id = assessmentId,
                CourseId = courseId,
                Title = "Quiz 1: Agentic AI & Clean Architecture",
                Description = "Knowledge check covering multi-agent coordination, tools, and relational database modeling.",
                Type = AssessmentType.Quiz,
                TimeLimitMinutes = 20,
                MaxScore = 100,
                CreatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
