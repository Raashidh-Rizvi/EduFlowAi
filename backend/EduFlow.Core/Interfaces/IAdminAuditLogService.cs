using System;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;

namespace EduFlow.Core.Interfaces;

public interface IAdminAuditLogService
{
    Task<PagedResult<AuditLogSummaryDto>> GetAuditLogsAsync(GetAuditLogsQuery query, CancellationToken ct = default);
    Task<AuditLogDetailDto?> GetAuditLogByIdAsync(Guid id, CancellationToken ct = default);
}
