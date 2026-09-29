using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EduFlow.Infrastructure.Services;

public class SupportTicketService : ISupportTicketService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<SupportTicketService> _logger;
    private readonly IAuditLogWriter _auditLogWriter;

    public SupportTicketService(
        ApplicationDbContext dbContext,
        ILogger<SupportTicketService> logger,
        IAuditLogWriter? auditLogWriter = null)
    {
        _dbContext = dbContext;
        _logger = logger;
        _auditLogWriter = auditLogWriter ?? new AuditLogWriter(dbContext);
    }

    public async Task<(SupportTicketDetailDto? Detail, string? ErrorCode, string? ErrorMessage, bool IsReplay)> CreateTicketAsync(
        Guid callerId,
        CreateSupportTicketRequest request,
        CancellationToken ct = default)
    {
        // 1. Account validation
        var user = await _dbContext.Users.SingleOrDefaultAsync(u => u.Id == callerId, ct);
        if (user == null)
            return (null, "unauthorized", "User account not found.", false);

        if (!user.IsActive)
            return (null, "account_inactive", "Your account is inactive or suspended.", false);

        if (user.Role != UserRole.Student && user.Role != UserRole.Instructor)
            return (null, "role_denied", "Only students and instructors can submit support tickets.", false);

        // 2. Input validation
        if (string.IsNullOrWhiteSpace(request.Type) || !Enum.TryParse<SupportTicketType>(request.Type, true, out var parsedType))
            return (null, "validation_failed", "Invalid ticket category. Must be Bug, Dispute, or Feedback.", false);

        var trimmedMessage = request.Message?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmedMessage))
            return (null, "validation_failed", "Ticket message cannot be empty.", false);

        if (trimmedMessage.Length > 5000)
            return (null, "validation_failed", "Ticket message cannot exceed 5000 characters.", false);

        if (request.ClientRequestId == Guid.Empty)
            return (null, "validation_failed", "A valid ClientRequestId is required.", false);

        // 3. Idempotency check: same caller + clientRequestId
        var existing = await _dbContext.SupportTickets
            .Include(t => t.Responses)
            .SingleOrDefaultAsync(t => t.SubmittedByUserId == callerId && t.ClientRequestId == request.ClientRequestId, ct);

        if (existing != null)
        {
            if (existing.Type == parsedType && existing.Message == trimmedMessage)
            {
                // Exact replay: 200 OK with original record
                return (MapToDetailDto(existing), null, null, true);
            }

            // Same key with different payload: 409 Conflict
            return (null, "submission_key_reused", "A ticket submission with this request ID already exists with different details.", false);
        }

        // 4. Persistence
        var now = DateTime.UtcNow;
        var ticket = new SupportTicket
        {
            Id = Guid.NewGuid(),
            SubmittedByUserId = callerId,
            Type = parsedType,
            Status = SupportTicketStatus.Open,
            Message = trimmedMessage,
            ClientRequestId = request.ClientRequestId,
            Version = Guid.NewGuid(),
            CreatedAt = now,
            UpdatedAt = now,
            ResolvedAt = null
        };

        _dbContext.SupportTickets.Add(ticket);
        _auditLogWriter.WriteSupportTicketCreated(
            callerId,
            user.Role.ToString(),
            ticket.Id,
            parsedType.ToString(),
            "Open"
        );

        try
        {
            await _dbContext.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "DbUpdateException on CreateTicketAsync, checking for concurrent insert of same request ID.");
            _dbContext.ChangeTracker.Clear();

            var raced = await _dbContext.SupportTickets
                .Include(t => t.Responses)
                .SingleOrDefaultAsync(t => t.SubmittedByUserId == callerId && t.ClientRequestId == request.ClientRequestId, ct);

            if (raced != null)
            {
                if (raced.Type == parsedType && raced.Message == trimmedMessage)
                {
                    return (MapToDetailDto(raced), null, null, true);
                }
                return (null, "submission_key_reused", "A ticket submission with this request ID already exists with different details.", false);
            }
            throw;
        }

        return (MapToDetailDto(ticket), null, null, false);
    }

    public async Task<PagedResult<SupportTicketSummaryDto>> GetMyTicketsAsync(
        Guid callerId,
        int page,
        int pageSize,
        string? type,
        string? status,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = _dbContext.SupportTickets
            .AsNoTracking()
            .Where(t => t.SubmittedByUserId == callerId);

        if (!string.IsNullOrWhiteSpace(type) && !type.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<SupportTicketType>(type, true, out var parsedType))
            {
                query = query.Where(t => t.Type == parsedType);
            }
        }

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<SupportTicketStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(t => t.Status == parsedStatus);
            }
        }

        var totalCount = await query.CountAsync(ct);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / pageSize);

        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .ThenByDescending(t => t.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new SupportTicketSummaryDto(
                t.Id,
                t.Type.ToString(),
                t.Status.ToString(),
                t.Message.Length <= 160 ? t.Message : t.Message.Substring(0, 160),
                DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc),
                DateTime.SpecifyKind(t.UpdatedAt, DateTimeKind.Utc),
                t.ResolvedAt.HasValue ? DateTime.SpecifyKind(t.ResolvedAt.Value, DateTimeKind.Utc) : null,
                t.Responses.Count
            ))
            .ToListAsync(ct);

        return new PagedResult<SupportTicketSummaryDto>(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<SupportTicketDetailDto?> GetMyTicketByIdAsync(
        Guid callerId,
        Guid ticketId,
        CancellationToken ct = default)
    {
        var ticket = await _dbContext.SupportTickets
            .AsNoTracking()
            .Include(t => t.Responses)
            .SingleOrDefaultAsync(t => t.Id == ticketId && t.SubmittedByUserId == callerId, ct);

        if (ticket == null)
            return null;

        return MapToDetailDto(ticket);
    }

    public async Task<PagedResult<AdminSupportTicketSummaryDto>> GetAdminTicketsAsync(
        int page,
        int pageSize,
        string? search,
        string? type,
        string? status,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = _dbContext.SupportTickets
            .AsNoTracking()
            .Include(t => t.SubmittedByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            if (term.Length > 100) term = term.Substring(0, 100);
            var termLower = term.ToLower();
            bool isGuid = Guid.TryParse(term, out var searchGuid);

            query = query.Where(t =>
                (isGuid && t.Id == searchGuid) ||
                t.Message.ToLower().Contains(termLower) ||
                (t.SubmittedByUser != null && (
                    t.SubmittedByUser.FullName.ToLower().Contains(termLower) ||
                    t.SubmittedByUser.Email.ToLower().Contains(termLower)
                ))
            );
        }

        if (!string.IsNullOrWhiteSpace(type) && !type.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<SupportTicketType>(type, true, out var parsedType))
            {
                query = query.Where(t => t.Type == parsedType);
            }
        }

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            if (Enum.TryParse<SupportTicketStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(t => t.Status == parsedStatus);
            }
        }

        var totalCount = await query.CountAsync(ct);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / pageSize);

        var items = await query
            .OrderByDescending(t => t.CreatedAt)
            .ThenByDescending(t => t.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new AdminSupportTicketSummaryDto(
                t.Id,
                t.Type.ToString(),
                t.Status.ToString(),
                t.Message.Length <= 160 ? t.Message : t.Message.Substring(0, 160),
                DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc),
                DateTime.SpecifyKind(t.UpdatedAt, DateTimeKind.Utc),
                t.ResolvedAt.HasValue ? DateTime.SpecifyKind(t.ResolvedAt.Value, DateTimeKind.Utc) : null,
                t.Responses.Count,
                new SubmittedByUserDto(
                    t.SubmittedByUser != null ? t.SubmittedByUser.Id : t.SubmittedByUserId,
                    t.SubmittedByUser != null ? t.SubmittedByUser.FullName : "Unknown",
                    t.SubmittedByUser != null ? t.SubmittedByUser.Email : "",
                    t.SubmittedByUser != null ? t.SubmittedByUser.Role.ToString() : "",
                    t.SubmittedByUser != null && t.SubmittedByUser.IsActive
                )
            ))
            .ToListAsync(ct);

        return new PagedResult<AdminSupportTicketSummaryDto>(items, page, pageSize, totalCount, totalPages);
    }

    public async Task<AdminSupportTicketDetailDto?> GetAdminTicketByIdAsync(
        Guid ticketId,
        CancellationToken ct = default)
    {
        var ticket = await _dbContext.SupportTickets
            .AsNoTracking()
            .Include(t => t.SubmittedByUser)
            .Include(t => t.Responses)
                .ThenInclude(r => r.AdminUser)
            .SingleOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
            return null;

        return MapToAdminDetailDto(ticket);
    }

    public async Task<(AdminSupportTicketDetailDto? Detail, string? ErrorCode, string? ErrorMessage, int StatusCode)> UpdateAdminTicketAsync(
        Guid adminId,
        Guid ticketId,
        UpdateAdminSupportTicketRequest request,
        CancellationToken ct = default)
    {
        // 1. Account validation
        var admin = await _dbContext.Users.SingleOrDefaultAsync(u => u.Id == adminId, ct);
        if (admin == null)
            return (null, "unauthorized", "User account not found.", 401);

        if (!admin.IsActive)
            return (null, "account_inactive", "Your account is inactive or suspended.", 403);

        if (admin.Role != UserRole.Admin)
            return (null, "role_denied", "Administrator access is required.", 403);

        if (request.ExpectedVersion == Guid.Empty)
            return (null, "validation_failed", "A valid ExpectedVersion concurrency token is required.", 400);

        // 2. Find ticket
        var ticket = await _dbContext.SupportTickets
            .Include(t => t.Responses)
            .SingleOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
            return (null, "not_found", "Support ticket not found.", 404);

        if (ticket.Status == SupportTicketStatus.Resolved)
            return (null, "invalid_transition", "Resolved tickets cannot be modified or replied to.", 409);

        if (ticket.Version != request.ExpectedVersion)
            return (null, "ticket_conflict", "The ticket was updated by another administrator. Please review the latest state and retry.", 409);

        // 3. Response normalization and validation
        var trimmedResponse = string.IsNullOrWhiteSpace(request.ResponseMessage) ? null : request.ResponseMessage.Trim();
        if (trimmedResponse != null && trimmedResponse.Length > 5000)
            return (null, "validation_failed", "Response message cannot exceed 5000 characters.", 400);

        // 4. Status transition validation
        var targetStatus = ticket.Status;
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            if (!Enum.TryParse<SupportTicketStatus>(request.Status, true, out var parsedStatus))
                return (null, "validation_failed", "Invalid ticket status value.", 400);

            targetStatus = parsedStatus;
        }

        // Backward transition check
        if (ticket.Status == SupportTicketStatus.InProgress && targetStatus == SupportTicketStatus.Open)
            return (null, "invalid_transition", "Tickets cannot transition backwards from In Progress to Open.", 409);

        // No-op check
        if (targetStatus == ticket.Status && trimmedResponse == null)
            return (null, "validation_failed", "No changes requested. Provide a response message or a new status.", 400);

        // Resolution response check
        if (targetStatus == SupportTicketStatus.Resolved)
        {
            bool hasExistingResponses = ticket.Responses.Count > 0;
            bool hasNewResponse = trimmedResponse != null;

            if (!hasExistingResponses && !hasNewResponse)
                return (null, "resolution_response_required", "A ticket cannot be resolved without at least one administrator response.", 400);
        }

        // 5. Execute mutation atomically inside execution strategy
        return await _dbContext.Database.CreateExecutionStrategy().ExecuteAsync<(AdminSupportTicketDetailDto? Detail, string? ErrorCode, string? ErrorMessage, int StatusCode)>(async () =>
        {
            await using var transaction = _dbContext.Database.IsRelational()
                ? await _dbContext.Database.BeginTransactionAsync(ct)
                : null;

            var now = DateTime.UtcNow;

            if (trimmedResponse != null)
            {
                var resp = new SupportTicketResponse
                {
                    Id = Guid.NewGuid(),
                    SupportTicketId = ticket.Id,
                    AdminUserId = adminId,
                    Message = trimmedResponse,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _dbContext.SupportTicketResponses.Add(resp);
                ticket.Responses.Add(resp);

                _auditLogWriter.WriteSupportTicketReplied(
                    adminId,
                    admin.Role.ToString(),
                    ticket.Id,
                    resp.Id,
                    targetStatus.ToString()
                );
            }

            if (targetStatus != ticket.Status)
            {
                var oldStatus = ticket.Status.ToString();
                ticket.Status = targetStatus;
                if (targetStatus == SupportTicketStatus.Resolved)
                {
                    ticket.ResolvedAt = now;
                    _auditLogWriter.WriteSupportTicketResolved(
                        adminId,
                        admin.Role.ToString(),
                        ticket.Id,
                        oldStatus,
                        "Resolved"
                    );
                }
                else
                {
                    _auditLogWriter.WriteSupportTicketStatusChanged(
                        adminId,
                        admin.Role.ToString(),
                        ticket.Id,
                        oldStatus,
                        targetStatus.ToString()
                    );
                }
            }

            ticket.UpdatedAt = now;
            ticket.Version = Guid.NewGuid(); // Advance concurrency token

            // User notification
            _dbContext.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                UserId = ticket.SubmittedByUserId,
                Title = targetStatus == SupportTicketStatus.Resolved ? "Support Ticket Resolved" : "Support Ticket Update",
                Message = $"Your support ticket {ticket.Id} has been updated.",
                Type = "SupportUpdate",
                IsRead = false,
                CreatedAt = now,
                UpdatedAt = now
            });

            try
            {
                await _dbContext.SaveChangesAsync(ct);
                if (transaction != null)
                {
                    await transaction.CommitAsync(ct);
                }
            }
            catch (DbUpdateConcurrencyException)
            {
                if (transaction != null) await transaction.RollbackAsync(ct);
                return (null, "ticket_conflict", "The ticket was updated by another administrator. Please review the latest state and retry.", 409);
            }

            var updatedDetail = await GetAdminTicketByIdAsync(ticket.Id, ct);
            return (updatedDetail, null, null, 200);
        });
    }

    private static SupportTicketDetailDto MapToDetailDto(SupportTicket ticket)
    {
        return new SupportTicketDetailDto(
            ticket.Id,
            ticket.Type.ToString(),
            ticket.Status.ToString(),
            ticket.Message,
            DateTime.SpecifyKind(ticket.CreatedAt, DateTimeKind.Utc),
            DateTime.SpecifyKind(ticket.UpdatedAt, DateTimeKind.Utc),
            ticket.ResolvedAt.HasValue ? DateTime.SpecifyKind(ticket.ResolvedAt.Value, DateTimeKind.Utc) : null,
            ticket.Version,
            ticket.Responses
                .OrderBy(r => r.CreatedAt)
                .ThenBy(r => r.Id)
                .Select(r => new SupportTicketResponseDto(
                    r.Id,
                    r.Message,
                    DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc),
                    "Support team"
                ))
                .ToList()
        );
    }

    private static AdminSupportTicketDetailDto MapToAdminDetailDto(SupportTicket ticket)
    {
        return new AdminSupportTicketDetailDto(
            ticket.Id,
            ticket.Type.ToString(),
            ticket.Status.ToString(),
            ticket.Message,
            DateTime.SpecifyKind(ticket.CreatedAt, DateTimeKind.Utc),
            DateTime.SpecifyKind(ticket.UpdatedAt, DateTimeKind.Utc),
            ticket.ResolvedAt.HasValue ? DateTime.SpecifyKind(ticket.ResolvedAt.Value, DateTimeKind.Utc) : null,
            ticket.Version,
            new SubmittedByUserDto(
                ticket.SubmittedByUser != null ? ticket.SubmittedByUser.Id : ticket.SubmittedByUserId,
                ticket.SubmittedByUser != null ? ticket.SubmittedByUser.FullName : "Unknown",
                ticket.SubmittedByUser != null ? ticket.SubmittedByUser.Email : "",
                ticket.SubmittedByUser != null ? ticket.SubmittedByUser.Role.ToString() : "",
                ticket.SubmittedByUser != null && ticket.SubmittedByUser.IsActive
            ),
            ticket.Responses
                .OrderBy(r => r.CreatedAt)
                .ThenBy(r => r.Id)
                .Select(r => new AdminSupportTicketResponseDto(
                    r.Id,
                    r.AdminUserId,
                    r.AdminUser != null ? r.AdminUser.FullName : "Support Administrator",
                    r.Message,
                    DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc),
                    "Support team"
                ))
                .ToList()
        );
    }
}
