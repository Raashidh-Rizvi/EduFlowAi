# Current API Contracts

Source-inspected Learning/RAG contracts as of 2026-09-28; see [authority](../00_SOURCE_OF_TRUTH.md). This is a focused verified inventory, not an assertion that all project routes were audited.

## Implemented routes

| Public ASP.NET route | Internal Python route | Contract |
|---|---|---|
| `POST /api/aireview/learn` | `POST /api/v1/agent/learn` | LearningRequest → LearningResponse |
| `POST /api/aireview/coach/chat` | `POST /ai-coach-chat` | message/session/scope → reply + citations + source |
| `POST /api/aireview/rag/chat` | `POST /api/v1/rag/chat` | question/session/scope → answer + citations + source |
| `GET /api/aireview/learning/slide-decks` | `GET /api/v1/rag/slide-decks` | `{slide_decks: [...]}` from indexed metadata |
| No public indexing proxy documented here | `POST /api/v1/rag/index-pdf` | file_path, course_id, optional module_id → indexing result |
| — | `GET /health`, `GET /api/v1/ai/status` | Python health/status |
| — | `POST /api/v1/ai/slides/categorize-topics` | Existing slide categorization; not Learning breakdown |
| — | `POST /api/v1/ai/slides/generate-quiz` | Existing slide quiz generation; distinct agent completion not certified |

Learning/chat gateway actions use authenticated identity rather than trusting the body's student ID. Read actual controllers for authorization boundaries. Responses are not wrapped in a universal `{success,data,error}` envelope; the gateway preserves upstream JSON/status.

## Learning request and response

`source_file` is required and nonblank. `request_type` is exactly `breakdown`, `plan` or `explain`. Optional fields: `student_id`, `session_id` (1–128 characters), `course_id`, `sub_lecture_id`, `topic`, `message`.

Use the selected deck's source/course. Whole-lecture plan omits topic/sub-lecture. Topic actions send the returned section ID and, when selected, its exact topic. Do not invent or substitute section identifiers.

Response fields:

- `request_type`, `source_file`, `source` (normally `learning_agent`).
- `sub_lectures`: each has `id`, `title`, `page_start`, `page_end`, `topics`, `source_file`.
- `plan`: nullable `{title, sessions}`. Each session has `session_number`, `title`, `tasks`, `estimated_minutes`, nullable `sub_lecture_id`.
- `answer`: nullable explanation text; `citations`: source/page/preview/relevance objects.

Chat bridge returns `reply`; RAG chat returns `answer`. Preserve citation `source_file` and `page_number`. Deck entries include source_file, course_id, module_id, total_chunks and display_title.

Learning validation errors return 422; missing indexed lecture returns 404; generation/service failures return a retryable 503. The gateway maps its upstream timeout to 504. The frontend displays the error instead of inventing educational content. These are implemented behaviors, not claims of exhaustive fault coverage.

## Planned, not implemented endpoint claims

The original plan's `/api/v1/agent/quiz`, `/api/v1/tools/breakdown`, `/api/v1/tools/planner`, `/api/v1/tools/explain`, and `/api/v1/sub-lectures/{source_file}` are **not registered as current routes in main.py**. Learning tools are called internally. Do not implement duplicate APIs merely to match old examples.

Contracts live in [Python schemas](../../ai-agent/models/schemas.py), [FastAPI routes](../../ai-agent/main.py), [ASP.NET controller](../../backend/EduFlow.Api/Controllers/AiReviewController.cs), [gateway](../../backend/EduFlow.Infrastructure/Services/AiGatewayClient.cs), and [frontend service](../../frontend/src/services/aiService.js).
