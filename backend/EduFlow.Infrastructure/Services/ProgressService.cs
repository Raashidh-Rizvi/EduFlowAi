using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Enums;
using EduFlow.Core.Events;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

public class ProgressService : IProgressService
{
    private const string PublishedContentStatus = "Published";

    private readonly ApplicationDbContext _dbContext;
    private readonly IDomainEventDispatcher? _events;

    /// <param name="events">Publishes CourseCompleted; optional only for hosts without event handlers.</param>
    public ProgressService(ApplicationDbContext dbContext, IDomainEventDispatcher? events = null)
    {
        _dbContext = dbContext;
        _events = events;
    }

    public async Task<CourseProgress> CalculateAsync(Guid courseId, Guid studentId, CancellationToken ct = default)
    {
        var modules = await _dbContext.Modules.AsNoTracking()
            .Where(m => m.CourseId == courseId)
            .OrderBy(m => m.OrderIndex)
            .Select(m => new { m.Id, m.Title, m.OrderIndex })
            .ToListAsync(ct);

        var items = await _dbContext.ContentItems.AsNoTracking()
            .Where(ci => ci.Module!.CourseId == courseId && ci.Status == PublishedContentStatus)
            .Select(ci => new { ci.Id, ci.ModuleId })
            .ToListAsync(ct);
        var itemIds = items.Select(i => i.Id).ToList();
        var completedItemIds = (await _dbContext.LessonCompletions.AsNoTracking()
            .Where(lc => lc.StudentId == studentId && lc.ContentItemId != null && itemIds.Contains(lc.ContentItemId.Value))
            .Select(lc => lc.ContentItemId!.Value)
            .ToListAsync(ct)).ToHashSet();

        var assessments = await _dbContext.Assessments.AsNoTracking()
            .Where(a => a.CourseId == courseId && a.Status == QuizStatus.Published)
            .Select(a => new { a.Id, a.ModuleId })
            .ToListAsync(ct);
        var assessmentIds = assessments.Select(a => a.Id).ToList();
        var passedAssessmentIds = (await _dbContext.Submissions.AsNoTracking()
            .Where(s => s.StudentId == studentId && s.Status == AttemptStatus.Evaluated && s.Passed
                && assessmentIds.Contains(s.AssessmentId))
            .Select(s => s.AssessmentId)
            .Distinct()
            .ToListAsync(ct)).ToHashSet();

        var moduleProgress = modules.Select(m =>
        {
            int totalItems = items.Count(i => i.ModuleId == m.Id);
            int doneItems = items.Count(i => i.ModuleId == m.Id && completedItemIds.Contains(i.Id));
            int totalAssessments = assessments.Count(a => a.ModuleId == m.Id);
            int passed = assessments.Count(a => a.ModuleId == m.Id && passedAssessmentIds.Contains(a.Id));
            int total = totalItems + totalAssessments;
            int done = doneItems + passed;
            return new ModuleProgress(m.Id, m.Title, m.OrderIndex, totalItems, doneItems, totalAssessments, passed,
                Percent(done, total), total > 0 && done == total);
        }).ToList();

        int totalUnits = moduleProgress.Sum(m => m.TotalContentItems + m.TotalAssessments);
        int completedUnits = moduleProgress.Sum(m => m.CompletedContentItems + m.PassedAssessments);
        return new CourseProgress(courseId, studentId, moduleProgress, totalUnits, completedUnits,
            Percent(completedUnits, totalUnits), totalUnits > 0 && completedUnits == totalUnits);
    }

    public async Task<CourseProgress?> RefreshEnrollmentAsync(Guid courseId, Guid studentId, CancellationToken ct = default)
    {
        var enrollment = await _dbContext.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId, ct);
        if (enrollment == null)
        {
            return null;
        }

        var progress = await CalculateAsync(courseId, studentId, ct);
        enrollment.ProgressPercentage = (double)progress.Percentage;

        // Completing every unit is a milestone: it is recorded once and not undone if the
        // instructor later adds content (the percentage still reflects the new content).
        bool becameComplete = progress.IsComplete && enrollment.Status == EnrollmentStatus.Active;
        if (becameComplete)
        {
            enrollment.Status = EnrollmentStatus.Completed;
            enrollment.CompletedAt = DateTime.UtcNow;
        }
        enrollment.UpdatedAt = DateTime.UtcNow;

        if (becameComplete && _events != null)
        {
            await _events.PublishAsync(new CourseCompleted(studentId, courseId), ct);
        }
        return progress;
    }

    private static decimal Percent(int done, int total)
        => total > 0 ? Math.Round((decimal)done / total * 100m, 2) : 0m;
}
