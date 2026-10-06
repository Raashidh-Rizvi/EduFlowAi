using System;

namespace EduFlow.Core.DTOs;

public class AdminPlatformSummaryDto
{
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public UserSummaryMetricsDto Users { get; set; } = new();
    public CourseSummaryMetricsDto Courses { get; set; } = new();
    public EnrollmentSummaryMetricsDto Enrollments { get; set; } = new();
    public SupportSummaryMetricsDto? Support { get; set; }
    public string SupportAvailability { get; set; } = "Available"; // "NotImplemented" | "Available"
}

public class UserSummaryMetricsDto
{
    public int Total { get; set; }
    public int Students { get; set; }
    public int Instructors { get; set; }
    public int Admins { get; set; }
    public int Active { get; set; }
    public int Suspended { get; set; }
}

public class CourseSummaryMetricsDto
{
    public int Total { get; set; }
    public int Published { get; set; }
    public int Unpublished { get; set; }
    public int Draft { get; set; }
    public int Archived { get; set; }
    public int OtherUnpublished { get; set; }
}

public class EnrollmentSummaryMetricsDto
{
    public int TotalRecords { get; set; }
    public int Active { get; set; }
    public int Completed { get; set; }
    public int Pending { get; set; }
    public int Rejected { get; set; }
    public int Cancelled { get; set; }
    public int Dropped { get; set; }
}

public class SupportSummaryMetricsDto
{
    public int Total { get; set; }
    public int Open { get; set; }
    public int InProgress { get; set; }
    public int Resolved { get; set; }
    public int Unresolved { get; set; }
    public SupportTypeDistributionDto ByType { get; set; } = new();
}

public class SupportTypeDistributionDto
{
    public int Bug { get; set; }
    public int Dispute { get; set; }
    public int Feedback { get; set; }
}
