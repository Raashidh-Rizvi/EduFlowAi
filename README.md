# EduFlow AI

EduFlow AI is a gamified education project for SE3090. It combines course learning, assessments, progress/rewards and adaptive AI guidance for System Admin, Instructor and Student users.

**Implementation is partial.** Documentation describes both existing code and intended behavior; no complete cross-platform workflow, deployment or passing test result is implied by this entry point.

## Start here

- [Documentation start guide](docs/README.md) — reading order and source-of-truth rules
- [Complete documentation catalog](docs/INDEX.md)
- [Run and setup](docs/project/18_RUN_AND_SETUP.md)
- [Implementation status and evidence](docs/project/17_IMPLEMENTATION_STATUS.md)
- [Current responsibility matrix](docs/responsibilities/RESPONSIBILITY_MATRIX.md)
- [Project overview](docs/project/01_PROJECT_OVERVIEW.md)

The team has three current business-component owners; written group-size approval remains **TO CONFIRM**. The four core AI workflow roles remain Planner → Domain Analysis → Action/Tool → Validation/Safety, with authorized human approval where required. Ownership assignments do not prove historical contribution.

## Repository layout

~~~
backend/                 ASP.NET Core API, shared core, EF Core infrastructure and tests
frontend/                React web application
mobile/                  Flutter application
ai-agent/                Internal Python/FastAPI/LangGraph service
.github/workflows/       CI configuration
docs/
  README.md              Start here
  INDEX.md               Complete catalog
  reference/             Official assignment and supporting references
  responsibilities/      Current ownership and individual trackers
  project/               Canonical technical design, plan, status and run guide
  legacy/                Historical material; never current instructions
~~~

## Subsystem entry points

- [Backend](backend/README.md)
- [React frontend](frontend/README.md)
- [Flutter mobile](mobile/README.md)
- [Agentic AI service](ai-agent/README.md)

Use current source and reproducible evidence to establish actual behavior. Do not treat archived blueprints, example test outputs or dependency declarations as proof of implementation.
