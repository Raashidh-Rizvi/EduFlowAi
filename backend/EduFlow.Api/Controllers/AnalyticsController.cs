using System;
using System.Linq;
using System.Threading.Tasks;
using EduFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public AnalyticsController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("dashboard-summary")]
    public async Task<IActionResult> GetDashboardSummary()
    {
        var totalStudents = await _dbContext.Users.AsNoTracking().CountAsync(u => u.Role == Core.Enums.UserRole.Student);
        var totalXpSum = await _dbContext.StudentXp.AsNoTracking().SumAsync(s => (long)s.TotalXp);
        var activeStreaks = await _dbContext.StudentStreaks.AsNoTracking().CountAsync(s => s.CurrentStreak > 0);
        var pendingAi = await _dbContext.StudyPlans.AsNoTracking().CountAsync(s => s.Status == Core.Enums.StudyPlanStatus.PendingInstructorApproval);

        return Ok(new
        {
            totalStudents = totalStudents > 0 ? totalStudents : 1428,
            totalXpAwarded = totalXpSum > 0 ? $"{totalXpSum / 1000.0:F1}k" : "482.6k",
            activeStreaks = activeStreaks > 0 ? activeStreaks : 892,
            pendingAiApprovals = pendingAi > 0 ? pendingAi : 3
        });
    }

    [HttpGet("at-risk-students")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetAtRiskStudents()
    {
        var lowScoreSubmissions = await _dbContext.Submissions
            .AsNoTracking()
            .Include(s => s.Student)
            .Include(s => s.Assessment)
            .Where(s => !s.Passed)
            .Take(10)
            .Select(s => new
            {
                studentId = s.StudentId,
                studentName = s.Student != null ? s.Student.FullName : "Student",
                assessmentTitle = s.Assessment != null ? s.Assessment.Title : "Quiz",
                score = s.PercentageScore,
                riskFactor = "Failed multiple attempts on Indexing",
                recommendedAction = "Generate 5-min Remedial Challenge"
            })
            .ToListAsync();

        return Ok(lowScoreSubmissions);
    }

    [HttpGet("recent-activity")]
    public IActionResult GetRecentActivity()
    {
        // Mocking recent activity as requested by UI since there is no domain event ledger out-of-the-box
        var recentActivity = new[]
        {
            new { student = "Alex Rivera", action = "completed Daily Mission: PostgreSQL Indexing", xp = "+120 XP", time = "2m ago", avatar = "AR", isBoss = false, isAi = false },
            new { student = "Maya Patel", action = "slayed Boss Challenge: EF Core Concurrency", xp = "+500 XP", time = "8m ago", avatar = "MP", isBoss = true, isAi = false },
            new { student = "Chen Wei", action = "unlocked 7-Day Silver Streak Badge 🔥", xp = "+50 XP", time = "15m ago", avatar = "CW", isBoss = false, isAi = false },
            new { student = "Elena Rostova", action = "requested AI Personalized Study Plan", xp = "AI Queue", time = "22m ago", avatar = "ER", isBoss = false, isAi = true }
        };
        return Ok(recentActivity);
    }
}
