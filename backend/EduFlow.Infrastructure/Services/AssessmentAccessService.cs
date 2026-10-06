using System;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Entities;
using EduFlow.Core.Enums;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

public class AssessmentAccessService : IAssessmentAccessService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IPaymentVerificationService _paymentVerificationService;

    public AssessmentAccessService(ApplicationDbContext dbContext, IPaymentVerificationService paymentVerificationService)
    {
        _dbContext = dbContext;
        _paymentVerificationService = paymentVerificationService;
    }

    public async Task<bool> CanManageCourseAsync(Guid courseId, Guid userId, string role, CancellationToken ct = default)
    {
        if (userId == Guid.Empty) return false;
        if (string.Equals(role, nameof(UserRole.Admin), StringComparison.OrdinalIgnoreCase)) return true;
        return await _dbContext.Courses.AnyAsync(c => c.Id == courseId && c.InstructorId == userId, ct);
    }

    public async Task<bool> HasLearnerAccessAsync(Guid courseId, Guid userId, string role, CancellationToken ct = default)
    {
        if (userId == Guid.Empty) return false;
        if (await CanManageCourseAsync(courseId, userId, role, ct)) return true;
        return await IsActivelyEnrolledAsync(courseId, userId, ct);
    }

    public async Task<AttemptEligibility> CheckAttemptEligibilityAsync(
        Assessment assessment, Guid studentId, bool startsNewAttempt = true, CancellationToken ct = default)
    {
        int attemptsUsed = await _dbContext.Submissions
            .CountAsync(s => s.AssessmentId == assessment.Id && s.StudentId == studentId
                && s.Status != AttemptStatus.Cancelled, ct);
        int attemptsAllowed = assessment.AttemptsAllowed;

        AttemptEligibility Deny(AttemptDenialReason reason, string message)
            => new(reason, message, attemptsUsed, attemptsAllowed);

        if (!await IsActivelyEnrolledAsync(assessment.CourseId, studentId, ct))
        {
            return Deny(AttemptDenialReason.NotEnrolled, "You must be enrolled in this course to attempt its assessments.");
        }

        if (assessment.Status != QuizStatus.Published)
        {
            return Deny(AttemptDenialReason.NotPublished, "This assessment is not open for attempts.");
        }

        if (assessment.DueDate.HasValue && assessment.DueDate.Value < DateTime.UtcNow)
        {
            return Deny(AttemptDenialReason.Closed, "The availability window for this assessment has closed.");
        }

        if (startsNewAttempt && attemptsAllowed > 0 && attemptsUsed >= attemptsAllowed)
        {
            return Deny(AttemptDenialReason.AttemptLimitReached,
                $"You have used all {attemptsAllowed} permitted attempt(s) for this assessment.");
        }

        return new AttemptEligibility(AttemptDenialReason.None, string.Empty, attemptsUsed, attemptsAllowed);
    }

    private async Task<bool> IsActivelyEnrolledAsync(Guid courseId, Guid studentId, CancellationToken ct)
    {
        var enrollment = await _dbContext.Enrollments.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId, ct);
        if (enrollment == null || !enrollment.Status.GrantsAccess()) return false;

        return (await _paymentVerificationService.VerifyAsync(courseId, studentId, ct)).IsSatisfied;
    }
}
