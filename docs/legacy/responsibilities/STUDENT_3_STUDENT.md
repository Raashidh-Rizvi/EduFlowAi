# Student 3 - Student Responsibility and Progress

## 1. Student Identity

| Field | Allocation |
|---|---|
| Name | Atheek M.F. |
| Student ID | IT24103933 |
| Application role | Student |
| Primary business component | Student Learning, Progress, Gamification and Adaptive Guidance |
| Primary AI contribution | Domain Analysis Agent |
| Supporting AI responsibilities | AI Coach Agent; Retention Behaviour Agent; Next Best Action Agent |

Read [RESPONSIBILITY_MATRIX.md](RESPONSIBILITY_MATRIX.md) first. Baseline: `dev/origin/dev 6f6c203`, 2026-09-19. Source inspection does not establish passing runtime tests, personal authorship or lecturer approval. Group-size/AI-scope confirmation remains **TO CONFIRM**.

## 2. Responsibility Summary

Own learner participation, self-enrollment, learning completion, attempt lifecycle/results, deterministic rewards, XP/coins/levels, badges/streaks, missions, mastery/personal bests, focus rewards, student team participation/rankings and adaptive learner guidance.

Student 2 owns curriculum/assessment definitions, academic publishing and grading contracts. Student 1 owns user/access/course governance, policy, reports and AI lifecycle safeguards. Shared identity, database, UI shell and mobile infrastructure are not exclusively yours.

Own learner transactions/progress/guidance in both React and Flutter. Student 2 still owns a mobile content/assessment presentation slice; Student 1 owns governed notification/status infrastructure.

## 3. End-to-End Workflows Owned

| Workflow | Intended end-to-end boundary | Current status |
|---|---|---|
| Learner account/session | Shared auth -> student client -> protected API identity | PARTIAL; Flutter login is simulated |
| Course participation | Browse/eligible enrollment -> persisted association -> own course access | PARTIAL |
| Lesson completion | Authenticated enrolled learner -> completion -> idempotent reward -> current client progress | PARTIAL |
| Quiz attempt/results | Persisted attempt -> Student 2 grading -> submission -> reward/mastery -> feedback/history | PARTIAL |
| Challenge completion | Submitted answers -> agreed grading -> eligible reward -> attempt history | PARTIAL; current challenge submission does not grade answers |
| Progress/rewards | Activity -> ledger and aggregate -> streak/badges/missions -> both client displays | PARTIAL |
| Team participation/rankings | Authorized join/membership -> shared data -> rankings | PARTIAL |
| Adaptive guidance | Grounded activity -> Domain Analysis/coach/retention/next action -> safe recommendation | PARTIAL |
| Study-plan objective/status | Mobile objective -> four-agent workflow -> instructor decision -> same learner status | PARTIAL backend/web; complete mobile loop NOT IMPLEMENTED |

## 4. Agentic AI Contribution

**Primary:** `DomainAnalysisAgent` in `ai-agent/agents/domain_analysis.py`.

**Supporting:** `AiCoachAgent`, `RetentionBehaviorAgent`, `NextBestActionAgent`. Integrated capability status: PARTIAL.

| Aspect | Responsibility and current limitation |
|---|---|
| Inputs | Authenticated learner/course scope, actual quiz outcomes/topic performance, lesson completion, streaks, study activity and learner objective/message |
| Outputs | Structured gaps/mastery evidence, recommended difficulty/focus, coach reply, retention intervention and next learning action |
| Allowed tools | Read-only registered progress, quiz-results, course/content and gamification-rule tools appropriate to the invoking role. Do not assume every instantiated sub-agent actually invokes tools. |
| Validation | Schema, existing student/course/content references, accurate source data, bounded recommendations, confidence/provenance and no direct mutation of grades/rewards |
| Security | Self-only learner access, enrollment/content scope, authorized service calls, prompt/tool-input constraints and limited exposed learner data |
| Error handling | Bounded model/tool failure handling; distinguish missing data from real performance; honest fallback/provenance rather than fabricated learner facts |
| Workflow participation | Planner delegates grounded analysis; Action/Tool uses the findings; guard validates; instructor approves where required; student receives actual status/recommendation |
| Tests required | Real/missing/sparse learner data; low/high scores; invalid identity/scope; prompt injection; forbidden actions; provider failure; recommendation API contract; shared-state and mobile outcome integration |

Python next-best-action exists, but the client calls a public .NET route not found in the audit. Coach model calls exist; fully tool-grounded tutoring and Flutter coach integration do not. AI recommendations must not directly assign authoritative XP or grades.

## 5. Backend Responsibilities

| Actual source | Owned method groups / contracts | Status |
|---|---|---|
| `backend/EduFlow.Api/Controllers/CoursesController.cs` | `EnrollInCourse`, `UnenrollFromCourse`, `GetMyCourses`, `CompleteLesson`; consume content-read contracts | PARTIAL |
| `QuizzesController.cs` | `StartQuizAttempt`, submission/answer persistence and result handoff; grading definition coordinated with Student 2 | PARTIAL |
| `ChallengesController.cs` | Student daily/course views and `SubmitChallenge`; use agreed grading before rewards | PARTIAL |
| `GamificationController.cs`, `LeaderboardController.cs` | Dashboard/profile/ledger/mastery, mission claim, freeze, badges, focus-session and rankings | PARTIAL |
| `TeamsController.cs` | Student create/join/read membership and rankings; instructor management remains Student 2 | PARTIAL |
| `AiReviewController.cs` | Learner objective/chat/retention/status consumers; shared workflow identity maintained with Student 1 | PARTIAL |
| `NotificationsController.cs` | Consume governed learner notification/read contract; Student 1 maintains delivery lifecycle | PARTIAL |
| `Infrastructure/Services/GamificationService.cs` / `IGamificationService` | `AwardXpAsync`, `CalculateAndAwardQuizRewardAsync`, dashboard/mastery/mission/freeze/leaderboard/focus rules | PARTIAL |
| `TeamService.cs` / `ITeamService` | Shared student membership/ranking logic and instructor-management contract | PARTIAL |
| `Core/Constants/LevelCurve.cs` | Central fixed-tier level lookup/bounds utility | COMPLETE, narrowly implemented utility |
| `Core/DTOs/GamificationDtos.cs` | Profile/ledger/badge/mission/mastery/personal-best/reward/focus/squad/leaderboard contracts | PARTIAL |
| `AssessmentDtos.cs`, `CourseDtos.cs`, `AuthDtos.cs` | Shared start/submit/results, enrollment/content and session contracts | PARTIAL |

Do not duplicate the grader, auth service, course data model or AI gateway. Coordinate method boundaries within mixed controllers.

## 6. Database Responsibilities

| Entity/table area | Relationship / responsibility | Status |
|---|---|---|
| Enrollments, LessonCompletions | Student-course and student-lesson associations; eligibility/completion | PARTIAL |
| Submissions, SubmissionAnswers | Student/assessment -> submission -> question answers; shared grading contract | PARTIAL |
| XpTransactions, StudentXp | Auditable activity source -> ledger; user -> XP/coin aggregate | PARTIAL |
| StudentStreaks, StreakHistories | User -> streak aggregate; dated activity history | PARTIAL |
| Levels, Badges, StudentBadges | Policy/definition references; unique student badge association | PARTIAL; fixed level calculation separately COMPLETE |
| Challenges, StudentChallenges, StudentDailyMissions | Assignment/attempt and daily mission status/reward claims | PARTIAL |
| SkillMasteries, PersonalBestRecords | Student/topic or assessment outcomes and improvement history | PARTIAL |
| Teams, TeamMembers, TeamChallenge | Team leader/member and challenge participation; shared teaching management | PARTIAL |
| StudyPlans, StudyPlanItems, Notifications | Learner-associated objectives/status/notifications; shared academic/governance records | PARTIAL |

Own migrations for participation/reward changes; agree cross-component FKs and deletion semantics with Student 2. Coordinate ledger uniqueness, concurrency and activity+reward transaction boundaries with shared DB maintainers. Existing InMemory tests do not prove PostgreSQL integrity. Demo initialization can reset aggregates/streaks and must not be confused with genuine progress persistence.

## 7. React Responsibilities

Actual `frontend/src/pages/Student/StudentPortal.jsx` contains `HomeTab`, `CurriculumTab`, `QuizRunner`, `CoachTab`, `FocusFlowTab`, `LeaderboardTab` and `ProfileTab`.

- [ ] [PARTIAL] Complete enrollment/completion/attempt/results and progress refresh from authoritative backend values.
- [ ] [PARTIAL] Fix mission claim method mismatch: UI calls `claimGrandReward`, service defines `claimDailyGrandMission`.
- [ ] [PARTIAL] Stop local XP/level/freeze success changes when the API call fails; use server results and actual level curve.
- [ ] [PARTIAL] Align squad routes with controller prefix and persisted membership; remove misleading local fallback success.
- [ ] [PARTIAL] Complete focus-session validation/history and reward feedback.
- [ ] [PARTIAL] Connect `getNextBestAction` to an implemented public .NET contract.
- [ ] [PARTIAL] Complete coach/recommendation/status and empty/error states with actual learner identity.
- [ ] [PARTIAL] Coordinate `CurriculumTab`/`QuizRunner` presentation contracts with Student 2; notification/status contract with Student 1.
- [ ] [PARTIAL] Reconcile `gamificationService.js`, `quizService.js`, `courseService.js`, `aiService.js` and shared `api.js`.

State is hooks and local/session storage. Browser-state updates do not establish a successful database transaction.

## 8. Flutter Responsibilities

Existing files in `mobile/lib/screens/`: auth/login, main navigation, home, journey, quiz, ai_coach, leaderboard and profile. Widgets use Material, local maps, `StatefulWidget`, `setState`, callbacks and navigation. Dependencies for Dio/BLoC/secure storage are present but operational integration was not established.

- [ ] [PARTIAL] Replace simulated login with shared authenticated API session; coordinate secure tokens with Student 1.
- [ ] [PARTIAL] Replace local reward/profile/leaderboard state with API-driven learner data.
- [ ] [PARTIAL] Deliver persisted attempt/submission/results using Student 2's assessment presentation and grading contract.
- [ ] [PARTIAL] Replace delayed canned coach replies with the authoritative backend AI contract.
- [ ] [NOT IMPLEMENTED] Implement learner objective submission, pending/approved/rejected/revised status, and restart-safe history.
- [ ] [NOT IMPLEMENTED] Provide reusable transaction/progress widgets with loading/empty/error states and navigation tests.
- [ ] [NOT IMPLEMENTED] Integrate the jointly chosen meaningful device feature; no feature is claimed merely from dependencies.
- [ ] [DOCUMENTED ONLY] Reassess offline synchronization and certificates against agreed scope before implementing or claiming them.

No operational Flutter API service was found. `ApiConstants` contains routes that need reconciliation; it is not proof of integration. This owner must not absorb Student 1 and Student 2's required mobile contributions.

## 9. Security / Authorization Responsibilities

- [ ] [PARTIAL] Enforce Student role and self-only identity on learner operations; do not accept arbitrary URL/body student IDs as authority.
- [ ] [PARTIAL] Require eligible enrollment/published assessment for participation.
- [ ] [PARTIAL] Persist attempts and enforce time/attempt limits server-side.
- [ ] [PARTIAL] Prevent duplicate/replayed rewards and handle concurrent completion/claim transactions.
- [ ] [PARTIAL] Validate focus duration/session evidence and prevent arbitrary repeated rewards.
- [ ] [PARTIAL] Protect squad student operations and coordinate instructor permissions with Student 2.
- [ ] [PARTIAL] Resolve student analytics access without exposing another learner's records.
- [ ] [PARTIAL] Keep AI recommendations advisory until backend validation/approval permits action.
- [ ] [PARTIAL] Coordinate multiplier access with Student 1 policy governance; reward execution remains here.

## 10. Testing Responsibilities

Existing: `GamificationServiceTests.cs` calls production service methods; learner portions of `UserCourseManagementTests.cs`; Playwright `05-student-portal.spec.js`; Python analysis, retention, challenge and coach cases. Existing source is PARTIAL evidence; no run result or personal authorship is asserted.

- [ ] [PARTIAL] Expand production reward tests for current multi-factor behavior and configured pass threshold.
- [ ] [NOT IMPLEMENTED] Add duplicate/concurrent XP, completion, mission and focus-session tests using PostgreSQL.
- [ ] [NOT IMPLEMENTED] Test Student/self/enrollment/publication authorization at HTTP boundaries.
- [ ] [PARTIAL] Verify actual quiz attempt persistence, time/attempt limits and result contract with Student 2.
- [ ] [PARTIAL] Regression-test claim method and squad route mismatches and UI behavior on API failure.
- [ ] [NOT IMPLEMENTED] Add Flutter unit/widget/navigation/API and secure-session tests.
- [ ] [PARTIAL] Test real learner grounding and safe AI tool/model failures.
- [ ] [NOT IMPLEMENTED] Demonstrate Flutter objective -> React review -> mobile status and record performance/failure evidence.

## 11. Integration Responsibilities

Consume academic definitions/grading from Student 2 and identity/policy/lifecycle contracts from Student 1. Provide accurate learner activity to analysis/reporting. Maintain one source of truth for rewards and progress across React/Flutter.

Important contracts: canonical student ID, course/enrollment scope, published assessment eligibility, persisted attempt/submission ID, pass threshold, measured duration, outcome-to-reward inputs, workflow ID and notification status. Current complete cross-platform loop is NOT IMPLEMENTED; individual backend/web/AI paths are PARTIAL.

## 12. Documentation / Git / Evidence Responsibilities

- [ ] [PARTIAL] Keep learner/reward/AI tracker and API contracts aligned with actual behavior.
- [ ] [NOT IMPLEMENTED] Record genuine personal issues/commits/PRs/reviews and test runs for Atheek's allocated work.
- [ ] [PARTIAL] Explain how source activity, ledger and cached aggregates relate; document fallback and timing limitations honestly.
- [ ] [NOT IMPLEMENTED] Maintain actual personal AI-use log/declaration and write the required personal reflection from experience.
- [ ] [PARTIAL] Preserve historical Git evidence; ownership assignment is not proof of previous full-stack contribution.

## 13. Deployment Responsibilities

Verify learner API connectivity, mobile secure configuration, APK installation, persistent learner progress, and AI guidance/status flows. Student 1 coordinates platform configuration and Student 2 verifies academic delivery; deployment credit remains shared.

- [ ] [PARTIAL] Reconcile emulator/device/deployed URLs; mobile currently uses local constants, not working services.
- [ ] [PARTIAL] Verify rewards/streaks survive restart without demo-seed overwrite.
- [ ] [NOT IMPLEMENTED] Build/install and demonstrate the integrated learner APK with other owners' mobile slices.
- [ ] [NOT IMPLEMENTED] Record real learner/AI cross-platform deployment and performance evidence.
- [ ] [PARTIAL] Verify CI/test results and document actual setup constraints.

## 14. Current Implementation Audit

| Responsibility | Status | Audit evidence / remaining limit |
|---|---|---|
| LevelCurve fixed-tier lookup/bounds | COMPLETE | Central utility implemented; not a mathematical curve or whole reward engine |
| Enrollment/own courses/lesson completion | PARTIAL | API/web present; access and transactional boundaries incomplete |
| Quiz attempts/results | PARTIAL | Start ID not persisted; no enforced server timer/attempt lifecycle |
| Challenge completion | PARTIAL | Rewards without answer grading |
| XP/coins/streaks/badges | PARTIAL | Substantial logic; replay/concurrency/security gaps |
| Missions/focus/mastery/personal bests | PARTIAL | Models/rules exist; client, validation and timing gaps |
| Teams/leaderboards | PARTIAL | Services exist; route/permission/fallback inconsistencies |
| Coach/domain/retention/next action | PARTIAL | Python and web pieces; real grounding and public route/mobile gaps |
| Flutter learner experience | PARTIAL | Local screens only; shared API integration absent |
| Workflow objective/status | PARTIAL | Backend pieces; full cross-platform loop absent |
| Certificates/offline sync/live push | DOCUMENTED ONLY | No operational feature established |
| Security/tests/integration | PARTIAL | Foundations and source tests; missing acceptance evidence |
| Personal Git/deployment/viva evidence | NOT IMPLEMENTED | Placeholders; no attribution or results invented |

## 15. Phased Remaining-Work Roadmap

### Phase 1 - Critical correctness and security

- [ ] [PARTIAL] Secure learner identity/enrollment/publication and reward/team endpoints.
- [ ] [PARTIAL] Fix mission/squad API mismatches and false local reward success.
- [ ] [PARTIAL] Persist attempts, enforce limits and align grading/reward threshold with Student 2.
- [ ] [PARTIAL] Make activity/reward operations idempotent and concurrency-safe; stop reset-prone progress initialization.

### Phase 2 - Complete full-stack integration

- [ ] [PARTIAL] Complete actual learner transaction and progress flows in React.
- [ ] [PARTIAL] Connect Flutter session, attempts, rewards, rankings and coach through shared APIs.
- [ ] [NOT IMPLEMENTED] Integrate mobile objective/status with Student 1 governance and Student 2 academic review.
- [ ] [PARTIAL] Use authoritative result/profile values and honest error states across both clients.

### Phase 3 - Agentic AI completion

- [ ] [PARTIAL] Ground Domain Analysis in actual authorized learner data.
- [ ] [PARTIAL] Complete controlled coach/retention/next-action integration with typed contracts.
- [ ] [PARTIAL] Provide reliable outcomes to the four-agent graph and display actual validation/approval status.
- [ ] [PARTIAL] Remove unsupported data assumptions or label safe degraded responses.

### Phase 4 - Testing and reliability

- [ ] [PARTIAL] Expand reward and analysis tests for production behavior and edge cases.
- [ ] [NOT IMPLEMENTED] Add PostgreSQL concurrency/idempotency and self-only API tests.
- [ ] [NOT IMPLEMENTED] Add Flutter widget/navigation/API tests and full cross-platform golden workflow.
- [ ] [NOT IMPLEMENTED] Measure learner requests, DB latency and AI failures/performance.

### Phase 5 - Deployment/documentation/evidence

- [ ] [PARTIAL] Verify mobile API URLs, persistence and deployed guidance dependencies.
- [ ] [NOT IMPLEMENTED] Record genuine personal contribution/test/APK/deployment/AI-use evidence.
- [ ] [PARTIAL] Reconcile learner documentation later; remove unsupported completed-feature claims only in authorized work.

### Phase 6 - Viva readiness

- [ ] [NOT IMPLEMENTED] Trace a quiz submission through grading, ledger, aggregate, mastery and both clients.
- [ ] [NOT IMPLEMENTED] Explain Domain Analysis tools/contracts and why AI does not award XP directly.
- [ ] [NOT IMPLEMENTED] Perform the exercises below without external AI during evaluation.

## 16. Viva Preparation Map

### Important source files

- [GamificationService](../../backend/EduFlow.Infrastructure/Services/GamificationService.cs)
- [IGamificationService](../../backend/EduFlow.Core/Interfaces/IGamificationService.cs)
- [LevelCurve](../../backend/EduFlow.Core/Constants/LevelCurve.cs)
- [GamificationController](../../backend/EduFlow.Api/Controllers/GamificationController.cs)
- [TeamService](../../backend/EduFlow.Infrastructure/Services/TeamService.cs)
- [StudentPortal](../../frontend/src/pages/Student/StudentPortal.jsx)
- [Gamification API service](../../frontend/src/services/gamificationService.js)
- [Flutter main navigation](../../mobile/lib/screens/main_navigation_screen.dart)
- [Domain Analysis](../../ai-agent/agents/domain_analysis.py)
- [Next Best Action](../../ai-agent/agents/next_best_action.py)
- `CoursesController.cs`, `QuizzesController.cs`, `ChallengesController.cs`, `GamificationDtos.cs`, `ai_coach.py`, `retention_behavior.py`, mobile quiz/coach/profile screens.

### Important API endpoints

Actual route shapes to trace:

- `POST/DELETE /api/courses/{courseId}/enroll`, `GET /api/students/me/courses`
- `POST /api/courses/lessons/{lessonId}/complete`
- `POST /api/quizzes/{id}/start`, `POST /api/quizzes/submit`
- `GET /api/challenges/daily`, `POST /api/challenges/{id}/submit`
- `GET /api/gamification/dashboard/{studentId}`, `GET /api/gamification/ledger/{studentId}`
- `GET /api/gamification/mastery/{studentId}`
- `POST /api/gamification/missions/claim-grand/{studentId}`
- `POST /api/gamification/streak/freeze/{studentId}`, `POST /api/gamification/focus-session`
- `POST /api/v1/gamification/squads/{id}/join`
- `POST /api/aireview/coach/chat`, `POST /api/aireview/orchestrate`

The client-requested `/api/ai/next-best-action` is not an implemented public route in the audited .NET code.

### Database, clients and AI demonstration

Explain enrollment/completion, attempt/answers, ledger/aggregate, badge uniqueness, streak history, daily missions, mastery and personal best relationships. Trace React quiz/reward flow and future actual Flutter equivalent. Explain grounded Domain Analysis, allowed tools, recommendations, four-agent handoff and instructor-approved status. Separate prototype local state from database-backed behavior.

### Known current limitations

Unprotected operations, missing attempt persistence/timer enforcement, repeated rewards, challenge grading gap, hardcoded reward duration, mismatched pass thresholds, mission method mismatch, squad route mismatch, local Flutter state, missing next-action gateway and complete approval loop.

### Likely technical viva questions

1. Why store both an XP ledger and a total XP aggregate?
2. How do you prevent a repeated request from awarding XP twice?
3. Which operations must be transactional, and what if reward saving fails after completion saving?
4. How is a streak calculated across dates and repeated same-day actions?
5. Who owns quiz grading versus attempt/reward processing?
6. How are real time spent and personal best measured?
7. Why is a student ID in the request insufficient authorization?
8. How does Domain Analysis distinguish missing data from a learning gap?
9. Which mobile actions currently use the backend and which are simulations?

### Small modification/debugging exercises

- Fix the mission claim method mismatch and verify no XP is added after failure.
- Add a reward replay guard and test concurrent claims.
- Trace the squad route prefix mismatch and correct both client and tests.
- Add a level boundary case without changing the tier semantics accidentally.
- Prevent reading another student's ledger.
- Replace a hardcoded mobile result with an API response and loading/error state.
- Trace a next-action failure from client through .NET to Python.
- Align reward pass behavior with the assessment's configured threshold.

## 17. Evidence Placeholders

Commit: TO RECORD - genuine hash and learner/reward/AI scope.
PR: TO RECORD - actual link, review and contract changes.
Issue: TO RECORD - real acceptance criteria/dependencies.
Tests: TO RECORD - commands, date, environment, actual results and limits.
Screenshots: TO RECORD - real React/Flutter/API/DB outcomes.
AI usage log: TO RECORD - actual assistance, decisions and personal reflection.
Deployment: TO RECORD - verified APK/API/AI workflow and persistence.
Lecturer approval: TO CONFIRM - no written evidence supplied.

## 18. Progress Summary

| Category | Evidence level | Interpretation |
|---|---|---|
| Backend | Strong | Extensive learner/reward services; material correctness/security gaps |
| Database | Moderate | Participation/progress models; concurrency and migration behavior unproved |
| React | Moderate | Large learner UI/API paths; local success and contract mismatches |
| Flutter | Early | Existing screens are local prototypes |
| Agentic AI | Moderate | Analysis/coach/retention/next-action code; integration/grounding gaps |
| Security | Early | Self-only/reward/team enforcement incomplete |
| Testing | Early | Useful service tests; no complete DB/mobile/acceptance evidence |
| Integration | Early | Web paths exist; full mobile and approval integration missing |
| Documentation/Deployment | Early | Working tracker; personal/runtime/deployment evidence required |

## 19. Progress Update Rules

Record verified changes with exact source contracts, actual tests and remaining limits. Review grading/reward changes with Student 2 and lifecycle/policy changes with Student 1. Never mark a simulated UI update, generated ID, fallback or named test as end-to-end completion. Preserve genuine history and approval caveats.
