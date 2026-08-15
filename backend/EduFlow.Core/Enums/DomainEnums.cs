namespace EduFlow.Core.Enums;

public enum UserRole
{
    Admin,
    Instructor,
    Student
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
    Assignment
}

public enum QuestionType
{
    MultipleChoice,
    TrueFalse,
    OpenEnded
}

public enum EnrollmentStatus
{
    Active,
    Completed,
    Dropped
}
