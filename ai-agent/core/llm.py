"""
===============================================================================
EduFlow AI - Shared LLM Invocation Helper (Groq)
===============================================================================
This module is the single choke point every agent should call through when it
needs a Groq-backed `ChatGroq` chat model, or wants to invoke an LCEL chain
(`prompt | llm | parser`) with consistent retry and error-classification
behavior.

Why we centralize this here instead of each agent hand-rolling its own
`ChatGroq(...)` construction and `try/except` around `chain.invoke(...)`:
1. Consistent Configuration:
   - `GROQ_MODEL` becomes a single environment-driven knob instead of a model
     name hardcoded independently inside every agent module.
2. Consistent Resilience:
   - Every structured chain invocation gets the same exponential backoff with
     jitter (`core.retry.retry_with_backoff`) applied around it, instead of
     ad-hoc retry logic (or none) per agent.
3. Consistent Error Classification:
   - Raw Groq SDK / LangChain exceptions are re-raised as the codebase's
     standardized `AIError` subclasses (`core.errors`) so callers (and the
     LangGraph pipeline) can uniformly branch on `is_retryable`.
"""

# Import os to read GROQ_API_KEY / GROQ_MODEL from the environment
import os
# Import logging for warnings when falling back to defaults or classifying failures
import logging
# Import typing annotations for the generic chain invocation wrapper
from typing import Any, Dict

# Import the concrete Groq chat model wrapper (mirrors agents/quiz_generator.py usage)
from langchain_groq import ChatGroq

# Import raw Groq SDK exceptions so we can classify them into our own AIError hierarchy
from groq import (
    RateLimitError as GroqRateLimitError,
    APITimeoutError as GroqAPITimeoutError,
    APIConnectionError as GroqAPIConnectionError,
    AuthenticationError as GroqAuthenticationError,
    BadRequestError as GroqBadRequestError,
    PermissionDeniedError as GroqPermissionDeniedError,
    NotFoundError as GroqNotFoundError,
    InternalServerError as GroqInternalServerError,
)

# Import our standardized error hierarchy and the shared retry decorator
from core.errors import AIError, ModelFailure, RateLimit, Timeout, ValidationError
from core.retry import retry_with_backoff

# Module-level logger
logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Default Groq model
# -----------------------------------------------------------------------------
# NOTE: This is the current, non-deprecated Groq production model name as of
# this codebase's authoring date. Groq's model catalog changes over time
# (models get deprecated/renamed) -- verify this against Groq's live model
# catalog (https://console.groq.com/docs/models) at deploy time and update
# GROQ_MODEL in the environment rather than editing this default in place.
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"


def get_groq_llm(temperature: float = 0.3) -> ChatGroq:
    """
    Constructs a `ChatGroq` chat model instance from environment configuration.

    Reads:
        GROQ_API_KEY: Required. Groq API secret key.
        GROQ_MODEL: Optional. Defaults to DEFAULT_GROQ_MODEL when unset.

    Args:
        temperature: Sampling temperature passed straight through to ChatGroq.

    Returns:
        A configured `ChatGroq` instance ready for use in an LCEL chain.

    Raises:
        ValidationError: If GROQ_API_KEY is not configured. This is a
            deterministic configuration problem, not a transient failure, so
            it is intentionally non-retryable.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValidationError(
            "GROQ_API_KEY is not set - cannot construct a ChatGroq LLM client.",
            details={"env_var": "GROQ_API_KEY"}
        )

    model_name = os.environ.get("GROQ_MODEL") or DEFAULT_GROQ_MODEL

    # Mirrors the exact ChatGroq(...) construction pattern already used in
    # agents/quiz_generator.py (model=, temperature=) -- GROQ_API_KEY is picked
    # up automatically by ChatGroq/the underlying Groq SDK from the environment.
    return ChatGroq(model=model_name, temperature=temperature)


def _classify_llm_exception(exc: Exception) -> AIError:
    """
    Maps a raw Groq SDK / LangChain exception to the codebase's AIError hierarchy.

    Args:
        exc: The exception raised out of `chain.invoke(...)`.

    Returns:
        An appropriate AIError subclass instance (never raises itself).
    """
    details = {"original_error": str(exc), "original_type": type(exc).__name__}

    # Provider throttling -> retryable rate limit
    if isinstance(exc, GroqRateLimitError):
        return RateLimit(f"Groq rate limit encountered during LLM invocation: {exc}", details=details)

    # Network / request timeouts -> retryable timeout
    if isinstance(exc, GroqAPITimeoutError):
        return Timeout(f"Groq request timed out during LLM invocation: {exc}", details=details)

    # Connection issues -> retryable model/provider failure
    if isinstance(exc, GroqAPIConnectionError):
        return ModelFailure(f"Groq connection error during LLM invocation: {exc}", details=details)

    # Deterministic misconfiguration/request problems -> non-retryable
    if isinstance(exc, (GroqAuthenticationError, GroqBadRequestError, GroqPermissionDeniedError, GroqNotFoundError)):
        return ValidationError(f"Groq rejected the LLM request: {exc}", details=details)

    # Provider-side 5xx errors -> retryable model failure
    if isinstance(exc, GroqInternalServerError):
        return ModelFailure(f"Groq internal server error during LLM invocation: {exc}", details=details)

    # Anything else (parser failures, unexpected LangChain errors, etc.) is
    # treated as a retryable model failure -- transient issues are far more
    # common than deterministic ones for chain invocations.
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
            # Already one of our classified exceptions (e.g. raised by a
            # nested invoke_structured call) -- propagate unchanged.
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
