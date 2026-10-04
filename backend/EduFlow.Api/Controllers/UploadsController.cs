using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using EduFlow.Core.Enums;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

/// <summary>
/// Serves uploaded course material (IUploadStorage: wwwroot/uploads or Vercel Blob) behind authorization. Program.cs excludes
/// /uploads from the static-file middleware so these files are only reachable through here.
///
/// Access rule for a file referenced by a Module or ContentItem PdfUrl (the legacy Lesson table is not read):
/// Admin, the owning instructor, or a student with an Active/Completed enrollment in the course.
/// Files not (yet) attached to any course material are visible to Instructors and Admins only,
/// so an instructor can preview an upload before saving the module.
/// </summary>
[Authorize]
[Route("uploads")]
public class UploadsController : BaseApiController
{
    private static readonly FileExtensionContentTypeProvider ContentTypes = new();
    private readonly IUploadStorage _storage;

    public UploadsController(ApplicationDbContext dbContext, IWebHostEnvironment environment, IUploadStorage? storage = null)
        : base(dbContext)
    {
        _storage = storage ?? new LocalUploadStorage(environment.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot"));
    }

    [HttpGet("{**path}")]
    public async Task<IActionResult> Get(string path)
    {
        var notFound = NotFound(new { success = false, message = "File not found.", code = "FILE_NOT_FOUND" });
        if (string.IsNullOrWhiteSpace(path)) return notFound;

        var url = "/uploads/" + path.TrimStart('/');
        // 404 rather than 403 so the endpoint does not confirm which files exist.
        if (!await CanReadAsync(url)) return notFound;

        Response.Headers.CacheControl = "private, no-store";

        if (_storage is LocalUploadStorage local)
        {
            var physicalPath = local.ResolveUploadsFile(url);
            if (physicalPath == null) return notFound;
            if (!ContentTypes.TryGetContentType(physicalPath, out var contentType))
            {
                contentType = "application/octet-stream";
            }
            return PhysicalFile(physicalPath, contentType, enableRangeProcessing: true);
        }

        var stored = await _storage.OpenAsync(url, HttpContext.RequestAborted);
        if (stored == null) return notFound;
        // FileStreamResult disposes the stream (and the underlying Blob response) when done.
        return File(stored.Content, stored.ContentType);
    }

    private async Task<bool> CanReadAsync(string url)
    {
        var (userId, role) = GetCurrentUser();
        if (role.Equals("Admin", StringComparison.OrdinalIgnoreCase)) return true;
        if (userId == Guid.Empty) return false;

        var moduleIds = DbContext.Modules.Where(m => m.PdfUrl == url).Select(m => m.Id)
            .Concat(DbContext.ContentItems.Where(c => c.PdfUrl == url).Select(c => c.ModuleId));

        var courseIds = await DbContext.Modules.AsNoTracking()
            .Where(m => moduleIds.Contains(m.Id))
            .Select(m => m.CourseId)
            .Distinct()
            .ToListAsync();

        if (courseIds.Count == 0)
        {
            return role.Equals("Instructor", StringComparison.OrdinalIgnoreCase);
        }

        if (await DbContext.Courses.AnyAsync(c => courseIds.Contains(c.Id) && c.InstructorId == userId))
        {
            return true;
        }

        return await DbContext.Enrollments.AnyAsync(e =>
            e.StudentId == userId &&
            courseIds.Contains(e.CourseId) &&
            (e.Status == EnrollmentStatus.Active || e.Status == EnrollmentStatus.Completed));
    }
}
