"""
EduFlow AI - Request correlation context
========================================

A per-request id flows from the .NET gateway (X-Request-Id / X-Correlation-ID)
through every log line and error body of this service, so a failure the
instructor sees in the browser ("Reference: 8f3a...") can be grepped in the
server logs. Falls back to a generated hex id for direct calls.

Never derived from, and never contains, credentials.
"""

import contextvars
import re
import uuid
from typing import Optional

_request_id: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

# Header-safe ids only, so the value can never be used for log/header injection.
_SAFE_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def begin_request_id(incoming: Optional[str] = None) -> str:
    """Resolve the id for a new request and bind it to this context.

    Returns the token needed by end_request_id(). Caller must reset in finally.
    """
    rid = incoming.strip() if incoming and _SAFE_ID.match(incoming.strip()) else uuid.uuid4().hex
    return _request_id.set(rid)


def end_request_id(token) -> None:
    _request_id.reset(token)


def get_request_id() -> str:
    return _request_id.get()
