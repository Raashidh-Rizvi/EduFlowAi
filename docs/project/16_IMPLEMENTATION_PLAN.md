# EduFlow AI — Current Implementation Plan

**Document role:** canonical project delivery plan for remaining work. This is not a completion report or a dated sprint commitment. Use the [status summary](17_IMPLEMENTATION_STATUS.md), [responsibility matrix](../responsibilities/RESPONSIBILITY_MATRIX.md) and individual trackers before selecting tasks.

The [original plan](../legacy/plans/ORIGINAL_IMPLEMENTATION_PLAN.md) is preserved for history only. Its four-person allocation assumptions, alternate agent list, .NET 8 reference, mathematical level formula and 12-sprint schedule are not current instructions. The former 10-sprint overview is not a parallel delivery schedule.

## Scope, owners and assignment gate

| Owner | Primary component | AI contribution |
|---|---|---|
| Ahamed M.A. / IT24103352 — Student 1 | System Administration, User & Course Governance, Reporting and AI Safety | Validation/Safety primary; Planner and workflow governance supporting |
| Raashidh M.R. / IT24104191 — Student 2 | Instructor Curriculum, Assessment and AI Content Management | Action/Tool primary; Quiz Generator, Slide Topic and Quiz Evaluator supporting |
| Atheek M.F. / IT24103933 — Student 3 | Student Learning, Progress, Gamification and Adaptive Guidance | Domain Analysis primary; AI Coach, Retention Behaviour and Next Best Action supporting |

Global course/access governance belongs to Student 1; academic course authoring, content, grading, publishing and review belong to Student 2; participation, progress and rewards belong to Student 3. All three contribute React and Flutter slices. Shared identity, DbContext/migrations, gateway, client infrastructure and CI are not exclusive personal components.

**Written group-size approval: TO CONFIRM.** No approved proportional reduction in assignment scope or agent count is recorded. Retain **Planner → Domain Analysis → Action/Tool → Validation/Safety**, with authorized human approval where required.

Mandatory work is determined by the [official specification](../reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md). Each student needs a meaningful full-stack business component, at least four meaningful APIs and a non-CRUD operation, distinct AI contribution, tests, security/integration and genuine contribution evidence. Do not substitute authentication alone for Student 1's business component.

## Six delivery phases

These align with the six phases in all individual trackers. Dependency order matters; test design and evidence collection should happen throughout. No phase is marked complete.

### Phase 1 — Critical correctness and security

| Work | Coordination | Acceptance evidence |
|---|---|---|
| Restrict role assignment and fix suspension/token behavior | Student 1; all API consumers | Negative HTTP tests reject privilege escalation and invalid sessions |
| Enforce own-course, self-only, enrollment and publication checks | Student 2 academic; Student 3 learner; Student 1 policy | Different-user/course requests fail without exposing or mutating data |
| Correct grading-to-reward threshold/timing and challenge grading | Students 2 + 3 | Production submission tests show rewards only for eligible outcomes |
| Prevent replay/concurrent rewards; resolve migration/seed behavior | Student 3 with shared database maintainers | PostgreSQL tests show one reward per source and persistence after restart |
| Close fail-open service authentication and unsafe configuration | Student 1 coordinates; all integrations | Missing/invalid service credentials fail safely; no secrets in committed changes |

Use [security](07_SECURITY_AND_PRIVACY.md), [API contracts](06_API_CONTRACTS.md) and [database design](05_DATABASE_SCHEMA.md) as design references; verify actual source before implementing.

### Phase 2 — Complete full-stack integration

| Work | Coordination | Acceptance evidence |
|---|---|---|
| Complete meaningful governance/reporting and notification/status slice | Student 1 | Authorized API, PostgreSQL data, React flow and real Flutter slice |
| Complete academic curriculum/content/assessment presentation | Student 2 | Persisted authoring/publication consumed through real web/mobile APIs |
| Complete attempts, progress, rewards and learner guidance clients | Student 3 | Server-derived outcomes; API failure never becomes local success |
| Agree shared session, navigation, error and workflow-ID contracts | All three | Cross-client tests use the same identity, data and permissions |

Resolve mission-method and squad-route mismatches, missing public AI routes and simulated Flutter transactions. Acceptance requires database-backed behavior, not a UI toast or declared dependency. See [integration](08_COMPONENT_INTEGRATION.md) and [mobile](13_MOBILE_APPLICATION.md).

### Phase 3 — Agentic AI completion

| Work | Coordination | Acceptance evidence |
|---|---|---|
| Correlate and persist objective, plan, steps, tools, validation, errors and decisions | Student 1 lifecycle; all agent owners | One workflow ID across clients/.NET/Python; recover after restart |
| Ground analysis in authorized learner data | Student 3 | Structured evidence with safe handling of missing or sparse data |
| Execute controlled generation/evaluation tools | Student 2 | Validated tool parameters/results, source grounding and bounded failures |
| Enforce validation and authorized review before protected execution | Student 1 safeguards + Student 2 academic review | Failed validation/unauthorized approval blocks action; repeats are idempotent |
| Return actual decisions/outcomes to the originating learner | All three | Flutter → API → PostgreSQL → AI → React review → persisted mobile status |

Retain distinct Planner, Domain Analysis, Action/Tool and Validation/Safety participation. Do not count a fallback, isolated model response or manually changed status as the completed assessed workflow. See [AI orchestration](09_AI_ORCHESTRATION.md) and [quiz pipeline](11_QUIZ_PIPELINE.md).

### Phase 4 — Testing and reliability

- Exercise production controllers/services, not only manually created expected entities.
- Add real PostgreSQL integrity, migration, concurrency and idempotency coverage.
- Add required Flutter unit/widget/navigation/API coverage and relevant React/API failure tests.
- Evaluate AI contracts, grounding, permitted tools, prompt injection, provider failures, human approval and restart recovery.
- Run the complete cross-platform scenario and required performance checks.
- Record exact command, commit, environment, date, results and limitations. A CI file or named test is not a passing result.

All owners provide evidence for their slice; cross-component tests are shared. Use [Git/testing/CI](15_GIT_TESTING_CI_CD.md).

### Phase 5 — Deployment, documentation and evidence

- Resolve remaining framework/state/deployment decisions explicitly in the [decision register](14_ARCHITECTURE_DECISIONS.md).
- Verify reproducible startup/migrations, secure configuration and deployed API/web/AI connectivity.
- Produce and demonstrate the required mobile build, meaningful device feature and third-party integration under the official specification; record any lecturer clarification.
- Record verified URLs, evaluator access arrangements, APK, database evidence and demonstration material.
- Maintain genuine issues, commits, PRs, reviews, AI-use disclosure and personal reflection; do not manufacture commit counts or historical attribution.
- Update [implementation status](17_IMPLEMENTATION_STATUS.md) from reproducible evidence and link to individual tracker updates.

Use the [run guide](18_RUN_AND_SETUP.md). Documentation edits alone do not establish deployment.

### Phase 6 — Viva readiness

Each student should trace an owned operation through client, controller, service, database, authorization, tests and AI handoff; explain shared dependencies; then perform a small modification/debugging exercise without external AI assistance during evaluation. Record actual rehearsals and remaining weaknesses, not assumed readiness.

## Mandatory work versus optional enhancements

| Classification | Treatment |
|---|---|
| Mandatory | Full-stack integration for all students; PostgreSQL integrity; secure APIs; distinct AI contribution and retained core roles; required approval/state workflow; tests; required mobile/device/third-party work; deployment and genuine evidence |
| Required clarification | Written group-size variation and any proportional scope/agent adjustment; ambiguous integration choices must be checked against official requirements |
| Optional unless explicitly adopted | Redis ranking cache, SignalR live updates, offline sync, certificates, vector-search infrastructure, extra game modes and additional UI polish |
| Architectural choice, not automatic requirement | A specific state library, event bus, deployment vendor or separate DbContexts; justify actual choices rather than copying old blueprint claims |

Vector retrieval may support grounding, but an operational database of authorized course evidence and demonstrable grounding are needed regardless of retrieval technology. Do not let optional infrastructure displace required correctness and integration.

## Progress and handoffs

The plan sequences work; [Student 1](../responsibilities/STUDENT_1_SYSTEM_ADMIN.md), [Student 2](../responsibilities/STUDENT_2_INSTRUCTOR.md) and [Student 3](../responsibilities/STUDENT_3_STUDENT.md) trackers own detailed tasks and viva evidence. The matrix owns ownership boundaries; the status summary owns the project-wide evidence view.

For each task record the actual issue, contract producer/consumer, acceptance criteria, changed source, verification and remaining limits. Re-estimate remaining work from those tasks; no fixed completion percentage or unapproved schedule is asserted here.
