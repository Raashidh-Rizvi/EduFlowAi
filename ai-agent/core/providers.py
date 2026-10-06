"""
EduFlow AI - Provider registry and validation
=============================================

Central place that knows:
- which AI providers exist (extendable: add an entry, not a code branch),
- which credentials each one needs,
- which models each one may serve (server-side allowlist),
- whether a provider is currently configured (for the health endpoint and for
  clear "not configured" errors before any LLM call is attempted).

Nothing in here ever returns a credential value — only `configured: bool` and
model names — so the status endpoint is safe to expose to the frontend.
"""

import os
from typing import Dict, List, Optional, Tuple

from core.errors import AI_MODEL_NOT_FOUND

PROVIDERS: Dict[str, Dict[str, object]] = {
    "gemini": {
        "label": "Gemini",
        "key_env": "GEMINI_API_KEY",
        "model_env": "GEMINI_MODEL",
        "models_env": "GEMINI_MODELS",
        "default_model": "models/gemini-flash-latest",
        "extra_required_env": [],
    },
    "groq": {
        "label": "Groq",
        "key_env": "GROQ_API_KEY",
        "model_env": "GROQ_MODEL",
        "models_env": "GROQ_MODELS",
        "default_model": "openai/gpt-oss-120b",
        "extra_required_env": [],
    },
    "azure": {
        "label": "Azure OpenAI",
        "key_env": "AZURE_OPENAI_API_KEY",
        "model_env": "AZURE_OPENAI_CHAT_DEPLOYMENT",
        "models_env": "AZURE_OPENAI_MODELS",
        "default_model": "",
        # Either endpoint style satisfies Azure; both are checked together with the key.
        "extra_required_env": [],  # handled specially: endpoint OR base url
    },
}

# A few common spellings are accepted from requests/older config files.
PROVIDER_ALIASES = {
    "google": "gemini",
    "gemini-flash": "gemini",
    "grok": "groq",
    "azure_openai": "azure",
    "azure-openai": "azure",
    "azureopenai": "azure",
}

# QUIZ_LLM_PROVIDER default when a request does not select a provider.
DEFAULT_PROVIDER_ENV = "QUIZ_LLM_PROVIDER"

# Alternative spellings accepted from docs/older config files, checked only
# after the canonical name. Keeps "AI_PROVIDER=groq"-style examples working
# instead of being silently ignored.
ENV_ALIASES: Dict[str, Tuple[str, ...]] = {
    "QUIZ_LLM_PROVIDER": ("AI_PROVIDER",),
    "GEMINI_API_KEY": ("GOOGLE_API_KEY",),
    "AZURE_OPENAI_CHAT_DEPLOYMENT": ("AZURE_OPENAI_DEPLOYMENT",),
}


def normalize_provider(raw: Optional[str]) -> Optional[str]:
    """Lower-cased, alias-resolved provider name (or None when not supplied)."""
    if not raw or not raw.strip():
        return None
    name = raw.strip().lower()
    return PROVIDER_ALIASES.get(name, name)


def supported_providers() -> List[str]:
    return list(PROVIDERS.keys())


def provider_label(provider: str) -> str:
    meta = PROVIDERS.get(provider)
    return str(meta["label"]) if meta else provider


def _env(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if value:
        return value
    for alias in ENV_ALIASES.get(name, ()):
        value = (os.environ.get(alias) or "").strip()
        if value:
            return value
    return ""


def _azure_endpoint() -> str:
    return _env("AZURE_OPENAI_ENDPOINT") or _env("AZURE_OPENAI_BASE_URL")


def missing_credentials(provider: str) -> List[str]:
    """Names of the environment variables that are required but unset.

    Returns variable *names* only — never values.
    """
    meta = PROVIDERS.get(provider)
    if meta is None:
        return []
    missing = []
    if not _env(str(meta["key_env"])):
        missing.append(str(meta["key_env"]))
    if provider == "azure" and not _azure_endpoint():
        missing.append("AZURE_OPENAI_ENDPOINT (or AZURE_OPENAI_BASE_URL)")
    for extra in meta.get("extra_required_env", []):  # type: ignore[union-attr]
        if not _env(str(extra)):
            missing.append(str(extra))
    return missing


def is_configured(provider: str) -> bool:
    return provider in PROVIDERS and not missing_credentials(provider)


def configured_models(provider: str) -> List[str]:
    """Server-side allowlist of models/deployments this provider may serve.

    `<MODELS_ENV>` (comma separated) wins; otherwise the single model from
    `<MODEL_ENV>` (or its default) is the allowlist. Azure may legitimately
    have an empty allowlist when the deployment is discovered at runtime.
    """
    meta = PROVIDERS.get(provider)
    if meta is None:
        return []
    raw = _env(str(meta["models_env"]))
    if raw:
        models = [m.strip() for m in raw.split(",") if m.strip()]
        if models:
            return models
    single = _env(str(meta["model_env"])) or str(meta["default_model"])
    return [single] if single else []


def default_model(provider: str) -> str:
    models = configured_models(provider)
    if models:
        return models[0]
    return str(PROVIDERS.get(provider, {}).get("default_model", ""))


def resolve_provider_model(
    requested_provider: Optional[str], requested_model: Optional[str]
) -> Tuple[str, str]:
    """Validate a (provider, model) selection from a request.

    Falls back to the server-configured default provider when the request does
    not name one. Raises core.errors exceptions with stable codes:

    - unknown provider            -> AI_PROVIDER_NOT_CONFIGURED (+ supported list)
    - provider without credentials-> AI_PROVIDER_NOT_CONFIGURED (+ missing vars)
    - model not in the allowlist  -> AI_MODEL_NOT_FOUND (+ configured models)
    """
    from core.errors import ProviderNotConfigured
    from core.errors import AiServiceError

    provider = normalize_provider(requested_provider) or normalize_provider(
        _env(DEFAULT_PROVIDER_ENV)
    ) or "gemini"

    if provider not in PROVIDERS:
        raise ProviderNotConfigured(
            f'The selected AI provider "{requested_provider}" is not supported.',
            details=f"Supported providers: {', '.join(supported_providers())}. "
                    "Configure one of them in ai-agent/.env before generating a quiz.",
        )

    missing = missing_credentials(provider)
    if missing:
        label = provider_label(provider)
        raise ProviderNotConfigured(
            f'The selected AI provider "{label}" requires {", ".join(missing)}. '
            "Please configure the provider before generating a quiz.",
            details=f"{label} is not configured.",
        )

    allowlist = configured_models(provider)
    model = (requested_model or "").strip()
    if model:
        if model not in allowlist:
            raise AiServiceError(
                f'The model "{model}" is not available for {provider_label(provider)}.',
                details=("Configured models: " + ", ".join(allowlist)
                         if allowlist
                         else "No model is configured for this provider on the server."),
                code=AI_MODEL_NOT_FOUND,
                status_code=400,
            )
        return provider, model

    return provider, default_model(provider)


def provider_status_list() -> List[Dict[str, object]]:
    """Health payload for GET /api/v1/ai/providers — never contains secrets."""
    active = normalize_provider(_env(DEFAULT_PROVIDER_ENV)) or "gemini"
    out: List[Dict[str, object]] = []
    for name, meta in PROVIDERS.items():
        missing = missing_credentials(name)
        out.append({
            "provider": name,
            "label": meta["label"],
            "configured": not missing,
            "missing": missing,
            "models": configured_models(name) if not missing else [],
            "defaultModel": default_model(name) if not missing else None,
            "active": name == active,
        })
    return out
