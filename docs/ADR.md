# EduFlow AI – Architecture Decision Records (ADRs) 🏛️
> **SE3090 Assignment 1 | Architectural Justifications & Trade-Off Analysis**

This document records the foundational architectural decisions made for the EduFlow AI platform, detailing the context, considered options, decisions taken, and resulting consequences in accordance with Section 14.2 of the SE3090 specification.

---

## Index of Decisions
- [ADR-001: React Web Application State Management](#adr-001-react-web-application-state-management)
- [ADR-002: Flutter Mobile Application State Management](#adr-002-flutter-mobile-application-state-management)
- [ADR-003: Agentic AI Framework & Multi-Agent Orchestration](#adr-003-agentic-ai-framework--multi-agent-orchestration)
- [ADR-004: Persistence Strategy for Agent Workflow State & Audit Trails](#adr-004-persistence-strategy-for-agent-workflow-state--audit-trails)
- [ADR-005: Backend Architecture & Gateway Integration Pattern](#adr-005-backend-architecture--gateway-integration-pattern)
- [ADR-006: Cloud Deployment & Containerization Strategy](#adr-006-cloud-deployment--containerization-strategy)

---

## ADR-001: React Web Application State Management

### Context
The React web dashboard serves instructors and administrators. It requires managing authentication state, paginated course/module listings, live gradebook updates, and the multi-step AI Study Plan approval workflow. We need a state management solution that avoids boilerplate, supports asynchronous data fetching, and provides clear separation of concerns.

### Options Considered
1. **Redux Toolkit (RTK)**: Standard enterprise choice, but involves significant boilerplate (slices, reducers, thunks) for moderate UI complexity.
2. **React Context API + useReducer**: Native without external dependencies, but prone to unnecessary re-renders across deeply nested components.
3. **Zustand**: Lightweight (under 2kB), hook-based, minimal boilerplate, out-of-the-box support for async actions and devtools.

### Decision
We chose **Zustand** as the primary state management solution for the React Web Application.

### Consequences
- **Positive**: Minimal boilerplate code, straightforward async state handling (e.g. fetching AI proposals, approving plans), excellent performance without re-render cascades.
- **Negative**: Less rigid conventions than Redux; team members must adhere to documented store organization patterns.

---

## ADR-002: Flutter Mobile Application State Management

### Context
The Flutter mobile application needs to manage authentication tokens, dynamic course navigation, timed quiz countdowns, and asynchronous AI study plan status updates with clear UI reactivity.

### Options Considered
1. **setState / InheritedWidget**: Inadequate for cross-screen state sharing and separation of business logic.
2. **Provider / ChangeNotifier**: Easy to learn, but can lead to tightly coupled business logic in larger codebases.
3. **BLoC (Business Logic Component) / Cubit**: Strictly separates UI, business logic, and data layers using streams and reactive events; standard industry pattern for mobile Flutter apps.

### Decision
We chose **BLoC / Cubit (flutter_bloc)** for the Flutter Mobile Application.

### Consequences
- **Positive**: Unidirectional data flow, exceptional testability with `bloc_test`, predictable state transitions for quiz timers and auth lifecycles.
- **Negative**: Requires writing event/state classes, adding slight initial development overhead.

---

## ADR-003: Agentic AI Framework & Multi-Agent Orchestration

### Context
The system requires an intelligent study plan generator that decomposes student goals, analyzes historical quiz deficiencies, compiles tailored study schedules, and enforces deterministic safety validation. We need an orchestration framework capable of supporting stateful multi-agent workflows, tool calling, and human-in-the-loop pauses.

### Options Considered
1. **Single Prompt / Direct OpenAI Function Calling**: Lacks multi-step coordination, state machine guarantees, and role separation.
2. **Microsoft AutoGen**: Powerful conversational agents, but conversational turn-taking is non-deterministic and harder to constrain into strict JSON schemas.
3. **LangGraph (LangChain ecosystem)**: Implements state machines (DAGs) with explicit nodes, edges, conditional routing, cyclic retries, and native support for state persistence and human-in-the-loop approval.

### Decision
We chose **LangGraph (Python 3.11)** with **FastAPI** as the dedicated internal Agentic AI orchestration microservice.

### Consequences
- **Positive**: Complete control over agent execution order (Planning -> Analysis -> Recommendation -> Validation), guaranteed structured outputs via Pydantic, seamless retry on validation failure.
- **Negative**: Requires hosting a secondary internal Python runtime behind the ASP.NET Core API gateway.

---

## ADR-004: Persistence Strategy for Agent Workflow State & Audit Trails

### Context
Every agent execution, tool call, prompt input, validation result, and human instructor approval decision must be persisted for auditability, traceability, and final grading evaluation.

### Options Considered
1. **Pure NoSQL (MongoDB)**: Flexible for dynamic agent JSON dumps, but introduces a second database technology and weakens relational integrity with Course/Student tables.
2. **In-Memory Cache (Redis)**: High performance, but lacks long-term durability and relational querying capabilities.
3. **PostgreSQL Relational Schema with `JSONB` for Dynamic Trace Data**: Store core workflow metadata (Status, StudentId, InstructorId, Timestamps) in normalized tables, while storing detailed agent execution traces and tool outputs in PostgreSQL `JSONB` columns.

### Decision
We chose a **hybrid relational + JSONB strategy in PostgreSQL 16**, managed via **Entity Framework Core**.

### Consequences
- **Positive**: Unified database infrastructure, ACID transactional guarantees when instructors approve plans, powerful indexing via GIN on JSONB execution traces, seamless EF Core mapping.
- **Negative**: Requires careful DTO mapping in C# to deserialize JSONB audit logs.

---

## ADR-005: Backend Architecture & Gateway Integration Pattern

### Context
The assignment specification strictly mandates that React and Flutter clients must communicate exclusively through the ASP.NET Core Web API. The Python LangGraph AI service must remain an internal subsystem.

### Options Considered
1. **Direct Client Access to AI Service**: Exposing Python API to clients (Strictly violates assignment specification).
2. **API Gateway / Microservice Proxy in ASP.NET Core**: ASP.NET Core acts as the authoritative boundary for all client authentication, authorization, business rules, and proxies internal requests to LangGraph via typed HTTP clients (`HttpClientFactory`).

### Decision
We adopted the **ASP.NET Core Authoritative Gateway & Orchestrator Pattern**.

### Consequences
- **Positive**: Single point of security enforcement (JWT, rate limiting, role checks), clients remain agnostic to AI implementation details, seamless integration of audit logging directly in EF Core.
- **Negative**: Additional network hop between ASP.NET Core and the Python service.

---

## ADR-006: Cloud Deployment & Containerization Strategy

### Context
The application must be deployed to cloud hosting environments with working live URLs, Swagger access, database initialization, and reproducible local startup scripts without requiring paid subscriptions.

### Options Considered
1. **Manual Virtual Machine Deployment (AWS EC2 / Azure VM)**: High maintenance overhead and potential hosting cost.
2. **Containerized Multi-Service Deployment (Docker Compose + Render / Railway / Azure Free Tier)**: Containerize all services (ASP.NET Core, React static build, Python AI service, PostgreSQL) with Docker and deploy to managed free-tier / student cloud hosting.

### Decision
We chose **Docker containerization with Docker Compose for local reproducibility** and deployed to **Render / Azure App Services** with managed **PostgreSQL (Supabase / Render PostgreSQL)**.

### Consequences
- **Positive**: Single-command local startup (`docker compose up`), fully reproducible builds in GitHub Actions CI, no cloud hosting costs for academic evaluation.
- **Negative**: Cold-start latency on certain free-tier cloud instances.
