# Quiz Evaluation — Attempts, Grading & Scores

Updated 2026-10-03. Source-backed: `QuizzesController`, `EvaluationService`,
`AttemptGradingService`, `AttemptService`, `GradeService`.
Generation of the quizzes evaluated here: [QUIZ_GENERATION](QUIZ_GENERATION.md).

## Student flow

```
Instructor publishes quiz (QuizStatus.Published)
   ▼
Student sees assigned/published quiz            (scope = course/module; access via AssessmentAccessService)
   ▼
POST /api/quizzes/{id}/start                    server creates Submission { AttemptNumber = last+1, Status = InProgress }
   ▼
Student answers — learner DTO carries NO correct answers or explanations (ToLearnerQuestionDto)
   ▼
POST /api/quizzes/submit { quizId, answers, attemptId }   ← attemptId from start (server-bound, not a client student id)
   ▼
AttemptGradingService → EvaluationService.EvaluateAttempt (deterministic, per question type)
   ▼
Submission persisted { AttemptNumber unique per (assessment, student), Status = Evaluated, PercentageScore }
   ▼
Student: GET /api/quizzes/attempts/{attemptId}/result   → score, percentage, per-question outcomes, feedback
Instructor: GET /api/quizzes/{id}/submissions           → every student's attempt, marks, status
```

- **Attempt isolation**: unique index `(AssessmentId, StudentId, AttemptNumber)` +
  `AttemptNumber > 0` check constraint; the student identity always comes from the JWT —
  client-supplied student ids are never trusted.
- **No duplicate attempts**: submit binds to the exact attempt created by `start`;
  re-submitting the same attempt cannot mint a second row.

## Deterministic grading

`EvaluationService` (Infrastructure/Services/Evaluation) dispatches to one evaluator per
question type — `SingleChoice`, `TrueFalse`, `MultipleSelect`, `FillInBlank`, `Numerical`,
`Matching`, `Ordering`, `Subjective` — each with its own answer-normalisation rules
(whitespace/case folding via `AnswerText`, numeric tolerance, optional partial credit
flagged in question `metadataJson.partialCredit`).

Safety properties:

- The answer key comes from option rows flagged `IsCorrect` (fallback: stored correct
  answer), read server-side only.
- Defence in depth: an evaluator that awards marks outside `0..MaxMarks` throws instead of
  returning an impossible score.
- Subjective answers can land in `AnswerEvaluationStatus.Pending`; the instructor marks or
  overrides them via `POST /api/quizzes/attempts/{attemptId}/answers/{questionId}/mark`
  (override requires a reason, recorded alongside the mark adjustment).

## Score calculation

```
obtained = Σ awarded marks        total = Σ question points
percentage = round(obtained / total × 100, 2)        (0 when total = 0)
pending    = count of answers not yet Evaluated
```

`GradeService` then applies the course grading policy: attempt scoring rule
(e.g. **Latest** attempt wins), weighted components, and grade bands
(lowest band must start at 0, each band boundary distinct — validated). XP/coins from the
quiz rewards are dispatched through domain events on evaluation (gamification is outside
the AI pipeline).

## Dashboards

- **Student** (StudentPortal / attempt result): score, percentage, correct/incorrect per
  question, attempt number, explanations/feedback as permitted by course feedback policy.
- **Instructor** (Assessments submissions modal / Courses results): per-student submissions
  with marks and pending-review flags, marking and feedback tools
  (`POST /api/quizzes/submissions/{id}/feedback`), plus course results via
  `GradeService`-backed endpoints (top/average/completion statistics).
- Failures on these paths use the same structured error contract
  (`QUIZ_EVALUATION_FAILED`, `QUIZ_SAVE_FAILED`, `QUIZ_ASSIGNMENT_FAILED`) surfaced through
  the frontend error mapper — never raw server errors.

## Security confirmations

- Answer keys never serialize to students (learner DTO + `Phase1SecurityTests`
  feedback-visibility coverage).
- Authorization: `[Authorize]` class-level on quiz routes; access rules in
  `AssessmentAccessService`; instructor-only marking/feedback/submissions endpoints.
- Student isolation: attempts and results keyed by the authenticated principal.
