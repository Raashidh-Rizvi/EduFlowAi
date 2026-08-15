using System;
using System.Collections.Generic;
using EduFlow.Core.Enums;

namespace EduFlow.Core.Entities;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Student;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<Course> InstructedCourses { get; set; } = new List<Course>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<StudyPlan> StudyPlans { get; set; } = new List<StudyPlan>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}

public class Course : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "Software Engineering";
    public bool IsPublished { get; set; } = true;
    public Guid InstructorId { get; set; }
    public User? Instructor { get; set; }

    // Navigation properties
    public ICollection<Module> Modules { get; set; } = new List<Module>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<Assessment> Assessments { get; set; } = new List<Assessment>();
}

public class Module : BaseEntity
{
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; }

    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}

public class Lesson : BaseEntity
{
    public Guid ModuleId { get; set; }
    public Module? Module { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? VideoUrl { get; set; }
    public int EstimatedMinutes { get; set; } = 30;
    public int OrderIndex { get; set; }
}

public class Enrollment : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public double ProgressPercentage { get; set; } = 0.0;
    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Active;
}

public class LessonCompletion : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public Guid LessonId { get; set; }
    public Lesson? Lesson { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}

public class Assessment : BaseEntity
{
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public AssessmentType Type { get; set; } = AssessmentType.Quiz;
    public int TimeLimitMinutes { get; set; } = 30;
    public int MaxScore { get; set; } = 100;
    public DateTime? DueDate { get; set; }

    public ICollection<Question> Questions { get; set; } = new List<Question>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}

public class Question : BaseEntity
{
    public Guid AssessmentId { get; set; }
    public Assessment? Assessment { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public QuestionType Type { get; set; } = QuestionType.MultipleChoice;
    public string OptionsJson { get; set; } = "[]"; // Serialized JSON options list
    public string CorrectAnswer { get; set; } = string.Empty;
    public int Points { get; set; } = 10;
}

public class Submission : BaseEntity
{
    public Guid AssessmentId { get; set; }
    public Assessment? Assessment { get; set; }
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public int ScoreObtained { get; set; }
    public bool IsAutoGraded { get; set; } = true;
    public string? InstructorFeedback { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public ICollection<SubmissionAnswer> Answers { get; set; } = new List<SubmissionAnswer>();
}

public class SubmissionAnswer : BaseEntity
{
    public Guid SubmissionId { get; set; }
    public Submission? Submission { get; set; }
    public Guid QuestionId { get; set; }
    public Question? Question { get; set; }
    public string SelectedAnswer { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public int PointsAwarded { get; set; }
}

public class StudyPlan : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public string TargetGoal { get; set; } = string.Empty;
    public int TargetWeeks { get; set; } = 4;
    public double HoursPerWeek { get; set; } = 10.0;
    public StudyPlanStatus Status { get; set; } = StudyPlanStatus.PendingInstructorApproval;
    public string? InstructorNotes { get; set; }
    public Guid? ApprovedByInstructorId { get; set; }
    public User? ApprovedByInstructor { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public ICollection<StudyPlanItem> Items { get; set; } = new List<StudyPlanItem>();
    public ICollection<AiWorkflowLog> Logs { get; set; } = new List<AiWorkflowLog>();
}

public class StudyPlanItem : BaseEntity
{
    public Guid StudyPlanId { get; set; }
    public StudyPlan? StudyPlan { get; set; }
    public int DayNumber { get; set; }
    public string ActivityTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid? ReferencedLessonId { get; set; }
    public Lesson? ReferencedLesson { get; set; }
    public Guid? ReferencedAssessmentId { get; set; }
    public Assessment? ReferencedAssessment { get; set; }
    public int EstimatedMinutes { get; set; } = 45;
    public bool IsCompleted { get; set; } = false;
}

public class AiWorkflowLog : BaseEntity
{
    public Guid StudyPlanId { get; set; }
    public StudyPlan? StudyPlan { get; set; }
    public string AgentName { get; set; } = string.Empty; // Planning | Analysis | Recommendation | Validation
    public string InputPayload { get; set; } = "{}";
    public string OutputPayload { get; set; } = "{}";
    public int ExecutionTimeMs { get; set; }
    public bool ValidationPassed { get; set; } = true;
    public string? ValidationErrors { get; set; }
}

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "General"; // StudyPlanApproved | Reminder | GradePosted | System
    public bool IsRead { get; set; } = false;
}

public class Announcement : BaseEntity
{
    public Guid? CourseId { get; set; }
    public Course? Course { get; set; }
    public Guid AuthorId { get; set; }
    public User? Author { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsGlobal { get; set; } = false;
}
