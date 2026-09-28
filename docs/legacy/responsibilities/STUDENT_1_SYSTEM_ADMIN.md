# Student 1 - System Admin Responsibility and Progress

## 1. Student Identity

| Field | Allocation |
|---|---|
| Name | Ahamed M.A. |
| Student ID | IT24103352 |
| Application role | System Admin |
| Primary business component | System Administration, User & Course Governance, Reporting and AI Safety |
| Primary AI contribution | Validation / Safety Agent |
| Supporting AI responsibilities | Coordinator / Planner; workflow lifecycle/governance; approval safety; auditability and observability |

Read [RESPONSIBILITY_MATRIX.md](RESPONSIBILITY_MATRIX.md) first. Baseline: `dev/origin/dev 6f6c203`, 2026-09-19. Statuses come from source inspection, not runtime verification or personal authorship. Group-size approval and any AI-scope adjustment remain **TO CONFIRM**.

## 2. Responsibility Summary

Own platform administration, user/access governance, global course governance, platform reporting and AI safety. This includes meaningful business operations such as policy-controlled account/course actions, auditable workflow transitions and report generation; authentication alone is not the business component.

Course management here means global inventory/access/administrative controls, configuration, reporting and auditing. Student 2 owns academic course creation/content, curriculum, assessments, grading contracts, academic publishing and academic approval. Admin permission to execute an academic operation does not transfer its implementation ownership.

Coordinate shared security and deployment without claiming exclusive credit for `Program.cs`, the entire database, authentication, CI or shared AI infrastructure.

## 3. End-to-End Workflows Owned

| Workflow | Intended end-to-end boundary | Current status |
|---|---|---|
| User directory | Admin React -> protected API -> Users/StudentXp -> filtered view | COMPLETE for narrow listing; not the entire account lifecycle |
| Account/role governance | Authorized admin action -> validation -> persisted change/audit -> session effects -> UI feedback | PARTIAL |
| Global course governance | Platform course inventory/control -> policy checks -> course/audit data -> affected client access | PARTIAL; existing academic APIs are not a separate governance workflow |
| Platform reporting | Authorized scope -> DB aggregation -> report record/artifact -> downloadable UI result | PARTIAL |
| AI safety/lifecycle | Persist objective/plan -> validate -> safe pending state -> authorized decision -> audited outcome/recovery | PARTIAL |
| Governed notifications | Backend announcement/delivery -> mobile inbox -> ownership-checked read state/history | PARTIAL backend; mobile integration NOT IMPLEMENTED |

## 4. Agentic AI Contribution

**Primary:** `ValidationGuardAgent` in `ai-agent/agents/validation_guard.py`.

**Supporting:** `CoordinatorPlannerAgent`, shared workflow lifecycle, approval state machine, trace correlation, durable auditability and observability. All are PARTIAL as integrated capabilities.

| Aspect | Responsibility and current limitation |
|---|---|
| Inputs | Domain objective/context; structured plan; candidate draft; schema/business constraints; reviewer identity and decision. Do not trust caller-supplied student/course identity. |
| Outputs | Validation result/errors/warnings; allowed structured plan; durable status/approval record; auditable outcome or safe failure. |
| Allowed tools | Planner proposes registered actions; guard uses read-only curriculum/rule evidence. Current `get_course_content`/rule paths and registry access must be checked for least privilege and typed parameters. No direct XP, grade or publication mutation by AI. |
| Validation | Schema, workload/reward limits, legitimate content references, unsafe actions, valid transitions and correlation IDs; prevent acceptance when validation failed. |
| Security | Authorized reviewer and resource scope; fail-closed deployed internal-service authentication; secrets protection; prompt/tool-input boundaries; no unknown-workflow placeholder approval. |
| Error handling | Bounded retry/timeouts, durable failures, honest fallback provenance, no fabricated success, restart recovery and idempotent decisions. |
| Workflow participation | Planner -> Student 3 analysis -> Student 2 action -> guard -> Student 2 academic approval -> authoritative backend execution/status. |
| Tests required | Valid and invalid plans; invented/forbidden tool; invalid schema/reward; unauthorized/repeated/out-of-order decisions; failed validation blocks publication; restart/resume; same ID across services; prompt injection; error/redaction cases. |

Existing `MemorySaver` and `ACTIVE_WORKFLOWS` do not provide durable restart recovery. Study-plan output persistence is useful but does not prove the complete shared state can resume. Timing/token constants must not be presented as measured telemetry.

## 5. Backend Responsibilities

Paths below are repository-root relative.

| Actual source | Owned method groups / contracts | Status |
|---|---|---|
| `backend/EduFlow.Api/Controllers/AdminController.cs` | `GetAllUsers`; `ToggleUserStatus`; `ChangeUserRole`; `GetSystemHealth`; `GetAiTelemetry` | Listing COMPLETE; lifecycle/health/telemetry PARTIAL |
| `AuthController.cs`, `AuthService.cs`, `IAuthService.cs` | Shared register/login/refresh/logout/profile contracts; coordinate secure provisioning and account effects | PARTIAL, shared |
| `AnalyticsController.cs` | Platform and audit-log queries; Student 2 owns course-teaching interpretation | PARTIAL |
| `ReportsController.cs` | `GetReports`, `GetReportById`, `GenerateReport`; actual report output and scope | PARTIAL |
| `AiReviewController.cs` | Lifecycle/validation/audit contract; academic review methods co-owned with Student 2 | PARTIAL |
| `NotificationsController.cs` | User notification retrieval, mark-read and announcement lifecycle; Student 2 owns course-message authoring | PARTIAL |
| `InternalAiToolsController.cs`, `Filters/InternalServiceAuthFilter.cs` | Shared read-only AI data boundary and service authorization | PARTIAL |
| `GamificationController.cs` | Governance rules for multiplier/configuration; Student 3 maintains deterministic reward implementation | PARTIAL |
| `Core/DTOs/AuthDtos.cs` | Register/login/refresh/logout/profile DTOs; shared identity contract | PARTIAL |
| Controller-local records | `ChangeRoleRequest`, `GenerateReportRequest`, `BroadcastRequest`, `BroadcastAnnouncementDto`, lifecycle decisions | PARTIAL |
| `Infrastructure/Services/AiGatewayClient.cs` | Shared `IAiGatewayClient` transport, workflow identity and honest failure propagation | PARTIAL |

There is no dedicated AdminService/ReportingService/AnalyticsService abstraction in the audited implementation; much behavior resides in controllers. Separate governance operations should not be claimed before implementation.

## 6. Database Responsibilities

| Entity/table area | Relationship / responsibility | Status |
|---|---|---|
| Users, RefreshTokens | User -> token records; governance of role/activity; shared identity data | PARTIAL |
| Reports | GeneratedById -> User; aggregate summary and actual file lifecycle | PARTIAL |
| AuditLogs | Actor -> User; action/resource/timestamp evidence for platform changes | PARTIAL |
| AiWorkflowLogs, StudyPlans, StudyPlanItems | Plan -> logs/items; reviewer/student/course references; shared lifecycle and academic data | PARTIAL |
| Courses | Platform governance of shared Course records; academic fields remain Student 2 | PARTIAL |
| Announcements, Notifications | Author/optional course and recipient user; delivery/read state | PARTIAL |
| Persistent platform settings/governance policy | No complete entity-backed policy store for Admin controls | NOT IMPLEMENTED |

Coordinate migrations for governance changes with the owning domain. Do not independently own the whole `ApplicationDbContext` or rename shared tables.

Existing migrations: `20260825191012_InitialCreate`, `20260907100901_AddCoursesAndCurriculumTables`, and model snapshot. The latter migration updates seed data; verify operations rather than its name. Model drift, swallowed initialization errors and reset-prone demo seeding remain unresolved. Never certify PostgreSQL behavior from InMemory tests.

## 7. React Responsibilities

- [x] [COMPLETE] Narrow user directory API retrieval and client-side role/search filtering in `frontend/src/pages/Admin/AdminManagement.jsx`.
- [ ] [PARTIAL] Finish role/status management with honest failures, session effects and audit evidence.
- [ ] [PARTIAL] Replace synthesized health/AI telemetry with measured, traceable values or explicitly labelled estimates.
- [ ] [PARTIAL] Persist platform settings instead of component-only `systemConfig`; distinguish policy control from Student 3 reward execution.
- [ ] [PARTIAL] Integrate platform reporting/governance views in `Dashboard.jsx`/`Insights.jsx` and actual downloadable artifacts.
- [ ] [PARTIAL] Replace simulated delivery in `Communications.jsx` with the shared notification contract.
- [ ] [PARTIAL] Coordinate protected routing/navigation with shared `App.jsx`, `Navbar`, `Sidebar`, `RoleSwitcher`, `ThemeContext` and `services/api.js`.

Actual state is hooks, browser storage and theme Context. No implemented Zustand store architecture was established. API helpers include `authService.js`, `insightsService.js`, `aiService.js`; Admin also calls `api` directly.

## 8. Flutter Responsibilities

No Admin-specific or governed notification/status mobile workflow is implemented. The existing app is learner-oriented; own a meaningful mobile governance slice rather than claiming unrelated learner screens.

- [ ] [NOT IMPLEMENTED] Implement backend-driven notification inbox, ownership-checked mark-read and status/history states.
- [ ] [NOT IMPLEMENTED] Implement the governed workflow-status/history slice used by the learner after academic approval.
- [ ] [PARTIAL] Contribute real authentication/session/token integration to the shared Flutter infrastructure; current login is simulated.
- [ ] [NOT IMPLEMENTED] Coordinate a meaningful device feature such as notifications, with actual delivery/evidence rather than a UI message.
- [ ] [NOT IMPLEMENTED] Add widget/navigation/API/security tests for this slice.

Coordinate with Student 3's learner navigation and objective submission; Student 2 owns academic content/review, not Student 1. Shared file `mobile/lib/core/constants/api_constants.dart` is not an implemented HTTP service.

## 9. Security / Authorization Responsibilities

- [ ] [PARTIAL] Restrict public registration to permitted roles; prevent caller-selected privilege escalation.
- [ ] [PARTIAL] Validate role values and define safe privileged account changes and suspended-session/refresh behavior.
- [ ] [PARTIAL] Make global course governance distinct from instructor academic ownership checks.
- [ ] [PARTIAL] Protect platform-only telemetry/audit/configuration operations and enforce report scope.
- [ ] [PARTIAL] Enforce internal-service secrets in deployment; eliminate fail-open configuration.
- [ ] [PARTIAL] Remove and rotate exposed credentials in a later authorized implementation task; never copy their values into evidence documents.
- [ ] [PARTIAL] Bind approval to an existing workflow, valid validation result, authorized reviewer and legitimate state transition.
- [ ] [PARTIAL] Coordinate reward/team authorization with Students 2/3; their endpoint enforcement is not exclusively Student 1's work.

## 10. Testing Responsibilities

Existing source evidence: `UserCourseManagementTests.cs`, `AnalyticsAiReviewTests.cs`; Playwright `02-auth.spec.js`, `06-gamification-and-admin.spec.js`, `10-role-header-switcher.spec.js`; Python validation/state/permission/retry/observability cases in `ai-agent/tests/test_validation.py`.

Some tests persist manually prepared records rather than call production authorization/report/approval APIs. Presence is PARTIAL evidence; no run result is asserted.

- [ ] [NOT IMPLEMENTED] Add HTTP-level privilege/suspension/resource-access regression tests.
- [ ] [PARTIAL] Test real report generation and downloadable output rather than storing a synthetic file URL.
- [ ] [PARTIAL] Test actual workflow validation/approval/rejection/revision and trace correlation through the API.
- [ ] [NOT IMPLEMENTED] Add PostgreSQL-backed governance migration, constraint, audit and transaction tests.
- [ ] [NOT IMPLEMENTED] Add Flutter governance tests and full cross-client acceptance coverage.
- [ ] [PARTIAL] Verify accurate telemetry, fail-safe provider errors, internal token enforcement and redaction.
- [ ] [PARTIAL] Run relevant CI and record real results; a YAML file is not a passing run.

## 11. Integration Responsibilities

Maintain a shared lifecycle contract linking Flutter objective/status, ASP.NET identity, PostgreSQL state, Python graph, and React academic review. Student 2 makes academic decisions; Student 1 enforces lifecycle/safety, and Student 3 supplies learner data and consumes outcomes.

Coordinate user provisioning/session changes with both clients; report-source definitions with Students 2/3; multiplier policy with Student 3; and announcement delivery with Student 2's course audience. Current complete workflow status: PARTIAL.

## 12. Documentation / Git / Evidence Responsibilities

- [ ] [PARTIAL] Maintain this tracker after verified changes; current ownership is not historical authorship.
- [ ] [NOT IMPLEMENTED] Link genuine issues, commits, PRs, reviews and test runs for Ahamed's future governance/safety work.
- [ ] [PARTIAL] Document actual authorization matrix, report metrics, migration/runbook and AI lifecycle contracts.
- [ ] [NOT IMPLEMENTED] Record personal AI-use log/declaration and author the required personal reflection based on actual experience.
- [ ] [PARTIAL] Reconcile legacy documentation only in a separately authorized task; preserve historical attribution.

## 13. Deployment Responsibilities

Coordinate secure configuration, database initialization/migrations, service tokens, API/Swagger health, report storage and AI trace operability. This is shared deployment stewardship, not exclusive credit.

- [ ] [PARTIAL] Make startup migration/seed behavior reproducible and non-destructive to real learner progress.
- [ ] [PARTIAL] Verify deployed API/AI configuration without hardcoded credentials.
- [ ] [NOT IMPLEMENTED] Record verified governance/report/notification deployment evidence and restart recovery.
- [ ] [NOT IMPLEMENTED] Verify this owner's mobile slice in the jointly produced APK.
- [ ] [PARTIAL] Record actual CI results and deployment access; audit did not validate live services.

## 14. Current Implementation Audit

| Responsibility | Status | Audit evidence / remaining limit |
|---|---|---|
| User directory query and React filtering | COMPLETE | Narrow implemented operation; no runtime pass claimed |
| Account/role lifecycle | PARTIAL | API/UI exist; privilege and token gaps |
| Global course governance | PARTIAL | Shared admin access exists; distinct governance controls incomplete |
| Platform reports/analytics | PARTIAL | DB aggregates and records; actual PDF generation absent |
| Health/AI telemetry | PARTIAL | Endpoint/UI with fixed or synthesized measurements |
| Persistent configuration | PARTIAL | UI/static controls; persistent policy store absent |
| AI lifecycle/validation/approval safety | PARTIAL | Guard/graph/log code; durable identity/recovery/enforcement gaps |
| Notification lifecycle | PARTIAL | Read/store API; client delivery missing |
| Flutter governance integration | NOT IMPLEMENTED | No operational owner slice |
| Account deletion/admin password reset | DOCUMENTED ONLY | Permission document exceeds implementation |
| Security, tests and cross-role integration | PARTIAL | Existing foundations, material gaps above |
| Personal Git/deployment/viva evidence | NOT IMPLEMENTED | Placeholders only; no attribution or results invented |

## 15. Phased Remaining-Work Roadmap

### Phase 1 - Critical correctness and security

- [ ] [PARTIAL] Secure registration/roles, session effects and platform endpoints.
- [ ] [PARTIAL] Replace fabricated validation success and reject unknown/unauthorized workflow decisions.
- [ ] [PARTIAL] Coordinate credential removal/rotation, internal auth and safe initialization.
- [ ] [PARTIAL] Define course governance actions without duplicating Student 2 academic operations.

### Phase 2 - Complete full-stack integration

- [ ] [PARTIAL] Finish persisted governance/report/configuration APIs and React consumers.
- [ ] [PARTIAL] Implement actual report artifacts and announcement delivery contract.
- [ ] [NOT IMPLEMENTED] Deliver Flutter notification/status/history slice and shared secure session integration.

### Phase 3 - Agentic AI completion

- [ ] [PARTIAL] Persist one canonical workflow ID and durable plan/steps/results/errors/approval/outcome.
- [ ] [PARTIAL] Make planner delegation, validation, authorized approval and recovery work across all agents.
- [ ] [PARTIAL] Replace synthetic telemetry with honest execution measurements and fallback provenance.

### Phase 4 - Testing and reliability

- [ ] [PARTIAL] Exercise production endpoints/validators rather than manually setting expected states.
- [ ] [NOT IMPLEMENTED] Add PostgreSQL, Flutter, restart/idempotency and full acceptance tests.
- [ ] [NOT IMPLEMENTED] Collect security/failure/performance evidence with Students 2/3.

### Phase 5 - Deployment/documentation/evidence

- [ ] [PARTIAL] Verify configuration, migrations, CI, report storage and deployment runbook.
- [ ] [NOT IMPLEMENTED] Record genuine personal PR/commit/test/deployment/AI-use evidence.
- [ ] [PARTIAL] Reconcile approved ownership docs later and record lecturer confirmation only when supplied.

### Phase 6 - Viva readiness

- [ ] [NOT IMPLEMENTED] Rehearse governance, report and four-agent safety flow from source to database to both clients.
- [ ] [NOT IMPLEMENTED] Explain fixed measurements/fallbacks and demonstrate corrected failure paths.
- [ ] [NOT IMPLEMENTED] Perform the exercises below without external AI during evaluation.

## 16. Viva Preparation Map

### Important source files

- [AdminController](../../backend/EduFlow.Api/Controllers/AdminController.cs)
- [ReportsController](../../backend/EduFlow.Api/Controllers/ReportsController.cs)
- [AuthService](../../backend/EduFlow.Infrastructure/Services/AuthService.cs)
- [AiReviewController](../../backend/EduFlow.Api/Controllers/AiReviewController.cs)
- [ApplicationDbContext](../../backend/EduFlow.Infrastructure/Data/ApplicationDbContext.cs)
- [AdminManagement](../../frontend/src/pages/Admin/AdminManagement.jsx)
- [Validation guard](../../ai-agent/agents/validation_guard.py)
- [Planner](../../ai-agent/agents/planner.py)
- [Workflow graph](../../ai-agent/graph/workflow.py)
- `NotificationsController.cs`, `InternalServiceAuthFilter.cs`, `core/internal_auth.py`, `graph/approval_state_machine.py`, `core/observability.py`.

### Important API endpoints

Current routes to trace, not a claim all are complete:

- `GET /api/admin/users`
- `POST /api/admin/users/{id}/toggle-status`
- `POST /api/admin/users/{id}/change-role`
- `GET /api/admin/system-health`, `GET /api/admin/ai-telemetry`
- `GET/POST /api/reports`, `GET /api/reports/{id}`
- `GET /api/analytics/platform`, `GET /api/analytics/audit-logs`
- `POST /api/aireview/proposals/{id}/decision` (shared academic/lifecycle boundary)
- `GET /api/notifications/user`, `POST /api/notifications/{id}/read`

### Database, clients and AI demonstration

Explain User-to-token, report-to-generator, log-to-plan, notification-to-user and shared Course relationships. Trace Admin directory and role changes; distinguish platform controls from Instructor publishing. Demonstrate the future Flutter notification/status slice only once operational. Explain each validator input/output, planner action permissions, persisted state, authorized approval and failure recovery.

### Known current limitations

No complete mobile governance flow; synthetic telemetry; no generated report PDF; incomplete workflow correlation/durability and authorization; missing persistent settings; shared initialization/migration risks. Do not describe these as completed.

### Likely technical viva questions

1. Why is Admin course governance different from academic publishing?
2. How does a JWT role differ from resource ownership, and what happens after suspension?
3. Why does an in-memory checkpoint fail after restart?
4. How do you prove a decision applies to the same workflow that was validated?
5. Why must validation remain deterministic, and where can acceptance bypass it?
6. What makes your AI contribution distinct from Student 2's content generation?
7. What do your report/telemetry numbers actually measure?
8. Which tests execute production API behavior and which only persist records?

### Small modification/debugging exercises

- Add a validated directory filter and test the query behavior.
- Reject an invalid role value without changing the user.
- Make a report download return an actual verified artifact.
- Block approval after validation failure and explain the state transition.
- Trace an unauthorized notification mark-read request.
- Identify and repair a workflow-ID mismatch without silently creating placeholder state.

## 17. Evidence Placeholders

Commit: TO RECORD - genuine hash and scope.
PR: TO RECORD - actual link and review.
Issue: TO RECORD - actual task and acceptance criteria.
Tests: TO RECORD - commands, date, environment, results and limitations.
Screenshots: TO RECORD - actual UI/API/DB evidence; no mock presented as integration.
AI usage log: TO RECORD - actual assistance, decisions and personal reflection.
Deployment: TO RECORD - verified URLs/APK slice and startup checks.
Lecturer approval: TO CONFIRM - no written evidence supplied.

## 18. Progress Summary

| Category | Evidence level | Interpretation |
|---|---|---|
| Backend | Moderate | Narrow directory implemented; governance/report APIs incomplete |
| Database | Moderate | Entities/migrations present; integrity/lifecycle/reproducibility gaps |
| React | Moderate | Admin view and API actions; settings/telemetry limitations |
| Flutter | Missing | Governed owner slice not integrated |
| Agentic AI | Moderate | Guard/planner/state foundations; complete assessed safety flow unfinished |
| Security | Early | Declared policies with material enforcement gaps |
| Testing | Early | Existing test source; production-boundary coverage and run evidence missing |
| Integration | Early | Cross-service identity and mobile loop incomplete |
| Documentation/Deployment | Early | Working tracker created; personal/deployment evidence still to record |

## 19. Progress Update Rules

Use stable audit rows and roadmap checkboxes to record real implementation, not intended behavior. After work, record exact changed methods/contracts, verification command/result, remaining limitations and genuine evidence links. Shared changes must mention affected students. Do not mark the whole component complete from a narrow source check, fabricate history, or claim lecturer approval.
