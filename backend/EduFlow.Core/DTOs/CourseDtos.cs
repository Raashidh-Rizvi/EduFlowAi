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
    int LessonsCount
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
    List<ModuleDto> Modules
);

public record ModuleDto(
    Guid Id,
    string Title,
    string Description,
    int OrderIndex,
    string? PdfUrl,
    string? AttachmentFileName,
    List<LessonSummaryDto> Lessons
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

public record CreateCourseRequest(
    string Code,
    string Title,
    string Description,
    string Category,
    string? ThumbnailUrl
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
    string? AttachmentFileName = null
);

public record UpdateLessonRequest(
    string Title,
    string Content,
    string? VideoUrl,
    int XpReward,
    int EstimatedMinutes,
    int OrderIndex,
    string? PdfUrl = null,
    string? AttachmentFileName = null
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
    int CompletedLessons
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
    List<HierarchicalModuleDto> Modules
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

