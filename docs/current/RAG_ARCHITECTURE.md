# RAG Architecture — PDF → Vectors → Grounded Generation

Updated 2026-10-03. Source-backed for `ai-agent/rag/*` and the .NET indexing triggers.
Complements (does not replace) [RAG_PIPELINE](RAG_PIPELINE.md).

## Pipeline

```
Instructor PDF (module.pdf under wwwroot/uploads)
   │  upload / module save (CoursesController) or generate-time scheduling
   ▼
POST /api/v1/ai/index-pdf  (internal API key; also POST /api/ai/documents/index from UI)
   │  state → PROCESSING
   ▼
parser.py   — extract text per page (page_number preserved)
   ▼
chunker.py  — sliding chunks with metadata
   ▼
embedding   — EMBEDDING_PROVIDER=default: local ONNX all-MiniLM-L6-v2 (384-dim)
              EMBEDDING_PROVIDER=gemini: models/gemini-embedding-001 (needs GEMINI_API_KEY)
   ▼
ChromaDB    — PersistentClient, collection eduflow_materials_<embedding-provider>
   │  state → READY (+ embedding provenance) or FAILED (+ reason)
   ▼
retriever   — where={"course_id": …} [and {"module_id": …}] similarity search
   ▼
LLM prompt  — grounded quiz question generation
```

## Chunk metadata

Every chunk carries course-scoped metadata (see `rag/chunker.py` `to_metadata()`):

```json
{
  "source_file": "lecture.pdf",
  "page_number": 12,
  "chunk_index": 31,
  "course_id": "<course guid>",
  "module_id": "<module guid or ''>",
  "section_title": "…when known…",
  "embedding_provider": "default",
  "embedding_model": "…",
  "embedding_version": "v1"
}
```

Stable chunk id: `<course_id>_<module_id|nomod>_<page>_<chunk_index>`, so re-indexing the
same file replaces rather than duplicates.

**Retrieval is always course-scoped** (`vector_store.py` enforces `where={"course_id": …}`;
module filter applies when a module is known), so one course's material can never ground
another course's quiz.

## Document states

Registry: `ai-agent/data/document_status.json` (per file, written under a lock).
States: **UPLOADED → PROCESSING → READY | FAILED**.

| State | Meaning | Generation gate |
|---|---|---|
| UPLOADED | file exists, not yet indexed | background indexing scheduled; generation proceeds with fallback context |
| PROCESSING | extraction/embedding in flight | blocked — 409 `DOCUMENT_NOT_PROCESSED` |
| READY | chunks indexed | allowed |
| FAILED | extraction/embedding error (reason stored, shown only in logs) | blocked — 422 `DOCUMENT_EXTRACTION_FAILED` |

`GET /api/ai/documents/status?fileUrl=…` exposes the state plus embedding provenance:
`embeddingProvider`, `embeddingModel`, `embeddingVersion`, `reindexRecommended`
(true when the indexed provenance differs from the currently configured embedding model —
i.e., never silently mix vectors from different models in one collection).

## Indexing triggers

1. `CoursesController.CreateModule` / `UpdateModule` (when `pdfUrl` changed) →
   fire-and-forget `ScheduleModuleIndexing`.
2. Generation-time: the document gate schedules indexing when a file is UPLOADED.
3. Manual: `POST /api/ai/documents/index` `{ moduleId, fileUrl }` (owner/admin) — the
   re-index path after changing `EMBEDDING_MODEL`/`EMBEDDING_VERSION`.

## Quiz-grounding retrieval

When the deck text exceeds `MAX_CONTENT_CHARS` (16 000) — or the file text is unavailable —
generation switches to retrieval instead of truncation (`_build_content_context`):

- `RAG_QUIZ_TOP_K` (default 8) candidates, dropped below `RAG_QUIZ_MIN_SIMILARITY`
  (default 0.2),
- per-page diversity cap of 2 chunks/page so one page cannot dominate,
- the result is never fatal: on any retrieval error the call logs `RAG_RETRIEVAL_FAILED`
  context and falls back to the module description/DB context, keeping generation alive
  without pretending retrieved content existed.

Slides cited by generated questions are recorded per question
(`slideCitation` in `metadataJson`) so instructors can audit grounding.

## Embedding configuration

| Variable | Purpose |
|---|---|
| `EMBEDDING_PROVIDER` | `default` (local ONNX) or `gemini` |
| `EMBEDDING_MODEL` | model name recorded in provenance (and used for Gemini embeddings) |
| `EMBEDDING_VERSION` | bump to invalidate provenance and trigger `reindexRecommended` |
| `CHROMA_PERSIST_DIR` | vector store location override |
