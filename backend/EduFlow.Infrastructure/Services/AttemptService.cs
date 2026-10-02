using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

public class AttemptService : IAttemptService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IAssessmentAccessService _accessService;

    public AttemptService(ApplicationDbContext dbContext, IAssessmentAccessService accessService)
    {
        _dbContext = dbContext;
        _accessService = accessService;
    }

    public async Task<AttemptResolution> StartOrResumeAsync(Assessment assessment, Guid studentId, CancellationToken ct = default)
    {
        var open = await FindOpenAttemptAsync(assessment.Id, studentId, ct);

        // Resuming never consumes another attempt, but access rules still apply.
        var eligibility = await _accessService.CheckAttemptEligibilityAsync(assessment, studentId, startsNewAttempt: open == null, ct);
        if (!eligibility.IsAllowed)
        {
            return new AttemptResolution(null, eligibility);
        }

        if (open != null)
        {
            return new AttemptResolution(open, eligibility);
        }

        var attempt = await NewAttemptAsync(assessment.Id, studentId, ct);
        _dbContext.Submissions.Add(attempt);
        try
        {
            await _dbContext.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // A concurrent /start took this attempt number; use the attempt it created.
            _dbContext.Entry(attempt).State = EntityState.Detached;
            open = await FindOpenAttemptAsync(assessment.Id, studentId, ct);
            if (open == null) throw;
            return new AttemptResolution(open, eligibility);
        }

        return new AttemptResolution(attempt, eligibility);
    }

    public async Task<AttemptResolution> ResolveForSubmissionAsync(Assessment assessment, Guid studentId, Guid? attemptId, CancellationToken ct = default)
    {
        Submission? attempt;
        if (attemptId.HasValue)
        {
            attempt = await _dbContext.Submissions.FirstOrDefaultAsync(s =>
                s.Id == attemptId.Value && s.AssessmentId == assessment.Id && s.StudentId == studentId, ct);
            if (attempt == null)
            {
                return Denied(AttemptDenialReason.AttemptNotFound, "This attempt does not exist for your account.");
            }
            if (attempt.Status != AttemptStatus.InProgress)
            {
                return Denied(AttemptDenialReason.AttemptNotOpen, "This attempt has already been submitted.");
            }
        }
        else
        {
            attempt = await FindOpenAttemptAsync(assessment.Id, studentId, ct);
        }

        var eligibility = await _accessService.CheckAttemptEligibilityAsync(assessment, studentId, startsNewAttempt: attempt == null, ct);
        if (!eligibility.IsAllowed)
        {
            return new AttemptResolution(null, eligibility);
        }

        if (attempt != null)
        {
            return new AttemptResolution(attempt, eligibility);
        }

        return new AttemptResolution(await NewAttemptAsync(assessment.Id, studentId, ct), eligibility, IsNew: true);
    }

    private Task<Submission?> FindOpenAttemptAsync(Guid assessmentId, Guid studentId, CancellationToken ct)
        => _dbContext.Submissions
            .Where(s => s.AssessmentId == assessmentId && s.StudentId == studentId && s.Status == AttemptStatus.InProgress)
            .OrderByDescending(s => s.AttemptNumber)
            .FirstOrDefaultAsync(ct);

    private async Task<Submission> NewAttemptAsync(Guid assessmentId, Guid studentId, CancellationToken ct)
    {
        int lastNumber = await _dbContext.Submissions
            .Where(s => s.AssessmentId == assessmentId && s.StudentId == studentId)
            .Select(s => (int?)s.AttemptNumber)
            .MaxAsync(ct) ?? 0;

        return new Submission
        {
            AssessmentId = assessmentId,
            StudentId = studentId,
            AttemptNumber = lastNumber + 1,
            Status = AttemptStatus.InProgress,
            StartedAt = DateTime.UtcNow
        };
    }

    private static AttemptResolution Denied(AttemptDenialReason reason, string message)
        => new(null, new AttemptEligibility(reason, message, 0, 0));
}
