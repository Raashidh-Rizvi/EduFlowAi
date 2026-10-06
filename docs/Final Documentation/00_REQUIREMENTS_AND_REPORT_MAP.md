# SE3090 Assignment 1 — Requirements and Report Map

Corrected Phase 0 | Prepared 2026-09-30 | Requirements extraction and report planning only

**Repository root:** C:/Users/WAZNI/Desktop/SLIIT/PROJECTS/Y3/Y3-S1/SEF/PROJECTS/EduFlowAi/EduFlowAi

**Scope:** The official specification, supporting notice, source-of-truth document, catalog, and limited current-documentation authority context were read. The existence of docs/members/ was verified without reading its contents. No application folders, Git history, or docs/legacy/ files were inspected. No implementation-completeness assessment, tests, report results, student reflections, or full final report were produced. The earlier map in the outer workspace is excluded from project evidence. This file is the sole output of this corrected phase; prior final-documentation outputs were not audited under the corrected inspection scope.

## Authority and reading order

1. **Assessment requirements:** [Official specification §1–20](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md) is authoritative. The [notice](../reference/SEF-ASSINGMENT-01-Notice.md) supports it; the AutoCare sample is guidance only, not an EduFlow requirement or implementation source. Written lecturer clarification must be retained as evidence.
2. **Interpretation:** Read [00_SOURCE_OF_TRUTH.md](../00_SOURCE_OF_TRUTH.md), then [INDEX.md](../INDEX.md). Both identify source code and reproducible dated tests as the authority for implemented behavior; those sources are outside Phase 0.
3. **Current direction:** [DUAL_AGENT_RAG_PLAN.md](../current/DUAL_AGENT_RAG_PLAN.md), especially its current implementation notes, controls the approved AI direction. Original examples and proposed endpoints are not proof of implementation.
4. **Current architecture and scoped evidence:** [SYSTEM_OVERVIEW.md](../current/SYSTEM_OVERVIEW.md), [CURRENT_ARCHITECTURE.md](../current/CURRENT_ARCHITECTURE.md), and [IMPLEMENTATION_STATUS.md](../current/IMPLEMENTATION_STATUS.md). Their authority notices and scope limitations were consulted; their implementation claims were not independently verified.
5. **Subsequent evidence navigation:** The catalog points to RESPONSIBILITY_MATRIX.md for allocation, API_CONTRACTS.md for actual versus planned contracts, RAG_PIPELINE.md for shared RAG, and LOCAL_SETUP_GUIDE.md for setup. Member evidence is attributed and dated, not project-wide authority. No member files were read.

**Documented conflict, not a Phase 0 implementation finding:** Current guidance describes three members and an approved two-agent direction (Learning Agent + Quiz Generator Agent; RAG is shared infrastructure). The official specification normally requires four students, one primary component per student, at least four distinct agents for the standard group, and written lecturer confirmation of group-size/agent-scope adjustments (§§3, 9.1). Current guidance labels that approval **UNVERIFIED / TEAM CONFIRMATION REQUIRED**. Obtain the written clarification in a later evidence phase; do not treat the project plan as a waiver or restore obsolete agents. This does not block creating this map, but prevents asserting the adjusted scope is officially compliant.

The numbered sections below distinguish official requirements from recommended organization. Source excerpts preserve substantive wording; headings may be nested for readability.

## 1. Exact consolidated-report requirements

Source: [Official specification §15](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md).

| Submission item | Exact requirement |
| --- | --- |
| **One consolidated report (PDF)** | Combine all written work into one clearly organized PDF. Do not upload the group and individual written reports as separate files. |

*Within the single consolidated report, the following section lengths are suggested for guidance only: technical report 10–15 pages; testing report 6–10 pages; Agentic AI evaluation report 5–8 pages; performance report 3–5 pages; deployment report 3–5 pages; and ADRs 3–6 pages. These are not graded limits; the quality and relevance of the evidence matter more than page count.*

Suggested page ranges are guidance, not graded limits. The Group Report and every Individual Report belong inside the same PDF. This requirements map is not that submission PDF.

## 2. Mandatory Group Report contents

Source: [Official specification §15](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md) — exact submission requirement.

| Section | Exact requirement |
| --- | --- |
| **Group Report section** | Include the project overview and scope; requirements and user roles; full-stack and Agentic AI architecture; database and ER diagram; API, React and Flutter design; technical report; software testing report; Agentic AI evaluation report; performance report; deployment report; ADRs; security considerations; diagrams; references; and the consolidated group AI usage declaration. |

README and technical documentation additionally require (§14.1): project overview, business problem, roles, features and technology justification; system/AI architecture, database design and repository structure; installation, environment-variable names, database setup and startup instructions for every component; API/test/deployment documentation, live URLs and test accounts; contributions, challenges, security considerations and AI declaration.

## 3. Mandatory Individual Report contents

Source: [Official specification §3, 15](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md).

| Section | Exact requirement |
| --- | --- |
| **Individual Report sections** | Include one clearly labelled section for each student containing the contribution statement; owned component and technical work; key commit, pull-request and test evidence; challenges and learning; individual AI usage log; approximately one-page AI reflection; and signed declaration. |

#### 3. Group Structure and Individual Contribution

The standard group size is four students. Each student must take primary ownership of one business component, so a four-student group must implement four primary components. If the lecturer-in-charge approves a different group size, the number of primary components must equal the number of students (for example, five students = five components). The lecturer-in-charge will confirm any proportional changes to the Agentic AI contributions and overall functional scope in writing.

| Student | Primary Component | Required Individual Evidence |
|---|---|---|
| **Student 1** | Component A | Backend, database, React, Flutter, tests, Git evidence, documentation and a distinct Agentic AI contribution. |
| **Student 2** | Component B | Backend, database, React, Flutter, tests, Git evidence, documentation and a distinct Agentic AI contribution. |
| **Student 3** | Component C | Backend, database, React, Flutter, tests, Git evidence, documentation and a distinct Agentic AI contribution. |
| **Student 4** | Component D | Backend, database, React, Flutter, tests, Git evidence, documentation and a distinct Agentic AI contribution. |

- There must be no project-manager-only, testing-only or documentation-only roles.
- Every student must contribute technically across the required stack and must have an identifiable Agentic AI contribution.
- Individual marks may be adjusted using Git history, pull requests, issue ownership, test evidence, code ownership, and responses to embedded viva and technical questions.
- Code or features that a student cannot explain, modify or debug may receive reduced or zero individual marks.


Each student needs a distinct labelled section in the consolidated PDF. The signed declaration is required by §15, but the specification does not prescribe a signature format or exact declaration template. Do not invent signatures, contributions or evidence.

## 4. Required technical areas

Exact requirements below cover ASP.NET Core, EF Core/PostgreSQL, React, Flutter, Agentic AI, security, integration and third-party service use. Source: [Official specification §2, 4–11](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md). These are required targets, not assertions about project completion.

#### 2. Required Technology Stack

| Area | Requirement |
|---|---|
| **Backend** | C# and ASP.NET Core Web API. This is the mandatory public backend. |
| **Data Access** | Entity Framework Core with the PostgreSQL provider. |
| **Database** | PostgreSQL. |
| **Web Application** | React using functional components, hooks, routing and a justified state-management approach. |
| **Mobile Application** | Flutter and Dart using a justified state-management approach. |
| **Agentic AI** | Any suitable and justified framework, such as LangGraph (the stack used in labs), Microsoft Agent Framework, LlamaIndex agents, Google ADK, or a custom orchestration approach. |
| **Version Control** | Git and GitHub from the beginning of the project, including a GitHub Actions CI workflow (see Section 13). |
| **Testing** | Suitable tools for backend, React, Flutter, integration, performance and Agentic AI evaluation. |

> **Mandatory backend rule:** React and Flutter must communicate only with the ASP.NET Core Web API. Where a Python Agentic AI service is used, it must operate as an internal service called by ASP.NET Core and must not be called directly by either client application.


#### 4. Domain and Functional Scope

Each group must select a unique real-world domain. Suggested domains include healthcare appointments, event management, travel planning, inventory, vehicle services, education, property rental, food delivery, recruitment, agriculture, tourism, help-desk systems and community services.

##### 4.1 Minimum Domain Complexity

- At least three user roles with different responsibilities and permissions.
- For the standard four-student group, include at least four major business components with relational data and business-specific operations. An approved group-size variation must follow the one-component-per-student rule in Section 3.
- CRUD operations plus status workflows, search, filtering, sorting, pagination and reporting or analytics.
- Meaningful and different purposes for the React and Flutter applications.
- At least one third-party service integration.
- At least one complete cross-platform workflow involving React, Flutter, ASP.NET Core, PostgreSQL and Agentic AI.


#### 5. Part 1 – Secure ASP.NET Core RESTful API Backend

The ASP.NET Core backend is the authoritative application layer for public REST APIs, authentication, authorization, validation, business rules, persistence, Agentic AI workflow initiation, approval and audit logging.

| Area | Minimum Requirement |
|---|---|
| **Architecture** | Controllers, DTOs, service/application layer, suitable data-access abstraction and dependency injection. |
| **REST API** | Correct routes, HTTP methods, status codes, request/response models and asynchronous operations. |
| **Security** | JWT authentication, role-based authorization, protected endpoints, password hashing and secure configuration. |
| **Data Operations** | CRUD, search, filtering, sorting, pagination, history and business-specific operations. |
| **Quality** | Server-side validation, global error handling, structured logging, CORS and Swagger/OpenAPI. |
| **Agent Integration** | Endpoints for starting workflows, reviewing status, human approval and viewing execution summaries. |

> **Individual component minimum:** Each student-owned component must include at least four meaningful API endpoints and at least one business-specific operation beyond basic CRUD.


#### 6. Part 2 – PostgreSQL Database

- Design a normalized relational database with an ER diagram and clear relational schema.
- Use primary keys, foreign keys, appropriate relationships, constraints, indexes and suitable PostgreSQL data types.
- Use Entity Framework Core migrations and suitable seed data.
- Apply transactions where required and maintain audit fields such as CreatedAt and UpdatedAt.
- Persist only the Agentic AI workflow state and execution summaries required by the design; do not store hidden reasoning, passwords, tokens or unnecessary sensitive data.


#### 7. Part 3 – React Web Application

The React application should primarily support administrative, staff, dashboard, reporting, business-data management, Agentic AI monitoring and approval functions.

- Functional components, React Hooks, React Router and reusable component design.
- A suitable state-management approach such as Context API, Redux Toolkit, Zustand or another justified option.
- Complete ASP.NET Core API integration with protected routes and role-based navigation.
- CRUD interfaces, validation, search, filters, sorting, pagination and dashboard views.
- Responsive and accessible UI with loading, empty, success and error states.
- Agent workflow monitoring, execution summaries and approve/reject/revise controls where relevant.


#### 8. Part 4 – Flutter Mobile Application

The Flutter application should primarily support user-facing or operational workflows. It must be a genuine mobile application that consumes the shared ASP.NET Core API.

- Reusable widgets, navigation/routing and a suitable state-management approach.
- Registration, login, logout, secure token storage and protected screens.
- Forms, validation, search, filtering, main business transactions, status tracking and history.
- Responsive layouts with loading, empty and error states.
- Agentic task submission, recommendation display and workflow status where suitable.
- At least one meaningful device feature, such as camera/image picker, GPS/map, QR scanning, file upload, notifications or date/time selection.


#### 9. Part 5 – Agentic AI Subsystem

The Agentic AI feature must solve a meaningful, domain-relevant, multi-step problem. It must not be limited to a generic chatbot, FAQ interface, single-prompt workflow or simple text generator.

> **Minimum acceptance rule:** The group must demonstrate at least one complete assessed workflow that satisfies every step in the "Minimum assessed workflow" row below.

##### 9.1 Minimum Agentic AI Requirements

| Requirement | Expected Behaviour |
|---|---|
| **Minimum assessed workflow** | At least one assessed workflow must receive a domain objective; create a structured multi-step plan; delegate steps to distinct agent roles; call allow-listed tools using validated inputs and structured outputs; persist workflow state; apply deterministic checks such as schema or business-rule validation; pause a defined high-impact action for approval by an authorized user; and produce either an auditable result or a safe, clearly recorded failure. |
| **What counts as a distinct agent?** | An agent counts as distinct only when it has an identifiable responsibility, a defined input and output contract, controlled tool permissions and visible participation in the workflow. Renaming the same prompt or copying identical behaviour does not count as a separate agent. |
| **Specialized agents** | For the standard group, implement at least four distinct agents with clearly different responsibilities, such as planning or coordination, domain analysis, action or tool use, and validation or safety. Any approved adjustment must be confirmed in writing by the lecturer-in-charge. |
| **Planning and delegation** | The system analyses a user objective, creates a structured multi-step plan and delegates each step to an appropriate agent. |
| **Controlled tools** | Agents may use only allow-listed tools. Validate every tool input, return structured outputs, handle errors and apply least-privilege access. |
| **Shared state** | Persist the workflow ID, objective, plan, completed steps, tool results, validation results, errors, approval status and final outcome in structured, durable storage. |
| **Validation** | Apply deterministic validation, such as schema checks and business rules, before accepting outputs or allowing high-impact actions. Unsupported or unsafe actions must be rejected or returned for revision. |
| **Human approval** | At least one clearly defined high-impact action must pause until an authorized user approves, rejects or requests revision. |
| **Observability** | Store or display auditable execution summaries, tool calls, timings, validation results, errors, retries, approval decisions and the final result or safe-failure outcome. |
| **Security** | Apply role-based access, prompt and tool-input validation, output validation, secret protection, timeouts, retry limits and safe failure behaviour. |

> **Implementation flexibility:** Students may use any suitable Agentic AI framework, model and orchestration method. The selected approach must meet the minimum acceptance scenario, be justified in the ADR, run reliably during evaluation, be secured and be integrated through ASP.NET Core.


#### 10. Required Integrated Architecture

##### SE3090 Reference Integration Architecture

*A generic required structure; groups must design and justify their own domain architecture.*

**Figure 1. Reference integration architecture.** Groups must adapt and justify the architecture for their selected domain.

- **React Web Application** — Administration, staff, dashboards, reports, agent monitoring and approval → (HTTPS/REST/JSON) → **ASP.NET Core Web API**
- **Flutter Mobile Application** — User-facing and operational workflows, device feature and status → (HTTPS/REST/JSON) → **ASP.NET Core Web API**
- **ASP.NET Core Web API** — Mandatory public backend; Controllers and DTOs; Application/service layer; Authentication and authorization; Business rules and validation; Audit logging and approval; Agent workflow endpoints
  - → (EF Core) → **PostgreSQL** — Entity Framework Core; Migrations and constraints; Transactional business data; Agent execution summaries
  - → (Internal call) → **Controlled Agentic AI** — Coordinator/planner; Domain analysis agent; Action/tool agent; Validation/safety agent; Structured shared state; Ollama local model; Allowlisted tools and traces
  - → (Controlled API) → **Third-Party Service** — Meaningful API or service integrated through controlled ASP.NET Core calls

##### Required Cross-Platform Workflow Pattern

*At least one workflow must begin in one client and continue through the other client.*

**Figure 2. Required cross-platform workflow pattern.**

1. **Flutter** — User submits a domain transaction
2. **ASP.NET Core** — Authenticates, validates and applies rules
3. **PostgreSQL** — Stores business data and audit fields
4. **Agentic AI** — Plans, uses tools and creates a validated proposal
5. **React** — Staff reviews evidence and approves, rejects or revises
6. **Shared Status** — Backend updates record; mobile user receives status

*Evidence must show consistent identities, permissions, business rules, data and status across both applications.*

> **End-to-end evidence:** At least one demonstrated workflow must begin in one client, pass through ASP.NET Core, PostgreSQL and Agentic AI, require review or approval in the other client, and return an updated status to the initiating user.


#### 11. Third-Party Integration

Each system must integrate at least one meaningful third-party API or service, such as maps, weather, currency, email/SMS, payment sandbox, calendar, cloud storage, QR service or notifications.

- Explain the business purpose and user benefit.
- Route external-service access through the ASP.NET Core backend where appropriate.
- Protect credentials and environment variables.
- Handle timeouts, invalid responses, service failures and rate limits.
- Validate and minimize any personal or sensitive data shared with the service.


Interpretation note: §10 is a reference architecture to adapt and justify, while §§2 and 9 permit a suitable justified AI framework/model. Its example role/model labels must not be converted into an unsupported requirement to rebuild the current architecture. The complete assessed workflow and written-approval rules still apply.

## 5. Required testing and evaluation evidence

Source: [Official specification §12](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md) — exact required evidence and evaluation rule.

#### 12. Testing Requirements

| Area | Required Evidence |
|---|---|
| **Backend** | Unit, service-layer, validation, authentication/authorization, controller and API integration tests. |
| **Database** | PostgreSQL integration tests, constraints, migrations and transaction behaviour. |
| **React** | Component, form-validation, protected-route, API-integration and error-state tests. |
| **Flutter** | Unit, widget, form-validation, navigation and API-integration tests. |
| **End to End** | At least one complete Flutter/React – ASP.NET Core – PostgreSQL – Agentic AI workflow. |
| **Performance** | Concurrent requests, response time, success/failure rate, database response and Agentic AI latency. |
| **Agent Evaluation** | Evidence that at least one complete minimum acceptance workflow passes a suitable golden case, including correct planning and delegation, agent and tool selection, structured outputs, deterministic validation, business-rule compliance, approval enforcement, prompt-injection resistance, failure recovery and safe failure. |

> **Agent evaluation rule:** LLM-as-a-judge may be used as supporting evidence, but it must not be the only evaluation method. Use rule-based assertions, schema validation, golden cases, deterministic validators and human review where appropriate.


Later reports should link each claimed result to its actual run, inputs/scenario, expected and observed outcome, date/environment and responsible contributor. This traceability format is a recommendation; the required coverage above is official. Do not infer complete testing or deployment from the scoped current-documentation status.

## 6. Git, GitHub and CI/CD requirements

Source: [Official specification §13](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md).

#### 13. Git, CI/CD and Collaborative Development

- Create the GitHub repository at the beginning of the project.
- Use meaningful commits, feature branches, issues, pull requests, reviews and a project board.
- Configure at least one **GitHub Actions CI workflow** that restores, builds and runs the automated backend tests on every push and pull request to the main branch. Additional pipelines (frontend build, lint, Flutter analyze, deployment) are encouraged.
- Maintain clear evidence of task allocation, merge management and conflict resolution.
- Each student must show regular technical contribution across the project lifecycle.
- Artificial commit activity, final-day bulk uploads or unexplained copied code will not be accepted as evidence of contribution.


A backend build-and-test CI workflow is mandatory. Frontend, Flutter and deployment pipelines are encouraged; the specification does not make automated continuous deployment a separate mandatory pipeline. No Git history or CI run was inspected in Phase 0.

## 7. Deployment requirements

Source: [Official specification §14](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md).

#### 14. Deployment and Documentation

| Component | Deployment Requirement |
|---|---|
| **ASP.NET Core API** | Deploy to a suitable cloud platform and provide a working health URL and Swagger URL. |
| **PostgreSQL** | Deploy securely with migrations, restricted credentials and initialization instructions. |
| **React** | Deploy and provide a working live URL configured to use the deployed API. |
| **Flutter** | Submit complete source code and a runnable Android APK or approved equivalent. |
| **Agentic AI** | Deploy or run locally as appropriate; provide complete setup, model/framework requirements and startup order. |

> **Service cost and availability:** You must be able to complete this assignment using institution-provided or no-cost services. Paid subscriptions are not required. Keep clear local setup instructions. If a required external service has a confirmed outage near submission or evaluation, inform that to evaluator and provide evidence of the outage. When you doing the evolution.

##### 14.1 README and Technical Documentation

- Project overview, business problem, user roles, features and technology justification.
- System architecture, Agentic AI architecture, database design and repository structure.
- Installation, environment variables, database setup and startup instructions for all components.
- API documentation, test instructions, deployment instructions, live URLs and test accounts.
- Individual contributions, challenges, security considerations and AI usage declaration.



## 8. ADR requirements

Source: [Official specification §14.2](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md) — exact text.

#### 14.2 Architecture Decision Record (ADR)

As introduced in Lecture 01, each group must submit an Architecture Decision Record — a short document (one page per decision) capturing the context, options considered, decision and consequences for the group's key technical choices. The ADR is the primary written evidence for LO4 and will be referenced during the viva.

At minimum, record decisions for: the state-management approach in React and in Flutter, the Agentic AI framework and orchestration method, the database schema strategy for agent workflow state, and the cloud deployment platform. Three to six decisions is a typical, healthy range.


Track all five choice areas: React state management; Flutter state management; AI framework/orchestration; agent workflow-state database schema strategy; cloud platform. The stated three-to-six range is typical guidance, not a replacement for covering every required choice. ADRs belong in the consolidated Group Report and support viva/LO4 evidence.

## 9. Required diagrams and evidence

Source: [Official specification §6, 9–10, 14.1–17](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md).

| Required subject / evidence | Official basis | Recommended presentation, where not prescribed |
| --- | --- | --- |
| Database ER diagram and clear relational schema | §§6, 15 explicitly require ER/database design | Label entities, keys, relationships, constraints and relevant indexes |
| Full-stack and Agentic AI architecture | §§10, 14.1, 15; adapt and justify the reference architecture | Domain-specific architecture diagram showing both clients, shared API, PostgreSQL, internal AI and third-party boundary |
| Cross-platform workflow and shared identity, permissions, rules, data and status | §10 requires demonstrated end-to-end evidence across clients with review/approval and status returned | Sequence/activity diagram plus genuine execution evidence; these diagram types are recommendations |
| Agent roles, contracts, controlled tools, persisted state, validation, approvals and observability | §9.1; §§12, 17 | Agent/state-flow diagram and actual traces/logs with timings, errors/retries, decisions and final outcome/safe failure |
| API, React and Flutter design; general diagrams | §§14.1, 15 | Route/interface documentation and selected UI evidence; no fixed screenshot count is specified |
| Tests, AI evaluation and performance results | §§12, 15, 17 | Actual test outputs, golden cases, assertions and measured performance tables |
| Contributions and ownership | §§3, 13, 15–17 | Key commits, PRs, tests, task/review evidence and student explanations |
| Deployment/access/reproducibility | §§14–17 | Working links, PostgreSQL evidence, runnable APK and instructions, configuration names and startup order |

The specification explicitly names the ER diagram and requires architecture/design/diagrams, but does not prescribe a fixed list of UML types. Suggested diagram formats above must not be labelled additional official mandates.

## 10. AI usage declaration and permitted-use requirements

Source: [Official specification §18–19](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md).

**Disclosure.** Each student must keep an individual AI usage log showing the date, tool and model, task or section, what the tool produced, what was changed or rejected, and how the result was verified. Include this log in that student's Individual Report section of the consolidated report. Include one consolidated group AI usage declaration in the Group Report section, confirming that all AI use has been disclosed and that every member can explain, test and modify the work submitted under their name.

Development is Level 4 (Full AI), subject to disclosure, verification and understanding. Permitted uses cover domain/requirements, architecture/ADR, backend/database, React/Flutter, Agentic AI, testing/CI/deployment, and report/README/diagram drafting (§18.1). Final scope and architecture decisions must be the students' own defensible reasoning. Tests must actually be executed and understood; facts, figures, screenshots, test results and evaluation findings must be the group's own.

The final demonstration/viva is Level 1 (No external AI): no external assistants, chatbots, IDE copilots or agentic coding tools for answers, explanations or modifications. The submitted application's AI subsystem must run. Fabricated commits, invented AI-log entries and unproduced test/evaluation results are prohibited. Do not disclose credentials, private/institutional data or others' work. Acknowledge external libraries, APIs, tutorials, sample code and AI assistance. Work the student cannot explain, test or modify can lose marks (§§18.2, 19).

The group declaration must confirm disclosure and every member's ability to explain, test and modify work submitted under their name. It is separate from each student's signed declaration and personal reflection.

## 11. Individual AI usage log requirements

Source: [Official specification §18.3](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md).

Each student must keep and include their own log in their Individual Report section with these fields:

| Required field | What to record |
| --- | --- |
| Date | Actual date of use |
| Tool and model | Tool and model used |
| Task or section | Work to which the use related |
| What the tool produced | Actual generated assistance/output |
| What was changed or rejected | Student review and resulting changes/rejections |
| How the result was verified | Actual verification performed |

Do not manufacture missing history or back-fill invented entries. Students must supply and validate their own actual usage evidence; this Phase 0 map is not an AI usage log.

## 12. Individual approximately one-page AI reflection

Source: [Official specification §18.3](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md) — exact requirement.

**Reflection (marked).** Each student must include an approximately one-page individual reflection in their Individual Report section of the consolidated report. It is marked under Documentation and Deployment and may be discussed during the viva. Address the following:

- Which AI tools, if any, were used, and at which stages?
- What did the AI tools do well, and what did they get wrong?
- What did you change, add or reject from the AI output, and why?
- What did you learn about your own skills and understanding?

*The AI rules above were agreed with the SE3090 cohort and are published on Course Web (SE3090 → Assignments → Assignment 1). A reflection that is AI-generated, or that does not match the student's Git history and AI usage log, will not receive credit.*


**Student-authored only:** Every student must personally write their own approximately one-page reflection. No student's reflection is drafted in this map or assigned to AI generation in later phases. Later assembly may only include the student's supplied writing; assess consistency with their real log and contribution evidence.

## 13. Submission requirements and links/artifacts

Source: [Official specification §15](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md) — exact submission rules, including the required artifact list.

#### 15. Submission Guidelines

| Submission Item | What You Must Submit |
|---|---|
| **Group leader and deadline** | Group leader must make the only group submission through Course Web by 11:50 PM on Wednesday, 30 September 2026. |
| **One consolidated report (PDF)** | Combine all written work into one clearly organized PDF. Do not upload the group and individual written reports as separate files. |
| **Group Report section** | Include the project overview and scope; requirements and user roles; full-stack and Agentic AI architecture; database and ER diagram; API, React and Flutter design; technical report; software testing report; Agentic AI evaluation report; performance report; deployment report; ADRs; security considerations; diagrams; references; and the consolidated group AI usage declaration. |
| **Individual Report sections** | Include one clearly labelled section for each student containing the contribution statement; owned component and technical work; key commit, pull-request and test evidence; challenges and learning; individual AI usage log; approximately one-page AI reflection; and signed declaration. |
| **Repository and deployed system** | Include the repository URL, React URL, ASP.NET Core API or health URL, Swagger URL, PostgreSQL deployment evidence, Agentic AI setup or access information, required environment-variable names and startup instructions. |
| **Flutter APK** | Submit a runnable Android APK, or another format approved in writing, together with installation instructions. |
| **Demonstration video** | Provide a working demonstration-video (10 min) link. Sharing must be set so that anyone with the link can view it without requesting access. |
| **Required access period** | Keep the repository, demonstration video and all deployed services accessible to evaluators until at least Wednesday, 21 October 2026 (three weeks after the submission deadline). |

> **Before submitting:** The group leader must open every submitted link in a private or incognito browser and confirm that evaluators can access it. Only one submission is required per group.

*Within the single consolidated report, the following section lengths are suggested for guidance only: technical report 10–15 pages; testing report 6–10 pages; Agentic AI evaluation report 5–8 pages; performance report 3–5 pages; deployment report 3–5 pages; and ADRs 3–6 pages. These are not graded limits; the quality and relevance of the evidence matter more than page count.*

> **Naming convention:** Use **SE3090_GroupNumber** for all submitted items. (e.g. SE3090_G07)


The supporting notice also states that late submissions will not be accepted. Environment-variable **names** and setup instructions are required; secret values must not be published. Include evaluator test accounts/access instructions as required by §14.1, with appropriate access controls.

## 14. Demonstration and viva evidence

Source: [Official specification §16–17](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md).

One final evaluation: a **10-minute integrated-system demonstration**, followed by a **20-minute viva and technical question session**. Every student must attend and may be required to explain, modify, test or debug their contribution. The submission also requires the separate accessible 10-minute demonstration-video link (§15).

#### 17. Demonstration and Viva Requirements

##### 17.1 Demonstration Checklist

- ☐ Login using different roles and demonstrate protected operations.
- ☐ Demonstrate CRUD and a business-specific workflow and show PostgreSQL data changes and Swagger documentation.
- ☐ Demonstrate React and Flutter using the same ASP.NET Core API.
- ☐ Run the application's Agentic AI subsystem and demonstrate the complete minimum acceptance workflow: domain objective, structured plan, distinct agent roles, allow-listed tool use, persisted state, deterministic validation, authorized approval, and an auditable result or safe failure.
- ☐ Demonstrate human approval and execution-history summaries.
- ☐ Show error handling, tests, the passing CI workflow, deployed applications and GitHub contribution history.

##### 17.2 Viva Scope

- Explain a controller, service, DTO, database relationship, constraint, migration or index.
- Explain authentication, authorization, state management, secure storage and API integration.
- Explain an agent role, tool, orchestration decision, shared state, validation, security control and human approval.
- Explain a test, Git contribution, CI workflow step, deployment decision, third-party integration or a decision recorded in the ADR.
- Modify a small feature, validation rule or business rule, or debug a failed workflow.


External AI is prohibited during evaluation; execute the application's own Agentic AI subsystem. Full individual marks require ownership and correct viva responses as well as demonstrated work; no relevant evidence may receive zero (§16.1).

## 15. Complete marking-rubric mapping

Source: [Official specification §16, 16.1, 18.3](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md). Total: **30 group + 70 individual = 100**, scaled to **25% of the module mark**. The Mini Hackathon's 15% is separate. No marks are awarded or predicted in this map.

### Criteria mapped to the recommended report structure

| Criterion | Marks | Report sections (see §16 below) | Evidence to supply |
| --- | ---: | --- | --- |
| Group: Component Design and Business Logic | 10 | G1–G3, G5, G7 | Component boundaries, roles/rules, functional and end-to-end workflows |
| Group: Integrated Architecture, Agent Orchestration and State Management | 10 | G3, G6–G8 | Shared-stack integration; complete acceptance workflow, distinct agents, durable state, tools, validation, logs, safe failure and approval |
| Group: Documentation and Deployment | 10 | G1–G14 and every I1–I7 | Complete PDF, ADRs, disclosures/reflections, links, deployments/APK and reproducible access/setup |
| Individual: ASP.NET Core RESTful API Development | 10 | I2–I3; G5, G7 | Owned endpoints/services/DTOs, REST, validation/security/async/errors/status codes, tests and viva |
| Individual: PostgreSQL Integration and Data Modelling | 10 | I2–I3; G4, G7 | Entities, relationships, normalization, constraints, migrations, indexes/integrity and viva |
| Individual: React Web Application | 10 | I2–I3; G5, G7 | Reusable UI, routing/state/protection, validation/responsiveness/states/API integration and viva |
| Individual: Flutter Mobile Application | 10 | I2–I3; G5, G7 | Widgets, routing/state, secure API integration, UI states, validation/device feature and viva |
| Individual: Individual Agentic AI Contribution | 12 | I2–I3; G6, G8 | Distinct responsibility/contracts/tools, validation/errors/security, documentation/tests, integration and viva |
| Individual: API Integration, Security and Cross-Platform Functionality | 10 | I2–I3; G3, G5–G7, G12 | Shared API, identity/permissions/tokens/data, validation/approval/security, complete traceable workflow and viva |
| Individual: Testing, CI and Git Workflow | 8 | I3; G7–G10, G13 | Required-layer and AI tests, passing CI, regular reviewed Git contributions/ownership, failure diagnosis and viva |

### Exact official rubric, bands and evaluation rules

All five performance bands and the evaluator/intermediate-mark rule are retained below to make the mapping complete.

#### 16. Final Evaluation – Complete Integrated System

**Total: 100 marks** | Group contribution: 30 marks | Individual contribution: 70 marks. The mark out of 100 is scaled to **25% of the final module mark**.

The assignment will be assessed through one final evaluation only. The group must deliver a 10-minute demonstration of the complete integrated system, followed by a 20-minute viva and technical question session. Every student must be present and may be asked to explain, modify, test or debug their individual contribution.

| Contribution | Criterion | Marks |
|---|---|---|
| Group | Component Design and Business Logic | 10 |
| Group | Integrated Architecture, Agent Orchestration and State Management | 10 |
| Group | Documentation and Deployment | 10 |
| Individual | ASP.NET Core RESTful API Development | 10 |
| Individual | PostgreSQL Integration and Data Modelling | 10 |
| Individual | React Web Application | 10 |
| Individual | Flutter Mobile Application | 10 |
| Individual | Individual Agentic AI Contribution | 12 |
| Individual | API Integration, Security and Cross-Platform Functionality | 10 |
| Individual | Testing, CI and Git Workflow | 8 |

> **AI use during the evaluation:** During the final demonstration and viva, students may not use external AI assistants, chatbots, IDE copilots or agentic coding tools to answer questions, generate explanations or modify the submitted work. The Agentic AI subsystem implemented as part of the submitted application must be executed during the demonstration.

---

#### 16.1 Marking Rubric – Final Evaluation

##### Complete Integrated Full-Stack and Agentic AI System | Total: 100 Marks

##### Group Contribution (30 Marks)

| Criterion | Excellent | Good | Satisfactory | Poor | Very Poor |
|---|---|---|---|---|---|
| **Component Design and Business Logic (10)** | All major components are clearly defined and fully functional. Business rules are correctly implemented through suitable services and support a complete end-to-end workflow. — 10 marks | Main components and business rules work with only minor functional or architectural issues. — 8 marks | Core components and main business rules function, and a basic end-to-end workflow is demonstrated; some secondary rules, edge cases or integration remain incomplete. — 6 marks | Some components or business rules are implemented, but workflows are fragmented, unreliable or substantially incomplete. — 4 marks | Components are poorly structured, mostly incomplete or fail to implement the stated business requirements. — 2 marks |
| **Integrated Architecture, Agent Orchestration and State Management (10)** | Complete full-stack integration and one complete minimum Agentic AI acceptance workflow are demonstrated. Distinct agents, persisted state, allow-listed tools, deterministic validation, auditable logs, safe failure and authorized human approval all work correctly. — 10 marks | The integrated workflow meets the minimum acceptance scenario, with only minor issues in orchestration, state, logging, tool controls, validation, approval or recovery. — 8 marks | The core integrated workflow works and most acceptance elements are present, but one or more elements are only partly effective or supported by limited evidence. — 6 marks | Only a partial integrated workflow works; several mandatory acceptance elements are missing, unreliable or weakly integrated. — 4 marks | No complete assessed workflow is demonstrated; agents are not distinct, state, tools, validation or approval are absent, or the feature is only a chatbot or disconnected prototype. — 2 marks |
| **Documentation and Deployment (10)** | The consolidated report is complete, well organized and contains all Group Report and Individual Report sections, ADRs, AI usage documents, evidence and working links. Required systems are deployed, the APK works, evaluator access is clear and setup is fully reproducible. — 10 marks | The consolidated report, access information and deployment are mostly complete, with only minor missing evidence, link or setup issues. — 8 marks | The main Group Report and Individual Report sections and core deployment instructions are provided, but several evidence items, links, AI documents or setup details are incomplete. — 6 marks | The consolidated report is limited or poorly organized, and deployment or evaluator access is only partly working or difficult to reproduce. — 4 marks | The consolidated report, required group or individual sections, or access details are missing, and major components cannot be deployed or executed. — 2 marks |

##### Individual Contribution (70 Marks)

| Criterion | Excellent | Good | Satisfactory | Poor | Very Poor |
|---|---|---|---|---|---|
| **ASP.NET Core RESTful API Development (10)** | API component is complete and follows REST conventions with DTOs, validation, security, async operations, suitable architecture, exception handling and correct status codes. The student accurately answers related viva questions and can explain, test, modify or debug the contribution. — 10 marks | Main API functionality works with minor REST, validation, security or architecture issues. The student answers most related questions and can explain a suitable change. — 8 marks | Core CRUD and API operations work, but notable gaps remain. The student answers routine questions or makes a simple change but has technical gaps. — 6 marks | Only limited API functionality works; major areas are incomplete or unreliable. The student struggles to answer questions or modify and debug the work. — 4 marks | The API contribution is missing or non-functional, or the student cannot explain or modify it. — 2 marks |
| **PostgreSQL Integration and Data Modelling (10)** | The contribution demonstrates suitable entities, relationships, constraints, normalization, migrations, indexing and data integrity. The student accurately answers related viva questions and can explain, trace, modify or debug the database contribution. — 10 marks | The database is functional and suitably modelled, with minor design or integration issues. The student answers most questions and can explain or make a suitable database change. — 8 marks | Basic database integration works, but notable gaps remain. The student answers routine questions but has difficulty explaining some relationships, constraints or migrations. — 6 marks | Database integration is limited, incomplete or inconsistent. The student provides weak answers and struggles to modify or debug it. — 4 marks | The database contribution is missing or non-functional, or the student cannot explain the schema and integration. — 2 marks |
| **React Web Application (10)** | Uses reusable components, routing, suitable state management, protected routes, validation, responsive UI, loading and error states, and complete API integration. The student accurately answers related viva questions and can explain, modify or debug the React contribution. — 10 marks | Main React functionality works with minor issues in structure, state, UI, validation or error handling. The student answers most questions and can complete and explain a suitable change. — 8 marks | Core React screens and API operations work, but notable gaps remain. The student answers routine questions or completes a simple change with some difficulty. — 6 marks | Limited React functionality is demonstrated. The student struggles to answer questions or modify and debug the application. — 4 marks | The React contribution is missing or non-functional, or the student cannot explain or modify it. — 2 marks |
| **Flutter Mobile Application (10)** | Contains reusable widgets, routing, state management, secure API integration, validation, responsive screens, loading and error states, and a meaningful device feature. The student accurately answers related viva questions and can explain, modify or debug the Flutter contribution. — 10 marks | Main Flutter functionality works with minor issues in architecture, state, UI or API handling. The student answers most questions and can complete and explain a suitable change. — 8 marks | Core Flutter screens and API communication work, but notable gaps remain. The student answers routine questions or completes a simple change with some difficulty. — 6 marks | Limited Flutter functionality is demonstrated. The student struggles to answer questions or modify and debug the application. — 4 marks | The Flutter contribution is missing or non-functional, or the student cannot explain or modify it. — 2 marks |
| **Individual Agentic AI Contribution (12)** | A distinct, domain-relevant Agentic AI contribution is functional and integrated, with an identifiable responsibility, defined input and output contract, controlled tool permissions, validation, error handling, security, documentation and tests. The student accurately explains the agent, tools, state, validation and approval flow and can modify or debug the contribution. — 12 marks | The distinct Agentic AI contribution is functional and relevant, with only minor issues in its contract, permissions, validation, security, testing, observability or integration. The student answers most questions and can explain a suitable change. — 10 marks | A basic but identifiable Agentic AI contribution participates in the workflow, but its contract, controls, tests or integration are incomplete. The student answers routine questions but demonstrates notable gaps. — 7 marks | A limited Agentic AI prototype is shown, but its responsibility or participation is unclear. The student struggles to explain the agent's behaviour, tools, state or controls. — 5 marks | The contribution is missing, non-functional, disconnected or duplicates another agent, and the student cannot explain or modify it. — 2 marks |
| **API Integration, Security and Cross-Platform Functionality (10)** | React and Flutter use the same API. Authentication, authorization, token handling, validation, shared data, Agentic AI approvals and security controls work correctly. The student accurately answers related viva questions and can trace, modify or debug the complete workflow. — 10 marks | Most integration and security functions work with minor inconsistencies or incomplete edge cases. The student answers most questions and can explain the main cross-platform workflow. — 8 marks | The shared API and core cross-platform workflow function, but notable gaps remain. The student answers routine questions but has difficulty explaining some security or integration decisions. — 6 marks | Only limited integration is demonstrated. The student provides weak answers and struggles to trace or debug the workflow. — 4 marks | Integration is absent or non-functional, or the student cannot explain the shared workflow and security controls. — 2 marks |
| **Testing, CI and Git Workflow (8)** | Comprehensive tests cover the required layers and Agentic AI. CI passes, and Git history shows regular reviewed contributions with clear ownership. The student accurately answers related viva questions, explains the tests, CI workflow and Git evidence, and can diagnose a relevant failure. — 8 marks | Suitable testing, CI and Git practices are demonstrated with only minor missing evidence. The student answers most related questions correctly. — 6 marks | Some relevant tests and basic Git and CI evidence are provided. The student answers routine questions but demonstrates limited understanding of coverage or workflow decisions. — 4 marks | Few meaningful tests are provided, CI is absent or unreliable, and Git evidence is weak. The student struggles to answer related questions. — 2 marks | Almost no meaningful testing, CI or Git evidence is provided, and the student cannot explain the available evidence. — 1 mark |

**Final Evaluation Total = 30 Group + 70 Individual = 100 Marks → scaled to 25% of the module mark.**

> **Rubric application and viva note:** The five listed performance levels represent performance-band anchors, and evaluators may award intermediate marks. To receive full marks for an individual criterion, the student must demonstrate the required work, correctly answer the related viva questions and, where requested, explain, test, modify or debug the work. If the student cannot demonstrate understanding or ownership, the criterion mark will be reduced; where no relevant evidence is provided, zero marks may be awarded.


### Process-mark interpretation

**Process marks.** As AI use is permitted at Level 4, 30 marks assess the development process: 15 marks for technical understanding and ownership assessed through the viva and embedded across the individual criteria, 5 core marks for Testing, CI and Git Workflow, and 10 marks for Documentation and Deployment. These marks are assessed through the rubric in Section 16.1. **This meets the CLEAR minimum of thirty percent process marks for a Level 4 assessment.**

These 30 process marks are embedded in the 100-mark rubric, not additional marks. In particular, the 5 core process marks mentioned in §18.3 do not replace the 8-mark Testing, CI and Git Workflow criterion. Reflection is marked under Documentation and Deployment and may be discussed in viva.

## 16. Recommended final consolidated-report structure

This is an organizational recommendation, not an extra official template. Keep all parts in **one PDF**, with a contents page and clear student labels. Diagrams and evidence should sit beside the relevant claim, with appendices for large artifacts.

| ID | Proposed section | Required contents covered |
| --- | --- | --- |
| Front matter | Title, group/student identifiers, contents and artifact directory | Clear organization; official naming convention and easy evaluator navigation |
| G1 | Project overview and scope | Business problem, objectives, scope, features and technology justification |
| G2 | Requirements and user roles | Functional requirements, primary components, role/permission model and business rules |
| G3 | Integrated system architecture | Shared clients/API/database/AI/service architecture, cross-platform flow and repository structure |
| G4 | Database design | ER diagram, relational schema, constraints/indexes/migrations, transactions/audit and AI-state strategy |
| G5 | API, React and Flutter design / technical report | Backend architecture/contracts, web/mobile design and state management, device feature, third-party service |
| G6 | Agentic AI architecture and workflow | Responsibilities/contracts, orchestration, tools/state, deterministic validation, approvals, logs and safe failure |
| G7 | Software testing report | Backend/database/React/Flutter/integration/E2E evidence and outcomes |
| G8 | Agentic AI evaluation report | Golden acceptance case, deterministic assertions, injection resistance, recovery and human review |
| G9 | Performance report | Concurrency, response times, success/failure rate, database response and AI latency |
| G10 | Deployment and reproducibility report | Cloud/API/Swagger/React/PostgreSQL evidence, APK, AI setup, environment names, startup/test instructions, access |
| G11 | ADRs | One page per decision covering all mandatory technical choices |
| G12 | Security considerations | Identity/authorization, client tokens, data/secrets, validation, external services and AI safety |
| G13 | Collaboration and contribution evidence | Task allocation, Git/PR/reviews/CI, integration and merge/conflict management |
| G14 | Consolidated group AI usage declaration and references | Required declaration, cited external work; evidence index and any supporting appendices |
| I1, per student | Identity and contribution statement | Clearly labelled owner/component and contribution statement |
| I2, per student | Owned component and technical work | Work across backend/database/React/Flutter/AI/integration/security |
| I3, per student | Key evidence | Actual commit, PR and test evidence plus ownership links |
| I4, per student | Challenges and learning | Student's actual challenges and learning |
| I5, per student | Individual AI usage log | All six required fields, based on actual use |
| I6, per student | Personal AI reflection | Approximately one page, personally written by the student |
| I7, per student | Signed declaration | Student-supplied signed declaration |

## 17. Later phases mapped to report sections

Only Phase 0 has been performed. Later phases below are proposed boundaries, not authorization to inspect additional paths or execute tests now. Each should use an explicitly bounded evidence scope and preserve the official/current-documentation distinction.

| Checklist | Phase | Sections/artifacts supplied | Completion gate |
| --- | --- | --- | --- |
| [x] | Phase 0 — requirements and authority map | This file; official rubric, required contents and planning | Correct repository and authorized documents confirmed; no implementation certification |
| [ ] | Phase 1 — current scope and evidence plan | Front matter draft, G1–G3, contribution allocation for I1 | Confirm actual group/component scope and obtain written lecturer approval for any group/agent adjustments |
| [ ] | Phase 2 — bounded technical/design evidence | G3–G6, G11–G12; technical evidence for each I2 | Inspect only agreed relevant implementation/evidence; distinguish plans from verified behavior; owners justify ADR choices |
| [ ] | Phase 3 — testing, AI evaluation and performance evidence | G7–G9; test references for I3 | Capture actual dated runs and limitations for every required test area and acceptance workflow; no invented results |
| [ ] | Phase 4 — deployment, collaboration and demonstration evidence | G10, G13; Git/PR/CI references for I3; artifact directory, demo script/video evidence | Verify required services/APK/links, setup, real contribution/CI evidence and complete cross-platform demo |
| [ ] | Phase 5 — student-supplied individual and AI materials | I1–I7 for every student; G14 declaration/reference inputs | Students supply contributions, logs, personal reflection and signatures; no AI-written reflection; all members confirm declaration |
| [ ] | Phase 6 — consolidated assembly and compliance review | Single PDF with all G/I sections, diagrams/evidence, ADRs, references and required links | Cross-check every §15 item and §16.1 criterion; use actual evidence and record unresolved gaps |
| [ ] | Phase 7 — submission and viva readiness | SE3090_GroupNumber artifacts, accessible video/APK/repository/deployments, prepared viva | Leader checks all links privately/incognito and submits once by deadline; maintain access through 21 October 2026; no external AI during evaluation |

**Remaining confirmation:** Written lecturer approval for the documented three-member/two-agent variation is unverified in current guidance. Implementation, test, deployment, link-access and individual-contribution completeness remain outside this phase. No additional Phase 0 source blocker was found.
