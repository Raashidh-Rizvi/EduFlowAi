"""
EduFlow AI - Simple RAG Unit & Integration Tests (Phase 1)
=========================================================
Verifies:
1. Document & slide parsing
2. Sliding window chunker with page boundary retention
3. ChromaDB vector storage and course-scoped retrieval
4. SimpleRagService question-answering with verifiable citations
5. FastAPI REST endpoints (/health, /api/v1/rag/index-pdf, /api/v1/rag/chat)
"""

import os
import sys
import shutil
import pytest
from fastapi.testclient import TestClient

# Ensure ai-agent is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rag.parser import DocumentParser, ParsedPage
from rag.chunker import SlideChunker
from rag.vector_store import ChromaVectorStore
from rag.rag_service import SimpleRagService
from main import app


TEST_CHROMA_DIR = os.path.join(os.path.dirname(__file__), "temp_test_chroma_db")
TEST_DOC_PATH = os.path.join(os.path.dirname(__file__), "sample_lecture.txt")


@pytest.fixture(scope="module", autouse=True)
def setup_test_files():
    """Create sample lecture slide text file for testing and cleanup after."""
    sample_content = (
        "Clean Architecture & Dependency Inversion\n"
        "In clean architecture, software is divided into layers with strict dependency rules.\n"
        "High-level policy code must not depend on low-level infrastructure or database details.\n\n"
        "Relational Storage & Index Optimization\n"
        "B-Tree indexes speed up range queries and equality lookups.\n"
        "PostgreSQL uses cost-based optimization to choose sequential scans or index scans.\n\n"
        "Concurrency & ACID Transaction Isolation\n"
        "ACID guarantees atomicity, consistency, isolation, and durability.\n"
        "Two-phase locking prevents dirty reads and lost updates in distributed transactions."
    )
    with open(TEST_DOC_PATH, "w", encoding="utf-8") as f:
        f.write(sample_content)

    yield

    # Teardown
    if os.path.exists(TEST_DOC_PATH):
        os.remove(TEST_DOC_PATH)
    if os.path.exists(TEST_CHROMA_DIR):
        shutil.rmtree(TEST_CHROMA_DIR, ignore_errors=True)


class TestSimpleRagPipeline:

    def test_document_parser(self):
        """Verifies parsing of pages and titles."""
        pages = DocumentParser.parse(TEST_DOC_PATH)
        assert len(pages) == 3, f"Expected 3 sections/pages, got {len(pages)}"
        assert "Clean Architecture" in pages[0].title
        assert pages[0].page_number == 1
        assert "Dependency Inversion" in pages[0].text

    def test_slide_chunker(self):
        """Verifies chunking preserves page number and metadata."""
        pages = DocumentParser.parse(TEST_DOC_PATH)
        chunker = SlideChunker(chunk_size_chars=500, chunk_overlap_chars=50)
        chunks = chunker.chunk_pages(
            pages=pages,
            source_file="sample_lecture.txt",
            course_id="course-test-101",
            module_id="mod-arch-01"
        )
        assert len(chunks) >= 3
        for c in chunks:
            assert c.course_id == "course-test-101"
            assert c.module_id == "mod-arch-01"
            assert c.page_number in [1, 2, 3]
            assert "[Slide" in c.text

    def test_chroma_vector_store(self):
        """Verifies storing and retrieving chunks from ChromaDB."""
        store = ChromaVectorStore(persist_dir=TEST_CHROMA_DIR)
        pages = DocumentParser.parse(TEST_DOC_PATH)
        chunks = SlideChunker().chunk_pages(pages, "sample_lecture.txt", "course-test-101", "mod-arch-01")
        
        count = store.add_chunks(chunks)
        assert count > 0

        # Query relevant to index optimization
        results = store.search(query="How does PostgreSQL optimize B-tree indexes?", course_id="course-test-101", top_k=2)
        assert len(results) > 0
        top_hit = results[0]
        assert "Index" in top_hit["text"] or "B-Tree" in top_hit["text"] or "PostgreSQL" in top_hit["text"]
        assert top_hit["metadata"]["page_number"] == 2

    def test_rag_service_end_to_end(self):
        """Verifies full RAG service indexing, chat with citations, topics, and quiz."""
        store = ChromaVectorStore(persist_dir=TEST_CHROMA_DIR)
        service = SimpleRagService(vector_store=store)

        # 1. Index file
        idx_res = service.index_file(
            file_path=TEST_DOC_PATH,
            course_id="course-test-101",
            module_id="mod-arch-01"
        )
        assert idx_res.status == "success"
        assert idx_res.pages_parsed == 3
        assert idx_res.chunks_indexed >= 3

        # 2. Chat with question
        chat_res = service.chat(
            question="What is dependency inversion?",
            course_id="course-test-101"
        )
        assert chat_res.answer != ""
        assert len(chat_res.citations) > 0
        assert chat_res.citations[0].page_number in [1, 2, 3]
        assert chat_res.citations[0].source_file == "sample_lecture.txt"

        # 3. Categorize topics
        cat_res = service.categorize_slide_topics(TEST_DOC_PATH)
        assert len(cat_res.topics) >= 1
        assert cat_res.total_slides == 3

        # 4. Generate grounded quiz
        quiz_res = service.generate_quiz(
            slide_path=TEST_DOC_PATH,
            module_title="Architecture & Indexing",
            num_questions=3
        )
        assert len(quiz_res.questions) == 3
        assert quiz_res.questions[0].slide_citation is not None


class TestFastApiEndpoints:

    def test_health_check(self):
        client = TestClient(app)
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "vector_store_chunks" in data

    def test_api_v1_ai_status(self):
        client = TestClient(app)
        res = client.get("/api/v1/ai/status")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["can_generate"] is True

    def test_api_v1_index_and_chat(self):
        client = TestClient(app)

        # Index endpoint
        index_payload = {
            "file_path": TEST_DOC_PATH,
            "course_id": "course-api-test",
            "module_id": "mod-api-test"
        }
        res_idx = client.post("/api/v1/rag/index-pdf", json=index_payload)
        assert res_idx.status_code == 200
        idx_data = res_idx.json()
        assert idx_data["status"] == "success"
        assert idx_data["chunks_indexed"] >= 3

        # Chat endpoint
        chat_payload = {
            "question": "Explain ACID properties and transaction isolation",
            "course_id": "course-api-test",
            "max_citations": 2
        }
        res_chat = client.post("/api/v1/rag/chat", json=chat_payload)
        assert res_chat.status_code == 200
        chat_data = res_chat.json()
        assert "answer" in chat_data
        assert len(chat_data["citations"]) > 0
        assert chat_data["citations"][0]["page_number"] in [1, 2, 3]

    def test_slide_topics_and_quiz_endpoints(self):
        client = TestClient(app)
        
        # Test categorize topics endpoint
        cat_res = client.post("/api/v1/ai/slides/categorize-topics", json={"slide_path": TEST_DOC_PATH})
        assert cat_res.status_code == 200
        cat_data = cat_res.json()
        assert len(cat_data["topics"]) >= 1

        # Test slide quiz generation endpoint
        quiz_res = client.post("/api/v1/ai/slides/generate-quiz", json={
            "slide_path": TEST_DOC_PATH,
            "module_title": "Architecture",
            "num_questions": 2
        })
        assert quiz_res.status_code == 200
        quiz_data = quiz_res.json()
        assert len(quiz_data["questions"]) == 2
        assert quiz_data["questions"][0]["slide_citation"] is not None
