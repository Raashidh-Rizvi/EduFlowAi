using System;
using System.Collections.Generic;
using System.Text.Json;
using EduFlow.Core.Entities;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;

namespace EduFlow.Infrastructure.Services;

public class AuditLogWriter : IAuditLogWriter
{
    private readonly ApplicationDbContext _dbContext;


    public AuditLogWriter(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
    }

    public void WriteSupportTicketCreated(
        Guid actorId,
        string actorRole,
        Guid ticketId,
        string ticketType,
        string newStatus)
    {
        var metadata = new Dictionary<string, object?>
        {
            ["type"] = ticketType,
            ["newStatus"] = newStatus
        };

        AddEntry(actorId, actorRole, "SupportTicket.Created", "SupportTicket", ticketId.ToString(), metadata);
    }

    public void WriteSupportTicketReplied(
        Guid actorId,
        string actorRole,
        Guid ticketId,
        Guid responseId,
        string newStatus)
    {
        var metadata = new Dictionary<string, object?>
        {
            ["responseId"] = responseId.ToString(),
            ["newStatus"] = newStatus
        };

        AddEntry(actorId, actorRole, "SupportTicket.Replied", "SupportTicket", ticketId.ToString(), metadata);
    }

    public void WriteSupportTicketStatusChanged(
        Guid actorId,
        string actorRole,
        Guid ticketId,
        string oldStatus,
        string newStatus)
    {
        var metadata = new Dictionary<string, object?>
        {
            ["oldStatus"] = oldStatus,
            ["newStatus"] = newStatus
        };

        AddEntry(actorId, actorRole, "SupportTicket.StatusChanged", "SupportTicket", ticketId.ToString(), metadata);
    }

    public void WriteSupportTicketResolved(
        Guid actorId,
        string actorRole,
        Guid ticketId,
        string oldStatus,
        string newStatus)
    {
        var metadata = new Dictionary<string, object?>
        {
            ["oldStatus"] = oldStatus,
            ["newStatus"] = newStatus
        };

        AddEntry(actorId, actorRole, "SupportTicket.Resolved", "SupportTicket", ticketId.ToString(), metadata);
    }

    public void AddEntry(
        Guid? actorId,
        string? actorRole,
        string action,
        string entityType,
        string entityId,
        IReadOnlyDictionary<string, object?>? metadata = null)
    {
        if (string.IsNullOrWhiteSpace(action))
            throw new ArgumentException("Audit action cannot be empty.", nameof(action));

        if (action.Length > 100)
            throw new ArgumentException("Audit action cannot exceed 100 characters.", nameof(action));

        if (!AuditEventRegistry.Events.ContainsKey(action))
            throw new ArgumentException($"Action '{action}' is not in the approved audit event registry.", nameof(action));

        if (string.IsNullOrWhiteSpace(entityType))
            throw new ArgumentException("Audit entityType cannot be empty.", nameof(entityType));

        if (entityType.Length > 50)
            throw new ArgumentException("Audit entityType cannot exceed 50 characters.", nameof(entityType));

        if (string.IsNullOrWhiteSpace(entityId))
            throw new ArgumentException("Audit entityId cannot be empty.", nameof(entityId));

        if (entityId.Length > 36)
            throw new ArgumentException("Audit entityId cannot exceed 36 characters.", nameof(entityId));

        if (actorId == null || actorId == Guid.Empty || actorRole is not ("Admin" or "Instructor" or "Student"))
            throw new ArgumentException("A server-resolved actor and role are required.");
        if (entityType != action.Split('.')[0] || !Guid.TryParseExact(entityId, "D", out var resourceId) || resourceId == Guid.Empty)
            throw new ArgumentException("Audit resource must match the action and use a canonical nonempty UUID.");

        // Build safe Details envelope
        var envelope = new
        {
            schemaVersion = 1,
            actorUserId = actorId?.ToString(),
            actorRole = actorRole ?? string.Empty,
            data = metadata ?? new Dictionary<string, object?>()
        };

        var serialized = JsonSerializer.Serialize(envelope);
        if (serialized.Length > 2048)
            throw new InvalidOperationException("Serialized audit Details payload exceeds the 2048 character limit.");

        if (metadata != null)
        {
            foreach (var pair in metadata)
            {
                if (!AuditEventRegistry.Events[action].Contains(pair.Key) ||
                    !AuditEventRegistry.IsSafeValue(pair.Key, JsonSerializer.SerializeToElement(pair.Value)))
                    throw new ArgumentException("Audit metadata contains an unapproved key or value.", nameof(metadata));
            }
        }

        var now = DateTime.UtcNow;
        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorId = actorId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = serialized,
            IpAddress = string.Empty, // Exclude client IP; do not log loopback or spoofed headers
            CreatedAt = now,
            UpdatedAt = now
        };

        // Enqueue to current DbContext without committing; caller commits atomically with mutation
        _dbContext.AuditLogs.Add(auditLog);
    }
}
