using System;
using System.Threading;
using System.Threading.Tasks;

namespace EduFlow.Core.Interfaces;

/// <summary>
/// Outcome of a payment check for one (course, student) pair.
/// </summary>
/// <param name="IsSatisfied">True when every required payment condition for this enrollment is met.</param>
/// <param name="Reason">Human readable explanation, surfaced to the student/instructor on failure.</param>
/// <param name="RequiresPayment">True when the course actually carries a price.</param>
public record PaymentVerificationResult(bool IsSatisfied, string Reason, bool RequiresPayment = false)
{
    public static PaymentVerificationResult NotRequired(string reason = "This course is free — no payment is required.")
        => new(true, reason, false);

    public static PaymentVerificationResult Satisfied(string reason = "Payment verified.")
        => new(true, reason, true);

    public static PaymentVerificationResult Unsatisfied(string reason, bool requiresPayment = true)
        => new(false, reason, requiresPayment);
}

/// <summary>
/// Seams the enrollment workflow through the platform's payment requirements.
///
/// Every enrollment approval path (self-service request + instructor approval) MUST call
/// <see cref="VerifyAsync"/> before an enrollment can become Active, so that adding a real
/// payment provider later can never be bypassed by the approval flow.
///
/// The platform currently ships <c>Course.IsFree</c> / <c>Course.Price</c> but no payment
/// provider; the default implementation therefore only clears free courses and refuses to
/// approve a priced course until a provider records a verified payment for the student.
/// </summary>
public interface IPaymentVerificationService
{
    Task<PaymentVerificationResult> VerifyAsync(Guid courseId, Guid studentId, CancellationToken ct = default);
}
