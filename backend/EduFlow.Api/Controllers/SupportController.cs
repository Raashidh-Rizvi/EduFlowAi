using System;
using System.Threading.Tasks;
using EduFlow.Core.DTOs;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Student,Instructor")]
public class SupportController : BaseApiController
{
    private readonly ISupportTicketService _ticketService;

    public SupportController(ApplicationDbContext dbContext, ISupportTicketService ticketService)
        : base(dbContext)
    {
        _ticketService = ticketService;
    }

    [HttpPost("tickets")]
    public async Task<IActionResult> CreateTicket([FromBody] CreateSupportTicketRequest request)
    {
        var (callerId, _) = GetCurrentUser();
        if (callerId == Guid.Empty)
            return Unauthorized(new { message = "Authentication required.", code = "unauthorized" });

        var ct = HttpContext.RequestAborted;
        var (detail, errorCode, errorMessage, isReplay) = await _ticketService.CreateTicketAsync(callerId, request, ct);

        if (errorCode != null)
        {
            var statusCode = errorCode switch
            {
                "unauthorized" => 401,
                "account_inactive" => 403,
                "role_denied" => 403,
                "submission_key_reused" => 409,
                _ => 400
            };
            return StatusCode(statusCode, new { message = errorMessage, code = errorCode });
        }

        if (isReplay)
        {
            return Ok(detail);
        }

        return Created($"/api/support/tickets/{detail!.Id}", detail);
    }

    [HttpGet("tickets")]
    public async Task<IActionResult> GetMyTickets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? type = null,
        [FromQuery] string? status = null)
    {
        var (callerId, _) = GetCurrentUser();
        if (callerId == Guid.Empty)
            return Unauthorized(new { message = "Authentication required.", code = "unauthorized" });

        var ct = HttpContext.RequestAborted;
        var user = await DbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == callerId, ct);
        if (user == null || !user.IsActive)
            return StatusCode(403, new { message = "User account is suspended or inactive.", code = "account_inactive" });

        var result = await _ticketService.GetMyTicketsAsync(callerId, page, pageSize, type, status, ct);
        return Ok(result);
    }

    [HttpGet("tickets/{id:guid}")]
    public async Task<IActionResult> GetMyTicketById(Guid id)
    {
        var (callerId, _) = GetCurrentUser();
        if (callerId == Guid.Empty)
            return Unauthorized(new { message = "Authentication required.", code = "unauthorized" });

        var ct = HttpContext.RequestAborted;
        var user = await DbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == callerId, ct);
        if (user == null || !user.IsActive)
            return StatusCode(403, new { message = "User account is suspended or inactive.", code = "account_inactive" });

        var detail = await _ticketService.GetMyTicketByIdAsync(callerId, id, ct);
        if (detail == null)
            return NotFound(new { message = "Support ticket not found.", code = "not_found" });

        return Ok(detail);
    }
}
