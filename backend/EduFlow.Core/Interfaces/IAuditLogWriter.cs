using System;
using System.Collections.Generic;

namespace EduFlow.Core.Interfaces;

/// <summary>
/// Small explicit writer for persisting governance audit log records.
/// Must NOT call SaveChanges independently.
/// Participates in caller's DbContext transaction.
/// </summary>
public interface IAuditLogWriter
{
    void WriteSupportTicketCreated(
        Guid actorId,
        string actorRole,
        Guid ticketId,
        string ticketType,
        string newStatus);

    void WriteSupportTicketReplied(
        Guid actorId,
        string actorRole,
        Guid ticketId,
        Guid responseId,
        string newStatus);

    void WriteSupportTicketStatusChanged(
        Guid actorId,
        string actorRole,
        Guid ticketId,
        string oldStatus,
        string newStatus);

    void WriteSupportTicketResolved(
        Guid actorId,
        string actorRole,
        Guid ticketId,
        string oldStatus,
        string newStatus);

    void AddEntry(
        Guid? actorId,
        string? actorRole,
        string action,
        string entityType,
        string entityId,
        IReadOnlyDictionary<string, object?>? metadata = null);
}
