# Three-Student Responsibility Matrix

## 1. Purpose and authority

This is the working source of truth for future development ownership, progress tracking, integration planning and viva preparation. The team selected this allocation; it does not establish historical authorship or certify assignment compliance.

Read this file before the relevant individual tracker:

- [Student 1: System Admin](STUDENT_1_SYSTEM_ADMIN.md)
- [Student 2: Instructor](STUDENT_2_INSTRUCTOR.md)
- [Student 3: Student](STUDENT_3_STUDENT.md)

The [official assignment specification](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md) controls assessment requirements. Project-written blueprints do not override it. The notice and AutoCare sample in `docs/reference/` are supporting guidance only.

### Audit baseline and status rules

- Baseline: `dev` and `origin/dev`, commit `6f6c2032640814a929df3b2bbb26d5fc88fb8d9a`.
- Tracking baseline date: 2026-09-19.
- Evidence: source inspection and local Git inspection from the repository audit, rechecked against the updated checkout.
- No application, build, test, migration or deployment run was performed for this documentation task.
- Existing uncommitted files and reference documents are not evidence of completed implementation.
- COMPLETE: only a narrowly described source implementation justified by the audit. It does not mean that the entire component is complete, that a deployment works, or that the named owner authored it.
- PARTIAL: implementation exists, but material correctness, security, persistence, integration or verification work remains.
- NOT IMPLEMENTED: the identified capability or required evidence was not found.
- DOCUMENTED ONLY: existing project documentation describes the capability without an operational implementation.
- `[x]` is reserved for narrowly complete implementation. All partial, missing and documented-only work remains unchecked.
- Progress labels Strong / Moderate / Early / Missing summarize available implementation evidence, not marks, percentages or personal contribution.
- No complete role-owned, cross-platform component was established by the audit.

## 2. Team restructuring

The project originally had four members. One former member left, and the current team has three members. The team has selected three role-aligned business components; application access rights do not determine exclusive code ownership.

**Group-size approval status: TO CONFIRM.**

**Lecturer confirmation of proportional functional/Agentic AI adjustments: TO CONFIRM.**

Written approval evidence: **NOT PROVIDED / TO CONFIRM**. Record the lecturer's actual confirmation and location here when available; do not infer it from the departure or this allocation.

Specification Section 3 requires an approved group-size variation and one primary component per student. Sections 3 and 16 require each student to contribute backend, PostgreSQL, React, Flutter, tests, security/integration, documentation/Git and a distinct Agentic AI contribution. Section 9.1 requires at least four distinct agents for the standard group; any adjustment needs written lecturer confirmation. Three people do not automatically mean three agents.

## 3. Final primary components and identities

| Student | Name | Student ID | Application role | Primary business component | Primary Agentic AI contribution | Supporting AI responsibilities |
|---|---|---|---|---|---|---|
| Student 1 | Ahamed M.A. | IT24103352 | System Admin | System Administration, User & Course Governance, Reporting and AI Safety | Validation / Safety Agent | Coordinator / Planner; workflow lifecycle/governance; approval safety; auditability and observability |
| Student 2 | Raashidh M.R. | IT24104191 | Instructor | Instructor Curriculum, Assessment and AI Content Management | Action / Tool Agent | Quiz Generator Agent; Slide Topic Agent; Quiz Evaluator Agent |
| Student 3 | Atheek M.F. | IT24103933 | Student | Student Learning, Progress, Gamification and Adaptive Guidance | Domain Analysis Agent | AI Coach Agent; Retention Behaviour Agent; Next Best Action Agent |

These are forward-looking ownership assignments. No attribution of existing commits, tests or features to these people is implied.

## 4. Software responsibility matrix

| Area | Student 1: System Admin | Student 2: Instructor | Student 3: Student |
|---|---|---|---|
| ASP.NET Core/backend | Admin operations; platform/course governance; platform reports; policy, audit and notification lifecycle | Academic course hierarchy; content upload; assessment authoring; grading contract; academic review/publication; course insights | Enrollment participation; attempts/completion; rewards; mastery; missions; student team participation; learner guidance |
| PostgreSQL | Report/audit/governance data; shared identity and workflow-persistence maintenance | Curriculum, assessment definitions/configuration, academic review records | Participation, submissions, reward ledger/aggregates, mastery, streaks and missions |
| React | AdminManagement; platform portions of Dashboard/Insights; governance and notification views | Courses, Assessments, AiReview academic controls; instructor insights | StudentPortal home, attempts/results, progress, coach, focus and rankings |
| Flutter | Governed notification inbox/read state, identity integration and workflow status/history slice; currently missing integration | Curriculum/documents and assessment presentation slice; academic review where justified | Learner transactions, progress/reward screens, attempts/results and adaptive guidance |
| Security/authorization | Coordinate shared identity, platform policies, internal-service safeguards and audit rules | Enforce instructor course ownership, content scope and publication/approval permissions | Enforce self-only data, enrollment, eligible attempts, reward integrity and student team permissions |
| Testing | Admin authorization, reporting, lifecycle/audit, safety and governance mobile tests | Authoring, grading, academic approval, content/assessment mobile and AI tool tests | Attempts, rewards/concurrency, student mobile, learner analysis and recommendation tests |
| Git/evidence | Own genuine issues/PRs/commits and validation records | Own genuine issues/PRs/commits and validation records | Own genuine issues/PRs/commits and validation records |
| Documentation | Own tracker; governance/security/reporting contracts | Own tracker; curriculum/assessment/review contracts | Own tracker; participation/reward/guidance contracts |
| Deployment | Coordinate configuration, migrations and governance operability; not exclusive deployment credit | Verify content storage, authoring APIs and academic AI dependencies | Verify learner API configuration, mobile build/install and progress/guidance behavior |
| Agentic AI | Validation/Safety primary; Planner/lifecycle supporting | Action/Tool primary; generation, topic extraction and evaluator supporting | Domain Analysis primary; coach, retention and next action supporting |

Every student must implement and explain their own full-stack slice. Owning the Student application role does not grant exclusive ownership of all Flutter code. Administrative access to academic operations does not grant Student 1 academic authorship.

## 5. Course-management ownership boundary

The group leader's association of System Admin with user and course management is preserved as **platform/course governance**, with academic ownership remaining with Student 2.

| Operation/data behavior | Primary owner | Boundary |
|---|---|---|
| User directory, account status, role governance and platform access | Student 1 | Shared authentication contracts; each component enforces its resource rules |
| Global course inventory, platform-level access/administrative controls, auditing and platform reports | Student 1 | Dedicated governance behavior is not fully implemented; do not claim a separate governance API already exists |
| Course academic metadata, syllabus, modules, lessons, topics, documents and learning objectives | Student 2 | Includes academic create/edit/delete and publication |
| Assessment design, question bank, quiz configuration and grading criteria | Student 2 | Student 3 consumes the grading contract rather than defining a second grading engine |
| Academic content approval and publish/unpublish decisions | Student 2 | Student 1 supplies safety/lifecycle controls; administrative override must be separate and audited if implemented |
| Course roster administration for teaching | Student 2 | Platform user eligibility/policy remains Student 1; learner self-enrollment remains Student 3 |
| Learning completion, student attempts and earned progress | Student 3 | Consumes published curriculum and assessments |
| Global course restriction/administrative override policy | Student 1 | Proposed governance scope; no implemented override should be inferred. Coordinate effects with Student 2 and Student 3 |

Do not create competing course models or duplicate publish controls merely to divide work. A mixed controller is divided by method group and contract. Academic CRUD belongs to Student 2 even if Admin can call it.

## 6. Agentic AI responsibility matrix

All listed agent capabilities are PARTIAL at the integrated-workflow level.

| Agent/source under `ai-agent/agents/` | Primary maintainer | Contribution and present limitation |
|---|---|---|
| `validation_guard.py` | Student 1 | Deterministic schema/business/safety checks; application acceptance/publication can bypass outcomes |
| `planner.py` | Student 1 | Structured plan and allowed-action checks; planning/execution is largely fixed and not consistently plan-driven |
| `content_action.py` | Student 2 | Controlled tools, schedules and adaptive drafts; fallback and contract gaps |
| `quiz_generator.py` | Student 2 | Scope/slide-grounded generation and regeneration; approval/publication enforcement incomplete |
| `slide_topic_agent.py` | Student 2 | Topic extraction/classification; file access and validation need completion |
| `quiz_evaluator_agent.py` | Student 2 | Evaluation endpoint/gateway; normal .NET submission does not call it |
| `domain_analysis.py` | Student 3 | Learning gaps/difficulty/evidence; grounding and defaults need verification |
| `ai_coach.py` | Student 3 | Structured tutoring/model calls; full controlled-tool grounding is incomplete |
| `retention_behavior.py` | Student 3 | Risk/intervention logic; delivery/application of interventions incomplete |
| `next_best_action.py` | Student 3 | Python recommendation path; public .NET/client path incomplete |

Ownership of an agent includes its contracts, permitted tools, validation, error handling, integration, evaluation and documentation. It is not a claim that the owner previously authored it. Shared graph/state/registry infrastructure is maintained cooperatively.

## 7. Core four-agent assessed workflow

Required retained roles:

`Planner -> Domain Analysis -> Action/Tool -> Validation/Safety -> authorized human approval where applicable -> audited backend execution/status`

- Student 1: Planner contracts, workflow identity, durable lifecycle, validation and approval enforcement.
- Student 3: Grounded learner-state analysis and recommendations.
- Student 2: Content/action tools, academic proposal and instructor decision.
- All: durable shared state, API contract, safe failures and cross-platform demonstration.

The intended assessed scenario is a learner objective submitted in Flutter, authenticated and persisted by ASP.NET Core/PostgreSQL, processed through the four roles, reviewed academically in React, and returned as persisted status to the same mobile learner. **Current status: PARTIAL; this complete scenario is not yet demonstrated.**

The specification does not explicitly require an exclusive one-agent-per-person mapping. It does require a distinct technical AI contribution per person and distinct participating agents. Keeping four core roles is the conservative plan unless a written adjustment is supplied.

## 8. Shared infrastructure: maintainership, not exclusive ownership

| Shared artifact | Coordination rule |
|---|---|
| `backend/EduFlow.Api/Program.cs` | Student 1 coordinates platform configuration; all owners review effects on their endpoints and DI |
| `ApplicationDbContext.cs`, entities and migration conventions | Each owner proposes changes for owned behavior; cross-component relationships and migration ordering are shared |
| JWT, `IAuthService`, auth DTOs and token contracts | Student 1 coordinates; every owner implements their role/resource enforcement and integration |
| React `App.jsx`, shell, navigation, theme, Axios client | Shared; each owner maintains integration and error states for owned views |
| Flutter navigation, HTTP client, token storage, shared widgets/theme | Shared; each owner must deliver real mobile contribution |
| `AiGatewayClient` / `IAiGatewayClient` | Shared transport and identity/error contract; feature methods have responsible consumers |
| AI schemas, state, graph, base agent, registry, retries/observability | Student 1 coordinates lifecycle; each agent owner supplies correct contracts, permissions and tests |
| CI, deployment, secrets and runtime conventions | Shared integration work with genuine per-person evidence |

No ownership rule here requires a new permission ceremony for routine changes. Make necessary shared changes with cross-component awareness and review evidence.

## 9. Cross-member dependencies and acceptance handoffs

| Workflow | Student 1 | Student 2 | Student 3 | Required handoff |
|---|---|---|---|---|
| Course governance to learning | User/access/global controls | Author/publish academic content | Enroll/read/complete | Agreed course ID, publication/access rules and enrollment contract |
| Quiz to progress | Audit and policy controls | Define questions/grading and return outcomes | Persist attempts and apply deterministic rewards | Same pass threshold, valid submission identity, atomic/idempotent reward contract |
| Adaptive study plan | Planner, durable lifecycle, safety/audit | Generate content and approve/reject/revise | Submit objective; provide learning data; receive status | Same workflow ID across Python, .NET, DB and clients |
| Announcements | Delivery/read governance | Course message content and audience | Learner consumption | Actual delivery/status; no simulated success |
| Reporting | Platform reports | Course insights | Reliable activity/progress sources | Authorization-filtered data and defined metrics |
| Teams | Platform safety conventions | Instructor squad management | Membership and rankings | Matching routes, scoped permissions, reliable persisted membership |

Contract producers and consumers should review changes together. Avoid duplicate data or contradictory reward/grading calculations.

## 10. Assignment compliance checklist

These are compliance work items, not a certificate of completion.

- [ ] [NOT IMPLEMENTED] Record written group-size approval evidence (Section 3; no approval evidence supplied).
- [ ] [PARTIAL] Deliver three primary business components, each with at least four meaningful endpoints and a non-CRUD business operation (Sections 3/5).
- [ ] [PARTIAL] Demonstrate each person's backend, PostgreSQL, React, Flutter, tests, security/integration, documentation and Git work.
- [ ] [PARTIAL] Demonstrate four distinct core agents with contracts, permissions and visible participation; retain count unless lecturer confirms an adjustment (Section 9.1).
- [ ] [PARTIAL] Persist and recover objective/plan/steps/tools/validation/errors/approval/outcome; reject unsafe or unknown transitions.
- [ ] [PARTIAL] Enforce authorized human approval before a defined high-impact action.
- [ ] [NOT IMPLEMENTED] Demonstrate Flutter -> API -> PostgreSQL -> AI -> React review -> mobile status with consistent identity (Section 10).
- [ ] [NOT IMPLEMENTED] Deliver meaningful mobile device-feature evidence and a runnable APK (Sections 8/14/15).
- [ ] [PARTIAL] Complete protected React routing, justified state management and consistent API/error handling (Section 7).
- [ ] [PARTIAL] Prove PostgreSQL migrations, constraints, transactions and reproducible initialization (Sections 6/12).
- [ ] [NOT IMPLEMENTED] Establish a distinct meaningful third-party service integration, or lecturer-confirmed interpretation of existing provider use (Section 11); do not count a UI claim as delivery.
- [ ] [PARTIAL] Complete required backend/React/Flutter/DB/AI/security/integration tests plus performance evidence (Section 12).
- [ ] [PARTIAL] Verify CI actually passes; workflow files are not evidence of a successful run (Section 13).
- [ ] [NOT IMPLEMENTED] Supply verified deployment URLs, Swagger/health, DB evidence, APK, evaluator access and video (Sections 14/15).
- [ ] [PARTIAL] Reconcile ADRs and individual technical evidence with actual implementation; record real AI-use logs/declarations (Sections 14-19).
- [ ] [NOT IMPLEMENTED] Rehearse each person's explanation/modification/debugging without external AI assistance during evaluation (Section 16).

For evidence-related NOT IMPLEMENTED items, this means no qualifying evidence was established by the audit, not proof that no activity occurred outside the repository.

## 11. Current project-level risks

| Audit finding | Status | Responsible follow-through |
|---|---|---|
| Flutter login, quizzes, coach and rewards are local simulations; no shared API services demonstrated | PARTIAL | All, by agreed mobile slices |
| Registration accepts caller-selected role; suspension/token lifecycle incomplete | PARTIAL | Student 1 coordinates; all enforce resource access |
| Gamification mutations and several squad management routes lack required authorization | PARTIAL | Student 3 rewards; Student 2 instructor teams; shared security review |
| Academic role checks do not consistently enforce own-course access | PARTIAL | Student 2 |
| Class-level Instructor/Admin analytics restriction blocks intended student-only access | PARTIAL | Student 2/3 contract with Student 1 policy review |
| Graph uses MemorySaver/ACTIVE_WORKFLOWS; durable recovery incomplete | PARTIAL | Student 1 with all AI owners |
| Python workflow ID, log ID and study-plan GUID are not consistently correlated | PARTIAL | Student 1 lifecycle; Student 2 review; Student 3 status |
| Backend records validation success/pending state without consistently honoring actual validation; unknown workflows may get placeholder state | PARTIAL | Student 1 |
| AI-generated quizzes can be Published before academic review | PARTIAL | Student 2; Student 1 safety guard |
| Revisions stop after replanning; approval may mark completion without protected execution | PARTIAL | Student 1/2 |
| Mission UI calls claimGrandReward but service provides claimDailyGrandMission, then changes local XP | PARTIAL | Student 3 |
| Squad service uses /api/gamification/squads while controller exposes /api/v1/gamification/squads | PARTIAL | Student 2/3 |
| Missing public .NET routes for client next-best-action and upload-quiz calls | PARTIAL | Student 3 next action; Student 2 quiz upload |
| Quiz time passed to rewards is fixed; reward pass threshold differs from configurable assessment threshold | PARTIAL | Student 2/3 |
| Challenge answers are not graded before rewards; reward concurrency/idempotency gaps | PARTIAL | Student 3, Student 2 grading contract |
| Report PDF URL without generated PDF; Communications claims FCM dispatch without API delivery | PARTIAL | Student 1 reporting/delivery; Student 2 message UI |
| Admin AI telemetry uses synthesized numbers, not provider usage; health includes constants | PARTIAL | Student 1 |
| Migration drift (e.g. Course.Term), suppressed pending-model warnings, reset-prone startup demo seeding | PARTIAL | Shared DB/initialization review |
| Hardcoded credential in backend startup; internal-service auth fails open when secret absent | PARTIAL | Shared security; Student 1 coordinates remediation without copying secrets into docs |
| PostgreSQL/Flutter/cross-platform tests absent; some tests only store expected data | PARTIAL | All owners |
| Redis, SignalR, vector retrieval, certificates and offline sync exceed operational evidence | DOCUMENTED ONLY | Retain honest scope; assign only approved future work |
| Balanced three-person historical evidence not established | PARTIAL | Each student records genuine future work; no retroactive attribution |

## 12. Workload and boundary review

Planning estimate only: approximately Student 1 30%, Student 2 35%, Student 3 35% of remaining responsibility scope, with substantial uncertainty. These are not completed-work percentages or historical contributions.

Student 1 needs real governance/reporting and mobile functionality, not only compulsory authentication. Student 2 owns academic content and delivery, including a mobile slice. Student 3 must not absorb every Flutter task merely because the current app serves learners. Reassess effort after issues and acceptance criteria are estimated.

## 13. Legacy Responsibility Documents

Preserve these files unchanged:

- [Previous user/course allocation](../02_MEMBER1_USER_COURSE.md)
- [Previous assessment allocation](../03_MEMBER2_ASSESSMENTS.md)
- [Previous gamification allocation](../04_MEMBER3_GAMIFICATION.md)
- [Previous analytics/validation allocation](../05_MEMBER4_ANALYTICS.md)

They represent the previous four-person allocation. Once the new three-person structure is formally approved, they must not be treated as the current ownership source. For current team planning, use this matrix and individual trackers, with lecturer approval still TO CONFIRM. Historical records must not be rewritten to imply different authorship.

### Reconciliation inventory: identify only, do not edit in this task

- Root `README.md`, `EduFlow_AI_SE3090_FULL_IMPLEMENTATION.md`, `HOW_TO_RUN.md` and `ADR.md`.
- `docs/README.md`, `docs/INDEX.md`, `docs/EduFlow_AI_FULL_IMPLEMENTATION.md`, `docs/ADR.md`.
- `docs/01_ARCHITECTURE.md`, `06_API_CONTRACTS.md`, `07_AI_ORCHESTRATION.md`, `08_DATABASE_ER.md`, `09_GIT_CI_CD_TESTING.md`.
- `docs/10_GAMIFICATION_RULEBOOK.md`, `11_COMPONENT_INTEGRATION_MATRIX.md`, `12_SYSTEM_WORKFLOW.md`, `13_RAG_ARCHITECTURE.md`, `14_QUIZ_PIPELINE.md`, `15_ROLES_AND_PERMISSIONS.md`, `16_MOBILE_APP_GUIDE.md`, `17_SECURITY_AND_PRIVACY.md`.
- `backend/README.md`, `frontend/README.md`, `mobile/README.md`, `ai-agent/README.md`.
- Code ownership labels in agent constructors/topology and any UI ownership descriptions need a later source-code task.
- API diagrams, component/agent counts, permissions, state management, framework versions, implementation-complete claims and contribution sections need reconciliation.
- Official files in `docs/reference/` remain authoritative references, not documents to rewrite to fit the allocation.

## 14. Rules for future coding agents

1. Read this matrix first, then the relevant individual tracker.
2. Verify branch/current source before relying on baseline statuses.
3. Respect method-level boundaries; do not unnecessarily modify another student's ownership.
4. Shared changes require cross-component awareness, compatible contracts and relevant verification.
5. Do not make independent copies of shared auth, entities, grading rules or AI state merely to create ownership.
6. Update tracker statuses after verified work; cite real files, tests and limitations.
7. Never mark work complete merely because a README, test name, UI toast or fallback response claims success.
8. Keep implementation evidence separate from personal authorship. Never fabricate commits, reviews, issues, test results or approval.
9. Preserve lecturer-approval caveats until actual evidence is recorded.
10. Track real AI assistance and preserve each student's responsibility to explain, modify and debug their work.
11. Keep at least four core demonstrable agent roles unless the lecturer confirms an adjustment in writing.
12. Scope future changes to the user's authorization; this restructuring task changes only the four responsibility documents.
