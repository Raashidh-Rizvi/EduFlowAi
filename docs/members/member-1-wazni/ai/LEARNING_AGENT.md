# Learning Agent — Implemented Responsibility

Owner: Wazni / IT24103352. Verified within the [recorded evidence](LEARNING_AGENT_TEST_EVIDENCE.md); [project authority](../../../00_SOURCE_OF_TRUTH.md). Purpose: help a learner understand and study actual indexed lecture material while retaining source scope and citations.

## Components and orchestration

| Source file | Responsibility |
|---|---|
| [learning_agent.py](../../../../ai-agent/agents/learning_agent.py) | Single orchestration point for learning actions and scoped chat |
| [short_term_memory.py](../../../../ai-agent/agents/short_term_memory.py) | Process-local identity/scope keys and three-pair deques |
| [breakdown_tool.py](../../../../ai-agent/tools/breakdown_tool.py) | Generate, validate and cache lecture topic sections |
| [planner_tool.py](../../../../ai-agent/tools/planner_tool.py) | Generate structured sessions from full lecture or selected section |
| [explainer_tool.py](../../../../ai-agent/tools/explainer_tool.py) | Retrieve scoped chunks, explain simply and attach citations |
| [learning_support.py](../../../../ai-agent/tools/learning_support.py) | Shared grounded generation and JSON validation helpers |
| [schemas.py](../../../../ai-agent/models/schemas.py) / [main.py](../../../../ai-agent/main.py) | Pydantic contracts, routes and errors |
| [StudentPortal.jsx](../../../../frontend/src/pages/Student/StudentPortal.jsx) / [aiService.js](../../../../frontend/src/services/aiService.js) | Existing CoachTab controls, selectedDeck, topic actions and API calls |
| [AiReviewController.cs](../../../../backend/EduFlow.Api/Controllers/AiReviewController.cs) / [AiGatewayClient.cs](../../../../backend/EduFlow.Infrastructure/Services/AiGatewayClient.cs) | Authenticated public gateway and internal HTTP transport |

## Tools and grounding

**Breakdown:** loads all chunks for source_file and optional course. A content fingerprint allows reuse of validated cached sections. The model groups actual slides; validation rejects empty topics, invalid/overlapping ranges and incomplete slide coverage. Returned sections retain title, page range, topics, source_file and a fingerprint/range-derived ID. Cache writes update metadata, not document text or embeddings. First-time generation is serialized with the existing lock.

**Planner:** full-lecture plans use the selected lecture chunks. For a section/topic, LearningAgent resolves the returned section ID, rejects stale/foreign topics and restricts context to its slide range. Output has title and sessions with number, tasks, estimated minutes and applicable sub_lecture_id. A selected subtopic is also passed as the generation focus within that section.

**Explainer:** retrieves from the selected source/course/sub-lecture, defensively checks returned scope, asks for beginner English and a supported example, then attaches page/source citations. Prefer a concrete subtopic when an organizational heading is too broad.

The [existing shared RAG](../../../current/RAG_PIPELINE.md) supplies parsing, embeddings, Chroma and generation. Atheek primarily implemented that foundation; this agent reuses it. No separate vector database or legacy graph is introduced.

## STM: latest three completed pairs

Memory is a deque with maximum three `(user, assistant)` pairs. Before generating a response it supplies at most six historical messages, followed by the current question. After a successful turn it appends the pair, dropping the oldest when necessary.

The key contains student_id, session_id, course_id, source_file and optional module_id. Missing student/session identity makes chat stateless. Different users, sessions, lectures, global scope and courses do not share a key. Chat and topic explanation can share the same scoped session. Failed chat turns and `rag_fallback`/`extractive_rag` turns are not added by the chat wrapper. Plans/breakdowns do not become conversational pairs.

This is process-local STM, not durable memory. Python restart clears it; independent workers do not share it. No Redis, database migration or long-term-memory framework was added.

## Integration and frontend workflow

```text
React → POST /api/aireview/learn → ASP.NET gateway
      → POST /api/v1/agent/learn → LearningAgent → selected tool → existing RAG
```

Chat uses `/api/aireview/coach/chat` → `/ai-coach-chat`. Discovery and RAG chat also use ASP.NET. Authenticated identity is substituted at the public boundary. [Actual contracts](../../../current/API_CONTRACTS.md).

Global mode keeps Q&A and hides lecture actions. Selecting an indexed source preserves normal scoped chat and exposes Complete Lecture Study Plan and Break Into Topics. The expandable tree allows section/subtopic selection, Study This Topic and Explain This Topic. Citations and existing Deep Dive controls remain available. Switching lecture changes scope; there is no second lecture-selection system.

## Errors and limits

Unindexed lectures, stale topics, invalid JSON and provider failures produce explicit errors for learning tools. Chat can show identified extractive RAG rather than fake educational success. Lecture indexing must precede discovery; normal upload alone does not index.

Broad follow-up retrieval can select introductory slides and yield insufficient information. Citations preserve retrieved source identity but are not a universal factuality guarantee. Local test results do not certify global enrollment authorization, other members' systems or production deployment. The reported historical breakdown timeout was not reproduced and no production timeout changed.
