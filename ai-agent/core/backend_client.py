"""
===============================================================================
EduFlow AI - .NET Backend Client (Internal AI-Tools Gateway)
===============================================================================
This module is a thin HTTP client wrapping the internal `/internal/ai-tools/*`
endpoints exposed by the EduFlow .NET backend (EduFlow.Api). AI agent tool
handlers (tools/registry.py) call through these functions instead of talking
to `requests` directly, so:

1. Endpoint Contracts Live In One Place:
   - Every exact path, query-string shape, and header lives here once, so
     `tools/registry.py` handlers stay focused on reshaping data, not on HTTP
     plumbing.
2. Consistent Resilience:
   - Every call is wrapped with the shared `retry_with_backoff` decorator
     (`core.retry`), so transient network blips/5xx responses are retried
     with exponential backoff and jitter, matching the same resilience
     posture as `core.llm`.
3. Fail Loud, Not Silent:
   - On failure after retries (connection error, timeout, non-2xx status),
     this module raises `ToolUnavailable` rather than returning `None`.
   - It is the CALLER's (tools/registry.py) responsibility to catch that and
     fall back to degraded/hardcoded data -- this module never silently
     swallows a failure.

Auth:
   - `INTERNAL_SERVICE_TOKEN` may be unset in local dev/CI (matches the .NET
     side's "empty = auth disabled" behavior, see core/internal_auth.py).
   - When set, every request sends it as the `X-Internal-Api-Key` header.
     When unset, the header is omitted entirely rather than sent empty.
"""

# Import os to read EDUFLOW_BACKEND_URL / INTERNAL_SERVICE_TOKEN from the environment
import os
# Import logging for warnings on retryable failures
import logging
# Import typing annotations for request params and JSON response shapes
from typing import Any, Dict, Optional

# Import requests for the actual HTTP calls (already in requirements.txt)
import requests

# Import our standardized retryable-tool-failure exception and shared retry decorator
from core.errors import ToolUnavailable
from core.retry import retry_with_backoff

# Module-level logger
logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
# Base URL of the .NET EduFlow.Api backend. Read fresh at call time (not cached
# at import time) so environment changes are picked up without a process restart.
def _get_base_url() -> str:
    return os.environ.get("EDUFLOW_BACKEND_URL", "http://localhost:5204")


def _get_internal_token() -> Optional[str]:
    return os.environ.get("INTERNAL_SERVICE_TOKEN")


# Short timeout so a stalled backend never blocks an agent turn for long.
_REQUEST_TIMEOUT_SECONDS = 5


def _build_headers() -> Dict[str, str]:
    """
    Builds the outbound request headers, including the shared-secret internal
    service token header only when INTERNAL_SERVICE_TOKEN is configured.
    """
    headers = {"Accept": "application/json"}
    token = _get_internal_token()
    if token:
        headers["X-Internal-Api-Key"] = token
    return headers


def _get(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Performs a single GET request against the .NET backend and returns the
    parsed JSON body.

    Raises:
        ToolUnavailable: On connection error, timeout, or non-2xx status.
    """
    url = f"{_get_base_url()}{path}"
    try:
        response = requests.get(
            url,
            params=params,
            headers=_build_headers(),
            timeout=_REQUEST_TIMEOUT_SECONDS
        )
    except requests.exceptions.Timeout as e:
        raise ToolUnavailable(
            f"Timed out calling EduFlow backend at {url}",
            details={"url": url, "params": params, "error": str(e)}
        ) from e
    except requests.exceptions.ConnectionError as e:
        raise ToolUnavailable(
            f"Could not connect to EduFlow backend at {url}",
            details={"url": url, "params": params, "error": str(e)}
        ) from e
    except requests.exceptions.RequestException as e:
        raise ToolUnavailable(
            f"Request to EduFlow backend at {url} failed",
            details={"url": url, "params": params, "error": str(e)}
        ) from e

    if not (200 <= response.status_code < 300):
        raise ToolUnavailable(
            f"EduFlow backend returned HTTP {response.status_code} for {url}",
            details={"url": url, "params": params, "status_code": response.status_code, "body": response.text[:500]}
        )

    try:
        return response.json()
    except ValueError as e:
        raise ToolUnavailable(
            f"EduFlow backend returned non-JSON response for {url}",
            details={"url": url, "params": params, "error": str(e)}
        ) from e


@retry_with_backoff()
def _get_with_retry(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Retry-wrapped GET. `ToolUnavailable` is `is_retryable=True` by default."""
    return _get(path, params)


# -----------------------------------------------------------------------------
# Public Endpoint Wrappers
# -----------------------------------------------------------------------------

def get_curriculum_hierarchy(course_id: str) -> Dict[str, Any]:
    """
    GET {base}/internal/ai-tools/curriculum/hierarchy?courseId={course_id}

    Retrieves the full Course -> Module -> Topic -> Content Item hierarchy.
    """
    return _get_with_retry(
        "/internal/ai-tools/curriculum/hierarchy",
        params={"courseId": course_id}
    )


def get_content_by_scope(scope_type: str, scope_id: str) -> Dict[str, Any]:
    """
    GET {base}/internal/ai-tools/curriculum/content?scopeType={scope_type}&scopeId={scope_id}

    Retrieves grounded learning content/excerpts for the given scope.
    """
    return _get_with_retry(
        "/internal/ai-tools/curriculum/content",
        params={"scopeType": scope_type, "scopeId": scope_id}
    )


def get_existing_questions(scope_id: str) -> Dict[str, Any]:
    """
    GET {base}/internal/ai-tools/assessments/existing-questions?scopeId={scope_id}

    Retrieves existing questions in scope for duplicate detection.
    """
    return _get_with_retry(
        "/internal/ai-tools/assessments/existing-questions",
        params={"scopeId": scope_id}
    )


def get_student_progress(student_id: str) -> Dict[str, Any]:
    """
    GET {base}/internal/ai-tools/students/{student_id}/progress

    Retrieves a student's lesson completions, time-on-task, and active streak.
    """
    return _get_with_retry(f"/internal/ai-tools/students/{student_id}/progress")


def get_student_quiz_results(student_id: str) -> Dict[str, Any]:
    """
    GET {base}/internal/ai-tools/students/{student_id}/quiz-results

    Retrieves a student's quiz scores, recent mistakes, and accuracy metrics.
    """
    return _get_with_retry(f"/internal/ai-tools/students/{student_id}/quiz-results")


def get_gamification_rules() -> Dict[str, Any]:
    """
    GET {base}/internal/ai-tools/gamification/rules

    Retrieves platform-defined gamification economy limits (XP caps, streak
    thresholds, etc.).
    """
    return _get_with_retry("/internal/ai-tools/gamification/rules")
