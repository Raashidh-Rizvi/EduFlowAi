# Phase 1 — Current Scope and Evidence Plan

Prepared 2026-10-01. Documentation-focused discovery only. Requirements authority: [Phase 0 map](00_REQUIREMENTS_AND_REPORT_MAP.md). Only this file is created in Phase 1.

**Classification:** DOCUMENTED CURRENT DIRECTION means documented intent/architecture; DOCUMENTED RESPONSIBILITY means allocation, not exclusive authorship; DOCUMENTED STATUS means an attributed prior report, not verification performed here; NEEDS SOURCE VERIFICATION and NEEDS RUNTIME VERIFICATION identify later evidence; UNRESOLVED identifies missing or conflicting evidence. Classifications apply to the associated paragraphs and table rows.

**Scope:** Read the named current guidance, Phase 0, root README, retained project-document notices/domain material, member summaries and relevant status reports. Searched authorized current/reference/member text for approval evidence. No application folders, Git history or legacy files were inspected; no tests, builds, installations, startup or Git changes occurred. Source paths below are future inspection targets, not inspected evidence. Embedded historical links were not followed. The erroneous outer-workspace map is excluded.

**Authority:** [Source of truth](../00_SOURCE_OF_TRUTH.md) and [catalog](../INDEX.md) separate official requirements, current source/reproducible tests, current guidance, allocation and attributed member evidence. [Dual-agent current notes](../current/DUAL_AGENT_RAG_PLAN.md) qualify the plan's older examples. [Retained project documents](../project/README.md) await owner review and are not implementation authority. Newer member reports may identify progress beyond central summaries without establishing whole-project completion.

## 1. Project Identity

**DOCUMENTED CURRENT DIRECTION** — [root README](../../README.md), [overview](../current/SYSTEM_OVERVIEW.md), [Phase 0](00_REQUIREMENTS_AND_REPORT_MAP.md).

| Field | Documented identity |
| --- | --- |
| Title | EduFlow AI / EduFlowAi |
| Module | SE3090 — Software Engineering Frameworks, Year 3 Semester 1, 2026; Assignment 1 |
| Domain | Education: courses/content, assessments, learner participation/progress and AI-assisted learning |
| Repository root | C:/Users/WAZNI/Desktop/SLIIT/PROJECTS/Y3/Y3-S1/SEF/PROJECTS/EduFlowAi/EduFlowAi |
| Organization | One repository with backend/, frontend/, mobile/, ai-agent/ and docs/, as documented in the root README |
| Team | 3 documented members |
| Business scope grouping | 3 member-aligned primary responsibility areas, with subcomponents listed in §5 |
| Agent direction | 2 named intended agents; distinct Quiz Generator implementation remains unverified |

**UNRESOLVED:** No official group number, verified remote URL or written lecturer approval artifact was established here. The component count is a transparent allocation grouping, not certification of assessment-compliant completed components.

## 2. Business Problem

**DOCUMENTED CURRENT DIRECTION:** Current guidance combines course delivery, assessment and progress with help understanding lecture material. The Learning Agent's stated purpose is to help learners study actual indexed lectures with source scope and citations. Retained mobile/gamification material frames static PDF lists, isolated quizzes and weak motivation as design problems. Sources: [overview](../current/SYSTEM_OVERVIEW.md), [Learning Agent](../members/member-1-wazni/ai/LEARNING_AGENT.md), [mobile design](../project/13_MOBILE_APPLICATION.md), [gamification design](../project/12_GAMIFICATION_RULEBOOK.md).

**UNRESOLVED:** These are documented product motivations, not measured user-research findings. Improved grades, engagement or instructor productivity are not demonstrated by this phase.

## 3. Current Project Objectives

**DOCUMENTED CURRENT DIRECTION** — synthesized from [overview](../current/SYSTEM_OVERVIEW.md), [matrix](../current/RESPONSIBILITY_MATRIX.md), [architecture](../current/CURRENT_ARCHITECTURE.md), [dual-agent plan](../current/DUAL_AGENT_RAG_PLAN.md) and [RAG](../current/RAG_PIPELINE.md):

1. Combine administrative governance, academic authoring/assessment and learner participation in one education platform.
2. Provide appropriate Admin, Instructor and Student interfaces with shared course identities and contracts.
3. Connect React and Flutter to the shared ASP.NET Core API and PostgreSQL business data.
4. Support lecture-grounded chat, topic breakdown, whole-lecture/topic study plans and explanations with citations.
5. Develop a distinct Quiz Generator Agent using shared lecture/RAG infrastructure; completion remains unconfirmed.
6. Support progress/gamification without treating historical reward formulas as verified behavior.
7. Produce secure integration, testing, delivery and individual-ownership evidence against Phase 0 requirements.

**NEEDS SOURCE VERIFICATION / NEEDS RUNTIME VERIFICATION:** Objectives are not completion claims. The assessed multi-agent, durable-state, authorized-approval workflow must be demonstrated separately from scoped Learning chat/tool evidence.

## 4. User Roles and Responsibilities

All role directions below are **DOCUMENTED CURRENT DIRECTION**; retained permission examples remain owner-review targets. Runtime roles are not exclusive code ownership.

| Role | Documented responsibility | Evidence source | Verification still required |
| --- | --- | --- | --- |
| Admin | Account/role/status governance; platform course inventory, metadata, access/enrollment and supported module administration. Member material additionally addresses support, audit, profile and summary work. | [Matrix](../current/RESPONSIBILITY_MATRIX.md), [User](../members/member-1-wazni/software/USER_MANAGEMENT.md), [Course](../members/member-1-wazni/software/COURSE_MANAGEMENT.md), [Support](../members/member-1-wazni/software/SUPPORT_DESK.md) | Phase 2 actual authorization/data rules; Phase 3 UI. Specifications do not establish completion. |
| Instructor | Academic curriculum/content, authoring/publishing, assessment definitions/grading and academic management; Quiz Generator allocation. | [Matrix](../current/RESPONSIBILITY_MATRIX.md), [Raashidh](../members/member-2-raashidh/README.md), [retained quiz design](../project/11_QUIZ_PIPELINE.md) | Phases 2–3 resource ownership, review/publication and grades; Phase 5 distinct agent. |
| Student | Participation/completion, attempts/results, progress/rewards and shared academic-content consumption; Learning Assistant. React StudentPortal and Flutter are documented interfaces. | [Overview](../current/SYSTEM_OVERVIEW.md), [matrix](../current/RESPONSIBILITY_MATRIX.md), [Atheek](../members/member-3-atheek/README.md) | Phases 2–5 actual content access, submissions, progress, mobile and learning behavior. |

**UNRESOLVED:** The retained [permission matrix](../project/04_ROLES_AND_PERMISSIONS.md) includes broader Admin academic powers than newer Admin navigation/course documents expose. UI omission is not proof of server denial. Reconcile actual permissions in Phase 2 and visible UI responsibilities in Phase 3; Admin access does not transfer academic authorship.

## 5. Major Business Components

**DOCUMENTED RESPONSIBILITY:** Count **3 primary member-aligned business responsibility areas** from the current matrix. User Management and Course Management are subareas of the first; curriculum/content/assessment of the second; participation/progress/gamification of the third. Shared AI/RAG and infrastructure support these areas and are not counted as invented additional owned business components.

| Component | Purpose | Primary users | Documented owner | Current documented status | Later verification phase |
| --- | --- | --- | --- | --- | --- |
| Platform administration and governance | User Management; Admin/platform Course Management, inventory and access; related governance/support/audit scope | Admin; governed Instructor/Student accounts | Wazni, coordinating shared academic boundaries | DOCUMENTED STATUS: central September 28 guidance says audit pending; newer User/Course reports claim scoped changes and checks with manual UAT pending; final audit runtime checks partly blocked | Phase 2 backend/database/security; Phase 3 React; Phase 6 evidence; Phase 7 ownership |
| Academic curriculum, content and assessment | Academic authoring/publishing, assessment definitions/grading and integration | Instructor; Student consumers; coordinated Admin access | Raashidh | DOCUMENTED STATUS: assigned scope and historical contribution evidence; no current whole-component recertification; Quiz Agent pending | Phases 2–3; Phase 4 mobile slices; Phase 5 AI; Phases 6–7 evidence |
| Learner participation, progress and gamification | Participation/completion, attempts/results, progress/rewards and supported mobile experience | Student; relevant Instructor/Admin consumers | Atheek | DOCUMENTED STATUS: current allocation with historical contribution summaries; full mobile/workflow/reward-rule verification pending | Phases 2–4 and 6–7 |

Sources: [matrix](../current/RESPONSIBILITY_MATRIX.md), [central status](../current/IMPLEMENTATION_STATUS.md), [Wazni](../members/member-1-wazni/README.md), [Raashidh](../members/member-2-raashidh/README.md), [Atheek](../members/member-3-atheek/README.md), [audit hardening](../members/member-1-wazni/software/AUDIT_HARDENING.md).

**UNRESOLVED:** This is documented allocation grouped for reporting, not lecturer acceptance of a reduced three-component assessed scope. Confirm boundaries and approved adjustment without adding fake members/components.

## 6. Team and Responsibility Matrix

**DOCUMENTED RESPONSIBILITY:** Three named members and IDs appear consistently in the current matrix and member summaries. Missing ownership remains unspecified.

| Member | Student ID | Primary component/responsibility | Backend responsibility | Database responsibility | React responsibility | Flutter responsibility | Agentic AI responsibility | Current evidence source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Wazni | IT24103352 | Admin User and platform Course Management | Member reports describe user/admin operations; Learning gateway integration. Shared authentication/gateway are not exclusively owned. | Shared EF user/business operations; exclusive schema/migration ownership not established | Admin User/Course UI; Learning integration in shared StudentPortal | Precise current owned Flutter slice not established | Learning Agent, three tools, scoped STM and required gateway/UI integration | [README](../members/member-1-wazni/README.md), [contributions](../members/member-1-wazni/CONTRIBUTION_SUMMARY.md), [User](../members/member-1-wazni/software/USER_MANAGEMENT.md), [Course](../members/member-1-wazni/software/COURSE_MANAGEMENT.md) |
| Raashidh | IT24104191 | Instructor curriculum/content, assessments/grading and academic integration | Academic/assessment allocation documented; exact current code contribution pending | Academic contracts/relationships are shared; exclusive table/migration ownership not established | Instructor-side responsibilities; exact file/contribution boundaries pending | Current individual Flutter slice not established; historical shared allocation is not proof | Quiz Generator Agent assigned; distinct implementation unverified | [README](../members/member-2-raashidh/README.md), [matrix](../current/RESPONSIBILITY_MATRIX.md) |
| Atheek | IT24103933 | Student experience, participation, progress/gamification and supported mobile contributions | Learner participation/results/progress allocation; exact source ownership pending | Exact business-table ownership not established; RAG/Chroma contribution is not exclusive PostgreSQL ownership | Student-facing consumption/progress allocation; not sole ownership of StudentPortal | Supported mobile contributions documented; exact features/files pending | Primary/shared RAG foundation, not a third agent; assessed AI allocation unresolved | [README](../members/member-3-atheek/README.md), [matrix](../current/RESPONSIBILITY_MATRIX.md), [RAG](../current/RAG_PIPELINE.md) |

**DOCUMENTED RESPONSIBILITY:** Identity/authentication, Program.cs, database relationships/migrations, gateway, API schemas, client shell/session and CI are shared in the matrix. Keep one course model and consistent identifiers. Wazni's README records WAZNI AHAMED / Ahamed M.A. name variants with the same ID; no additional member is inferred.

**NEEDS SOURCE VERIFICATION:** Phase 7 must establish actual commits/PRs/tests and required individual work across the stack. Referenced commit IDs were not inspected; allocation is not retrospective exclusive authorship.

## 7. Current Documented Technology Stack

All rows are **DOCUMENTED CURRENT DIRECTION / DOCUMENTED STATUS**. No deployment or current dependency version is independently confirmed.

| Technology | Documented purpose | Evidence source | Source verification required? |
| --- | --- | --- | --- |
| React / Vite | Admin, Instructor and Student web pages; Learning Assistant | [Overview](../current/SYSTEM_OVERVIEW.md), [setup](../current/LOCAL_SETUP_GUIDE.md) | Yes, Phase 3; versions, routing/state |
| ASP.NET Core / .NET 8 | Public business API, identity and AI gateway | [Overview](../current/SYSTEM_OVERVIEW.md), [architecture](../current/CURRENT_ARCHITECTURE.md) | Yes, Phase 2 |
| .NET SDK 10.0.401 | Documented global.json selection, distinct from API target | [Setup](../current/LOCAL_SETUP_GUIDE.md) | Yes, Phase 2; config not opened |
| EF Core / Npgsql / PostgreSQL | Relational business persistence and migrations | [Overview](../current/SYSTEM_OVERVIEW.md), [setup](../current/LOCAL_SETUP_GUIDE.md) | Yes, Phase 2 |
| Flutter | Mobile screens and API/auth/gamification services | [Overview](../current/SYSTEM_OVERVIEW.md), [status](../current/IMPLEMENTATION_STATUS.md) | Yes, Phase 4; state, secure storage, device features |
| Python / FastAPI / Uvicorn | Internal AI service and local startup | [Architecture](../current/CURRENT_ARCHITECTURE.md), [setup](../current/LOCAL_SETUP_GUIDE.md) | Yes, Phase 5 |
| Pydantic | AI request/response schemas | [Learning document](../members/member-1-wazni/ai/LEARNING_AGENT.md) | Yes, Phase 5 |
| ChromaDB | Persistent lecture chunks, embeddings and source/section metadata | [RAG](../current/RAG_PIPELINE.md) | Yes, Phase 5 |
| Groq / Gemini | Configured generation providers; local/default or Gemini embedding direction | [RAG](../current/RAG_PIPELINE.md), [setup](../current/LOCAL_SETUP_GUIDE.md) | Yes, Phase 5; availability/runtime Phase 6 |
| Node / npm | Root/frontend tooling | [Root README](../../README.md), [setup](../current/LOCAL_SETUP_GUIDE.md) | Yes, Phases 3/6 |
| JWT / BCrypt | Documented identity/password protection | [Security design](../project/07_SECURITY_AND_PRIVACY.md), [User report](../members/member-1-wazni/software/USER_MANAGEMENT.md) | Yes, Phase 2; enforcement not certified |

**UNRESOLVED:** Exact current React/Flutter state-management library choices are not established. Redis, SignalR, pgvector, S3 migration, LangGraph and removed agents are not asserted as current technologies from retained proposals. GitHub Actions is an official requirement; active workflow and passing runs remain Phase 6 work.

## 8. Current High-Level Architecture

**DOCUMENTED CURRENT DIRECTION** — [architecture](../current/CURRENT_ARCHITECTURE.md), [contracts](../current/API_CONTRACTS.md), [RAG](../current/RAG_PIPELINE.md), [dual-agent notes](../current/DUAL_AGENT_RAG_PLAN.md).

**DOCUMENTED ARCHITECTURE — IMPLEMENTATION VERIFICATION PENDING**

~~~mermaid
flowchart LR
    Web["React: Admin / Instructor / Student"] --> API["ASP.NET Core public API"]
    Mobile["Flutter: full workflow unverified"] --> API
    API --> Business["Business services / EF Core"]
    Business --> PG[("PostgreSQL business data")]
    API --> Gateway["AiGatewayClient"]
    Gateway --> Python["Internal Python / FastAPI"]
    Python --> Learning["AGENT: Learning Agent"]
    Learning --> Tools["TOOLS: Breakdown / Study Planner / Explainer"]
    Learning --> STM["Process-local scoped STM"]
    Learning --> RAG["Shared RAG pipeline"]
    Tools --> RAG
    Python --> Functions["SERVICE FUNCTIONS: RAG chat / slide categorization / slide quiz"]
    Python -. "intended, unverified" .-> Quiz["PLANNED AGENT: Quiz Generator"]
    Quiz -. "intended reuse" .-> RAG
    PDF["Local PDF visible to Python"] --> Index["Parse / chunk / embed"]
    Index --> Chroma[("Persistent ChromaDB")]
    RAG --> Chroma
    RAG --> Providers["External Groq / Gemini providers"]
~~~

Solid arrows describe current documentation, not newly verified links. Dotted arrows identify planned Quiz relationships. The diagram groups service functions without asserting identical retrieval paths. Tools/RAG are not extra agents.

The documented browser boundary is React → ASP.NET Core → Python. Flutter's shared API direction is documented but full runtime integration is unverified. PostgreSQL is business storage, not an intermediate network hop to Python; Python accesses Chroma directly. External generation is described within the AI service, reached through ASP.NET. **UNRESOLVED:** Whether the provider integration supplies all required third-party evidence, and whether other third-party services exist, requires Phases 5–6 verification. No additional service is invented.

## 9. Current Documented Cross-Platform Workflow

### Documented workflow

**DOCUMENTED CURRENT DIRECTION** — [matrix](../current/RESPONSIBILITY_MATRIX.md), [architecture](../current/CURRENT_ARCHITECTURE.md), [contracts](../current/API_CONTRACTS.md), [RAG](../current/RAG_PIPELINE.md).

- Admin governs users/platform inventory/access; Instructor authors academic content/assessments using shared course contracts. Business operations are documented through ASP.NET and PostgreSQL.
- Students consume academic content/assessment and progress through web/mobile interfaces and the shared API. Retained [quiz design](../project/11_QUIZ_PIPELINE.md) proposes generation → instructor review/publishing → student attempt → grading/progress; this lifecycle remains design material pending owner/source verification.
- In the documented React Learning path, the learner selects an indexed lecture and requests chat/breakdown/plan/explanation. ASP.NET forwards to Python; Learning tools/RAG retrieve source material and return structured outputs/citations through the gateway.
- Normal PDF upload and RAG indexing are separate. A saved upload does not prove Chroma discovery.

### Verified workflow status

**DOCUMENTED STATUS:** [Central status](../current/IMPLEMENTATION_STATUS.md) and [Learning evidence](../members/member-1-wazni/ai/LEARNING_AGENT_TEST_EVIDENCE.md) report scoped tests/live React → ASP.NET → Python Learning behavior. No execution was repeated here.

**NEEDS RUNTIME VERIFICATION:** This phase establishes no complete Flutter-to-React AI workflow with authorized review and status returned to the initiating user. Phase 0's acceptance pattern is a requirement, not proof the Learning flow meets it. Durable assessed workflow state is distinct from temporary chat memory. Verify the constituent paths in Phases 2–5 and collect integrated acceptance evidence in Phase 6.

## 10. Current Agentic AI Direction

**DOCUMENTED CURRENT DIRECTION:** Two intended named agents, not two runtime-certified distinct agents. Sources: [dual-agent notes and design](../current/DUAL_AGENT_RAG_PLAN.md), [Learning document](../members/member-1-wazni/ai/LEARNING_AGENT.md), [contracts](../current/API_CONTRACTS.md), [matrix](../current/RESPONSIBILITY_MATRIX.md).

| Classification | Element | Documented responsibility | Status |
| --- | --- | --- | --- |
| AGENT | Learning Agent | Learning-action orchestration and scoped chat using indexed lectures and citations | DOCUMENTED STATUS: prior scoped verification reported; Phase 5 re-verification |
| TOOL | BreakdownTool | Validated source-bound topic/section breakdown and cached metadata | DOCUMENTED STATUS; not a separate agent |
| TOOL | StudyPlannerTool | Whole-lecture/selected-section study sessions | DOCUMENTED STATUS; current contract uses sessions, not old day-based examples |
| TOOL | ExplainerTool | Scoped retrieval, explanation and citations | DOCUMENTED STATUS; not a separate agent |
| RAG INFRASTRUCTURE | Parser/chunker/embeddings/Chroma/retrieval | Shared lecture foundation, primarily attributed to Atheek and reused/extended by Wazni | DOCUMENTED RESPONSIBILITY/STATUS; not a third agent |
| SERVICE FUNCTION | RAG chat, slide categorization, slide quiz generation | Documented existing internal service functions | DOCUMENTED STATUS; endpoint existence alone does not certify a distinct Quiz Agent |
| PLANNED AGENT | Quiz Generator Agent | Intended full/sub-lecture quizzes, difficulty/questions and shared breakdown/RAG reuse | DOCUMENTED RESPONSIBILITY: Raashidh; distinct implementation unverified |

**NEEDS SOURCE VERIFICATION:** Current contract notes mark /api/v1/agent/quiz, /api/v1/tools/* and the illustrated sub-lecture GET route as planned examples, not current registered endpoints. A “Coach” label/route does not establish another agent. Do not infer direct-client Python fallback or revive obsolete Planner/Domain Analysis/Action/Validation/AI Coach topology.

**UNRESOLVED:** Phase 5 must map actual agent contracts, controlled tools, planning/delegation, durable state, deterministic validation, high-impact authorized approval, observability and safe failure to Phase 0. RAG must not be renamed to resolve Atheek's unconfirmed assessed AI allocation.

## 11. Current RAG Direction

**DOCUMENTED CURRENT DIRECTION / DOCUMENTED STATUS** — [RAG guidance](../current/RAG_PIPELINE.md), [architecture](../current/CURRENT_ARCHITECTURE.md), [contracts](../current/API_CONTRACTS.md).

The documented flow is local PDF → parsing → slide-aware chunks/source metadata → configured embeddings → persistent ChromaDB. Scoped queries retrieve filtered chunks; configured Groq/Gemini generation supplies answers and citations. Chroma also supports indexed-deck discovery and cached sections.

Normal backend upload is described as saving a file without automatic indexing. Indexing needs a Python-visible path and real course/module IDs. The setup checker is a mutating indexing/provider utility, not a health probe; it was not run. Existing embedding/index compatibility must be preserved.

Current guidance describes three completed conversational pairs in process-local scoped STM, lost on restart. It records insufficient retrieval for some broad follow-ups and labelled extractive chat fallback; structured Learning tools return errors when valid output cannot be produced. Citations identify supplied sources, not universal factual correctness.

**NEEDS SOURCE VERIFICATION / NEEDS RUNTIME VERIFICATION:** Phase 5 must establish index/query contracts, authorization/scope isolation, cache/grounding, provider failures and restart behavior. A retrieval filter does not prove enrollment permission; Chroma persistence does not by itself prove durable assessed workflow state.

## 12. Current Security Direction

**DOCUMENTED CURRENT DIRECTION** — [retained security design](../project/07_SECURITY_AND_PRIVACY.md), [contracts](../current/API_CONTRACTS.md), [User report](../members/member-1-wazni/software/USER_MANAGEMENT.md), [audit hardening](../members/member-1-wazni/software/AUDIT_HARDENING.md).

The documented model uses JWT identity, server-side roles/resource ownership, password hashing, validated input, protected sessions/private configuration and an internal AI boundary. Learning gateway documentation says authenticated identity replaces caller-supplied student identity. Newer User documentation reports Admin-only creation, Student-only public registration and guarded deletion; these are attributed claims pending Phase 2.

Retained design covers least privilege, privacy, input/file validation, secrets, audit and safe failure. Its old vulnerability statements are neither confirmed current defects nor confirmed fixes. Newer audit documentation describes allow-listed event metadata and exclusion of private messages/credentials/tokens, without claiming exhaustive coverage.

**NEEDS SOURCE VERIFICATION:** Phase 2 must establish roles, sessions/revocation, resource/enrollment checks, deletion retention/transactions, audit privacy and service authentication. Phases 3–4 cover client storage/protected navigation; Phase 5 covers prompt/tool boundaries. Negative runtime evidence is still needed; no secret values are recorded here.

## 13. Current Deployment Direction

**DOCUMENTED CURRENT DIRECTION:** [Root README](../../README.md) and [setup](../current/LOCAL_SETUP_GUIDE.md) describe the local runner for React/Vite, ASP.NET and Python, with expected ports 2174/5204/8000. PostgreSQL/configuration and indexing are separate prerequisites. These are instructions, not evidence services are running; no commands were executed.

**DOCUMENTED STATUS:** [Central status](../current/IMPLEMENTATION_STATUS.md) leaves deployment/compliance unverified. [Atheek's summary](../members/member-3-atheek/README.md) classifies AWS/S3/pgvector material as a historical proposal with adoption/deployment unverified; it does not replace current Chroma guidance.

**UNRESOLVED / NEEDS RUNTIME VERIFICATION:** Cloud platform selection, live API/health/Swagger/React links, PostgreSQL deployment controls, evaluator access, Flutter APK and AI hosting/startup evidence remain Phase 6 work. Previous local health observations do not establish cloud deployment. No deployed link is fabricated.

## 14. Current Limitations and Unresolved Items

### Team/lecturer approval search

**UNRESOLVED — TEAM / LECTURER CONFIRMATION EVIDENCE REQUIRED.**

Searched docs/current/, docs/reference/ and docs/members/ text for approval, approved, lecturer, group size, three/3 members, two/2 agents, scope adjustment, agent adjustment and written confirmation, including common hyphenated variants. Contexts were official requirements, internal project direction, application approval operations and explicit unverified notices. No genuine written lecturer approval for either variation was found. This does not assert anything about private correspondence outside the authorized sources.

Phase 0 records the standard four-student/four-agent requirements and written-adjustment rules. “Allocation confirmed by the user” and “approved two-agent plan” do not establish lecturer approval. Authentic confirmation must cover member count, components/functional scope, agent count and assessed AI allocation. Do not invent members or agents.

### Status/conflict register

| Classification | Issue | Source and handling |
| --- | --- | --- |
| UNRESOLVED | Central Admin status versus newer member reports | [Central status](../current/IMPLEMENTATION_STATUS.md) and [member software status](../members/member-1-wazni/software/SOFTWARE_IMPLEMENTATION_STATUS.md) say pending; newer [User](../members/member-1-wazni/software/USER_MANAGEMENT.md)/[Course](../members/member-1-wazni/software/COURSE_MANAGEMENT.md) report scoped progress. Reconcile in Phases 2–3/6; no blanket completion. |
| DOCUMENTED STATUS / NEEDS RUNTIME VERIFICATION | User/Course manual UAT pending | User reports focused Release tests; Course's September 29 report includes a skipped PostgreSQL regression and no real Course PostgreSQL UAT. Prior tests do not prove every workflow. |
| DOCUMENTED STATUS / NEEDS SOURCE VERIFICATION | Course/shared authoring limitations | Course report defers destructive course/module deletion UI and identifies mixed Lesson versus Topic/ContentItem authoring, separated upload/save and Instructor UI error behavior. Recheck, do not present as newly diagnosed defects. |
| DOCUMENTED STATUS / NEEDS RUNTIME VERIFICATION | Audit final regression blocked | [Audit hardening](../members/member-1-wazni/software/AUDIT_HARDENING.md), September 30, reports local uncommitted changes and final 241 passed / 255 environment-blocked / 1 skipped, attributed to Windows Code Integrity. These are prior reported results, not this phase's runs or proof blocked assertions would pass. |
| UNRESOLVED | Audit staged specification versus later coverage | AUDIT_HARDENING explicitly supersedes listed [AUDIT_LOGS](../members/member-1-wazni/software/AUDIT_LOGS.md) coverage with 15 event types. Account/auth hooks remain deferred over retention/deletion conflicts; actual coverage needs Phase 2. |
| NEEDS SOURCE VERIFICATION | Governance extensions have mixed maturity | [Profile](../members/member-1-wazni/software/ADMIN_PROFILE.md), [summary](../members/member-1-wazni/software/PLATFORM_SUMMARY.md), [support](../members/member-1-wazni/software/SUPPORT_DESK.md) are specifications. Audit hardening's scoped support evidence/read-only-profile context does not certify all extensions. |
| UNRESOLVED | Quiz Agent and approval workflow | Current notes leave distinct Quiz Agent pending. Learner quiz generation and retained instructor review/publishing must be reconciled; neither proves the assessed high-impact approval workflow. |
| DOCUMENTED STATUS | RAG/index/memory limitations | Upload does not automatically index; STM is process-local; broad retrieval/citation limits are recorded. Current notes override older examples. |
| NEEDS SOURCE VERIFICATION | Retained design conflicts | Direct FastAPI diagrams, day-based plans, absent-mobile-API claims, historical reward formulas and Redis/SignalR/pgvector examples are qualified by current notices. Do not restore these assumptions. |
| NEEDS RUNTIME VERIFICATION | Mobile and complete cross-platform acceptance | Current status does not certify full Flutter integration, device feature, approval and returned status. Phases 4–6. |
| UNRESOLVED | Deployment/third-party evidence | Providers are documented; required operational/failure/privacy and deployment evidence remains unverified. Phases 5–6. |
| NEEDS SOURCE VERIFICATION | Individual full-stack ownership | Precise Flutter/database slices and shared contributions need Phase 7; allocation alone is insufficient. |

## 15. Evidence Verification Plan

**NEEDS SOURCE VERIFICATION / NEEDS RUNTIME VERIFICATION:** Every row is future work, not authorization or execution in this phase. Targets come from documentation or identify bounded source categories; their current contents were not checked. Record actual dates, scope, results and limitations later.

**Phase numbering:** The user's Phase 1 instructions refine Phase 0's provisional schedule. Use the Phase 2–7 assignments below while preserving Phase 0 requirements and G/I report identifiers. Phase 0 was not edited.

| Claim / Area | Current documentation source | Required implementation source | Required test/runtime evidence | Assigned later phase |
| --- | --- | --- | --- | --- |
| Backend rules/identity/authorization | Matrix; User/Course; security design | Relevant backend/EduFlow.Api controllers/configuration and corresponding services/interfaces | Auth/role/resource negative cases, real business operations and API errors/status | Phase 2; final evidence Phase 6 |
| Database integrity/schema | Overview; User/Course reports | Core entities, ApplicationDbContext and relevant Infrastructure/Data migrations | PostgreSQL constraints, migrations, retention/transactions/races; ER/schema evidence | Phase 2; performance Phase 6 |
| Support/audit/profile/summary | Member specifications; AUDIT_HARDENING | Named admin/support/audit controllers, services/registry and matching models | Access/privacy, persistence, event atomicity, blocked regression cases and deferred coverage | Phase 2; UI Phase 3; final runs Phase 6 |
| React business/role screens | Overview; Admin reports; academic/student summaries | frontend/src App/session/routing and bounded Admin/Instructor/Student pages/services | Protected routes, forms, loading/errors, persistence, cross-role regression and state ADR input | Phase 3 |
| React Learning client | API_CONTRACTS; Learning document | frontend/src/services/aiService.js and StudentPortal plus gateway interface | Scoped authenticated calls, errors/citations and no direct Python bypass | Phase 3 with Phase 5 |
| Flutter functional slice | Overview/status; Atheek summary; retained mobile design | mobile manifests and bounded auth/API/navigation/screens/storage/device source | Unit/widget/API/navigation, secure session, actual transactions/device feature and APK | Phase 4; deployed E2E Phase 6 |
| Learning Agent/tool boundaries | Dual-agent notes; Learning document | ai-agent/agents/learning_agent.py, relevant tools, schemas and main.py; backend gateway | Contracts, validators, scope isolation, actual tool traces and safe errors | Phase 5 |
| Distinct Quiz Agent and acceptance | Dual-agent plan; Raashidh summary; Phase 0 | Locate current Quiz orchestration/contracts/state/approval integration; do not assume proposed routes exist | Golden objective, plan/delegation, permissions, durable state, authorized approval, result/safe failure | Phase 5; integrated acceptance Phase 6 |
| RAG/index/providers | RAG_PIPELINE; setup; Atheek summary | Relevant ai-agent/rag parser/chunker/vector store/rag_service and provider/upload boundary | Grounding, scope/access, empty index, provider timeout/rate-limit/failure, persistence/restart | Phase 5; measured latency Phase 6 |
| Cross-client/AI security | Contracts; security design; User/audit | Auth/resource checks, client storage and service configuration names without secret values | Cross-user denial, prompt/tool injection, approval bypass and privacy | Phase 2 lead; Phases 3–5 boundaries; Phase 6 E2E |
| Tests/performance/CI | Phase 0; current status; retained CI guidance; member evidence | Actual test projects/configuration and .github/workflows/ci.yml if present | Required seven testing areas, concurrency/latency/success rates, database/AI timing, passing push/PR CI | Phase 6 |
| Deployment/third-party | Root README/setup/status; qualified AWS proposal | Actual platform manifests/runner/configuration names | Live React/API/health/Swagger/PostgreSQL, AI access/startup, APK, evaluator links, failure handling | Phase 6 |
| Individual/Git ownership | Current matrix and three summaries | Relevant Git history/PR/issues/reviews and source changes in authorized later scope | Identity-matched cross-stack contributions, shared ownership and explain/test/modify evidence | Phase 7 |
| Team/agent variation | Phase 0 and current unresolved notices | Authentic written lecturer clarification, not a code substitute | Evidence covering member/agent/component adjustment and assessed AI allocation | Team confirmation before compliance sign-off; track through Phases 5/7 |

Report mapping: Phase 2 supplies G4/G5/G12 and architecture/ADR inputs; Phase 3 React portions of G3/G5/G7/G11; Phase 4 Flutter portions of G3/G5/G7/G10/G11; Phase 5 G6/G8 and AI architecture/ADR inputs; Phase 6 G7–G10/G13 verification and deployment ADR evidence; Phase 7 I1–I3/G13 attribution. G1–G3 drafts below remain qualified.

Personal logs, declarations and approximately one-page AI reflections must be supplied by the students. No reflection is written here. Final assembly/submission is separate later work.

## 16. Draft Inputs for Final Report

These are concise provisional inputs, not final chapters.

### G1 — Project overview and scope

**DOCUMENTED CURRENT DIRECTION:** EduFlow AI is documented as an education platform combining platform administration, academic curriculum/content and assessment, learner participation/progress and AI-assisted study. The current matrix identifies three member-aligned business areas. Guidance describes React, ASP.NET Core, PostgreSQL, Flutter and an internal Python/RAG service. Learning support centers on indexed lectures, breakdown, study plans, explanations and citations. Sources: [overview](../current/SYSTEM_OVERVIEW.md), [matrix](../current/RESPONSIBILITY_MATRIX.md), [Learning](../members/member-1-wazni/ai/LEARNING_AGENT.md).

**UNRESOLVED:** Written lecturer scope approval, functional completeness, measured learning benefits and deployed availability are not established by Phase 1.

### G2 — Requirements and user roles

**DOCUMENTED CURRENT DIRECTION / DOCUMENTED RESPONSIBILITY:** Current documentation defines Admin, Instructor and Student. Admin handles account/platform governance and course inventory/access; Instructor handles academic authoring/content/publishing/assessment; Student handles participation, attempts/results and progress. Shared course models/contracts connect these areas. Runtime permission is distinct from contribution ownership. Sources: [matrix](../current/RESPONSIBILITY_MATRIX.md), [overview](../current/SYSTEM_OVERVIEW.md), [retained permissions](../project/04_ROLES_AND_PERMISSIONS.md).

**NEEDS SOURCE VERIFICATION / NEEDS RUNTIME VERIFICATION:** Exact authorization, resource boundaries, business workflows, mobile behavior and assessed acceptance remain Phases 2–6 work. Retained permissions are design inputs, not enforcement proof.

### G3 — High-level integrated architecture

**DOCUMENTED CURRENT DIRECTION:** The documented architecture places ASP.NET Core between React/Flutter clients and shared application services. EF Core/PostgreSQL serves business persistence; the AI gateway calls Python/FastAPI. Learning Agent tools reuse shared RAG/Chroma and configured Groq/Gemini providers. Quiz Generator remains assigned/planned with distinct implementation unverified. RAG is shared infrastructure, not another agent. Sources: [architecture](../current/CURRENT_ARCHITECTURE.md), [contracts](../current/API_CONTRACTS.md), [RAG](../current/RAG_PIPELINE.md), [dual-agent notes](../current/DUAL_AGENT_RAG_PLAN.md).

**DOCUMENTED STATUS / NEEDS RUNTIME VERIFICATION:** Prior material reports a scoped React Learning flow, not complete mobile-to-web acceptance, durable assessed workflow state, approval enforcement or deployment. The diagram in §8 remains explicitly qualified until source/runtime evidence supports a final version.
