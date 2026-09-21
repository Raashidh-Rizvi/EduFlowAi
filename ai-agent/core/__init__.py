"""
===============================================================================
EduFlow AI - Core Architecture Package Initialization
===============================================================================
This module provides centralized access to the foundational system components:
1. Error Classification Hierarchy (`errors.py`)
2. Resilience & Exponential Backoff (`retry.py`)
3. Observability, Latency Tracing & PII Redaction (`observability.py`)

Why this file exists:
- Clean module interface allowing `from core import AIError, retry_with_backoff, ObservabilityCollector`.
"""

# Import all custom classified AI exceptions
from .errors import (
    AIError,            # Base exception for all EduFlow agentic errors
    ValidationError,    # Non-retryable schema or business rule failure
    ToolUnavailable,    # Retryable external or internal tool failure
    Timeout,            # Retryable SLA duration exceeded exception
    RateLimit,          # Retryable LLM quota / throughput rate-limit
    ModelFailure,       # Retryable underlying LLM provider failure
    InvalidOutput,      # Non-retryable unparseable or corrupted AI output
    ApprovalTimeout     # Non-retryable human instructor review timeout
)

# Import the resilience decorator for exponential backoff with jitter
from .retry import retry_with_backoff

# Import observability and telemetry collectors
from .observability import (
    ObservabilityCollector,         # Tracks agent latency, tool performance, and token usage
    WorkflowObservabilityMetrics,   # Standardized Pydantic metrics summary model
    TokenUsage,                     # LLM token consumption tracking model
    redact_sensitive_info,          # Regex-based PII and secret redaction function for strings
    redact_dict                     # Recursive dictionary sanitizer
)
