using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Constants;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

public class GradeService : IGradeService
{
    private const decimal FullWeight = 100m;
    private static readonly Regex GradeLabelPattern = new(@"^[A-Za-z0-9][A-Za-z0-9+\-]{0,9}$", RegexOptions.Compiled);

    private readonly ApplicationDbContext _dbContext;
    private readonly IAuditLogWriter _auditLogWriter;

    public GradeService(ApplicationDbContext dbContext, IAuditLogWriter auditLogWriter)
    {
        _dbContext = dbContext;
        _auditLogWriter = auditLogWriter;
    }

    // -------------------------------------------------------------------------
    // Calculation
    // -------------------------------------------------------------------------

    public async Task<CourseResult?> RecalculateAsync(Guid courseId, Guid studentId, CancellationToken ct = default)
    {
        var config = await _dbContext.CourseGradingConfigurations
            .Include(c => c.GradingPolicy!).ThenInclude(p => p.Bands)
            .FirstOrDefaultAsync(c => c.CourseId == courseId, ct);
        if (config == null || config.Status != GradingConfigurationStatus.Active)
        {
            return null;
        }

        var weights = await _dbContext.Assessments
            .Where(a => a.CourseId == courseId && a.GradeWeightPercent != null)
            .Select(a => new { a.Id, Weight = a.GradeWeightPercent!.Value })
            .ToListAsync(ct);
        var weightedIds = weights.Select(w => w.Id).ToList();

        var attempts = await _dbContext.Submissions
            .Where(s => s.StudentId == studentId && s.Status == AttemptStatus.Evaluated && weightedIds.Contains(s.AssessmentId))
            .Select(s => new { s.AssessmentId, s.PercentageScore, s.SubmittedAt, s.AttemptNumber })
            .ToListAsync(ct);

        decimal weightedSum = 0m;
        decimal assessedWeight = 0m;
        foreach (var w in weights)
        {
            var forAssessment = attempts.Where(a => a.AssessmentId == w.Id).ToList();
            if (forAssessment.Count == 0) continue;

            double percentage = config.AttemptScoring == AttemptScoringRule.Latest
                ? forAssessment.OrderByDescending(a => a.SubmittedAt).ThenByDescending(a => a.AttemptNumber).First().PercentageScore
                : forAssessment.Max(a => a.PercentageScore);

            weightedSum += (decimal)percentage * w.Weight / FullWeight;
            assessedWeight += w.Weight;
        }

        decimal coursePercentage = Math.Clamp(Math.Round(weightedSum, 2), 0m, FullWeight);
        var result = await _dbContext.CourseResults.FirstOrDefaultAsync(r => r.CourseId == courseId && r.StudentId == studentId, ct)
            ?? _dbContext.CourseResults.Local.FirstOrDefault(r => r.CourseId == courseId && r.StudentId == studentId);
        if (result == null)
        {
            result = new CourseResult { CourseId = courseId, StudentId = studentId };
            _dbContext.CourseResults.Add(result);
        }

        result.CoursePercentage = coursePercentage;
        result.CurrentPercentage = assessedWeight > 0 ? Math.Round(weightedSum / assessedWeight * FullWeight, 2) : null;
        result.AssessedWeight = assessedWeight;
        result.IsComplete = weights.Count > 0 && assessedWeight == weights.Sum(w => w.Weight);
        result.CalculatedGrade = ResolveGrade(config.GradingPolicy!.Bands, coursePercentage);
        result.CalculatedAt = DateTime.UtcNow;
        result.UpdatedAt = result.CalculatedAt;
        return result;
    }

    public async Task RecalculateCourseAsync(Guid courseId, CancellationToken ct = default)
    {
        var studentIds = await _dbContext.Enrollments
            .Where(e => e.CourseId == courseId)
            .Select(e => e.StudentId)
            .Union(_dbContext.Submissions.Where(s => s.Assessment!.CourseId == courseId).Select(s => s.StudentId))
            .Distinct()
            .ToListAsync(ct);

        foreach (var studentId in studentIds)
        {
            await RecalculateAsync(courseId, studentId, ct);
        }
        await _dbContext.SaveChangesAsync(ct);
    }

    public string ResolveGrade(IEnumerable<GradeBand> bands, decimal percentage)
    {
        var match = bands
            .OrderByDescending(b => b.MinPercentage)
            .FirstOrDefault(b => percentage >= b.MinPercentage);
        return match?.Label ?? throw new InvalidOperationException("The grading policy has no band for this percentage.");
    }

    public IReadOnlyList<string> ValidateBands(IReadOnlyList<GradeBandInput> bands)
    {
        var errors = new List<string>();
        if (bands.Count == 0)
        {
            errors.Add("A grading scale needs at least one band.");
            return errors;
        }

        foreach (var band in bands)
        {
            if (string.IsNullOrWhiteSpace(band.Label) || !GradeLabelPattern.IsMatch(band.Label.Trim()))
                errors.Add($"Grade label '{band.Label}' must be 1-10 letters, digits, '+' or '-'.");
            if (band.MinPercentage < 0 || band.MinPercentage > FullWeight)
                errors.Add($"Grade '{band.Label}' minimum must be between 0 and 100.");
        }

        if (bands.Select(b => b.Label.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).Count() != bands.Count)
            errors.Add("Grade labels must be unique.");
        if (bands.Select(b => b.MinPercentage).Distinct().Count() != bands.Count)
            errors.Add("Each grade band must start at a different percentage.");
        if (!bands.Any(b => b.MinPercentage == 0))
            errors.Add("The lowest grade band must start at 0% so every percentage has a grade.");

        return errors;
    }

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    public async Task<CourseGradingConfiguration?> GetOrCreateConfigurationAsync(Guid courseId, CancellationToken ct = default)
    {
        if (!await _dbContext.Courses.AnyAsync(c => c.Id == courseId, ct))
        {
            return null;
        }

        var config = await _dbContext.CourseGradingConfigurations
            .Include(c => c.GradingPolicy!).ThenInclude(p => p.Bands)
            .FirstOrDefaultAsync(c => c.CourseId == courseId, ct);
        if (config != null)
        {
            return config;
        }

        var defaultPolicy = await _dbContext.GradingPolicies
            .Include(p => p.Bands)
            .FirstOrDefaultAsync(p => p.IsInstitutionDefault, ct)
            ?? throw new InvalidOperationException("The institution default grading policy is missing.");

        config = new CourseGradingConfiguration
        {
            CourseId = courseId,
            GradingPolicyId = defaultPolicy.Id,
            GradingPolicy = defaultPolicy
        };
        _dbContext.CourseGradingConfigurations.Add(config);
        await _dbContext.SaveChangesAsync(ct);
        return config;
    }

    public async Task<GradingOperationResult> SaveConfigurationAsync(
        Guid courseId, GradingConfigurationInput input, Guid actorId, string actorRole, CancellationToken ct = default)
    {
        var config = await GetOrCreateConfigurationAsync(courseId, ct);
        if (config == null)
        {
            return new GradingOperationResult(GradingError.CourseNotFound, "Course not found.");
        }

        var courseAssessments = await _dbContext.Assessments.Where(a => a.CourseId == courseId).ToListAsync(ct);
        var weightErrors = ValidateWeights(input.Weights, courseAssessments);
        if (weightErrors.Count > 0)
        {
            return new GradingOperationResult(GradingError.InvalidWeights, "The assessment weights are invalid.", weightErrors);
        }

        if (input.Bands != null)
        {
            var bandErrors = ValidateBands(input.Bands);
            if (bandErrors.Count > 0)
            {
                return new GradingOperationResult(GradingError.InvalidBands, "The grading scale is invalid.", bandErrors);
            }
        }

        // Weights not mentioned in the request keep their current value.
        var requested = input.Weights.ToDictionary(w => w.AssessmentId, w => w.WeightPercent);
        decimal total = courseAssessments.Sum(a => requested.TryGetValue(a.Id, out var w) ? w ?? 0m : a.GradeWeightPercent ?? 0m);
        if (total > FullWeight)
        {
            return new GradingOperationResult(GradingError.InvalidWeights,
                $"Assessment weights total {total}%, which exceeds 100%.");
        }
        if (config.Status == GradingConfigurationStatus.Active && total != FullWeight)
        {
            return new GradingOperationResult(GradingError.WeightsDoNotTotal100,
                $"Grading is active, so weights must total exactly 100% (they would total {total}%).");
        }

        foreach (var assessment in courseAssessments.Where(a => requested.ContainsKey(a.Id)))
        {
            assessment.GradeWeightPercent = requested[assessment.Id];
            assessment.UpdatedAt = DateTime.UtcNow;
        }

        config.AttemptScoring = input.AttemptScoring;
        if (input.Bands != null)
        {
            config.GradingPolicy = await ReplaceCoursePolicyAsync(courseId, config, input.Bands, ct);
            config.GradingPolicyId = config.GradingPolicy.Id;
        }
        config.UpdatedAt = DateTime.UtcNow;

        _auditLogWriter.AddEntry(actorId, actorRole, "CourseGrading.Updated", "CourseGrading", config.Id.ToString());
        await _dbContext.SaveChangesAsync(ct);

        if (config.Status == GradingConfigurationStatus.Active)
        {
            await RecalculateCourseAsync(courseId, ct);
        }

        return GradingOperationResult.Ok($"Grading configuration saved. Weights total {total}%.");
    }

    public async Task<GradingOperationResult> ActivateAsync(Guid courseId, Guid actorId, string actorRole, CancellationToken ct = default)
    {
        var config = await GetOrCreateConfigurationAsync(courseId, ct);
        if (config == null)
        {
            return new GradingOperationResult(GradingError.CourseNotFound, "Course not found.");
        }

        decimal total = await _dbContext.Assessments
            .Where(a => a.CourseId == courseId && a.GradeWeightPercent != null)
            .SumAsync(a => a.GradeWeightPercent!.Value, ct);
        if (total != FullWeight)
        {
            // Never normalize or auto-fill: the instructor decides the weights.
            return new GradingOperationResult(GradingError.WeightsDoNotTotal100,
                $"Assessment weights must total exactly 100% before grading can be activated (currently {total}%).");
        }

        var bandErrors = ValidateBands(config.GradingPolicy!.Bands.Select(b => new GradeBandInput(b.Label, b.MinPercentage)).ToList());
        if (bandErrors.Count > 0)
        {
            return new GradingOperationResult(GradingError.InvalidBands, "The grading scale is invalid.", bandErrors);
        }

        config.Status = GradingConfigurationStatus.Active;
        config.ActivatedAt = DateTime.UtcNow;
        config.ActivatedById = actorId;
        config.UpdatedAt = config.ActivatedAt.Value;
        _auditLogWriter.AddEntry(actorId, actorRole, "CourseGrading.Activated", "CourseGrading", config.Id.ToString());
        await _dbContext.SaveChangesAsync(ct);

        await RecalculateCourseAsync(courseId, ct);
        return GradingOperationResult.Ok("Grading activated. Course results have been calculated.");
    }

    public async Task<GradingOperationResult> OverrideGradeAsync(
        Guid courseId, Guid studentId, string? grade, string? reason, Guid actorId, string actorRole, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            return new GradingOperationResult(GradingError.ReasonRequired, "A reason is required to override a grade.");
        }

        var config = await _dbContext.CourseGradingConfigurations
            .Include(c => c.GradingPolicy!).ThenInclude(p => p.Bands)
            .FirstOrDefaultAsync(c => c.CourseId == courseId, ct);
        if (config == null || config.Status != GradingConfigurationStatus.Active)
        {
            return new GradingOperationResult(GradingError.NotConfigured, "Grading is not active for this course.");
        }

        var newGrade = string.IsNullOrWhiteSpace(grade) ? null : grade.Trim();
        if (newGrade != null && !config.GradingPolicy!.Bands.Any(b => b.Label == newGrade))
        {
            return new GradingOperationResult(GradingError.UnknownGrade,
                $"'{newGrade}' is not a grade in this course's grading scale.");
        }

        var result = await RecalculateAsync(courseId, studentId, ct);
        if (result == null)
        {
            return new GradingOperationResult(GradingError.ResultNotFound, "No course result exists for this student.");
        }

        var previous = result.EffectiveGrade;
        _dbContext.GradeOverrides.Add(new GradeOverride
        {
            CourseResult = result,
            ActorId = actorId,
            PreviousGrade = previous,
            NewGrade = newGrade,
            Reason = reason.Trim()
        });
        result.OverrideGrade = newGrade;
        result.UpdatedAt = DateTime.UtcNow;

        _auditLogWriter.AddEntry(actorId, actorRole, "CourseResult.Overridden", "CourseResult", result.Id.ToString(),
            new Dictionary<string, object?>
            {
                ["previousGrade"] = previous,
                ["newGrade"] = newGrade ?? result.CalculatedGrade
            });
        await _dbContext.SaveChangesAsync(ct);
        return GradingOperationResult.Ok(newGrade == null ? "Override removed." : $"Grade overridden to {newGrade}.");
    }

    private static List<string> ValidateWeights(IReadOnlyList<AssessmentWeightInput> weights, List<Assessment> courseAssessments)
    {
        var errors = new List<string>();
        var ids = courseAssessments.Select(a => a.Id).ToHashSet();
        if (weights.GroupBy(w => w.AssessmentId).Any(g => g.Count() > 1))
            errors.Add("Each assessment may appear only once.");

        foreach (var w in weights)
        {
            if (!ids.Contains(w.AssessmentId))
                errors.Add($"Assessment {w.AssessmentId} does not belong to this course.");
            if (w.WeightPercent.HasValue && (w.WeightPercent <= 0 || w.WeightPercent > FullWeight))
                errors.Add($"Weight for assessment {w.AssessmentId} must be greater than 0 and at most 100 (or empty to exclude it).");
        }
        return errors;
    }

    private async Task<GradingPolicy> ReplaceCoursePolicyAsync(
        Guid courseId, CourseGradingConfiguration config, IReadOnlyList<GradeBandInput> bands, CancellationToken ct)
    {
        var policy = await _dbContext.GradingPolicies.Include(p => p.Bands)
            .FirstOrDefaultAsync(p => p.CourseId == courseId, ct);
        if (policy == null)
        {
            policy = new GradingPolicy { CourseId = courseId, Name = "Course grading scale" };
            _dbContext.GradingPolicies.Add(policy);
        }
        else
        {
            _dbContext.GradeBands.RemoveRange(policy.Bands);
            policy.Bands.Clear();
        }

        foreach (var band in bands)
        {
            policy.Bands.Add(new GradeBand { Label = band.Label.Trim(), MinPercentage = band.MinPercentage });
        }
        policy.UpdatedAt = DateTime.UtcNow;
        return policy;
    }
}
