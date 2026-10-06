"""
Shared test setup for the AI service.

main.py enforces X-Internal-Api-Key on every route except /health and restricts file paths to
UPLOADS_ROOT. Both are read from the environment per request, so an autouse fixture pins them to
test values here (after main's load_dotenv(override=True) has run at import time), and every
TestClient sends the test token by default. Tests that check rejection remove or replace the header.
"""

import os

import pytest
from starlette.testclient import TestClient

TEST_INTERNAL_TOKEN = "pytest-internal-service-token"
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))

_original_init = TestClient.__init__


def _init_with_internal_token(self, *args, **kwargs):
    _original_init(self, *args, **kwargs)
    self.headers.setdefault("X-Internal-Api-Key", TEST_INTERNAL_TOKEN)


TestClient.__init__ = _init_with_internal_token


@pytest.fixture(autouse=True)
def internal_service_env(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", TEST_INTERNAL_TOKEN)
    monkeypatch.delenv("INTERNAL_AUTH_FAIL_OPEN", raising=False)
    monkeypatch.setenv("UPLOADS_ROOT", TESTS_DIR)
