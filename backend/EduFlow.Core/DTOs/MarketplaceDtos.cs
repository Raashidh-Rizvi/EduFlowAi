using System;
using System.Collections.Generic;

namespace EduFlow.Core.DTOs;

// -----------------------------------------------------------------------------
// Public course-marketplace payloads.
// These are the shapes the storefront (home, catalog, course detail) consumes.
// Every number is a live aggregate — ratings come from IRatingService, enrolment
// and lesson counts from the source tables. Nothing here is fabricated.
// -----------------------------------------------------------------------------

/// <summary>Platform-wide counters shown in the hero and trust strip.</summary>
public record MarketplaceStatsDto(
    int PublishedCourses,
    int Instructors,
    int Enrollments,
    double AverageRating,
    int TotalReviews,
    int Categories
);

/// <summary>A browsable course category with its published-course count.</summary>
public record MarketplaceCategoryDto(
    string Name,
    int CourseCount
);

/// <summary>Featured instructor card: identity plus live teaching statistics.</summary>
public record MarketplaceInstructorDto(
    Guid Id,
    string FullName,
    string? AvatarUrl,
    string Role,
    string Headline,
    string Bio,
    IReadOnlyList<string> Expertise,
    int CourseCount,
    int StudentCount,
    double AverageRating,
    int RatingCount
);

/// <summary>One published course as rendered on a marketplace card.</summary>
public record MarketplaceCourseDto(
    Guid Id,
    string Code,
    string Title,
    string Description,
    string Category,
    string? ThumbnailUrl,
    string Difficulty,
    string Term,
    bool IsPublished,
    int DurationHours,
    decimal Price,
    bool IsFree,
    double AverageRating,
    int RatingCount,
    int EnrollmentCount,
    int ModuleCount,
    int LessonCount,
    Guid InstructorId,
    string InstructorName,
    string? InstructorAvatarUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string ShortDescription = "",
    string Language = "English",
    int XpReward = 0,
    bool CertificateEnabled = false,
    int TotalMinutes = 0
);

/// <summary>Cursor page of marketplace courses plus the totals needed for pagination.</summary>
public record MarketplaceCoursePageDto(
    IReadOnlyList<MarketplaceCourseDto> Items,
    int Total,
    int Page,
    int PageSize,
    int TotalPages
);

/// <summary>Curriculum module with its ordered lessons (course detail page).</summary>
public record MarketplaceModuleDto(
    Guid Id,
    string Title,
    string Description,
    int OrderIndex,
    int QuizCount,
    IReadOnlyList<MarketplaceLessonDto> Lessons,
    int AssignmentCount = 0
);

/// <summary>One lesson inside a marketplace curriculum module.</summary>
public record MarketplaceLessonDto(
    Guid Id,
    string Title,
    int OrderIndex,
    int EstimatedMinutes,
    int XpReward = 0,
    bool IsFreePreview = false
);

/// <summary>An approved student review shown under the course.</summary>
public record MarketplaceReviewDto(
    Guid Id,
    string StudentName,
    string? StudentAvatarUrl,
    int Rating,
    string Comment,
    DateTime CreatedAt
);

/// <summary>Full course detail: card fields + curriculum, instructor profile and reviews.</summary>
public record MarketplaceCourseDetailDto(
    Guid Id,
    string Code,
    string Title,
    string Description,
    string Category,
    string? ThumbnailUrl,
    string Difficulty,
    string Term,
    bool IsPublished,
    int DurationHours,
    decimal Price,
    bool IsFree,
    double AverageRating,
    int RatingCount,
    int EnrollmentCount,
    int ModuleCount,
    int LessonCount,
    Guid InstructorId,
    string InstructorName,
    string? InstructorAvatarUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<MarketplaceModuleDto> Modules,
    IReadOnlyList<MarketplaceReviewDto> Reviews,
    MarketplaceInstructorDto Instructor,
    string ShortDescription = "",
    string Language = "English",
    int XpReward = 0,
    bool CertificateEnabled = false,
    IReadOnlyList<string>? LearningOutcomes = null,
    IReadOnlyList<string>? Prerequisites = null,
    IReadOnlyList<string>? TargetAudience = null,
    int AssignmentCount = 0,
    int QuizCount = 0,
    int TotalMinutes = 0
);
