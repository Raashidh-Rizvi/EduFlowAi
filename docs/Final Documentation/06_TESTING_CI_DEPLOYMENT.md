# Phase 6 — Testing, Evaluation, Performance, CI/CD and Deployment

Prepared 2026-10-01. Repository root: `C:/Users/WAZNI/Desktop/SLIIT/PROJECTS/Y3/Y3-S1/SEF/PROJECTS/EduFlowAi/EduFlowAi`.

## 1 Scope

**No test suite or build was executed in this phase.** Shell process creation failed with Windows access denied; a direct .NET version probe also failed with `spawn EPERM`. These are execution-environment blockers, not test failures. Read-only localhost probes were performed and returned connection refused. No dependencies were installed, services launched, database migrations run, project PDFs indexed, Chroma stores changed, paid providers called or application files modified.

Inspected only the requested test directories, workflow, package/project test configuration, setup/deployment documentation, existing narrow result artifacts, and the small backend startup boundary needed to assess deployment/startup risk. Reused [Phase 0 requirements](00_REQUIREMENTS_AND_REPORT_MAP.md), [Phase 1 evidence plan](01_CURRENT_SCOPE_AND_EVIDENCE_PLAN.md), [Phase 2 backend evidence](02_BACKEND_DATABASE_SECURITY.md), [Phase 3 React evidence](03_REACT_WEB.md) and [Phase 5 AI evidence](05_AGENTIC_AI_RAG.md). No Git history, legacy contents, full Flutter audit, repository-wide source audit or remote CI investigation was performed. Existing links into legacy documentation were not followed.

| Classification | Use here |
|---|---|
| VERIFIED EXECUTED | An operation actually executed in this phase; only bounded read-only availability probes qualify, and they failed to connect. |
| HISTORICAL EXECUTED EVIDENCE | Dated prior results explicitly attributed to their record; not a fresh result or a whole-suite certification. |
| TEST SOURCE EXISTS / NOT EXECUTED | Source inspected, but no current test outcome established. |
| PARTIAL | Evidence supports only a subset or lacks required provenance/integration. |
| NOT FOUND / UNVERIFIED | No supporting artifact in the bounded inspected locations, or runtime evidence unavailable. |

Absence findings are bounded, not assertions that no artifact exists anywhere. File timestamps are supporting metadata, not proof of source revision or successful execution. No confidential configuration values or test passwords are reproduced.

## 2 Test Command Inventory

Commands are instructions/inspection findings unless explicitly marked executed. No automatic install or restore was permitted. Generated test/build output is a filesystem mutation even when isolated from business data.

| Command and working directory | Scope / dependencies | Mutation and external-service risk | Phase 6 decision |
|---|---|---|---|
| `dotnet test backend/EduFlow.Tests/EduFlow.Tests.csproj -c Release --filter FullyQualifiedName~LearningAgentGatewayTests --no-restore --nologo` from root | Historical focused gateway command; .NET SDK/runtime and restored packages | Builds bin/obj; stub HTTP handler, no real AI call in this subset | Candidate isolated subset; BLOCKED by process launch, not run |
| `dotnet test backend/EduFlow.Tests/EduFlow.Tests.csproj -c Release --no-build --no-restore --filter FullyQualifiedName~LearningAgentGatewayTests` from root | Narrower no-build candidate; requires a known matching existing Release assembly | Avoids rebuild; stale assembly would not verify current source | Not run; assembly provenance not established |
| `dotnet test backend/EduFlow.slnx --no-build --configuration Release --verbosity normal` from root | CI backend command; solution includes tests | Full suite may activate PostgreSQL tests through opt-in environment variables; several tests start local test hosts | Not run; full suite not assumed isolated |
| `python -B -m pytest tests/test_learning_agent.py -q -p no:cacheprovider` from ai-agent, using existing venv interpreter | Safe candidate adapted from dated command; pytest, Chroma, FastAPI/httpx and provider SDK imports | Ephemeral Chroma fixture, synthetic chunks, mocked generation; no project-PDF indexing. Existing dependencies required; telemetry/network isolation still appropriate | Not run: process creation blocked; no persistent-store mutation attempted |
| `python -m pytest tests/test_simple_rag.py -v` from ai-agent | RAG/API tests | Imports real app singleton; can initialize current Chroma, index fixture data and call configured providers | **Do not run without redesigned/verified isolated environment** |
| `pytest tests/ -v` and `pytest tests/test_phase4_reliability.py -v` from ai-agent | Actual CI commands | Full suite includes unsafe integration paths and stale missing-core imports | Not run; not a verified golden evaluation |
| `npm run test:e2e -- e2e/12-learning-agent.spec.js --reporter=list` from frontend | Four mocked Playwright UI tests; installed Node packages/browser, running Vite | Writes screenshots/results; API routes mocked, including catch-all failures | Not run; process launch blocked and UI unavailable |
| `npx playwright test e2e/13-learning-agent-live.spec.js e2e/14-learning-breakdown-live.spec.js --reporter=list` from frontend, with EDUFLOW_LIVE_TESTS=1 | Live focused tests; existing accounts, UI/API/AI/index/providers | Login/session changes, provider calls, breakdown metadata writes; not read-only | Not run; prohibited/current services unavailable. Do not let npx install missing packages |
| `npm run test:e2e` from frontend | All 14 specs | Includes course/account/enrollment/review writes, cleanup and AI operations | Not run against current database |
| `flutter test --no-pub` from mobile | Candidate using already installed Flutter/dependencies | Generated tooling/test cache; service-labelled tests use local values, but whole suite has stale widget test | Not run; execution blocked, Flutter availability not established |
| `dotnet build backend/EduFlow.slnx --no-restore` | Backend build | Writes build output; no application startup intended | Not run |
| `npm --prefix frontend run build` | Vite production build | Writes dist; installed dependencies required | Not run |
| `npm run build:agent` | Root script: compileall on models, rag and main.py | Writes bytecode; does not exercise providers or include agents/tools/tests in its explicit target list | Not run; syntax compilation is not testing |
| `flutter build apk --release --no-pub` from mobile | Candidate artifact build, not a proven working project command | Requires Android toolchain/scaffold/dependencies/signing as applicable; writes build output | Not run; APK/scaffold evidence incomplete |

Sources: [root scripts](../../package.json), [frontend scripts](../../frontend/package.json), [test project](../../backend/EduFlow.Tests/EduFlow.Tests.csproj), [Playwright config](../../frontend/playwright.config.js), [mobile pubspec](../../mobile/pubspec.yaml), [current setup](../current/LOCAL_SETUP_GUIDE.md).

Do not run `npm run dev` just to test readiness: backend startup invokes database initialization, and AI import initializes the vector service. `dotnet ef database update`, `setup_check.py` and `check_rag.py` are explicitly outside safe read-only verification. Restore/install commands documented in setup are prerequisites for an authorized setup session, not commands run here.

## 3 Backend Testing

[EduFlow.Tests](../../backend/EduFlow.Tests/EduFlow.Tests.csproj) targets net8.0 and references xUnit, FluentAssertions, Moq, EF InMemory, the .NET test SDK and coverlet collector. Repository [global.json](../../global.json) selects SDK 10.0.401; [Directory.Build.props](../../backend/Directory.Build.props) enables LatestMajor runtime roll-forward. Installed SDK/runtime availability could not be established because executable launch failed.

25 C# test files were inspected. Counts below are **source method declarations**, not discovered/executed case counts; theories can expand into multiple cases and custom facts are listed separately.

| File | Ordinary Fact/Theory declarations | Opt-in PostgreSQL declarations | Scope / limit |
|---|---:|---:|---|
| AdminAuditLogTests.cs | 23 | 0 | Audit retrieval/authorization and InMemory-backed host/controller behavior |
| AdminPlatformSummaryTests.cs | 6 | 0 | Platform summary and scoping |
| AnalyticsAiReviewTests.cs | 10 | 0 | Analytics/review entities and calculations; InMemory, not real Python approval |
| AssessmentQuizTests.cs | 4 | 0 | Assessment/scoring service behavior |
| AuthSessionRbacTests.cs | 14 | 0 | Auth/session/role behavior in test application |
| EnrollmentLifecycleTests.cs | 23 | 0 | Enrollment lifecycle and authorization |
| GamificationServiceTests.cs | 7 | 0 | Reward/gamification service behavior |
| GovernanceAuditIntegrationTests.cs | 9 | 5 | InMemory or opt-in PostgreSQL audit, atomicity/retry/concurrency tests |
| InstructorDashboardScopingTests.cs | 18 | 0 | Instructor-specific dashboard data |
| InstructorOwnershipTests.cs | 14 | 0 | Ownership decisions with InMemory |
| InstructorProfilesAndReviewsTests.cs | 43 | 0 | Profiles, review eligibility and roles |
| LearningAgentGatewayTests.cs | 8 | 0 | Stubbed gateway HTTP/identity/response/error contracts; theories expand |
| MandatoryScenarioTests.cs | 10 | 0 | InMemory-backed business scenario; not mobile/AI acceptance |
| MarketplaceDiscoveryTests.cs | 6 | 0 | Discovery/publication/preview/search |
| Phase1SecurityTests.cs | 35 | 0 | Ownership, quiz publication/feedback and validation patterns; some local assertions |
| Phase2FullStackIntegrationTests.cs | 19 | 0 | InMemory entity/query scenarios, not full deployed stack |
| Phase4_AuthorizationTests.cs | 12 | 0 | Ownership/role scenarios |
| Phase4_ContractTests.cs | 9 | 0 | Assessment/reward/entity relationships; not cross-platform E2E |
| Phase4_CurriculumTests.cs | 17 | 0 | InMemory curriculum CRUD/hierarchy |
| Phase4_DatabaseIntegrationTests.cs | 19 | 0 | **EF InMemory** relationship/seed/hierarchy checks |
| Phase4_GradingTests.cs | 30 | 0 | Grading service, thresholds and answer forms |
| QuizPublicationTests.cs | 19 | 0 | Publication/status/reward validation patterns |
| SupportDeskTests.cs | 17 | 0 | Support host/service authorization, replay, version/state behavior; host accepts optional PostgreSQL connection |
| UnitTest1.cs | 1 | 0 | Empty placeholder assertion-free test; not meaningful coverage |
| UserCourseManagementTests.cs | 39 | 1 | User/course/auth/ownership tests plus explicit PostgreSQL delete regression |

All above: **TEST SOURCE EXISTS / NOT EXECUTED** in Phase 6. Names such as “FullStack,” “EndToEnd,” or “FK Enforced” do not establish the provider, actual HTTP chain or meaningful negative assertion. Controller/service tests, local test hosts and entity-manipulation tests must be described according to what they actually exercise. No coverage percentage is available merely because coverlet is referenced.

### Current execution record

| Command/probe | Date/environment | Passed / failed / skipped | Blocked / duration |
|---|---|---|---|
| Shell availability (`Get-Location`; then command discovery) | 2026-10-01, Windows workspace | N/A; no test process | CreateProcessAsUserW access denied; runner failed before commands executed |
| Direct .NET `--version` probe | Same date, shell-free executable probe | N/A; no SDK result | spawn EPERM |
| Focused gateway test command | Candidate only; **not submitted after launch blockers** | N/A / N/A / N/A | No test execution; duration unavailable |
| Full backend suite | Not executed | N/A / N/A / N/A | Unsafe to assume database isolation; environment launcher blocked |

Do not report zero failed as a passing outcome. No backend TRX/result file was found in the inspected `backend/EduFlow.Tests/TestResults/` directory; it was empty.

### Historical result

[Learning Agent test record](../members/member-1-wazni/ai/LEARNING_AGENT_TEST_EVIDENCE.md), observed **2026-09-28**, records **12 passed** for the focused LearningAgentGatewayTests command in §2. Environment: Windows/PowerShell and local service setup; recorded baseline plus working-tree extension. Classification: **HISTORICAL EXECUTED EVIDENCE**. Failure/skip counts and duration are not supplied there. This is not evidence that all 25 test files currently pass.

## 4 Database Testing

**Real PostgreSQL tests executed this phase: NO.** Real PostgreSQL test source exists; it is distinct from the misleadingly named InMemory database test file.

| Evidence | Actual provider / behavior | Status / safety decision |
|---|---|---|
| [Phase4_DatabaseIntegrationTests.cs](../../backend/EduFlow.Tests/Phase4_DatabaseIntegrationTests.cs) | UseInMemoryDatabase with EnsureCreated; checks navigation, cascading tracked data, seed and entity behavior | TEST SOURCE EXISTS / NOT EXECUTED. Does not prove PostgreSQL FK enforcement, SQL translation, transactions, locks, migrations or indexes |
| [GovernanceAuditIntegrationTests.cs](../../backend/EduFlow.Tests/GovernanceAuditIntegrationTests.cs) ordinary cases | Defaults to unique InMemory database; switches to PostgreSQL if EDUFLOW_AUDIT_TEST_POSTGRES is set | Environment-sensitive; blanket suite execution is not guaranteed harmless |
| Five custom AuditPostgresFact cases | Opt-in rollback, retry, lost commit acknowledgement, concurrent decision and support-event tests | BLOCKED/not run; source requires disposable loopback cluster and a specific sentinel database name |
| Same file's NewPostgresDb | Enforces loopback host and sentinel `eduflow_audit_regression`; replaces database name with a random test name and calls EnsureCreated | **Creates databases/schema**; no disposable cluster was provisioned or authorized here |
| [UserCourseManagementTests.cs](../../backend/EduFlow.Tests/UserCourseManagementTests.cs) PostgreSqlDeleteFact | EDUFLOW_DELETE_POSTGRES_CONNECTION; uses existing database/admin, creates/deletes disposable account and auxiliary rows | BLOCKED/not run; mutates an existing database even though source limits intended records and avoids migrations |
| [SupportDeskTests.cs](../../backend/EduFlow.Tests/SupportDeskTests.cs) host constructor | Optional PostgreSQL branch available | Constructor option alone is not an executed PostgreSQL test |
| CI postgres:16 service | Throwaway database service and generic ConnectionStrings__DefaultConnection | Does not supply either opt-in test variable; service existence does not demonstrate those PostgreSQL cases ran |

The opt-in attributes mark tests skipped when their variables are absent; this is expected source behavior, **not observed skip totals**. Values were neither displayed nor used. No migrations, schema creation, database cleanup or destructive commands ran.

## 5 React Testing

All **14 known Playwright spec files** were read. There is no separate React unit-test or lint script in the inspected frontend package. Current [Playwright configuration](../../frontend/playwright.config.js): localhost:2174, Chromium, one worker, no retries, 45-second default test timeout, screenshots on and HTML/list reporters. Trace collection is set to on-first-retry while retries=0; this does not promise a trace for ordinary failures. No automatic webServer startup is configured.

| Spec | Test declarations | Category / coverage | Evidence limit |
|---|---:|---|---|
| 01-landing.spec.js | 2 | UI-only landing/navigation smoke | Not backend acceptance |
| 02-auth.spec.js | 4 | Demo-persona/login/logout UI integration | Needs running backend/session; no current execution |
| 03-instructor-ai-review.spec.js | 2 | Review UI/orchestration/approve interactions | UI text success cannot prove persisted Python decision; Phase 5 missing links |
| 04-courses.spec.js | 1 | Curriculum/course UI exploration | Not exhaustive CRUD/persistence verification |
| 05-student-portal.spec.js | 5 | Dashboard/reward/coach/focus/quiz exploration | Can invoke AI and writes; local reward/focus display not authoritative persistence |
| 06-gamification-and-admin.spec.js | 3 | Role/admin/gamification views | UI assertions, not measured telemetry |
| 08-assessments.spec.js | 2 | Assessments and generation modal | Modal existence not distinct quiz-agent evidence |
| 09-courses-slidequest.spec.js | 1 | SlideQuest generate/approve/run | Can mutate/invoke service; fallback/local state limits apply |
| 10-role-header-switcher.spec.js | 1 | Role-switch navigation | Does not alone prove server authorization |
| 11-instructor-full-flow.spec.js | 12 | Instructor navigation and course/module interactions | Some conditional/exploratory paths; not complete mobile→AI flow |
| 12-learning-agent.spec.js | 4 | **Mocked API** chat, breakdown, plans, citations, error/retry/fallback UI | Catch-all API interception isolates backend; cannot prove real provider/database |
| 13-learning-agent-live.spec.js | 1 | **Live, opt-in** chat/follow-ups through ASP.NET | EDUFLOW_LIVE_TESTS=1; requires accounts/services/index/provider; current run not attempted |
| 14-learning-breakdown-live.spec.js | 1 | **Live, opt-in** breakdown/topic plan/explanation | Can write Chroma section cache and call provider; not safe read-only |
| 15-lms-integration.spec.js | 11 | Serial LMS account/course/ownership/enrollment/review/session scenario | Provisions and cleans up business data; genuine intended live business coverage, no Flutter/complete AI workflow |

Total: 50 source test declarations, **not 50 passes**. See [e2e directory](../../frontend/e2e).

Historical record: **4 mocked Learning UI tests passed**, plus **2 live Learning tests passed** on 2026-09-28. That live record describes React→authenticated ASP.NET→Python→existing Chroma/provider and no direct browser port-8000 requests. It does not prove current full-LMS execution or durable approval.

Existing `frontend/test-results/.last-run.json` says `status=passed` with no failed IDs; its filesystem modification time is 2026-09-28T16:17:32.802Z. Four adjacent screenshot files are named for spec 12, with nearby timestamps. These corroborate limited historical artifact availability; the JSON has no command, revision, count or detailed duration, and screenshot contents were not independently re-evaluated here. No live-suite raw report or current comprehensive report was established.

**Current execution: NO.** Browser processes cannot be launched through the available execution path; the Vite localhost probe was refused. Live/full-LMS tests additionally require writes/provider access not authorized for the current system.

## 6 Flutter Test Evidence

Only mobile test/config/setup evidence was inspected; the full Flutter implementation remains Phase 4.

| File | Type / source count | Actual scope | Execution/result |
|---|---|---|---|
| [services/api_service_test.dart](../../mobile/test/services/api_service_test.dart) | 17 local unit-style declarations | Literal URL checks, regex/email/list/map/scoring and copied logic; imports flutter_test, **does not import ApiService** | TEST SOURCE EXISTS / NOT EXECUTED; cannot prove real HTTP/auth service |
| [services/journey_service_test.dart](../../mobile/test/services/journey_service_test.dart) | 12 local unit-style declarations | Hand-built module/topic fixtures, copied transformation, timer and score/reward expressions; **does not import JourneyService** | TEST SOURCE EXISTS / NOT EXECUTED; not production-service coverage |
| [widget_test.dart](../../mobile/test/widget_test.dart) | 1 widget smoke declaration | Default counter test imports `package:mobile/main.dart` and constructs MyApp | Stale/incompatible with declared package name `eduflow_mobile`; no compile result claimed |

Total: 30 declarations, not executed cases or passes. The wrong package import is a direct source mismatch; no application audit is needed to establish it. No Flutter integration_test/device run, real mobile HTTP interaction or APK runtime result was found in the scoped evidence. The Flutter SDK/dependencies were not installed or verified.

## 7 End-to-End Evidence

**Required complete chain: NOT VERIFIED.** Component-level evidence is **PARTIAL** and cannot be combined into a purported full run.

| Link | Available evidence | Missing |
|---|---|---|
| Flutter initiates objective → ASP.NET | Mobile test source uses local values; no executed mobile request evidence | Real initiating device/user/request |
| ASP.NET → PostgreSQL | Source integration; opt-in PostgreSQL tests unexecuted | Actual correlated persisted objective and state |
| ASP.NET → Agentic AI | Historical focused Learning round trip | Complete current execution plan/delegation workflow |
| AI → React authorized review | Backend/UI pieces from Phases 2–3 | Current Python pause/action/workflow ID and verified review correlation |
| Review → persisted status | Separate backend business/review mechanisms | Same AI workflow's authorized decision persisted and enforced |
| Outcome → initiating mobile user | No complete evidence | Same ID/user/result delivered back to Flutter |

The full-LMS Playwright scenario can test business enrollment/reviews, not the complete assessed Agentic chain. Backend test names containing “EndToEnd” do not include a real mobile client. Phase 5 establishes absent Python orchestration/decision endpoints, so this is an implementation blocker as well as an execution-evidence gap.

## 8 Agentic AI Evaluation

[Phase 5](05_AGENTIC_AI_RAG.md) is the current implementation authority for this assessment: one LearningAgent, fixed tools, RAG and selected deterministic validation; no distinct Quiz Generator Agent, structured agent execution planner/delegation or fully correlated durable approval workflow.

### Python test evidence and execution safety

| File | Scope and isolation | Available result / decision |
|---|---|---|
| [test_learning_agent.py](../../ai-agent/tests/test_learning_agent.py) | Ephemeral Chroma with deterministic embeddings and synthetic in-memory chunks; mocked LLM; patches SimpleRagService before importing main and replaces app singleton. Covers schemas, page coverage/cache, scope, plans, citations, errors, STM and mocked providers | **HISTORICAL EXECUTED EVIDENCE: 32 passed on 2026-09-28**. Current source exists; no rerun because executable launch is blocked. Source function count differs from expanded parametrized case count |
| [test_simple_rag.py](../../ai-agent/tests/test_simple_rag.py) | Imports main globally; test stores/provider selection not consistently isolated; disk fixture indexing and configured-provider calls possible | TEST SOURCE EXISTS / NOT EXECUTED. Current persistent index/provider safety cannot be guaranteed; excluded |
| [test_phase4_reliability.py](../../ai-agent/tests/test_phase4_reliability.py) | Imports removed core.errors/core.retry/core.observability; transition tests use a local dictionary rather than current production workflow | Stale/incompatible; not executed. Current-tree collection is expected to fail missing imports, but no fresh failure output exists |

Exact current executed subset: **none**. Passed/failed/skipped/duration: **not available**, not zero. Historical record does not supply a complete current test report. Real providers were not called in this phase. Mocked fallback tests and historical live Learning observations must remain separate.

### Official golden-case mapping

| Required golden-case area | Evidence available | Current assessment / claim boundary |
|---|---|---|
| Domain objective | Learning question/topic and separate backend goal fields | PARTIAL domain tutoring; not one complete assessed objective |
| Structured execution planning | Student study schedule only | **Cannot pass current requirement: execution planner absent** |
| Distinct-agent delegation | One LearningAgent calls tools | **Cannot pass: no distinct-role delegation or second implemented agent** |
| Controlled tools / selection | Fixed three-tool dispatch; focused test source | PARTIAL; service-level identity/permissions still incomplete |
| Structured outputs | Learning Pydantic/JSON output tests, historical focused pass | Supported for Learning subset, not whole workflow |
| Deterministic validation | Page coverage/ranges, selection IDs, schedule schema/duration checks | Supported subset; no complete durable validation record |
| Business rules | Source/section constraints; backend ownership/quiz business test source | PARTIAL; current workflow-wide enforcement not demonstrated |
| Human approval | Backend review/API and partial React path | **Cannot pass complete chain: Python pause/decision/resume correlation absent** |
| Prompt-injection resistance | Grounding instructions; no complete adversarial golden suite found | NOT VERIFIED; prompts alone are insufficient |
| Failure recovery | Mocked provider fallback and malformed JSON/error tests | PARTIAL; no durable restart/resume workflow recovery |
| Safe failure | Learning error responses; provider fallback labels | PARTIAL; no complete safely recorded workflow failure and some synthetic-success fallbacks |
| Auditable outcome/state | Disconnected PostgreSQL fields, Chroma metadata and local STM | **Cannot pass complete requirement: unified durable workflow ledger absent** |

**Official AI golden workflow verified: NO.** Running the existing focused suites successfully cannot supply missing planning/delegation/state/approval implementation. There is no defensible claim that a job named “Agent Golden Evaluation Tests” implements the official acceptance case.

Future evaluation must use deterministic assertions and a traced golden case, plus human review where needed; LLM-as-judge cannot be the sole method. Retain exact inputs, expected rules, observed output, real identifiers, timestamp, environment/model and final outcome. No evaluation score, hallucination rate, injection-resistance result or success percentage was invented.

## 9 Performance Evidence

**Real performance evidence: PARTIAL — historical single-operation observations only; no genuine load benchmark found in the bounded evidence.** Test runtimes, waits/timeouts, concurrency correctness tests and synthetic dashboards are not interchangeable with application performance measurements.

| Metric | Available evidence | Classification / limitation |
|---|---|---|
| Concurrent request throughput | No benchmark harness/result found in inspected test/config/current evidence | NOT MEASURED. Governance concurrent decisions and MandatoryScenario parallel enrollments test correctness, not throughput |
| API response-time distribution | No repeated sample set, percentiles or load profile | NOT MEASURED |
| Success/failure rate under load | No request count/window/concurrency/error result | NOT MEASURED |
| Database response time | No measured SQL latency/transaction benchmark | NOT MEASURED; InMemory tests do not provide PostgreSQL performance |
| Fresh Learning breakdown | 6.02 s in dated member diagnostic | HISTORICAL reported measurement; one observation, not SLA |
| Cached frontend breakdown | 0.055 s in dated continuation | HISTORICAL reported measurement; cache path distinct from generation |
| Selected-section plan | 3.227 s | HISTORICAL reported measurement; no current replication |
| Selected subtopic explanation | 7.082 s | HISTORICAL reported measurement; no statistical distribution |
| AI dashboard/review durations and confidence | Phase 5 identifies fixed duration 380 ms, synthetic telemetry and constant values | HARDCODED / SYNTHETIC — excluded from performance evidence |

Source for the four timing observations: [2026-09-28 Learning evidence](../members/member-1-wazni/ai/LEARNING_AGENT_TEST_EVIDENCE.md). It records Windows/local services, a named existing lecture and provider context, but no full raw benchmark log, concurrency profile, resource measurements or independent reproduction here.

For G9, label these as exploratory observations. A later authorized isolated benchmark must record hardware/deployment, database size, route/scenario, concurrency, warm/cold cache, duration/request count, success/failure counts, latency distribution and AI/provider timings. Do not load-test an existing database or paid provider under this phase's authorization.

## 10 CI/CD

Actual source: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), the only workflow in the inspected directory.

**Mandatory backend CI found: YES at configuration level.** It triggers on push and pull_request for main (also dev), restores/builds/tests the solution and includes the test project. **CI passing: NOT VERIFIED.** No actual GitHub run URL, job log, completed status, branch protection or uploaded run artifact was established. No Git history or remote workflow was accessed.

| Job | Actual steps / configuration | Limits and concerns |
|---|---|---|
| backend-ci | ubuntu-latest; postgres:16 service; checkout v4; setup-dotnet v4 with 10.0.x; `dotnet restore backend/EduFlow.slnx`; Release build --no-restore; Release test --no-build | Meets mandatory command/trigger structure. Generic database config does not enable opt-in real-PostgreSQL tests. Exact pinned SDK 10.0.401 versus floating setup version remains a runner compatibility point to verify; project targets net8.0 and LatestMajor runtime roll-forward is configured |
| frontend-ci | Node 18; npm ci; npm run build | Step name says “Lint & Build” but command only builds. No lint or Playwright execution |
| flutter-ci | Java 17; Flutter 3.19.x; flutter pub get; flutter test | No flutter analyze or APK build/upload. Stale widget package import is an evident source blocker; full CI result unverified |
| ai-agent-ci | Python 3.11; pip upgrade/install requirements; pytest tests/ -v; then reliability file again | “LangGraph” job label contradicts current source/dependencies. Broad suite includes missing-core test and nonisolated RAG initialization; golden-case label is not acceptance evidence |
| Deployment | No deployment job | No continuous-deployment result or artifact publishing |
| Artifacts | No explicit test-result/coverage/APK upload steps | Passing/failing console logs would require an actual run; local source cannot supply them |

Configuration names in backend CI: `ConnectionStrings__DefaultConnection`, `JwtSettings__Secret`, `AiService__ApiKey`; PostgreSQL service also sets its password/database variables. Source labels these CI-only throwaway configuration, not production secrets. Values are deliberately omitted here. No `secrets.*` reference/deployment credential wiring was found in this workflow.

The CI environment does **not** set `EDUFLOW_AUDIT_TEST_POSTGRES` or `EDUFLOW_DELETE_POSTGRES_CONNECTION`, so its PostgreSQL service cannot by itself prove real PostgreSQL assertions executed. The retained [testing/CI design guide](../project/15_GIT_TESTING_CI_CD.md) contains illustrative deployment/Compose examples and an authority notice; those examples are not executable jobs in current CI and were not treated as deployed infrastructure. Legacy links were ignored.

## 11 Deployment

**No cloud deployment was verified.** Local setup instructions and a historical local run are available; no verified public API, health, Swagger or React URL was established from the authorized evidence.

### Read-only availability probes actually performed

| URL | Current result on 2026-10-01 | Meaning |
|---|---|---|
| `http://localhost:5204/health` | ECONNREFUSED | Backend unavailable from this execution context; not a cloud result |
| `http://localhost:8000/health` | ECONNREFUSED | Python unavailable from this execution context |
| `http://localhost:2174/` | ECONNREFUSED | React unavailable from this execution context |

No server was started to change these results. No claim is made about services elsewhere on the user's machine or a cloud account. Historical 2026-09-28 API/Python HTTP 200 results are recorded separately, not carried forward as current availability.

| Component | Available evidence | Deployment classification |
|---|---|---|
| ASP.NET cloud API | Local launch profiles and startup source; no public deployment evidence | **NOT VERIFIED**; local setup **DOCUMENTED ONLY**, historical local run |
| API health | Source registers /health with status/service/timestamp | **LOCAL ONLY** route configuration; not a database/provider readiness test or verified cloud health URL |
| Swagger | Program.cs enables Swagger/UI inside IsDevelopment | **LOCAL ONLY** documentation setup. Required cloud Swagger needs explicit secure deployment configuration; not verified by a local path |
| React | Vite localhost:2174; build script; VITE_API_BASE_URL | **LOCAL ONLY** setup/historical UI run; no verified hosted URL |
| PostgreSQL | Backend provider/configuration and initialization instructions | **NOT VERIFIED** cloud deployment; no restricted deployed credentials, access policy, migrations or backup evidence established |
| AI | FastAPI/Uvicorn localhost:8000, existing setup guide, dated focused local results | **LOCAL ONLY** historical execution/setup; current reachability refused; no hosted service claim |
| Flutter APK | No APK in the inspected standard build output paths and no artifact link in inspected guidance | **NOT VERIFIED / NOT FOUND** in bounded evidence |
| Third-party providers | Groq/Gemini integration source and dated live Learning evidence | Historical integration evidence, not current availability or deployment certification |
| AWS proposal | Member evidence guide describing S3/RDS/pgvector changes | **DOCUMENTED ONLY**, not deployment evidence |

[Backend Program.cs](../../backend/EduFlow.Api/Program.cs) invokes `DbInitializer.Initialize` at startup and fails startup on initialization errors. Starting the application is not a harmless health probe. Production HTTPS behavior exists in source, but certificate/domain/reverse-proxy operation was not tested.

[Current setup guide](../current/LOCAL_SETUP_GUIDE.md) describes ports 2174/5204/8000, PostgreSQL/configuration prerequisites, a root development runner and manual Python launch. PostgreSQL is separate; normal upload does not auto-index. AI service import and ordinary Learning breakdown can write vector metadata or contact configured providers, so no smoke generation was attempted.

[Member AWS guide](../members/member-3-atheek/evidence/AWS_PRODUCTION_DEPLOYMENT_GUIDE.txt) is explicitly catalogued as a historical proposal. Its S3/pgvector examples differ from current local-file/Chroma implementation verified in Phase 5. Example bucket names, service aliases and suggested code are not real accessible deployment links.

APK checks were limited to normal Flutter output paths: `mobile/build/app/outputs/flutter-apk/app-release.apk`, `app-debug.apk`, and `mobile/build/app/outputs/apk/release/app-release.apk`; all absent. The mobile top-level listing has a Windows platform folder but no Android folder. This is a build-readiness observation only; no Flutter implementation audit or scaffold generation was performed. No APK was built or searched for outside the authorized scope.

## 12 Third-Party Integration

Source findings inherited from [Phase 5](05_AGENTIC_AI_RAG.md); configuration names confirmed in examples/setup. Actual keys were not disclosed, and no provider call was performed here.

| Provider | Business purpose / configuration | Failure and timeout handling | Privacy / verification |
|---|---|---|---|
| Groq | Lecture-grounded generation and Learning structured output; LLM_PROVIDER, GROQ_API_KEY, GROQ_MODEL | Source uses 30 s timeout and max_retries=0; selected Groq failure can fall back to Gemini; then extractive fallback | Prompts, user questions, lecture excerpts and applicable history sent externally. Historical live Learning record references Groq configuration; current account/model/network not verified |
| Gemini generation | Generation/alternate provider; GEMINI_API_KEY, GEMINI_MODEL and LLM_PROVIDER | 30 s request timeout; provider failure can return extractive text; structured Learning rejects unavailable/extractive results | Same context/history exposure; app-level timeout does not prove all SDK retry behavior. Historical configured integration, no current rerun |
| Gemini embeddings | Document/query vectors; EMBEDDING_PROVIDER and GEMINI_API_KEY | Initialization probe and fallback branch; no explicit bounded embedding timeout/retry found in Phase 5 | Documents/query text transmitted; do not index real course/private data as a diagnostic |
| Chroma | Persistent local retrieval infrastructure; CHROMA_PERSIST_DIR | Default embedding behavior requires runtime verification | Local vector/doc metadata still needs access/retention/mount controls; not itself evidence of an external hosted provider |

Supported source default generation models: Groq `openai/gpt-oss-120b`, Gemini `models/gemini-flash-latest`; Gemini embedding `models/gemini-embedding-001`. These are source/default findings, not verified current service availability.

**Defensible claim:** meaningful third-party generation/embedding integration exists in source and focused historical live integration is documented. **Unsupported claim:** current paid-provider availability, privacy compliance, quality, cost or a complete third-party-backed Agentic acceptance workflow. Preserve scoped source/historical labels and provide an authorized reproducible runtime trace later.

Environment-variable names for evaluator setup:

- Backend: `ConnectionStrings__DefaultConnection`, `JwtSettings__Secret`, `JwtSettings__Issuer`, `JwtSettings__Audience`, `JwtSettings__ExpiryMinutes`, `AiService__BaseUrl`, `AiService__ApiKey`, `AiService__TimeoutSeconds`; Redis configuration is present but its operational role is not certified here.
- Frontend: `VITE_API_BASE_URL`.
- AI: `INTERNAL_SERVICE_TOKEN`, `EMBEDDING_PROVIDER`, `LLM_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `CHROMA_PERSIST_DIR`.
- Test-only: `EDUFLOW_AUDIT_TEST_POSTGRES`, `EDUFLOW_DELETE_POSTGRES_CONNECTION`, `EDUFLOW_LIVE_TESTS`, `PLAYWRIGHT_CHANNEL`, `EDUFLOW_EXPECT_EXTRACTIVE`, `E2E_API_BASE_URL`.

Configuration-name presence is not enforcement: Phase 5 found no Python internal-token validation and a fail-open backend internal-tool filter when expected key configuration is absent. Test-only variables must never silently target production data.

## 13 Submission Artifact Status

Required artifacts come from [Phase 0](00_REQUIREMENTS_AND_REPORT_MAP.md). No missing value is invented.

| Artifact | Availability in inspected evidence | Status / required action |
|---|---|---|
| Repository URL | No evaluator-ready URL established from inspected setup/readmes/prior evidence; Git remote/history not read | NOT FOUND / UNVERIFIED; supply canonical accessible repository URL and permissions |
| React URL | Local development URL only | NOT VERIFIED deployed; supply working public URL configured to actual API |
| API / health URL | Local route/setup only; current localhost refused | NOT VERIFIED cloud; supply deployed health URL |
| Swagger URL | Local /swagger setup, development-gated | NOT VERIFIED cloud; provide evaluator-accessible deployed API documentation |
| PostgreSQL deployment evidence | Provider/schema/setup source, no current hosted proof | NOT VERIFIED; supply safe deployment/access/migration evidence without credentials |
| AI setup/access | Current setup guide and subsystem README; historical focused local run | PARTIAL; verify reproducible environment/startup, models and required index without unsafe automatic indexing |
| Environment-variable names | Examples/current setup and §12 | Available; values must be provisioned privately, not printed in report |
| Startup instructions | Root/subsystem README and current guide | DOCUMENTED ONLY for current session; runtime blocked/unavailable |
| Flutter APK | Standard paths absent; no link found | NOT FOUND in bounded scope; build and test a runnable artifact in an authorized environment |
| Demo video URL | No working link established from inspected evidence | NOT FOUND / UNVERIFIED; supply accessible 10-minute video |
| Test accounts | Historical local UI demo personas and seeded roles referenced | PARTIAL; no verified deployed evaluator accounts/access handoff; omit credentials from this file |
| Group number | Not established in scoped evidence | TEAM CONFIRMATION REQUIRED; do not substitute member numbers |
| Written lecturer approval | Prior phases leave three-member/two-intended-agent adjustment unresolved | TEAM / LECTURER CONFIRMATION EVIDENCE REQUIRED |
| CI run evidence | Workflow file only | Supply real run URL/logs showing backend restore/build/tests on required events; no passing badge invented |
| Test/evaluation results | Dated focused Learning record and limited UI artifacts | PARTIAL; full-layer/real-PG/golden-workflow results missing |
| Performance report inputs | Four historical operation timings only | PARTIAL; complete benchmark evidence missing |

Keep required repository/video/services accessible for the official evaluator access period recorded in Phase 0 (through at least 21 October 2026). This is a requirement, not a verified accessibility promise.

## 14 Confirmed Evidence

- Source inventories: 25 backend C# test files, three substantive Python test files, all 14 Playwright specs and three Flutter test files.
- Backend InMemory versus opt-in PostgreSQL distinction, including environment guards and database mutation behavior.
- Historical 2026-09-28 focused results: 12 gateway, 32 Python Learning, four mocked UI and two live Learning passes, **as recorded by the dated evidence document**, not rerun.
- Existing last-run UI status and four named screenshot files; limited provenance prevents broader pass claims.
- Four dated Learning timing observations; no load benchmark inferred.
- GitHub Actions required backend push/PR-to-main restore/build/test configuration, plus frontend build, Flutter test and Python jobs.
- Current local setup/configuration names and source health/Swagger behavior.
- Actual read-only probes in this phase: three localhost connections refused. No successful current application execution is claimed.

The evidence review is complete within Phase 6 scope even though execution/deployment certification remains blocked.

## 15 Missing / Blocked Evidence

| Priority | Blocker/gap | Why it matters / next evidence needed |
|---|---|---|
| Critical | Current test execution environment denies process launch | Obtain runs in an existing authorized working environment; retain exact command/environment/results. No security policy was disabled |
| Critical | Complete Agentic workflow absent per Phase 5 | Execution cannot compensate for missing planner/delegation/durable approval implementation |
| Critical | Deployed API/React/PostgreSQL, APK and evaluator links not verified | Core submission/deployment requirements remain open |
| High | PostgreSQL opt-in tests not executed in isolated disposable infrastructure | InMemory is not relational database evidence; never run against existing data casually |
| High | Python full suite has removed-core imports and unsafe default RAG initialization | CI labels do not prove golden evaluation; fix/isolate in a separately authorized coding phase |
| High | Flutter test suite includes stale package import and mostly copied local logic | Current tests do not certify real mobile services or usable app |
| High | Complete mobile→API→DB→AI→review→mobile trace absent | Do not combine unrelated component tests into complete E2E |
| High | Real GitHub Actions run evidence absent | Mandatory configuration exists, passing execution unverified |
| High | Benchmark/load measurements absent | Four historical single operations cannot satisfy all performance evidence categories |
| High | Written lecturer scope adjustment and group number missing | Team/agent-count compliance and submission identity unresolved |
| Medium | No raw complete historical backend/Python run logs established here | Retain original outputs/artifacts and rerun safely for current source before final claims |

No further source changes, test execution, installs, service starts, deployments or database actions are authorized by this evidence document.

## 16 Final-Report Evidence Inputs

| Report section | Safe material supplied | Must remain explicit / later evidence |
|---|---|---|
| **G7 Software Testing** | Layer-specific source inventories, isolation/provider distinction, exact command candidates, current execution blockers, historical focused results and Flutter weaknesses | Source existence is not pass; no current aggregate pass count or coverage percentage; real PostgreSQL and mobile execution remain missing |
| **G8 AI Evaluation** | Learning test scope, historical focused/live observations, official golden-case mapping, absent implementation requirements | Official golden workflow **not verified**; no claimed multi-agent or approved durable workflow success |
| **G9 Performance** | Four dated single-operation observations; synthetic metrics explicitly excluded | Load, response distributions, error rate and database measurements not available; do not fabricate benchmark tables |
| **G10 Deployment** | Current setup/config names, local route/health/Swagger evidence, actual refused probes, AWS proposal distinction and artifact checklist | No cloud deployment verified; no working APK/public links asserted |
| **G13 CI/Collaboration evidence** | Actual workflow filename, main/dev push+PR triggers, required backend commands, additional job limits and missing run artifacts | Static CI configuration is available; passing runs, branch rules, PRs and contribution history require separate evidence. Git/contribution work remains Phase 7 |

These are evidence inputs, not polished final chapters. No individual AI reflection has been written. All prior documentation and application files remain unchanged; the sole created artifact is this Phase 6 file.
