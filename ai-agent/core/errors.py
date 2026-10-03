"""
EduFlow AI - Stable AI service error codes and exceptions
=========================================================

Every failure that can reach a client goes through an AiServiceError subclass so
the FastAPI layer can answer with a stable machine-readable `code`, a safe
human-readable `message`, optional `details`, and the request id — never with a
stack trace or an SDK internals dump.

The code list mirrors the contract documented in docs/AI_PROVIDER_CONFIGURATION.md
and consumed by the .NET gateway and the React error mapper
(frontend/src/utils/aiErrors.js).
"""

from typing import List, Optional


# -----------------------------------------------------------------------------
# Stable error codes (contract: backend .NET + frontend React map on these)
# -----------------------------------------------------------------------------

AI_PROVIDER_NOT_CONFIGURED = "AI_PROVIDER_NOT_CONFIGURED"
AI_PROVIDER_UNAVAILABLE = "AI_PROVIDER_UNAVAILABLE"
AI_MODEL_NOT_FOUND = "AI_MODEL_NOT_FOUND"
AI_AUTHENTICATION_FAILED = "AI_AUTHENTICATION_FAILED"
AI_RATE_LIMITED = "AI_RATE_LIMITED"
AI_REQUEST_FAILED = "AI_REQUEST_FAILED"
AI_GENERATION_FAILED = "AI_GENERATION_FAILED"
AI_INVALID_RESPONSE = "AI_INVALID_RESPONSE"
AI_OUTPUT_VALIDATION_FAILED = "AI_OUTPUT_VALIDATION_FAILED"
AI_GENERATION_IN_PROGRESS = "AI_GENERATION_IN_PROGRESS"

RAG_CONTEXT_NOT_FOUND = "RAG_CONTEXT_NOT_FOUND"
RAG_RETRIEVAL_FAILED = "RAG_RETRIEVAL_FAILED"
DOCUMENT_NOT_PROCESSED = "DOCUMENT_NOT_PROCESSED"
DOCUMENT_EXTRACTION_FAILED = "DOCUMENT_EXTRACTION_FAILED"
EMBEDDING_FAILED = "EMBEDDING_FAILED"

QUIZ_VALIDATION_FAILED = "QUIZ_VALIDATION_FAILED"
QUIZ_SAVE_FAILED = "QUIZ_SAVE_FAILED"
QUIZ_ASSIGNMENT_FAILED = "QUIZ_ASSIGNMENT_FAILED"
QUIZ_EVALUATION_FAILED = "QUIZ_EVALUATION_FAILED"


class AiServiceError(Exception):
    """Base class for every error that is safe to show a user.

    `code` is stable, `message` is user-facing (no secrets, no stack traces),
    `details` may hold actionable specifics (which env var, which model list).
    """

    code: str = AI_REQUEST_FAILED
    status_code: int = 500

    def __init__(self, message: str, details: Optional[str] = None,
                 code: Optional[str] = None, status_code: Optional[int] = None):
        self.message = message
        self.details = details
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        super().__init__(message)

    def to_body(self, request_id: Optional[str] = None) -> dict:
        return {
            "status": "error",
            "code": self.code,
            "message": self.message,
            "detail": self.message,   # .NET gateway compatibility
            "details": self.details,
            "requestId": request_id,
        }


# -----------------------------------------------------------------------------
# Provider / model errors
# -----------------------------------------------------------------------------

class QuizGenerationUnavailable(AiServiceError):
    """The quiz LLM is not configured or unreachable. Never fall back."""

    code = AI_PROVIDER_UNAVAILABLE
    status_code = 503


class ProviderNotConfigured(QuizGenerationUnavailable):
    """The selected provider has no credentials in this environment."""

    code = AI_PROVIDER_NOT_CONFIGURED


class QuizGenerationValidationError(AiServiceError):
    """The model output cannot be repaired into the strict schema."""

    code = AI_OUTPUT_VALIDATION_FAILED
    status_code = 502

    def __init__(self, errors: List[str], message: Optional[str] = None):
        self.errors = errors
        super().__init__(
            message or "The AI returned quiz output that failed validation. Please try again.",
            details="; ".join(errors[:10]) if errors else None,
        )


# -----------------------------------------------------------------------------
# Document / RAG errors
# -----------------------------------------------------------------------------

class DocumentNotProcessed(AiServiceError):
    code = DOCUMENT_NOT_PROCESSED
    status_code = 409


class DocumentExtractionFailed(AiServiceError):
    code = DOCUMENT_EXTRACTION_FAILED
    status_code = 422


class EmbeddingFailed(AiServiceError):
    code = EMBEDDING_FAILED
    status_code = 502


class RagRetrievalFailed(AiServiceError):
    code = RAG_RETRIEVAL_FAILED
    status_code = 502


class RagContextNotFound(AiServiceError):
    code = RAG_CONTEXT_NOT_FOUND
    status_code = 404


class CourseMaterialUnavailable(ValueError, AiServiceError):
    """No usable course material exists for the requested quiz scope.

    Also a ValueError so existing callers/tests that catch ValueError keep
    working; the AI error contract (code + safe message) rides along.
    """

    code = RAG_CONTEXT_NOT_FOUND
    status_code = 422

    def __init__(self, message: str, details: Optional[str] = None):
        AiServiceError.__init__(self, message, details=details)
