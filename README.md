# EduFlow AI

Education platform combining courses, assessments, student progress and AI-assisted learning across React, ASP.NET Core, PostgreSQL, Python/RAG and Flutter.

Start with the [documentation source of truth](docs/00_SOURCE_OF_TRUTH.md), [catalog](docs/INDEX.md), [current status](docs/current/IMPLEMENTATION_STATUS.md), and [responsibility matrix](docs/current/RESPONSIBILITY_MATRIX.md).

The approved AI direction is Learning Agent + Quiz Generator Agent using shared RAG/Chroma. Learning Agent is verified within its recorded scope; distinct Quiz Generator completion and Admin/User/Course software verification remain pending. The entire project and assignment compliance are not certified complete.

## Local development

Follow the [current setup guide](docs/current/LOCAL_SETUP_GUIDE.md) before starting services. From repository root, `npm run dev` launches React (2174), ASP.NET (5204) and Python (8000). PostgreSQL/configuration and local lecture indexing are separate prerequisites. Do not run competing server instances or overwrite existing private configuration.

Learning browser requests follow **React → ASP.NET Core → Python**.

## Repository entry points

- [Backend](backend/README.md): business API, EF Core/PostgreSQL and AI gateway.
- [Frontend](frontend/README.md): Admin, Instructor and Student interfaces.
- [Python AI](ai-agent/README.md): Learning Agent, tools and shared RAG.
- [Mobile](mobile/README.md): Flutter source; integration status is scoped.
- [Member documentation](docs/INDEX.md#member-documentation): attributed contribution evidence.
- [Official references](docs/INDEX.md#official-references) and [historical archive](docs/legacy/README.md): distinct authority, not competing implementation plans.
