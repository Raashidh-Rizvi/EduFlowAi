# Current Architecture

This describes source-backed structure and the verified Learning workflow, not every proposed feature in historical blueprints. [Authority](../00_SOURCE_OF_TRUTH.md).

```text
React browser ────────→ ASP.NET Core public API
                               ├─ business controllers/services → EF Core → PostgreSQL
Flutter API services ──────────┤  (mobile full workflow not verified here)
                               └─ AiGatewayClient → Python/FastAPI
                                                      ├─ LearningAgent
                                                      │   ├─ BreakdownTool
                                                      │   ├─ StudyPlannerTool
                                                      │   └─ ExplainerTool
                                                      └─ existing shared RAG/slide-quiz functions
                                                             ├─ ChromaDB
                                                             └─ configured Groq/Gemini providers
```

PostgreSQL is business-data storage, not an intermediate network hop to Python. Python retrieves vectors directly from its existing Chroma store. The approved separate Quiz Generator Agent is a responsibility/target; a dedicated completed agent is not asserted by this diagram.

## Verified Learning request paths

- Chat: `StudentPortal` → `aiService.chatWithCoach` → `/api/aireview/coach/chat` → `/ai-coach-chat` → `LearningAgent.chat` → RAG → answer/citations.
- Learning actions: `aiService.learn` → `/api/aireview/learn` → `/api/v1/agent/learn` → selected tool.
- Discovery: `/api/aireview/learning/slide-decks` → `/api/v1/rag/slide-decks` → Chroma metadata.

ASP.NET authenticates the learning/chat request and substitutes the authenticated student identity. It forwards Python response bodies/status. Browser Learning requests do not call Python directly. This does not certify every course-authorization rule or deployed internal-service security control.

STM is a process-local three-pair deque keyed by student/session/course/source/module. Multiple independent Python service instances do not share memory. Use one local dev service; a reload supervisor and its worker are normal, but independently launched duplicate servers should be avoided.

Section caching updates existing chunk metadata without replacing documents or embeddings. No new vector database, long-term memory framework or shared graph is required. See [RAG](RAG_PIPELINE.md), [contracts](API_CONTRACTS.md), and [Learning details](../members/member-1-wazni/ai/LEARNING_AGENT.md).
