using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace EduFlow.Infrastructure.Services;

/// <summary>An uploaded file opened for streaming back to an authorized caller.</summary>
public sealed record StoredUpload(Stream Content, string ContentType, long? Length) : IAsyncDisposable
{
    public ValueTask DisposeAsync() => Content.DisposeAsync();
}

/// <summary>
/// Where course uploads live. Files are always addressed by their site-relative URL
/// (/uploads/{folder}/{file}), which is what the database stores, so switching backends
/// never requires a data migration.
/// </summary>
public interface IUploadStorage
{
    /// <summary>Stores a new upload and returns its site-relative URL.</summary>
    Task<string> SaveAsync(string folder, string fileName, Stream content, string contentType, CancellationToken ct = default);

    /// <summary>Opens a stored upload, or null when it is missing or the URL escapes the uploads area.</summary>
    Task<StoredUpload?> OpenAsync(string siteUrl, CancellationToken ct = default);

    /// <summary>
    /// What the AI agent should be given to read the file: an absolute disk path (local storage)
    /// or a private Blob URL the agent downloads with its own token. Null when the file is missing.
    /// </summary>
    Task<string?> ResolveForAiAsync(string? siteUrl, CancellationToken ct = default);
}

/// <summary>wwwroot/uploads on local disk: docker-compose, local dev and tests.</summary>
public class LocalUploadStorage : IUploadStorage
{
    private readonly string _webRoot;

    public LocalUploadStorage(string webRoot)
    {
        _webRoot = Path.GetFullPath(webRoot);
    }

    public async Task<string> SaveAsync(string folder, string fileName, Stream content, string contentType, CancellationToken ct = default)
    {
        var uploadDir = Path.GetFullPath(Path.Combine(_webRoot, "uploads", folder));
        var filePath = Path.GetFullPath(Path.Combine(uploadDir, fileName));
        if (!filePath.StartsWith(uploadDir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Invalid file path.", nameof(fileName));
        }

        Directory.CreateDirectory(uploadDir);
        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await content.CopyToAsync(stream, ct);
        }
        return $"/uploads/{folder}/{fileName}";
    }

    public Task<StoredUpload?> OpenAsync(string siteUrl, CancellationToken ct = default)
    {
        var path = ResolveUploadsFile(siteUrl);
        if (path == null) return Task.FromResult<StoredUpload?>(null);

        var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, useAsync: true);
        return Task.FromResult<StoredUpload?>(new StoredUpload(stream, UploadContentTypes.For(path), stream.Length));
    }

    public Task<string?> ResolveForAiAsync(string? siteUrl, CancellationToken ct = default)
    {
        return Task.FromResult(ResolveWebRootFile(siteUrl));
    }

    /// <summary>Physical path of a file under wwwroot/uploads, or null when missing or outside it.</summary>
    public string? ResolveUploadsFile(string? siteUrl)
    {
        var relative = UploadPaths.RelativeToUploads(siteUrl);
        if (relative == null) return null;

        var uploadsRoot = Path.Combine(_webRoot, "uploads");
        return ResolveUnder(uploadsRoot, relative);
    }

    /// <summary>Resolves a site-relative URL to a file inside wwwroot (no path traversal).</summary>
    private string? ResolveWebRootFile(string? siteUrl)
    {
        if (string.IsNullOrWhiteSpace(siteUrl)) return null;
        return ResolveUnder(_webRoot, siteUrl.TrimStart('/'));
    }

    private static string? ResolveUnder(string root, string relative)
    {
        var fullRoot = Path.GetFullPath(root);
        var candidate = Path.GetFullPath(Path.Combine(fullRoot, relative.Replace('/', Path.DirectorySeparatorChar)));
        var rootWithSeparator = fullRoot.EndsWith(Path.DirectorySeparatorChar) ? fullRoot : fullRoot + Path.DirectorySeparatorChar;
        if (!candidate.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase)) return null;
        return File.Exists(candidate) ? candidate : null;
    }
}

/// <summary>
/// Private Vercel Blob store, used on Vercel where the container disk is ephemeral and not
/// shared between instances. Talks to the Blob REST API directly (same calls as @vercel/blob).
/// A site URL /uploads/pdfs/x.pdf maps to the blob pathname uploads/pdfs/x.pdf.
/// </summary>
public class VercelBlobUploadStorage : IUploadStorage
{
    private const string ApiUrl = "https://vercel.com/api/blob";
    private const string ApiVersion = "12";

    private readonly HttpClient _httpClient;
    private readonly string _token;
    private readonly string _storeId;
    private readonly ILogger<VercelBlobUploadStorage>? _logger;

    public VercelBlobUploadStorage(HttpClient httpClient, string token, ILogger<VercelBlobUploadStorage>? logger = null)
    {
        _httpClient = httpClient;
        _token = token;
        _storeId = StoreIdFromToken(token);
        _logger = logger;
    }

    /// <summary>BLOB_READ_WRITE_TOKEN is vercel_blob_rw_{storeId}_{secret}.</summary>
    public static string StoreIdFromToken(string token)
    {
        var parts = token.Split('_');
        if (parts.Length < 5 || string.IsNullOrWhiteSpace(parts[3]))
        {
            throw new ArgumentException("BLOB_READ_WRITE_TOKEN is not a valid Vercel Blob read-write token.");
        }
        return parts[3];
    }

    public async Task<string> SaveAsync(string folder, string fileName, Stream content, string contentType, CancellationToken ct = default)
    {
        var pathname = $"uploads/{folder}/{fileName}";
        using var request = new HttpRequestMessage(HttpMethod.Put, $"{ApiUrl}/?pathname={Uri.EscapeDataString(pathname)}")
        {
            Content = new StreamContent(content)
        };
        AddApiHeaders(request);
        request.Headers.Add("x-vercel-blob-access", "private");
        request.Headers.Add("x-content-type", string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType);
        request.Headers.Add("x-add-random-suffix", "0");
        request.Headers.Add("x-allow-overwrite", "1");
        if (content.CanSeek)
        {
            request.Headers.Add("x-content-length", content.Length.ToString());
        }

        using var response = await _httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger?.LogError("blob_upload failed status={Status} body={Body}", (int)response.StatusCode, body);
            throw new IOException($"Blob upload failed with HTTP {(int)response.StatusCode}.");
        }

        return "/" + pathname;
    }

    public async Task<StoredUpload?> OpenAsync(string siteUrl, CancellationToken ct = default)
    {
        var blobUrl = BlobUrlFor(siteUrl);
        if (blobUrl == null) return null;

        var request = new HttpRequestMessage(HttpMethod.Get, blobUrl + "?cache=0");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode != HttpStatusCode.NotFound)
            {
                _logger?.LogWarning("blob_download failed status={Status}", (int)response.StatusCode);
            }
            response.Dispose();
            request.Dispose();
            return null;
        }

        var stream = await response.Content.ReadAsStreamAsync(ct);
        var contentType = response.Content.Headers.ContentType?.MediaType ?? UploadContentTypes.For(siteUrl);
        return new StoredUpload(new OwningStream(stream, response, request), contentType, response.Content.Headers.ContentLength);
    }

    public async Task<string?> ResolveForAiAsync(string? siteUrl, CancellationToken ct = default)
    {
        var blobUrl = BlobUrlFor(siteUrl);
        if (blobUrl == null) return null;

        using var request = new HttpRequestMessage(HttpMethod.Head, blobUrl + "?cache=0");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        try
        {
            using var response = await _httpClient.SendAsync(request, ct);
            if (response.StatusCode == HttpStatusCode.NotFound) return null;
        }
        catch (HttpRequestException ex)
        {
            // Let the agent try anyway; it reports a missing file itself.
            _logger?.LogWarning(ex, "blob_head failed");
        }
        return blobUrl;
    }

    private string? BlobUrlFor(string? siteUrl)
    {
        var relative = UploadPaths.RelativeToUploads(siteUrl);
        if (relative == null) return null;
        var escaped = string.Join('/', relative.Split('/').Select(Uri.EscapeDataString));
        return $"https://{_storeId}.private.blob.vercel-storage.com/uploads/{escaped}";
    }

    private void AddApiHeaders(HttpRequestMessage request)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);
        request.Headers.Add("x-api-version", ApiVersion);
    }

    /// <summary>Keeps the HTTP response alive until the caller finishes streaming the body.</summary>
    private sealed class OwningStream : Stream
    {
        private readonly Stream _inner;
        private readonly IDisposable[] _owned;

        public OwningStream(Stream inner, params IDisposable[] owned)
        {
            _inner = inner;
            _owned = owned;
        }

        public override bool CanRead => _inner.CanRead;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
        public override void Flush() { }
        public override int Read(byte[] buffer, int offset, int count) => _inner.Read(buffer, offset, count);
        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken ct) => _inner.ReadAsync(buffer, offset, count, ct);
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken ct = default) => _inner.ReadAsync(buffer, ct);
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _inner.Dispose();
                foreach (var d in _owned) d.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}

internal static class UploadPaths
{
    /// <summary>
    /// "/uploads/pdfs/x.pdf" or "pdfs/x.pdf" → "pdfs/x.pdf"; null for empty input, other roots,
    /// or any ".." / backslash segment so a URL can never point outside the uploads area.
    /// </summary>
    public static string? RelativeToUploads(string? siteUrl)
    {
        if (string.IsNullOrWhiteSpace(siteUrl)) return null;
        var path = siteUrl.Trim().TrimStart('/');
        if (path.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
        {
            path = path["uploads/".Length..];
        }
        if (path.Length == 0 || path.Contains('\\') || path.Contains(':')) return null;
        foreach (var segment in path.Split('/'))
        {
            if (segment.Length == 0 || segment == "." || segment == "..") return null;
        }
        return path;
    }
}

internal static class UploadContentTypes
{
    public static string For(string path) => Path.GetExtension(path).ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf",
        ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".ppt" => "application/vnd.ms-powerpoint",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc" => "application/msword",
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".svg" => "image/svg+xml",
        ".txt" => "text/plain",
        _ => "application/octet-stream"
    };
}
