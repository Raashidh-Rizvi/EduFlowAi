# PHASE 0 — AUDIT: Student 2 (Instructor) Responsibility

**Date:** 2026-09-22
**Auditor:** Raashidh M.R. (IT24104191)
**Branch:** `main` (commit `9fbf91e`)
**Baseline:** `dev/origin/dev` (commit `6f6c203`)
**Status:** AUDIT ONLY — NO CODE MODIFICATIONS

---

## 1. ARCHITECTURE MAP

### 1.1 Tech Stack
| Layer | Technology |
|---|---|
| Backend API | ASP.NET Core (.NET 8), EF Core, SQLite |
| Frontend | React 18 + Tailwind CSS |
| Mobile | Flutter 3.x (Dart) |
| AI Microservice | Python 3.12, FastAPI, LangGraph, Pydantic |
| Testing | xUnit (backend), pytest (AI), Playwright (E2E) |

### 1.2 Backend Structure
```
backend/
├── EduFlow.Api/Controllers/          (15 controllers)
│   ├── CoursesController.cs          (1356 lines) — Course/Module/Lesson/Topic/ContentItem CRUD
│   ├── QuizzesController.cs          (1577 lines) — Quiz CRUD, AI gen, grading
│   ├── ChallengesController.cs       (187 lines)  — Challenge CRUD
│   ├── AiReviewController.cs         (531 lines)  — Study plan HITL approval
│   ├── AnalyticsController.cs        (344 lines)  — Dashboard, at-risk, analytics
│   ├── ReportsController.cs          (161 lines)  — Report generation
│   ├── TeamsController.cs            (144 lines)  — Squad management
│   ├── NotificationsController.cs    (129 lines)  — Notifications, broadcast
│   ├── InternalAiToolsController.cs  (501 lines)  — Internal AI service-to-service API
│   ├── BaseApiController.cs          (132 lines)  — Ownership helpers
│   └── AuthController.cs, StudentsController.cs, UsersController.cs, AdminController.cs, GamificationController.cs
├── EduFlow.Core/
│   ├── Entities/Entities.cs          (575 lines)  — Full domain schema
│   ├── DTOs/                         (AssessmentDtos.cs: 254 lines, CourseDtos.cs: 273 lines)
│   ├── Interfaces/                   (IGamificationService, IAiGatewayClient)
│   └── Enums/, Constants/
├── EduFlow.Infrastructure/
│   ├── Services/AiGatewayClient.cs   (587 lines)  — AI HTTP client
│   └── Data/ApplicationDbContext.cs  (456 lines)  — EF Core DbContext
└── EduFlow.Tests/                    (6 test files)
```

### 1.3 AI Agent Structure
```
ai-agent/
├── main.py                           (466 lines)  — FastAPI endpoints
├── agents/
│   ├── content_action.py             (397 lines)  — Tool execution agent
│   ├── quiz_generator.py             (535 lines)  — Quiz generation agent
│   ├── slide_topic_agent.py          (157 lines)  — Slide parsing agent
│   ├── quiz_evaluator_agent.py       (248 lines)  — Grading agent
│   ├── domain_analysis.py            — Student analysis
│   ├── validation_guard.py           — Safety guard
│   └── planner.py                    — Coordinator planner
├── tools/registry.py                 (1013 lines) — 19 tools with RBAC
├── graph/                            — LangGraph workflows
├── models/                           — Pydantic schemas
└── tests/                            (2 test files)
```

### 1.4 Frontend Structure
```
frontend/src/
├── pages/
│   ├── Dashboard/Dashboard.jsx       (1043 lines) — Instructor dashboard
│   ├── Courses/Courses.jsx           (1277+ lines) — Course management
│   ├── Assessments/Assessments.jsx   (1291+ lines) — Quiz management
│   ├── AiReview/AiReview.jsx         (1094+ lines) — AI review HITL
│   ├── Insights/Insights.jsx         (319 lines)  — Analytics
│   ├── Gamification/Gamification.jsx (1082+ lines) — Squads/badges
│   └── Communications/Communications.jsx (197 lines) — Announcements
├── services/
│   ├── courseService.js, quizService.js, aiService.js
│   ├── insightsService.js, gamificationService.js, authService.js, api.js
└── e2e/ (9 Playwright spec files)
```

### 1.5 Flutter Structure
```
mobile/lib/
├── screens/
│   ├── journey/journey_screen.dart   (295 lines)  — Curriculum hierarchy
│   └── quiz/quiz_screen.dart         (470 lines)  — Quiz attempt
└── services/, models/, utils/
```

---

## 2. STUDENT 2 OWNERSHIP MAP

### 2.1 Scope (from `RESPONSIBILITY_MATRIX.md`)
Student 2 owns: **Academic Curriculum, Assessment, AI Content Management, AI Agents**

### 2.2 Per-Feature Ownership Status

| # | Feature | Backend | AI | React | Flutter | Tests | Status |
|---|---------|---------|----|----|----|----|----|
| 2.1 | Course CRUD + Hierarchy | CoursesController.cs ✅ | — | Courses.jsx ✅ | journey_screen.dart ⚠️ | InstructorOwnershipTests ✅ | PARTIAL |
| 2.2 | Module/Topic/ContentItem CRUD | CoursesController.cs ✅ | — | Courses.jsx ✅ | journey_screen.dart ⚠️ | — | PARTIAL |
| 2.3 | Lesson CRUD + Completion | CoursesController.cs ✅ | — | Courses.jsx ✅ | ❌ | — | PARTIAL |
| 2.4 | File Upload (PDF/Slide) | CoursesController.cs ✅ | slide_topic_agent.py ✅ | Courses.jsx ✅ | ❌ | — | PARTIAL |
| 2.5 | Quiz CRUD + Validation | QuizzesController.cs ✅ | — | Assessments.jsx ✅ | quiz_screen.dart ⚠️ | QuizPublicationTests ✅ | PARTIAL |
| 2.6 | Quiz AI Generation | QuizzesController.cs ✅ | quiz_generator.py ✅ | Assessments.jsx ✅ | ❌ | — | PARTIAL |
| 2.7 | Quiz Grading | QuizzesController.cs ✅ | quiz_evaluator_agent.py ✅ | — | quiz_screen.dart ⚠️ | AssessmentQuizTests ✅ | PARTIAL |
| 2.8 | Quiz Publication Flow | QuizzesController.cs ✅ | — | Assessments.jsx ✅ | ❌ | QuizPublicationTests ✅ | PARTIAL |
| 2.9 | Challenge CRUD | ChallengesController.cs ⚠️ | — | — | ❌ | — | PARTIAL |
| 2.10 | AI Study Plan Review (HITL) | AiReviewController.cs ✅ | main.py ✅ | AiReview.jsx ✅ | ❌ | AnalyticsAiReviewTests ✅ | PARTIAL |
| 2.11 | AI Topology/Tools Registry | AiReviewController.cs ✅ | tools/registry.py ✅ | AiReview.jsx ✅ | ❌ | — | PARTIAL |
| 2.12 | Analytics Dashboard | AnalyticsController.cs ✅ | — | Insights.jsx ✅ | ❌ | AnalyticsAiReviewTests ✅ | PARTIAL |
| 2.13 | Reports Generation | ReportsController.cs ✅ | — | — | ❌ | — | PARTIAL |
| 2.14 | Squad/Team Management | TeamsController.cs ⚠️ | — | Gamification.jsx ✅ | ❌ | — | PARTIAL |
| 2.15 | Notifications/Broadcast | NotificationsController.cs ✅ | — | Communications.jsx ✅ | ❌ | — | PARTIAL |
| 2.16 | AI Gateway Integration | AiGatewayClient.cs ✅ | — | — | ❌ | — | PARTIAL |
| 2.17 | Instructor Dashboard | AnalyticsController.cs ✅ | — | Dashboard.jsx ✅ | ❌ | — | PARTIAL |

---

## 3. STUDENT 1 DEPENDENCIES

| Dependency | Source | Status | Risk |
|---|---|---|---|
| User auth/JWT | AuthController.cs (Student 1) | IMPLEMENTED | Low — already working |
| Role-based auth attributes | `[Authorize(Roles="Instructor")]` | IMPLEMENTED | Low |
| Audit logging | AuditLog entity (Student 1) | IMPLEMENTED | Low |
| Admin settings | ec.adminsettings (Student 1) | N/A | None for S2 scope |
| Course ownership validation | BaseApiController helpers | IMPLEMENTED | Low |

**Verdict:** Student 1 dependencies are fully met. No blocking issues.

---

## 4. STUDENT 3 DEPENDENCIES

| Dependency | Source | Status | Risk |
|---|---|---|---|
| Student enrollment | Enrollment entity (Student 3 scope) | IMPLEMENTED | Low |
| Lesson completion tracking | LessonCompletion entity | IMPLEMENTED | Low |
| Submission/grading | Submission entity (Student 3 quiz-taking) | IMPLEMENTED | Low |
| XP/coin rewards | GamificationService (Student 3) | IMPLEMENTED | Low |
| Badge system | Badge entity (Student 3) | IMPLEMENTED | Low |
| Streak tracking | StudentStreak entity (Student 3) | IMPLEMENTED | Low |

**Verdict:** Student 3 dependencies are fully met. No blocking issues.

---

## 5. EXISTING FUNCTIONALITY (IMPLEMENTED)

### 5.1 Backend
| Feature | Controller | Lines | Evidence |
|---|---|---|---|
| Course CRUD | CoursesController | 1-200 | Full CRUD + hierarchy |
| Module CRUD | CoursesController | 200-400 | CRUD + ordering |
| Topic CRUD | CoursesController | 400-500 | CRUD + display order |
| ContentItem CRUD | CoursesController | 500-600 | CRUD + parent-child |
| Lesson CRUD | CoursesController | 600-700 | CRUD + completion |
| Enrollment | CoursesController | 700-800 | Enroll/unenroll |
| File Upload | CoursesController | 800-900 | PDF + slide upload |
| Quiz CRUD | QuizzesController | 1-200 | Full CRUD |
| Quiz Validation | QuizzesController | 200-300 | Business rules |
| Quiz Publish/Unpublish | QuizzesController | 300-400 | Status workflow |
| Quiz AI Generation | QuizzesController | 400-500 | AI gateway integration |
| Quiz Grading | QuizzesController | 500-600 | Manual + AI grading |
| Quiz Submissions | QuizzesController | 600-700 | Submit + retrieve |
| Challenge CRUD | ChallengesController | 1-187 | Basic CRUD |
| AI Study Plan Review | AiReviewController | 1-531 | Full HITL workflow |
| AI Topology | AiReviewController | — | Agent topology endpoint |
| AI Tools Registry | AiReviewController | — | Tools registry endpoint |
| Analytics Dashboard | AnalyticsController | 1-344 | KPIs + at-risk |
| Reports | ReportsController | 1-161 | Generate + retrieve |
| Teams/Squads | TeamsController | 1-144 | Basic CRUD |
| Notifications | NotificationsController | 1-129 | CRUD + broadcast |
| AI Gateway | AiGatewayClient | 1-587 | 15 HTTP methods |
| Internal AI API | InternalAiToolsController | 1-501 | 6 endpoints |

### 5.2 AI Agent
| Feature | Agent | Lines | Evidence |
|---|---|---|---|
| Content Hierarchy Tool | content_action.py | 1-100 | Tool execution |
| Student Progress Tool | content_action.py | 100-200 | Progress retrieval |
| Quiz Results Tool | content_action.py | 200-300 | Quiz data retrieval |
| Schedule Generation | content_action.py | 300-397 | Weekly schedule |
| Quiz Generation | quiz_generator.py | 1-535 | Bloom's taxonomy |
| Slide Parsing | slide_topic_agent.py | 1-157 | Topic extraction |
| Quiz Evaluation | quiz_evaluator_agent.py | 1-248 | Deterministic + AI grading |
| Tool Registry | registry.py | 1-1013 | 19 tools + RBAC |
| FastAPI Endpoints | main.py | 1-466 | 10+ endpoints |

### 5.3 React
| Feature | Page | Lines | Evidence |
|---|---|---|---|
| Instructor Dashboard | Dashboard.jsx | 1-1043 | KPIs, at-risk, activities |
| Course Management | Courses.jsx | 1-1277 | Full CRUD + hierarchy |
| Quiz Management | Assessments.jsx | 1-1291 | Full CRUD + AI gen |
| AI Review HITL | AiReview.jsx | 1-1094 | Proposal review |
| Analytics | Insights.jsx | 1-319 | Charts + metrics |
| Gamification | Gamification.jsx | 1-1082 | Squads + badges |
| Communications | Communications.jsx | 1-197 | Announcements |

### 5.4 Tests
| Test File | Framework | Tests | Evidence |
|---|---|---|---|
| InstructorOwnershipTests | xUnit | 52+ | Ownership validation |
| QuizPublicationTests | xUnit | — | Publication workflow |
| AssessmentQuizTests | xUnit | — | Quiz CRUD + grading |
| AnalyticsAiReviewTests | xUnit | — | Analytics + AI review |
| test_validation.py | pytest | 24 | AI agent verification |
| test_domain_analysis_smoke.py | pytest | 5 | Domain analysis smoke |
| Playwright E2E | Playwright | 9 spec files | Instructor flows |

---

## 6. MISSING FUNCTIONALITY

| # | Feature | Layer | Status | Priority |
|---|---------|-------|--------|----------|
| 6.1 | Challenge ownership checks | Backend | **BROKEN** — No `[Authorize]` or ownership validation on ChallengesController | P0 |
| 6.2 | Team ownership/authorization | Backend | **BROKEN** — No `[Authorize]` on TeamsController | P0 |
| 6.3 | Quiz upload route mismatch | Backend | **BROKEN** — Frontend calls `/quizzes/upload-quiz` but backend has no `[HttpPost("upload-quiz")]` route | P0 |
| 6.4 | Quiz submit endpoint mismatch | Backend | **PARTIAL** — Frontend calls `POST /quizzes/submit` with `{quizId, answers}` but backend expects different shape | P1 |
| 6.5 | Flutter content detail view | Flutter | **NOT IMPLEMENTED** — journey_screen.dart shows hierarchy but no content detail | P1 |
| 6.6 | Flutter quiz server submission | Flutter | **NOT IMPLEMENTED** — quiz_screen.dart has no server-side submission | P1 |
| 6.7 | Flutter file upload | Flutter | **NOT IMPLEMENTED** — No upload capability in mobile | P2 |
| 6.8 | Report generation (instructor) | React | **NOT IMPLEMENTED** — ReportsController exists but no React page calls it | P2 |
| 6.9 | Challenge management UI | React | **NOT IMPLEMENTED** — No Challenges page in React | P2 |
| 6.10 | Notification read/dismiss | Backend | **PARTIAL** — No read/dismiss endpoints, only list + broadcast | P2 |

---

## 7. SECURITY VULNERABILITIES

| # | Vulnerability | Severity | Location | Status |
|---|--------------|----------|----------|--------|
| 7.1 | **Challenge CRUD: No auth** — Any unauthenticated user can create/edit/delete challenges | CRITICAL | ChallengesController.cs | BROKEN |
| 7.2 | **Team CRUD: No auth** — Any unauthenticated user can create/edit/delete squads | CRITICAL | TeamsController.cs | BROKEN |
| 7.3 | **AI auto-publication** — No enforcement preventing AI from auto-publishing quizzes without instructor approval | HIGH | QuizzesController.cs | PARTIAL |
| 7.4 | **Student answer visibility** — No check preventing instructor from seeing student answers on unpublished quizzes | MEDIUM | QuizzesController.cs | UNKNOWN |
| 7.5 | **File upload validation** — No file type/size validation on upload endpoints | MEDIUM | CoursesController.cs | PARTIAL |
| 7.6 | **Internal AI API key** — Shared secret "X-Internal-Api-Key" hardcoded in filter | LOW | InternalServiceAuthFilter | DOCUMENTED ONLY |

---

## 8. API MISMATCHES

### 8.1 Frontend → Backend Mismatches

| # | Frontend Call | Backend Route | Issue | Status |
|---|--------------|---------------|-------|--------|
| 8.1 | `POST /quizzes/upload-quiz` | No matching route | **BROKEN** — UploadQuizRequest DTO exists but no controller endpoint | BROKEN |
| 8.2 | `POST /quizzes/submit` with `{quizId, answers}` | `POST /quizzes/submit` with `SubmitQuizRequest` | **PARTIAL** — Shape mismatch possible | UNKNOWN |
| 8.3 | `GET /courses/students/available` | No matching route | **BROKEN** — Frontend calls but backend has no endpoint | BROKEN |
| 8.4 | `POST /courses/modules/{moduleId}/categorize-topics` | No matching route | **BROKEN** — Frontend calls but backend has no endpoint | BROKEN |

### 8.2 Backend → AI Agent Mismatches

| # | Backend Call | AI Agent Route | Issue | Status |
|---|-------------|---------------|-------|--------|
| 8.5 | AI Gateway HTTP calls | FastAPI `/api/v1/*` | **IMPLEMENTED** — Routes match | OK |
| 8.6 | Internal AI API calls | `internal/ai-tools/*` | **IMPLEMENTED** — Protected by InternalServiceAuthFilter | OK |

### 8.3 API Service → AI Agent Mismatches

| # | Frontend AI Service | AI Agent Route | Issue | Status |
|---|-------------------|---------------|-------|--------|
| 8.7 | `POST /aireview/orchestrate` | `POST /api/v1/study-plan/orchestrate` | **PARTIAL** — AiReviewController proxies correctly | OK |
| 8.8 | `POST /aireview/generate-quiz` | `POST /api/v1/quiz/generate` | **PARTIAL** — AiReviewController proxies correctly | OK |

---

## 9. DATABASE RISKS

| # | Risk | Severity | Evidence | Status |
|---|------|----------|----------|--------|
| 9.1 | No migration for quiz upload schema | LOW | UploadQuizRequest DTO exists but no DB changes needed | OK |
| 9.2 | Challenge.CourseId is nullable (SetNull) | MEDIUM | EF config: `OnDelete(DeleteBehavior.SetNull)` — challenges can exist without courses | UNKNOWN |
| 9.3 | ContentItem.TopicId is nullable (SetNull) | LOW | Intentional — content items can exist directly under modules | OK |
| 9.4 | No index on Assessment.ScopeId | LOW | Queries filter by ScopeId frequently | PARTIAL |
| 9.5 | No index on Submission.StudentId + AssessmentId | LOW | Composite query pattern | PARTIAL |
| 9.6 | Seed data hardcoded password hash | LOW | `$2b$11$XttOyjKFmPO5VWTsm9VBpu4qGcJOb/40AFmKfMSVPoBc6FW8ehWYK` | DOCUMENTED ONLY |

---

## 10. AI INTEGRATION GAPS

| # | Gap | Layer | Status | Priority |
|---|-----|-------|--------|----------|
| 10.1 | AI auto-publication bypass | Backend | **PARTIAL** — Quiz can be published without HITL approval | P0 |
| 10.2 | AI evaluator not integrated into quiz submission flow | Backend | **PARTIAL** — quiz_evaluator_agent.py exists but not called during submission | P1 |
| 10.3 | Slide topic extraction not triggered on upload | Backend | **PARTIAL** — slide_topic_agent.py exists but upload doesn't auto-trigger | P1 |
| 10.4 | AI agent health check missing | AI | **NOT IMPLEMENTED** — No `/health` endpoint in FastAPI | P2 |
| 10.5 | AI agent rate limiting | AI | **NOT IMPLEMENTED** — No rate limiting on AI endpoints | P2 |
| 10.6 | AI agent retry/fallback | Backend | **IMPLEMENTED** — AiGatewayClient has retry logic | OK |

---

## 11. FLUTTER GAPS

| # | Gap | File | Status | Priority |
|---|-----|------|--------|----------|
| 11.1 | No content detail view | journey_screen.dart | **NOT IMPLEMENTED** — Shows hierarchy but tapping a topic shows nothing | P0 |
| 11.2 | No quiz server submission | quiz_screen.dart | **NOT IMPLEMENTED** — Quiz runs locally, never submits to backend | P0 |
| 11.3 | No file upload | — | **NOT IMPLEMENTED** | P2 |
| 11.4 | No instructor-specific screens | — | **NOT IMPLEMENTED** — Mobile is student-only | P2 |
| 11.5 | No AI review in mobile | — | **NOT IMPLEMENTED** | P2 |
| 11.6 | API base URL hardcoded | main.dart | **PARTIAL** — Uses localhost | P1 |
| 11.7 | No error handling on API calls | quiz_screen.dart | **PARTIAL** | P1 |

---

## 12. TESTING GAPS

| # | Gap | Layer | Status | Priority |
|---|-----|-------|--------|----------|
| 12.1 | No Playwright tests for quiz CRUD | E2E | **NOT IMPLEMENTED** — 08-assessments.spec.js only navigates | P0 |
| 12.2 | No Playwright tests for course CRUD | E2E | **NOT IMPLEMENTED** — 04-courses.spec.js only navigates | P1 |
| 12.3 | No Playwright tests for file upload | E2E | **NOT IMPLEMENTED** | P1 |
| 12.4 | No Playwright tests for challenge management | E2E | **NOT IMPLEMENTED** | P1 |
| 12.5 | No AI agent integration tests with real DB | AI | **NOT IMPLEMENTED** — Tests use mocked data | P1 |
| 12.6 | No Flutter unit/widget tests | Flutter | **NOT IMPLEMENTED** | P2 |
| 12.7 | No backend integration tests for AI review | Backend | **PARTIAL** — AnalyticsAiReviewTests exists | P2 |
| 12.8 | Python AI tests: only 2 test files | AI | **PARTIAL** — 29 tests total but limited coverage | P2 |

---

## 13. DEPLOYMENT GAPS

| # | Gap | Status | Priority |
|---|-----|--------|----------|
| 13.1 | No CI/CD pipeline | **NOT IMPLEMENTED** | P1 |
| 13.2 | No Docker configuration | **NOT IMPLEMENTED** | P2 |
| 13.3 | No environment variable management | **PARTIAL** — appsettings.json exists | P2 |
| 13.4 | No database migration automation | **NOT IMPLEMENTED** | P2 |
| 13.5 | No AI agent deployment config | **NOT IMPLEMENTED** | P2 |

---

## 14. EXACT RECOMMENDED IMPLEMENTATION ORDER

### Phase 1 (P0 — Security & Critical Fixes)
1. Add `[Authorize(Roles="Instructor")]` + ownership checks to ChallengesController
2. Add `[Authorize]` + ownership checks to TeamsController
3. Add missing `POST /quizzes/upload-quiz` endpoint
4. Add missing `GET /courses/students/available` endpoint
5. Add missing `POST /courses/modules/{moduleId}/categorize-topics` endpoint
6. Fix quiz submit endpoint shape mismatch

### Phase 2 (P0 — Flutter Critical)
7. Implement Flutter content detail view
8. Implement Flutter quiz server submission

### Phase 3 (P1 — AI Integration)
9. Integrate AI evaluator into quiz submission flow
10. Trigger slide topic extraction on upload
11. Enforce HITL approval before quiz publication

### Phase 4 (P1 — Testing)
12. Add Playwright tests for quiz CRUD
13. Add Playwright tests for course CRUD
14. Add backend integration tests

### Phase 5 (P2 — Missing Features)
15. Add report generation UI
16. Add challenge management UI
17. Add notification read/dismiss
18. Add Flutter file upload
19. Add Flutter instructor screens

### Phase 6 (P2 — Deployment)
20. Add CI/CD pipeline
21. Add Docker configuration
22. Add database migration automation

---

## 15. PRIORITIZED PHASE 1 TASK LIST

| # | Task | Priority | Effort | Files |
|---|------|----------|--------|-------|
| T1 | Add `[Authorize]` + ownership to ChallengesController | P0 | 2h | ChallengesController.cs, BaseApiController.cs |
| T2 | Add `[Authorize]` + ownership to TeamsController | P0 | 2h | TeamsController.cs, BaseApiController.cs |
| T3 | Add `POST /quizzes/upload-quiz` endpoint | P0 | 4h | QuizzesController.cs, AssessmentDtos.cs |
| T4 | Add `GET /courses/students/available` endpoint | P0 | 2h | CoursesController.cs |
| T5 | Add `POST /courses/modules/{moduleId}/categorize-topics` endpoint | P0 | 3h | CoursesController.cs, InternalAiToolsController.cs |
| T6 | Fix quiz submit endpoint shape | P0 | 2h | QuizzesController.cs, AssessmentDtos.cs |
| T7 | Implement Flutter content detail view | P0 | 4h | journey_screen.dart, new content_detail_screen.dart |
| T8 | Implement Flutter quiz server submission | P0 | 4h | quiz_screen.dart, quiz_service.dart |

---

*End of PHASE 0 Audit. No code was modified.*
