"""
===============================================================================
EduFlow AI - Error Classification Hierarchy & Exception Handling
===============================================================================
This module defines the standardized exception hierarchy for the multi-agent system.

Why we classify errors systematically:
1. Resilience & Smart Retries:
   - Distinguishes between transient failures (e.g., rate limits, network timeouts) that
     should be retried via exponential backoff (`is_retryable=True`), and deterministic
     failures (e.g., schema validation, business rule violations) that must fail immediately
     (`is_retryable=False`).
2. Auditability & Telemetry:
   - Every exception can serialize its details and classification to JSON via `to_dict()`,
     allowing structured logging and monitoring across the LangGraph pipeline.
"""

# Import typing utilities for optional values and dictionary types
from typing import Optional, Dict, Any


# -----------------------------------------------------------------------------
# 1. Base AI Exception
# -----------------------------------------------------------------------------
class AIError(Exception):
    """
    Base exception class for all EduFlow Agentic AI errors.
    
    Why we use this base class:
    - Provides a common interface for all domain-specific errors in the multi-agent system.
    - Encapsulates error metadata, descriptive messages, and retry eligibility flags.
    """
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        is_retryable: bool = False
    ):
        """
        Initialize the base AIError.
        
        Args:
            message: Human-readable error description explaining what went wrong.
            details: Optional dictionary containing context variables, IDs, or raw errors.
            is_retryable: Boolean indicating if exponential backoff retries should be attempted.
        """
        # Call the parent Exception class constructor with the message
        super().__init__(message)
        
        # Store the error message text
        self.message = message
        
        # Store additional diagnostic context (or empty dict if None provided)
        self.details = details or {}
        
        # Store whether this error is transient and safe to retry
        self.is_retryable = is_retryable

    def to_dict(self) -> Dict[str, Any]:
        """
        Serializes the exception to a structured dictionary for JSON logging and API responses.
        
        Returns:
            Dictionary containing error_type, message, is_retryable, and details.
        """
        return {
            "error_type": self.__class__.__name__,  # Name of the concrete exception class
            "message": self.message,                # Error description
            "is_retryable": self.is_retryable,      # Retry eligibility flag
            "details": self.details                 # Extra contextual key-value pairs
        }


# -----------------------------------------------------------------------------
# 2. Non-Retryable Schema & Rule Failures
# -----------------------------------------------------------------------------
class ValidationError(AIError):
    """
    Raised when deterministic schema validation, curriculum reference checks,
    or platform business rules (e.g. XP cap > 150) fail.
    
    Why non-retryable:
    - Retrying an identical invalid payload will always produce the exact same failure.
    - Failing fast saves LLM tokens and execution time.
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=False)


# -----------------------------------------------------------------------------
# 3. Retryable Tool Failures
# -----------------------------------------------------------------------------
class ToolUnavailable(AIError):
    """
    Raised when an external or internal tool fails to respond, is offline,
    or experiences a transient network glitch.
    
    Why retryable:
    - External services and databases may experience momentary blips that succeed on retry.
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=True)


# -----------------------------------------------------------------------------
# 4. Retryable SLA Timeouts
# -----------------------------------------------------------------------------
class Timeout(AIError):
    """
    Raised when an agent or tool execution exceeds its allotted SLA duration window.
    
    Why retryable:
    - Transient system load spikes can cause temporary latency that resolves quickly.
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=True)


# -----------------------------------------------------------------------------
# 5. Retryable Provider Rate Limits
# -----------------------------------------------------------------------------
class RateLimit(AIError):
    """
    Raised when LLM model providers (e.g., OpenAI, Gemini) or downstream tool APIs
    hit rate limits or concurrency quotas (HTTP 429).
    
    Why retryable:
    - Waiting with randomized exponential jitter allows the rate-limit window to reset.
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=True)


# -----------------------------------------------------------------------------
# 6. Retryable Model Provider Failures
# -----------------------------------------------------------------------------
class ModelFailure(AIError):
    """
    Raised when the underlying LLM returns an unexpected 500 error, disconnects,
    or fails to respond.
    
    Why retryable:
    - LLM provider server errors are typically ephemeral and resolve on subsequent calls.
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=True)


# -----------------------------------------------------------------------------
# 7. Non-Retryable Corrupted Output
# -----------------------------------------------------------------------------
class InvalidOutput(AIError):
    """
    Raised when the agent produces unparseable JSON, truncated text,
    or corrupted candidate output that cannot be recovered.
    
    Why non-retryable:
    - The output must be caught and handled through explicit replanning rather than blind retry.
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=False)


# -----------------------------------------------------------------------------
# 8. Human-in-the-Loop Governance Timeouts
# -----------------------------------------------------------------------------
class ApprovalTimeout(AIError):
    """
    Raised when a human instructor review window expires without an approval decision.
    
    Why non-retryable:
    - Requires human notification or workflow cancellation rather than automatic retries.
    """
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=False)
