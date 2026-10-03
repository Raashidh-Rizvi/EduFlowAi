"""
EduFlow AI - Gemini Quiz Generation Service Tests (PR 7)
========================================================
Verifies that assessment generation:
1. Always calls Gemini with a strict JSON schema (no template questions).
2. Validates model output (question types, options, correct answers, slide
   citations) and retries once before failing loudly.
3. Fails without a Gemini key instead of producing fake questions.
4. Honors instructor topic and question-format selections.
5. Exposes the FastAPI routes the .NET backend calls, including the previously
   missing /api/v1/ai/questions/{id}/regenerate route.
"""

import json
import os
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import main  # noqa: E402  (imports app + module-level services)
from agents.gemini_quiz_generation_service import (  # noqa: E402
    GeminiQuizGenerationService,
    QuizGenerationUnavailable,
    QuizGenerationValidationError,
)
from models.schemas import (  # noqa: E402
    GenerateSlideQuizRequest,
    SingleQuestionRegenerateRequest,
)

TEST_DOC_PATH = os.path.join(os.path.dirname(__file__), "sample_lecture.txt")


@pytest.fixture(scope="module", autouse=True)
def setup_test_files():
    """Create the same sample lecture text used by test_simple_rag."""
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
    if os.path.exists(TEST_DOC_PATH):
        os.remove(TEST_DOC_PATH)


@pytest.fixture(autouse=True)
def pin_gemini_provider(monkeypatch):
    """Tests default to Gemini regardless of the developer's local .env."""
    monkeypatch.setenv("QUIZ_LLM_PROVIDER", "gemini")
    monkeypatch.delenv("QUIZ_LLM_MODEL", raising=False)


def make_service() -> GeminiQuizGenerationService:
    return GeminiQuizGenerationService(main.rag_service)


def fake_quiz_payload(num_questions: int, question_types=None) -> dict:
    """A schema-valid Gemini response shaped like the strict prompt demands."""
    types = question_types or ["MULTIPLE_CHOICE"] * num_questions
    questions = []
    for i, q_type in enumerate(types):
        if q_type == "TRUE_FALSE":
            questions.append({
                "question_text": f"TF question {i + 1} grounded in slide content?",
                "question_type": "TRUE_FALSE",
                "blooms_taxonomy_level": "Understanding",
                "options": ["TRUE", "FALSE"],
                "correct_answer": "TRUE",
                "explanation": "The material states this directly.",
                "marking_scheme": "Full marks for TRUE.",
                "slide_citation": f"Slide {i + 1}: Topic",
                "points": 10,
            })
        elif q_type == "FILL_IN_THE_BLANK":
            questions.append({
                "question_text": f"Fill-in question {i + 1}: the storage engine uses ____.",
                "question_type": "FILL_IN_THE_BLANK",
                "blooms_taxonomy_level": "Remembering",
                "options": [],
                "correct_answer": "B-Tree",
                "explanation": "Slide 2 names the storage structure.",
                "marking_scheme": "10 points for B-Tree.",
                "slide_citation": "Slide 2: Relational Storage",
                "points": 10,
            })
        else:
            questions.append({
                "question_text": f"MCQ question {i + 1} grounded in slide content?",
                "question_type": "MULTIPLE_CHOICE",
                "blooms_taxonomy_level": "Applying",
                "options": ["Correct concept", "Wrong A", "Wrong B", "Wrong C"],
                "correct_answer": "Correct concept",
                "explanation": "Slide 1 defines the correct concept.",
                "marking_scheme": "10 points for the correct option.",
                "slide_citation": f"Slide {i + 1}: Topic",
                "points": 10,
            })
    return {
        "title": "Sample Assessment",
        "target_topics": ["Indexes"],
        "questions": questions,
    }


class TestQuizGeneration:

    def test_generate_quiz_calls_gemini_and_maps_options(self, monkeypatch):
        svc = make_service()
        seen_prompts = []

        def fake_call(prompt, temperature=0.4):
            seen_prompts.append(prompt)
            import json
            return json.dumps(fake_quiz_payload(3))

        monkeypatch.setattr(svc, "_call_llm_json", fake_call)

        response = svc.generate_quiz(GenerateSlideQuizRequest(
            slide_path=TEST_DOC_PATH,
            module_title="Storage Module",
            selected_topics=["Index Optimization"],
            num_questions=3,
            difficulty="Medium",
        ))

        assert response.source == "gemini"
        assert response.validation_passed is True
        assert response.status == "PendingInstructorApproval"
        assert len(response.questions) == 3
        first = response.questions[0]
        assert first.correct_answer == "Correct concept"
        assert first.correct_index == 0
        assert first.correct_answer in first.options
        assert first.slide_citation.startswith("Slide 1:")
        assert response.total_points == 30
        # The prompt must contain the real course material and instructor topics.
        assert "B-Tree indexes" in seen_prompts[0]
        assert "Index Optimization" in seen_prompts[0]

    def test_generate_quiz_honors_requested_question_types(self, monkeypatch):
        import json
        svc = make_service()
        monkeypatch.setattr(
            svc, "_call_llm_json",
            lambda prompt, temperature=0.4: json.dumps(
                fake_quiz_payload(2, ["FILL_IN_THE_BLANK", "TRUE_FALSE"])
            ),
        )
        response = svc.generate_quiz(GenerateSlideQuizRequest(
            slide_path=TEST_DOC_PATH,
            question_types=["FILL_IN_THE_BLANK", "TRUE_FALSE"],
            num_questions=2,
        ))
        assert [q.question_type for q in response.questions] == ["FILL_IN_THE_BLANK", "TRUE_FALSE"]
        assert response.questions[0].options == []
        assert response.questions[0].correct_answer == "B-Tree"
        assert response.questions[1].options == ["TRUE", "FALSE"]

    def test_generate_quiz_retries_then_fails_on_invalid_output(self, monkeypatch):
        import json
        svc = make_service()
        calls = {"count": 0}

        def bad_payload(_prompt, temperature=0.4):
            calls["count"] += 1
            payload = fake_quiz_payload(2)
            # Invalid: correct_answer is not one of the options.
            payload["questions"][0]["correct_answer"] = "Not An Option"
            return json.dumps(payload)

        monkeypatch.setattr(svc, "_call_llm_json", bad_payload)
        with pytest.raises(QuizGenerationValidationError) as exc_info:
            svc.generate_quiz(GenerateSlideQuizRequest(
                slide_path=TEST_DOC_PATH, num_questions=2))
        assert calls["count"] == 2  # initial attempt + one corrective retry
        assert any("correct_answer" in e for e in exc_info.value.errors)

    def test_generate_quiz_without_gemini_key_raises_unavailable(self, monkeypatch):
        svc = make_service()
        monkeypatch.setattr(svc._rag, "gemini_api_key", "")
        with pytest.raises(QuizGenerationUnavailable):
            svc.generate_quiz(GenerateSlideQuizRequest(
                slide_path=TEST_DOC_PATH, num_questions=2))

    @pytest.mark.parametrize("code,status,expected", [
        (429, "RESOURCE_EXHAUSTED", "quota"),
        (403, "PERMISSION_DENIED", "API key was rejected"),
        (404, "NOT_FOUND", "is not available"),
        (503, "UNAVAILABLE", "temporarily overloaded"),
    ])
    def test_gemini_api_errors_become_readable_messages(self, monkeypatch, code, status, expected):
        from google.genai import errors
        svc = make_service()
        monkeypatch.setattr(svc._rag, "gemini_api_key", "test-only")
        err = errors.APIError(code, {"error": {"code": code, "status": status, "message": "boom"}})
        monkeypatch.setattr("google.genai.Client", lambda *a, **k: (_ for _ in ()).throw(err))
        with pytest.raises(QuizGenerationUnavailable) as exc_info:
            svc._call_llm_json("prompt", 0.3)
        assert expected in str(exc_info.value)
        assert "ClientError" not in str(exc_info.value)

    def test_unknown_provider_is_reported(self, monkeypatch):
        monkeypatch.setenv("QUIZ_LLM_PROVIDER", "llama-local")
        with pytest.raises(QuizGenerationUnavailable) as exc_info:
            make_service()._call_llm_json("prompt", 0.3)
        assert "QUIZ_LLM_PROVIDER" in str(exc_info.value)

    def test_provider_aliases_and_model_override(self, monkeypatch):
        svc = make_service()
        monkeypatch.setenv("QUIZ_LLM_PROVIDER", "Grok")
        monkeypatch.setattr(svc._rag, "groq_model_name", "groq-default")
        assert svc.provider == "groq"
        assert svc.model_name == "groq-default"
        monkeypatch.setenv("QUIZ_LLM_MODEL", "llama-3.3-70b-versatile")
        assert svc.model_name == "llama-3.3-70b-versatile"

    def test_azure_missing_config_names_the_variables(self, monkeypatch):
        monkeypatch.setenv("QUIZ_LLM_PROVIDER", "azure")
        monkeypatch.setenv("AZURE_OPENAI_API_KEY", "test-only")
        monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "https://example.openai.azure.com/")
        monkeypatch.setenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "")
        svc = make_service()
        svc._azure_deployments_seen = ["text-embedding-3-small"]
        monkeypatch.setattr(svc, "_discover_azure_chat_deployment", lambda *a: "")
        with pytest.raises(QuizGenerationUnavailable) as exc_info:
            svc._call_llm_json("prompt", 0.3)
        assert "no chat model deployed" in str(exc_info.value)
        assert "text-embedding-3-small" in str(exc_info.value)
        assert "AZURE_OPENAI_API_KEY" not in str(exc_info.value)

    def test_azure_discovery_skips_embedding_deployments(self, monkeypatch):
        import io
        import urllib.request
        payload = {"data": [
            {"id": "text-embedding-3-small", "model": "text-embedding-3-small", "status": "succeeded"},
            {"id": "my-chat", "model": "gpt-4o-mini", "status": "succeeded"},
        ]}
        monkeypatch.setattr(urllib.request, "urlopen",
                            lambda *a, **k: io.BytesIO(json.dumps(payload).encode()))
        svc = make_service()
        assert svc._discover_azure_chat_deployment(
            "test-only", "https://example.openai.azure.com/openai/v1") == "my-chat"

    def test_groq_provider_is_dispatched_and_tagged(self, monkeypatch):
        monkeypatch.setenv("QUIZ_LLM_PROVIDER", "groq")
        svc = make_service()
        monkeypatch.setattr(svc._rag, "gemini_api_key", "test-only")
        monkeypatch.setattr(svc, "_call_groq_json",
                            lambda prompt, temperature: json.dumps(fake_quiz_payload(2)))
        monkeypatch.setattr(svc, "_call_gemini_json",
                            lambda *a, **k: pytest.fail("Gemini must not be called"))
        response = svc.generate_quiz(GenerateSlideQuizRequest(
            slide_path=TEST_DOC_PATH, num_questions=2))
        assert response.source == "groq"
        assert len(response.questions) == 2

    def test_groq_rate_limit_message_mentions_groq_key(self, monkeypatch):
        monkeypatch.setenv("QUIZ_LLM_PROVIDER", "groq")
        svc = make_service()

        class FakeRateLimit(Exception):
            status_code = 429

        def boom(prompt, temperature):
            raise FakeRateLimit("rate limited")

        monkeypatch.setattr(svc, "_call_groq_json", boom)
        with pytest.raises(QuizGenerationUnavailable) as exc_info:
            svc._call_llm_json("prompt", 0.3)
        assert "Groq quota" in str(exc_info.value)
        assert "GROQ_API_KEY" in str(exc_info.value)

    def test_generate_quiz_without_any_course_material_fails(self, monkeypatch):
        svc = make_service()
        monkeypatch.setattr(svc._rag, "gemini_api_key", "test-only")
        with pytest.raises(ValueError):
            svc.generate_quiz(GenerateSlideQuizRequest(module_title="Empty Module"))

    def test_regenerate_question_returns_validated_question(self, monkeypatch):
        import json
        svc = make_service()

        def fake_call(prompt, temperature=0.2):
            assert "STRICT RULES" in prompt
            return json.dumps({
                "question": {
                    "question_text": "Which lock prevents dirty reads?",
                    "question_type": "MULTIPLE_CHOICE",
                    "blooms_taxonomy_level": "Analyzing",
                    "options": ["Two-phase locking", "Skip locks", "No locks", "Random locks"],
                    "correct_answer": "Two-phase locking",
                    "explanation": "Slide 3 introduces two-phase locking.",
                    "distractor_rationales": [
                        "Correct: two-phase locking prevents dirty reads.",
                        "Wrong: skipping locks causes races.",
                        "Wrong: no locks means no isolation.",
                        "Wrong: random locking is not a protocol.",
                    ],
                    "marking_scheme": "10 points for two-phase locking.",
                    "slide_citation": "Slide 3: Concurrency",
                }
            })

        monkeypatch.setattr(svc, "_call_llm_json", fake_call)
        response = svc.regenerate_question(SingleQuestionRegenerateRequest(
            question_id="abc-123",
            focus_topic="Concurrency",
            target_type="MULTIPLE_CHOICE",
            slide_path=TEST_DOC_PATH,
        ))
        assert response.source == "gemini"
        assert response.question.correct_answer == "Two-phase locking"
        assert response.question.correct_answer in response.question.options
        assert len(response.question.distractor_rationales) == 4
        assert response.question.question_id == "abc-123"


class TestQuizGenerationEndpoints:

    def test_generate_quiz_endpoint_returns_validated_quiz(self, monkeypatch):
        import json
        svc = main.quiz_generation_service
        monkeypatch.setattr(
            svc, "_call_llm_json",
            lambda prompt, temperature=0.4: json.dumps(fake_quiz_payload(2)),
        )
        client = TestClient(main.app)
        res = client.post("/api/v1/ai/slides/generate-quiz", json={
            "module_title": "Storage Module",
            "num_questions": 2,
            "slide_path": TEST_DOC_PATH,
        })
        assert res.status_code == 200
        body = res.json()
        assert body["source"] == "gemini"
        assert body["status"] == "PendingInstructorApproval"
        assert len(body["questions"]) == 2

    def test_generate_quiz_endpoint_503_without_gemini_key(self, monkeypatch):
        svc = main.quiz_generation_service
        monkeypatch.setattr(svc._rag, "gemini_api_key", "")
        client = TestClient(main.app)
        res = client.post("/api/v1/ai/slides/generate-quiz", json={
            "module_title": "Storage Module",
            "slide_path": TEST_DOC_PATH,
        })
        assert res.status_code == 503
        assert "GEMINI_API_KEY" in res.json()["detail"]

    def test_generate_quiz_endpoint_422_without_material(self, monkeypatch):
        svc = main.quiz_generation_service
        monkeypatch.setattr(svc._rag, "gemini_api_key", "test-only")
        client = TestClient(main.app)
        res = client.post("/api/v1/ai/slides/generate-quiz", json={
            "module_title": "Empty Module",
        })
        assert res.status_code == 422
        assert "course material" in res.json()["detail"]

    def test_regenerate_endpoint_exists_and_returns_question(self, monkeypatch):
        import json
        svc = main.quiz_generation_service
        monkeypatch.setattr(
            svc, "_call_llm_json",
            lambda prompt, temperature=0.2: json.dumps({
                "question": {
                    "question_text": "Regenerated question?",
                    "question_type": "MULTIPLE_CHOICE",
                    "blooms_taxonomy_level": "Applying",
                    "options": ["Right", "Wrong 1", "Wrong 2"],
                    "correct_answer": "Right",
                    "explanation": "Grounded in the module content.",
                    "distractor_rationales": ["Correct.", "No.", "No."],
                    "marking_scheme": "10 points.",
                    "slide_citation": None,
                }
            }),
        )
        client = TestClient(main.app)
        res = client.post("/api/v1/ai/questions/q-1/regenerate", json={
            "focus_topic": "Indexes",
            "target_type": "MULTIPLE_CHOICE",
            "module_context": "B-Tree indexes speed up range queries.",
        })
        assert res.status_code == 200
        body = res.json()
        assert body["question"]["correct_answer"] == "Right"
        assert body["source"] == "gemini"

    def test_regenerate_endpoint_502_on_invalid_model_output(self, monkeypatch):
        import json
        svc = main.quiz_generation_service

        def bad_payload(_prompt, temperature=0.2):
            payload = {
                "question": {
                    "question_text": "Broken?",
                    "question_type": "MULTIPLE_CHOICE",
                    "blooms_taxonomy_level": "Applying",
                    "options": ["Only one option"],
                    "correct_answer": "Not present",
                    "explanation": "n/a",
                }
            }
            return json.dumps(payload)

        monkeypatch.setattr(svc, "_call_llm_json", bad_payload)
        client = TestClient(main.app)
        res = client.post("/api/v1/ai/questions/q-1/regenerate", json={
            "module_context": "B-Tree indexes speed up range queries.",
        })
        assert res.status_code == 502
        assert "failed validation" in res.json()["detail"]
