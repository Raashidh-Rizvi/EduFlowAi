using System;
using System.Collections.Generic;

namespace EduFlow.Core.DTOs;

/// <summary>
/// Actor information for an audit log record.
/// Id is the ActorId (or preserved actorUserId snapshot if actor account was deleted).
/// DisplayName is the joined current full name or "Unavailable actor" if missing.
/// </summary>
public record AuditLogActorDto(
    Guid? Id,
    string? DisplayName
);

/// <summary>
/// Safe summary projection for audit log listings.
/// </summary>
public record AuditLogSummaryDto(
    Guid Id,
    DateTime CreatedAt,
    AuditLogActorDto Actor,
    string Action,
    string EntityType,
    string EntityId
);

/// <summary>
/// Safe detail projection for a single audit log event.
/// Contains allowlisted metadata without exposing raw Details, secrets, or IP addresses.
/// </summary>
public record AuditLogDetailDto(
    Guid Id,
    DateTime CreatedAt,
    AuditLogActorDto Actor,
    string Action,
    string EntityType,
    string EntityId,
    IReadOnlyDictionary<string, object?> Metadata,
    bool MetadataUnavailable
);

/// <summary>
/// Query filters for admin audit log searches.
/// </summary>
public class GetAuditLogsQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? Action { get; set; }
    public string? EntityType { get; set; }
    public Guid? ActorId { get; set; }
    public DateTime? FromUtc { get; set; }
    public DateTime? ToUtc { get; set; }
}
