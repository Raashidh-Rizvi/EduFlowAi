"""
EduFlow AI - Persistent ChromaDB Vector Store
=============================================
Manages course embeddings, vector similarity search, and
metadata filtering (scoping retrieval to the student's enrolled course).
"""

import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from rag.chunker import DocumentChunk


DEFAULT_CHROMA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db")


class ChromaVectorStore:
    """
    Persistent ChromaDB vector store for course lecture slides and PDFs.
    """

    def __init__(self, persist_dir: Optional[str] = None):
        self.persist_dir = persist_dir or os.environ.get("CHROMA_PERSIST_DIR", DEFAULT_CHROMA_DIR)
        os.makedirs(self.persist_dir, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=self.persist_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name="eduflow_course_materials",
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(self, chunks: List[DocumentChunk]) -> int:
        if not chunks:
            return 0

        documents = []
        metadatas = []
        ids = []

        for c in chunks:
            # Deterministic unique ID to allow clean updates/upserts
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
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top_k relevant slide chunks using cosine similarity.
        Optionally filters by course_id or module_id.
        """
        where_filter = None
        if course_id and module_id:
            where_filter = {
                "$and": [
                    {"course_id": {"$eq": course_id}},
                    {"module_id": {"$eq": module_id}}
                ]
            }
        elif course_id:
            where_filter = {"course_id": {"$eq": course_id}}
        elif module_id:
            where_filter = {"module_id": {"$eq": module_id}}

        kwargs = {
            "query_texts": [query],
            "n_results": min(top_k, max(1, self.collection.count() or 1))
        }
        if where_filter:
            kwargs["where"] = where_filter

        try:
            results = self.collection.query(**kwargs)
        except Exception as e:
            # Fallback without where filter if collection was empty or filter failed
            print(f"[ChromaVectorStore] Query with filter failed ({e}), retrying without filter...")
            kwargs.pop("where", None)
            results = self.collection.query(**kwargs)

        output: List[Dict[str, Any]] = []
        if results and results.get("documents") and len(results["documents"]) > 0:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
            distances = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

            for doc, meta, dist in zip(docs, metas, distances):
                # Convert cosine distance to 0..1 similarity score
                similarity = max(0.0, min(1.0, 1.0 - float(dist)))
                output.append({
                    "text": doc,
                    "metadata": meta,
                    "relevance_score": round(similarity, 4)
                })

        return output

    def count(self, course_id: Optional[str] = None) -> int:
        if not course_id:
            return self.collection.count()
        results = self.collection.get(where={"course_id": course_id})
        return len(results["ids"]) if results and "ids" in results else 0

    def delete_module_chunks(self, module_id: str):
        try:
            self.collection.delete(where={"module_id": module_id})
        except Exception as e:
            print(f"[ChromaVectorStore] Error deleting module chunks: {e}")
