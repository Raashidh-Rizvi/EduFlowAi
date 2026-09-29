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

// -----------------------------------------------------------------------------
// 1. Identity & User Entities
// -----------------------------------------------------------------------------
public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public UserRole Role { get; set; } = UserRole.Student;
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public StudentXp? StudentXp { get; set; }
    public StudentStreak? StudentStreak { get; set; }
    public InstructorProfile? InstructorProfile { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<Course> InstructedCourses { get; set; } = new List<Course>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<XpTransaction> XpTransactions { get; set; } = new List<XpTransaction>();
    public ICollection<StudentBadge> Badges { get; set; } = new List<StudentBadge>();
    public ICollection<StudentChallenge> StudentChallenges { get; set; } = new List<StudentChallenge>();
    public ICollection<TeamMember> TeamMemberships { get; set; } = new List<TeamMember>();
    public ICollection<StudyPlan> StudyPlans { get; set; } = new List<StudyPlan>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<LessonCompletion> LessonCompletions { get; set; } = new List<LessonCompletion>();
}

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; } = false;
}

/// <summary>
/// Public-facing teaching profile for a user whose <see cref="User.Role"/> is
/// <see cref="UserRole.Instructor"/>. One row per user (unique <see cref="UserId"/>).
/// Name and profile image live on <see cref="User"/> (<c>FullName</c> / <c>AvatarUrl</c>);
/// this row carries the editable biography and expertise fields.
/// </summary>
public class InstructorProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Headline { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;

    /// <summary>Comma-separated expertise tags, e.g. "Databases,EF Core,Distributed Systems".</summary>
    public string Expertise { get; set; } = string.Empty;

    public string? WebsiteUrl { get; set; }
    public string? LinkedInUrl { get; set; }
}

// -----------------------------------------------------------------------------
// 2. Education & Curriculum Entities (Hierarchical: Course -> Module -> Topic -> ContentItem)
// -----------------------------------------------------------------------------
public class Course : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>One-to-two sentence marketing summary shown on course cards and search results.</summary>
    public string ShortDescription { get; set; } = string.Empty;

    public string Category { get; set; } = "Computer Science";
    public string Term { get; set; } = "Fall 2026";
    public string? ThumbnailUrl { get; set; }
    public bool IsPublished { get; set; } = true;
    public DifficultyLevel Difficulty { get; set; } = DifficultyLevel.Medium;
    public string Status { get; set; } = "Published"; // Draft, Published, Archived

    /// <summary>Course duration in hours. 0 means "duration not specified".</summary>
    public int DurationHours { get; set; } = 0;

    /// <summary>Enrollment price. Ignored when <see cref="IsFree"/> is true.</summary>
    public decimal Price { get; set; } = 0m;

    /// <summary>True when the course is freely enrollable.</summary>
    public bool IsFree { get; set; } = true;

    /// <summary>Denormalized average student rating (1-5). Maintained by the review pipeline.</summary>
    public double AverageRating { get; set; } = 0.0;

    /// <summary>Number of student ratings contributing to <see cref="AverageRating"/>.</summary>
    public int RatingCount { get; set; } = 0;

    public Guid InstructorId { get; set; }
    public User? Instructor { get; set; }

    /// <summary>Instructor-authored learning outcomes rendered as the "What you'll learn" checklist.</summary>
    public string LearningOutcomesJson { get; set; } = "[]";

    /// <summary>Instructor-authored requirements students should meet before enrolling.</summary>
    public string PrerequisitesJson { get; set; } = "[]";

    /// <summary>Instructor-authored description of who this course targets.</summary>
    public string TargetAudienceJson { get; set; } = "[]";

    /// <summary>Primary instruction language displayed on the course page.</summary>
    public string Language { get; set; } = "English";

    /// <summary>Total XP a student can earn from this course. Display-only guidance:
    /// actual awards are always computed server-side from lesson/quiz/assessment events.</summary>
    public int XpReward { get; set; } = 0;

    /// <summary>Whether finishing this course grants a certificate of completion.</summary>
    public bool CertificateEnabled { get; set; } = false;

    public ICollection<Module> Modules { get; set; } = new List<Module>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<Assessment> Assessments { get; set; } = new List<Assessment>();
    public ICollection<Challenge> Challenges { get; set; } = new List<Challenge>();
    public ICollection<CourseReview> Reviews { get; set; } = new List<CourseReview>();
}

/// <summary>
/// A student's rating + comment for a course they are enrolled in.
/// One review per (course, student) pair — enforced by a unique index.
/// Only reviews whose <see cref="Status"/> is <see cref="ReviewStatus.Approved"/>
/// are visible publicly and counted by the rating aggregation.
/// </summary>
public class CourseReview : BaseEntity
{
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public int Rating { get; set; } = 5; // 1..5
    public string Comment { get; set; } = string.Empty;
    public ReviewStatus Status { get; set; } = ReviewStatus.Approved;
    public DateTime? ModeratedAt { get; set; }
    public Guid? ModeratedById { get; set; }
}

public class Module : BaseEntity
{
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? PdfUrl { get; set; }
    public string? AttachmentFileName { get; set; }
    public int OrderIndex { get; set; }
    public string Status { get; set; } = "Published";

    public ICollection<Topic> Topics { get; set; } = new List<Topic>();
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public ICollection<ContentItem> ContentItems { get; set; } = new List<ContentItem>();
    public ICollection<Assessment> Assessments { get; set; } = new List<Assessment>();
}

public class Topic : BaseEntity
{
    public Guid ModuleId { get; set; }
    public Module? Module { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public string ContentType { get; set; } = "Theory"; // Theory, Practical, Assessment, Workshop
    public int EstimatedMinutes { get; set; } = 30;
    public string Status { get; set; } = "Published";

    public ICollection<ContentItem> ContentItems { get; set; } = new List<ContentItem>();
    public ICollection<Assessment> Assessments { get; set; } = new List<Assessment>();
}

public class ContentItem : BaseEntity
{
    public Guid ModuleId { get; set; }
    public Module? Module { get; set; }
    public Guid? TopicId { get; set; }
    public Topic? Topic { get; set; }
    public Guid? ParentContentId { get; set; }
    public ContentItem? ParentContent { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string ContentType { get; set; } = "Lesson"; // Lesson, Subtopic, Video, Reading, Lab, Exercise
    public int DisplayOrder { get; set; }
    public int EstimatedMinutes { get; set; } = 20;
    public int XpReward { get; set; } = 25;
    public string? VideoUrl { get; set; }
    public string? PdfUrl { get; set; }
    public string? AttachmentFileName { get; set; }
    public string Status { get; set; } = "Published";

    public ICollection<ContentItem> ChildContentItems { get; set; } = new List<ContentItem>();
    public ICollection<Assessment> Assessments { get; set; } = new List<Assessment>();
    public ICollection<LessonCompletion> Completions { get; set; } = new List<LessonCompletion>();
}

public class Lesson : BaseEntity
{
    public Guid ModuleId { get; set; }
    public Module? Module { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? VideoUrl { get; set; }
    public string? PdfUrl { get; set; }
    public string? AttachmentFileName { get; set; }
    public int XpReward { get; set; } = 25;
    public int EstimatedMinutes { get; set; } = 20;
    public int OrderIndex { get; set; }

    /// <summary>
    /// When true, the lesson body may be read WITHOUT enrollment (anonymous preview),
    /// provided the parent course is published. Instructors mark this from the
    /// curriculum editor to advertise their course.
    /// </summary>
    public bool IsFreePreview { get; set; } = false;

    public ICollection<LessonCompletion> Completions { get; set; } = new List<LessonCompletion>();
}

public class Enrollment : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public double ProgressPercentage { get; set; } = 0.0;
    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Active;

    /// <summary>When the (re-)submission that produced the current status was made.</summary>
    public DateTime? RequestedAt { get; set; }

    /// <summary>When an instructor approved or rejected this enrollment.</summary>
    public DateTime? ReviewedAt { get; set; }

    /// <summary>The instructor who approved/rejected. Null for admin or system actions.</summary>
    public Guid? ReviewedByInstructorId { get; set; }
    public User? ReviewedByInstructor { get; set; }

    /// <summary>Instructor's decision note (e.g. rejection reason).</summary>
    public string? ReviewNotes { get; set; }
}

public class LessonCompletion : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public Guid? LessonId { get; set; }
    public Lesson? Lesson { get; set; }
    public Guid? ContentItemId { get; set; }
    public ContentItem? ContentItem { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}

// -----------------------------------------------------------------------------
// 3. Assessment & Unified Quiz Scope Engine Entities
// -----------------------------------------------------------------------------
public class Assessment : BaseEntity
{
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public QuizScopeType ScopeType { get; set; } = QuizScopeType.Course;
    public Guid? ScopeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public AssessmentType Type { get; set; } = AssessmentType.Quiz;
    public DifficultyLevel Difficulty { get; set; } = DifficultyLevel.Medium;
    public int TimeLimitSeconds { get; set; } = 900; // 15 mins default
    public int TimeLimitMinutes { get; set; } = 15;
    public int AttemptsAllowed { get; set; } = 3;
    public int PassingScorePercent { get; set; } = 70;
    public int QuestionCount { get; set; } = 5;
    public bool RandomizeQuestions { get; set; } = true;
    public bool RandomizeOptions { get; set; } = true;
    public FeedbackMode FeedbackMode { get; set; } = FeedbackMode.Immediate;
    public bool ShowCorrectAnswers { get; set; } = true;
    public int XpReward { get; set; } = 50;
    public int CoinReward { get; set; } = 20;
    public QuizStatus Status { get; set; } = QuizStatus.Published;
    public Guid? CreatedBy { get; set; }
    public bool GeneratedByAI { get; set; } = false;
    public string? GenerationWorkflowId { get; set; }
    public DateTime? DueDate { get; set; }

    // Navigation properties for hierarchy scopes
    public Guid? TopicScopeId { get; set; }
    public Topic? TopicScope { get; set; }
    public Guid? ContentItemScopeId { get; set; }
    public ContentItem? ContentItemScope { get; set; }
    public Guid? ModuleScopeId { get; set; }
    public Module? ModuleScope { get; set; }
    public QuizConfiguration? Configuration { get; set; }
    public ICollection<Question> Questions { get; set; } = new List<Question>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}

public class QuizConfiguration : BaseEntity
{
    public Guid QuizId { get; set; }
    public Assessment? Quiz { get; set; }
    public int QuestionCount { get; set; } = 10;
    public string QuestionTypeDistributionJson { get; set; } = "{}"; // e.g. {"MultipleChoice":6,"MultipleSelect":2,"TrueFalse":2}
    public string DifficultyDistributionJson { get; set; } = "{}";   // e.g. {"Easy":3,"Medium":5,"Hard":2}
    public string SelectedTopicIdsJson { get; set; } = "[]";
    public string SelectedContentIdsJson { get; set; } = "[]";
    public int TimeLimitSeconds { get; set; } = 900;
    public int PassPercentage { get; set; } = 70;
    public int AttemptsAllowed { get; set; } = 3;
    public bool RandomizeQuestions { get; set; } = true;
    public bool RandomizeOptions { get; set; } = true;
    public FeedbackMode FeedbackMode { get; set; } = FeedbackMode.Immediate;
    public bool NegativeMarking { get; set; } = false;
}

public class Question : BaseEntity
{
    public Guid AssessmentId { get; set; }
    public Assessment? Assessment { get; set; }
    public string Prompt { get; set; } = string.Empty; // Question text
    public QuestionType Type { get; set; } = QuestionType.MultipleChoice;
    public string OptionsJson { get; set; } = "[]"; // Serialized JSON array of string options (or complex option objects)
    public string CorrectAnswer { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public DifficultyLevel Difficulty { get; set; } = DifficultyLevel.Medium;
    public int Points { get; set; } = 10; // Marks
    public int OrderIndex { get; set; }
    public Guid? SourceContentId { get; set; }
    public ContentItem? SourceContentItem { get; set; }
    public string? LearningObjective { get; set; }
    public string MetadataJson { get; set; } = "{}"; // bloomsTaxonomy, distractorRationales, matchingPairs, sequenceOrder

    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();
}

public class QuestionOption : BaseEntity
{
    public Guid QuestionId { get; set; }
    public Question? Question { get; set; }
    public string OptionText { get; set; } = string.Empty;
    public bool IsCorrect { get; set; } = false;
    public int DisplayOrder { get; set; }
}

public class Submission : BaseEntity
{
    public Guid AssessmentId { get; set; }
    public Assessment? Assessment { get; set; }
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public int ScoreObtained { get; set; }
    public int MaxScore { get; set; }
    public double PercentageScore { get; set; }
    public bool Passed { get; set; }
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


// -----------------------------------------------------------------------------
// 4. Gamification: XP, Levels, Badges, Streaks & Challenges
// -----------------------------------------------------------------------------
public class XpTransaction : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public XpSourceType SourceType { get; set; }
    public Guid SourceId { get; set; }
    public int XpAmount { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class StudentXp
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public int TotalXp { get; set; } = 0;
    public int CurrentLevel { get; set; } = 1;
    public int Coins { get; set; } = 0;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Level
{
    public int Id { get; set; } // Level number (1, 2, 3...)
    public string Name { get; set; } = string.Empty; // Beginner, Explorer, Learner, Scholar, Expert, Master, Legend
    public int MinimumXp { get; set; }
    public int MaximumXp { get; set; }
    public int RewardCoins { get; set; } = 50;
    public string? BadgeIcon { get; set; }
}

public class Badge
{
    public string Id { get; set; } = string.Empty; // e.g. "FIRST_LESSON", "QUIZ_MASTER", "SEVEN_DAY_STREAK"
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string IconUrl { get; set; } = string.Empty;
    public BadgeCategory Category { get; set; } = BadgeCategory.Learning;
    public int XpBonus { get; set; } = 100;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<StudentBadge> StudentBadges { get; set; } = new List<StudentBadge>();
}

public class StudentBadge : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public string BadgeId { get; set; } = string.Empty;
    public Badge? Badge { get; set; }
    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;
}

public class StudentStreak
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public int CurrentStreak { get; set; } = 0;
    public int LongestStreak { get; set; } = 0;
    public int FreezeTokensAvailable { get; set; } = 2;
    public DateOnly? LastActivityDate { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class StreakHistory : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public DateOnly ActivityDate { get; set; }
    public string ActivityType { get; set; } = string.Empty; // Quiz, Lesson, Challenge
}

public class Challenge : BaseEntity
{
    public Guid? CourseId { get; set; }
    public Course? Course { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DifficultyLevel Difficulty { get; set; } = DifficultyLevel.Medium;
    public ChallengeType Type { get; set; } = ChallengeType.DailyMission;
    public int XpReward { get; set; } = 100;
    public int CoinReward { get; set; } = 30;
    public int TimeLimitMinutes { get; set; } = 15;
    public string QuestionsJson { get; set; } = "[]"; // Serialized question set
    public bool GeneratedByAi { get; set; } = false;
    public bool IsActive { get; set; } = true;

    public ICollection<StudentChallenge> StudentChallenges { get; set; } = new List<StudentChallenge>();
}

public class DailyChallenge : BaseEntity
{
    public Guid ChallengeId { get; set; }
    public Challenge? Challenge { get; set; }
    public DateOnly TargetDate { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public class SkillMastery : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public Guid? CourseId { get; set; }
    public Course? Course { get; set; }
    public Guid? ModuleId { get; set; }
    public Module? Module { get; set; }
    public Guid? TopicId { get; set; }
    public Topic? Topic { get; set; }
    public string TopicName { get; set; } = string.Empty;
    public string SkillName { get; set; } = string.Empty;
    public int MasteryPercentage { get; set; } = 0; // 0 to 100
    public int TotalAttempts { get; set; } = 0;
    public int CorrectAttempts { get; set; } = 0;
    public DateTime LastAssessedAt { get; set; } = DateTime.UtcNow;
}

public class PersonalBestRecord : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public Guid AssessmentId { get; set; }
    public Assessment? Assessment { get; set; }
    public int BestScorePercent { get; set; }
    public int BestTimeSeconds { get; set; }
    public DateTime AchievedAt { get; set; } = DateTime.UtcNow;
}

public class StudentDailyMission : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public DateOnly Date { get; set; }
    public string MissionKey { get; set; } = string.Empty; // LESSON_COMPLETE, PRACTICE_5_QUESTIONS, SCORE_70_QUIZ, AI_CHALLENGE
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int CurrentCount { get; set; } = 0;
    public int TargetCount { get; set; } = 1;
    public bool IsCompleted { get; set; } = false;
    public int RewardXp { get; set; } = 20;
    public int RewardCoins { get; set; } = 5;
    public bool Claimed { get; set; } = false;
}

public class StudentChallenge : BaseEntity
{
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public Guid ChallengeId { get; set; }
    public Challenge? Challenge { get; set; }
    public ChallengeStatus Status { get; set; } = ChallengeStatus.Assigned;
    public int ScoreObtained { get; set; } = 0;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

// -----------------------------------------------------------------------------
// 5. Social, Teams & Competition Entities
// -----------------------------------------------------------------------------
public class Team : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public Guid LeaderId { get; set; }
    public User? Leader { get; set; }

    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    public ICollection<TeamChallenge> TeamChallenges { get; set; } = new List<TeamChallenge>();
}

public class TeamMember : BaseEntity
{
    public Guid TeamId { get; set; }
    public Team? Team { get; set; }
    public Guid StudentId { get; set; }
    public User? Student { get; set; }
    public TeamRole Role { get; set; } = TeamRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public class TeamChallenge : BaseEntity
{
    public Guid TeamId { get; set; }
    public Team? Team { get; set; }
    public Guid ChallengeId { get; set; }
    public Challenge? Challenge { get; set; }
    public int ProgressScore { get; set; } = 0;
    public int TargetScore { get; set; } = 1000;
    public bool IsCompleted { get; set; } = false;
}

// -----------------------------------------------------------------------------
// 6. AI Workflows & Human-in-the-Loop Governance
// -----------------------------------------------------------------------------
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
    public Guid? StudyPlanId { get; set; }
    public StudyPlan? StudyPlan { get; set; }
    public string WorkflowId { get; set; } = string.Empty;
    public string AgentName { get; set; } = string.Empty; // LearningAnalysis | ChallengeGeneration | Validation | Coach
    public string InputPayload { get; set; } = "{}";
    public string OutputPayload { get; set; } = "{}";
    public int ExecutionTimeMs { get; set; }
    public bool ValidationPassed { get; set; } = true;
    public string? ValidationErrors { get; set; }
}

// -----------------------------------------------------------------------------
// 7. Notifications & Communication Entities
// -----------------------------------------------------------------------------
public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "General"; // LevelUp, BadgeUnlocked, StreakAlert, ChallengeAssigned, AiApproved
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

// -----------------------------------------------------------------------------
// 8. Analytics, Reports & Audit Trail Entities
// -----------------------------------------------------------------------------
public class Report : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = "StudentPerformance"; // StudentPerformance | CourseAnalytics | EngagementSummary | GamificationAudit
    public Guid? GeneratedById { get; set; }
    public User? GeneratedBy { get; set; }
    public string Status { get; set; } = "Completed"; // Pending | Completed | Failed
    public string SummaryJson { get; set; } = "{}";
    public string? FileUrl { get; set; }
}

public class AuditLog : BaseEntity
{
    public Guid? ActorId { get; set; }
    public User? Actor { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string IpAddress { get; set; } = "127.0.0.1";
}
