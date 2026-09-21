"""
===============================================================================
EduFlow AI - Shared LLM & Embeddings Invocation Helper (Azure OpenAI / Gemini)
===============================================================================
This module is the single choke point every agent should call through when it
needs an LLM chat model (Azure OpenAI, Google Gemini, or OpenAI) or an
embedding model, or wants to invoke an LCEL chain (`prompt | llm | parser`)
with consistent retry and error-classification behavior.
"""

import os
import logging
from typing import Any, Dict, Optional

# Google Gemini provider
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

# Azure OpenAI / OpenAI provider
try:
    from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings, ChatOpenAI
    from openai import (
        RateLimitError as OpenAIRateLimitError,
        APITimeoutError as OpenAIAPITimeoutError,
        APIConnectionError as OpenAIAPIConnectionError,
        AuthenticationError as OpenAIAuthenticationError,
        BadRequestError as OpenAIBadRequestError,
        PermissionDeniedError as OpenAIPermissionDeniedError,
        NotFoundError as OpenAINotFoundError,
        InternalServerError as OpenAIInternalServerError,
    )
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

# Import our standardized error hierarchy and the shared retry decorator
from core.errors import AIError, ModelFailure, RateLimit, Timeout, ValidationError
from core.retry import retry_with_backoff

# Module-level logger
logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = "gemini-3.5-flash"


def get_llm(temperature: float = 0.3, model_name: Optional[str] = None) -> Any:
    """
    Constructs a configured chat model instance based on available environment credentials.

    Priority order:
    1. Azure OpenAI (if AZURE_OPENAI_CHAT_DEPLOYMENT and AZURE_OPENAI_API_KEY are configured)
    2. Google Gemini (if GEMINI_API_KEY is configured)
    3. Standard OpenAI (if OPENAI_API_KEY is configured)
    """
    # 1. Azure OpenAI
    azure_key = os.environ.get("AZURE_OPENAI_API_KEY")
    azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    azure_chat_deployment = os.environ.get("AZURE_OPENAI_CHAT_DEPLOYMENT")

    if HAS_OPENAI and azure_key and azure_endpoint and azure_chat_deployment:
        api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01")
        logger.info("Using Azure OpenAI Chat model deployment: %s", azure_chat_deployment)
        return AzureChatOpenAI(
            azure_deployment=azure_chat_deployment,
            azure_endpoint=azure_endpoint,
            api_key=azure_key,
            api_version=api_version,
            temperature=temperature
        )

    # 2. Google Gemini
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        resolved_model = model_name or os.environ.get("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL
        logger.info("Using Google Gemini model: %s", resolved_model)
        return ChatGoogleGenerativeAI(model=resolved_model, temperature=temperature, google_api_key=gemini_key)

    # 3. Standard OpenAI
    openai_key = os.environ.get("OPENAI_API_KEY")
    if HAS_OPENAI and openai_key:
        resolved_openai = model_name or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        logger.info("Using standard OpenAI model: %s", resolved_openai)
        return ChatOpenAI(model=resolved_openai, temperature=temperature, api_key=openai_key)

    raise ValidationError(
        "No valid LLM credentials configured. Please set AZURE_OPENAI_API_KEY & AZURE_OPENAI_CHAT_DEPLOYMENT, "
        "or GEMINI_API_KEY, or OPENAI_API_KEY in ai-agent/.env.",
        details={"env_vars": ["AZURE_OPENAI_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY"]}
    )


def get_gemini_llm(temperature: float = 0.3, model_name: Optional[str] = None) -> Any:
    """
    Backward-compatible alias for get_llm.
    Allows all existing agents referencing get_gemini_llm to function seamlessly.
    """
    return get_llm(temperature=temperature, model_name=model_name)


def get_embeddings() -> Any:
    """
    Constructs an embedding model based on available environment credentials.
    Defaults to Azure OpenAI Embeddings (text-embedding-3-small) when Azure credentials are set.
    """
    azure_key = os.environ.get("AZURE_OPENAI_API_KEY")
    azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
    azure_embedding_deployment = os.environ.get("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small")

    if HAS_OPENAI and azure_key and azure_endpoint:
        api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2023-05-15")
        logger.info("Using Azure OpenAI Embeddings deployment: %s", azure_embedding_deployment)
        return AzureOpenAIEmbeddings(
            azure_deployment=azure_embedding_deployment,
            azure_endpoint=azure_endpoint,
            api_key=azure_key,
            openai_api_version=api_version
        )

    # Fallback to local HuggingFace embeddings
    try:
        from langchain_huggingface import HuggingFaceEmbeddings
        return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    except Exception as e:
        raise ValidationError(f"No embeddings provider available: {e}")


def _classify_llm_exception(exc: Exception) -> AIError:
    """
    Maps raw Google SDK, OpenAI / Azure SDK, and LangChain exceptions to the codebase's AIError hierarchy.
    """
    details = {"original_error": str(exc), "original_type": type(exc).__name__}

    # Azure / OpenAI Exceptions
    if HAS_OPENAI:
        if isinstance(exc, OpenAIRateLimitError):
            return RateLimit(f"Azure OpenAI rate limit encountered during LLM invocation: {exc}", details=details)
        if isinstance(exc, OpenAIAPITimeoutError):
            return Timeout(f"Azure OpenAI request timed out: {exc}", details=details)
        if isinstance(exc, OpenAIAPIConnectionError):
            return ModelFailure(f"Azure OpenAI connection failure: {exc}", details=details)
        if isinstance(exc, (OpenAIAuthenticationError, OpenAIBadRequestError, OpenAIPermissionDeniedError, OpenAINotFoundError)):
            return ValidationError(f"Azure OpenAI rejected request: {exc}", details=details)
        if isinstance(exc, OpenAIInternalServerError):
            return ModelFailure(f"Azure OpenAI internal server error: {exc}", details=details)

    # Google Gemini Exceptions
    if isinstance(exc, ResourceExhausted):
        return RateLimit(f"Gemini rate limit encountered during LLM invocation: {exc}", details=details)
    if isinstance(exc, DeadlineExceeded):
        return Timeout(f"Gemini request timed out during LLM invocation: {exc}", details=details)
    if isinstance(exc, ServiceUnavailable):
        return ModelFailure(f"Gemini service unavailable error during LLM invocation: {exc}", details=details)
    if isinstance(exc, (Unauthenticated, InvalidArgument, PermissionDenied, NotFound)):
        return ValidationError(f"Gemini rejected the LLM request: {exc}", details=details)
    if isinstance(exc, GoogleInternalServerError):
        return ModelFailure(f"Gemini internal server error during LLM invocation: {exc}", details=details)

    return ModelFailure(f"LLM chain invocation failed: {exc}", details=details)


def invoke_structured(chain, input_dict: Dict[str, Any], retryable: bool = True) -> Any:
    """
    Single choke-point wrapper for invoking an LCEL chain (e.g. `prompt | llm | parser`).
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
