"""
Regression tests for the AI service's internal-only surface:
shared-token auth, upload-path restriction, CORS origin list and generic error bodies.
"""

import os

import pytest
from fastapi.testclient import TestClient

import main as main_module
from main import app

from tests.conftest import TEST_INTERNAL_TOKEN, TESTS_DIR

HEADER = "X-Internal-Api-Key"


def _client_without_token() -> TestClient:
    client = TestClient(app)
    client.headers.pop(HEADER, None)
    return client


def _assert_contract(res, status, code):
    assert res.status_code == status
    body = res.json()
    assert body["success"] is False
    assert body["code"] == code
    assert body["message"]
    assert "errors" in body and "traceId" in body


def test_health_is_open_without_token():
    assert _client_without_token().get("/health").status_code == 200


@pytest.mark.parametrize("headers", [{}, {HEADER: "wrong-token"}, {HEADER: ""}])
def test_missing_or_wrong_token_is_rejected(headers):
    client = _client_without_token()
    res = client.get("/api/v1/ai/status", headers=headers)
    _assert_contract(res, 401, "INTERNAL_AUTH_FAILED")
    assert TEST_INTERNAL_TOKEN not in res.text


def test_every_non_health_route_requires_token():
    client = _client_without_token()
    for route in app.routes:
        path = getattr(route, "path", "")
        methods = getattr(route, "methods", None) or set()
        if not path.startswith("/api/") and path != "/ai-coach-chat":
            continue
        method = "GET" if "GET" in methods else "POST"
        url = path.replace("{question_id}", "q1")
        res = client.request(method, url, json={})
        assert res.status_code == 401, f"{method} {path} returned {res.status_code}"


def test_unconfigured_token_fails_closed(monkeypatch):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    res = TestClient(app).get("/api/v1/ai/status")
    _assert_contract(res, 503, "INTERNAL_AUTH_NOT_CONFIGURED")


def test_unconfigured_token_with_fail_open_flag_allows_call(monkeypatch):
    monkeypatch.delenv("INTERNAL_SERVICE_TOKEN", raising=False)
    monkeypatch.setenv("INTERNAL_AUTH_FAIL_OPEN", "true")
    assert _client_without_token().get("/api/v1/ai/status").status_code == 200


def test_file_path_outside_uploads_root_is_rejected():
    outside = os.path.abspath(os.path.join(TESTS_DIR, "..", "main.py"))
    client = TestClient(app)
    res = client.post("/api/v1/rag/index-pdf",
                      json={"file_path": outside, "course_id": "c", "module_id": "m"})
    assert res.status_code == 400
    assert outside not in res.text

    res = client.post("/api/v1/ai/slides/categorize-topics", json={"slide_path": outside})
    assert res.status_code == 400


def test_traversal_out_of_uploads_root_is_rejected():
    sneaky = os.path.join(TESTS_DIR, "..", "..", "backend", "EduFlow.Api", "appsettings.json")
    res = TestClient(app).post("/api/v1/ai/slides/categorize-topics", json={"slide_path": sneaky})
    assert res.status_code == 400


def test_cors_does_not_echo_unknown_origin():
    res = TestClient(app).options(
        "/api/v1/ai/status",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert res.headers.get("access-control-allow-origin") not in ("https://evil.example", "*")


def test_cors_allows_configured_dev_origin():
    origin = main_module._allowed_origins()[0]
    res = TestClient(app).options(
        "/api/v1/ai/status",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )
    assert res.headers.get("access-control-allow-origin") == origin


def test_internal_failure_does_not_leak_exception_text(monkeypatch):
    secret = r"Traceback C:\srv\secret\db.py password=hunter2"

    def boom(*_args, **_kwargs):
        raise RuntimeError(secret)

    monkeypatch.setattr(main_module.learning_agent, "chat", boom)
    res = TestClient(app).post("/api/v1/rag/chat", json={"question": "q", "course_id": "c"})
    assert res.status_code == 500
    assert "hunter2" not in res.text
    assert "secret" not in res.text


def test_blob_url_from_another_host_is_rejected(monkeypatch):
    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_mystore_secretpart")
    client = TestClient(app)
    for url in (
        "https://evil.example.com/uploads/pdfs/a.pdf",
        "https://otherstore.private.blob.vercel-storage.com/uploads/pdfs/a.pdf",
        "http://mystore.private.blob.vercel-storage.com/uploads/pdfs/a.pdf",
        "https://mystore.private.blob.vercel-storage.com/secrets/a.pdf",
    ):
        res = client.post("/api/v1/ai/slides/categorize-topics", json={"slide_path": url})
        assert res.status_code == 400, url


def test_blob_url_without_configured_store_is_rejected(monkeypatch):
    monkeypatch.delenv("BLOB_READ_WRITE_TOKEN", raising=False)
    res = TestClient(app).post("/api/v1/ai/slides/categorize-topics",
                               json={"slide_path": "https://mystore.private.blob.vercel-storage.com/uploads/pdfs/a.pdf"})
    assert res.status_code == 400


def test_blob_url_is_downloaded_with_store_token(monkeypatch, tmp_path):
    import main

    monkeypatch.setenv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_mystore_secretpart")
    monkeypatch.setenv("BLOB_CACHE_DIR", str(tmp_path))
    seen = {}

    class FakeResponse:
        status_code = 200
        def raise_for_status(self): pass
        def iter_bytes(self): yield b"%PDF-1.4 test"
        def __enter__(self): return self
        def __exit__(self, *a): return False

    def fake_stream(method, url, params=None, headers=None, **kwargs):
        seen.update(url=url, auth=headers.get("Authorization"))
        return FakeResponse()

    monkeypatch.setattr(main.httpx, "stream", fake_stream)
    local = main.require_upload_path(
        "https://mystore.private.blob.vercel-storage.com/uploads/pdfs/abc_Week%201.pdf")
    assert os.path.basename(local) == "abc_Week 1.pdf"
    assert open(local, "rb").read() == b"%PDF-1.4 test"
    assert seen["url"] == "https://mystore.private.blob.vercel-storage.com/uploads/pdfs/abc_Week%201.pdf"
    assert seen["auth"] == "Bearer vercel_blob_rw_mystore_secretpart"
