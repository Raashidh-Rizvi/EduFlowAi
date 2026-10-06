using System;
using System.Threading;
using System.Threading.Tasks;
using EduFlow.Core.Interfaces;
using EduFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Infrastructure.Services;

/// <summary>
/// Default payment gate for the enrollment workflow.
///
/// Free courses (the platform default) always clear. A priced course requires a verified
/// payment record before an enrollment request may be created or approved — and because
/// this build ships no payment provider, a priced course deliberately fails closed rather
/// than letting enrollment approval bypass a payment requirement.
///
/// When a payment provider is introduced, replace this registration in Program.cs with an
/// implementation that checks the provider's captured/verified payments. The approval
/// endpoints only ever depend on <see cref="IPaymentVerificationService"/>.
/// </summary>
public sealed class PaymentVerificationService : IPaymentVerificationService
{
    private readonly ApplicationDbContext _db;

    public PaymentVerificationService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<PaymentVerificationResult> VerifyAsync(Guid courseId, Guid studentId, CancellationToken ct = default)
    {
        var course = await _db.Courses.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == courseId, ct);

        if (course == null)
        {
            return PaymentVerificationResult.Unsatisfied("Course not found.", requiresPayment: false);
        }

        if (course.IsFree || course.Price <= 0m)
        {
            return PaymentVerificationResult.NotRequired();
        }

        // No payment subsystem exists yet, so no paid enrollment can ever be verified here.
        // Fail closed: approval must never wave a priced course through unverified.
        return PaymentVerificationResult.Unsatisfied(
            $"Payment required: '{course.Title}' is priced at {course.Price:0.##}. " +
            "Enrollment cannot be approved until payment verification is available.");
    }

    private sealed class FreeCoursePaymentGate : IPaymentVerificationService
    {
        public Task<PaymentVerificationResult> VerifyAsync(Guid courseId, Guid studentId, CancellationToken ct = default)
            => Task.FromResult(PaymentVerificationResult.NotRequired());
    }
}
