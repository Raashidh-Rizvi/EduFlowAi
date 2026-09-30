# Student 2 - Instructor Responsibility and Progress

## 1. Student Identity

| Field | Allocation |
|---|---|
| Name | Raashidh M.R. |
| Student ID | IT24104191 |
| Application role | Instructor |
| Primary business component | Instructor Curriculum, Assessment and AI Content Management |
| Primary AI contribution | Action / Tool Agent |
| Supporting AI responsibilities | Quiz Generator Agent; Slide Topic Agent; Quiz Evaluator Agent |

Read [RESPONSIBILITY_MATRIX.md](RESPONSIBILITY_MATRIX.md) first. Baseline: `dev/origin/dev 6f6c203`, 2026-09-19. Statuses reflect inspected source, not runtime certification or assignment of past authorship. Lecturer approval of group-size/AI-scope changes remains **TO CONFIRM**.

## 2. Responsibility Summary

Own academic curriculum, modules, lessons, topics, course content/documents, assessments/quizzes, grading contracts, academic publishing, teaching analytics, and academic review of AI-generated content.

Student 1 owns global course administration/governance, user/access policy, platform reports, configuration and auditing. Instructor academic create/edit/publish behavior is not duplicated for the Admin member. Student 3 owns participation, attempts, progress and reward execution.

Own a meaningful Flutter content/assessment delivery slice even though its end user may be a learner. Do not treat the whole mobile application as someone else's responsibility.

## 3. End-to-End Workflows Owned

| Workflow | Intended end-to-end boundary | Current status |
|---|---|---|
| Academic curriculum | React authoring -> ownership-checked API -> hierarchy in DB -> mobile/web content | PARTIAL |
| Document/slide content | Validated upload -> accessible storage -> parsing/topic extraction -> academic content | PARTIAL |
| Teaching roster | Authorized instructor -> eligible student/enrollment changes -> learner course access | PARTIAL |
| Assessment design/publication | Scoped questions/configuration -> server validation -> approved publication -> learner delivery | PARTIAL |
| AI content review | Curriculum evidence -> controlled Action/Tool generation -> validation -> instructor approve/reject/revise | PARTIAL |
| Grading and feedback | Student 3 attempt -> shared grading contract -> persisted answers/outcomes -> rewards/results | PARTIAL |
| Academic analytics/communication | Course-owned learner data -> insights/report/message -> appropriate recipients | PARTIAL |

## 4. Agentic AI Contribution

**Primary:** `ActionToolAgent` in `ai-agent/agents/content_action.py`.

**Supporting:** `QuizGeneratorAgent`, `SlideTopicAgent`, `QuizEvaluatorAgent`. All are PARTIAL as integrated capabilities.

| Aspect | Responsibility and current limitation |
|---|---|
| Inputs | Authorized curriculum scope, documents/slides, learning objectives, difficulty/distribution, question configuration and normalized answer/rubric inputs |
| Outputs | Structured academic draft/questions/options/explanations/citations; topic categories; grading proposals/results; execution summaries |
| Allowed tools | Registry paths for scope/content/objectives/existing questions; distribution, duplicate checks, generation/batch generation, validation, assembly, regeneration, challenge/feedback drafts. Verify actual registry permission for each invoking role; this list is not blanket new authorization. |
| Validation | Scope existence, legitimate source references, answer/options consistency, counts/distribution, reward limits, rubric bounds, schema and publication eligibility |
| Security | Instructor ownership; authorized content access/upload; least-privilege internal tools; no AI bypass of backend grade/reward/publication authority |
| Error handling | Bounded provider retries/timeouts; clear failed generation; label fallback provenance; do not publish invalid/empty content or pretend a fallback is grounded |
| Workflow participation | Receives planner/analysis output, produces a draft through controlled tools, passes it to Student 1 guard and presents it for human academic review |
| Tests required | Scope grounding, incorrect/missing files, duplicate questions, malformed model output, forbidden tools, provider failure, validation rejection, approval-before-publish, evaluator integration and grading boundaries |

Current AI quiz generation can persist `Published` content directly. Normal .NET quiz submission uses deterministic/heuristic grading rather than calling the Python evaluator, despite feedback labels suggesting AI evaluation. Complete or accurately delimit this integration before claiming it.

## 5. Backend Responsibilities

| Actual source | Owned method groups / contracts | Status |
|---|---|---|
| `backend/EduFlow.Api/Controllers/CoursesController.cs` | Course academic create/update/delete/publish; module/lesson/topic/content-item operations; upload/categorize; hierarchy; teaching roster | PARTIAL |
| `QuizzesController.cs` | Manual authoring/update/delete; scope/detail; configuration; validation; publish/unpublish/duplicate; AI generation/regeneration; submissions/feedback and grading contract | PARTIAL |
| `ChallengesController.cs` | Instructor challenge definition; coordinate answer evaluation with Student 3 submission/reward path | PARTIAL |
| `AiReviewController.cs` | Academic proposal list/detail/edit and approve/reject/revise; Student 1 owns shared lifecycle integrity | PARTIAL |
| `AnalyticsController.cs`, `ReportsController.cs` | Course/cohort teaching insights and scoped report requirements; platform reporting maintained by Student 1 | PARTIAL |
| `TeamsController.cs`, `NotificationsController.cs` | Instructor squad management and course message authoring; shared service and delivery contracts | PARTIAL |
| `Infrastructure/Services/AiGatewayClient.cs` / `IAiGatewayClient` | Generation, regeneration, topic and evaluator calls; shared transport maintained with Student 1 | PARTIAL |
| `Core/Interfaces/IGamificationService.cs`, `ITeamService.cs` | Consume reward/team contracts; do not duplicate Student 3 reward logic | PARTIAL, shared |
| `Core/DTOs/CourseDtos.cs` | Course/module/lesson/topic/content, hierarchy and roster request/response DTOs | PARTIAL |
| `Core/DTOs/AssessmentDtos.cs` | Quiz/question/configuration/generation/start/submission/result/validation contracts | PARTIAL |
| `Core/DTOs/GamificationDtos.cs`, controller-local records | Instructor squad requests, challenge definitions and proposal decision/update records | PARTIAL |

No dedicated `ICourseService`/`IAssessmentService` abstraction exists in the audited structure. Controllers contain substantial business logic. Plan service-layer improvements around business boundaries, not ownership-driven copies.

## 6. Database Responsibilities

| Entity/table area | Relationships and owner boundary | Status |
|---|---|---|
| Courses, Modules, Lessons | Course -> modules -> lessons; instructor reference; academic fields owned here | PARTIAL |
| Topics, ContentItems | Module -> topics -> content; source/hierarchy references used by AI and quizzes | PARTIAL |
| Assessments, QuizConfigurations | Course/scope -> assessment; quiz configuration relationship | PARTIAL |
| Questions, QuestionOptions | Assessment -> questions -> options; content provenance and explanation/rubric metadata | PARTIAL |
| Enrollments | Course/student association; instructor roster vs Student 3 self-enrollment | PARTIAL |
| Submissions, SubmissionAnswers | Shared attempt/result schema; Student 2 grading contract, Student 3 attempt lifecycle/rewards | PARTIAL |
| StudyPlans, StudyPlanItems | Academic plan editing/approval; Student 1 durable lifecycle; Student 3 learner status | PARTIAL |
| Teams, Announcements | Teaching management/authoring requirements; shared student membership/delivery | PARTIAL |

Maintain migrations for academic schema changes; coordinate cross-component FKs and deletion behavior. Existing migration files do not establish successful PostgreSQL deployment. `Course.Term` snapshot drift, initialization error handling and seed resets need shared correction. Model changes and academic deletion must not orphan submissions or silently destroy evidence.

## 7. React Responsibilities

- [ ] [PARTIAL] Finish course/module/lesson/topic/document flows in `frontend/src/pages/Courses/Courses.jsx` with actual validation and ownership enforcement.
- [ ] [PARTIAL] Complete assessment authoring/configuration, publishing and feedback in `Assessments.jsx`.
- [ ] [PARTIAL] Make `AiReview.jsx` show actual validation/status and persist academic approve/reject/revise consistently.
- [ ] [PARTIAL] Scope Instructor `Dashboard.jsx`/`Insights.jsx` to owned courses.
- [ ] [PARTIAL] Fix squad-management API route/permissions in `Gamification.jsx` with Student 3.
- [ ] [PARTIAL] Replace local-only announcement dispatch in `Communications.jsx` with Student 1's delivery contract.
- [ ] [PARTIAL] Reconcile `courseService.js`, `quizService.js`, `aiService.js`, `insightsService.js` with actual API routes and responses.
- [ ] [PARTIAL] Verify browser storage/fallbacks in `utils/pdfHelper.js`, `utils/quizStorageHelper.js` do not disguise failed persistence.
- [ ] [PARTIAL] Coordinate protected routes, reusable components and loading/empty/error states with shared shell owners.

Actual state uses hooks, browser storage and shared theme Context. Library dependencies do not prove an implemented Zustand or React Router architecture.

## 8. Flutter Responsibilities

Own academic content delivery and assessment presentation as a full-stack feature slice, not all learner transactions. Existing `journey_screen.dart` and `quiz_screen.dart` are local prototypes shared with Student 3.

- [ ] [PARTIAL] Replace hardcoded journey content with published course/module/lesson APIs.
- [ ] [NOT IMPLEMENTED] Deliver authorized document viewing/access and suitable loading/error states.
- [ ] [PARTIAL] Render actual assessment configuration and question formats from the shared API.
- [ ] [PARTIAL] Agree the handoff to Student 3's persisted attempt/submission/result flow; keep server grading authoritative.
- [ ] [NOT IMPLEMENTED] Add meaningful academic review mobile operations only where justified by the agreed scope.
- [ ] [NOT IMPLEMENTED] Add content/assessment widget, navigation, form and API-integration tests.

Reuse the shared secure HTTP/session/navigation layer. Do not implement a separate identity or grading engine. Any device file-selection feature needs actual implementation and verification before being claimed.

## 9. Security / Authorization Responsibilities

- [ ] [PARTIAL] Enforce own-course resource authorization in addition to `Instructor,Admin` roles.
- [ ] [PARTIAL] Restrict unpublished content and question/answer access according to published assessment and enrollment rules.
- [ ] [PARTIAL] Validate uploaded type/size/path and access; avoid treating a client file path as trusted.
- [ ] [PARTIAL] Enforce validation and academic approval before high-impact content publication.
- [ ] [PARTIAL] Validate question configuration, grading bounds and feedback visibility.
- [ ] [PARTIAL] Protect instructor squad operations; define course-message audience permissions.
- [ ] [PARTIAL] Fix global-vs-course analytics and student-analytics access with Students 1/3.
- [ ] [PARTIAL] Prevent client-selected identity from determining another student's academic proposal or result access.

## 10. Testing Responsibilities

Existing source: `UserCourseManagementTests.cs`, `AssessmentQuizTests.cs`, academic parts of `AnalyticsAiReviewTests.cs`; Playwright `03-instructor-ai-review.spec.js`, `04-courses.spec.js`, `08-assessments.spec.js`, `09-courses-slidequest.spec.js`; Python quiz/scope/validation tests.

The named auto-grading test stores a manually scored submission; approval tests set entity status directly. These do not prove production grading, permission enforcement or full AI review.

- [ ] [NOT IMPLEMENTED] Add actual controller/HTTP ownership and publication-access tests.
- [ ] [PARTIAL] Exercise production grading for each supported question format and configured pass threshold.
- [ ] [PARTIAL] Test AI failure/malformed output, provenance, validation and approval-before-publication.
- [ ] [NOT IMPLEMENTED] Add PostgreSQL academic migration/FK/deletion/transaction integration tests.
- [ ] [PARTIAL] Coordinate persisted attempt/time-limit and retry tests with Student 3.
- [ ] [NOT IMPLEMENTED] Add Flutter curriculum/assessment tests.
- [ ] [PARTIAL] Verify React forms, error states and protected routes rather than relying only on browser exploration.
- [ ] [NOT IMPLEMENTED] Contribute the full cross-client acceptance test and measured performance evidence.

No passing run or individual test authorship is asserted here.

## 11. Integration Responsibilities

Own the academic API contracts consumed by both clients and AI tools. Student 1 supplies access/governance, durable lifecycle and approval safeguards; Student 3 supplies student attempts and learning evidence.

Agree one pass threshold and grading result schema, one submission identity, feedback visibility, publication eligibility, and transaction/retry behavior. Fix `/quizzes/upload-quiz` mismatch through an actual implementation decision. Coordinate shared file access between .NET upload storage and Python parsing; local absolute paths are not a portable deployment contract.

## 12. Documentation / Git / Evidence Responsibilities

- [ ] [PARTIAL] Maintain this tracker, academic API contracts, schema relationships and honest AI behavior descriptions.
- [ ] [NOT IMPLEMENTED] Record actual per-task commits/PRs/issues/reviews and verification evidence for Raashidh's allocated work.
- [ ] [PARTIAL] Reconcile documentation claims such as AI grading, publication approval and storage grounding with actual code.
- [ ] [NOT IMPLEMENTED] Maintain genuine personal AI-use log/declaration and personal reflection.
- [ ] [PARTIAL] Preserve existing history; current allocation does not prove prior authorship.

## 13. Deployment Responsibilities

Verify authoring APIs, PostgreSQL academic schema, content storage/access, Python parsing/model dependencies and React/mobile API configuration. Coordinate platform deployment with Student 1 and learner APK integration with Student 3.

- [ ] [PARTIAL] Make uploaded content accessible under a secure portable deployment contract.
- [ ] [PARTIAL] Verify academic migrations and seed behavior without relying on startup error suppression.
- [ ] [PARTIAL] Verify generation/provider failures and academic approval using configured services.
- [ ] [NOT IMPLEMENTED] Supply verified academic workflow and mobile-content evidence on deployment/APK.
- [ ] [PARTIAL] Record actual CI/test results, setup requirements and limitations.

## 14. Current Implementation Audit

| Responsibility | Status | Audit evidence / remaining limit |
|---|---|---|
| Academic course hierarchy and CRUD | PARTIAL | Real endpoints/entities/web; ownership and validation gaps |
| Documents/slides/topic extraction | PARTIAL | Upload/parser/model paths; secure portable storage unverified |
| Teaching roster | PARTIAL | Updated add/remove/list APIs; resource scope incomplete |
| Approval-based enrollment requests | DOCUMENTED ONLY | Documented workflow exceeds direct-enrollment behavior |
| Assessment configuration/authoring | PARTIAL | Substantial implementation; end-to-end/security gaps |
| Academic validation/publication | PARTIAL | AI path may publish immediately |
| AI content review and plan editing | PARTIAL | Items now persist; lifecycle correlation/validation gaps |
| Grading/feedback | PARTIAL | Production heuristics; Python evaluator not integrated into normal submission |
| Course analytics/reporting/messages/teams | PARTIAL | Queries and management exist; scoping, routes and real delivery incomplete |
| Flutter academic delivery | PARTIAL | Prototype journey/quiz UI; actual API integration missing |
| Security/tests/integration | PARTIAL | Foundations exist; production-boundary evidence incomplete |
| Personal Git/deployment/viva evidence | NOT IMPLEMENTED | No results or authorship fabricated |

## 15. Phased Remaining-Work Roadmap

### Phase 1 - Critical correctness and security

- [ ] [PARTIAL] Enforce course ownership, content access and protected instructor operations.
- [ ] [PARTIAL] Stop unvalidated/unapproved AI publication and coordinate lifecycle enforcement.
- [ ] [PARTIAL] Align grading/reward pass threshold and answer visibility with Student 3.
- [ ] [PARTIAL] Validate upload paths/types and fix mismatched academic API contracts.

### Phase 2 - Complete full-stack integration

- [ ] [PARTIAL] Complete academic CRUD/configuration/review flows and honest error handling in React.
- [ ] [PARTIAL] Deliver real curriculum and assessment presentation in Flutter.
- [ ] [PARTIAL] Connect roster, teaching analytics, messages and squads to correctly scoped APIs.
- [ ] [PARTIAL] Agree persisted attempt/result handoff with Student 3 and governance controls with Student 1.

### Phase 3 - Agentic AI completion

- [ ] [PARTIAL] Finish controlled Action/Tool inputs/outputs, grounding and permission checks.
- [ ] [PARTIAL] Integrate or accurately limit QuizEvaluator behavior; eliminate misleading AI grading claims.
- [ ] [PARTIAL] Complete generation -> deterministic validation -> academic review -> publication.
- [ ] [PARTIAL] Handle provider/parse failures without publishing unsafe content.

### Phase 4 - Testing and reliability

- [ ] [PARTIAL] Replace insufficient persistence-only assertions with production grading/approval tests.
- [ ] [NOT IMPLEMENTED] Add PostgreSQL, Flutter and resource-authorization integration tests.
- [ ] [NOT IMPLEMENTED] Test cross-platform approval, provider failures and content performance.
- [ ] [PARTIAL] Verify existing Playwright and Python cases against real contracts.

### Phase 5 - Deployment/documentation/evidence

- [ ] [PARTIAL] Verify shared storage, migrations, provider configuration and deployed academic workflows.
- [ ] [NOT IMPLEMENTED] Record genuine personal contribution/test/deployment/AI-use evidence.
- [ ] [PARTIAL] Reconcile academic/AI documentation later with the approved allocation and actual implementation.

### Phase 6 - Viva readiness

- [ ] [NOT IMPLEMENTED] Trace academic source -> generated draft -> validation/review -> learner delivery.
- [ ] [NOT IMPLEMENTED] Explain the production grader and distinction from the Python evaluator.
- [ ] [NOT IMPLEMENTED] Perform the exercises below without external AI during evaluation.

## 16. Viva Preparation Map

### Important source files

- [CoursesController](../../backend/EduFlow.Api/Controllers/CoursesController.cs)
- [QuizzesController](../../backend/EduFlow.Api/Controllers/QuizzesController.cs)
- [Assessment DTOs](../../backend/EduFlow.Core/DTOs/AssessmentDtos.cs)
- [Course DTOs](../../backend/EduFlow.Core/DTOs/CourseDtos.cs)
- [Courses UI](../../frontend/src/pages/Courses/Courses.jsx)
- [Assessments UI](../../frontend/src/pages/Assessments/Assessments.jsx)
- [AiReview UI](../../frontend/src/pages/AiReview/AiReview.jsx)
- [Action/Tool agent](../../ai-agent/agents/content_action.py)
- [Quiz generator](../../ai-agent/agents/quiz_generator.py)
- [Quiz evaluator](../../ai-agent/agents/quiz_evaluator_agent.py)
- `slide_topic_agent.py`, `tools/registry.py`, `InternalAiToolsController.cs`, `AiGatewayClient.cs`, `journey_screen.dart`, `quiz_screen.dart`.

### Important API endpoints

Current routes to explain; completeness varies:

- `POST/PUT/DELETE /api/courses[/{id}]`, `POST /api/courses/{id}/publish`
- `POST /api/courses/{courseId}/modules`, `POST /api/courses/modules/{moduleId}/lessons`
- `POST /api/courses/modules/{moduleId}/topics`, `POST /api/courses/topics/{topicId}/content-items`
- `POST /api/courses/upload-pdf`, `POST /api/courses/modules/{moduleId}/categorize-topics`
- `GET /api/courses/{courseId}/enrolled-students`
- `POST /api/quizzes`, `POST /api/quizzes/{id}/validate`, `POST /api/quizzes/{id}/publish`
- `POST /api/quizzes/generate-ai`, `POST /api/quizzes/questions/{questionId}/regenerate`
- `GET /api/quizzes/{id}/submissions`, `POST /api/quizzes/submissions/{submissionId}/feedback`
- `PUT /api/aireview/proposals/{id}`, `POST /api/aireview/proposals/{id}/decision`

### Database, clients and AI demonstration

Explain Course/Module/Lesson and Topic/ContentItem hierarchy; Assessment/Configuration/Question/Option; shared Enrollment and Submission/Answer; StudyPlan/Item/reviewer. Trace React authoring to persisted data and intended mobile content. Explain grounding, allow-listed tool execution, structured output, deterministic guard and academic decision before publication.

### Known current limitations

Incomplete own-course checks; AI auto-publication; timed attempts not persisted; grader differs from Python evaluator; publication and validation not universally coupled; no real Flutter content API flow; simulated announcements; cross-service upload-path assumptions.

### Likely technical viva questions

1. What belongs to Admin course governance versus your academic component?
2. Why do role checks alone not establish instructor course ownership?
3. How do curriculum scope and source content constrain generated questions?
4. What prevents an AI draft from reaching students before approval?
5. Which question formats does the actual grader support, and how are marks bounded?
6. Where is the quiz timer enforced?
7. How do your results become Student 3's reward inputs without duplicate business rules?
8. What happens when parsing or generation fails?
9. Which tests call the production grading and review paths?

### Small modification/debugging exercises

- Add a question-configuration validation rule and a failing test.
- Prevent an instructor from editing another instructor's course.
- Reject publication when validation or required review has not passed.
- Trace a mismatched quiz upload route from React to the controller.
- Correct feedback visibility without exposing answers prematurely.
- Explain and fix a shared-storage parsing failure.
- Add a mobile loading/error state to the real curriculum request.

## 17. Evidence Placeholders

Commit: TO RECORD - genuine hash and scoped academic change.
PR: TO RECORD - actual link, review and affected contracts.
Issue: TO RECORD - acceptance criteria and dependencies.
Tests: TO RECORD - commands, date, environment, actual results and limits.
Screenshots: TO RECORD - actual academic UI/API/DB and mobile evidence.
AI usage log: TO RECORD - actual assistance and personal decisions/reflection.
Deployment: TO RECORD - verified authoring/content/AI/mobile workflow.
Lecturer approval: TO CONFIRM - no written evidence supplied.

## 18. Progress Summary

| Category | Evidence level | Interpretation |
|---|---|---|
| Backend | Strong | Extensive authoring/assessment code; correctness/security incomplete |
| Database | Moderate | Academic relations/migrations present; drift and integrity need proof |
| React | Strong | Extensive pages/API integration with storage/error/approval gaps |
| Flutter | Early | Prototype content/quiz presentation; API delivery absent |
| Agentic AI | Moderate | Real generation/tools/parser; publication/evaluator integration incomplete |
| Security | Early | Role attributes without consistent resource checks |
| Testing | Early | Existing test sources; several do not test production behavior |
| Integration | Moderate | Web/backend/AI paths exist; full mobile approval loop absent |
| Documentation/Deployment | Early | Working tracker; accurate personal/deployed evidence still required |

## 19. Progress Update Rules

Update only after verified changes; name the source method/contract, real test result and remaining limitation. Coordinate grading/publication/lifecycle changes with Students 1/3. Never treat UI fallback, test naming or a published status alone as proof of completion. Preserve genuine history and the lecturer-approval caveat.
