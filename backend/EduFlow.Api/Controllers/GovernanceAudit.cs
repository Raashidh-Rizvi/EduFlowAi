using System.Security.Claims;
using EduFlow.Core.Entities;
using EduFlow.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduFlow.Api.Controllers;

internal static class GovernanceAudit
{
    // Call only after the operation's existing authorization and validation gates.
    internal static void Record(this ControllerBase controller, IAuditLogWriter writer,
        string action, Guid resourceId, IReadOnlyDictionary<string, object?>? metadata = null)
    {
        var identity = controller.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? controller.User.FindFirstValue("uid");
        if (!Guid.TryParse(identity, out var actorId) || actorId == Guid.Empty)
            throw new UnauthorizedAccessException("A valid authenticated audit actor is required.");
        writer.AddEntry(actorId, controller.User.FindFirstValue(ClaimTypes.Role), action,
            action.Split('.')[0], resourceId.ToString("D"), metadata);
    }

    internal static void RecordEnrollment(this ControllerBase controller, IAuditLogWriter writer,
        string action, Enrollment enrollment) => controller.Record(writer, action, enrollment.Id,
            new Dictionary<string, object?>
            {
                ["courseId"] = enrollment.CourseId.ToString("D"),
                ["studentId"] = enrollment.StudentId.ToString("D")
            });
}
