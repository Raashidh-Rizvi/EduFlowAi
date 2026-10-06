using System;
using System.Collections.Generic;

namespace EduFlow.Core.DTOs;

public record CourseDto(
    Guid Id,
    string Code,
    string Title,
    string Description,
    string Category,
    string? ThumbnailUrl,
    bool IsPublished,
    Guid InstructorId,
    string? InstructorName,
    int ModulesCount,
    int LessonsCount,
    string Term = "Fall 2026",
    int StudentsCount = 0,
    int TopicsCount = 0,
    int QuizzesCount = 0,
    double CompletionRate = 0.0,
    double AvgScore = 0.0,
    double Engagement = 0.0,
    string Difficulty = "Medium",
    string Status = "Published",
    int DurationHours = 0,
    decimal Price = 0m,
    bool IsFree = true,
    double AverageRating = 0.0,
    int RatingCount = 0,
    string ShortDescription = "",
    string Language = "English",
    int XpReward = 0,
    bool CertificateEnabled = false,
    IReadOnlyList<string>? LearningOutcomes = null,
    IReadOnlyList<string>? Prerequisites = null,
    IReadOnlyList<string>? TargetAudience = null
);

public record CourseDetailDto(
    Guid Id,
    string Code,
    string Title,
    string Description,
    string Category,
    string? ThumbnailUrl,
    Guid InstructorId,
    string? InstructorName,
    List<ModuleDto> Modules,
    List<QuizDto>? Quizzes = null,
    string Term = "Fall 2026",
    double AverageRating = 0.0,
    int RatingCount = 0,
    bool CanAccessMaterials = false
);

public record ModuleDto(
    Guid Id,
    string Title,
    string Description,
    int OrderIndex,
    string? PdfUrl,
    string? AttachmentFileName,
    List<LessonSummaryDto> Lessons,
    List<QuizDto>? Quizzes = null
);

public record LessonSummaryDto(
    Guid Id,
    string Title,
    int XpReward,
    int EstimatedMinutes,
    int OrderIndex,
    bool IsCompleted,
    string? PdfUrl = null,
    string? AttachmentFileName = null
);

public record LessonDetailDto(
    Guid Id,
    Guid ModuleId,
    string Title,
    string Content,
    string? VideoUrl,
    string? PdfUrl,
    string? AttachmentFileName,
    int XpReward,
    int EstimatedMinutes,
    int OrderIndex,
    bool IsCompleted
);

/// <summary>
/// Payload used to create a course.
/// NOTE: there is deliberately NO InstructorId / OwnerId property here.
/// Ownership is always derived from the authenticated caller's JWT on the server.
/// </summary>
public record CreateCourseRequest(
    string Code,
    string Title,
    string Description,
    string Category,
    string? ThumbnailUrl,
    string? Term = "Fall 2026",
    string Difficulty = "Medium",
    int DurationHours = 0,
    decimal Price = 0m,
    bool IsFree = true,
    string? ShortDescription = null,
    string Language = "English",
    int XpReward = 0,
    bool CertificateEnabled = false,
    List<string>? LearningOutcomes = null,
    List<string>? Prerequisites = null,
    List<string>? TargetAudience = null
);

public record CreateModuleRequest(
    string Title,
    string Description,
    int OrderIndex,
    string? PdfUrl = null,
    string? AttachmentFileName = null
);

public record UpdateModuleRequest(
    string Title,
    string Description,
    int OrderIndex,
    string? PdfUrl = null,
    string? AttachmentFileName = null
);

public record CreateLessonRequest(
    string Title,
    string Content,
    string? VideoUrl,
    int XpReward,
    int EstimatedMinutes,
    int OrderIndex,
    string? PdfUrl = null,
    string? AttachmentFileName = null,
    bool IsFreePreview = false
);

public record UpdateLessonRequest(
    string Title,
    string Content,
    string? VideoUrl,
    int XpReward,
    int EstimatedMinutes,
    int OrderIndex,
    string? PdfUrl = null,
    string? AttachmentFileName = null,
    bool? IsFreePreview = null
);

public record PdfUploadResultDto(
    string FileUrl,
    string FileName,
    long FileSizeBytes,
    string Message
);

public record PublishCourseRequest(
    bool IsPublished
);

public record EnrolledCourseDto(
    Guid EnrollmentId,
    Guid CourseId,
    string CourseCode,
    string CourseTitle,
    string? ThumbnailUrl,
    string Category,
    string InstructorName,
    double ProgressPercentage,
    string Status,
    DateTime EnrolledAt,
    int TotalLessons,
    int CompletedLessons,
    string Term = "Fall 2026",
    Guid InstructorId = default,
    double AverageRating = 0.0,
    int RatingCount = 0
);

public record AddStudentToCourseRequest(
    Guid? StudentId,
    string? Email
);

public record EnrolledStudentDto(
    Guid StudentId,
    string FullName,
    string Email,
    DateTime EnrolledAt,
    double ProgressPercentage,
    string Status
);

public record AvailableStudentDto(
    Guid StudentId,
    string FullName,
    string Email,
    bool IsActive
);

// -----------------------------------------------------------------------------
// Hierarchical Content DTOs: Course -> Module -> Topic -> ContentItem
// -----------------------------------------------------------------------------
public record TopicDto(
    Guid Id,
    Guid ModuleId,
    string Title,
    string Description,
    int DisplayOrder,
    string ContentType,
    int EstimatedMinutes,
    string Status,
    List<ContentItemDto> ContentItems,
    int QuizzesCount = 0
);

public record CreateTopicRequest(
    Guid ModuleId,
    string Title,
    string Description,
    int DisplayOrder = 1,
    string ContentType = "Theory",
    int EstimatedMinutes = 30
);

public record UpdateTopicRequest(
    string Title,
    string Description,
    int DisplayOrder,
    string ContentType,
    int EstimatedMinutes,
    string Status = "Published"
);

public record ContentItemDto(
    Guid Id,
    Guid ModuleId,
    Guid? TopicId,
    Guid? ParentContentId,
    string Title,
    string Content,
    string ContentType,
    int DisplayOrder,
    int EstimatedMinutes,
    int XpReward,
    string? VideoUrl,
    string? PdfUrl,
    string? AttachmentFileName,
    string Status,
    bool IsCompleted = false,
    List<ContentItemDto>? Subtopics = null,
    int QuizzesCount = 0
);

public record CreateContentItemRequest(
    Guid ModuleId,
    Guid? TopicId,
    Guid? ParentContentId,
    string Title,
    string Content,
    string ContentType = "Lesson",
    int DisplayOrder = 1,
    int EstimatedMinutes = 20,
    int XpReward = 25,
    string? VideoUrl = null,
    string? PdfUrl = null,
    string? AttachmentFileName = null
);

public record UpdateContentItemRequest(
    string Title,
    string Content,
    string ContentType,
    int DisplayOrder,
    int EstimatedMinutes,
    int XpReward,
    string? VideoUrl = null,
    string? PdfUrl = null,
    string? AttachmentFileName = null,
    string Status = "Published"
);

public record ContentHierarchyTreeDto(
    Guid CourseId,
    string CourseCode,
    string CourseTitle,
    string Description,
    List<HierarchicalModuleDto> Modules,
    List<QuizDto> CourseLevelQuizzes
);

public record HierarchicalModuleDto(
    Guid Id,
    string Title,
    string Description,
    int OrderIndex,
    string Status,
    List<TopicDto> Topics,
    List<ContentItemDto> DirectContentItems,
    List<QuizDto> Quizzes
);



// -----------------------------------------------------------------------------
// Instructor Dashboard DTOs (scoped to the authenticated instructor)
// -----------------------------------------------------------------------------

/// <summary>Aggregated KPIs for the logged-in instructor's personal dashboard.</summary>
public record InstructorDashboardStatsDto(
    int TotalCourses,
    int PublishedCourses,
    int DraftCourses,
    int EnrolledStudents,
    int PendingEnrollmentRequests,
    double AverageRating,
    int TotalReviews,
    int TotalModules,
    int TotalLessons,
    int TotalStudents
);

/// <summary>A course card as seen by its owning instructor (includes management metadata).</summary>
public record InstructorCourseDto(
    Guid Id,
    string Code,
    string Title,
    string Description,
    string Category,
    string? ThumbnailUrl,
    string Difficulty,
    string Status,
    bool IsPublished,
    int DurationHours,
    decimal Price,
    bool IsFree,
    string Term,
    Guid InstructorId,
    string InstructorName,
    string? InstructorEmail,
    int EnrollmentCount,
    int PendingEnrollmentCount,
    double AverageRating,
    int RatingCount,
    int ModulesCount,
    int LessonsCount,
    int QuizzesCount,
    DateTime CreatedAt
);

/// <summary>A student's enrollment request on one of the instructor's courses.</summary>
public record EnrollmentRequestDto(
    Guid EnrollmentId,
    Guid CourseId,
    string CourseCode,
    string CourseTitle,
    Guid StudentId,
    string StudentName,
    string StudentEmail,
    string Status,
    double ProgressPercentage,
    DateTime RequestedAt,
    string? StudentAvatarUrl = null,
    string StatusLabel = "PENDING",
    DateTime? ReviewedAt = null,
    string? ReviewNotes = null,
    string? StudentProfileSummary = null
);

/// <summary>Per-course rollup used to group enrollment requests and render filter dropdowns.</summary>
public record EnrollmentRequestCourseGroupDto(
    Guid CourseId,
    string CourseCode,
    string CourseTitle,
    int Pending,
    int Approved,
    int Rejected,
    int Cancelled
);

/// <summary>Badge counts for the instructor's Enrollment Requests navigation entry.</summary>
public record EnrollmentRequestSummaryDto(
    int Pending,
    int Approved,
    int Rejected,
    int Cancelled,
    int Total,
    List<EnrollmentRequestCourseGroupDto> Courses
);

/// <summary>One of the authenticated student's enrollment requests, as shown on their dashboard.</summary>
public record StudentEnrollmentRequestDto(
    Guid EnrollmentId,
    Guid CourseId,
    string CourseCode,
    string CourseTitle,
    string? ThumbnailUrl,
    string Category,
    string InstructorName,
    string Status,
    string StatusLabel,
    DateTime RequestedAt,
    DateTime? ReviewedAt,
    string? ReviewNotes,
    double ProgressPercentage,
    bool CanCancel,
    bool HasAccess
);

/// <summary>Whether the caller may open a course's protected learning materials right now.</summary>
public record EnrollmentAccessDto(
    Guid CourseId,
    bool HasAccess,
    string Status,
    string StatusLabel,
    string Reason,
    bool RequiresApproval,
    bool RequiresPayment,
    bool PaymentSatisfied
);

/// <summary>Payload attached to an instructor's approve/reject decision.</summary>
public record EnrollmentDecisionRequest(
    string? Notes = null
);

/// <summary>A student enrolled in one of the instructor's courses.</summary>
public record InstructorStudentDto(
    Guid StudentId,
    string FullName,
    string Email,
    string? AvatarUrl,
    Guid CourseId,
    string CourseCode,
    string CourseTitle,
    double ProgressPercentage,
    string Status,
    DateTime EnrolledAt
);

/// <summary>A student review/rating left on one of the instructor's courses.</summary>
public record CourseReviewDto(
    Guid Id,
    Guid CourseId,
    string CourseCode,
    string CourseTitle,
    Guid StudentId,
    string StudentName,
    string? StudentAvatarUrl,
    int Rating,
    string Comment,
    DateTime CreatedAt,
    string Status = "Approved",
    DateTime? UpdatedAt = null,
    Guid? InstructorId = null
);

/// <summary>Payload for a student to rate (and optionally comment on) a course.</summary>
public record CreateCourseReviewRequest(
    int Rating,
    string? Comment = null
);

/// <summary>The authenticated instructor's own profile summary.</summary>
public record InstructorProfileDto(
    Guid Id,
    string FullName,
    string Email,
    string? AvatarUrl,
    string Role,
    DateTime MemberSince,
    int TotalCourses,
    int PublishedCourses,
    int TotalStudents,
    double AverageRating
);
