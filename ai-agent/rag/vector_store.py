"""
===============================================================================
EduFlow AI - Persistent ChromaDB Vector Store (vector_store.py)
===============================================================================
WHAT THIS FILE DOES:
1. Supports TWO embedding strategies:
   - "default": Fast, lightweight local ONNX embedding (all-MiniLM-L6-v2).
                Runs 100% offline with zero extra RAM or API key needed.
   - "gemini" : Google Cloud large-vocabulary model (gemini-embedding-001).
                Runs on Google servers with zero local RAM load.
2. Persists vectors locally on disk in data/chroma_db/.
3. Enforces strict COURSE-SCOPED FILTERING (where={"course_id": ...}).
4. Easily switches between embedding types via EMBEDDING_PROVIDER in .env.
5. Chroma Cloud mode (CHROMA_API_KEY set): one collection per course, each with a
   Schema holding dense (Chroma Cloud Qwen) + sparse (Chroma Cloud Splade) indexes,
   searched with hybrid Reciprocal Rank Fusion (RRF).
===============================================================================
"""

import logging
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

import chromadb
from chromadb.config import Settings
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings
from chromadb import Schema, SparseVectorIndexConfig, VectorIndexConfig
from chromadb.execution.expression import GroupBy, K, Knn, MinK, Rrf, Search
from rag.chunker import DocumentChunk

logger = logging.getLogger("EduFlow-VectorStore")

# Default path where ChromaDB saves files on disk (Vercel Functions can only write to /tmp)
DEFAULT_CHROMA_DIR = (
    "/tmp/eduflow/chroma_db" if os.environ.get("VERCEL")
    else os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db")
)


def _env(name: str) -> str:
    """Env value, treating an unfilled "<...>" template placeholder as unset."""
    value = os.environ.get(name, "").strip()
    return "" if value.startswith("<") else value


EMBEDDING_BATCH_SIZE = 100
EMBEDDING_TIMEOUT_MS = 30_000

# Chroma Cloud: one collection per course (courses never share chunks), hybrid dense + sparse.
CLOUD_COLLECTION_PREFIX = "eduflow_course_"
CLOUD_SHARED_COURSE = "shared"          # chunks indexed without a course_id
CLOUD_EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B"
SPARSE_KEY = "sparse_embedding"
CLOUD_GET_PAGE = 250                    # page size for full-collection reads
CLOUD_KNN_LIMIT = 64                    # candidates per dense/sparse ranking before fusion
MAX_CHUNKS_PER_SLIDE = 2                # GroupBy: overlapping chunks of one slide are near-duplicates
MAX_DOCUMENT_BYTES = 16 * 1024 - 512    # Chroma's 16 KiB document limit, with headroom
QWEN_TASK = "lecture_qa"


def cloud_collection_name(course_id: Optional[str]) -> str:
    """Collection names allow [a-zA-Z0-9._-] and must start/end alphanumeric."""
    raw = (course_id or "").strip() or CLOUD_SHARED_COURSE
    safe = "".join(ch if ch.isalnum() or ch in "._-" else "-" for ch in raw).strip("._-")
    return f"{CLOUD_COLLECTION_PREFIX}{safe or CLOUD_SHARED_COURSE}"[:200]


def build_cloud_schema() -> Schema:
    """Dense Qwen embeddings (cosine) on the default embedding key + Splade sparse index."""
    from chromadb.utils.embedding_functions import (
        ChromaCloudQwenEmbeddingFunction, ChromaCloudSpladeEmbeddingFunction,
    )
    from chromadb.utils.embedding_functions.chroma_cloud_qwen_embedding_function import (
        ChromaCloudQwenEmbeddingModel, ChromaCloudQwenEmbeddingTarget,
    )
    dense_ef = ChromaCloudQwenEmbeddingFunction(
        model=ChromaCloudQwenEmbeddingModel.QWEN3_EMBEDDING_0p6B,
        task=QWEN_TASK,
        instructions={QWEN_TASK: {
            ChromaCloudQwenEmbeddingTarget.DOCUMENTS: "",
            ChromaCloudQwenEmbeddingTarget.QUERY:
                "Given a student's question, retrieve lecture slide passages that answer it",
        }},
    )
    schema = Schema()
    schema.create_index(config=VectorIndexConfig(space="cosine", embedding_function=dense_ef))
    schema.create_index(
        config=SparseVectorIndexConfig(source_key=K.DOCUMENT, embedding_function=ChromaCloudSpladeEmbeddingFunction()),
        key=SPARSE_KEY,
    )
    return schema


def split_oversized(text: str, limit: int = MAX_DOCUMENT_BYTES) -> List[str]:
    """Line-based split of text over Chroma's per-document size limit (chunker output is ~1.8 KB)."""
    if len(text.encode("utf-8")) <= limit:
        return [text]
    parts, current = [], ""
    for line in text.splitlines(keepends=True):
        while len(line.encode("utf-8")) > limit:          # a single giant line: hard cut
            head = line.encode("utf-8")[:limit].decode("utf-8", "ignore")
            if current:
                parts.append(current)
                current = ""
            parts.append(head)
            line = line[len(head):]
        if len((current + line).encode("utf-8")) > limit:
            parts.append(current)
            current = ""
        current += line
    if current:
        parts.append(current)
    return [part for part in parts if part.strip()]


class DirectGeminiEmbeddingFunction(EmbeddingFunction):
    """
    Direct Google Gemini Embedding Function without buggy third-party headers wrapper.
    Uses Google Cloud high-dimension embeddings.
    """
    def __init__(self, api_key: str, model_name: str = "models/gemini-embedding-001"):
        self.api_key = api_key
        self.model_name = model_name
        from google import genai
        from google.genai import types
        # Bounded timeout so a stalled embedding call cannot hang indexing or chat requests.
        self._client = genai.Client(api_key=self.api_key, http_options=types.HttpOptions(timeout=EMBEDDING_TIMEOUT_MS))

    def __call__(self, input: Documents) -> Embeddings:
        # One request per batch instead of one per chunk (the API accepts up to 100 contents per call).
        embeddings = []
        texts = list(input)
        for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
            res = self._client.models.embed_content(
                model=self.model_name,
                contents=texts[start:start + EMBEDDING_BATCH_SIZE]
            )
            embeddings.extend(list(e.values) for e in res.embeddings)
        return embeddings


class ChromaVectorStore:
    """
    Persistent ChromaDB vector database manager with Dual Embedding support:
    1. 'default' (Local ONNX - Zero RAM, Zero API Key)
    2. 'gemini'  (Google Cloud Large Vocabulary gemini-embedding-001)
    """

    def __init__(self, persist_dir: Optional[str] = None, provider: Optional[str] = None):
        """
        STEP 1: INITIALIZE CHROMADB & EMBEDDING FUNCTION
        """
        self.persist_dir = persist_dir or os.environ.get("CHROMA_PERSIST_DIR", DEFAULT_CHROMA_DIR)

        # Step 1.1: Resolve embedding provider ("default" or "gemini")
        self.provider = (provider or os.environ.get("EMBEDDING_PROVIDER", "default")).lower().strip()
        # GOOGLE_API_KEY accepted as a documented alias for GEMINI_API_KEY.
        self.gemini_api_key = (
            os.environ.get("GEMINI_API_KEY", "").strip()
            or os.environ.get("GOOGLE_API_KEY", "").strip()
        )

        # Step 1.2: Connect to ChromaDB with telemetry turned off
        self.client = self._connect(persist_dir is not None)

        if self.mode == "cloud":
            # Embeddings are computed server-side by Chroma Cloud (Qwen dense + Splade sparse).
            self.active_provider = "chroma-cloud"
            self.embedding_function = None
            self.embedding_model_name = CLOUD_EMBEDDING_MODEL
            self.embedding_version = os.environ.get("EMBEDDING_VERSION") or "v1"
            self._schema = build_cloud_schema()
            self._cloud_collections: Dict[str, Any] = {}
            self.collection = None
            return

        # Step 1.3: Configure the selected embedding function
        self.embedding_function = self._resolve_embedding_function()

        # Embedding provenance: stored with every chunk so a later model/version
        # change can be detected (and the deck re-indexed) instead of silently
        # mixing incompatible vectors.
        if self.active_provider == "gemini" and self.embedding_function is not None:
            self.embedding_model_name = getattr(
                self.embedding_function, "model_name",
                os.environ.get("EMBEDDING_MODEL", "models/gemini-embedding-001"),
            )
        else:
            self.embedding_model_name = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        self.embedding_version = os.environ.get("EMBEDDING_VERSION") or "v1"

        # Step 1.4: Use distinct collection names to prevent dimension mismatch
        collection_name = f"eduflow_materials_{self.active_provider}"

        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=self.embedding_function,
            metadata={"hnsw:space": "cosine"}
        )

    def _connect(self, explicit_dir: bool):
        """
        Chroma Cloud when CHROMA_API_KEY is set (serverless hosts such as Vercel, whose disk is
        ephemeral), a Chroma server when CHROMA_HOST is set, else an on-disk store. An explicit
        persist_dir (tests) always means on-disk.
        """
        settings = Settings(anonymized_telemetry=False)
        if not explicit_dir and _env("CHROMA_API_KEY"):
            self.mode = "cloud"
            return chromadb.CloudClient(
                tenant=_env("CHROMA_TENANT") or None,
                database=_env("CHROMA_DATABASE") or None,
                api_key=_env("CHROMA_API_KEY"),
                settings=settings,
            )
        if not explicit_dir and _env("CHROMA_HOST"):
            self.mode = "http"
            return chromadb.HttpClient(
                host=_env("CHROMA_HOST"),
                port=int(os.environ.get("CHROMA_PORT", "8000")),
                ssl=os.environ.get("CHROMA_SSL", "").lower() in ("1", "true", "yes"),
                settings=settings,
            )
        self.mode = "persistent"
        os.makedirs(self.persist_dir, exist_ok=True)
        return chromadb.PersistentClient(path=self.persist_dir, settings=settings)

    def _resolve_embedding_function(self):
        """
        =========================================================================
        ONE CODE BLOCK TO SWITCH EMBEDDING TYPE:
        01. "gemini"  -> Google Cloud Large Vocabulary Model
        02. "default" -> Built-in Local ONNX (all-MiniLM-L6-v2)
        =========================================================================
        """
        if self.provider == "gemini":
            if self.gemini_api_key:
                try:
                    ef = DirectGeminiEmbeddingFunction(
                        api_key=self.gemini_api_key,
                        model_name=os.environ.get("EMBEDDING_MODEL", "models/gemini-embedding-001")
                    )
                    # Quick validation test
                    ef(["test"])
                    self.active_provider = "gemini"
                    return ef
                except Exception as e:
                    # Loud on purpose: the local model uses a different collection, so slides indexed
                    # with Gemini embeddings will not be found until Gemini embeddings work again.
                    logger.error("Gemini embeddings unavailable (%s); falling back to the local ONNX model and its separate collection.", type(e).__name__)
            else:
                logger.error("EMBEDDING_PROVIDER is 'gemini' but GEMINI_API_KEY is empty; falling back to the local ONNX model and its separate collection.")

        # 01. Default: Fast, local ONNX embedding (runs offline, zero extra RAM)
        self.active_provider = "default"
        return None  # Passing None instructs ChromaDB to use its built-in local ONNX model

    # ------------------------------------------------------------------
    # Collection routing: local mode has one collection, cloud mode one per course.
    # getattr defaults: tests build bare stores via __new__ without running __init__.
    # ------------------------------------------------------------------
    def _is_cloud(self) -> bool:
        return getattr(self, "mode", "persistent") == "cloud"

    def _course_collection(self, course_id: Optional[str]):
        if not self._is_cloud():
            return self.collection
        name = cloud_collection_name(course_id)
        if name not in self._cloud_collections:
            self._cloud_collections[name] = self.client.get_or_create_collection(name=name, schema=self._schema)
        return self._cloud_collections[name]

    def _collections(self, course_id: Optional[str] = None) -> List[Any]:
        """The course's collection, or every course collection when no course is given."""
        if not self._is_cloud():
            return [self.collection]
        if course_id:
            return [self._course_collection(course_id)]
        names = [c.name for c in self.client.list_collections() if c.name.startswith(CLOUD_COLLECTION_PREFIX)]
        for name in names:
            if name not in self._cloud_collections:
                self._cloud_collections[name] = self.client.get_collection(name)
        return [self._cloud_collections[name] for name in names]

    def _get_all(self, collection, where=None, include=("documents", "metadatas")) -> Dict[str, list]:
        """collection.get, paged in cloud mode (Chroma Cloud caps rows per request)."""
        out: Dict[str, list] = {"ids": [], "documents": [], "metadatas": []}
        offset = 0
        while True:
            page_kwargs = {"limit": CLOUD_GET_PAGE, "offset": offset} if self._is_cloud() else {}
            page = collection.get(where=where, include=list(include), **page_kwargs)
            n = len(page["ids"])
            out["ids"].extend(page["ids"])
            out["documents"].extend(page.get("documents") or [None] * n)
            out["metadatas"].extend(page.get("metadatas") or [{}] * n)
            if not page_kwargs or n < CLOUD_GET_PAGE:
                return out
            offset += n

    def add_chunks(self, chunks: List[DocumentChunk]) -> int:
        """
        STEP 2: VECTORIZE & STORE CHUNKS
        Converts text chunks into embeddings and saves them in persistent ChromaDB.
        """
        if not chunks:
            return 0

        # Embedding provenance travels with every chunk (see document_status).
        # getattr: tests build bare stores via __new__ without running __init__.
        provenance = {
            "embedding_provider": getattr(self, "active_provider", "default"),
            "embedding_model": getattr(self, "embedding_model_name", "all-MiniLM-L6-v2"),
            "embedding_version": getattr(self, "embedding_version", "v1"),
        }

        by_course: Dict[str, Dict[str, list]] = {}
        for c in chunks:
            # Deterministic unique ID to allow clean updates when slides are re-uploaded
            chunk_id = f"{c.course_id}_{c.module_id or 'nomod'}_{c.page_number}_{c.chunk_index}"
            parts = split_oversized(c.text)
            batch = by_course.setdefault(c.course_id or "", {"ids": [], "documents": [], "metadatas": []})
            for part_no, part in enumerate(parts):
                batch["ids"].append(chunk_id if len(parts) == 1 else f"{chunk_id}_p{part_no}")
                batch["documents"].append(part)
                # source_file + page_number + chunk_index identify the source chunk (GroupBy dedup).
                batch["metadatas"].append({**c.to_metadata(), **provenance})

        total = 0
        for course_id, batch in by_course.items():
            collection = self._course_collection(course_id)
            for start in range(0, len(batch["ids"]), EMBEDDING_BATCH_SIZE):
                end = start + EMBEDDING_BATCH_SIZE
                collection.upsert(
                    ids=batch["ids"][start:end],
                    documents=batch["documents"][start:end],
                    metadatas=batch["metadatas"][start:end],
                )
            total += len(batch["ids"])
        return total

    def search(
        self,
        query: str,
        course_id: Optional[str] = None,
        module_id: Optional[str] = None,
        source_file: Optional[str] = None,
        top_k: int = 4,
        sub_lecture_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        STEP 3: SEMANTIC VECTOR SEARCH WITH TARGETED SCOPE FILTERING
        Finds the top-K slide chunks matching the question, scoped to:
        - A specific PDF file (source_file) for Strict Lecture Mode, OR
        - A specific course (course_id) / module (module_id) for Global Mode.
        """
        # Step 3.1: Build metadata filter (Targeted Scope Guard)
        conditions = []
        if source_file:
            # Strict Lecture Scope: filename uniquely identifies the slide deck
            conditions.append({"source_file": {"$eq": source_file}})
            if course_id:
                conditions.append({"course_id": {"$eq": course_id}})
        else:
            # Global or module scope
            if course_id:
                conditions.append({"course_id": {"$eq": course_id}})
            if module_id:
                conditions.append({"module_id": {"$eq": module_id}})

        if sub_lecture_id:
            conditions.append({"sub_lecture_id": {"$eq": sub_lecture_id}})

        where_filter = None
        if len(conditions) > 1:
            where_filter = {"$and": conditions}
        elif len(conditions) == 1:
            where_filter = conditions[0]

        if self._is_cloud():
            # Course shards: course_id picks the collection; the filter stays as a guard.
            output: List[Dict[str, Any]] = []
            for collection in self._collections(course_id):
                output.extend(self._hybrid_search(collection, query, where_filter, top_k))
            output.sort(key=lambda r: r["relevance_score"], reverse=True)
            return output[:top_k]

        kwargs = {
            "query_texts": [query],
            "n_results": min(top_k, max(1, self.collection.count() or 1))
        }
        if where_filter:
            kwargs["where"] = where_filter

        # Retrieval failure must never remove the selected lecture filter.
        results = self.collection.query(**kwargs)

        output: List[Dict[str, Any]] = []
        if results and results.get("documents") and len(results["documents"]) > 0:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
            distances = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

            for doc, meta, dist in zip(docs, metas, distances):
                # Convert cosine distance to 0.0 - 1.0 confidence score
                similarity = max(0.0, min(1.0, 1.0 - float(dist)))
                output.append({
                    "text": doc,
                    "metadata": meta,
                    "relevance_score": round(similarity, 4)
                })

        return output

    def _hybrid_search(self, collection, query: str, where_filter, top_k: int) -> List[Dict[str, Any]]:
        """
        Dense (Qwen) + sparse (Splade) rankings fused with RRF, at most MAX_CHUNKS_PER_SLIDE
        chunks per slide (GroupBy). RRF scores are rank-based, so the cosine similarity from a
        dense search of the same scope is reported as relevance_score (RAG_RELEVANCE_THRESHOLD).
        """
        limit = max(top_k * 4, CLOUD_KNN_LIMIT)
        fused = Search().rank(Rrf(
            ranks=[
                Knn(query=query, return_rank=True, limit=limit),
                Knn(query=query, key=SPARSE_KEY, return_rank=True, limit=limit),
            ],
            weights=[0.7, 0.3],
            k=60,
        )).group_by(GroupBy(
            keys=[K("source_file"), K("page_number")],
            aggregate=MinK(keys=K.SCORE, k=MAX_CHUNKS_PER_SLIDE),
        )).limit(top_k).select(K.DOCUMENT, K.METADATA, K.SCORE)
        dense = Search().rank(Knn(query=query, limit=limit)).limit(limit).select(K.SCORE)
        if where_filter:
            fused = fused.where(where_filter)
            dense = dense.where(where_filter)

        fused_rows, dense_rows = collection.search([fused, dense]).rows()
        similarity = {r["id"]: max(0.0, min(1.0, 1.0 - float(r["score"]))) for r in dense_rows}
        # Sparse-only matches fall outside the dense top-`limit`: no closer than its worst hit.
        floor = min(similarity.values(), default=0.0)
        return [
            {
                "text": r.get("document") or "",
                "metadata": r.get("metadata") or {},
                "relevance_score": round(similarity.get(r["id"], floor), 4),
            }
            for r in fused_rows
            if (r.get("document") or "").strip()
        ]

    def get_lecture_chunks(self, source_file: str, course_id: Optional[str] = None):
        conditions = [{"source_file": {"$eq": source_file}}]
        if course_id:
            conditions.append({"course_id": {"$eq": course_id}})
        where = {"$and": conditions} if len(conditions) > 1 else conditions[0]
        chunks = []
        for collection in self._collections(course_id):
            data = self._get_all(collection, where=where)
            chunks.extend(
                {"id": cid, "text": doc, "metadata": meta}
                for cid, doc, meta in zip(data["ids"], data["documents"], data["metadatas"])
                if doc and doc.strip()
            )
        return sorted(chunks, key=lambda c: (
            c["metadata"]["page_number"], c["metadata"].get("chunk_index", 0), c["id"]
        ))

    def save_lecture_sections(self, chunks, sections, fingerprint: str):
        """Metadata-only update: preserve indexed documents and embeddings."""
        metadatas = []
        for chunk in chunks:
            section = next(s for s in sections if
                           s.page_start <= chunk["metadata"]["page_number"] <= s.page_end)
            metadatas.append({
                **chunk["metadata"], "sub_lecture_id": section.id,
                "learning_section": section.model_dump_json(), "learning_fingerprint": fingerprint,
            })
        by_course: Dict[str, Dict[str, list]] = {}
        for chunk, meta in zip(chunks, metadatas):
            batch = by_course.setdefault(meta.get("course_id") or "", {"ids": [], "metadatas": []})
            batch["ids"].append(chunk["id"])
            batch["metadatas"].append(meta)
        for course_id, batch in by_course.items():
            self._course_collection(course_id).update(ids=batch["ids"], metadatas=batch["metadatas"])

    def count(self, course_id: Optional[str] = None) -> int:
        """Returns the total number of chunks currently stored in ChromaDB."""
        if self._is_cloud():
            return sum(c.count() for c in self._collections(course_id))
        if not course_id:
            return self.collection.count()
        results = self.collection.get(where={"course_id": course_id})
        return len(results["ids"]) if results and "ids" in results else 0

    def count_source_file(self, source_file: str) -> int:
        """Number of indexed chunks for one stored document (its basename)."""
        if not source_file:
            return 0
        return sum(
            len(self._get_all(c, where={"source_file": source_file}, include=())["ids"])
            for c in self._collections()
        )

    def delete_module_chunks(self, module_id: str):
        """Deletes all chunks belonging to a specific module when replaced."""
        try:
            for collection in self._collections():
                collection.delete(where={"module_id": module_id})
        except Exception as e:
            print(f"[ChromaVectorStore] Error deleting module chunks: {e}")

    def list_slide_decks(self) -> List[Dict[str, Any]]:
        """
        Discovers all unique lecture slide decks currently indexed in ChromaDB.
        Used by the UI to populate the Lecture Scope dropdown dynamically.
        """
        try:
            metadatas = [
                meta for c in self._collections()
                for meta in self._get_all(c, include=("metadatas",))["metadatas"]
            ]
            if not metadatas:
                return []

            decks_map: Dict[str, Dict[str, Any]] = {}
            for meta in metadatas:
                sfile = meta.get("source_file")
                if not sfile or sfile.endswith(".txt") or sfile.startswith("mock_"):
                    continue
                if sfile not in decks_map:
                    cid = meta.get("course_id", "")
                    mid = meta.get("module_id", "")
                    clean_name = sfile
                    # Clean up UUID prefixes like ac72c5cd-dd0b-4f50-8d10-b3729f61779c_
                    if len(sfile) > 37 and sfile[8] == '-' and sfile[13] == '-' and '_' in sfile:
                        clean_name = sfile.split('_', 1)[-1]
                    clean_name = (
                        clean_name.replace(".pdf", "")
                        .replace(".pptx", "")
                        .replace("___", " - ")
                        .replace("__", " ")
                        .replace("_", " ")
                        .strip()
                    )
                    
                    decks_map[sfile] = {
                        "source_file": sfile,
                        "course_id": cid,
                        "module_id": mid,
                        "total_chunks": 0,
                        "display_title": clean_name
                    }
                decks_map[sfile]["total_chunks"] += 1

            return list(decks_map.values())
        except Exception as e:
            print(f"[ChromaVectorStore] Error listing slide decks: {e}")
            return []
