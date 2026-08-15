using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public NotificationsController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("user")]
    [Authorize]
    public async Task<IActionResult> GetUserNotifications()
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var userId))
        {
            return Unauthorized();
        }

        var notifications = await _dbContext.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(20)
            .ToListAsync();

        return Ok(notifications);
    }

    [HttpPost("broadcast")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> BroadcastAnnouncement([FromBody] BroadcastRequest request)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var authorId = !string.IsNullOrEmpty(uidClaim) && Guid.TryParse(uidClaim, out var parsed) ? parsed : Guid.NewGuid();

        var announcement = new Announcement
        {
            Title = request.Title,
            Content = request.Content,
            AuthorId = authorId,
            IsGlobal = request.IsGlobal,
            CourseId = request.CourseId
        };

        await _dbContext.Announcements.AddAsync(announcement);
        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Broadcast announcement published successfully!", announcementId = announcement.Id });
    }
}

public record BroadcastRequest(
    string Title,
    string Content,
    bool IsGlobal,
    Guid? CourseId
);
