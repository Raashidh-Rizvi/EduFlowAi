namespace EduFlow.Core.Enums;

public enum UserRole
{
    Admin,
    Instructor,
    Student
}

public enum XpSourceType
{
    LessonCompleted,
    PracticeCompleted,
    TopicCompleted,
    ModuleCompleted,
    CourseCompleted,
    QuizCompleted,
    PassBonus,
    HighScoreBonus,
    PerfectScore,
    ImprovementBonus,
    StreakBonus,
    DailyMissionGrandBonus,
    DailyChallenge,
    WeeklyChallenge,
    BossBattle,
    TeamChallenge,
    AiAdaptiveChallenge,
    RemediationCompleted,
    FocusSession
}

public enum DifficultyLevel
{
    Easy,
    Medium,
    Hard,
    Boss
}

public enum ChallengeStatus
{
    Assigned,
    InProgress,
    Completed,
    Failed
}

public enum ChallengeType
{
    DailyMission,
    WeeklyChallenge,
    BossBattle,
    AdaptiveAiChallenge
}

public enum BadgeCategory
{
    Learning,
    Assessment,
    Consistency,
    Improvement,
    Mastery,
    Challenge,
    Streak,
    Social,
    Milestone
}

public enum NextBestActionType
{
    WatchLesson,
    ReviewTopic,
    TakeQuiz,
    TakeRemediationQuiz,
    DoChallenge,
    TakeBossChallenge,
    Rest
}

public enum StudyPlanStatus
{
    PendingInstructorApproval,
    Approved,
    Rejected,

    RevisionRequested
}

public enum AssessmentType
{
    Quiz,
    Assignment,
    Exam,
    BossBattle,
    TopicQuiz,
    ModuleQuiz,
    CourseQuiz,
    LessonQuiz
}

public enum QuizScopeType
{
    Topic,
    ContentItem,
    Module,
    Course
}

public enum QuizStatus
{
    Draft,
    AiGenerating,
    Validating,
    ReadyForReview,
    Approved,
    Published,
    RevisionRequested,
    Rejected,
    Unpublished,
    Archived,
    Failed
}

public enum FeedbackMode
{
    Immediate,
    OnSubmission,
    Manual
}

public enum QuestionType
{
    MultipleChoice,
    MultipleSelect,
    TrueFalse,
    ShortAnswer,
    FillInBlank,
    Matching,
    Ordering,
    ScenarioBased,
    TimedChallenge,
    CodeSnippet,
    OpenEnded
}

public enum EnrollmentStatus
{
    /// <summary>Approved and actively participating in the course.</summary>
    Active,

    /// <summary>Approved and finished the course.</summary>
    Completed,

    /// <summary>Approved enrollment later withdrawn (or roster-removed) by the instructor.</summary>
    Dropped,

    /// <summary>Student requested enrollment; awaiting instructor approval.</summary>
    Pending,

    /// <summary>Instructor rejected the student's enrollment request.</summary>
    Rejected,

    /// <summary>Student withdrew the enrollment request before an instructor decided.</summary>
    Cancelled
}

public static class EnrollmentStatusExtensions
{
    /// <summary>Statuses that grant a student access to a course's learning materials.</summary>
    public static bool GrantsAccess(this EnrollmentStatus status)
        => status == EnrollmentStatus.Active || status == EnrollmentStatus.Completed;

    /// <summary>
    /// Public-facing status label. The API contract exposes the approval workflow as
    /// PENDING / APPROVED / REJECTED / CANCELLED while the table keeps the legacy
    /// Active / Completed / Dropped values used by the rest of the platform.
    /// </summary>
    public static string ToApiLabel(this EnrollmentStatus status) => status switch
    {
        EnrollmentStatus.Pending => "PENDING",
        EnrollmentStatus.Active => "APPROVED",
        EnrollmentStatus.Completed => "COMPLETED",
        EnrollmentStatus.Rejected => "REJECTED",
        EnrollmentStatus.Cancelled => "CANCELLED",
        EnrollmentStatus.Dropped => "DROPPED",
        _ => status.ToString().ToUpperInvariant()
    };
}

/// <summary>
/// Moderation lifecycle of a <see cref="EduFlow.Core.Entities.CourseReview"/>.
/// Only <see cref="Approved"/> reviews contribute to course/instructor averages.
/// </summary>
public enum ReviewStatus
{
    /// <summary>Submitted, awaiting administrative moderation (used when approval is required).</summary>
    Pending,

    /// <summary>Visible to everyone and counted by the rating aggregation.</summary>
    Approved,

    /// <summary>Hidden by an administrator; excluded from averages everywhere.</summary>
    Rejected
}

public enum TeamRole
{
    Leader,
    Member
}

