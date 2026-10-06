"""
EduFlow AI - Provider registry, error-code contract, and document status tests
==============================================================================

Covers the new hardening layer:
1. Provider health endpoint returns configured flags + models, never secrets.
2. resolve_provider_model validates provider/model with stable error codes.
3. Per-request provider/model selection reaches generation (and env stays default).
4. Stable AI error codes on the HTTP surface + request-id correlation.
5. Document ingestion states (UPLOADED/PROCESSING/READY/FAILED) + embedding metadata.
6. RAG retrieval context builder (top-k, threshold, diversity, metadata filtering).
"""

import json
import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import main  # noqa: E402
from agents.gemini_quiz_generation_service import (  # noqa: E402
    GeminiQuizGenerationService,
    QuizGenerationUnavailable,
    QuizGenerationValidationError,
)
from core.errors import (  # noqa: E402
    AI_MODEL_NOT_FOUND,
    AI_OUTPUT_VALIDATION_FAILED,
    AI_PROVIDER_NOT_CONFIGURED,
    AI_RATE_LIMITED,
    AI_REQUEST_FAILED,
    CourseMaterialUnavailable,
    ProviderNotConfigured,
    RAG_CONTEXT_NOT_FOUND,
)
from core.providers import (  # noqa: E402
    configured_models,
    is_configured,
    normalize_provider,
    provider_status_list,
    resolve_provider_model,
    supported_providers,
)
from models.schemas import GenerateSlideQuizRequest  # noqa: E402

TEST_DOC_PATH = os.path.join(os.path.dirname(__file__), "sample_lecture.txt")


@pytest.fixture(scope="module", autouse=True)
def setup_test_files():
    sample = (
        "Concurrency & ACID\n"
        "ACID guarantees atomicity, consistency, isolation, and durability.\n"
        "Two-phase locking prevents dirty reads and lost updates.\n"
    )
    with open(TEST_DOC_PATH, "w", encoding="utf-8") as fh:
        fh.write(sample)
    yield
    if os.path.exists(TEST_DOC_PATH):
        os.remove(TEST_DOC_PATH)


@pytest.fixture(autouse=True)
def pin_provider(monkeypatch):
    monkeypatch.setenv("QUIZ_LLM_PROVIDER", "gemini")
    monkeypatch.delenv("QUIZ_LLM_MODEL", raising=False)


def valid_payload(n=2):
    questions = []
    for i in range(n):
        questions.append({
            "question_text": f"Grounded question {i + 1}?",
            "question_type": "MULTIPLE_CHOICE",
            "blooms_taxonomy_level": "Understanding",
            "options": ["Right", "Wrong A", "Wrong B", "Wrong C"],
            "correct_answer": "Right",
            "explanation": "The material says so.",
            "marking_scheme": "10 points.",
            "slide_citation": "Slide 1: Concurrency",
            "points": 10,
        })
    return {"title": "T", "target_topics": ["ACID"], "questions": questions}


class TestProviderRegistry:

    def test_supported_providers_cover_the_documented_set(self):
        assert set(supported_providers()) == {"gemini", "groq", "azure"}
        assert normalize_provider("Grok") == "groq"
        assert normalize_provider("Google") == "gemini"
        assert normalize_provider(None) is None

    def test_provider_status_never_returns_secrets(self):
        payload = provider_status_list()
        assert len(payload) == len(supported_providers())
        dump = json.dumps(payload)
        for var in ("GEMINI_API_KEY", "GROQ_API_KEY", "AZURE_OPENAI_API_KEY",
                    "AZURE_OPENAI_ENDPOINT", "INTERNAL_SERVICE_TOKEN"):
            secret = os.environ.get(var, "").strip()
            if len(secret) >= 6:
                assert secret not in dump, f"{var} leaked into provider status"
        for entry in payload:
            assert set(entry) >= {"provider", "label", "configured", "models", "active"}
            assert isinstance(entry["configured"], bool)
            assert isinstance(entry["models"], list)

    def test_configured_models_is_the_server_side_allowlist(self, monkeypatch):
        monkeypatch.setenv("GROQ_API_KEY", "test-key")
        monkeypatch.setenv("GROQ_MODEL", "groq-default")
        monkeypatch.setenv("GROQ_MODELS", "groq-default, llama-3.3-70b-versatile")
        assert configured_models("groq") == ["groq-default", "llama-3.3-70b-versatile"]
        assert is_configured("groq") is True
        monkeypatch.delenv("GROQ_API_KEY")
        assert is_configured("groq") is False

    def test_resolve_rejects_unsupported_provider(self, monkeypatch):
        monkeypatch.setenv("QUIZ_LLM_PROVIDER", "llama-local")
        with pytest.raises(ProviderNotConfigured) as exc:
            resolve_provider_model(None, None)
        assert exc.value.code == AI_PROVIDER_NOT_CONFIGURED
        assert "Supported providers" in (exc.value.details or "")

    def test_resolve_rejects_missing_credentials_with_variable_name(self, monkeypatch):
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        with pytest.raises(ProviderNotConfigured) as exc:
            resolve_provider_model("groq", None)
        assert exc.value.code == AI_PROVIDER_NOT_CONFIGURED
        assert "GROQ_API_KEY" in exc.value.message
        assert "Groq" in exc.value.message

    def test_resolve_rejects_model_outside_allowlist(self, monkeypatch):
        monkeypatch.setenv("GROQ_API_KEY", "test-key")
        monkeypatch.setenv("GROQ_MODELS", "groq-default")
        from core.errors import AiServiceError
        with pytest.raises(AiServiceError) as exc:
            resolve_provider_model("groq", "gpt-9000")
        assert exc.value.code == AI_MODEL_NOT_FOUND
        assert exc.value.status_code == 400
        assert "gpt-9000" in exc.value.message

    def test_resolve_returns_defaults_when_nothing_requested(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        provider, model = resolve_provider_model(None, None)
        assert provider == "gemini"
        assert model == configured_models("gemini")[0]


class TestPerRequestProviderSelection:

    def test_request_provider_overrides_env(self, monkeypatch):
        monkeypatch.setenv("QUIZ_LLM_PROVIDER", "gemini")
        svc = GeminiQuizGenerationService(main.rag_service)
        monkeypatch.setattr(
            svc, "_call_groq_json",
            lambda prompt, temperature: json.dumps(valid_payload(2)))
        monkeypatch.setattr(
            svc, "_call_gemini_json",
            lambda *a, **k: pytest.fail("Gemini must not be called for provider=groq"))

        response = svc.generate_quiz(GenerateSlideQuizRequest(
            slide_path=TEST_DOC_PATH, num_questions=2, provider="groq"))
        assert response.source == "groq"
        # The env default must not leak into other requests afterwards.
        assert svc.provider == "gemini"

    def test_request_provider_not_configured_fails_with_code(self, monkeypatch):
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        svc = GeminiQuizGenerationService(main.rag_service)
        monkeypatch.setattr(svc._rag, "groq_api_key", "")  # loaded at rag init; force empty
        with pytest.raises(QuizGenerationUnavailable) as exc:
            svc.generate_quiz(GenerateSlideQuizRequest(
                slide_path=TEST_DOC_PATH, num_questions=2, provider="groq"))
        assert exc.value.code == AI_PROVIDER_NOT_CONFIGURED
        assert "GROQ_API_KEY" in exc.value.message

    def test_unknown_request_provider_fails_before_any_llm_call(self):
        svc = GeminiQuizGenerationService(main.rag_service)
        monkeypatch_calls = []
        svc._call_llm_json = lambda *a, **k: monkeypatch_calls.append(1)
        with pytest.raises(QuizGenerationUnavailable) as exc:
            svc.generate_quiz(GenerateSlideQuizRequest(
                slide_path=TEST_DOC_PATH, num_questions=2, provider="llama-local"))
        assert exc.value.code == AI_PROVIDER_NOT_CONFIGURED
        assert monkeypatch_calls == []  # no LLM call was attempted

    def test_request_model_outside_allowlist_fails(self, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        monkeypatch.setenv("GEMINI_MODELS", "models/gemini-flash-latest")
        svc = GeminiQuizGenerationService(main.rag_service)
        from core.errors import AiServiceError
        with pytest.raises(AiServiceError) as exc:
            svc.generate_quiz(GenerateSlideQuizRequest(
                slide_path=TEST_DOC_PATH, num_questions=2,
                provider="gemini", model="models/invented-123"))
        assert exc.value.code == AI_MODEL_NOT_FOUND

    def test_env_provider_still_defaults(self, monkeypatch):
        monkeypatch.setenv("QUIZ_LLM_PROVIDER", "groq")
        svc = GeminiQuizGenerationService(main.rag_service)
        monkeypatch.setattr(
            svc, "_call_groq_json",
            lambda prompt, temperature: json.dumps(valid_payload(2)))
        response = svc.generate_quiz(GenerateSlideQuizRequest(
            slide_path=TEST_DOC_PATH, num_questions=2))
        assert response.source == "groq"


class TestStableErrorCodes:

    def test_rate_limit_classified_as_ai_rate_limited(self, monkeypatch):
        monkeypatch.setenv("QUIZ_LLM_PROVIDER", "groq")
        svc = GeminiQuizGenerationService(main.rag_service)

        class FakeRateLimit(Exception):
            status_code = 429

        monkeypatch.setattr(svc, "_call_groq_json",
                            lambda *a, **k: (_ for _ in ()).throw(FakeRateLimit("slow down")))
        with pytest.raises(QuizGenerationUnavailable) as exc:
            svc._call_llm_json("prompt", 0.3)
        assert exc.value.code == AI_RATE_LIMITED
        assert exc.value.status_code == 429

    def test_generic_failure_defaults_to_ai_request_failed(self, monkeypatch):
        monkeypatch.setenv("QUIZ_LLM_PROVIDER", "groq")
        svc = GeminiQuizGenerationService(main.rag_service)
        monkeypatch.setattr(svc, "_call_groq_json",
                            lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")))
        with pytest.raises(QuizGenerationUnavailable) as exc:
            svc._call_llm_json("prompt", 0.3)
        assert exc.value.code == AI_REQUEST_FAILED

    def test_validation_failure_carries_output_validation_code(self, monkeypatch):
        svc = GeminiQuizGenerationService(main.rag_service)
        bad = valid_payload(2)
        bad["questions"][0]["correct_answer"] = "Not An Option"
        monkeypatch.setattr(svc, "_call_llm_json", lambda *a, **k: json.dumps(bad))
        with pytest.raises(QuizGenerationValidationError) as exc:
            svc.generate_quiz(GenerateSlideQuizRequest(
                slide_path=TEST_DOC_PATH, num_questions=2))
        assert exc.value.code == AI_OUTPUT_VALIDATION_FAILED
        assert exc.value.status_code == 502
        assert exc.value.errors

    def test_no_course_material_is_a_valueerror_with_stable_code(self):
        svc = GeminiQuizGenerationService(main.rag_service)
        with pytest.raises(ValueError) as exc:
            svc.generate_quiz(GenerateSlideQuizRequest(module_title="Empty"))
        assert isinstance(exc.value, CourseMaterialUnavailable)
        assert exc.value.code == RAG_CONTEXT_NOT_FOUND


class TestProvidersEndpoint:

    def test_endpoint_lists_providers_without_secrets(self):
        client = TestClient(main.app)
        res = client.get("/api/v1/ai/providers")
        assert res.status_code == 200
        body = res.json()
        assert body["requestId"]
        providers = body["providers"]
        assert {p["provider"] for p in providers} == {"gemini", "groq", "azure"}
        dump = json.dumps(body)
        for var in ("GEMINI_API_KEY", "GROQ_API_KEY", "AZURE_OPENAI_API_KEY"):
            secret = os.environ.get(var, "").strip()
            if len(secret) >= 6:
                assert secret not in dump

    def test_generation_with_unsupported_provider_returns_stable_error(self):
        client = TestClient(main.app)
        res = client.post("/api/v1/ai/slides/generate-quiz", json={
            "module_title": "M", "num_questions": 1, "provider": "llama-local",
        })
        assert res.status_code == 503
        body = res.json()
        assert body["code"] == AI_PROVIDER_NOT_CONFIGURED
        assert body["detail"] and body["message"]
        assert body["requestId"]


class TestRequestIdCorrelation:

    def test_request_id_header_is_echoed(self):
        client = TestClient(main.app)
        res = client.get("/api/v1/ai/providers", headers={"X-Request-Id": "req-abc.123"})
        assert res.headers.get("X-Request-Id") == "req-abc.123"
        assert res.json()["requestId"] == "req-abc.123"

    def test_unsafe_incoming_request_id_is_replaced(self):
        client = TestClient(main.app)
        res = client.get("/api/v1/ai/providers", headers={"X-Request-Id": "not a safe id!"})
        # Invalid ids are replaced with a generated one, never echoed back.
        assert res.headers.get("X-Request-Id") not in (None, "not a safe id!")


class TestDocumentStatus:

    @pytest.fixture(autouse=True)
    def isolated_status_registry(self, tmp_path, monkeypatch):
        monkeypatch.setattr(main.rag_service, "_status_path",
                            str(tmp_path / "document_status.json"))

    def test_unknown_file_is_uploaded(self):
        res = TestClient(main.app).get(
            "/api/v1/rag/document-status",
            params={"file_name": f"never-seen-{uuid.uuid4().hex}.pdf"})
        assert res.status_code == 200
        body = res.json()
        assert body["state"] == "UPLOADED"
        assert body["chunksIndexed"] == 0

    def test_indexing_marks_document_ready_with_embedding_metadata(self):
        name = f"diag-status-{uuid.uuid4().hex}.txt"
        path = os.path.join(os.path.dirname(__file__), name)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("B-Tree indexes speed up range queries.\n")
        try:
            result = main.rag_service.index_file(path, course_id="diag-status-course")
            assert result.status == "success"
            status = main.rag_service.document_status(name)
            assert status["state"] == "READY"
            assert status["chunksIndexed"] >= 1
            assert status["embeddingProvider"]
            assert status["embeddingModel"]
            assert status["embeddingVersion"]
            assert status["embeddingMismatch"] is False
        finally:
            os.remove(path)
            try:
                main.rag_service.vector_store.collection.delete(
                    where={"source_file": name})
            except Exception:
                pass

    def test_missing_file_is_marked_failed_and_raises(self):
        name = f"missing-{uuid.uuid4().hex}.pdf"
        with pytest.raises(FileNotFoundError):
            main.rag_service.index_file(
                os.path.join(os.path.dirname(__file__), name),
                course_id="diag-status-course")
        status = main.rag_service.document_status(name)
        assert status["state"] == "FAILED"
        assert status["error"]

    def test_embedding_model_change_is_detected(self):
        name = f"mismatch-{uuid.uuid4().hex}.pdf"
        main.rag_service._set_document_state(
            name, "READY", courseId="c1",
            embeddingProvider="gemini", embeddingModel="models/old-embedding-001")
        status = main.rag_service.document_status(name)
        assert status["state"] == "READY"
        assert status["embeddingMismatch"] is True
        assert status["reindexRecommended"] is True

    def test_document_status_requires_a_file_name(self):
        with pytest.raises(ValueError):
            main.rag_service.document_status("   ")


class TestRetrievalQuizContext:

    def test_retrieval_applies_threshold_diversity_and_top_k(self, monkeypatch):
        svc = GeminiQuizGenerationService(main.rag_service)
        fake_results = [
            {"text": "good slide", "metadata": {"page_number": 1, "title": "A"},
             "relevance_score": 0.9},
            {"text": "same slide again", "metadata": {"page_number": 1, "title": "A"},
             "relevance_score": 0.89},
            {"text": "third on same slide", "metadata": {"page_number": 1, "title": "A"},
             "relevance_score": 0.88},   # dropped by per-slide diversity (max 2)
            {"text": "weak hit", "metadata": {"page_number": 2, "title": "B"},
             "relevance_score": 0.05},   # dropped by threshold
            {"text": "another slide", "metadata": {"page_number": 3, "title": "C"},
             "relevance_score": 0.7},
        ]

        class FakeStore:
            def search(self, **kwargs):
                assert kwargs["course_id"] == "course-x"
                assert kwargs["source_file"] == "deck.pdf"
                return fake_results

        monkeypatch.setattr(main.rag_service, "vector_store", FakeStore())
        text = svc._retrieve_quiz_context(
            query="quiz topics", course_id="course-x",
            module_id="mod-1", source_file="deck.pdf")
        assert "good slide" in text
        assert "same slide again" in text
        assert "third on same slide" not in text
        assert "weak hit" not in text
        assert "another slide" in text
        assert "Slide 1 (A)" in text

    def test_oversized_deck_uses_retrieval_instead_of_blunt_truncation(self, monkeypatch):
        long_line = "Consistent hashing distributes load across nodes. " * 700  # > 16k chars
        path = os.path.join(os.path.dirname(__file__), "long_deck_diag.txt")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("Distributed Systems\n" + long_line)
        svc = GeminiQuizGenerationService(main.rag_service)
        called = {}

        class FakeStore:
            def search(self, **kwargs):
                called.update(kwargs)
                return [{"text": "RETRIEVED_CHUNK_TEXT",
                         "metadata": {"page_number": 7, "title": "Sharding"},
                         "relevance_score": 0.95}]

        original = main.rag_service.vector_store
        main.rag_service.vector_store = FakeStore()
        try:
            context = svc._build_content_context(
                slide_path=path, retrieval_query="distributed systems quiz",
                course_id="c-1", module_id="m-1")
        finally:
            main.rag_service.vector_store = original
            os.remove(path)
        assert called.get("course_id") == "c-1"
        assert "RETRIEVED_CHUNK_TEXT" in context
