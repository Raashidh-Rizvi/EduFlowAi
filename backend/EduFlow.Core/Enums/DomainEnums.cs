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
    RemediationCompleted
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
    Active,
    Completed,
    Dropped
}

public enum TeamRole
{
    Leader,
    Member
}

