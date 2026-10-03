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

    [HttpPost("{id}/read")]
    [Authorize]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (string.IsNullOrEmpty(uidClaim) || !Guid.TryParse(uidClaim, out var userId))
        {
            return Unauthorized();
        }

        var notification = await _dbContext.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (notification == null)
        {
            return NotFound(new { message = "Notification not found." });
        }

        notification.IsRead = true;
        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Notification marked as read.", id = notification.Id });
    }

    [HttpPost("broadcast")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> BroadcastAnnouncement([FromBody] BroadcastRequest request)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        if (!Guid.TryParse(uidClaim, out var authorId))
        {
            return Unauthorized();
        }

        // A course-scoped announcement may only target a course the instructor owns.
        if (request.CourseId is { } courseId && !User.IsInRole("Admin")
            && !await _dbContext.Courses.AnyAsync(c => c.Id == courseId && c.InstructorId == authorId))
        {
            return Forbid();
        }

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

    [HttpGet("broadcasts")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetRecentBroadcasts([FromQuery] int limit = 20)
    {
        const int maxLimit = 100;
        var take = limit <= 0 ? 20 : Math.Min(limit, maxLimit);

        var broadcasts = await _dbContext.Announcements
            .Include(a => a.Author)
            .OrderByDescending(a => a.CreatedAt)
            .Take(take)
            .Select(a => new BroadcastAnnouncementDto(
                a.Id,
                a.Title,
                a.Content,
                a.IsGlobal,
                a.CourseId,
                a.AuthorId,
                a.Author != null ? a.Author.FullName : null,
                a.CreatedAt))
            .ToListAsync();

        return Ok(broadcasts);
    }
}

public record BroadcastRequest(
    string Title,
    string Content,
    bool IsGlobal,
    Guid? CourseId
);

public record BroadcastAnnouncementDto(
    Guid Id,
    string Title,
    string Content,
    bool IsGlobal,
    Guid? CourseId,
    Guid AuthorId,
    string? AuthorName,
    DateTime CreatedAt
);
