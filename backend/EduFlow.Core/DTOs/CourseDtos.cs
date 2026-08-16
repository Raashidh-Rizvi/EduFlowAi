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
    List<LessonSummaryDto> Lessons
);

public record LessonSummaryDto(
    Guid Id,
    string Title,
    int XpReward,
    int EstimatedMinutes,
    int OrderIndex,
    bool IsCompleted
);

public record LessonDetailDto(
    Guid Id,
    Guid ModuleId,
    string Title,
    string Content,
    string? VideoUrl,
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
    int OrderIndex
);

public record UpdateModuleRequest(
    string Title,
    string Description,
    int OrderIndex
);

public record CreateLessonRequest(
    string Title,
    string Content,
    string? VideoUrl,
    int XpReward,
    int EstimatedMinutes,
    int OrderIndex
);

public record UpdateLessonRequest(
    string Title,
    string Content,
    string? VideoUrl,
    int XpReward,
    int EstimatedMinutes,
    int OrderIndex
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

