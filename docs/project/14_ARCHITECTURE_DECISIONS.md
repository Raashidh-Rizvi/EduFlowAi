# EduFlow AI – Architecture Decision Records (ADRs) 🏛️

> **Canonical design/reference document.** Read [Start here](../README.md) and the [responsibility matrix](../responsibilities/RESPONSIBILITY_MATRIX.md). Use [implementation status](17_IMPLEMENTATION_STATUS.md) and current source/evidence to distinguish implemented behavior from targets. Examples and proposed routes are not certified runtime results.

> **Reconciliation note:** Read the [current responsibility matrix](../responsibilities/RESPONSIBILITY_MATRIX.md) for ownership and audited status. Zustand/BLoC here conflict with React Query/Provider in the [root ADR](../legacy/adrs/ROOT_ADR.md); these recorded proposals require a later explicit decision, not fabricated approval. The audit found React hooks/context/storage and Flutter setState prototypes. Relational logs/plans exist, but durable graph recovery and approval execution remain PARTIAL; Redis/SignalR remain DOCUMENTED ONLY. Consequences below describe intended architectural benefits, not verified deployment or test results.
> **SE3090 Assignment 1 | Architectural Justifications & Trade-Off Analysis**

This is the canonical decision register. Accepted below means an existing documented choice corroborated by source, not a new approval made during reorganization. Proposed and Unresolved entries are not adopted implementation facts. Record a genuine decision/evidence date when a conflict is resolved; no lecturer approval is implied.

---

## Index of Decisions
- [ADR-001: React Web Application State Management](#adr-001-react-web-application-state-management)
- [ADR-002: Flutter Mobile Application State Management](#adr-002-flutter-mobile-application-state-management)
- [ADR-003: Agentic AI Framework & Multi-Agent Orchestration](#adr-003-agentic-ai-framework--multi-agent-orchestration)
- [ADR-004: Persistence Strategy for Agent Workflow State & Audit Trails](#adr-004-persistence-strategy-for-agent-workflow-state--audit-trails)
- [ADR-005: Backend Architecture & Gateway Integration Pattern](#adr-005-backend-architecture--gateway-integration-pattern)
- [ADR-006: Cloud Deployment & Containerization Strategy](#adr-006-cloud-deployment--containerization-strategy)
- [ADR-007: Deterministic Immutable XP Ledger vs Direct Mutating Counts](#adr-007-deterministic-immutable-xp-ledger-vs-direct-mutating-counts)
- [ADR-008: Real-Time Event Communication via ASP.NET Core SignalR](#adr-008-real-time-event-communication-via-aspnet-core-signalr)
- [ADR-009: Redis Sorted Sets for High-Performance Leaderboard Ranking](#adr-009-redis-sorted-sets-for-high-performance-leaderboard-ranking)

---

## ADR-001: React Web Application State Management

**Status: Unresolved.** Zustand here conflicts with React Query/Context in the archived root ADR. Current source uses hooks/context/storage; no winner is selected.

### Context
The React web dashboard serves instructors and administrators. It requires managing authentication state, paginated course/module listings, live gradebook updates, and the multi-step AI Challenge/Study Plan approval workflow. We need a state management solution that avoids boilerplate, supports asynchronous data fetching, and provides clear separation of concerns.

### Options Considered
1. **Redux Toolkit (RTK)**: Standard enterprise choice, but involves significant boilerplate for moderate UI complexity.
2. **React Context API + useReducer**: Native without external dependencies, but prone to unnecessary re-renders across deeply nested components.
3. **Zustand**: Lightweight (under 2kB), hook-based, minimal boilerplate, out-of-the-box support for async actions and devtools.

### Decision
Recorded proposal: **Zustand**. Selection versus the alternative recorded in the root ADR remains unresolved.

### Consequences
- **Positive**: Minimal boilerplate code, straightforward async state handling, excellent performance without re-render cascades.
- **Negative**: Requires team adherence to store organization conventions.

---

## ADR-002: Flutter Mobile Application State Management

**Status: Unresolved.** BLoC here conflicts with Provider in the archived root ADR. Current Flutter uses setState prototypes; no winner is selected.

### Context
The Flutter mobile application needs to manage authentication tokens, dynamic course navigation, timed quiz countdowns, and asynchronous game loop updates with clear UI reactivity.

### Options Considered
1. **setState / InheritedWidget**: Inadequate for cross-screen state sharing and separation of business logic.
2. **Provider / ChangeNotifier**: Easy to learn, but can lead to tightly coupled business logic in larger codebases.
3. **BLoC (Business Logic Component) / Cubit**: Strictly separates UI, business logic, and data layers using streams and reactive events.

### Decision
Recorded proposal: **BLoC / Cubit (flutter_bloc)**. Selection versus Provider remains unresolved.

### Consequences
- **Positive**: Unidirectional data flow, exceptional testability with `bloc_test`, predictable state transitions for quiz timers and auth lifecycles.
- **Negative**: Requires writing event/state classes, adding slight initial development overhead.

---

## ADR-003: Agentic AI Framework & Multi-Agent Orchestration

**Status: Accepted — existing documented/source-backed framework choice.** LangGraph/FastAPI are used by the current service. This does not establish durable recovery or an enforced acceptance workflow.

### Context
The system requires an intelligent adaptive engine that analyzes student deficiencies, compiles tailored challenges, and enforces deterministic safety validation. We need an orchestration framework capable of supporting stateful multi-agent workflows, tool calling, and human-in-the-loop pauses.

### Options Considered
1. **Single Prompt / Direct OpenAI Function Calling**: Lacks multi-step coordination, state machine guarantees, and role separation.
2. **Microsoft AutoGen**: Powerful conversational agents, but conversational turn-taking is non-deterministic and harder to constrain into strict JSON schemas.
3. **LangGraph (LangChain ecosystem)**: Implements state machines (DAGs) with explicit nodes, edges, conditional routing, cyclic retries, and native support for state persistence and human-in-the-loop approval.

### Decision
We chose **LangGraph (Python 3.11)** with **FastAPI** as the dedicated internal Agentic AI orchestration microservice.

### Consequences
- **Intended benefit**: Explicit workflow roles (Planner -> Domain Analysis -> Action / Tool -> Validation / Safety -> authorized human approval where required), structured output validation via Pydantic and controlled retries. Integration and enforcement remain PARTIAL in the current audit.
- **Negative**: Requires hosting a secondary internal Python runtime behind the ASP.NET Core API gateway.

---

## ADR-004: Persistence Strategy for Agent Workflow State & Audit Trails

**Status: Proposed — full durable-state design.** Relational logs/plans exist, but the graph remains in-memory; complete restart recovery and JSONB trace coverage are not established.

### Context
Every agent execution, tool call, prompt input, validation result, and human instructor approval decision must be persisted for auditability, traceability, and final grading evaluation.

### Options Considered
1. **Pure NoSQL (MongoDB)**: Introduces a second database technology and weakens relational integrity with Course/Student tables.
2. **In-Memory Cache (Redis)**: High performance, but lacks long-term durability and relational querying capabilities.
3. **PostgreSQL Relational Schema with `JSONB` for Dynamic Trace Data**: Store core workflow metadata in normalized tables, while storing detailed agent execution traces and tool outputs in PostgreSQL `JSONB` columns.

### Decision
Proposed full-state design: **relational + JSONB persistence in PostgreSQL**, managed via **Entity Framework Core**. Existing plan/log persistence is only part of this design.

### Consequences
- **Positive**: Unified database infrastructure, ACID transactional guarantees when instructors approve plans, powerful indexing via GIN on JSONB execution traces, seamless EF Core mapping.
- **Negative**: Requires careful DTO mapping in C# to deserialize JSONB audit logs.

---

## ADR-005: Backend Architecture & Gateway Integration Pattern

**Status: Accepted — existing documented/source-backed public boundary.** ASP.NET Core and the AI gateway exist; authorization coverage and mobile integration remain incomplete.

### Context
The assignment specification strictly mandates that React and Flutter clients must communicate exclusively through the ASP.NET Core Web API. The Python LangGraph AI service must remain an internal subsystem.

### Options Considered
1. **Direct Client Access to AI Service**: Exposing Python API to clients (Violates assignment specification).
2. **API Gateway / Microservice Proxy in ASP.NET Core**: ASP.NET Core acts as the authoritative boundary for all client authentication, authorization, business rules, and proxies internal requests to LangGraph via typed HTTP clients (`HttpClientFactory`).

### Decision
We adopted the **ASP.NET Core Authoritative Gateway & Orchestrator Pattern**.

### Consequences
- **Positive**: Single point of security enforcement (JWT, rate limiting, role checks), clients remain agnostic to AI implementation details, seamless integration of audit logging directly in EF Core.
- **Negative**: Additional network hop between ASP.NET Core and the Python service.

---

## ADR-006: Cloud Deployment & Containerization Strategy

**Status: Unresolved.** The archived root ADR names Azure/Vercel; this entry proposes containers/local reproducibility. These can coexist, but neither establishes an agreed, verified deployment target.

### Context
The application must be deployable with working live endpoints, Swagger access, database initialization, and reproducible local startup scripts.

### Options Considered
1. **Manual Virtual Machine Deployment**: High maintenance overhead.
2. **Containerized Multi-Service Deployment (Docker Compose + Cloud PaaS)**: Containerize all services with Docker and deploy to managed cloud hosting.

### Decision
Recorded proposal: **Docker containerization with Docker Compose for local reproducibility**. Hosting choice and operational evidence remain unresolved.

### Consequences
- **Positive**: Single-command local startup (`docker compose up`), fully reproducible builds in GitHub Actions CI.
- **Negative**: Slight container resource footprint during local multi-service testing.

---

## ADR-007: Deterministic Immutable XP Ledger vs Direct Mutating Counts

**Status: Proposed — invariant enforcement incomplete.** Ledger/aggregate code exists; immutable enforcement, replay/concurrency protection and complete auditability are not established.

### Context
Gamification points (XP) and coins can be corrupted or disputed if stored simply as an integer column that gets overwritten with `UPDATE users SET xp = xp + 50`.

### Options Considered
1. **Direct In-Place Mutation**: `total_xp = total_xp + amount` directly on user entity.
2. **Immutable Transaction Ledger (`xp_transactions`) + Cached Aggregate Column**: Every XP gain generates a discrete transaction record with timestamp, source type, and amount, while maintaining a synchronized cached aggregate.

### Decision
The proposed invariant is the **Immutable Transaction Ledger Pattern** (`xp_transactions` + `student_xp`).

### Consequences
- **Intended benefit**: Traceable rewards and dispute reconciliation. Preventing duplicate claims requires explicit uniqueness/idempotency and transaction controls; a ledger alone does not guarantee them.
- **Negative**: Requires an additional INSERT per learning activity.

---

## ADR-008: Real-Time Event Communication via ASP.NET Core SignalR

**Status: Proposed.** SignalR remains DOCUMENTED ONLY in the current audit.

### Context
When a student completes a quiz or challenge, instant visual feedback (e.g. `+50 XP` toast, `Level Up` confetti, live rank shift) is required without client polling.

### Options Considered
1. **Client Polling**: High HTTP overhead and delayed feedback.
2. **Server-Sent Events (SSE)**: Unidirectional only; lacks native bidirectional capabilities.
3. **ASP.NET Core SignalR**: Native WebSocket support with fallback to Long Polling, tight integration with .NET Dependency Injection and authorization.

### Decision
Proposed option: **ASP.NET Core SignalR Hubs** (`GamificationHub` and `LeaderboardHub`).

### Consequences
- **Positive**: Sub-second UI reactivity on both Flutter mobile and React web; zero client polling.
- **Negative**: Requires connection state management in client apps.

---

## ADR-009: Redis Sorted Sets for High-Performance Leaderboard Ranking

**Status: Proposed.** Redis leaderboard caching remains DOCUMENTED ONLY in the current audit.

### Context
Calculating real-time leaderboards on relational tables using `ORDER BY SUM(xp) DESC` across thousands of students is computationally heavy for frequent dashboard reads.

### Options Considered
1. **Direct SQL Aggregation Queries**: Expensive on large datasets, slows down database performance.
2. **Scheduled Batch Materialized Views**: Introduces latency (rankings are only refreshed hourly/daily).
3. **Redis Sorted Sets (`ZADD`, `ZREVRANGE`, `ZREVRANK`)**: In-memory sorted sets providing $O(\log N)$ updates and $O(\log N + M)$ range reads.

### Decision
Proposed option: **Redis Sorted Sets** as the real-time leaderboard caching engine, backed by PostgreSQL as the authoritative persistent ledger.

### Consequences
- **Positive**: Instantaneous ranking lookups and top-100 queries; minimal database CPU utilization.
- **Negative**: Requires maintaining cache synchronization on every XP award event.
