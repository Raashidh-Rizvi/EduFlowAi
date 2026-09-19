> **LEGACY — NOT CURRENT INSTRUCTIONS.** This historical architecture/implementation reference is retained for historical/reference purposes only and is not a current source of truth or roadmap. Read the [current ownership matrix](../../responsibilities/RESPONSIBILITY_MATRIX.md), [architecture decisions](../../project/14_ARCHITECTURE_DECISIONS.md), [implementation status](../../project/17_IMPLEMENTATION_STATUS.md) and [current plan](../../project/16_IMPLEMENTATION_PLAN.md). Historical narrative is preserved; link destinations are rebased for this archive location.

# Architecture Decision Record (ADR)

> **Reconciliation note:** Read the [current responsibility matrix](../../responsibilities/RESPONSIBILITY_MATRIX.md) for ownership and audited status. The React Query/Provider choices recorded below conflict with Zustand/BLoC in [docs/ADR.md](../../project/14_ARCHITECTURE_DECISIONS.md); this reconciliation does not invent a new approved decision. Audited clients use React hooks/context/storage and Flutter setState prototypes, so neither ADR proves those proposed stacks are integrated. Durable AI recovery, approval enforcement and deployed environments are not established; framework capability alone does not satisfy the assessed workflow.

## Context
This document captures the key architectural decisions made by our group for the EduHub/EduFlow Integrated Full-Stack and Agentic AI application, as required by the SE3090 Assignment 1 Specification.

---

## Decision 1: React Web Application State Management
**Options Considered:** Redux Toolkit, Context API, Zustand.
**Decision:** We chose **Context API combined with React Query**.
**Consequences:** 
*   *Pros:* React Query handles asynchronous state (like fetching analytics and gamification data from the API) with built-in caching, reducing redundant network requests. Context API handles lightweight global UI state (like theme and user authentication session).
*   *Cons:* Not suitable for extremely complex synchronous global state updates, though our dashboard-heavy architecture does not require this.

## Decision 2: Flutter Mobile Application State Management
**Options Considered:** Provider, BLoC, GetX.
**Decision:** We chose **Provider**.
**Consequences:** 
*   *Pros:* Provider is officially recommended by the Flutter team. It provides a straightforward, highly readable way to manage state for the Leaderboard, Profile, and Quiz screens without the heavy boilerplate associated with BLoC.
*   *Cons:* Can become difficult to manage if widget trees grow exceptionally deep, but careful architectural separation of our screens mitigates this risk.

## Decision 3: Agentic AI Framework and Orchestration Method
**Options Considered:** LangChain (Sequential Chains), LangGraph, Semantic Kernel.
**Decision:** We chose **LangGraph (Python)**.
**Consequences:** 
*   *Pros:* LangGraph natively supports cyclical workflows and state machines. This is critical for our 4-agent setup (Planner, Tool/Action, Domain Analysis, Safety Guard) because it allows the Safety/Validation agent to pause the graph execution and enter a strict "PendingInstructorApproval" state, perfectly satisfying the Human-in-the-Loop requirement.
*   *Cons:* Requires running a separate Python microservice alongside the ASP.NET Core backend.

## Decision 4: Database Schema Strategy for Agent Workflow State
**Options Considered:** NoSQL (MongoDB) Document storage vs Relational (PostgreSQL) Tables.
**Decision:** We chose **Relational PostgreSQL Tables (`AiWorkflowLog` and `StudyPlan`) via EF Core**.
**Consequences:** 
*   *Pros:* Storing workflow state relationally allows us to enforce strict database constraints (e.g., Foreign Keys linking an AI decision directly to a valid `StudentId` and `CourseId`). It also allows our Analytics dashboard to effortlessly join AI execution logs with student performance metrics using standard SQL.
*   *Cons:* Less flexible than NoSQL when the AI returns highly unstructured data, requiring us to ensure the AI strictly outputs structured JSON.

## Decision 5: Cloud Deployment Platform
**Options Considered:** AWS EC2, Heroku, Azure App Service + Vercel.
**Decision:** We chose **Azure App Service (Backend) & Vercel (Frontend)**.
**Consequences:** 
*   *Pros:* Azure App Service provides native, seamless support for ASP.NET Core APIs and Azure Database for PostgreSQL. Vercel provides zero-configuration, globally distributed edge hosting for the React dashboard. Both integrate flawlessly with GitHub Actions for automated CI/CD pipelines.
*   *Cons:* Requires managing API keys and CORS policies across two different cloud providers.
