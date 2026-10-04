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

    def add_chunks(self, chunks: List[DocumentChunk]) -> int:
        """
        STEP 2: VECTORIZE & STORE CHUNKS
        Converts text chunks into embeddings and saves them in persistent ChromaDB.
        """
        if not chunks:
            return 0

        documents = []
        metadatas = []
        ids = []

        # Embedding provenance travels with every chunk (see document_status).
        # getattr: tests build bare stores via __new__ without running __init__.
        provenance = {
            "embedding_provider": getattr(self, "active_provider", "default"),
            "embedding_model": getattr(self, "embedding_model_name", "all-MiniLM-L6-v2"),
            "embedding_version": getattr(self, "embedding_version", "v1"),
        }

        for c in chunks:
            # Deterministic unique ID to allow clean updates when slides are re-uploaded
            chunk_id = f"{c.course_id}_{c.module_id or 'nomod'}_{c.page_number}_{c.chunk_index}"
            documents.append(c.text)
            metadatas.append({**c.to_metadata(), **provenance})
            ids.append(chunk_id)

        self.collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        return len(documents)

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

    def get_lecture_chunks(self, source_file: str, course_id: Optional[str] = None):
        conditions = [{"source_file": {"$eq": source_file}}]
        if course_id:
            conditions.append({"course_id": {"$eq": course_id}})
        where = {"$and": conditions} if len(conditions) > 1 else conditions[0]
        data = self.collection.get(where=where, include=["documents", "metadatas"])
        chunks = [
            {"id": cid, "text": doc, "metadata": meta}
            for cid, doc, meta in zip(data["ids"], data["documents"], data["metadatas"])
            if doc and doc.strip()
        ]
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
        self.collection.update(ids=[c["id"] for c in chunks], metadatas=metadatas)

    def count(self, course_id: Optional[str] = None) -> int:
        """Returns the total number of chunks currently stored in ChromaDB."""
        if not course_id:
            return self.collection.count()
        results = self.collection.get(where={"course_id": course_id})
        return len(results["ids"]) if results and "ids" in results else 0

    def count_source_file(self, source_file: str) -> int:
        """Number of indexed chunks for one stored document (its basename)."""
        if not source_file:
            return 0
        results = self.collection.get(where={"source_file": source_file})
        return len(results["ids"]) if results and "ids" in results else 0

    def delete_module_chunks(self, module_id: str):
        """Deletes all chunks belonging to a specific module when replaced."""
        try:
            self.collection.delete(where={"module_id": module_id})
        except Exception as e:
            print(f"[ChromaVectorStore] Error deleting module chunks: {e}")

    def list_slide_decks(self) -> List[Dict[str, Any]]:
        """
        Discovers all unique lecture slide decks currently indexed in ChromaDB.
        Used by the UI to populate the Lecture Scope dropdown dynamically.
        """
        try:
            all_data = self.collection.get()
            if not all_data or not all_data.get("metadatas"):
                return []

            decks_map: Dict[str, Dict[str, Any]] = {}
            for meta in all_data["metadatas"]:
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
