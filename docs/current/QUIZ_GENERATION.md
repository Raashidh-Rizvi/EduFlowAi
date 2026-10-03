# Quiz Generation — Pipeline & Validation

Updated 2026-10-03. Source-backed: `QuizzesController.GenerateAiQuizCoreAsync`,
`ai-agent/main.py`, `ai-agent/agents/gemini_quiz_generation_service.py`.
Evaluation of generated quizzes: [QUIZ_EVALUATION](QUIZ_EVALUATION.md).

## Entry points

| Caller | Endpoint | Notes |
|---|---|---|
| Assessments page (create modal) | `POST /api/quizzes/generate-ai` | provider/model picker attached |
| Courses page (SlideQuest modal) | same | non-blocking UX (toast while generating) |
| Instructor dashboard (remediation alert) | same | 4-question recovery quiz, default provider |
| Regenerate one question | `POST /api/quizzes/questions/{id}/regenerate` | never substitutes a canned question on failure |

Request fields: `courseId`, `scopeType/scopeId`, `moduleId`, `pdfUrl`/`slideUrl`,
`topic`, `moduleTitle`, `difficulty`, `questionCount`, `timeLimitMinutes`,
`passingScorePercent`, `xpReward`, `coinReward`, `questionTypes[]`, and optional
`provider` / `model`.

## Server-side gates (in order)

1. **AuthN/AuthZ** — `[Authorize]` + course ownership (instructor/admin).
2. **Idempotency** — per (user, course, scope, module, count) in-flight lock →
   409 `AI_GENERATION_IN_PROGRESS` on duplicate concurrent submits; lock released in
   `finally`. One submission can never create two quizzes.
3. **Provider gate** — provider catalog fetched from the AI service; selection validated
   (supported → configured → model in allowlist). `AI_PROVIDER_NOT_CONFIGURED` (503) /
   `AI_MODEL_NOT_FOUND` (400) with the supported-provider list or missing variable names.
   Catalog unreachable → 503 `AI_PROVIDER_UNAVAILABLE`.
4. **Document gate** — `PROCESSING` → 409 `DOCUMENT_NOT_PROCESSED`;
   `FAILED` → 422 `DOCUMENT_EXTRACTION_FAILED`;
   `UPLOADED` → schedule background indexing, continue.
5. **Dispatch** — payload + `X-Request-Id` forwarded to `POST /api/v1/ai/slides/generate-quiz`.

## AI-service pipeline

```
resolve provider/model (registry + allowlist, per-request ContextVars isolated per call)
   ▼
build context: file text  →  else RAG retrieval (top-k, min-similarity, page diversity)
                 →  else DB module context  →  else RAG_CONTEXT_NOT_FOUND (required-material quizzes)
   ▼
LLM call, response_format = json (structured output)
   ▼
parse + validate (question count, type coverage, options ≥ 2, correct answer present,
                  points, no duplicate prompts, grounding citations)
   ▼
valid? ── no ──▶ bounded retry (MAX_ATTEMPTS = 2: initial + one corrective attempt fed
   │            the exact validation errors) ── still invalid? ──▶
   yes                                                       502 AI_OUTPUT_VALIDATION_FAILED
   ▼                                                         (nothing saved)
return quiz payload
```

Validation failure after the single retry never persists a quiz. Empty/unparseable model
output maps to `AI_INVALID_RESPONSE`; provider SDK/network errors are classified into
`AI_RATE_LIMITED` / `AI_AUTHENTICATION_FAILED` / `AI_MODEL_NOT_FOUND` /
`AI_PROVIDER_UNAVAILABLE` / `AI_REQUEST_FAILED` (429/401/404/5xx/timeout heuristics).

## Persistence & provenance

- The .NET side saves the quiz as **Draft** (`QuizStatus.Draft`) — instructor review is
  required before publish.
- `Assessment.AiProvider` / `Assessment.AiModel` record what actually generated it
  (response `source`/`model` preferred, request selection as fallback);
  EF migration `AddAssessmentAiMetadata` adds the columns (additive, data-preserving).
- Upstream error bodies are parsed into `{code,message,detail,details,requestId}` by
  `AiGatewayClient.WrapUpstreamError` — raw HTML/stack traces are never forwarded
  (verified by tests: an nginx 502 body never leaks).
- Structured logs on both sides carry `requestId`, provider, model, question count and
  `durationMs`.

## Frontend states

- **Provider/model** — `AiProviderPicker` loads `/api/ai/providers`; unconfigured providers
  are labelled and disabled from success, missing variables shown by name.
- **Loading** — generate buttons disable and show progress copy during the request
  ("Synthesizing Grounded Quiz with RAG AI…", "Synthesizing Strict RAG Questions…",
  remediation button spinner); the Assessments toast shows a live elapsed timer.
- **Errors** — `utils/aiErrors.js` maps `code → {title, message, color}` with a
  `(Reference: <traceId>)` suffix; the modal states "Nothing was saved. Your existing quiz
  draft is unchanged." No stack traces, raw payloads, or misleading token-limit banners.
