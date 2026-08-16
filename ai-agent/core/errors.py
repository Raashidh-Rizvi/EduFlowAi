from typing import Optional, Dict, Any

class AIError(Exception):
    """Base exception for all EduFlow Agentic AI errors."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None, is_retryable: bool = False):
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.is_retryable = is_retryable

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "is_retryable": self.is_retryable,
            "details": self.details
        }


class ValidationError(AIError):
    """Raised when deterministic schema, curriculum reference, or business rules fail."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=False)


class ToolUnavailable(AIError):
    """Raised when an external or internal tool fails to respond or is offline."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=True)


class Timeout(AIError):
    """Raised when an agent or tool execution exceeds the allotted SLA duration."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=True)


class RateLimit(AIError):
    """Raised when LLM model or downstream tool provider hits quota/rate limits."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=True)


class ModelFailure(AIError):
    """Raised when the underlying LLM returns an unexpected failure or disconnects."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=True)


class InvalidOutput(AIError):
    """Raised when the agent produces unparseable or corrupted candidate output."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=False)


class ApprovalTimeout(AIError):
    """Raised when a human instructor review window expires without an approval decision."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, is_retryable=False)
