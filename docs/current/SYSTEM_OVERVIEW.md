# Current System Overview

Status baseline: 2026-09-28; source baseline `4f0fee3` plus the recorded live-test extension. Follow the [source of truth](../00_SOURCE_OF_TRUTH.md).

EduFlow AI combines courses, assessments, student participation/progress and AI-assisted learning. Admin, Instructor and Student are application roles, not exclusive ownership of every shared file.

| Layer | Current evidence | Verification limit |
|---|---|---|
| React/Vite | Admin, Instructor and Student pages; Learning Assistant in StudentPortal | Learning workflow verified; not a whole-web-app certification |
| ASP.NET Core | Public authenticated API, business controllers/services, AI gateway | API targets .NET 8; `global.json` selects SDK 10.0.401 |
| PostgreSQL | Business data through EF Core/Npgsql | This documentation pass did not run migrations or certify every business workflow |
| Python/FastAPI | LearningAgent, three learning tools and existing RAG/slide-quiz functions | Distinct Quiz Generator Agent remains assigned/verification pending |
| ChromaDB | Persistent indexed lecture chunks and section metadata | Local indexing is required before discovery |
| Flutter | Screens, API/auth/gamification services and test files exist | Full mobile integration was not verified in this workstream |

Approved AI direction has two agents: Learning Agent and Quiz Generator Agent. The shared RAG pipeline is primarily evidenced by Atheek's implementation; Wazni's Learning Agent reuses it. See [ownership](RESPONSIBILITY_MATRIX.md), [architecture](CURRENT_ARCHITECTURE.md) and [scoped status](IMPLEMENTATION_STATUS.md).
