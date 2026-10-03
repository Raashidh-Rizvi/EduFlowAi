using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using EduFlow.Infrastructure.Data;
using EduFlow.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduFlow.Api.Controllers;

/// <summary>
/// Frontend-facing AI surface: provider configuration health, document ingestion
/// status, and manual re-indexing. Responses NEVER contain credentials — only
/// provider names, configured flags and model allowlists.
/// </summary>
[Authorize]
[Route("api/ai")]
public class AiController : BaseApiController
{
    private readonly IAiGatewayClient _aiGatewayClient;
    private readonly IWebHostEnvironment? _environment;

    public AiController(
        ApplicationDbContext dbContext,
        IAiGatewayClient aiGatewayClient,
        IWebHostEnvironment? environment = null)
        : base(dbContext)
    {
        _aiGatewayClient = aiGatewayClient;
        _environment = environment;
    }

    /// <summary>
    /// GET /api/ai/providers — per-provider configuration status (gemini/groq/azure).
    /// The frontend uses this to grey out providers that cannot generate quizzes yet.
    /// Never returns API keys, endpoints or any other secret.
    /// </summary>
    [HttpGet("providers")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetProviders()
    {
        var response = await _aiGatewayClient.GetAiProvidersAsync();
        if (response.StatusCode < 200 || response.StatusCode > 299)
        {
            return StatusCode(503, new
            {
                status = "error",
                code = "AI_PROVIDER_UNAVAILABLE",
                message = "The AI service is unavailable, so provider status cannot be checked right now. Please try again shortly.",
                detail = "The AI service is unavailable.",
                requestId = HttpContext.TraceIdentifier,
                traceId = HttpContext.TraceIdentifier
            });
        }
        return Content(response.Body, "application/json");
    }

    /// <summary>
    /// GET /api/ai/documents/status?fileUrl=/uploads/pdfs/lecture.pdf — ingestion state
    /// (UPLOADED | PROCESSING | READY | FAILED) plus embedding metadata so a changed
    /// embedding model surfaces as reindexRecommended instead of silent vector mixing.
    /// </summary>
    [HttpGet("documents/status")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetDocumentStatus([FromQuery] string? fileUrl)
    {
        if (string.IsNullOrWhiteSpace(fileUrl))
        {
            return BadRequest(new { code = "BAD_REQUEST", message = "The fileUrl query parameter is required." });
        }

        var fileName = Path.GetFileName(fileUrl.Replace('/', Path.DirectorySeparatorChar));
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return BadRequest(new { code = "BAD_REQUEST", message = "The fileUrl query parameter is invalid." });
        }

        var response = await _aiGatewayClient.GetDocumentStatusAsync(fileName);
        if (response.StatusCode < 200 || response.StatusCode > 299)
        {
            return StatusCode(503, new
            {
                status = "error",
                code = "AI_PROVIDER_UNAVAILABLE",
                message = "The AI service is unavailable, so document status cannot be checked right now. Please try again shortly.",
                detail = "The AI service is unavailable.",
                requestId = HttpContext.TraceIdentifier,
                traceId = HttpContext.TraceIdentifier
            });
        }
        return Content(response.Body, "application/json");
    }

    /// <summary>
    /// POST /api/ai/documents/index — (re-)index a module's course document into the
    /// vector store. This is the re-index mechanism for embedding-model changes.
    /// Ownership: only the course's instructor or an admin may trigger it.
    /// </summary>
    [HttpPost("documents/index")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> IndexDocument([FromBody] IndexDocumentRequest request)
    {
        var module = await DbContext.Modules.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == request.ModuleId);
        if (module == null)
        {
            return NotFound(new { code = "NOT_FOUND", message = "Module not found." });
        }

        var (userId, role) = GetCurrentUser();
        bool isAdmin = role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        bool isOwner = isAdmin || await DbContext.Courses.AnyAsync(
            c => c.Id == module.CourseId && c.InstructorId == userId);
        if (!isOwner)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.FileUrl))
        {
            return BadRequest(new { code = "BAD_REQUEST", message = "The fileUrl field is required." });
        }

        var physicalPath = ResolveWebRootFile(request.FileUrl);
        if (physicalPath == null)
        {
            return NotFound(new
            {
                code = "FILE_NOT_FOUND",
                message = "The course document was not found on disk. Please upload it again."
            });
        }

        var result = await _aiGatewayClient.IndexDocumentAsync(new
        {
            file_path = physicalPath,
            course_id = module.CourseId.ToString(),
            module_id = module.Id.ToString()
        });

        if (result.StatusCode >= 500)
        {
            return StatusCode(503, new
            {
                status = "error",
                code = "AI_PROVIDER_UNAVAILABLE",
                message = "The AI service is unavailable, so the document could not be indexed right now. Please try again shortly.",
                detail = "The AI service is unavailable.",
                requestId = HttpContext.TraceIdentifier,
                traceId = HttpContext.TraceIdentifier
            });
        }
        return Content(result.Body, "application/json");
    }

    /// <summary>Resolves a site-relative URL to a file inside wwwroot (no path traversal).</summary>
    private string? ResolveWebRootFile(string? relativeUrl)
    {
        if (string.IsNullOrWhiteSpace(relativeUrl))
        {
            return null;
        }

        var webRoot = Path.GetFullPath(_environment?.WebRootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot"));
        var candidate = Path.GetFullPath(Path.Combine(webRoot,
            relativeUrl.Replace("uploads/", "uploads" + Path.DirectorySeparatorChar)
                       .TrimStart('/')
                       .Replace('/', Path.DirectorySeparatorChar)));

        var rootWithSeparator = webRoot.EndsWith(Path.DirectorySeparatorChar)
            ? webRoot
            : webRoot + Path.DirectorySeparatorChar;
        if (!candidate.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return System.IO.File.Exists(candidate) ? candidate : null;
    }
}

/// <param name="ModuleId">Module whose stored document should be (re-)indexed.</param>
/// <param name="FileUrl">Site-relative URL of the document, e.g. /uploads/pdfs/x.pdf.</param>
public record IndexDocumentRequest(Guid ModuleId, string FileUrl);
