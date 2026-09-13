"""
===============================================================================
EduFlow AI - Shared LLM Invocation Helper (Gemini)
===============================================================================
This module is the single choke point every agent should call through when it
needs a Gemini-backed `ChatGoogleGenerativeAI` chat model, or wants to invoke an LCEL chain
(`prompt | llm | parser`) with consistent retry and error-classification
behavior.

Why we centralize this here instead of each agent hand-rolling its own
`ChatGoogleGenerativeAI(...)` construction and `try/except` around `chain.invoke(...)`:
1. Consistent Configuration:
   - `GEMINI_MODEL` becomes a single environment-driven knob instead of a model
     name hardcoded independently inside every agent module.
2. Consistent Resilience:
   - Every structured chain invocation gets the same exponential backoff with
     jitter (`core.retry.retry_with_backoff`) applied around it, instead of
     ad-hoc retry logic (or none) per agent.
3. Consistent Error Classification:
   - Raw Google SDK / LangChain exceptions are re-raised as the codebase's
     standardized `AIError` subclasses (`core.errors`) so callers (and the
     LangGraph pipeline) can uniformly branch on `is_retryable`.
"""

# Import os to read GEMINI_API_KEY / GEMINI_MODEL from the environment
import os
# Import logging for warnings when falling back to defaults or classifying failures
import logging
# Import typing annotations for the generic chain invocation wrapper
from typing import Any, Dict

# Import the concrete Gemini chat model wrapper
from langchain_google_genai import ChatGoogleGenerativeAI
from google.api_core.exceptions import (
    ResourceExhausted,
    DeadlineExceeded,
    ServiceUnavailable,
    InvalidArgument,
    PermissionDenied,
    Unauthenticated,
    NotFound,
    InternalServerError as GoogleInternalServerError,
)

# Import our standardized error hierarchy and the shared retry decorator
from core.errors import AIError, ModelFailure, RateLimit, Timeout, ValidationError
from core.retry import retry_with_backoff

# Module-level logger
logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"


def get_gemini_llm(temperature: float = 0.3) -> ChatGoogleGenerativeAI:
    """
    Constructs a `ChatGoogleGenerativeAI` chat model instance from environment configuration.

    Reads:
        GEMINI_API_KEY: Required. Gemini API secret key.
        GEMINI_MODEL: Optional. Defaults to DEFAULT_GEMINI_MODEL when unset.

    Args:
        temperature: Sampling temperature passed straight through to ChatGoogleGenerativeAI.

    Returns:
        A configured `ChatGoogleGenerativeAI` instance ready for use in an LCEL chain.

    Raises:
        ValidationError: If GEMINI_API_KEY is not configured. This is a
            deterministic configuration problem, not a transient failure, so
            it is intentionally non-retryable.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValidationError(
            "GEMINI_API_KEY is not set - cannot construct a ChatGoogleGenerativeAI LLM client.",
            details={"env_var": "GEMINI_API_KEY"}
        )

    model_name = os.environ.get("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL

    return ChatGoogleGenerativeAI(model=model_name, temperature=temperature, google_api_key=api_key)


def _classify_llm_exception(exc: Exception) -> AIError:
    """
    Maps a raw Google SDK / LangChain exception to the codebase's AIError hierarchy.

    Args:
        exc: The exception raised out of `chain.invoke(...)`.

    Returns:
        An appropriate AIError subclass instance (never raises itself).
    """
    details = {"original_error": str(exc), "original_type": type(exc).__name__}

    # Provider throttling -> retryable rate limit
    if isinstance(exc, ResourceExhausted):
        return RateLimit(f"Gemini rate limit encountered during LLM invocation: {exc}", details=details)

    # Network / request timeouts -> retryable timeout
    if isinstance(exc, DeadlineExceeded):
        return Timeout(f"Gemini request timed out during LLM invocation: {exc}", details=details)

    # Connection issues -> retryable model/provider failure
    if isinstance(exc, ServiceUnavailable):
        return ModelFailure(f"Gemini service unavailable error during LLM invocation: {exc}", details=details)

    # Deterministic misconfiguration/request problems -> non-retryable
    if isinstance(exc, (Unauthenticated, InvalidArgument, PermissionDenied, NotFound)):
        return ValidationError(f"Gemini rejected the LLM request: {exc}", details=details)

    # Provider-side 5xx errors -> retryable model failure
    if isinstance(exc, GoogleInternalServerError):
        return ModelFailure(f"Gemini internal server error during LLM invocation: {exc}", details=details)

    return ModelFailure(f"LLM chain invocation failed: {exc}", details=details)


def invoke_structured(chain, input_dict: Dict[str, Any], retryable: bool = True) -> Any:
    """
    Single choke-point wrapper for invoking an LCEL chain (e.g. `prompt | llm | parser`).

    Every agent should call through this instead of hand-rolling its own
    `try/except` around `chain.invoke(...)`.

    Args:
        chain: A LangChain Runnable (typically `prompt | llm | parser`).
        input_dict: The input dictionary passed to `chain.invoke(...)`.
        retryable: When True (default), wraps the invocation with the shared
            `retry_with_backoff` decorator so transient failures (rate limits,
            timeouts, connection errors, 5xx) are retried with exponential
            backoff and jitter. When False, the chain is invoked exactly once.

    Returns:
        Whatever `chain.invoke(input_dict)` returns (parsed dict, string, etc.).

    Raises:
        AIError: A classified subclass (RateLimit, Timeout, ModelFailure, or
            ValidationError) describing the failure after retries (if any)
            are exhausted.
    """
    def _do_invoke() -> Any:
        try:
            return chain.invoke(input_dict)
        except AIError:
            raise
        except Exception as e:
            classified = _classify_llm_exception(e)
            logger.warning(
                "LLM chain invocation failed (%s): %s",
                classified.__class__.__name__,
                classified.message
            )
            raise classified from e

    if retryable:
        return retry_with_backoff()(_do_invoke)()

    return _do_invoke()
