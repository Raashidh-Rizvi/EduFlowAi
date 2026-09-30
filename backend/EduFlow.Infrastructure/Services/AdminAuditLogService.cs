using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Entities;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

public class AdminAuditLogService : IAdminAuditLogService
{
    private readonly ApplicationDbContext _dbContext;

    public AdminAuditLogService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
    }

    public async Task<PagedResult<AuditLogSummaryDto>> GetAuditLogsAsync(GetAuditLogsQuery query, CancellationToken ct = default)
    {
        ValidateQuery(query);

        var queryable = _dbContext.AuditLogs
            .AsNoTracking()
            .Include(a => a.Actor)
            .AsQueryable();

        // 1. Search filter: literal case-insensitive substring over Action, EntityType, EntityId, Actor.FullName
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            queryable = queryable.Where(a =>
                a.Action.ToLower().Contains(term) ||
                a.EntityType.ToLower().Contains(term) ||
                a.EntityId.ToLower().Contains(term) ||
                (a.Actor != null && a.Actor.FullName.ToLower().Contains(term))
            );
        }

        // 2. Action filter (exact)
        if (!string.IsNullOrWhiteSpace(query.Action) && !query.Action.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            var trimmedAction = query.Action.Trim();
            queryable = queryable.Where(a => a.Action == trimmedAction);
        }

        // 3. EntityType filter (exact)
        if (!string.IsNullOrWhiteSpace(query.EntityType) && !query.EntityType.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            var trimmedType = query.EntityType.Trim();
            queryable = queryable.Where(a => a.EntityType == trimmedType);
        }

        // 4. ActorId filter (exact)
        if (query.ActorId.HasValue && query.ActorId.Value != Guid.Empty)
        {
            queryable = queryable.Where(a => a.ActorId == query.ActorId.Value);
        }

        // 5. Date boundaries (fromUtc inclusive, toUtc exclusive)
        if (query.FromUtc.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(query.FromUtc.Value, DateTimeKind.Utc);
            queryable = queryable.Where(a => a.CreatedAt >= fromUtc);
        }

        if (query.ToUtc.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(query.ToUtc.Value, DateTimeKind.Utc);
            queryable = queryable.Where(a => a.CreatedAt < toUtc);
        }

        var totalCount = await queryable.CountAsync(ct);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / query.PageSize);

        var rows = await queryable
            .OrderByDescending(a => a.CreatedAt)
            .ThenByDescending(a => a.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        var items = rows.Select(row =>
        {
            var actorId = row.ActorId ?? TryExtractActorUserId(row.Details);
            var displayName = row.Actor != null ? row.Actor.FullName : "Unavailable actor";
            return new AuditLogSummaryDto(
                row.Id,
                DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc),
                new AuditLogActorDto(actorId, displayName),
                row.Action,
                row.EntityType,
                row.EntityId
            );
        }).ToList();

        return new PagedResult<AuditLogSummaryDto>(items, query.Page, query.PageSize, totalCount, totalPages);
    }

    public async Task<AuditLogDetailDto?> GetAuditLogByIdAsync(Guid id, CancellationToken ct = default)
    {
        var row = await _dbContext.AuditLogs
            .AsNoTracking()
            .Include(a => a.Actor)
            .SingleOrDefaultAsync(a => a.Id == id, ct);

        if (row == null)
            return null;

        var actorId = row.ActorId ?? TryExtractActorUserId(row.Details);
        var displayName = row.Actor != null ? row.Actor.FullName : "Unavailable actor";
        var (metadata, metadataUnavailable) = ParseSafeMetadata(row.Action, row.Details);

        return new AuditLogDetailDto(
            row.Id,
            DateTime.SpecifyKind(row.CreatedAt, DateTimeKind.Utc),
            new AuditLogActorDto(actorId, displayName),
            row.Action,
            row.EntityType,
            row.EntityId,
            metadata,
            metadataUnavailable
        );
    }

    public static void ValidateQuery(GetAuditLogsQuery query)
    {
        if (query.Page < 1)
            throw new ArgumentException("Page must be greater than or equal to 1.", nameof(query.Page));

        if (query.PageSize < 1 || query.PageSize > 100)
            throw new ArgumentException("Page size must be between 1 and 100.", nameof(query.PageSize));

        if (query.Search != null && query.Search.Trim().Length > 100)
            throw new ArgumentException("Search query cannot exceed 100 characters.", nameof(query.Search));

        if (query.Action != null && query.Action.Trim().Length > 100)
            throw new ArgumentException("Action filter cannot exceed 100 characters.", nameof(query.Action));

        if (query.EntityType != null && query.EntityType.Trim().Length > 50)
            throw new ArgumentException("EntityType filter cannot exceed 50 characters.", nameof(query.EntityType));

        if (query.ActorId.HasValue && query.ActorId.Value == Guid.Empty)
            throw new ArgumentException("Actor ID must be a non-empty GUID.", nameof(query.ActorId));

        if (query.FromUtc.HasValue && query.ToUtc.HasValue && query.FromUtc.Value >= query.ToUtc.Value)
            throw new ArgumentException("From date must be earlier than To date.", nameof(query.FromUtc));
    }

    public static Guid? TryExtractActorUserId(string? rawDetails)
    {
        if (string.IsNullOrWhiteSpace(rawDetails) || rawDetails.Length > 2048)
            return null;

        try
        {
            using var doc = JsonDocument.Parse(rawDetails);
            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("actorUserId", out var uidElem) &&
                uidElem.ValueKind == JsonValueKind.String &&
                Guid.TryParse(uidElem.GetString(), out var parsed))
            {
                return parsed;
            }
        }
        catch
        {
            // Defensive: ignore unparseable or legacy formats
        }

        return null;
    }

    public static (IReadOnlyDictionary<string, object?> Metadata, bool MetadataUnavailable) ParseSafeMetadata(string action, string? rawDetails)
    {
        var empty = new Dictionary<string, object?>();
        if (string.IsNullOrWhiteSpace(rawDetails) || rawDetails.Length > 2048 || !AuditEventRegistry.Events.ContainsKey(action))
            return (empty, true);

        try
        {
            using var doc = JsonDocument.Parse(rawDetails);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
                return (empty, true);

            // Must contain schemaVersion == 1
            if (!root.TryGetProperty("schemaVersion", out var svElem) ||
                svElem.ValueKind != JsonValueKind.Number ||
                svElem.GetInt32() != 1)
            {
                return (empty, true);
            }

            var result = new Dictionary<string, object?>();

            if (root.TryGetProperty("actorRole", out var arElem) && arElem.ValueKind == JsonValueKind.String)
            {
                var role = arElem.GetString();
                if (role is "Admin" or "Instructor" or "Student")
                {
                    result["actorRole"] = role;
                }
            }

            if (root.TryGetProperty("data", out var dataElem) && dataElem.ValueKind == JsonValueKind.Object)
            {
                var allowedKeys = AuditEventRegistry.Events[action];

                foreach (var key in allowedKeys)
                {
                    if (dataElem.TryGetProperty(key, out var valElem) && AuditEventRegistry.IsSafeValue(key, valElem))
                    {
                        switch (valElem.ValueKind)
                        {
                            case JsonValueKind.String:
                                result[key] = valElem.GetString();
                                break;
                            case JsonValueKind.Number:
                                if (valElem.TryGetInt64(out var lVal)) result[key] = lVal;
                                else if (valElem.TryGetDouble(out var dVal)) result[key] = dVal;
                                break;
                            case JsonValueKind.True:
                                result[key] = true;
                                break;
                            case JsonValueKind.False:
                                result[key] = false;
                                break;
                            case JsonValueKind.Null:
                                result[key] = null;
                                break;
                        }
                    }
                }
            }
            else
            {
                return (empty, true);
            }

            return (result, false);
        }
        catch
        {
            return (empty, true);
        }
    }
}
