using System;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;

namespace EduFlow.Core.Interfaces;

public interface ISupportTicketService
{
    Task<(SupportTicketDetailDto? Detail, string? ErrorCode, string? ErrorMessage, bool IsReplay)> CreateTicketAsync(
        Guid callerId,
        CreateSupportTicketRequest request,
        CancellationToken ct = default);

    Task<PagedResult<SupportTicketSummaryDto>> GetMyTicketsAsync(
        Guid callerId,
        int page,
        int pageSize,
        string? type,
        string? status,
        CancellationToken ct = default);

    Task<SupportTicketDetailDto?> GetMyTicketByIdAsync(
        Guid callerId,
        Guid ticketId,
        CancellationToken ct = default);

    Task<PagedResult<AdminSupportTicketSummaryDto>> GetAdminTicketsAsync(
        int page,
        int pageSize,
        string? search,
        string? type,
        string? status,
        CancellationToken ct = default);

    Task<AdminSupportTicketDetailDto?> GetAdminTicketByIdAsync(
        Guid ticketId,
        CancellationToken ct = default);

    Task<(AdminSupportTicketDetailDto? Detail, string? ErrorCode, string? ErrorMessage, int StatusCode)> UpdateAdminTicketAsync(
        Guid adminId,
        Guid ticketId,
        UpdateAdminSupportTicketRequest request,
        CancellationToken ct = default);
}
