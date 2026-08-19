"""
===============================================================================
EduFlow AI - Observability, Performance Metrics & Privacy Redaction
===============================================================================
This module provides centralized observability collection and privacy protection:
1. PII & Secret Redaction:
   - Sanitizes emails, passwords, and authentication bearer tokens before logging.
2. Latency & SLA Tracking:
   - Measures individual agent execution durations and tool latencies.
3. Token & Cost Accounting:
   - Tracks prompt tokens, completion tokens, and total LLM footprint.
4. Validation & Failure Metrics:
   - Records rule violations and unhandled errors for diagnostic auditing.
"""

# Import regular expressions module for pattern matching sensitive strings
import re
# Import time module for timestamping and duration calculations
import time
# Import typing annotations for dictionary structures and optional values
from typing import Dict, Any, List, Optional
# Import Pydantic models for structured metrics serialization
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# 1. Sensitive Information Redaction Patterns (PII & Secrets)
# -----------------------------------------------------------------------------
# Regex pattern matching standard email addresses (e.g. user@university.edu)
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")

# Regex pattern matching Authorization Bearer tokens in headers or logs
BEARER_TOKEN_REGEX = re.compile(r"Bearer\s+[a-zA-Z0-9\-_.]+", re.IGNORECASE)

# Regex pattern matching passwords, API secrets, or credentials
PASSWORD_REGEX = re.compile(r"(password|pwd|secret)\s*[:=]\s*['\"]?[^\s'\"]+", re.IGNORECASE)


def redact_sensitive_info(text: str) -> str:
    """
    Sanitizes personally identifiable information (PII) and secret tokens from a string.
    
    Why we use this:
    - Protects student privacy by preventing emails and credentials from leaking into logs or LLM traces.
    
    Args:
        text: Raw text string potentially containing sensitive information.
        
    Returns:
        Sanitized string with sensitive data replaced by redacted placeholders.
    """
    # Guard check: return unmodified if input is not a string
    if not isinstance(text, str):
        return text
    
    # Redact email addresses
    sanitized = EMAIL_REGEX.sub("[REDACTED_EMAIL]", text)
    # Redact bearer authentication tokens
    sanitized = BEARER_TOKEN_REGEX.sub("Bearer [REDACTED_TOKEN]", sanitized)
    # Redact password and secret assignments
    sanitized = PASSWORD_REGEX.sub(r"\1: [REDACTED_SECRET]", sanitized)
    
    return sanitized


def redact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively scans and redacts sensitive information across nested dictionaries and lists.
    
    Args:
        data: Arbitrary dictionary containing mixed types (strings, lists, nested dicts).
        
    Returns:
        New dictionary with all string values sanitized.
    """
    sanitized: Dict[str, Any] = {}
    for k, v in data.items():
        # If value is a string, sanitize it
        if isinstance(v, str):
            sanitized[k] = redact_sensitive_info(v)
        # If value is a nested dictionary, recurse
        elif isinstance(v, dict):
            sanitized[k] = redact_dict(v)
        # If value is a list, sanitize each element
        elif isinstance(v, list):
            sanitized[k] = [
                redact_sensitive_info(i) if isinstance(i, str) else (redact_dict(i) if isinstance(i, dict) else i)
                for i in v
            ]
        # Otherwise, retain the primitive value (int, float, bool)
        else:
            sanitized[k] = v
    return sanitized


# -----------------------------------------------------------------------------
# 2. Token Usage Model
# -----------------------------------------------------------------------------
class TokenUsage(BaseModel):
    """
    Tracks LLM token consumption across prompt inputs and model completions.
    """
    # Tokens sent as input prompts
    prompt_tokens: int = 0
    # Tokens generated as model output
    completion_tokens: int = 0
    # Total combined token count
    total_tokens: int = 0


# -----------------------------------------------------------------------------
# 3. Observability Metrics Summary Model
# -----------------------------------------------------------------------------
class WorkflowObservabilityMetrics(BaseModel):
    """
    Aggregated telemetry record capturing end-to-end performance of a workflow.
    """
    # Workflow unique identifier
    workflow_id: str
    
    # Total end-to-end workflow execution duration in milliseconds
    workflow_duration_ms: int = 0
    
    # Map of individual agent names to execution durations in milliseconds
    agent_durations: Dict[str, int] = Field(default_factory=dict)
    
    # Map of executed tool names to their execution latencies in milliseconds
    tool_latencies: Dict[str, int] = Field(default_factory=dict)
    
    # Total token consumption across all agent LLM calls in this workflow
    token_usage: TokenUsage = Field(default_factory=TokenUsage)
    
    # List of validation rule failure messages encountered (if any)
    validation_failures: List[str] = Field(default_factory=list)
    
    # Time spent waiting for human instructor approval in milliseconds (if applicable)
    approval_duration_ms: Optional[int] = None
    
    # Overall success status of the workflow
    success: bool = True
    
    # Error classification type if a failure occurred
    error_type: Optional[str] = None


# -----------------------------------------------------------------------------
# 4. Observability Collector Class
# -----------------------------------------------------------------------------
class ObservabilityCollector:
    """
    Stateful metrics collector instantiated per workflow to track live execution stats.
    
    Why we use this:
    - Aggregates latency, tool response times, token counts, and errors across multiple nodes.
    - Yields a finalized `WorkflowObservabilityMetrics` object at the end of the pipeline.
    """
    def __init__(self, workflow_id: str):
        """
        Initialize the collector for a given workflow.
        
        Args:
            workflow_id: Unique string identifier for the active workflow run.
        """
        # Store workflow ID
        self.workflow_id = workflow_id
        # Record start timestamp (seconds since epoch)
        self.start_time = time.time()
        # Initialize storage for agent durations
        self.agent_durations: Dict[str, int] = {}
        # Initialize storage for tool latencies
        self.tool_latencies: Dict[str, int] = {}
        # Initialize token tracker
        self.token_usage = TokenUsage()
        # Initialize list of validation violations
        self.validation_failures: List[str] = []
        # Initialize approval duration tracker
        self.approval_duration_ms: Optional[int] = None
        # Default success to True
        self.success = True
        # Default error type to None
        self.error_type: Optional[str] = None

    def record_agent_duration(self, agent_name: str, duration_ms: int):
        """
        Records the execution time taken by a specific agent.
        """
        # Ensure duration is at least 1ms to avoid 0ms reporting
        self.agent_durations[agent_name] = max(duration_ms, 1)

    def record_tool_latency(self, tool_name: str, latency_ms: int):
        """
        Records the latency of an individual tool handler execution.
        """
        # Ensure latency is at least 1ms
        self.tool_latencies[tool_name] = max(latency_ms, 1)

    def record_token_usage(self, prompt_tokens: int, completion_tokens: int):
        """
        Increments prompt, completion, and total token usage counts.
        """
        self.token_usage.prompt_tokens += prompt_tokens
        self.token_usage.completion_tokens += completion_tokens
        self.token_usage.total_tokens += (prompt_tokens + completion_tokens)

    def record_validation_failure(self, rule_violation: str):
        """
        Records a validation rule violation and marks overall workflow success as False.
        """
        self.validation_failures.append(rule_violation)
        self.success = False

    def record_approval_duration(self, duration_ms: int):
        """
        Records the elapsed time taken by a human instructor to submit a review decision.
        """
        self.approval_duration_ms = duration_ms

    def record_failure(self, error_type: str):
        """
        Marks the workflow as failed and stores the classified error type name.
        """
        self.success = False
        self.error_type = error_type

    def get_summary(self) -> WorkflowObservabilityMetrics:
        """
        Computes total elapsed time and returns a finalized metrics summary model.
        """
        # Calculate total workflow duration from start_time until now
        total_duration = int((time.time() - self.start_time) * 1000)
        
        # Return immutable Pydantic metrics summary
        return WorkflowObservabilityMetrics(
            workflow_id=self.workflow_id,
            workflow_duration_ms=max(total_duration, 1),
            agent_durations=self.agent_durations,
            tool_latencies=self.tool_latencies,
            token_usage=self.token_usage,
            validation_failures=self.validation_failures,
            approval_duration_ms=self.approval_duration_ms,
            success=self.success,
            error_type=self.error_type
        )
