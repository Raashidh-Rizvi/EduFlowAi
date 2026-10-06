# EduFlow AI — Learning Agent and Shared RAG

FastAPI service with the implemented LearningAgent, Breakdown/Planner/Explainer tools, process-local STM and existing parser/chunker/embeddings/Chroma RAG. The approved separate Quiz Generator Agent is assigned to Member 2; existing slide-quiz functions are not a completion claim for that distinct agent.

From `ai-agent/`, after following [setup](../docs/current/LOCAL_SETUP_GUIDE.md):

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8888
```

Do not run this separately when the root dev runner already owns the service. `/health` and `/docs` expose health and actual routes. Browser Learning traffic goes through ASP.NET, not directly to this service.

Lecture discovery requires indexed Chroma content. Uploading a PDF alone does not index it. Preserve existing `.env`, embedding configuration and Chroma data. `setup_check.py` writes the index and calls providers; it is not a read-only diagnostic.

[Actual contracts](../docs/current/API_CONTRACTS.md) · [RAG pipeline and contribution credit](../docs/current/RAG_PIPELINE.md) · [Learning details](../docs/members/member-1-wazni/ai/LEARNING_AGENT.md) · [Focused tests](../docs/members/member-1-wazni/ai/LEARNING_AGENT_TEST_EVIDENCE.md)

Use [current authority](../docs/00_SOURCE_OF_TRUTH.md). Historical graph/agent tests or examples do not authorize restoring removed modules. Current model availability must be checked against configuration/provider access; old README model names and speed guarantees are not authoritative.
