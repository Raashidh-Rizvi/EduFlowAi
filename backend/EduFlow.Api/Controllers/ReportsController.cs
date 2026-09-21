using System;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public ReportsController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Lists all generated reports.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetReports([FromQuery] string? type = null)
    {
        var query = _dbContext.Reports
            .Include(r => r.GeneratedBy)
            .AsQueryable();

        if (!string.IsNullOrEmpty(type))
        {
            query = query.Where(r => r.Type.ToLower() == type.ToLower());
        }

        var reports = await query
            .OrderByDescending(r => r.CreatedAt)
            .Take(50)
            .Select(r => new
            {
                r.Id,
                r.Title,
                r.Type,
                r.Status,
                r.SummaryJson,
                r.FileUrl,
                GeneratedByName = r.GeneratedBy != null ? r.GeneratedBy.FullName : "System",
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(reports);
    }

    /// <summary>
    /// Fetches a specific report by ID.
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetReportById(Guid id)
    {
        var report = await _dbContext.Reports
            .Include(r => r.GeneratedBy)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (report == null)
        {
            return NotFound(new { message = "Report not found." });
        }

        return Ok(new
        {
            report.Id,
            report.Title,
            report.Type,
            report.Status,
            report.SummaryJson,
            report.FileUrl,
            GeneratedByName = report.GeneratedBy != null ? report.GeneratedBy.FullName : "System",
            report.CreatedAt
        });
    }

    /// <summary>
    /// Generates a new analytical report (StudentPerformance, CourseAnalytics, EngagementSummary, GamificationAudit).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GenerateReport([FromBody] GenerateReportRequest request)
    {
        var uidClaim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("uid");
        var generatedById = !string.IsNullOrEmpty(uidClaim) && Guid.TryParse(uidClaim, out var parsed) ? parsed : (Guid?)null;

        // Dynamic aggregation based on report type
        object summaryData;
        string reportTitle;

        switch (request.ReportType.ToLower())
        {
            case "courseanalytics":
                var coursesCount = await _dbContext.Courses.CountAsync();
                var enrollmentsCount = await _dbContext.Enrollments.CountAsync();
                var avgPassRate = await _dbContext.Submissions.CountAsync() > 0
                    ? Math.Round((double)await _dbContext.Submissions.CountAsync(s => s.Passed) / await _dbContext.Submissions.CountAsync() * 100, 1)
                    : 100.0;
                reportTitle = $"Course Performance & Enrollment Summary - {DateTime.UtcNow:yyyy-MM-dd}";
                summaryData = new { totalCourses = coursesCount, activeEnrollments = enrollmentsCount, averagePassRate = avgPassRate };
                break;

            case "engagementsummary":
                var activeStreaks = await _dbContext.StudentStreaks.CountAsync(s => s.CurrentStreak > 0);
                var totalXp = await _dbContext.StudentXp.SumAsync(s => (long)s.TotalXp);
                var totalBadges = await _dbContext.StudentBadges.CountAsync();
                reportTitle = $"Gamification & Engagement Velocity Report - {DateTime.UtcNow:yyyy-MM-dd}";
                summaryData = new { activeStreaks, totalXpAwarded = totalXp, totalBadgesEarned = totalBadges };
                break;

            default:
                var totalStudents = await _dbContext.Users.CountAsync(u => u.Role == UserRole.Student);
                var completedQuizzes = await _dbContext.Submissions.CountAsync(s => s.Passed);
                reportTitle = $"Student Cohort Learning Report - {DateTime.UtcNow:yyyy-MM-dd}";
                summaryData = new { totalStudents, quizzesCompleted = completedQuizzes };
                break;
        }

        var report = new Report
        {
            Title = request.Title ?? reportTitle,
            Type = request.ReportType,
            GeneratedById = generatedById,
            Status = "Completed",
            SummaryJson = JsonSerializer.Serialize(summaryData),
            FileUrl = $"/reports/{Guid.NewGuid()}.pdf"
        };

        await _dbContext.Reports.AddAsync(report);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetReportById), new { id = report.Id }, new
        {
            report.Id,
            report.Title,
            report.Type,
            report.Status,
            report.SummaryJson,
            report.FileUrl,
            report.CreatedAt
        });
    }
}

public record GenerateReportRequest(
    string ReportType, // StudentPerformance | CourseAnalytics | EngagementSummary | GamificationAudit
    string? Title
);
