# Quiz Generation Pipeline

How AI-drafted quizzes flow from slides to a published assessment.

## Overview

- The AI agent (`ai-agent/agents/gemini_quiz_generation_service.py`) drafts questions.
- The .NET backend (`QuizzesController`) stores, validates and publishes them.
- The .NET marking service is the source of truth for marks. AI never grades.
- Every AI draft waits for instructor review before students can see it.

## Generation rules

- Provider is chosen per request, or from env (`QUIZ_LLM_PROVIDER` = `gemini` | `groq` | `azure`).
- Model is set with `QUIZ_LLM_MODEL`.
- Output must match a strict JSON schema.
- No template or fallback questions. If the model fails, the request fails.
- Output is checked with Pydantic plus domain validation, with one retry.
- Questions are grounded in slide and module context.
- Each question cites the slide it came from.

## AI agent endpoint

- `POST /api/v1/ai/slides/generate-quiz` (internal auth required)

## Error codes

Stable `AiServiceError` codes the backend and UI can rely on:

- `AI_PROVIDER_NOT_CONFIGURED`
- `AI_RATE_LIMITED`
- `AI_OUTPUT_VALIDATION_FAILED`

## Quiz lifecycle

`Draft` -> `Published` <-> `Unpublished` -> `Archived`

| Action | Endpoint | Roles |
| --- | --- | --- |
| Create | `POST /api/quizzes` | Instructor, Admin |
| Upload quiz | `POST /api/quizzes/upload-quiz` | Instructor, Admin |
| Update | `PUT /api/quizzes/{id}` | Instructor, Admin |
| Delete | `DELETE /api/quizzes/{id}` | Instructor, Admin |
| Validate | `POST /api/quizzes/{id}/validate` | Instructor, Admin |
| Publish | `POST /api/quizzes/{id}/publish` | Instructor, Admin |
| Unpublish | `POST /api/quizzes/{id}/unpublish` | Instructor, Admin |
| Archive | `POST /api/quizzes/{id}/archive` | Instructor, Admin |
| Duplicate | `POST /api/quizzes/{id}/duplicate` | Instructor, Admin |

## Read endpoints

- `GET /api/quizzes/{id}`
- `GET /api/quizzes/course/{courseId}`
- `GET /api/quizzes/scope/{scopeType}/{scopeId}`
- `GET /api/v1/content/{scopeType}/{scopeId}/quizzes`
- `GET /api/quizzes/ai-status` (also `/api/v1/ai/status`)

All routes are also available under `/api/v1/quizzes`.

## Validation and publishing

- `validate` returns `isValid`, `errors`, `warnings`, `validatedQuestionCount`, `totalMarks`.
- Duplicate question text is reported as a warning.
- `publish` re-runs the same checks and returns 400 with `errors` if any fail.
- Only the quiz owner or an Admin can validate, publish or unpublish.
- Publishing writes an `Assessment.Published` audit entry.

## Tests

- Backend: `AssessmentQuizTests`, `QuizPublicationTests`, `AiGenerationPipelineTests`
- AI agent: `ai-agent/tests/test_quiz_generation.py`

```bash
cd ai-agent && pytest tests/test_quiz_generation.py
dotnet test backend/EduFlow.slnx --filter "FullyQualifiedName~Quiz"
```
