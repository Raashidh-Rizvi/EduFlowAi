using System;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/admin/audit-logs")]
[Authorize(Roles = "Admin")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AdminAuditLogsController : BaseApiController
{
    private readonly IAdminAuditLogService _auditLogService;

    public AdminAuditLogsController(ApplicationDbContext dbContext, IAdminAuditLogService auditLogService)
        : base(dbContext)
    {
        _auditLogService = auditLogService ?? throw new ArgumentNullException(nameof(auditLogService));
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? action = null,
        [FromQuery] string? entityType = null,
        [FromQuery] Guid? actorId = null,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null)
    {
        var ct = HttpContext.RequestAborted;
        var authResult = await VerifyActiveAdminCallerAsync(ct);
        if (authResult != null)
            return authResult;

        var query = new GetAuditLogsQuery
        {
            Page = page,
            PageSize = pageSize,
            Search = search,
            Action = action,
            EntityType = entityType,
            ActorId = actorId,
            FromUtc = fromUtc,
            ToUtc = toUtc
        };

        try
        {
            var pagedResult = await _auditLogService.GetAuditLogsAsync(query, ct);
            return Ok(pagedResult);
        }
        catch (ArgumentException ex)
        {
            // Messages come from AdminAuditLogService's curated query validation; strip the
            // framework "(Parameter '...')" suffix so internal parameter names are not echoed.
            var message = ex.ParamName == null ? ex.Message : ex.Message.Replace($" (Parameter '{ex.ParamName}')", string.Empty);
            return BadRequest(new { success = false, message, code = "validation_failed", errors = (object?)null, traceId = HttpContext?.TraceIdentifier });
        }
    }

    [HttpGet("options")]
    public async Task<IActionResult> GetOptions()
    {
        var denied = await VerifyActiveAdminCallerAsync(HttpContext.RequestAborted);
        if (denied != null) return denied;
        return Ok(new
        {
            actions = AuditEventRegistry.Events.Keys.OrderBy(x => x).ToArray(),
            resourceTypes = AuditEventRegistry.Events.Keys.Select(x => x.Split('.')[0]).Distinct().OrderBy(x => x).ToArray()
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAuditLogById(Guid id)
    {
        var ct = HttpContext.RequestAborted;
        var authResult = await VerifyActiveAdminCallerAsync(ct);
        if (authResult != null)
            return authResult;

        var detail = await _auditLogService.GetAuditLogByIdAsync(id, ct);
        if (detail == null)
        {
            return NotFound(new { message = "Audit log entry not found.", code = "not_found" });
        }

        return Ok(detail);
    }

    private async Task<IActionResult?> VerifyActiveAdminCallerAsync(System.Threading.CancellationToken ct)
    {
        var (callerId, _) = GetCurrentUser();
        if (callerId == Guid.Empty)
        {
            return Unauthorized(new { message = "Authentication required.", code = "unauthorized" });
        }

        var caller = await DbContext.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == callerId, ct);
        if (caller == null)
        {
            return Unauthorized(new { message = "User account not found.", code = "unauthorized" });
        }

        if (!caller.IsActive)
        {
            return StatusCode(403, new { message = "Your account is inactive or suspended.", code = "account_inactive" });
        }

        if (caller.Role != UserRole.Admin)
        {
            return StatusCode(403, new { message = "Administrator access is required.", code = "role_denied" });
        }

        return null;
    }
}
