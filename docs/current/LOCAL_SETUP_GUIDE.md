# Local Setup and Learning Smoke Test

[Authority](../00_SOURCE_OF_TRUTH.md). Commands are instructions, not proof of a new run. Do not overwrite an existing environment or re-index existing lectures unnecessarily.

## Prerequisites and configuration

- Node/npm for the repository and React frontend; Python with the `ai-agent/.venv` virtual environment; PostgreSQL for business data.
- API target: .NET 8. The checked-in `global.json` selects **SDK 10.0.401**. Use a compatible installed SDK/runtime according to the actual project files; do not edit them as a documentation workaround.
- Configure the backend database and service settings privately. `AiService:BaseUrl` should match Python, normally `http://localhost:8888`. Keep credentials out of documents and version control.
- React defaults to `http://localhost:5204/api`; `VITE_API_BASE_URL` can override that backend URL. Learning browser requests must continue through ASP.NET.

From repository root, install dependencies as needed:

```powershell
npm install
npm --prefix frontend ci
dotnet restore backend/EduFlow.slnx
```

From `ai-agent/`, create the virtual environment **only if absent**, then install:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create `.env` from `.env.example` only when `.env` is absent. Enter provider credentials privately. Relevant names: `LLM_PROVIDER`, `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `EMBEDDING_PROVIDER`, `CHROMA_PERSIST_DIR`; an internal-service token setting also exists. A setting's presence is not a security-enforcement certification.

The example file contains older comments/model defaults; do not treat them as verified available models. The recorded successful generation configuration used Groq `openai/gpt-oss-120b` and Gemini `models/gemini-flash-latest`. Provider availability is account/time dependent. Preserve the embedding configuration matching an existing Chroma index. Never paste keys into a report.

For a new database, review configuration and existing migrations/initialization before applying them:

```powershell
dotnet ef database update --project backend/EduFlow.Infrastructure --startup-project backend/EduFlow.Api
```

This can change business data; it is not a diagnostic check or proof that User/Course Management is complete.

## Start and verify services

From repository root:

```powershell
npm run dev
```

`dev-runner.js` launches React/Vite, `dotnet watch run`, and `.venv` Python Uvicorn with reload. Expected ports: **2174 / 5204 / 8888**. It does not start PostgreSQL or automatically index every lecture. Do not also start independent copies on the same port.

Read-only checks:

```powershell
Invoke-WebRequest http://localhost:8888/health
Invoke-WebRequest http://localhost:5204/health
```

Use Python `/docs` and backend `/swagger` to inspect actual contracts. If manually starting Python, run from `ai-agent/`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8888
```

Use either the runner or manual service launches. A reload supervisor/worker pair is normal; separate competing server instances are not required. Do not disable Windows security policy to start a build.

## Index only missing local material

Lecture discovery reads Chroma, not the uploads folder. Normal upload currently saves the PDF without automatically indexing it. If a lecture is missing, use Python's `/docs` → `POST /api/v1/rag/index-pdf` with:

- `file_path`: actual absolute local PDF path readable by Python;
- `course_id`: its real course identifier;
- `module_id`: its actual module identifier when available.

This operation writes the index and may call the configured embedding provider. Avoid repeating it for an already indexed lecture. `setup_check.py` is an indexing/provider-check utility, not a harmless health check; see [RAG details](RAG_PIPELINE.md). Never delete Chroma or change embedding providers as a routine fix.

## Learning Assistant smoke test

Use an existing authorized student account; no credentials are documented here. Open Student → AI Assistant. Verify global Q&A, then select an indexed lecture. Send scoped chat, check citations and ask a follow-up. Generate Break Into Topics, select a section/subtopic, generate its study plan and explanation, then generate Complete Lecture Study Plan. Errors should remain visible and retryable.

[Focused test commands and previously observed results](../members/member-1-wazni/ai/LEARNING_AGENT_TEST_EVIDENCE.md). The broad Python suite contains a legacy reliability test referencing removed modules; do not restore those modules to satisfy historical tests.
