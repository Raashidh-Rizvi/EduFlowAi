# Shared RAG Pipeline

[Current authority](../00_SOURCE_OF_TRUTH.md). Atheek M.F. / IT24103933 primarily implemented the existing Simple RAG foundation (`9cd2724`, `b0886af`). Wazni's Learning Agent reuses and extends shared integration/scoping; it does not replace or claim sole ownership of RAG. RAG is not a third agent.

```text
Local PDF → parser → slide-aware chunks → configured embeddings → persistent ChromaDB
Question + scope → query embedding → filtered chunks → Groq/Gemini generation → answer + slide citations
```

[parser.py](../../ai-agent/rag/parser.py) reads document content. [chunker.py](../../ai-agent/rag/chunker.py) retains slide/source metadata. [vector_store.py](../../ai-agent/rag/vector_store.py) stores/retrieves chunks; [rag_service.py](../../ai-agent/rag/rag_service.py) coordinates indexing and answers. Chroma persistence is controlled by `CHROMA_PERSIST_DIR`, normally `./data/chroma_db` relative to the AI service working directory.

Embeddings can use the existing local/default or Gemini configuration. Current Gemini embedding code uses `models/gemini-embedding-001`; older text-embedding-004 examples are historical. Preserve the embedding configuration of an existing index; do not casually switch providers or re-index to follow a guide.

## Upload, indexing and discovery are separate

The current backend upload handler saves a PDF/slide and returns its URL. It does **not** automatically call RAG indexing. An uploaded or saved PDF alone is insufficient for lecture discovery.

`POST /api/v1/rag/index-pdf` receives a local path visible to Python and actual course/module IDs. It parses/chunks/embeds/stores the lecture. `GET /api/v1/rag/slide-decks` groups existing Chroma metadata by source_file; it does not list every backend upload. The browser obtains that list through the ASP.NET gateway.

`setup_check.py` also indexes local PDFs and makes service/provider checks. It is a **mutating setup utility**, not a read-only health probe; its current indexing loop uses `it3012-se` / `lecture-auto`. Do not run it routinely against an already prepared index or mistake those demonstration IDs for universal course ownership.

## Learning scopes

Global Q&A retains existing retrieval behavior. A specific selected lecture uses its exact `source_file`; this is a retrieval boundary, not proof that every enrollment-authorization rule has been audited. Do not describe global retrieval as a verified enrollment permission boundary.

Breakdown reads all selected lecture chunks, validates non-overlapping coverage, assigns source-bound section IDs and caches section metadata. Topic planning uses that section's pages. Explanation uses source/course/sub-lecture retrieval filters and returns citations inside the section. Chat includes the latest scoped conversational history to interpret follow-ups.

Groq/Gemini provide generated answers. Chat can return a clearly identified extractive result when generation fails; structured learning tools instead return an error when they cannot produce valid output. Retrieval may select insufficient introductory material for broad conversational queries. Citations identify the material supplied, not a guarantee that every generated phrase is perfect.

Local indexing is a prerequisite; missing content must not be replaced by unrelated lecture content. [Setup](LOCAL_SETUP_GUIDE.md) and [Learning evidence](../members/member-1-wazni/ai/LEARNING_AGENT_TEST_EVIDENCE.md).
