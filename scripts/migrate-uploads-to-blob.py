"""
Copies local course uploads (backend/EduFlow.Api/wwwroot/uploads) into the private Vercel Blob store.

Files keep their pathname (uploads/pdfs/x.pdf), which is exactly where VercelBlobUploadStorage looks
for a "/uploads/pdfs/x.pdf" URL, so existing database rows work on Vercel without re-uploading.

Usage (token from the env, or from the git-ignored .env.production.local):
    python scripts/migrate-uploads-to-blob.py [--dry-run]
"""
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS = os.path.join(ROOT, "backend", "EduFlow.Api", "wwwroot", "uploads")
API_URL = "https://vercel.com/api/blob"
API_VERSION = "12"


def load_token() -> str:
    token = os.environ.get("BLOB_READ_WRITE_TOKEN", "").strip()
    env_file = os.path.join(ROOT, ".env.production.local")
    if not token and os.path.exists(env_file):
        with open(env_file, encoding="utf-8") as f:
            for line in f:
                if line.startswith("BLOB_READ_WRITE_TOKEN="):
                    token = line.split("=", 1)[1].strip().strip('"')
    parts = token.split("_")
    if not token.startswith("vercel_blob_rw_") or len(parts) < 5 or not parts[3]:
        sys.exit("BLOB_READ_WRITE_TOKEN is missing or not a valid Vercel Blob read-write token.")
    return token


def upload(token: str, pathname: str, path: str) -> None:
    with open(path, "rb") as f:
        data = f.read()
    request = urllib.request.Request(
        f"{API_URL}/?pathname={urllib.parse.quote(pathname, safe='')}",
        data=data,
        method="PUT",
        headers={
            "Authorization": f"Bearer {token}",
            "x-api-version": API_VERSION,
            "x-vercel-blob-access": "private",
            "x-content-type": mimetypes.guess_type(path)[0] or "application/octet-stream",
            "x-add-random-suffix": "0",
            "x-allow-overwrite": "1",
            "x-content-length": str(len(data)),
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        response.read()


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    token = "" if dry_run else load_token()
    failures = 0
    for dirpath, _, files in os.walk(UPLOADS):
        for name in sorted(files):
            path = os.path.join(dirpath, name)
            pathname = "uploads/" + os.path.relpath(path, UPLOADS).replace(os.sep, "/")
            if dry_run:
                print(f"would upload {pathname}")
                continue
            try:
                upload(token, pathname, path)
                print(f"uploaded {pathname}")
            except urllib.error.HTTPError as e:
                failures += 1
                print(f"FAILED {pathname}: HTTP {e.code} {e.read().decode(errors='replace')[:200]}")
    if failures:
        sys.exit(f"{failures} file(s) failed.")


if __name__ == "__main__":
    main()
