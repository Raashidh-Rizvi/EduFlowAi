import re
import time
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

# Patterns for sensitive student information redaction
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
BEARER_TOKEN_REGEX = re.compile(r"Bearer\s+[a-zA-Z0-9\-_.]+", re.IGNORECASE)
PASSWORD_REGEX = re.compile(r"(password|pwd|secret)\s*[:=]\s*['\"]?[^\s'\"]+", re.IGNORECASE)

def redact_sensitive_info(text: str) -> str:
    """Sanitizes PII and secrets from agent logs and traces."""
    if not isinstance(text, str):
        return text
    sanitized = EMAIL_REGEX.sub("[REDACTED_EMAIL]", text)
    sanitized = BEARER_TOKEN_REGEX.sub("Bearer [REDACTED_TOKEN]", sanitized)
    sanitized = PASSWORD_REGEX.sub(r"\1: [REDACTED_SECRET]", sanitized)
    return sanitized

def redact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively redacts sensitive info in dictionaries."""
    sanitized: Dict[str, Any] = {}
    for k, v in data.items():
        if isinstance(v, str):
            sanitized[k] = redact_sensitive_info(v)
        elif isinstance(v, dict):
            sanitized[k] = redact_dict(v)
        elif isinstance(v, list):
            sanitized[k] = [
                redact_sensitive_info(i) if isinstance(i, str) else (redact_dict(i) if isinstance(i, dict) else i)
                for i in v
            ]
        else:
            sanitized[k] = v
    return sanitized


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class WorkflowObservabilityMetrics(BaseModel):
    workflow_id: str
    workflow_duration_ms: int = 0
    agent_durations: Dict[str, int] = Field(default_factory=dict)
    tool_latencies: Dict[str, int] = Field(default_factory=dict)
    token_usage: TokenUsage = Field(default_factory=TokenUsage)
    validation_failures: List[str] = Field(default_factory=list)
    approval_duration_ms: Optional[int] = None
    success: bool = True
    error_type: Optional[str] = None


class ObservabilityCollector:
    """Tracks end-to-end metrics, agent latency, tool performance, and token usage."""
    def __init__(self, workflow_id: str):
        self.workflow_id = workflow_id
        self.start_time = time.time()
        self.agent_durations: Dict[str, int] = {}
        self.tool_latencies: Dict[str, int] = {}
        self.token_usage = TokenUsage()
        self.validation_failures: List[str] = []
        self.approval_duration_ms: Optional[int] = None
        self.success = True
        self.error_type: Optional[str] = None

    def record_agent_duration(self, agent_name: str, duration_ms: int):
        self.agent_durations[agent_name] = max(duration_ms, 1)

    def record_tool_latency(self, tool_name: str, latency_ms: int):
        self.tool_latencies[tool_name] = max(latency_ms, 1)

    def record_token_usage(self, prompt_tokens: int, completion_tokens: int):
        self.token_usage.prompt_tokens += prompt_tokens
        self.token_usage.completion_tokens += completion_tokens
        self.token_usage.total_tokens += (prompt_tokens + completion_tokens)

    def record_validation_failure(self, rule_violation: str):
        self.validation_failures.append(rule_violation)
        self.success = False

    def record_approval_duration(self, duration_ms: int):
        self.approval_duration_ms = duration_ms

    def record_failure(self, error_type: str):
        self.success = False
        self.error_type = error_type

    def get_summary(self) -> WorkflowObservabilityMetrics:
        total_duration = int((time.time() - self.start_time) * 1000)
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
