# EduFlowAi — Figure and Screenshot Plan

Phase 8, 1 October 2026. Sixteen recommended figures in capture order; not sixteen existing screenshots. Authority: Phases 0–7 and [master draft](08_MASTER_FINAL_REPORT_DRAFT.md). No screenshots were generated or captured in Phase 8.

## Capture rules

Figures 1–3 are source-derived diagrams, already drafted in the master; verify labels against phase evidence before rendering. Figures 4–16 are runtime captures. A proposed owner is a capture coordinator based on Phase 7 responsibility, not an exclusive author. TEAM owns cross-service evidence.

Never use demo authentication, local-only approval/rewards, generic quiz fallback, constant confidence or synthetic timing as live persisted proof. A screenshot must be paired with its raw sanitized response/log or database evidence, revision, date and environment. Preserve historical and post-deadline labels. Captures requiring fixes, deployment, database mutation, provider use or test execution need a separately authorized working session; this plan does not execute them.

## Capture order

### Figure 1 — Integrated architecture

| Field | Capture instruction |
|---|---|
| Who captures it | TEAM |
| Client/service | Diagram |
| Exact screen/route/action | Master §3 |
| What must be visible | Both clients, API, PostgreSQL, Learning/tools/RAG, Chroma/providers |
| Required supporting proof | Phase 2–5 boundaries; no false multi-agent links |
| Claim supported | Source architecture |
| Runtime evidence required? | No |
| Current status | DRAFT DIAGRAM |
| Redactions | None |
| Report chapter | 3 |

### Figure 2 — Selected relational ERD

| Field | Capture instruction |
|---|---|
| Who captures it | TEAM |
| Client/service | Diagram |
| Exact screen/route/action | Master §4 |
| What must be visible | Real FK/cardinality and key business/review/governance entities |
| Required supporting proof | Phase 2 schema inventory; diagram is a subset |
| Claim supported | Relational design |
| Runtime evidence required? | No |
| Current status | DRAFT DIAGRAM |
| Redactions | None |
| Report chapter | 4 |

### Figure 3 — Learning tool flow

| Field | Capture instruction |
|---|---|
| Who captures it | Wazni |
| Client/service | Diagram |
| Exact screen/route/action | Master §8 |
| What must be visible | Fixed dispatch, validators, citations, local STM and failures |
| Required supporting proof | Phase 5 current agent inventory |
| Claim supported | One LearningAgent and tools |
| Runtime evidence required? | No |
| Current status | DRAFT DIAGRAM |
| Redactions | None |
| Report chapter | 8 |

### Figure 4 — Role and resource authorization

| Field | Capture instruction |
|---|---|
| Who captures it | TEAM |
| Client/service | React / API |
| Exact screen/route/action | Login with authorized accounts; attempt owner and non-owner course actions |
| What must be visible | Allowed action plus real denied response |
| Required supporting proof | Sanitized HTTP status, identity/role and ownership trace |
| Claim supported | Authentication and authorization subset |
| Runtime evidence required? | Yes |
| Current status | CAPTURE REQUIRED |
| Redactions | Tokens, passwords, personal identifiers |
| Report chapter | 2, 5, 10 |

### Figure 5 — Admin support and audit transaction

| Field | Capture instruction |
|---|---|
| Who captures it | Wazni |
| Client/service | React / API / PostgreSQL |
| Exact screen/route/action | /console → Support Desk; reply/resolve; Audit Logs |
| What must be visible | Expected version, persisted status and matching audit event |
| Required supporting proof | Database/response records with correlated ticket/event; conflict evidence if shown |
| Claim supported | Governance business workflow |
| Runtime evidence required? | Yes |
| Current status | CAPTURE REQUIRED |
| Redactions | Support text, personal details, credentials |
| Report chapter | 4–6, 10 |

### Figure 6 — Instructor curriculum and assessment lifecycle

| Field | Capture instruction |
|---|---|
| Who captures it | Raashidh |
| Client/service | React / API |
| Exact screen/route/action | /console → Courses/Assessments; create draft, validate and publish |
| What must be visible | Owned course, real assessment ID and server publication status |
| Required supporting proof | API response plus persisted record; no local q-* substitute |
| Claim supported | Academic business rules |
| Runtime evidence required? | Yes |
| Current status | CAPTURE REQUIRED |
| Redactions | Personal data and answer keys outside authorized instructor view |
| Report chapter | 5–6 |

### Figure 7 — Student enrollment and access

| Field | Capture instruction |
|---|---|
| Who captures it | Raashidh |
| Client/service | React / API |
| Exact screen/route/action | /courses → course details → request enrollment; authorized instructor decision |
| What must be visible | Same learner/course/request; access changes after reload |
| Required supporting proof | Actual server status and denied unauthorized decision |
| Claim supported | Shared enrollment workflow |
| Runtime evidence required? | Yes |
| Current status | CAPTURE REQUIRED |
| Redactions | Student identifiers and tokens |
| Report chapter | 2, 6, 9 |

### Figure 8 — Flutter login, Journey and persisted quiz result

| Field | Capture instruction |
|---|---|
| Who captures it | Atheek |
| Client/service | Flutter / API / PostgreSQL |
| Exact screen/route/action | Real backend login → Journey → quiz → submit/result |
| What must be visible | Real authenticated user, correct attempt/result and persisted reload |
| Required supporting proof | Device/build version and server/database record; no demo fallback |
| Claim supported | Mobile integration subset |
| Runtime evidence required? | Yes |
| Current status | BLOCKED: constructor/submission/runtime gaps |
| Redactions | Credentials, tokens and student data |
| Report chapter | 7, 9, 11 |

### Figure 9 — Indexed lecture and Learning outputs

| Field | Capture instruction |
|---|---|
| Who captures it | Wazni |
| Client/service | React / FastAPI / Chroma |
| Exact screen/route/action | /console → Student Learning Assistant; choose existing deck, breakdown, topic plan/explain |
| What must be visible | Source/page/section, output and resolvable citations |
| Required supporting proof | Sanitized request/response and source-page comparison; index metadata supplied by Atheek |
| Claim supported | Grounded Learning behavior |
| Runtime evidence required? | Yes |
| Current status | CAPTURE REQUIRED |
| Redactions | Private lecture content, IDs, provider keys |
| Report chapter | 8, 12 |

### Figure 10 — Learning failure and actual trace

| Field | Capture instruction |
|---|---|
| Who captures it | Wazni |
| Client/service | API / AI |
| Exact screen/route/action | Controlled isolated unavailable/malformed request; capture HTTP response and real logs |
| What must be visible | Actual error, bounded attempts and measured correlation |
| Required supporting proof | Raw sanitized trace; durable failure only if implemented |
| Claim supported | Safe failure subset |
| Runtime evidence required? | Yes |
| Current status | PARTIAL: complete durable trace absent |
| Redactions | Raw prompts, secrets and personal history |
| Report chapter | 8, 10–12 |

### Figure 11 — Complete cross-platform approved AI outcome

| Field | Capture instruction |
|---|---|
| Who captures it | TEAM |
| Client/service | Flutter / API / PostgreSQL / AI / React |
| Exact screen/route/action | One mobile objective through planning/delegation, authorized review, resume and returned status |
| What must be visible | Same workflow ID across all steps and clients |
| Required supporting proof | Durable steps/tools/validation/approval/outcome; unauthorized rejection; actual agents |
| Claim supported | Official minimum and cross-platform E2E |
| Runtime evidence required? | Yes |
| Current status | BLOCKED: workflow not implemented completely |
| Redactions | Personal data, credentials and sensitive tool results |
| Report chapter | 9, 12 |

### Figure 12 — Layer tests and golden assertions

| Field | Capture instruction |
|---|---|
| Who captures it | TEAM |
| Client/service | Test runners |
| Exact screen/route/action | Run isolated approved backend/PostgreSQL/React/Flutter/AI subsets |
| What must be visible | Exact commands, revision, date/environment and pass/fail/skip |
| Required supporting proof | Raw reports; separate mocks/live/PG; missing golden remains visible |
| Claim supported | Actual testing results |
| Runtime evidence required? | Yes |
| Current status | BLOCKED: execution environment and suite gaps |
| Redactions | Connection strings, tokens and private fixture data |
| Report chapter | 11–12 |

### Figure 13 — Measured performance

| Field | Capture instruction |
|---|---|
| Who captures it | TEAM |
| Client/service | Benchmark / API / DB / AI |
| Exact screen/route/action | Authorized isolated workload with documented concurrency and cache conditions |
| What must be visible | Request count, latency distribution, failures, DB/AI measurements |
| Required supporting proof | Raw dataset/harness/config; exclude synthetic telemetry |
| Claim supported | Performance under stated conditions |
| Runtime evidence required? | Yes |
| Current status | CAPTURE REQUIRED: benchmark absent |
| Redactions | Secrets, private query/prompt data |
| Report chapter | 13 |

### Figure 14 — CI and contribution provenance

| Field | Capture instruction |
|---|---|
| Who captures it | TEAM |
| Client/service | GitHub |
| Exact screen/route/action | Actual CI run for selected revision plus relevant PR evidence |
| What must be visible | Commit, event, job steps/results; pre/post-deadline boundaries |
| Required supporting proof | Accessible run/PR links; Phase 7 provenance |
| Claim supported | CI execution and collaboration |
| Runtime evidence required? | Yes |
| Current status | PARTIAL: PR evidence exists, passing CI unverified |
| Redactions | Secrets and private metadata |
| Report chapter | 14, 21–23 |

### Figure 15 — Deployed evaluator access

| Field | Capture instruction |
|---|---|
| Who captures it | TEAM |
| Client/service | Browser / API / PostgreSQL |
| Exact screen/route/action | Real public React, health and Swagger; safe deployment/schema proof |
| What must be visible | Actual URLs, response and deployment version |
| Required supporting proof | TLS/access checks, deployed DB evidence; no secrets |
| Claim supported | Cloud deployment |
| Runtime evidence required? | Yes |
| Current status | BLOCKED: deployment unverified |
| Redactions | Connection credentials, cloud account identifiers |
| Report chapter | 15, 19 |

### Figure 16 — APK and meaningful device feature

| Field | Capture instruction |
|---|---|
| Who captures it | Atheek |
| Client/service | Android device / Flutter |
| Exact screen/route/action | Install actual artifact and demonstrate chosen genuine device capability |
| What must be visible | Version/install success and real device interaction |
| Required supporting proof | APK checksum/location, installation guide and API trace where relevant |
| Claim supported | Runnable mobile artifact/device requirement |
| Runtime evidence required? | Yes |
| Current status | BLOCKED: APK/device feature unverified |
| Redactions | Device identifiers, permissions data and personal content |
| Report chapter | 7, 15, 19 |

## Final selection and captions

Keep this set to approximately 12–18 figures; use a compact panel only when the panels belong to the same reproducible scenario. Separate architecture/ERD renderings from runtime screenshots. If a blocked figure remains unavailable, retain the limitation in the report and omit the unearned success image; do not fill the space with a mock.

Use captions of the form: scenario — environment/revision/date — actual observation — evidence status. Do not assign an observed date until capture occurs. Screenshots of settings must redact values, not just obscure selected characters. Remove bearer/refresh tokens, passwords, provider keys, connection strings and unrelated personal data from all supporting artifacts.
