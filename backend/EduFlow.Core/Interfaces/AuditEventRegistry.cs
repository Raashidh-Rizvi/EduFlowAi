using System.Collections.ObjectModel;
using System.Text.Json;

namespace EduFlow.Core.Interfaces;

/// <summary>Only integrations actually enabled in the application belong here.</summary>
public static class AuditEventRegistry
{
    public static IReadOnlyDictionary<string, string[]> Events { get; } =
        new ReadOnlyDictionary<string, string[]>(new Dictionary<string, string[]>(StringComparer.Ordinal)
        {
            ["SupportTicket.Created"] = new[] { "type", "newStatus" },
            ["SupportTicket.Replied"] = new[] { "responseId", "newStatus" },
            ["SupportTicket.StatusChanged"] = new[] { "oldStatus", "newStatus" },
            ["SupportTicket.Resolved"] = new[] { "oldStatus", "newStatus" },
            ["User.Deleted"] = Array.Empty<string>(),
            ["Course.Created"] = Array.Empty<string>(),
            ["Course.Updated"] = new[] { "changedFields" },
            ["Course.Published"] = Array.Empty<string>(),
            ["Course.Unpublished"] = Array.Empty<string>(),
            ["Course.Deleted"] = Array.Empty<string>(),
            ["Enrollment.Approved"] = new[] { "courseId", "studentId" },
            ["Enrollment.Rejected"] = new[] { "courseId", "studentId" },
            ["Enrollment.Added"] = new[] { "courseId", "studentId" },
            ["Enrollment.Dropped"] = new[] { "courseId", "studentId" },
            ["Enrollment.Cancelled"] = new[] { "courseId", "studentId" },
            ["Submission.Marked"] = new[] { "questionId", "previousMarks", "newMarks" },
            ["Assessment.Published"] = Array.Empty<string>(),
            ["Assessment.Archived"] = Array.Empty<string>(),
            ["Assessment.Deleted"] = Array.Empty<string>()
        });

    public static bool IsSafeValue(string key, JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.String) return false;
        var text = value.GetString() ?? "";
        return key switch
        {
            "courseId" or "studentId" or "responseId" or "questionId" => Guid.TryParseExact(text, "D", out var id) && id != Guid.Empty,
            "previousMarks" or "newMarks" => int.TryParse(text, System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out var marks) && marks >= 0,
            "type" => text is "Bug" or "Dispute" or "Feedback",
            "oldStatus" or "newStatus" => text is "Open" or "InProgress" or "Resolved",
            "changedFields" => text.Length <= 1024 && text.Split(',').All(CourseFields.Contains),
            _ => false
        };
    }

    public static IReadOnlySet<string> CourseFields { get; } = new HashSet<string>(StringComparer.Ordinal)
    {
        "Code", "Title", "Description", "ShortDescription", "Category", "Term", "ThumbnailUrl",
        "Difficulty", "DurationHours", "IsFree", "Price", "Language", "XpReward", "CertificateEnabled",
        "LearningOutcomesJson", "PrerequisitesJson", "TargetAudienceJson", "Status"
    };
}
