# AI Provider Configuration

Updated 2026-10-03. Source-backed: `ai-agent/core/providers.py`,
`ai-agent/agents/gemini_quiz_generation_service.py`, `backend/EduFlow.Api/Controllers/AiController.cs`.

## The provider abstraction

One registry, one generation path — providers are **data, not branches**:

```
core/providers.py
PROVIDERS = {
  gemini: { label, key_env: GEMINI_API_KEY,  model_env: GEMINI_MODEL,             models_env: GEMINI_MODELS },
  groq:   { label, key_env: GROQ_API_KEY,    model_env: GROQ_MODEL,               models_env: GROQ_MODELS },
  azure:  { label, key_env: AZURE_OPENAI_API_KEY, model_env: AZURE_OPENAI_CHAT_DEPLOYMENT,
            models_env: AZURE_OPENAI_MODELS, endpoint: AZURE_OPENAI_ENDPOINT | AZURE_OPENAI_BASE_URL },
}
```

`GeminiQuizGenerationService.generate_quiz(request, context)` is the single generation
interface; the provider choice only selects which SDK path (`_call_gemini_json` /
`_call_groq_json` / `_call_azure_json`) executes the identical prompt + validation +
retry machinery. Adding a provider = one registry entry + one caller method, no duplicated
quiz logic.

## Where configuration lives

All server-side, in `ai-agent/.env` (git-ignored). See the repo-root `.env.example`
(placeholders only).

### Selecting the default provider / model

```env
QUIZ_LLM_PROVIDER=groq          # gemini | groq | azure   (alias: AI_PROVIDER)
QUIZ_LLM_MODEL=openai/gpt-oss-120b   # optional (alias: AI_MODEL)
```

Precedence for a generation request:

1. per-request `provider` / `model` (instructor UI picker or API payload) — validated against
   the registry and allowlist;
2. `QUIZ_LLM_PROVIDER` / `QUIZ_LLM_MODEL` env;
3. provider built-in default model.

There is **no silent fallback**: a request naming an unconfigured provider fails with
`AI_PROVIDER_NOT_CONFIGURED` naming the missing variable, and a model outside the allowlist
fails with `AI_MODEL_NOT_FOUND` listing the allowed models.

### Per-provider credentials

| Provider | Required | Optional |
|---|---|---|
| Gemini | `GEMINI_API_KEY` (alias `GOOGLE_API_KEY`) | `GEMINI_MODEL`, `GEMINI_MODELS` (comma allowlist) |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL`, `GROQ_MODELS` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` (or `AZURE_OPENAI_BASE_URL`) | `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_CHAT_DEPLOYMENT` (alias `AZURE_OPENAI_DEPLOYMENT`), `AZURE_OPENAI_MODELS` |

Accepted aliases are declared once in `core/providers.py: ENV_ALIASES` and consulted only
after the canonical name, so docs examples (`AI_PROVIDER=groq`, `GOOGLE_API_KEY=…`,
`AZURE_OPENAI_DEPLOYMENT=…`) work instead of being silently ignored.

### Model allowlist

`<PROVIDER>_MODELS` (comma separated) is the server-side allowlist exposed to the UI and
enforced before any network call; otherwise the single `<PROVIDER>_MODEL` (or built-in
default) is the allowlist. Azure may have an empty allowlist — a deployment is then
discovered from the Azure resource at call time.

## Validation & status

- `GET /api/v1/ai/providers` (AI service, internal key) →
  `[{ provider, label, configured, missing: [VAR_NAMES], models, defaultModel, active }]`.
  **Never contains secret values** — only variable names.
- `GET /api/ai/providers` (same payload, JWT `Instructor`/`Admin`) is what the frontend
  `AiProviderPicker` consumes to grey out unconfigured providers and show "Requires: VAR".
- Server-side validation runs before every generation (backend provider gate + Python
  `resolve_provider_model`), so an unconfigured provider cannot reach the LLM.

Error message shape (stable, actionable, secret-free):

```
AI provider not configured
The selected AI provider "Groq" requires GROQ_API_KEY.
Please configure the provider before generating a quiz.
```

## How do I…? (operations FAQ)

- **Change the active provider**: edit `ai-agent/.env` → `QUIZ_LLM_PROVIDER=<gemini|groq|azure>`
  (set the matching `*_API_KEY`), restart the AI service. Or, without restarting, pick a
  configured provider per request in the generation modal's **AI Provider** selector.
- **Pin/allow a model**: set `<PROVIDER>_MODELS=a,b,c` (allowlist) and/or
  `QUIZ_LLM_MODEL=<default>`; per-request model must be in the allowlist.
- **Check status**: open the provider selector (greyed-out entries list their missing
  variables) or `GET /api/ai/providers`.
- **Generation is slow / `AI_TIMEOUT`**: a grounded 10-question generation routinely takes
  30–90 s depending on the provider. The backend gateway budget is
  `AiService:TimeoutSeconds` (default `120` in `backend/EduFlow.Api/appsettings.json`); past
  it the request fails as **504 `AI_TIMEOUT`** (“the pipeline is slow”), never as
  “service down”. Raise the budget for slower providers, or lower `questionCount`.
- **Add a provider**: add an entry to `PROVIDERS` + one `_call_<name>_json` method; the
  registry, validation, status endpoint and UI picker pick it up automatically.
