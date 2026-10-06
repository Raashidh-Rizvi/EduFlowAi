# Phase 3 — React Web Application Source Verification

Prepared 2026-10-01. Repository root: `C:/Users/WAZNI/Desktop/SLIIT/PROJECTS/Y3/Y3-S1/SEF/PROJECTS/EduFlowAi/EduFlowAi`.

## 1. Scope and Verification Method

Static source review using [Phase 0 requirements](00_REQUIREMENTS_AND_REPORT_MAP.md), [Phase 1 scope](01_CURRENT_SCOPE_AND_EVIDENCE_PLAN.md) and [Phase 2 backend evidence](02_BACKEND_DATABASE_SECURITY.md). Inspected frontend/src, package.json, vite.config.js, .env.example, playwright.config.js, README.md and all 14 frontend/e2e spec files.

Only three backend controllers were reopened for narrow contract checks: TeamsController (squad prefix), AiReviewController (orchestration identifiers) and QuizzesController (create/publish/submission). Other backend findings below are carried forward from Phase 2; this was not another backend audit.

No application/configuration edits, package installs, builds, tests, service starts, screenshots, Git operations or database mutations occurred. Mobile, Python internals, legacy documents, node_modules, dist and generated test artifacts were excluded. This document is the sole Phase 3 output.

| Code | Classification | Meaning |
|---|---|---|
| A | VERIFIED IN SOURCE | Directly observed declaration or control flow. |
| B | PRESENT IN SOURCE BUT RUNTIME NOT VERIFIED | Executable source exists; successful execution unverified. |
| C | PARTIAL | Concrete gap, disconnected action or simulated result limits the claim. |
| D | DOCUMENTED/PLANNED ONLY | Label/comment/claim without corresponding functional evidence. |
| E | NOT FOUND / UNVERIFIED | Not established in inspected scope or requires runtime/another phase. |

A/B never mean passing, deployed or secure. Phase 4 covers Flutter, Phase 5 AI, Phase 6 tests/performance/CI/deployment and Phase 7 contribution attribution. Source wins over comments and documentation.

## 2. React Technology Stack

Evidence: [package.json](../../frontend/package.json), [main.jsx](../../frontend/src/main.jsx), [App.jsx](../../frontend/src/App.jsx), [Vite config](../../frontend/vite.config.js).

| Technology | Declaration and actual use | Status |
|---|---|---|
| React / ReactDOM | ^18.3.1; createRoot, StrictMode, functional components/hooks | A; installed resolved version not inspected |
| Vite / React plugin | ^5.2.11 / ^4.3.0; actual configuration | A |
| React Router DOM | ^6.23.1; BrowserRouter, Routes, Route, Navigate, Link, Outlet and query/navigation hooks | A |
| Axios | ^1.7.2; shared client/interceptors | A |
| Lucide React | ^0.395.0; imported icons throughout UI | A |
| Zustand | ^4.5.2 declared; no application import/store found | A dependency, E implemented store |
| Actual state approach | Context API + component hooks + manual API fetching/browser persistence | A; ADR rationale pending |
| UI/forms | Custom components/CSS and native inputs/forms/dialogs; no observed external form framework | A |
| Playwright | @playwright/test ^1.63.0; 14 E2E specs | A source, E execution |

Scripts: dev = vite; build = vite build; preview = vite preview; test:e2e = playwright test, plus Playwright UI/report scripts. No React unit/component-test script or test file under src was found. No command was run.

## 3. Project Structure

```text
frontend/src/
  main.jsx → ErrorBoundary + UI/theme providers → App.jsx
  context/       AuthContext, ThemeContext, UIVersionContext
  components/    common, layout, marketplace, reviews, support
  pages/
    Auth/ Marketplace/ Admin/ Instructor/
    Courses/ Assessments/ AiReview/ Student/
    Gamification/ Insights/ Communications/ Dashboard/ Landing/
  services/      api.js + 13 area service modules
  utils/         PDF handling, quiz browser mirror, marketplace formatting
  index.css, styles/marketplace.css, styles/theme-v2.css
frontend/e2e/    14 Playwright specification files
```

Most components are functions; [ErrorBoundary](../../frontend/src/components/layout/ErrorBoundary.jsx) is a class. Courses, Assessments and StudentPortal remain large components combining presentation, state and workflow behavior.

LandingPage exists but / mounts Marketplace/HomePage. The older Dashboard import is not the normal Instructor/Admin dashboard: they use Instructor/DashboardView and PlatformSummary respectively. File presence is not reachability. InstructorPortal selects V1/V2 layouts through UIVersionContext; both use the same main feature views.

## 4. Routing and Navigation

Evidence: [App](../../frontend/src/App.jsx), [LearnEntry](../../frontend/src/pages/Student/LearnEntry.jsx), [InstructorPortal](../../frontend/src/pages/Instructor/InstructorPortal.jsx), [StudentPortal](../../frontend/src/pages/Student/StudentPortal.jsx).

| Route | Primary component | Authentication | Role restriction | API dependency | Status |
|---|---|---|---|---|---|
| / | HomePage / MarketplaceLayout | Public | None | marketplace statistics/catalog | B/C |
| /courses | CatalogPage | Public | None | marketplace/courses/categories | B |
| /courses/:id | CourseDetailsPage | Public read; login for mutations | Student-specific enrollment/review UI | detail, preview, enrollment/reviews | B |
| /instructors/:id | InstructorProfilePage | Public | None | instructors/{id} | B |
| /policies/:slug | PolicyPage | Public | None | Static policy content | B |
| /learn/:courseId | LearnEntry | Login redirect; access API check | Server access may allow Student/owner/Admin | courses/{id}/access | B/C |
| /login | Login, register mode via query | Public; existing user redirected | Registration chooser conflicts with server | auth/login/register | C |
| /console | Role-selected consoleView | currentUser gate; token-backed boot restore when tokens exist | Student, Instructor, Admin; unexpected role denied | Role services | B/C |
| * | Navigate to / | Public | None | None | A; no dedicated 404 page |

Marketplace uses nested layout/Outlet routing. Console sections below are **state-selected views at /console**, not separate URLs.

| Role / selector | Component(s) | API dependency | Status |
|---|---|---|---|
| Admin dashboard | PlatformSummary | analytics/platform | B |
| Admin admin: users/reviews/ui-theme | AdminManagement, ReviewModeration | admin/users/reviews; local appearance state | B/C |
| Admin courses | Courses → AdminCourseManagement | course/module/roster/upload | B |
| Admin enrollment-requests | EnrollmentRequestsView | instructor enrollment APIs | B |
| Admin support-desk/audit-logs/admin-profile | Corresponding Admin pages | support/audit/auth/me | B |
| Admin communications | Communications | notification broadcasts/history | B/C |
| Instructor dashboard/my-courses/create-course | Focused Instructor views | instructor/course APIs | B |
| Instructor enrollment-requests/my-students/reviews/profile | Focused Instructor views | enrollment/student/profile/review APIs | B |
| Instructor courses/assessments | Courses, Assessments | curriculum/quiz APIs | B/C |
| Instructor ai-review/gamification/insights/communications | Shared staff pages | AI/reward/analytics/notification APIs | C |
| Student curriculum/enrollments/home | CurriculumTab, EnrollmentRequestsTab, HomeTab | course/enrollment/quiz/reward APIs | B/C |
| Student coach/focus/ranks/profile | CoachTab, FocusFlowTab, LeaderboardTab, ProfileTab | AI, rewards/leaderboard; displayed profile | B/C |

Admin Sidebar filters navigation to governance-oriented tabs, but App retains conditional rendering for ai-review, assessments, gamification and insights if persisted active-tab state selects them. Menu hiding is not authorization. Console selections persist in sessionStorage; they do not produce separate browser-history URLs.

Login accepts a next parameter beginning with /, otherwise /console. LearnEntry checks a specific course then stores only the curriculum tab and redirects /console, losing selected-course context. Unknown Instructor sections fall back to dashboard; unknown Admin/Student state may leave no selected content.

## 5. Authentication and Session Handling

Evidence: [Login](../../frontend/src/pages/Auth/Login.jsx), [authService](../../frontend/src/services/authService.js), [api.js](../../frontend/src/services/api.js), App.

| Concern | Source behavior | Status / limit |
|---|---|---|
| Login/register | Controlled fields, pending button, API error display | B/C; registration offers Instructor/Admin although server permits Student only |
| Storage | localStorage keys eduflow_token, eduflow_refresh_token, eduflow_token_expires_at, eduflow_user | A; JavaScript-readable, not HttpOnly cookies |
| Identity | toUserProfile normalizes server id/name/email/role/avatar/isActive | A; generic missing isActive defaults true |
| Boot restore | With either token present, restoreSession calls GET /auth/me before console rendering | B; any failure clears session, including outage |
| Request auth | Bearer header from stored token | A |
| Refresh | Eligible 401 triggers single-flight POST /auth/refresh, stores result, retries once | B; reactive, not proactive expiry timer |
| Invalid session | Clear four keys and reload except at / | B/C; in-memory root-page state can remain stale |
| Logout | Best-effort backend refresh-token revocation, local clear, /login navigation | B; business caches/tabs survive |
| Role freshness | Server role used at login/profile; refresh updates storage | C; refresh does not directly update React context |
| Admin profile | Dedicated strict response validation and active-Admin check | B |

**C — Cached-user/no-token gate:** App reads currentUser from localStorage. With neither token present, sessionChecked starts true and restoreSession is skipped; consoleView only requires currentUser. A remaining/crafted profile can therefore render a role shell without token verification. This does not establish backend API access. The mocked Learning test seeds only a user object, so it does not test real authentication.

**C — Role-switch failure:** switchAccount logs into a predefined demo account and then best-effort revokes the old refresh token. Its promise to preserve the previous session on failure conflicts with api.js: a login 401 skips refresh but reaches the general branch that clears any existing session. App reports switch errors only to console.

**SECURITY ISSUE — HARDCODED DEMO CREDENTIALS FOUND.** App and Login bundle demo credentials, including privileged accounts, without an observed environment guard. Values are redacted. Role switching performs real authentication rather than simply changing a role string, but distributing known privileged credentials remains a security issue.

Phase 2 found access JWTs are not immediately revoked by logout/role/status changes and refresh lacks a general IsActive recheck. Boot profile synchronization does not repair these server limitations. Do not call localStorage storage secure.

## 6. State Management

| Category | Actual approach | Limit |
|---|---|---|
| GLOBAL STATE | AuthContext from App; ThemeContext; UIVersionContext | Small shared identity/preferences |
| LOCAL COMPONENT STATE | useState/effect/memo/ref/callback for forms, filters, dialogs, timers, answers and notices | Large feature components |
| SERVER/API STATE | Manual service calls/effects, page state, manual refresh/reconciliation | No observed Redux/Zustand/TanStack Query implementation |
| PERSISTED BROWSER STATE | Credentials/profile/theme/UI version; proposals/quizzes/squads/focus; sessionStorage tabs | Business caches unscoped by account and retained after logout |
| URL STATE | Catalog useSearchParams filters/sort/page | Public discovery supports bookmarkable queries |
| Cross-component updates | quizStorageHelper window CustomEvents | Browser synchronization, not cross-platform database state |

Business keys include eduflow_generated_quizzes, eduflow_ai_proposals_dynamic, eduflow_custom_squads, eduflow_focus_count and eduflow_mind_garden. They can retain answer keys, student/workflow details and reward state.

**ADR input only:** Context plus hooks/manual fetching is the implemented choice. Later justify tradeoffs around stale state, account scoping, cancellation and rollback. Do not invent an ADR history or describe the declared Zustand package as the actual architecture.

## 7. API Integration

All relative paths below use [api.js](../../frontend/src/services/api.js)'s **VITE_API_BASE_URL**, defaulting to the local ASP.NET /api endpoint. Vite has no API proxy. Deployment overrides/runtime destinations were not verified.

**NO DIRECT REACT → PYTHON CALL FOUND IN INSPECTED SOURCE**

Learning/chat/RAG calls use /aireview through ASP.NET. Python-address references in assessment error text are diagnostic strings, not requests. Document fetches may use absolute asset URLs but are not identified Python service calls. This finding does not prove deployed ingress isolation.

Shared-client calls attach bearer tokens when stored, including public reads. Most service methods return response.data and propagate errors; specific exceptions follow.

| Service file | Area / representative relative endpoints | Authentication | Error handling | Consumers | Status |
|---|---|---|---|---|---|
| [api.js](../../frontend/src/services/api.js) | /auth/refresh and shared transport | Bearer; raw Axios refresh | 401 retry/clear, friendlyMessage | Services and some pages | B/C |
| [authService](../../frontend/src/services/authService.js) | /auth/login/register/me/logout | Persists auth response | Restore clears on failure; logout best effort | App/Login/AdminProfile | B/C |
| [adminAuditService](../../frontend/src/services/adminAuditService.js) | /admin/audit-logs/options and records | Shared bearer | Validation/problem formatter, cancellation | AuditLogs | B |
| [adminReviewService](../../frontend/src/services/adminReviewService.js) | /admin/reviews, approve/reject/delete | Shared bearer | Propagates to notices | ReviewModeration | B |
| [aiService](../../frontend/src/services/aiService.js) | /aireview/workflows/proposals/orchestrate; coach/chat, learn, learning/slide-decks, rag/chat | Shared bearer | Learning-specific errors; 150s chat/learn timeout; reject empty/fallback chat | AiReview, CoachTab | B/C |
| [courseService](../../frontend/src/services/courseService.js) | /courses, modules/lessons, upload, enroll/roster; /students/me/courses | Bearer; multipart uploads | Propagates; consumers sometimes suppress | Course/Admin/Instructor/Student/Assessments | B/C |
| [enrollmentService](../../frontend/src/services/enrollmentService.js) | /students/me/enrollment-requests; /courses/{id}/access/enroll | Bearer, no supplied student ID | Propagates | LearnEntry/StudentPortal | B |
| [gamificationService](../../frontend/src/services/gamificationService.js) | /gamification/dashboard/ledger/focus-session/squads/leaderboard/multiplier | Bearer; browser-supplied IDs | Some local success fallbacks; squad prefix mismatch | Gamification/StudentPortal | C |
| [insightsService](../../frontend/src/services/insightsService.js) | /analytics/platform/topic-mastery/at-risk-students; /reports | Shared bearer | Propagates | Summary/Insights/older Dashboard | B/C |
| [instructorService](../../frontend/src/services/instructorService.js) | /instructor/dashboard/courses/enrollment-requests/students; /instructors/me/profile | Shared bearer; public queries also supported | Propagates | Instructor views/public profile | B |
| [marketplaceService](../../frontend/src/services/marketplaceService.js) | /marketplace/courses/stats/categories; reviews/enroll/preview | Public reads, bearer when stored | Home consumer may reduce failures to empty data | Marketplace pages | B/C |
| [quizService](../../frontend/src/services/quizService.js) | /quizzes CRUD/scope/generate-ai/validate/publish/start/submit/submissions/feedback | Shared bearer | Propagates; consumer fallbacks vary | Courses/Assessments/StudentPortal | B/C |
| [reviewService](../../frontend/src/services/reviewService.js) | /courses/{id}/reviews/mine and mutations | Shared bearer | Propagates | CourseReviews/details | B |
| [supportService](../../frontend/src/services/supportService.js) | /support/tickets; /admin/support-tickets | Shared bearer | Validation formatter, cancellation, request UUID helper | Support dialog/history/desk | B |

AdminManagement also calls admin/users and role/status endpoints directly through api; Communications calls notification broadcast/history; older Dashboard calls recent activity. This is not an exclusively service-module architecture.

[pdfHelper](../../frontend/src/utils/pdfHelper.js) and AdminCourseManagement use raw fetch outside bearer/refresh interceptors. Relative documents resolve against the backend origin; absolute URLs may also be accepted. Phase 2 public static-file limitations remain relevant.

## 8. Admin Experience

Evidence: [Admin pages](../../frontend/src/pages/Admin), [AdminCourseManagement](../../frontend/src/pages/Courses/AdminCourseManagement.jsx), [Sidebar](../../frontend/src/components/layout/Sidebar.jsx).

| Feature | UI source | Backend | Actions | Loading/error/empty state | Status | Screenshot? |
|---|---|---|---|---|---|---|
| Platform overview | PlatformSummary | analytics/platform | Validated counts, refresh, navigation | Loading/refresh/error/retry, payload checks | B | Yes |
| User governance | AdminManagement | admin/users, toggle-status, change-role | Search/filter/create/role/status/delete | Create/delete errors/success; list/role/status failures often console-only | B/C | Yes |
| Course inventory | AdminCourseManagement | courseService | Search/filter/sort, create/edit courses/modules, upload, roster, documents | Explicit busy/empty/error/retry and retained inputs | B | Yes |
| Enrollment review | EnrollmentRequestsView | instructorService | Approve/decline/notes and badge refresh | Loading/errors/busy rows | B | Optional |
| Support desk | SupportDesk | supportService | Search/filter/page, reply/progress/resolve | Retry/empty/busy; 409 reload retains draft | B | Yes |
| Governance audit | AuditLogs | adminAuditService | Filters/page/detail/copy | Options/list/detail errors, retry/empty/loading | B | Yes |
| Review moderation | ReviewModeration inside AdminManagement | adminReviewService | Approve/reject/delete/filter | Loading/empty/error/success, delete confirmation | B | Optional |
| Personal details | AdminProfile | auth/me | Read/refresh/copy ID | Strict active-Admin/payload checks, retry | B | Optional |
| Communications | Communications | notifications/broadcast(s) | Send/read broadcasts | History loading/error, submit handling | B/C | Optional |
| Retained telemetry/config panels | AdminManagement conditional subviews | Telemetry API; local config setters | Metrics display/local “save” alerts | Not ordinary visible users/reviews/ui-theme tabs; synthetic data/local saves | C/D | No as runtime metrics |

Admin course/module delete and academic authoring: **UI DOES NOT EXPOSE THIS OPERATION** in AdminCourseManagement. Phase 2 found backend Admin mutation/deletion rights; UI omission is not denial. AdminProfile is read-only despite an available profile-update API.

PlatformSummary is API-bound. Retained telemetry/configuration code and successful-save alerts do not establish real measurements or persisted system configuration.

## 9. Instructor Experience

Evidence: [Instructor views](../../frontend/src/pages/Instructor/views), [Courses](../../frontend/src/pages/Courses/Courses.jsx), [Assessments](../../frontend/src/pages/Assessments/Assessments.jsx), [AiReview](../../frontend/src/pages/AiReview/AiReview.jsx).

| Feature | Actual UI/API behavior | Status / boundary |
|---|---|---|
| Dashboard | Instructor summary, pending enrollments, course publish and enrollment decisions | B; secondary fetch may default empty |
| Course management | MyCourses/CreateCourse: create/edit/publish/delete, metadata and confirmation | B |
| Modules/materials | Courses loads details, uploads documents and adds/edits/deletes modules | B/C; deletion updates local state and suppresses backend failure |
| Topics/content | Add Topic calls createLesson then inserts a local topic wrapper | C; not persisted Topic/ContentItem CRUD |
| Enrollment/students | Scoped request/student lists, filters/notes/approve/decline | B |
| Profile/reviews | Public-profile editor and instructor review feed | B |
| Quiz authoring | Manual/editable questions, file parsing/upload-style UI, inspection/deletion/generation | B/C; local mirrors/fallbacks in several actions |
| Validate/publish/unpublish | Dedicated quiz endpoints used by separate actions | B; distinguish from create handler labelled publishing |
| Submissions/grading/feedback | Submission/result display, automated-result consumption, feedback API | B/C; full manual regrading workflow not established |
| AI quiz generation | Courses/Assessments call quizzes/generate-ai and show editable draft/scope | B/C; no distinct-agent proof |
| AI study review | Workflow list, approve/reject, batch/edit/replan controls | C; simulations and persistence gaps §16 |
| Analytics/rewards/comms | Shared Insights/Gamification/Communications | B/C; squad mismatch and local remedial action |
| Support | HelpSupportDialog/history in both V1/V2 shells | B |

A “Generate AI Quiz” button is not evidence of a distinct Quiz Generator Agent. Phase 5 must verify actual agents/tools/contracts. AiReview's four-agent labels and synthetic traces do not override the current two-agent direction in Phase 1.

## 10. Student Experience

Evidence: [StudentPortal](../../frontend/src/pages/Student/StudentPortal.jsx), [marketplace pages](../../frontend/src/pages/Marketplace), [LearnEntry](../../frontend/src/pages/Student/LearnEntry.jsx).

| Feature | Actual source | Status / limitation |
|---|---|---|
| Marketplace | Catalog search/filter/sort/page, details/previews/instructor/reviews | B |
| Enrollment | Request in details; history/cancel/re-request in StudentPortal; LearnEntry access check | B |
| Enrolled curriculum | My-courses then detail requests, lessons/documents/access presentation | B/C; failed my-courses falls back to public list and default Active presentation |
| Course-specific entry | Access check then curriculum tab redirect | C; selected course ID dropped |
| Lesson completion | Local completed flag and XP/coins update | C; does not call existing completeLesson API |
| Quiz/results | QuizRunner/detail, submit for GUID-backed quizzes | C; fixed course identifier/local mirror and fallback grading/rewards |
| Dashboard/rewards | Game dashboard mapping, HomeTab counters/claims | C; local changes coexist with API data |
| Focus & Flow | Timer/task/artifacts and focus-session request | C; profile studentId absent, fixed ID fallback |
| Rankings/squad | Weekly leaderboard and squads | C; squad prefix mismatch can reject combined loading |
| Profile | Progress/badges display and logout | B/C; persisted Student profile editor not established |
| Reviews | Shared/course-detail own-review forms | B |
| Learning Assistant | CoachTab; §11 | B with limitations |
| Support | Help dialog and own history/detail | B |
| Notifications | No dedicated Student inbox/API consumer found | E; App's fixed unread count is not live evidence |
| Challenges | Mission/challenge-themed UI and quiz/reward experiences | C; labels do not establish Student challenge API integration |

Animated/local counters are not database evidence. Business caches survive logout without account namespacing. Phase 6 should verify persistence using non-demo users, reload and another client.

## 11. Learning Assistant UI

Evidence: StudentPortal **CoachTab** (around line 1726), [aiService](../../frontend/src/services/aiService.js), Phase 2 gateway evidence.

| Capability | Source wiring | Status / limitation |
|---|---|---|
| Indexed deck discovery | GET /api/aireview/learning/slide-decks; source_file/course_id/display_title/total_chunks | B; explicit empty/error/retry; “enrolled” label not access proof |
| Chat | POST /api/aireview/coach/chat with student/course/message/source/session fields | B; selected deck supplies course context; ASP.NET replaces student identity per Phase 2 |
| Breakdown | POST /api/aireview/learn, request_type=breakdown | B; renders section titles/page ranges/topics |
| Whole lecture plan | request_type=plan without selected topic | B; requires deck |
| Section/topic plan | request_type=plan, sub_lecture_id and optional topic | B |
| Explanation | request_type=explain with selection identifiers | B |
| Plan rendering | Ordered sessions, minutes and tasks from response | B; not assessed approval-state persistence |
| Citations | Slide number, relevance %, preview tooltip; source_file guards cross-deck exploration | B; deck title supplies context, filename not always printed |
| Citation follow-up | New slide-explanation chat prompt via gateway | B; not independent source verification |
| Loading/error/retry | isLoading disables repeated actions; error message/retry inputs; discovery retry | B |
| History/reset | Per-mount crypto.randomUUID; messages in component memory; deck-tagged learning messages filtered | A/B; no persisted history restore or explicit reset API found |

Chat rejects empty/fallback replies and surfaces failure. Learning result text uses JSX, not raw HTML. The conversation uses aria-live=polite, errors role=alert, topics details/summary and aria-pressed selection.

Changing decks clears selectedTopic, not all chat history or the session. Leaving the conditionally mounted coach tab loses local messages; remount produces a new session. Server memory was not inspected. Normal chat messages are not all deck-tagged.

Source wiring preserves **React → ASP.NET → internal AI service**. Phase 5 must establish grounding/scope/agent controls; Phase 6 must run actual gateway scenarios. Displayed citations/plans are not verified correctness, latency or shared approval evidence.

## 12. Forms and Validation

Most forms use useState-controlled native inputs, HTML constraints and manual checks.

| Form | Client rules/confirmation | Feedback/limit |
|---|---|---|
| Login/register | Required email/password/name; email type; visibility toggle | Backend errors displayed; invalid elevated registration roles offered; not full backend password validation |
| Admin user | Required fields/password bounds/manual checks; guarded deletion dialog | Dedicated success/error/conflict display; maxLength alone is not UTF-8 byte validation |
| Admin course/module | Required metadata, nonnegative whole order, nonempty allowed files ≤50 MB | Inputs retained, retry and disabled fieldset |
| Instructor course/profile | Required metadata/positive paid price, bounded profile fields | Save errors/busy; labels not uniformly associated |
| Enrollment | Notes, per-row pending state | Server result awaited before reconciliation |
| Review | Rating/comment, delete confirmation | Own-review refresh/notices; form limits vary |
| Support request | Type, trimmed message, 5000-character limit, stable clientRequestId | Validation formatter and retained retry identity |
| Support Admin | Reply/transition rules, resolve confirmation, expectedVersion | 409 reload keeps unsent reply |
| Quiz | Title/questions/options checks; dedicated validation API | Some publication handlers still accept local success after failures |
| AI proposal | Goal/schedule controls | Edits/replans are largely local |

Client validation cannot replace server ownership, input constraints or legal state-transition enforcement. Destructive-action handling is inconsistent: newer governance dialogs preserve errors, while some older deletes suppress backend failures.

## 13. Loading, Empty, Success and Error States

| Area | Coverage | Limitation |
|---|---|---|
| Catalog/details | Skeleton/loading, empty/not-found/error/retry, mutation notices | B; runtime combinations untested |
| HomePage | Loading and empty sections | C; per-request catches convert outage to null/empty, bypassing outer error path |
| Summary/profile | Loading/refresh/strict payload checks/errors/retry | B |
| Admin course | Busy/empty/error/retry, retained input/success | B |
| Support/audit | Loading/empty/list/detail error, cancellation, disabled mutations/conflicts | B |
| User governance | Create/delete notices | C; list/status/role failures often console-only |
| Instructor views | Shared LoadingBlock/ErrorBanner/EmptyState patterns | B; some secondary data errors suppressed |
| Learning | Empty index/loading/errors/disabled controls/retry | B |
| AiReview | Loading/toasts/empty presentation | C; failed approval/rejection can show success |
| Student rewards/quizzes | Celebration/result/progress | C; local fallback is not persisted success |
| App/ErrorBoundary | Blank shell while restoring; render-error refresh screen | C; limited boot messaging/asynchronous coverage |

Newer pages have cancellation/stale-response guards, but there is no universal server-state strategy. Pessimistic, optimistic-without-rollback and local-only operations coexist. ErrorBoundary logs to browser console and displays error.toString; its “engineers notified” wording is not supported by an observed external reporting integration.

## 14. Responsiveness and Accessibility

Evidence: [marketplace.css](../../frontend/src/styles/marketplace.css), [index.css](../../frontend/src/index.css), [MarketplaceNav](../../frontend/src/components/layout/MarketplaceNav.jsx), support/governance/CoachTab components.

| Area | Assessment | Evidence/limit |
|---|---|---|
| Marketplace layout | SOURCE EVIDENCE FOUND | 1160/1024/900/720/560px breakpoints, grids/mobile menu |
| Quiz layout | SOURCE EVIDENCE FOUND | ≤768px modal size/padding rules |
| Console responsiveness | PARTIAL | Flex/wrapping/max widths; fixed sidebars/dense inline layouts untested |
| Semantics | SOURCE EVIDENCE FOUND | Forms/buttons/nav/main/tables/details and selected native dialogs |
| Labels | PARTIAL | IDs/htmlFor/aria-label in newer forms; Login's separate labels lack matching IDs and password toggle lacks accessible name |
| Keyboard/focus | PARTIAL | Native controls, support/dialog focus/Escape handling, marketplace focus-visible; clickable divs and outline:none elsewhere |
| Modal behavior | PARTIAL | Audit role/aria-modal/label; native Admin course dialogs; not a full focus-trap audit |
| Errors/status | SOURCE EVIDENCE FOUND | alert/status roles, Learning live region; console-only paths remain |
| Images/icons | PARTIAL | Avatar/card and decorative aria-hidden patterns; not every control audited |
| Reduced motion | SOURCE EVIDENCE FOUND | Marketplace reduced-motion rule; not all console animation verified |
| Contrast/screen reader/zoom/WCAG | NOT ESTABLISHED | No rendered/manual/automated accessibility run |

Do not claim WCAG compliance or full mobile-console usability. Phase 6 needs keyboard/focus, screen-reader names, contrast, 200% zoom and multiple viewport checks.

## 15. Frontend Security Boundary

| Concern | Source finding | Status |
|---|---|---|
| Route protection | Role shells/boot restore, but no-token cached-user gap | C |
| Menus | Role-sensitive navigation | A/B; not server authorization |
| Tokens | localStorage access/refresh tokens and bearer injection | A/C; same-origin JavaScript can read them |
| Demo credentials | Bundled privileged persona credentials without observed environment gate | C; values redacted |
| Cleanup/isolation | Logout removes four session keys only; business caches/tabs persist | C |
| Role freshness | Interceptor storage updates do not synchronize context immediately; Phase 2 JWT limits | C |
| IDs | Enrollment server identity versus reward browser IDs/fixed fallbacks | C; focus compounds Phase 2 missing caller check |
| Answer data | Browser quiz mirror retains answers/explanations; Student consumes it | C; Phase 2 public quiz detail also exposes keys |
| Workflow data | Unscoped proposal storage contains student/workflow information | C |
| HTML | No dangerouslySetInnerHTML usage found; Learning renders text | A finding, not blanket XSS certification |
| Files | Raw fetch without bearer; helper allows absolute HTTP/HTTPS/blob/data; Admin helper restricts protocol/checks PDF bytes | C; public-static backend issue remains |
| Errors | Console logging and rendered error strings | C; production redaction/central monitoring unverified |
| AI | Gateway calls found, no direct Python call; deck IDs client-selected | B/C; enrollment scope label not enforcement |

No exploit testing occurred. Browser state is not authorization truth; hiding actions cannot repair Phase 2's backend resource/session/file-access gaps.

## 16. Frontend/Backend Contract Findings

Static comparisons, not observed HTTP failures. Backend evidence is Phase 2 except the three narrow rechecks named in §1.

| Finding | Frontend evidence | Backend/contract comparison | Status/consequence |
|---|---|---|---|
| Squad prefix | gamificationService /gamification/squads/* under /api | [TeamsController](../../backend/EduFlow.Api/Controllers/TeamsController.cs) base /api/v1/gamification/squads | C; missing /v1 in list/leaderboard/eligible/mutations |
| Registration roles | Login offers/sends Instructor/Student/Admin; default Instructor | Public registration Student-only in Phase 2 | C; advertised elevated registration rejected |
| Undefined reward method | StudentPortal.handleMissionClaim calls claimGrandReward | Exported method is claimDailyGrandMission | C; caught JS error then local XP/coins; handler makes no reward API call |
| Focus identity | profile.studentId or fixed fallback; profile mapping lacks studentId | Phase 2 API trusts supplied StudentId | C; request can target demo student instead of caller |
| Lesson persistence | handleCompleteLesson changes component course/profile only | Existing completeLesson service/API unused here | C; completion/reward not persisted proof |
| Topic hierarchy | Add Topic creates Lesson then local t-* topic wrapper | Phase 2 has distinct Topic/ContentItem APIs | C; not complete persisted hierarchy CRUD |
| Course entry | LearnEntry stores curriculum tab and redirects without course ID | Portal has no selected-course context from entry | C |
| Quiz “publish” | Assessments.handlePublishQuiz calls createQuiz; caches Active and announces success even after catch | [QuizzesController](../../backend/EduFlow.Api/Controllers/QuizzesController.cs) has separate validation/publication; create assigns request.Status | C; this handler does not establish published server state |
| AI quiz local publication | Courses caches Published q-* object before background create, ignores returned ID | Generated drafts/persistent identity/publication are separate server operations | C |
| Study-plan identity/result | AiReview sends fixed student/course IDs, creates wf-* local proposal, ignores response | [AiReviewController](../../backend/EduFlow.Api/Controllers/AiReviewController.cs) validates Student/course ownership and persists its own ID | C; local plan can diverge or exist without server plan |
| Individual decision | Catch failed approve/reject, then set local state and announce dispatch; fixed displayed approver | API can reject; Phase 2 upstream state also partial | C; no reliable approval/mobile-delivery evidence |
| Batch/edit/replan/revise | Batch approval and edits local; timer simulates regeneration | updateProposal/requestRevision service methods exist but are not called by current AiReview | C; integrated revise action not established |
| Execution summaries | Fixed confidence/timing/validation logs, hash-like values and four-agent labels | Current direction differs; Phase 2 telemetry also partly synthetic | C/D; not signatures, actual execution or performance evidence |
| Student results | Submit failure/non-GUID falls back to client grading/XP | Real backend result exists when successful | C; visible success not shared database state |
| Document fallback | General pdfHelper generates fallback PDF when fetch fails; Admin helper instead errors | Fallback is not uploaded lecture bytes; Phase 2 static files public | C; download/preview alone insufficient evidence |
| Hidden capabilities | Admin course delete/profile edit absent in normal screen | Backend mutation routes exist | UI DOES NOT EXPOSE THIS OPERATION; not forbidden by API |
| Quiz route aliases | quizService uses /api/quizzes | Phase 2 also exposes /api/v1/quizzes | A/B; alias coexistence not itself a mismatch |
| Learning route match | /api/aireview/coach/chat, learn, learning/slide-decks, rag/chat | Phase 2 routes match | B; execution/authorization pending |

The “All Enrolled Lectures” selector displays gateway-discovered decks without a frontend enrollment filter; Phase 2 did not establish equivalent gateway filtering. The scope wording is unsupported, not proof every returned document is unauthorized.

Insights' remedial action shows a queued/dispatched alert and navigates to review without submitting a correlated remediation workflow. It is not completed orchestration.

## 17. E2E/Test Source Inventory

**14 specification files. Every row means TEST SOURCE EXISTS, never TEST PASSES. No suite was executed.**

| Test source | Area/scenario | Real backend/AI assumed? | What it could prove if executed with meaningful assertions | Current status |
|---|---|---|---|---|
| [01-landing.spec.js](../../frontend/e2e/01-landing.spec.js) | Hero/CTA/navigation | Frontend; API-dependent content | Render/navigation assertions | TEST SOURCE EXISTS |
| [02-auth.spec.js](../../frontend/e2e/02-auth.spec.js) | Demo login, role portal, logout | Real seeded login; no route mocks found | Browser auth/navigation for tested accounts | TEST SOURCE EXISTS |
| [03-instructor-ai-review.spec.js](../../frontend/e2e/03-instructor-ai-review.spec.js) | Review/generate/approve | Backend assumed; local simulation can satisfy UI | UI interaction unless persistence additionally checked | TEST SOURCE EXISTS |
| [04-courses.spec.js](../../frontend/e2e/04-courses.spec.js) | Curriculum/course management | Backend/data assumed | Visible course interactions | TEST SOURCE EXISTS |
| [05-student-portal.spec.js](../../frontend/e2e/05-student-portal.spec.js) | Rewards/coach/ranks/profile/focus/quiz | Backend; AI for real coach; local fallbacks elsewhere | UI scenarios, not automatically stored state | TEST SOURCE EXISTS |
| [06-gamification-and-admin.spec.js](../../frontend/e2e/06-gamification-and-admin.spec.js) | Reward/Admin screens, role visibility | Backend/demo personas | UI visibility, not server denial alone | TEST SOURCE EXISTS |
| [08-assessments.spec.js](../../frontend/e2e/08-assessments.spec.js) | Workspace/generation modal | Backend assumed | Authoring UI; not distinct-agent proof | TEST SOURCE EXISTS |
| [09-courses-slidequest.spec.js](../../frontend/e2e/09-courses-slidequest.spec.js) | Generate/run quiz | Backend/AI nominally; local paths intervene | UI flow plus separate persistence checks | TEST SOURCE EXISTS |
| [10-role-header-switcher.spec.js](../../frontend/e2e/10-role-header-switcher.spec.js) | Three-persona switching | Real demo login | Navigation/account switching | TEST SOURCE EXISTS |
| [11-instructor-full-flow.spec.js](../../frontend/e2e/11-instructor-full-flow.spec.js) | Login/create course/module/staff navigation | Backend assumed | Broader Instructor interactions | TEST SOURCE EXISTS |
| [12-learning-agent.spec.js](../../frontend/e2e/12-learning-agent.spec.js) | Chat/breakdown/plan/explain/citations/retry | **Mocked APIs**, user-only localStorage fixture | Payload/render/retry logic; known-port request observation | TEST SOURCE EXISTS |
| [13-learning-agent-live.spec.js](../../frontend/e2e/13-learning-agent-live.spec.js) | Real global/scoped/follow-up chat | Running frontend/API/AI and seeded login | Tested gateway response/citation flow | TEST SOURCE EXISTS; opt-in |
| [14-learning-breakdown-live.spec.js](../../frontend/e2e/14-learning-breakdown-live.spec.js) | Indexed lecture breakdown/topic plan/explain | Services plus indexed lecture | Scoped request/response/UI integration | TEST SOURCE EXISTS; opt-in |
| [15-lms-integration.spec.js](../../frontend/e2e/15-lms-integration.spec.js) | Provisioning/publish/ownership/enrollment/reviews/session isolation/persistence | Real API/browser; not AI acceptance | Persisted LMS/browser/negative scenarios | TEST SOURCE EXISTS |

[Playwright config](../../frontend/playwright.config.js): Chromium/Desktop Chrome, 1280×800, one worker, no retries, 45s test timeout, 10s assertion timeout, HTML/list reporters and screenshots enabled. No webServer configuration. trace=on-first-retry combined with retries=0 does not guarantee traces for initial failures.

Live tests use **EDUFLOW_LIVE_TESTS**; **PLAYWRIGHT_CHANNEL**, **EDUFLOW_EXPECT_EXTRACTIVE** and **E2E_API_BASE_URL** affect selected tests. No credential values are reproduced. LMS setup/cleanup creates accounts/courses and deletes test courses: later execution needs an isolated environment. Nothing was mutated here.

Some older tests target historical labels/navigation while / now mounts HomePage, not LandingPage. Reconcile selectors before evaluating results. Visual approval/reward assertions can be satisfied by local simulation. Mock Learning tests do not verify real auth; known-port Python checks do not prove all network isolation. No current pass count, historical artifact certification, React unit/component coverage or automated accessibility result is asserted.

## 18. Assignment Requirement Mapping

Authority: Phase 0's official React/integration requirements. This assesses source, not marks.

| Requirement | Source evidence | Classification | Gap | Later evidence |
|---|---|---|---|---|
| Functional components | Pages/shared controls | A | Large multi-feature files | Explain boundaries |
| Hooks | State/effect/memo/ref/callback/context | A | Async behavior untested | Phase 6 interactions |
| React Router | App/nested marketplace routes | A/B | Console tabs not deep links | History/refresh/navigation tests |
| Reusable components | Cards/pagination/states/reviews/support | A/B | Uneven reuse | Render evidence |
| Justified state management | Context/hooks/manual fetching | C | Rationale/caching tradeoffs pending | Student-justified ADR |
| ASP.NET integration | Shared client/services | B/C | Squad mismatch/local fallbacks | Real requests/persistence |
| Protected routes | Console gate/boot restore/access entry | C | Cached-user/no-token weakness | Missing/expired/forged-state cases |
| Role navigation | Separate shells/Admin filter | B/C | Demo credentials/menu not authorization | Non-demo roles and server denials |
| CRUD UI | Users/course/module/quiz/review/support | B/C | Local/suppressed-failure operations | Persisted positive/negative CRUD |
| Validation | Native/manual fields/support version | B/C | Inconsistent constraints/roles | Boundary/API-error tests |
| Search | Catalog/users/audit/support | B | Runtime correctness | Query/results |
| Filtering | Catalog/status/actor/date fields | B | Client/server differences | Filter/reset/empty cases |
| Sorting | Catalog API sort; Admin course local sort | B | Not universal | Actual ordering |
| Pagination | Catalog/audit/support | B | Other lists unpaged/local | Page totals/boundaries |
| Dashboards | Admin/Instructor/Student | B/C | Local/synthetic metrics | Backend-value correlation |
| Responsive UI | Breakpoints/menu/quiz modal | C | Console views unvalidated | Multiple viewports |
| Accessibility | Semantics/ARIA/focus patterns | C | Labels/keyboard/contrast gaps | Manual/automated checks |
| Loading states | Skeletons/loading/disabled controls | B/C | Blank boot shell | Slow requests |
| Empty states | Catalog/support/audit/deck messages | B/C | Failure can appear empty | Separate outage/empty cases |
| Success states | Notices/toasts/refetched rows | C | Success without persistence | Reload/second-client assertions |
| Error states | Interceptor/banners/retry/conflicts | C | Suppression/console-only actions | Timeout/failure/conflict cases |
| AI monitoring | AiReview workflow display | C | Local/synthetic data | Phase 5 real contract; Phase 6 trace |
| Execution summaries | Ledger/agent display | C/D | Synthetic timings/validation/hash labels | Authentic redacted traces |
| Approve/reject/revise | Individual API calls; local batch/edit/replan | C | Failed calls show success; revise unused | Authorized stored decisions |
| Cross-platform shared status | Common ASP.NET API subsets | C/E | Browser mirrors; Flutter not inspected | Phases 4–6 integrated scenario |
| React testing | 14 Playwright sources | A/E | No execution; mocks/local paths | Phase 6 dated outcomes |
| Ownership | Logical responsibility relevance | E for authorship | Git not inspected | Phase 7 provenance |

## 19. Confirmed Strengths

- Public marketplace routing and separate Admin/Instructor/Student experiences.
- Actual Context/hook architecture, shared Axios client and broad service coverage.
- Newer governance/support/course screens with validation, retry, busy and concurrency-conflict handling.
- URL-backed catalog search/filter/sort/pagination.
- Learning deck/chat/topic/plan/explanation/citation/retry integration through ASP.NET.
- Separate mocked and opt-in live Learning tests plus a broader LMS integration source.

These do not establish a successful build, current pass or deployment readiness.

## 20. Gaps / Partial / Unverified Areas

| Area | Main finding | Status |
|---|---|---|
| Sessions | Bundled privileged credentials, localStorage exposure, cached-user gate and failed-switch cleanup | C |
| Contracts | Squad prefix, registration role choices and undefined reward method | C |
| Persistence | Local completion/reward/quiz/workflow changes can masquerade as server success | C |
| AI review | Local batch/edit/replan; ignored persistent identity; simulated approver/logs/timing | C/D |
| Student correctness | Fixed quiz/focus IDs, missing focus identity, fallback grade/rewards, dropped course selection | C |
| Curriculum/documents | Local Topic wrapper; generated fallback PDFs | C |
| Errors | Outages reduced to empty data; console-only action failures | C |
| UX/accessibility | Incomplete labels/focus, untested dense console viewports | C/E |
| Runtime | No build/browser/tests/live gateway run in this phase | E |
| Attribution | No Git/PR or exclusive authorship evidence | E |

Primary evidence risk: visible success is sometimes local, not a persisted authorized cross-platform result. No code was fixed under this documentation-only authorization.

## 21. Screenshot Plan

Capture **10 high-value figures later** using actual runtime data. No screenshots generated here. Redact credentials and unnecessary personal data. Pair transactional screenshots with request/test/database or second-client evidence.

| Figure | Role | Route/page | Must be visible | Claim supported | Runtime evidence required? |
|---|---|---|---|---|---|
| 1. Sign-in and role entry | All roles | /login → /console | Real login, returned role/correct shell; no password/token | Auth/navigation | Yes; separate negative/expiry tests |
| 2. Platform summary/user governance | Admin | /console dashboard/admin | API counts and confirmed user mutation or guarded deletion | Admin management | Yes; verify persisted result |
| 3. Support resolution/conflict | Admin | /console support-desk | Thread/reply/status or conflict reload retaining draft | Support workflow | Yes; controlled real records |
| 4. Filtered governance audit | Admin | /console audit-logs | Filters, actual event and safe detail | Traceability | Yes; correlate real mutation |
| 5. Owned curriculum/enrollment | Instructor | /console courses/enrollment-requests | Owned course/module/file and request decision | Academic/access workflow | Yes; verify student access/file bytes |
| 6. Quiz validation/publication | Instructor | /console assessments | Real quiz ID/questions/validation/published state | Assessment business rule | Yes; dedicated publish and reload |
| 7. Authentic AI review | Instructor | /console ai-review | Correlated real proposal/trace/decision/persisted status | Human approval | Yes; resolve or explicitly label current simulated behavior |
| 8. Marketplace/access | Student | /courses → /courses/:id → /learn/:courseId | Filters/sort/page and pending/approved access | Discovery/enrollment | Yes; non-demo account |
| 9. Learning breakdown/plan/citations | Student | /console coach | Indexed deck, topic/page ranges, plan/explanation/citations | Learning gateway integration | Yes; real gateway response |
| 10. Persisted learner progress | Student | /console curriculum/home/ranks | Submission/result/reward after reload or second-client verification | Shared learner state | Yes; local fallback counters insufficient |

Omit or qualify any figure whose real behavior cannot be reproduced. Never present synthetic telemetry, fallback lecture documents, mocked AI answers or local approval as completed runtime evidence.

## 22. Evidence Inputs for Final Report

| Section | Safe inputs from Phase 3 | Still required |
|---|---|---|
| G3 Integrated Architecture | Entry/providers/router, role shells, Axios → ASP.NET, no direct Python call found | Phase 4 Flutter; Phase 5 AI; Phase 6 actual integrated trace |
| G5 React Technical Report | Declared versions; actual state approach; route/service/feature tables; forms/states/accessibility | ADR rationale, real screenshots, runtime checks and disclosed local-only paths |
| G7 React Testing input | 14 filenames, mock/live distinctions, configuration/limitations | Phase 6 dated environment/commands/pass/fail/skip/artifacts |
| G12 Security considerations | Storage/refresh/cleanup, gates/menus, credentials, caches, IDs/files/answer data | Separate remediation; cross-user/session/deployment tests |
| G13 Contribution placeholders | Logical relevance below | Phase 7 commits/PR/reviews/issues and student explanation |

**RELEVANT TO DOCUMENTED RESPONSIBILITY** — allocation is not authorship:

| Member | Relevant React areas | Attribution limit |
|---|---|---|
| Wazni | Admin user/course/governance/support/audit/profile/summary; Learning Assistant integration | Shared auth/services not exclusive |
| Raashidh | Instructor/curriculum/assessment/submissions/feedback/quiz-generation UI | Distinct-agent and authored-code evidence remains Phase 5/7 |
| Atheek | Student participation/progress/gamification/focus/rankings | Shared StudentPortal/API contributions not exclusive |
| Shared | App/auth/services/styling/marketplace/contracts/integration | Git/review provenance uninspected |

No final chapter, personal AI reflection, fabricated result/screenshot or exclusive authorship claim was produced.
