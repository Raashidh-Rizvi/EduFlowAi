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

import os
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

logger = logging.getLogger("eduflow.vector_store")

import chromadb
from chromadb.config import Settings
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings
from rag.chunker import DocumentChunk

# Default path where ChromaDB saves files on disk
DEFAULT_CHROMA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db")


class DirectGeminiEmbeddingFunction(EmbeddingFunction):
    """
    Direct Google Gemini Embedding Function without buggy third-party headers wrapper.
    Uses Google Cloud high-dimension embeddings.
    """
    def __init__(self, api_key: str, model_name: str = "models/gemini-embedding-001"):
        self.api_key = api_key
        self.model_name = model_name
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)

    def __call__(self, input: Documents) -> Embeddings:
        import google.generativeai as genai
        embeddings = []
        for text in input:
            res = genai.embed_content(
                model=self.model_name,
                content=text
            )
            embeddings.append(res["embedding"])
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
        os.makedirs(self.persist_dir, exist_ok=True)

        # Step 1.1: Resolve embedding provider ("default" or "gemini")
        self.provider = (provider or os.environ.get("EMBEDDING_PROVIDER", "default")).lower().strip()
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY", "").strip()

        # Step 1.2: Connect to ChromaDB with telemetry turned off
        self.client = chromadb.PersistentClient(
            path=self.persist_dir,
            settings=Settings(anonymized_telemetry=False)
        )

        # Step 1.3: Configure the selected embedding function
        self.embedding_function = self._resolve_embedding_function()

        # Step 1.4: Use distinct collection names to prevent dimension mismatch
        collection_name = f"eduflow_materials_{self.active_provider}"

        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=self.embedding_function,
            metadata={"hnsw:space": "cosine"}
        )

    def _resolve_embedding_function(self):
        """
        =========================================================================
        ONE CODE BLOCK TO SWITCH EMBEDDING TYPE:
        01. "gemini"  -> Google Cloud Large Vocabulary Model
        02. "default" -> Built-in Local ONNX (all-MiniLM-L6-v2)
        =========================================================================
        """
        logger.info(f"[_resolve_embedding_function] Requested provider: {self.provider}")
        logger.info(f"[_resolve_embedding_function] GEMINI_API_KEY: {'✅ SET' if self.gemini_api_key else '❌ EMPTY'}")

        if self.provider == "gemini":
            if self.gemini_api_key:
                try:
                    ef = DirectGeminiEmbeddingFunction(
                        api_key=self.gemini_api_key,
                        model_name="models/gemini-embedding-001"
                    )
                    # Quick validation test
                    ef(["test"])
                    self.active_provider = "gemini"
                    logger.info("[_resolve_embedding_function] ✅ Gemini embedding initialized successfully.")
                    return ef
                except Exception as e:
                    logger.warning(f"[_resolve_embedding_function] ⚠️  Gemini embedding failed: {type(e).__name__}: {e}")
                    logger.warning("[_resolve_embedding_function] Falling back to local ONNX default embedding.")
            else:
                logger.warning(
                    "[_resolve_embedding_function] ⚠️  EMBEDDING_PROVIDER=gemini but GEMINI_API_KEY is empty. "
                    "Falling back to local ONNX default embedding."
                )

        # 01. Default: Fast, local ONNX embedding (runs offline, zero extra RAM)
        self.active_provider = "default"
        logger.info("[_resolve_embedding_function] ✅ Using local ONNX embedding (all-MiniLM-L6-v2) — offline, no API key needed.")
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

        for c in chunks:
            # Deterministic unique ID to allow clean updates when slides are re-uploaded
            chunk_id = f"{c.course_id}_{c.module_id or 'nomod'}_{c.page_number}_{c.chunk_index}"
            documents.append(c.text)
            metadatas.append(c.to_metadata())
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
        top_k: int = 4
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
        else:
            # Global or module scope
            if course_id:
                conditions.append({"course_id": {"$eq": course_id}})
            if module_id:
                conditions.append({"module_id": {"$eq": module_id}})

        where_filter = None
        if len(conditions) > 1:
            where_filter = {"$and": conditions}
        elif len(conditions) == 1:
            where_filter = conditions[0]

        total_chunks = self.collection.count()
        logger.info(
            f"[search] Query: '{query[:60]}...', filter: {where_filter}, "
            f"top_k={top_k}, total_chunks_in_store={total_chunks}"
        )
        if total_chunks == 0:
            logger.warning(
                "[search] ⚠️  ChromaDB collection is EMPTY — no slides indexed! "
                "Index slides first via POST /api/v1/rag/index-pdf"
            )

        kwargs = {
            "query_texts": [query],
            "n_results": min(top_k, max(1, total_chunks or 1))
        }
        if where_filter:
            kwargs["where"] = where_filter

        try:
            results = self.collection.query(**kwargs)
        except Exception as e:
            # Fallback without filter if empty or filter error
            logger.warning(f"[search] ⚠️  Filter query failed: {type(e).__name__}: {e}")
            logger.warning(f"[search] Retrying without filter (returning all results for query)")
            kwargs.pop("where", None)
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

    def count(self, course_id: Optional[str] = None) -> int:
        """Returns the total number of chunks currently stored in ChromaDB."""
        if not course_id:
            return self.collection.count()
        results = self.collection.get(where={"course_id": course_id})
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
