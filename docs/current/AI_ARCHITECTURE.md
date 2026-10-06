# AI Architecture — EduFlow Quiz Pipeline

Updated 2026-10-03. Source-backed: describes the implementation in this repository,
not a plan. Companion docs: [RAG_ARCHITECTURE](RAG_ARCHITECTURE.md),
[AI_PROVIDER_CONFIGURATION](AI_PROVIDER_CONFIGURATION.md), [QUIZ_GENERATION](QUIZ_GENERATION.md),
[QUIZ_EVALUATION](QUIZ_EVALUATION.md).

## Components

```
React SPA (frontend/)                .NET 8 API (backend/)              FastAPI AI service (ai-agent/)
┌───────────────────────┐   JWT    ┌──────────────────────────┐  HTTP   ┌──────────────────────────────┐
│ Pages (Assessments,   │ ───────▶ │ QuizzesController        │ ──────▶ │ POST /api/v1/ai/slides/      │
│  Courses, Dashboard,  │  /api/*  │  GenerateAiQuizCoreAsync │ X-Request│  generate-quiz               │
│  StudentPortal)       │          │ AiController             │  -Id     │ GeminiQuizGenerationService  │
│                       │          │  /api/ai/providers       │ X-Internal│  core/providers.py registry │
│ utils/aiErrors.js     │          │  /api/ai/documents/*     │ -Api-Key │  core/errors.py codes        │
│  (error mapper)       │          │                          │          │  RAG retrieval (ChromaDB)    │
│ AiProviderPicker      │          │ AiGatewayClient          │          │                              │
└───────────────────────┘          │  (HTTP + error mapping)  │          └──────────────────────────────┘
                                   └──────────────────────────┘
                                          │ EF Core
                                          ▼
                                   PostgreSQL/SQLite
                                   Assessment.AiProvider / AiModel
```

- **Frontend**: React 18 + Vite (JSX). Talks only to the .NET API. Never sees an AI key.
- **Backend**: .NET 8, JWT auth with roles `Student | Instructor | Admin`. All quiz and AI
  controller routes are `[Authorize]` at class level; mutating AI routes additionally check
  course ownership (instructor) or admin role.
- **AI service**: Python 3.13 FastAPI, internal-only (requires `X-Internal-Api-Key` =
  `INTERNAL_SERVICE_TOKEN`, injected by the .NET `AiGatewayClient`).

> Note: there is **no LangChain/LangGraph in the codebase** (older README mentions aside).
> The provider abstraction is `ai-agent/core/providers.py` (registry) plus one generation
> service that dispatches to the selected provider's SDK path.

## Generation request flow

1. Instructor clicks generate (provider/model optionally chosen via `AiProviderPicker`).
2. `POST /api/quizzes/generate-ai` (fields: `courseId`, `scopeType/scopeId`, `moduleId`,
   `pdfUrl`, `questionCount`, `provider?`, `model?`, …).
3. `QuizzesController.GenerateAiQuizCoreAsync` runs gates **in order**:
   - **Provider gate**: fetches `GET /api/v1/ai/providers` from the AI service and validates
     the selection (supported → configured → model in allowlist). Failures return stable
     codes (`AI_PROVIDER_NOT_CONFIGURED` 503, `AI_MODEL_NOT_FOUND` 400).
   - **Document gate**: `UPLOADED` → background indexing is scheduled and generation
     continues; `PROCESSING` → 409 `DOCUMENT_NOT_PROCESSED`; `FAILED` → 422
     `DOCUMENT_EXTRACTION_FAILED`.
   - **In-flight gate**: one generation per (user, course, scope, module, count) at a time →
     409 `AI_GENERATION_IN_PROGRESS` prevents duplicate quizzes.
4. `AiGatewayClient.GenerateQuizAsync` forwards the payload plus `X-Request-Id`
   (the ASP.NET `TraceIdentifier`) to the AI service.
5. The AI service resolves provider/model, builds grounded context (file text, DB module
   context, or RAG retrieval), calls the LLM with `response_format=json`, validates the
   schema/content, and retries **once** feeding validation errors back (MAX_ATTEMPTS = 2).
6. The .NET side persists the quiz as `Draft`, stores `Assessment.AiProvider`/`AiModel`
   (migration `AddAssessmentAiMetadata`), logs a structured success line, and returns the quiz.
7. Instructor reviews → publishes → student flow runs (see [QUIZ_EVALUATION](QUIZ_EVALUATION.md)).

## Error contract

Every AI-pathway failure carries a stable shape — no stack traces, no raw upstream bodies:

```json
{
  "status": "error",
  "code": "AI_PROVIDER_NOT_CONFIGURED",
  "message": "The selected AI provider \"Groq\" requires GROQ_API_KEY. Please configure the provider before generating a quiz.",
  "detail": "…human-readable fallback…",
  "details": "Groq is not configured.",
  "requestId": "…",
  "traceId": "…"
}
```

Codes live in `ai-agent/core/errors.py` (Python) and are mirrored by the frontend mapper
`frontend/src/utils/aiErrors.js`:

| Code | HTTP | Meaning |
|---|---|---|
| `AI_PROVIDER_NOT_CONFIGURED` | 503 | Provider unknown or its credentials/env missing |
| `AI_PROVIDER_UNAVAILABLE` | 503 | AI service down / provider network failure |
| `AI_MODEL_NOT_FOUND` | 400/502 | Model outside the server-side allowlist or rejected upstream |
| `AI_AUTHENTICATION_FAILED` | 502 | Provider rejected its API key (never the user's session) |
| `AI_RATE_LIMITED` | 429 | Provider quota / rate limit |
| `AI_TIMEOUT` | 504 | No answer within `AiService:TimeoutSeconds` (default 120s) — the pipeline is slow, not down |
| `AI_REQUEST_FAILED` | 502 | Transport or unclassified provider error |
| `AI_GENERATION_FAILED` | 500+ | Generation failed after validation retries |
| `AI_INVALID_RESPONSE` | 502 | Empty/unparseable model output |
| `AI_OUTPUT_VALIDATION_FAILED` | 502 | Generated quiz failed schema/grounding validation |
| `AI_GENERATION_IN_PROGRESS` | 409 | Duplicate concurrent generation blocked |
| `RAG_CONTEXT_NOT_FOUND` | 422 | No indexed course material for a required-material quiz |
| `RAG_RETRIEVAL_FAILED` | 502 | Vector search failed |
| `DOCUMENT_NOT_PROCESSED` | 409 | PDF still PROCESSING |
| `DOCUMENT_EXTRACTION_FAILED` | 422 | PDF extraction/indexing failed |
| `EMBEDDING_FAILED` | 502 | Embedding generation failed |
| `QUIZ_VALIDATION_FAILED` / `QUIZ_SAVE_FAILED` / `QUIZ_ASSIGNMENT_FAILED` / `QUIZ_EVALUATION_FAILED` | 4xx/5xx | Quiz lifecycle failures |

## Correlation IDs

- Client → API: `X-Correlation-ID` (echoed); API → AI service: `X-Request-Id`.
- The id appears in the error body (`requestId`/`traceId`), in structured server logs
  (`generate_ai_quiz status=… requestId= … durationMs=…`, `quiz_generation …`), and in the
  frontend message as `(Reference: …)` so one id finds the full story across services.

## Structured logging (no secrets)

- .NET: `generate_ai_quiz status=ok|error … requestId= provider= model= courseId= quizId= questions= durationMs=`.
- Python: `quiz_generation status=ok|error|validation_failed requestId= provider= courseId= questions= durationMs=`.
- Provider errors are logged with code/class only; API key values never enter logs, error
  bodies, responses, or telemetry. The `/api/v1/ai/providers` payload contains
  `configured: bool` and variable **names**, never values.

## Security boundaries

- Credentials live only in `ai-agent/.env` / appsettings (git-ignored). `.env.example` holds
  placeholders only.
- `Assessment` correct answers are never serialized to students (`ToLearnerQuestionDto`);
  grading is server-side; attempts are isolated by `AssessmentAccessService` and the
  server-side session identity (client-supplied student ids are ignored).
