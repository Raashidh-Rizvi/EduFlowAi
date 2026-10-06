"""Learning-only tests: real ephemeral Chroma, deterministic embeddings, mocked LLM."""
import importlib
import json
import uuid
from unittest.mock import Mock

import chromadb
import pytest
from chromadb.api.types import EmbeddingFunction
from fastapi.testclient import TestClient

from agents.learning_agent import LearningAgent
from models.schemas import LearningRequest
from rag.chunker import DocumentChunk
from rag.rag_service import SimpleRagService
from rag.vector_store import ChromaVectorStore


class DeterministicEmbeddings(EmbeddingFunction):
    def __init__(self):
        pass

    @staticmethod
    def name():
        return "learning-test-embeddings"

    def __call__(self, input):
        return [[1.0, float('search' in t.lower()), float('queue' in t.lower())] for t in input]


SECTIONS = [
    {"title": "Search basics", "page_start": 1, "page_end": 1, "topics": ["States and goals"]},
    {"title": "Breadth first search", "page_start": 2, "page_end": 3, "topics": ["FIFO queue", "Visited states"]},
]
PLAN = {"title": "Study search", "sessions": [
    {"session_number": 1, "title": "Read and recall", "tasks": ["Read the selected slides and explain the queue."], "estimated_minutes": 25}
]}


@pytest.fixture
def environment(monkeypatch):
    store = ChromaVectorStore.__new__(ChromaVectorStore)
    client = chromadb.EphemeralClient()
    store.collection = client.create_collection(f"learning-{uuid.uuid4().hex}", embedding_function=DeterministicEmbeddings())
    store.add_chunks([
        DocumentChunk("Search describes states and goals.", 1, "Search basics", "search.pdf", "course-a", "module-a", 0),
        DocumentChunk("Breadth first search uses a FIFO queue.", 2, "Breadth first search", "search.pdf", "course-a", "module-a", 1),
        DocumentChunk("Track visited states to avoid repeating work.", 3, "Visited states", "search.pdf", "course-a", "module-a", 2),
        DocumentChunk("Unrelated secret from a different lecture.", 1, "Other", "other.pdf", "course-b", "module-b", 0),
    ])
    rag = SimpleRagService(vector_store=store)
    llm = Mock(return_value=(json.dumps(SECTIONS), "mock"))
    monkeypatch.setattr(rag, "_generate_llm_answer", llm)
    agent = LearningAgent(rag)
    # Import the real API without opening or changing the user's persistent index.
    monkeypatch.setattr("rag.rag_service.SimpleRagService", lambda: rag)
    main = importlib.import_module("main")
    monkeypatch.setattr(main, "rag_service", rag)
    monkeypatch.setattr(main, "learning_agent", agent)
    yield agent, rag, llm, TestClient(main.app)
    client.delete_collection(store.collection.name)


def request(kind, **kwargs):
    return LearningRequest(request_type=kind, source_file="search.pdf", course_id="course-a", **kwargs)


def test_learning_agent_initializes(environment):
    agent, rag, _, _ = environment
    assert agent.rag is rag
    assert agent.breakdown and agent.planner and agent.explainer


def test_breakdown_is_structured_persisted_and_reused(environment):
    agent, rag, llm, _ = environment
    result = agent.learn(request("breakdown"))
    assert len(result.sub_lectures) == 2
    section = result.sub_lectures[1]
    assert (section.page_start, section.page_end, section.source_file) == (2, 3, "search.pdf")
    assert section.topics == ["FIFO queue", "Visited states"]
    assert "Unrelated secret" not in llm.call_args.args[1]
    assert agent.learn(request("breakdown")) == result
    assert llm.call_count == 1
    chunks = rag.vector_store.get_lecture_chunks("search.pdf", "course-a")
    assert chunks[1]["metadata"]["sub_lecture_id"] == section.id
    assert chunks[1]["metadata"]["title"] == "Breadth first search"
    assert "sub_lecture_id" not in rag.vector_store.get_lecture_chunks("other.pdf")[0]["metadata"]


def test_full_lecture_plan_includes_all_selected_slides(environment):
    agent, _, llm, _ = environment
    llm.return_value = (json.dumps(PLAN), "mock")
    plan = agent.learn(request("plan")).plan
    assert plan.sessions[0].estimated_minutes == 25
    assert plan.sessions[0].sub_lecture_id is None
    context = llm.call_args.args[1]
    assert "states and goals" in context and "FIFO queue" in context and "visited states" in context
    assert "Unrelated secret" not in context


def test_topic_plan_remains_in_selected_section(environment):
    agent, _, llm, _ = environment
    section = agent.learn(request("breakdown")).sub_lectures[1]
    llm.return_value = (json.dumps(PLAN), "mock")
    result = agent.learn(request("plan", sub_lecture_id=section.id, topic="FIFO queue"))
    assert result.plan.sessions[0].sub_lecture_id == section.id
    assert "FIFO queue" in llm.call_args.args[0]
    assert "states and goals" not in llm.call_args.args[1]
    assert "Unrelated secret" not in llm.call_args.args[1]


def test_explanation_uses_scoped_retrieval_and_citations(environment):
    agent, _, llm, _ = environment
    section = agent.learn(request("breakdown")).sub_lectures[1]
    llm.return_value = ("According to Slide 2, breadth first search uses a FIFO queue.", "mock")
    result = agent.learn(request("explain", sub_lecture_id=section.id))
    assert "FIFO queue" in result.answer
    assert result.citations
    assert all(c.source_file == "search.pdf" and c.page_number in [2, 3] for c in result.citations)
    assert "states and goals" not in llm.call_args.args[1]
    assert "Unrelated secret" not in llm.call_args.args[1]


@pytest.mark.parametrize("payload", [
    {"request_type": "quiz", "source_file": "search.pdf"},
    {"request_type": "plan"},
    {"request_type": "plan", "source_file": "  "},
])
def test_invalid_api_requests_are_rejected(environment, payload):
    _, _, llm, api = environment
    assert api.post("/api/v1/agent/learn", json=payload).status_code == 422
    llm.assert_not_called()


@pytest.mark.parametrize("kind", ["breakdown", "plan", "explain"])
def test_unindexed_lecture_returns_safe_error(environment, kind):
    _, _, llm, api = environment
    res = api.post("/api/v1/agent/learn", json={"request_type": kind, "source_file": "missing.pdf"})
    assert res.status_code == 404
    assert "not indexed" in res.json()["detail"]
    llm.assert_not_called()


def test_wrong_course_and_stale_topic_do_not_leak_content(environment):
    agent, _, llm, api = environment
    res = api.post("/api/v1/agent/learn", json={"request_type": "plan", "source_file": "search.pdf", "course_id": "course-b"})
    assert res.status_code == 404
    section = agent.learn(request("breakdown")).sub_lectures[0]
    for fields in [{"sub_lecture_id": "stale-id"}, {"sub_lecture_id": section.id, "topic": "Invented topic"}]:
        res = api.post("/api/v1/agent/learn", json={"request_type": "plan", "source_file": "search.pdf", **fields})
        assert res.status_code == 422
    assert llm.call_count == 1


@pytest.mark.parametrize("reply,provider", [("invalid JSON", "mock"), ("Excerpt fallback", "extractive")])
def test_generation_failure_returns_retryable_error(environment, reply, provider):
    _, _, llm, api = environment
    llm.return_value = (reply, provider)
    res = api.post("/api/v1/agent/learn", json={"request_type": "plan", "source_file": "search.pdf"})
    assert res.status_code == 503
    assert "detail" in res.json()


def test_breakdown_rejects_invented_slide_ranges(environment):
    _, rag, llm, api = environment
    llm.return_value = (json.dumps([{**SECTIONS[0], "page_end": 99}]), "mock")
    assert api.post("/api/v1/agent/learn", json={"request_type": "breakdown", "source_file": "search.pdf"}).status_code == 503
    assert all("sub_lecture_id" not in c["metadata"] for c in rag.vector_store.get_lecture_chunks("search.pdf"))


def test_real_learning_api_flow(environment):
    _, _, llm, api = environment
    base = {"source_file": "search.pdf", "course_id": "course-a", "student_id": "student-1"}
    breakdown = api.post("/api/v1/agent/learn", json={**base, "request_type": "breakdown"})
    assert breakdown.status_code == 200
    section_id = breakdown.json()["sub_lectures"][1]["id"]
    llm.return_value = (json.dumps(PLAN), "mock")
    for scope in [{}, {"sub_lecture_id": section_id}]:
        res = api.post("/api/v1/agent/learn", json={**base, "request_type": "plan", **scope})
        assert res.status_code == 200 and res.json()["plan"]["sessions"]
    llm.return_value = ("Slide 2 describes a FIFO queue.", "mock")
    res = api.post("/api/v1/agent/learn", json={**base, "request_type": "explain", "sub_lecture_id": section_id})
    assert res.status_code == 200 and res.json()["citations"]


def test_existing_rag_and_coach_chat_and_decks_still_work(environment):
    _, _, llm, api = environment
    llm.return_value = ("Slide 2 describes a FIFO queue.", "mock")
    for endpoint, field in [("/api/v1/rag/chat", "question"), ("/ai-coach-chat", "message")]:
        for scope in [{"source_file": "search.pdf"}, {"course_id": "course-a"}]:
            res = api.post(endpoint, json={field: "Explain search", **scope})
            assert res.status_code == 200
            assert res.json()["citations"]
            assert all(c["source_file"] == "search.pdf" for c in res.json()["citations"])
    assert len(api.get("/api/v1/rag/slide-decks").json()["slide_decks"]) == 2


def test_filter_failure_never_retries_without_scope(environment, monkeypatch):
    _, rag, _, _ = environment
    query = Mock(side_effect=RuntimeError("filter error"))
    monkeypatch.setattr(rag.vector_store.collection, "query", query)
    with pytest.raises(RuntimeError):
        rag.vector_store.search("search", source_file="search.pdf")
    assert query.call_count == 1
    assert query.call_args.kwargs["where"] == {"source_file": {"$eq": "search.pdf"}}


@pytest.mark.parametrize("endpoint,field", [("/ai-coach-chat", "message"), ("/api/v1/rag/chat", "question")])
def test_stm_retains_three_complete_pairs_and_drops_fourth_oldest(environment, endpoint, field):
    agent, _, llm, api = environment
    scope = {"student_id": "student-a", "session_id": "session-a", "course_id": "course-a", "source_file": "search.pdf"}
    for number in range(1, 6):
        llm.return_value = (f"answer-{number}", "mock")
        assert api.post(endpoint, json={**scope, field: f"question-{number}"}).status_code == 200
        expected = [
            {"role": role, "content": f"{prefix}-{i}"}
            for i in range(max(1, number - 3), number)
            for role, prefix in [("user", "question"), ("assistant", "answer")]
        ]
        assert llm.call_args.kwargs["conversation_history"] == expected
        assert llm.call_args.args[0] == f"question-{number}"
    stored = agent.memory.history(agent.memory.key(**scope))
    assert len(stored) == 6
    assert [m["content"] for m in stored] == ["question-3", "answer-3", "question-4", "answer-4", "question-5", "answer-5"]


@pytest.mark.parametrize("other_scope", [
    {"student_id": "student-b"},
    {"session_id": "session-b"},
    {"source_file": "other.pdf"},
    {"source_file": None},
    {"course_id": "different-course"},
])
def test_stm_isolates_users_sessions_and_lecture_scopes(environment, other_scope):
    agent, _, llm, _ = environment
    scope = {"student_id": "student-a", "session_id": "session-a", "course_id": "course-a", "source_file": "search.pdf"}
    llm.return_value = ("Original scoped answer", "mock")
    agent.chat("Original scoped question", **scope)
    llm.return_value = ("Different conversation", "mock")
    agent.chat("New question", **{**scope, **other_scope})
    assert llm.call_args.kwargs["conversation_history"] == []
    agent.chat("Return to original conversation", **scope)
    assert llm.call_args.kwargs["conversation_history"] == [
        {"role": "user", "content": "Original scoped question"},
        {"role": "assistant", "content": "Original scoped answer"},
    ]


@pytest.mark.parametrize("identity", [{}, {"student_id": "student-a"}, {"session_id": "session-a"}])
def test_stm_missing_identity_or_session_remains_stateless(environment, identity):
    agent, _, llm, _ = environment
    llm.return_value = ("Answer", "mock")
    for question in ["First question", "Next question"]:
        agent.chat(question, source_file="search.pdf", **identity)
        assert llm.call_args.kwargs["conversation_history"] == []


def test_stm_does_not_store_failed_turns_or_fallbacks(environment):
    agent, _, llm, _ = environment
    scope = {"student_id": "student-a", "session_id": "session-a", "source_file": "search.pdf"}
    llm.return_value = ("Completed answer", "mock")
    agent.chat("Completed question", **scope)
    before = agent.memory.history(agent.memory.key(**scope))
    llm.side_effect = RuntimeError("provider unavailable")
    with pytest.raises(RuntimeError):
        agent.chat("Failed question", **scope)
    llm.side_effect = None
    llm.return_value = ("Offline extract", "extractive")
    agent.chat("Offline question", **scope)
    assert agent.memory.history(agent.memory.key(**scope)) == before


def test_stm_explanation_and_chat_share_only_the_same_scoped_session(environment):
    agent, _, llm, api = environment
    scope = {"student_id": "student-a", "session_id": "session-a", "course_id": "course-a", "source_file": "search.pdf"}
    section = agent.learn(request("breakdown")).sub_lectures[1]
    llm.return_value = ("A queue stores the next states.", "mock")
    agent.chat("What is a queue?", **scope)
    llm.return_value = ("Slide 2 describes FIFO processing.", "mock")
    result = api.post("/api/v1/agent/learn", json={**scope, "request_type": "explain", "sub_lecture_id": section.id})
    assert result.status_code == 200
    assert llm.call_args.kwargs["conversation_history"][0]["content"] == "What is a queue?"
    agent.chat("Can you clarify that?", **scope)
    history = llm.call_args.kwargs["conversation_history"]
    assert len(history) == 4
    assert history[-1]["content"] == "Slide 2 describes FIFO processing."
    assert all(c["source_file"] == "search.pdf" for c in result.json()["citations"])


def test_provider_failures_and_closed_stdout_still_return_extractive_chat(environment, monkeypatch):
    """A provider error must not become HTTP 500 because the dev runner closed stdout."""
    _, rag, _, api = environment
    rag.llm_provider = "groq"
    rag.groq_api_key = "test-only"
    rag.gemini_api_key = "test-only"
    monkeypatch.setattr("groq.Groq", Mock(side_effect=RuntimeError("provider failed")))
    monkeypatch.setattr("google.genai.Client", Mock(side_effect=RuntimeError("provider failed")))
    monkeypatch.setattr(rag, "_generate_llm_answer", SimpleRagService._generate_llm_answer.__get__(rag))
    with monkeypatch.context() as ctx:
        ctx.setattr("builtins.print", Mock(side_effect=OSError(22, "Invalid argument")))
        response = api.post("/ai-coach-chat", json={"message": "Explain search", "source_file": "search.pdf"})
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "extractive_rag"
    assert data["reply"].strip() and data["citations"]
    assert all(c["source_file"] == "search.pdf" for c in data["citations"])


def test_existing_gemini_fallback_is_used_if_groq_fails(environment, monkeypatch):
    _, rag, _, _ = environment
    rag.llm_provider = "groq"
    rag.groq_api_key = "test-only"
    rag.gemini_api_key = "test-only"
    monkeypatch.setattr("groq.Groq", Mock(side_effect=RuntimeError("primary unavailable")))
    client = Mock()
    client.models.generate_content.return_value.text = "Grounded secondary answer"
    monkeypatch.setattr("google.genai.Client", Mock(return_value=client))
    text, provider = SimpleRagService._generate_llm_answer(rag, "question", "slide excerpt")
    assert (text, provider) == ("Grounded secondary answer", "gemini")
