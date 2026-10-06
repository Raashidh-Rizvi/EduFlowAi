# EduFlow AI — Project Overview

**Document role:** canonical product overview. Implementation is PARTIAL; design intent is not proof of a working feature. Read [Start here](../README.md), the [responsibility matrix](../responsibilities/RESPONSIBILITY_MATRIX.md) and [implementation status](17_IMPLEMENTATION_STATUS.md).

## Problem and solution

EduFlow AI aims to help students sustain learning through course content, practice, assessments, visible progress and adaptive guidance. Instructors author and review academic content; administrators govern platform access and operations. The system combines deterministic academic/reward rules with AI proposals that require validation and authorized human review where applicable.

The project is not yet a completed cross-platform submission. Web/backend/AI features exist, while Flutter currently contains local prototypes and several security, persistence and approval integrations remain incomplete.

## Users and current business components

| Student / identity | Application role | Primary component |
|---|---|---|
| Student 1 — Ahamed M.A. / IT24103352 | System Admin | System Administration, User & Course Governance, Reporting and AI Safety |
| Student 2 — Raashidh M.R. / IT24104191 | Instructor | Instructor Curriculum, Assessment and AI Content Management |
| Student 3 — Atheek M.F. / IT24103933 | Student | Student Learning, Progress, Gamification and Adaptive Guidance |

Student 1 owns global user/course governance, access policy and platform reporting/auditing/configuration. Student 2 owns academic curriculum, modules, lessons, topics, documents, assessments, grading contracts, publishing and academic AI review. Admin access does not transfer academic implementation ownership. Student 3 owns participation, attempts, progress, gamification and learner guidance.

These are future working responsibilities, not proof of historical contribution. Each student must contribute across backend, PostgreSQL, React, Flutter, tests, security/integration, documentation/Git and Agentic AI. Shared infrastructure remains shared. Written group-size approval and proportional assignment adjustments remain **TO CONFIRM**.

## Core learning loop

Learn published content → practice → attempt an assessment/challenge → receive a graded outcome → earn eligible deterministic rewards/progress → analyze learning evidence → propose the next useful activity → validate/review where required → continue learning.

The backend must enforce permissions, grading contracts, reward eligibility and persistence. AI does not become the authority for grades, XP or access. Current reward integrity and academic approval gaps are recorded in the status summary.

## Technology stack and evidence

| Layer | Current repository evidence | Important limit |
|---|---|---|
| Public backend | C# / ASP.NET Core targeting .NET 10; EF Core 10 | Authorization, migration and transaction gaps remain |
| Database | PostgreSQL via EF Core/Npgsql | Migration drift and reset-prone initialization need verification |
| Web | React 18, Vite 5, Axios | Hooks/context/storage are used; proposed Router/Zustand architecture is not established |
| Mobile | Flutter / Dart; dependencies include BLoC, Dio and secure storage | Dependency declarations do not establish integration; screens use local setState |
| AI service | Python, FastAPI, LangGraph and model-provider integrations | Durable recovery, validation enforcement and approval execution are incomplete |
| Verification/delivery | xUnit, Playwright, pytest and GitHub Actions sources | Source/configuration is not evidence of a passing run or deployment |

See the [architecture decisions](14_ARCHITECTURE_DECISIONS.md) for unresolved proposals. Redis, SignalR and vector retrieval are documented targets, not verified operational dependencies.

## System boundary and AI roles

The intended public boundary is React/Flutter → authenticated ASP.NET Core API → PostgreSQL and the internal Python AI gateway. Both clients must use the same identity, permissions and business rules.

Retain four demonstrable core roles:

**Planner → Domain Analysis → Action/Tool → Validation/Safety → authorized human approval where required → backend-controlled execution and persisted status.**

Student 1 owns Validation/Safety and supports Planner/lifecycle; Student 2 owns Action/Tool and academic generation/evaluation; Student 3 owns Domain Analysis and learner guidance. Supporting agents do not replace the four core roles. The complete Flutter → API → database → AI → React review → mobile status scenario has not been demonstrated.

## Continue reading

- [System workflows](02_SYSTEM_WORKFLOWS.md)
- [Architecture](03_ARCHITECTURE.md)
- [AI orchestration](09_AI_ORCHESTRATION.md)
- [Implementation status and evidence](17_IMPLEMENTATION_STATUS.md)
- [Run and setup guide](18_RUN_AND_SETUP.md)
- [Official assignment specification](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md)
