"""
===============================================================================
EduFlow AI - Internal Service-to-Service Authentication Guard
===============================================================================
This module protects the FastAPI microservice from being invoked by anything
other than the trusted .NET backend (EduFlow.Infrastructure.Services.AiGatewayClient).

Why we need this:
1. Zero-Trust Internal Traffic:
   - Previously, any client on the network could call every AI agent endpoint
     directly, bypassing the .NET backend's own authorization and business rules.
2. Shared-Secret Header Check:
   - The .NET backend sends a static shared secret via the `X-Internal-Api-Key`
     header (configured as `AiService:ApiKey` in appsettings). This module
     verifies that value matches the `INTERNAL_SERVICE_TOKEN` environment
     variable configured here.
3. Fail-Open in Local Dev/CI:
   - If `INTERNAL_SERVICE_TOKEN` is not configured in the environment,
     enforcement is skipped (with a warning logged) so local development and
     CI pipelines that haven't set up the secret yet keep working.
"""

# Import os to read the expected shared-secret token from the environment
import os
# Import logging to emit a warning when the guard is running unenforced
import logging
# Import typing for the optional header value
from typing import Optional
# Import FastAPI's Header extractor and HTTPException for the 401 response
from fastapi import Header, HTTPException

# Module-level logger for this guard
logger = logging.getLogger(__name__)


def verify_internal_token(x_internal_api_key: Optional[str] = Header(None)) -> None:
    """
    FastAPI dependency that enforces the shared-secret internal service token.

    Why we design it this way:
    - Reads the expected token fresh on every call (rather than caching it at
      import time) so environment changes are picked up without a process restart.
    - Skips enforcement entirely when INTERNAL_SERVICE_TOKEN is unset, so local
      dev/CI environments that have not configured the secret yet are not broken.

    Args:
        x_internal_api_key: Value of the `X-Internal-Api-Key` request header,
            sent by the .NET AiGatewayClient on every outbound call.

    Raises:
        HTTPException: 401 if INTERNAL_SERVICE_TOKEN is configured but does not
            match the header value supplied by the caller.
    """
    # Read the expected shared secret from the environment on every call
    expected_token = os.getenv("INTERNAL_SERVICE_TOKEN")

    # Fail-open only when explicitly allowed (local dev/CI).
    # Default is fail-closed: if no token is configured, reject requests.
    fail_open = os.getenv("INTERNAL_AUTH_FAIL_OPEN", "false").lower() in ("1", "true", "yes")
    if not expected_token:
        if fail_open:
            logger.warning(
                "INTERNAL_SERVICE_TOKEN is not set and INTERNAL_AUTH_FAIL_OPEN=true - "
                "internal service authentication is NOT being enforced. "
                "Set INTERNAL_SERVICE_TOKEN to require callers to send a matching "
                "X-Internal-Api-Key header."
            )
            return
        raise HTTPException(
            status_code=503,
            detail="Internal service authentication is not configured. "
                   "Set INTERNAL_SERVICE_TOKEN environment variable."
        )

    if x_internal_api_key != expected_token:
        print(f"[DEBUG Auth] expected: '{expected_token}', received: '{x_internal_api_key}'")
        raise HTTPException(status_code=401, detail="Invalid or missing internal service token")
