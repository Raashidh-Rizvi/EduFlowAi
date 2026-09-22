"""
EduFlow AI - Phase 4: Reliability, Grounding & Safety Test Suite

Tests error classification, retry logic, PII redaction, and state transitions
using lightweight imports that avoid heavy agent initialization.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Lightweight imports only - avoid graph/ and agents/ package __init__.py
from core.errors import (
    AIError, ValidationError, ToolUnavailable, Timeout,
    RateLimit, ModelFailure, InvalidOutput, ApprovalTimeout
)
from core.retry import retry_with_backoff
from core.observability import redact_sensitive_info, redact_dict


class TestErrorClassification:
    def test_validation_error_non_retryable(self):
        e = ValidationError("bad schema")
        assert e.is_retryable is False
        assert e.message == "bad schema"

    def test_tool_unavailable_retryable(self):
        e = ToolUnavailable("db down")
        assert e.is_retryable is True

    def test_timeout_retryable(self):
        e = Timeout("SLA exceeded")
        assert e.is_retryable is True

    def test_rate_limit_retryable(self):
        e = RateLimit("429 too many")
        assert e.is_retryable is True

    def test_model_failure_retryable(self):
        e = ModelFailure("LLM 500")
        assert e.is_retryable is True

    def test_invalid_output_non_retryable(self):
        e = InvalidOutput("truncated JSON")
        assert e.is_retryable is False

    def test_approval_timeout_non_retryable(self):
        e = ApprovalTimeout("instructor absent")
        assert e.is_retryable is False

    def test_error_serializes_to_dict(self):
        e = ValidationError("test", details={"field": "title"})
        d = e.to_dict()
        assert d["error_type"] == "ValidationError"
        assert d["message"] == "test"
        assert d["is_retryable"] is False
        assert d["details"]["field"] == "title"

    def test_base_ai_error_default_details(self):
        e = AIError("msg")
        assert e.details == {}
        assert e.is_retryable is False


class TestRetryWithBackoff:
    def test_succeeds_after_transient_failures(self):
        attempts = 0
        @retry_with_backoff(max_retries=3, initial_delay=0.01, multiplier=1.0, jitter=False)
        def flaky():
            nonlocal attempts
            attempts += 1
            if attempts < 3:
                raise ToolUnavailable("transient")
            return "OK"
        assert flaky() == "OK"
        assert attempts == 3

    def test_no_retry_on_non_retryable(self):
        attempts = 0
        @retry_with_backoff(max_retries=3, initial_delay=0.01)
        def fail():
            nonlocal attempts
            attempts += 1
            raise ValidationError("permanent")
        with pytest.raises(ValidationError):
            fail()
        assert attempts == 1

    def test_exhausts_retries(self):
        attempts = 0
        @retry_with_backoff(max_retries=2, initial_delay=0.01, multiplier=1.0, jitter=False)
        def always():
            nonlocal attempts
            attempts += 1
            raise RateLimit("limit")
        with pytest.raises(RateLimit):
            always()
        assert attempts == 3


class TestPIIRedaction:
    def test_email_redacted(self):
        raw = "Contact: student@uni.edu or admin@school.org"
        result = redact_sensitive_info(raw)
        assert "student@uni.edu" not in result
        assert "admin@school.org" not in result
        assert "[REDACTED_EMAIL]" in result

    def test_secret_redacted(self):
        raw = "password: MyPass123 and secret=abc456"
        result = redact_sensitive_info(raw)
        assert "MyPass123" not in result
        assert "abc456" not in result

    def test_dict_recursive_redaction(self):
        data = {
            "email": "test@uni.edu",
            "nested": {"email": "deep@uni.edu"},
            "safe": "no secrets here"
        }
        result = redact_dict(data)
        assert result["email"] == "[REDACTED_EMAIL]"
        assert result["nested"]["email"] == "[REDACTED_EMAIL]"
        assert result["safe"] == "no secrets here"

    def test_list_items_redacted(self):
        data = {
            "logs": ["Bearer eyJhbG.abc.sig", "normal message"],
            "count": 5
        }
        result = redact_dict(data)
        assert "eyJhbG" not in str(result["logs"])
        assert "[REDACTED_TOKEN]" in result["logs"][0]
        assert result["logs"][1] == "normal message"
        assert result["count"] == 5


class TestStateTransitions:
    VALID_TRANSITIONS = {
        "DRAFT": ["DRAFT", "PLANNING"],
        "PLANNING": ["PLANNING", "VALIDATING"],
        "VALIDATING": ["VALIDATING", "PENDING_APPROVAL", "REVISION_REQUESTED"],
        "PENDING_APPROVAL": ["PENDING_APPROVAL", "APPROVED", "REJECTED", "REVISION_REQUESTED"],
        "APPROVED": ["APPROVED", "EXECUTING"],
        "EXECUTING": ["EXECUTING", "COMPLETED", "FAILED"],
        "COMPLETED": ["COMPLETED"],
        "FAILED": ["FAILED", "DRAFT"],
        "REVISION_REQUESTED": ["REVISION_REQUESTED", "PLANNING"],
        "REJECTED": ["REJECTED", "DRAFT"],
    }

    def test_pending_to_approved_valid(self):
        assert "APPROVED" in self.VALID_TRANSITIONS["PENDING_APPROVAL"]

    def test_pending_to_rejected_valid(self):
        assert "REJECTED" in self.VALID_TRANSITIONS["PENDING_APPROVAL"]

    def test_pending_to_completed_invalid(self):
        assert "COMPLETED" not in self.VALID_TRANSITIONS["PENDING_APPROVAL"]

    def test_draft_to_planning_valid(self):
        assert "PLANNING" in self.VALID_TRANSITIONS["DRAFT"]

    def test_revision_requests_back_to_planning(self):
        assert "PLANNING" in self.VALID_TRANSITIONS["REVISION_REQUESTED"]
