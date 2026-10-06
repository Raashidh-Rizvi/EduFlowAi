using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
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
        var progress = await CalculateManyAsync(new[] { courseId }, studentId, ct);
        return progress[courseId];
    }

    public async Task<IReadOnlyDictionary<Guid, CourseProgress>> CalculateManyAsync(
        IReadOnlyCollection<Guid> courseIds, Guid studentId, CancellationToken ct = default)
    {
        var ids = courseIds?.Distinct().ToList() ?? new List<Guid>();
        var result = new Dictionary<Guid, CourseProgress>();
        if (ids.Count == 0) return result;

        // A fixed number of queries regardless of how many courses are requested.
        var modules = await _dbContext.Modules.AsNoTracking()
            .Where(m => ids.Contains(m.CourseId))
            .OrderBy(m => m.OrderIndex)
            .Select(m => new { m.Id, m.CourseId, m.Title, m.OrderIndex })
            .ToListAsync(ct);

        var items = await _dbContext.ContentItems.AsNoTracking()
            .Where(ci => ids.Contains(ci.Module!.CourseId) && ci.Status == PublishedContentStatus)
            .Select(ci => new { ci.Id, ci.ModuleId })
            .ToListAsync(ct);
        var itemIds = items.Select(i => i.Id).ToList();
        var completedItemIds = (await _dbContext.LessonCompletions.AsNoTracking()
            .Where(lc => lc.StudentId == studentId && lc.ContentItemId != null && itemIds.Contains(lc.ContentItemId.Value))
            .Select(lc => lc.ContentItemId!.Value)
            .ToListAsync(ct)).ToHashSet();

        var assessments = await _dbContext.Assessments.AsNoTracking()
            .Where(a => ids.Contains(a.CourseId) && a.Status == QuizStatus.Published)
            .Select(a => new { a.Id, a.ModuleId })
            .ToListAsync(ct);
        var assessmentIds = assessments.Select(a => a.Id).ToList();
        var passedAssessmentIds = (await _dbContext.Submissions.AsNoTracking()
            .Where(s => s.StudentId == studentId && s.Status == AttemptStatus.Evaluated && s.Passed
                && assessmentIds.Contains(s.AssessmentId))
            .Select(s => s.AssessmentId)
            .Distinct()
            .ToListAsync(ct)).ToHashSet();

        var itemsByModule = items.ToLookup(i => i.ModuleId);
        var assessmentsByModule = assessments.ToLookup(a => a.ModuleId);
        var modulesByCourse = modules.ToLookup(m => m.CourseId);

        foreach (var courseId in ids)
        {
            var moduleProgress = modulesByCourse[courseId].Select(m =>
            {
                int totalItems = itemsByModule[m.Id].Count();
                int doneItems = itemsByModule[m.Id].Count(i => completedItemIds.Contains(i.Id));
                int totalAssessments = assessmentsByModule[m.Id].Count();
                int passed = assessmentsByModule[m.Id].Count(a => passedAssessmentIds.Contains(a.Id));
                int total = totalItems + totalAssessments;
                int done = doneItems + passed;
                return new ModuleProgress(m.Id, m.Title, m.OrderIndex, totalItems, doneItems, totalAssessments, passed,
                    Percent(done, total), total > 0 && done == total);
            }).ToList();

            int totalUnits = moduleProgress.Sum(m => m.TotalContentItems + m.TotalAssessments);
            int completedUnits = moduleProgress.Sum(m => m.CompletedContentItems + m.PassedAssessments);
            result[courseId] = new CourseProgress(courseId, studentId, moduleProgress, totalUnits, completedUnits,
                Percent(completedUnits, totalUnits), totalUnits > 0 && completedUnits == totalUnits);
        }
        return result;
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
        await StageAsync(enrollment, progress, onlyIfChanged: false, ct);
        return progress;
    }

    public async Task<IReadOnlyDictionary<Guid, CourseProgress>> RefreshEnrollmentsAsync(
        Guid studentId, IReadOnlyCollection<Enrollment> enrollments, CancellationToken ct = default)
    {
        var mine = enrollments.Where(e => e.StudentId == studentId).ToList();
        var progress = await CalculateManyAsync(mine.Select(e => e.CourseId).ToList(), studentId, ct);
        foreach (var enrollment in mine)
        {
            await StageAsync(enrollment, progress[enrollment.CourseId], onlyIfChanged: true, ct);
        }
        return progress;
    }

    /// <summary>
    /// Stages the cached percentage and completion milestone on a tracked enrollment.
    /// With <paramref name="onlyIfChanged"/>, an enrollment whose values are already current is
    /// left untouched so read paths do not issue writes.
    /// </summary>
    private async Task StageAsync(Enrollment enrollment, CourseProgress progress, bool onlyIfChanged, CancellationToken ct)
    {
        var percentage = (double)progress.Percentage;
        // Completing every unit is a milestone: it is recorded once and not undone if the
        // instructor later adds content (the percentage still reflects the new content).
        bool becameComplete = progress.IsComplete && enrollment.Status == EnrollmentStatus.Active;
        if (onlyIfChanged && !becameComplete && enrollment.ProgressPercentage.Equals(percentage))
        {
            return;
        }

        enrollment.ProgressPercentage = percentage;
        if (becameComplete)
        {
            enrollment.Status = EnrollmentStatus.Completed;
            enrollment.CompletedAt = DateTime.UtcNow;
        }
        enrollment.UpdatedAt = DateTime.UtcNow;

        if (becameComplete && _events != null)
        {
            await _events.PublishAsync(new CourseCompleted(enrollment.StudentId, enrollment.CourseId), ct);
        }
    }

    private static decimal Percent(int done, int total)
        => total > 0 ? Math.Round((decimal)done / total * 100m, 2) : 0m;
}
