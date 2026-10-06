# LMS Architecture Audit — Phase 1 & 2

Status: **audit only, no code changed.** Date: 2026-10-01. Baseline on `main` @ `8a0f6ed`:
`dotnet test backend/EduFlow.slnx` → **491 passed, 0 failed, 6 skipped** (the 6 PostgreSQL-only tests).

This document covers Phase 1 (understand the current system) and Phase 2 (the target domain model) of the refactor brief. It ends with a migration plan and the decisions that need an owner before Phase 3 can start.

---

## 1. Current system map

| Layer | Technology | Where |
|---|---|---|
| Web UI | React 18 + Vite (JSX, no TS), axios | `frontend/src` |
| Mobile | Flutter (consumes `/quizzes/{id}/start`, `/gamification/dashboard`, course hierarchy) | `mobile/lib` |
| API | ASP.NET Core 8, controllers talk to `ApplicationDbContext` directly | `backend/EduFlow.Api` |
| Domain | Entities, enums, DTOs (no domain services) | `backend/EduFlow.Core` |
| Infra | EF Core + PostgreSQL, a few services (Gamification, Auth, Rating, Support, Audit) | `backend/EduFlow.Infrastructure` |
| AI | FastAPI: Learning Agent, RAG (Chroma + Gemini embeddings/chat), slide "quiz generator" | `ai-agent` |

**No LangGraph or LangChain exists in the code.** The README and `package.json` mention LangGraph, and the API returns "agent topology" JSON, but none of it is implemented. Gemini is used only for RAG chat and embeddings (`ai-agent/rag/rag_service.py:270`, `vector_store.py:41`).

### Actual quiz data flow today

```
Instructor UI ──POST /quizzes/generate-ai──► QuizzesController.GenerateAiQuiz
                                               │ (resolves PDF path, builds payload)
                                               ▼
                                AiGatewayClient → Python /api/v1/ai/slides/generate-quiz
                                               │  rag_service.generate_quiz  ← TEMPLATE STRINGS, no LLM
                                               ▼
                         Assessment(Status=Draft) + Questions persisted
Frontend ALSO writes the quiz to localStorage (quizStorageHelper) and broadcasts window events

Student UI ──POST /quizzes/{id}/start──► returns questions (random AttemptId, NOT persisted)
           ──POST /quizzes/submit──────► inline grading in controller → Submission + SubmissionAnswers
                                          → SaveChanges → GamificationService.CalculateAndAwardQuizRewardAsync → SaveChanges
           (Courses.jsx "SlideQuest" runner grades entirely in the browser and never calls the API)
```

Nothing downstream of `Submission` exists: there is no course grade, no grading policy, no assessment weights, and no module or course progress calculation.

---

## 2. Entity inventory (A–E)

### A/B. Existing entities and relationships (`backend/EduFlow.Core/Entities/Entities.cs`)

```
User ─┬─< Course (InstructorId) ─┬─< Module ─┬─< Topic ─< ContentItem (self-ref parent)
      │                          │           ├─< Lesson                      (parallel content tree)
      │                          │           └─< ContentItem
      │                          ├─< Enrollment >── User
      │                          ├─< Assessment ──1 QuizConfiguration
      │                          │      ├─ ScopeType + ScopeId (polymorphic, no FK)
      │                          │      ├─ ModuleScopeId / TopicScopeId / ContentItemScopeId (typed FKs)
      │                          │      ├─< Question ─< QuestionOption
      │                          │      └─< Submission ─< SubmissionAnswer >── Question
      │                          └─< Challenge (QuestionsJson blob)
      ├─ StudentXp, StudentStreak, StudentBadge >── Badge, XpTransaction, PersonalBestRecord,
      │  SkillMastery, StudentDailyMission, StudentChallenge
      └─ AuditLog, Notification, StudyPlan, AiWorkflowLog, SupportTicket …
```

### C. Duplicate representations (two sources of truth)

| Concept | Representation 1 | Representation 2 | Which one is used |
|---|---|---|---|
| Assessment → module | `ScopeType`+`ScopeId` (no FK) | `ModuleScopeId` FK | Inconsistent. `GenerateAiQuiz` and `UploadQuiz` never set `ModuleScopeId`, so marketplace module counts (`MarketplaceController.cs:341-359`) miss AI quizzes |
| Correct answer | `Question.CorrectAnswer` string + `OptionsJson` | `QuestionOption.IsCorrect` rows | Grading uses the string; options rows are display-only and can disagree |
| Quiz settings | `Assessment.PassingScorePercent/AttemptsAllowed/TimeLimit*/Randomize*/FeedbackMode` | `QuizConfiguration.PassPercentage/AttemptsAllowed/…` | Assessment fields win; QuizConfiguration is write-only |
| Time limit | `Assessment.TimeLimitSeconds` | `Assessment.TimeLimitMinutes` | Both written, both read |
| Course published | `Course.IsPublished` (bool) | `Course.Status` (free string) | Both |
| Module content | `Lesson` | `Topic` → `ContentItem` | Both live. `LessonCompletion` has two nullable FKs |
| Assessment kind | `AssessmentType` (`Quiz, Assignment, Exam, BossBattle, TopicQuiz, ModuleQuiz, CourseQuiz, LessonQuiz`) | `QuizScopeType` | `AssessmentType` mixes *kind* with *scope* |
| Generated quizzes | `Assessments` table | `localStorage['eduflow_generated_quizzes']` | Frontend merges both, so drafts and deleted quizzes reappear |
| Pass / fail | `Submission.Passed` uses `quiz.PassingScorePercent` | `GamificationService` hardcodes `>= 70` (`GamificationService.cs:145`) | They disagree for any quiz not set to 70% |

### D. Missing entities and relationships

- **Attempt lifecycle.** No persisted attempt. `StartQuizAttempt` returns `Guid.NewGuid()` and stores nothing (`QuizzesController.cs:1490`). There is no IN_PROGRESS/SUBMITTED/EVALUATED status and no attempt number.
- **Evaluation record.** Only `PointsAwarded`/`IsCorrect` per answer. There is no feedback, evaluator method, max marks, AI confidence, or model version.
- **Rubrics.** None exist.
- **Grading policy and grade scale.** None. There are no letter grades anywhere.
- **Assessment weights.** None. There is no course-level aggregation.
- **Course grade / result.** None.
- **Module progress and course progress.** `Enrollment.ProgressPercentage` is set to `0.0` on enrollment (`CoursesController.cs:1375, 1767`). After that it is only ever set by seed data (`DbInitializer.cs:366, 459, 483`; `MarketplaceSeedData.cs:150`).
- **Module learning objectives.** These exist only at course level (`Course.LearningOutcomesJson`).
- **Assessment versioning.** None. See E-3.
- **Gamification rules table.** All XP values are code constants.
- **Domain events.** Records exist in `EduFlow.Core/Events/DomainEvents.cs` but nothing publishes or handles them.

### E. Broken relationships

1. **Module-scoped quiz with no ScopeId sets `ModuleScopeId = courseId`** (`QuizzesController.cs:289`). This is either an FK violation (500) or a wrong link.
2. **Deleting an assessment cascades to every student Submission** (`ApplicationDbContext.cs:335-338`), which silently destroys academic records.
3. **Editing a quiz that already has attempts fails.** `UpdateQuiz` deletes and re-inserts all questions (`QuizzesController.cs:534`), but `SubmissionAnswer → Question` is `Restrict` (`ApplicationDbContext.cs:351-354`), so the save throws once anyone has submitted. If the FK were relaxed, history would be rewritten instead.
4. **`SkillMastery` is matched by `TopicName` only, not by course** (`GamificationService.cs:310`). AI quizzes stamp every question with `LO-01/02/03` (`QuizzesController.cs:1143`), so mastery from every AI quiz in every course collapses into three fake skills.

---

## 3. Findings by category (F–P)

Severity: **P0** = security or academic-integrity breach. **P1** = wrong marks/grades/XP. **P2** = structural or maintainability.

### F. Hardcoded business rules

| Sev | Rule | Location |
|---|---|---|
| P1 | Scope-based default XP 30/35/75/150 (duplicated 3×) | `QuizzesController.cs:273-280, 967-974`; `GamificationService.cs:120-127` |
| P1 | Pass threshold 70% in XP engine | `GamificationService.cs:145`, `:366` |
| P1 | High-score bonus tiers 100/90/80 → 40/20/10, streak tiers, improvement formula, coins = XP/4, level coins = level×50 | `GamificationService.cs:129-198, 279` |
| P1 | Every AI question = 10 marks; correct answer defaults to `"A"` | `QuizzesController.cs:1089, 1141` |
| P1 | `AttemptsAllowed = 3` on upload; never enforced anywhere | `QuizzesController.cs:421` |
| P2 | XP cap 250 (duplicated) | `QuizzesController.cs:703, 801` |
| P2 | "Is fallback" detected by prompt containing `"Regenerated Scenario"` | `QuizzesController.cs:807` |
| P2 | Mastery colour thresholds 80/60 | `GamificationService.cs:339, 549` |
| P2 | Daily missions, grand reward 150 XP / 30 coins | `GamificationService.cs:450-453, 600-601` |
| P2 | Global XP multiplier held in a `static` field; any instructor can change it for the whole platform; resets on restart | `GamificationService.cs:1014-1021`, `GamificationController.cs:158-164` |

### G/H. Business logic in the frontend (duplicating or replacing backend logic)

| Sev | What | Location |
|---|---|---|
| P0 | **Courses.jsx "SlideQuest" runner grades entirely client-side and never persists.** It uses hardcoded keyword lists (`consistency, latency, quorum…`) for short answers, gives any non-empty Matching answer 50%, and invents XP and badges | `frontend/src/pages/Courses/Courses.jsx:1002-1115` |
| P0 | **Assessments.jsx fabricates a full result when submit fails.** Unanswered Q1 counts as correct; it also invents XP, level 12, total XP 6525 and a previous best of 72% | `Assessments.jsx:859-895` |
| P1 | StudentPortal computes the score locally and shows it if the backend fails | `StudentPortal.jsx:1386-1450` |
| P1 | Students see correct/incorrect immediately, because the quiz is loaded with answers via `GET /quizzes/{id}` | `StudentPortal.jsx:1386-1392, 3798, 3927` |
| P1 | localStorage quiz store with defaults (`courseId 4444…`, `SE3090`, placeholder options, `correctAnswer = options[0]`) | `frontend/src/utils/quizStorageHelper.js:18-41, 108` |
| P2 | Pass/XP/level fallbacks scattered through the UI (`quiz.xpReward \|\| 80`, `passThreshold \|\| 70`) | `StudentPortal.jsx`, `Assessments.jsx`, `Courses.jsx` |

### I. AI disconnected from persistent data

| Sev | Finding | Location |
|---|---|---|
| P0 | **The quiz "generator" never calls an LLM.** `rag_service.generate_quiz` emits template sentences per slide page; **every correct answer is index 0**; without slides it returns the same "Dependency Inversion" question N times | `ai-agent/rag/rag_service.py:354-428` |
| P1 | .NET sends `selected_topics` and `question_types`; Python reads `target_topics` and supports only 4-option MCQ, so instructor topic and type choices are ignored | `QuizzesController.cs:1056-1057` vs `ai-agent/models/schemas.py:305-321` |
| P1 | Module description, learning objectives and content items are not sent, only titles and a PDF path | `QuizzesController.cs:1041-1058` |
| P1 | **Question regeneration route does not exist in Python** (`/api/v1/ai/questions/{id}/regenerate`). Every call 404s → the hardcoded "cache invalidation / transactional outbox" question **silently overwrites the instructor's question** | `AiGatewayClient.cs:186-203`, `QuizzesController.cs:1337-1358`, `ai-agent/main.py` (route absent) |
| P1 | AI `points`, `blooms_taxonomy_level` and `slide_citation` are partly discarded; `LearningObjective` is fabricated (`LO-0x`) | `QuizzesController.cs:1141-1143` |
| P2 | `AiGatewayClient` returns canned "fallback" JSON for topology, metrics, workflows and grading, which presents fake data as AI output | `AiGatewayClient.cs:245-600` |
| P2 | No AI evaluation of subjective answers. Short answers use keyword overlap (see J) | — |

### J. Marking and evaluation failures (`QuizzesController.SubmitQuiz`, `:1503-1688`)

| Sev | Finding |
|---|---|
| P0 | **No enrollment check, no Published check, no attempt limit, no time-limit enforcement.** Any logged-in user can submit any quiz, including drafts, unlimited times, and earn base XP each time |
| P1 | **`Math.Clamp(x, 4, q.Points)` throws `ArgumentException` when a short answer is longer than 15 characters and `Points < 4`** (`:1593`). Submit returns 500 and no result is saved |
| P1 | Short-answer marking = keyword overlap, with a floor of 4 marks for any answer longer than 15 characters (`:1585-1597`) |
| P1 | Matching: any non-empty wrong answer gets 50% (`:1578`) |
| P1 | FillInBlank: substring match, so "not a b-tree index" matches "b-tree index" (`:1569`) |
| P1 | MultipleSelect: split on `,`, so options containing commas cannot be marked (`:1559-1560`) |
| P1 | Grading compares against the `CorrectAnswer` string, not `QuestionOption.IsCorrect` |
| P1 | `timeSpentSeconds: 480` is hardcoded and feeds personal-best records (`:1658`) |
| P1 | Response reports `PERFECT_SCORE` as unlocked even when it wasn't (`:1664`) |
| P2 | `catch {}` swallows metadata parse errors (`:1555`) |
| P2 | Marking logic lives in the controller; existing tests (`Phase4_GradingTests.cs`) lock in the half-credit and substring behaviours above |

### K. Grade calculation

There isn't one: no letter grades, weights, grading policy or course total. The instructor "average" is a plain mean of submission percentages (`QuizzesController.cs:1741`).

### L. Gamification synchronisation failures

| Sev | Finding | Location |
|---|---|---|
| P0 | **Free 150 XP per day.** Opening the dashboard seeds today's missions *already completed* (`IsCompleted = true`, `CurrentCount = TargetCount`), and `claim-grand` then pays out | `GamificationService.cs:446-456, 578-621` |
| P0 | **Focus-session XP IDOR.** `StudentId` comes from the request body, so any user can grant XP to any account | `GamificationDtos.cs:265-269`, `GamificationController.cs:140-149`, `GamificationService.cs:1023` |
| P0 | **Challenge submit awards full XP without evaluating anything, and can be repeated** | `ChallengesController.cs:136-185` |
| P1 | Fake values when a student has no data: 6420 XP, 320 coins, 14-day streak, 4 fake badges, fake ledger, fake mastery, "Alex Rivera", rank 3, Boss challenge linked to `5555…5551` | `GamificationService.cs:490-497, 519, 555-562, 639-641, 665-674, 697, 706-708, 730-740` |
| P1 | Quiz XP and academic records saved in **two separate `SaveChanges` calls**: a gamification failure leaves the submission without XP, and the controller has already committed | `QuizzesController.cs:1651` vs `GamificationService.cs:391` |
| P1 | Every repeat submission earns base + difficulty XP again | `GamificationService.cs:201-208` |
| P2 | Badge definitions are created on the fly from a `switch` | `GamificationService.cs:949-1001` |

### M. API inconsistencies

- Two route prefixes on the same controller (`api/quizzes` and `api/v1/quizzes`), plus absolute overrides (`/api/v1/ai/quiz-generation`, `/api/v1/content/{scope}/{id}/quizzes`).
- Submit takes the quiz id in the body (`POST /quizzes/submit`), not in the route.
- Responses mix typed DTOs, anonymous objects, and raw EF entities (`CreateQuiz` and `UpdateQuiz` return the `Assessment` entity, including correct answers).
- Errors come back as `{message}`, `{message, errors}` or `{message, status, code}`.
- Analytics `recent-activity` is mocked (`AnalyticsController.cs:569+`).

### N. Database integrity

- No FK on the polymorphic `ScopeId`.
- Cascade from Assessment and Course to Submissions (academic data loss).
- No unique key on (student, assessment, attempt number).
- No check constraints on marks (`PointsAwarded <= Points`, `Points > 0`, `0 <= Percentage <= 100`).
- Status columns are free strings (`Course.Status`, `Module.Status`, `Topic.Status`, `ContentItem.Status`, `Notification.Type`).
- `AuditLog.IpAddress` defaults to `127.0.0.1`.
- **`DbInitializer.Initialize` seeds demo users, courses, progress and submissions on every startup in every environment** (`Program.cs:161`, `DbInitializer.cs:13+`).

### O. Authorization

| Sev | Finding | Location |
|---|---|---|
| P0 | **`QuizzesController` has no class-level `[Authorize]` and no fallback policy. `GET /quizzes/{id}` is anonymous and returns `CorrectAnswer` and `QuestionOption.IsCorrect`** for every question | `QuizzesController.cs:21-24, 131-163`; `Program.cs:78-84` |
| P0 | `GET /quizzes/course/{id}` and `/scope/...` are anonymous and include drafts | `QuizzesController.cs:46, 87` |
| P0 | **`RegenerateSingleQuestion` has no ownership check.** Any instructor can rewrite any course's question | `QuizzesController.cs:1242-1258` |
| P2 | `UploadQuiz` skips the ownership check when `CourseId == Guid.Empty`. It is safe today only because the next lookup 400s; the guard should fail closed | `QuizzesController.cs:377-381` |
| P1 | `start` and `submit` have no enrollment check | `QuizzesController.cs:1449, 1503` |
| P1 | `GET /gamification/badges?studentId=` is anonymous and returns any student's badges | `GamificationController.cs:112-117` |

### P. State synchronisation

- Quiz state lives in three places: the DB, `localStorage['eduflow_generated_quizzes']`, and component state. Window events (`eduflow_quiz_created/updated/deleted`) keep the UI copies in sync.
- AI review proposals are kept in `localStorage['eduflow_ai_proposals_dynamic']` (`App.jsx:71`, `AiReview.jsx:97-100`).
- Student profile XP is patched optimistically in `StudentPortal.jsx:3986+` rather than refetched.
- Several screens default to demo course `44444444-…` (`Assessments.jsx:52, 170`, `Dashboard.jsx:149, 193, 212`, `Courses.jsx:627, 713`, `StudentPortal.jsx:3786-3906`).

---

## 4. Target canonical domain model

Principle: **evolve the existing tables; don't build a parallel system.** Each target concept maps to the current table it replaces.

```
Course ──< Module ──< Assessment ──< AssessmentVersion ──< Question ──< QuestionOption
  │          │            │                                   └──1 Rubric ──< RubricCriterion
  │          │            └─ weight (CourseAssessmentWeight via GradePolicy)
  │          └─ learning objectives, content (Topic/ContentItem)
  └──1 GradePolicy ──< GradeBand

User ──< Enrollment >── Course
  └──< AssessmentAttempt (→ AssessmentVersion) ──< AttemptAnswer ──1 AnswerEvaluation
                                                                       └──< CriterionScore (AI/rubric)
  └──< CourseResult (derived: weighted %, grade, progress)   ──< GradeOverride (audited)
  └──< PointTransaction (= XpTransaction) / UserAchievement (= StudentBadge) / GamificationProfile (= StudentXp+Streak)
```

| Target | Built from | Key changes |
|---|---|---|
| **Assessment** | `Assessment` | Required `ModuleId` FK (module-scoped). `Kind` enum = Quiz/Assignment/Exam/Practical/Project. Lifecycle enum (below). Delete `ScopeId` and the duplicated time/config fields; `TimeLimitSeconds` only. Topic/ContentItem scoping becomes optional `TopicId` within the module |
| **AssessmentVersion** | new | Immutable once an attempt references it. Holds the question set and total marks. Editing a published assessment creates a new version |
| **Question / QuestionOption** | same | `QuestionOption.IsCorrect` is the **only** answer key for choice types. `CorrectAnswer` stays only for FillInBlank/Numerical (+ tolerance in typed metadata). `OptionsJson` removed. `Points` → `MaxMarks` (decimal) with a `> 0` check |
| **Rubric / RubricCriterion** | new | For ShortAnswer/OpenEnded/Code |
| **AssessmentAttempt** | `Submission` (rename + extend) | `AttemptNumber`, `Status` (NotStarted/InProgress/Submitted/Evaluating/Evaluated/Cancelled), `StartedAt`, `SubmittedAt`, `EvaluatedAt`, `AssessmentVersionId`, `ObtainedMarks`, `TotalMarks`, `Percentage`, `Passed`, `Grade`. Unique (StudentId, AssessmentId, AttemptNumber). **`OnDelete: Restrict`** from Assessment |
| **AttemptAnswer + AnswerEvaluation** | `SubmissionAnswer` | Evaluation fields: `AwardedMarks`, `MaxMarks`, `IsCorrect`, `Feedback`, `Method` (Deterministic/AI/Manual), `Confidence`, `Model`, `EvaluatorVersion`. Check constraint `0 <= AwardedMarks <= MaxMarks` |
| **GradePolicy / GradeBand / weights** | new | Per course. Seeded default policy (A+…F) is configured data, not code. Weights validated to sum to 100 |
| **CourseResult** | new (derived, recomputable) | Weighted %, letter grade, progress %. `Enrollment.ProgressPercentage` becomes a cached copy written only by ProgressService |
| **GradeOverride** | new | Actor, reason, old value, new value, timestamp, plus an AuditLog entry |
| **Gamification** | `StudentXp`, `StudentStreak`, `XpTransaction`, `Badge`, `StudentBadge` | Add `GamificationRule` (event type → XP/coins/conditions) and `AchievementCriteria`. Idempotency key on `XpTransaction (StudentId, SourceType, SourceId)` so the same event can't pay twice. No fabricated defaults |

**Assessment lifecycle (one enum, replacing `QuizStatus`):**
`Draft → AiGenerated → Validated → InReview → Approved → Published → Closed → Archived`, plus `Failed` for AI failure. Transitions are enforced in `AssessmentService`, not by the PUT body (today `UpdateQuiz` sets `Status = request.Status` directly, `QuizzesController.cs:530`).

**Services (in `EduFlow.Infrastructure/Services`, interfaces in `EduFlow.Core/Interfaces`):**
`AssessmentService` (CRUD, versioning, lifecycle), `AttemptService` (start/save/submit with all eligibility checks), `EvaluationService` + `IQuestionEvaluator` strategies (SingleChoice, MultiSelect, TrueFalse, FillInBlank, Numerical, Matching, Ordering, AI-rubric), `GradeService`, `ProgressService`, `GamificationService` (rewritten as an event handler over `GamificationRule`s), `QuizGenerationService` (calls the AI gateway, then validates and persists the draft). A small in-process domain-event dispatcher runs **inside the submit transaction**. This needs no message bus.

**Submit transaction boundary:**
`attempt → answers → deterministic evaluation → attempt totals → CourseResult → progress → XP transactions` commit together. AI-evaluated answers move the attempt to `Evaluating`. A follow-up step commits the AI results and re-runs grade, progress and gamification in its own transaction. AI failure leaves the answers `PendingReview`; the system never invents a mark.

---

## 5. Migration plan

Each phase ends with a green build and test suite. Characterization tests that encode wrong behaviour (`Phase4_GradingTests` half-credit Matching, substring FillInBlank, short-answer floor) are **deliberately rewritten** in the phase that fixes the behaviour, with the reason stated.

| Phase | Scope | Exit criteria |
|---|---|---|
| **3a — P0 security hotfixes** (small, can ship first) | `[Authorize]` on QuizzesController plus role-aware DTOs (students never receive answer keys); ownership check on regenerate; focus-session uses JWT identity; challenge submit is idempotent and requires evaluation; dashboard stops seeding completed missions; enrollment, Published and attempt-limit checks on start/submit; fix the `Math.Clamp` crash; remove fabricated gamification defaults | New negative-auth tests pass; existing suite green |
| **3b — Schema normalisation** | EF migrations: `Assessment.ModuleId` (backfilled from ModuleScopeId/ScopeId), Submission→Attempt extension, evaluation columns, check constraints, Restrict on academic deletes, enum status columns, gate seeding to Development | Migration up/down tested on a Postgres copy; data backfill report |
| **4 — Domain services** | Extract Assessment/Attempt services out of the controllers; controllers become thin | Controller tests unchanged in behaviour |
| **5 — Marking** | EvaluationService + strategies; `QuestionOption.IsCorrect` as the key; versioning | Per-type unit tests including edge cases |
| **6 — Grading** | GradePolicy, weights, CourseResult, overrides with audit | Weighted-grade tests, threshold validation |
| **7 — Progress** | ProgressService with configured completion rules | Progress derives only from persisted completions and attempts |
| **8 — Gamification** | Rules table, event handlers, idempotent ledger, one transaction | Replays don't double-pay; no fake values |
| **9 — AI** | Real LLM quiz generation with a strict JSON schema, grounded in module title, description, objectives and content; validation pipeline; regenerate endpoint implemented on the Python side; AI rubric evaluation with server-side clamping and validation | Contract tests .NET↔Python; schema-violation tests |
| **10 — Frontend** | Delete `quizStorageHelper` and every client-side grader; one `QuizPlayer` against the attempt API; remove demo course IDs; refetch after mutations. Keep `/quizzes/{id}/start` compatible for mobile, or update `mobile/lib/screens/quiz/quiz_screen.dart` in the same change | Playwright e2e on the full instructor→student flow |
| **11–13** | Sweep remaining hardcoded data; write `ARCHITECTURE.md`; run the 32-step end-to-end scenario against PostgreSQL | Checklist in the brief §51 |

---

## 6. Decisions needed before Phase 3

1. **LangGraph.** It isn't used today. The brief says not to add technology without need. Recommendation: orchestrate generation and evaluation as plain .NET/Python service pipelines; add LangGraph only if multi-step agent branching is actually required.
2. **LLM provider for quiz generation and AI marking.** The repo already has Gemini keys wired for RAG. Is Gemini the intended provider for generation and marking too?
3. **Lesson vs Topic/ContentItem.** Two content trees exist. Which one is canonical for progress? (Recommendation: Topic→ContentItem, migrating Lessons into ContentItems.)
4. **Default grading scale and pass rules.** Is there a university scale to seed (thresholds for A+…F)? Must weights sum to exactly 100?
5. **Topic-/lesson-level quizzes.** Keep them as optional `TopicId` scoping inside a module (recommended), or allow course-level assessments with no module?
6. **Demo seed data.** OK to restrict `DbInitializer` demo seeding to Development and to stop fabricating progress and submissions?
7. **Branching.** Work on a feature branch with one PR per phase (recommended), or one long-running refactor branch?
