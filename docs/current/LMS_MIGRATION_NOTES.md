# LMS Refactor — Migration & Deployment Notes

One section per PR in the `feature/lms-architecture-refactor` series. Read the section for
every PR you deploy, in order. The audit and target model are in
[LMS_ARCHITECTURE_AUDIT.md](LMS_ARCHITECTURE_AUDIT.md).

## PR 1 — Security and assessment integrity

No schema change.

- **Demo seeding is Development-only.** In any other environment the API now applies
  migrations only. Seeding errors in Development are logged instead of silently swallowed.
- **XP multiplier** (`POST /api/gamification/multiplier`) is Admin-only.
- **Quizzes with attempts** can't be edited or deleted (HTTP 409); archive them with
  `POST /api/quizzes/{id}/archive`.

## PR 2 — Canonical assessment placement and persisted attempts

Migration: `20261001082933_CanonicalAssessmentPlacementAndAttempts`.

### What the migration does

| Change | Data handling |
|---|---|
| `Assessments.ModuleScopeId` → `ModuleId` (now **required**) | Column renamed, not dropped. Rows without a module are backfilled from the legacy `ScopeId`, then from their topic's or content item's module. |
| Course-level assessments | Moved to their course's first module (lowest `OrderIndex`). A course that has assessments but **no modules** gets a new module named **"Course Assessments"**. |
| `Assessments.TopicScopeId` → `TopicId` (optional) | Renamed and backfilled from `ScopeId` for topic-scoped rows. |
| `ScopeType`/`ScopeId` | Kept as the legacy API view and normalised to the new placement. Dangling topic or content-item targets fall back to `Module`. |
| `Submissions` gain `AttemptNumber`, `Status`, `StartedAt`, `EvaluatedAt`; `SubmittedAt` becomes nullable | Existing rows become `Evaluated` attempts, numbered per (assessment, student) by `SubmittedAt`. |
| `SubmissionAnswers` gain `MaxMarks`, `Feedback`, `EvaluationMethod`, `EvaluationStatus` | `MaxMarks` = the question's points, never below marks already awarded. Method `Deterministic`, status `Evaluated`. |
| Unique `(AssessmentId, StudentId, AttemptNumber)` and `(SubmissionId, QuestionId)` | — |
| Check constraints: question points > 0, `0 ≤ PointsAwarded ≤ MaxMarks`, `0 ≤ ScoreObtained ≤ MaxScore`, `0 ≤ PercentageScore ≤ 100`, `AttemptNumber > 0` | The migration fails, without partial changes, if existing data violates them. |
| `Submissions → Assessments` changes from **Cascade** to **Restrict** | An assessment, and therefore its module or course, can't be deleted while attempts exist. |

### Demo accounts

The model no longer seeds the `admin@`, `instructor@` and `student@eduflow.ai` accounts, so
new databases outside Development never get them. **The migration deliberately does not
delete existing rows**, because deleting them would cascade to real enrollments and
submissions.

**Action for any non-Development database created before this PR:** deactivate those three
accounts or change their passwords. They use the published password `Password123!`.

### Pre-existing migration fix

`20260929221500_AddSupportTicketResponseUpdatedAt` could never run on PostgreSQL: there is no
`integer → uuid` cast. It now converts `SupportTickets.Version` with `gen_random_uuid()`.
Databases that already recorded the migration don't run it again.

### API compatibility

- **Create, upload and AI generation** of a quiz with `scopeType = Course` must now send a
  `moduleId` (HTTP 400 otherwise). Module, topic and content-item scopes derive the module
  themselves.
- **`POST /quizzes/{id}/start`** now persists the attempt. Its response adds
  `attemptNumber`, `startedAt` and `isRecorded`, which is `false` for an instructor
  preview.
- **`POST /quizzes/submit`** accepts an optional `attemptId`. Clients that omit it get
  their open attempt, or a new one subject to the attempt limit.
  - Submitting a closed attempt returns 409.
  - An unknown attempt, or one belonging to another student, returns 404.
- **Create and update responses** are now a summary (`id`, `moduleId`, `topicId`, `status`,
  ...) instead of the serialized entity graph.

### Verified

- Applied to a scratch PostgreSQL 16 database containing legacy-shaped data for every
  backfill case.
- Rolled back and re-applied.
- Delete restriction and the marks check constraint verified with direct SQL.
- Development seeding and a live start → submit run against the migrated database.

## PR 3 — Marking and evaluation

Migration: `AnswerSnapshotsAndMarkAdjustments`. Additive only: a nullable
`SubmissionAnswers.QuestionSnapshotJson` column and a new `MarkAdjustments` table.

### Marking behaviour changes

All marking goes through `EvaluationService` (one evaluator per question type, rules
documented on each evaluator class). Compared with the old controller logic:

| Type | Before | Now |
|---|---|---|
| Matching | Any non-empty wrong answer scored 50% | 0 unless the question's metadata sets `"partialCredit": true`, which awards a share proportional to correct pairs |
| Fill in the blank | A substring of the student's answer counted as correct | Exact match after removing case, whitespace and punctuation. Alternatives come from `CorrectAnswer` (`a\|b`) and metadata `acceptedAnswers` |
| Short answer, open-ended, scenario, code | Keyword overlap with a 4-mark floor, which crashed when a question was worth fewer than 4 marks | `NeedsReview`. The attempt stays `Evaluating` until an instructor marks it (AI-assisted marking arrives in PR 8). A blank answer scores 0 immediately |
| Multiple select | Split on `,` (options containing commas couldn't be marked) | JSON array of option texts, or a `,`/`;` list. All-or-nothing unless `partialCredit` is set |
| Answer key | `CorrectAnswer` text | `QuestionOption.IsCorrect` rows when present, otherwise `CorrectAnswer` |
| Numerical | — | New question type with optional metadata `tolerance` |

### Other changes

- **XP timing:** XP is awarded only when an attempt becomes fully evaluated, either at
  submission or when the last pending answer is marked.
- **Manual marking:** `POST /api/quizzes/attempts/{attemptId}/answers/{questionId}/mark`.
  Changing an existing mark requires a reason. Every mark is stored in `MarkAdjustments`
  (previous and new marks, reason, actor) and audited as `Submission.Marked`.
- **Attempt results:** `GET /api/quizzes/attempts/{attemptId}/result` returns the stored
  result. The question and answer key come from the per-answer snapshot, so editing a
  question later doesn't change past results. Answers recorded before this PR have no
  snapshot and fall back to the current question.
- **Audit events:** `Assessment.Published`, `Assessment.Archived`, `Assessment.Deleted`.
- **Publish validation** checks answer keys through the same snapshot the marker uses. For
  example, a multiple-choice question must have exactly one correct answer, and it must be
  one of the options.

## PR 4 — Grading and course results

Migration: `GradingPoliciesAndCourseResults`. Additive only:

- New tables `GradingPolicies`, `GradeBands`, `CourseGradingConfigurations`, `CourseResults`
  and `GradeOverrides`.
- New column `Assessments.GradeWeightPercent` (nullable; null means the assessment isn't graded).
- Seeds the **institution default scale** as data: A+ ≥85, A ≥80, A- ≥75, B+ ≥70, B ≥65,
  B- ≥60, C+ ≥55, C ≥50, C- ≥45, D ≥40, F ≥0. A band covers its minimum (inclusive) up to the
  next band's minimum (exclusive), so 84.99% is an A.

### Rules

- **Draft weights** may total less than 100%, never more.
  `POST /api/courses/{id}/grading/activate` requires exactly 100%. Weights are never
  normalized or auto-filled.
- **Active configurations:** while grading is active, a weight change that breaks 100% is
  rejected. A weighted assessment can't be deleted (HTTP 409).
- **Course percentage** = Σ(assessment % × weight / 100) using **evaluated** attempts only.
  The course's attempt rule picks the highest (default) or latest attempt. Assessments
  without a result count as 0. `currentPercentage` reports the same weighted figure over only
  the assessed weight.
- **When results are recalculated:**
  - when an attempt becomes fully evaluated, and on every manual mark, in the same transaction;
  - for the whole course on activation and on any configuration change.
- **Course scales:** a course may replace the default with its own scale through
  `PUT /api/courses/{id}/grading` with `bands`. The institution default is never modified.
- **Overrides:** `POST /api/courses/{id}/grades/{studentId}/override` requires a reason and
  a grade that exists in the course scale. Each override stores the previous grade, new
  grade, actor and time (`GradeOverrides`) and is audited as `CourseResult.Overridden`.
  Recalculation keeps the override; the calculated grade is always reported alongside it.

### Endpoints

| Method | Path | Access |
|---|---|---|
| GET/PUT | `/api/courses/{id}/grading` | Course instructor, admin |
| POST | `/api/courses/{id}/grading/activate` | Course instructor, admin |
| GET | `/api/courses/{id}/grade` | Student: own grade. Course instructor: `?studentId=` |
| GET | `/api/courses/{id}/grades` | Course instructor, admin |
| POST | `/api/courses/{id}/grades/{studentId}/override` | Course instructor, admin |

**Deployment:** nothing needs configuring before deploying. Courses stay ungraded until an
instructor assigns weights and activates grading.
