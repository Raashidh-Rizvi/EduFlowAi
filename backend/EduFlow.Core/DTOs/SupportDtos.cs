using System;
using System.Collections.Generic;

namespace EduFlow.Core.DTOs;

public record CreateSupportTicketRequest(
    string Type,
    string Message,
    Guid ClientRequestId
);

public record UpdateAdminSupportTicketRequest(
    string? Status,
    string? ResponseMessage,
    Guid ExpectedVersion
);

public record SupportTicketResponseDto(
    Guid Id,
    string Message,
    DateTime CreatedAt,
    string AuthorLabel = "Support team"
);

public record AdminSupportTicketResponseDto(
    Guid Id,
    Guid AdminUserId,
    string AdminName,
    string Message,
    DateTime CreatedAt,
    string AuthorLabel = "Support team"
);

public record SubmittedByUserDto(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive
);

public record SupportTicketSummaryDto(
    Guid Id,
    string Type,
    string Status,
    string MessagePreview,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ResolvedAt,
    int ResponseCount
);

public record AdminSupportTicketSummaryDto(
    Guid Id,
    string Type,
    string Status,
    string MessagePreview,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ResolvedAt,
    int ResponseCount,
    SubmittedByUserDto SubmittedBy
);

public record SupportTicketDetailDto(
    Guid Id,
    string Type,
    string Status,
    string Message,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ResolvedAt,
    Guid Version,
    IReadOnlyList<SupportTicketResponseDto> Responses
);

public record AdminSupportTicketDetailDto(
    Guid Id,
    string Type,
    string Status,
    string Message,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? ResolvedAt,
    Guid Version,
    SubmittedByUserDto SubmittedBy,
    IReadOnlyList<AdminSupportTicketResponseDto> Responses
);

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages
);
