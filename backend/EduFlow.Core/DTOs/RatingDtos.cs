using System;
using System.Collections.Generic;

namespace EduFlow.Core.DTOs;

// -----------------------------------------------------------------------------
// Rating aggregation value objects.
// Every average shown anywhere in EduFlow comes from these shapes so that the
// calculation method is applied identically across the application.
// -----------------------------------------------------------------------------

/// <summary>
/// Average star rating + approved review count for a single course.
/// </summary>
public record CourseRatingSummary(double AverageRating, int ReviewCount)
{
    public static readonly CourseRatingSummary Empty = new(0.0, 0);
}

/// <summary>
/// Aggregate rating for an instructor, computed from approved reviews on their
/// published courses (see docs/current/RATINGS_AND_REVIEWS.md).
/// </summary>
public record InstructorRatingSummary(double AverageRating, int ReviewCount)
{
    public static readonly InstructorRatingSummary Empty = new(0.0, 0);
}

/// <summary>Outcome of the review eligibility rules for one (student, course) pair.</summary>
public record ReviewEligibilityResult(
    bool IsEligible,
    string Reason,
    Guid? ExistingReviewId = null
)
{
    public static ReviewEligibilityResult Deny(string reason, Guid? existingReviewId = null)
        => new(false, reason, existingReviewId);

    public static ReviewEligibilityResult Allow(Guid? existingReviewId = null)
        => new(true, "Eligible to review.", existingReviewId);
}

// -----------------------------------------------------------------------------
// Review payloads
// -----------------------------------------------------------------------------

/// <summary>Payload for an administrator to approve or reject a review.</summary>
public record ModerateCourseReviewRequest(
    string? Note = null
);

/// <summary>Admin-facing review row including moderation state.</summary>
public record AdminCourseReviewDto(
    Guid Id,
    Guid CourseId,
    string CourseCode,
    string CourseTitle,
    Guid StudentId,
    string StudentName,
    int Rating,
    string Comment,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

// -----------------------------------------------------------------------------
// Instructor public profile payloads
// -----------------------------------------------------------------------------

/// <summary>A published course as shown on an instructor's public profile.</summary>
public record InstructorPublicCourseDto(
    Guid Id,
    string Code,
    string Title,
    string Description,
    string Category,
    string? ThumbnailUrl,
    string Difficulty,
    string Term,
    int DurationHours,
    decimal Price,
    bool IsFree,
    int StudentsCount,
    double AverageRating,
    int RatingCount,
    int ModulesCount,
    int LessonsCount
);

/// <summary>Directory row for the instructor listing.</summary>
public record InstructorListItemDto(
    Guid Id,
    string FullName,
    string? AvatarUrl,
    string Headline,
    string Bio,
    IReadOnlyList<string> Expertise,
    int PublishedCourseCount,
    int StudentCount,
    double AverageRating,
    int ReviewCount
);

/// <summary>The full, publicly visible profile of one instructor.</summary>
public record PublicInstructorProfileDto(
    Guid Id,
    string FullName,
    string? AvatarUrl,
    string Headline,
    string Bio,
    IReadOnlyList<string> Expertise,
    string? WebsiteUrl,
    string? LinkedInUrl,
    DateTime MemberSince,
    int TotalCourseCount,
    int PublishedCourseCount,
    int StudentCount,
    double AverageRating,
    int ReviewCount,
    IReadOnlyList<InstructorPublicCourseDto> Courses,
    IReadOnlyList<CourseReviewDto> RecentReviews,
    bool IsOwnProfile
);

/// <summary>
/// Payload used by an instructor to edit their own public profile.
/// Every field is optional; omitted/null fields are left untouched so the
/// client can send partial updates safely.
/// </summary>
public record UpdateInstructorProfileRequest(
    string? FullName = null,
    string? AvatarUrl = null,
    string? Headline = null,
    string? Bio = null,
    string? Expertise = null,
    string? WebsiteUrl = null,
    string? LinkedInUrl = null
);
