using System;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/admin/support-tickets")]
[Authorize(Roles = "Admin")]
public class AdminSupportController : BaseApiController
{
    private readonly ISupportTicketService _ticketService;

    public AdminSupportController(ApplicationDbContext dbContext, ISupportTicketService ticketService)
        : base(dbContext)
    {
        _ticketService = ticketService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAdminTickets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? type = null,
        [FromQuery] string? status = null)
    {
        var (callerId, _) = GetCurrentUser();
        if (callerId == Guid.Empty)
            return Unauthorized(new { message = "Authentication required.", code = "unauthorized" });

        var ct = HttpContext.RequestAborted;
        var result = await _ticketService.GetAdminTicketsAsync(page, pageSize, search, type, status, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAdminTicketById(Guid id)
    {
        var (callerId, _) = GetCurrentUser();
        if (callerId == Guid.Empty)
            return Unauthorized(new { message = "Authentication required.", code = "unauthorized" });

        var ct = HttpContext.RequestAborted;
        var detail = await _ticketService.GetAdminTicketByIdAsync(id, ct);
        if (detail == null)
            return NotFound(new { message = "Support ticket not found.", code = "not_found" });

        return Ok(detail);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateAdminTicket(Guid id, [FromBody] UpdateAdminSupportTicketRequest request)
    {
        var (callerId, _) = GetCurrentUser();
        if (callerId == Guid.Empty)
            return Unauthorized(new { message = "Authentication required.", code = "unauthorized" });

        var ct = HttpContext.RequestAborted;
        var (detail, errorCode, errorMessage, statusCode) = await _ticketService.UpdateAdminTicketAsync(callerId, id, request, ct);

        if (errorCode != null)
        {
            return StatusCode(statusCode, new { message = errorMessage, code = errorCode });
        }

        return Ok(detail);
    }
}
