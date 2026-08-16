# EduFlow AI – Database Relationships & Rules

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : contains

    USERS ||--o{ COURSES : instructs
    COURSES ||--o{ MODULES : contains
    MODULES ||--o{ LESSONS : contains
    USERS ||--o{ ENROLLMENTS : creates
    COURSES ||--o{ ENROLLMENTS : receives

    LESSONS ||--o{ QUIZZES : has
    QUIZZES ||--o{ QUESTIONS : contains
    QUESTIONS ||--o{ ANSWERS : has
    QUIZZES ||--o{ SUBMISSIONS : receives
    USERS ||--o{ SUBMISSIONS : creates
    SUBMISSIONS ||--o{ SUBMISSION_ANSWERS : contains

    USERS ||--o{ XP_TRANSACTIONS : earns
    USERS ||--|| USER_POINTS : owns
    USERS ||--o{ USER_BADGES : unlocks
    BADGES ||--o{ USER_BADGES : awarded
    USERS ||--|| STREAKS : owns

    COURSES ||--o{ CHALLENGES : contains
    CHALLENGES ||--o{ STUDENT_CHALLENGES : assigned
    USERS ||--o{ STUDENT_CHALLENGES : receives

    USERS ||--o{ AI_WORKFLOWS : initiates
    AI_WORKFLOWS ||--o{ AI_WORKFLOW_STEPS : contains
    AI_WORKFLOWS ||--o{ AI_APPROVALS : requires

    USERS ||--o{ AUDIT_LOGS : acts
```

---

# 2. Referential Integrity

Use foreign keys.

Avoid hard deletes where auditability matters.

For users, courses and AI workflow records, prefer:
- soft delete
- status changes
- archival

---

# 3. Indexes

Important indexes:

```text
users(email)
enrollments(student_id, course_id)
courses(instructor_id, status)
quizzes(course_id)
submissions(student_id, quiz_id)
xp_transactions(student_id, created_at)
challenges(course_id, difficulty, status)
student_challenges(student_id, completed_at)
audit_logs(actor_id, created_at)
ai_workflows(student_id, created_at)
```

---

# 4. Transactions

Use DB transactions for:

```text
Quiz submission
XP allocation
Badge award
Enrollment
Approval execution
```

Example:

```text
BEGIN
  persist submission
  calculate result
  create XP transaction
  update points
  commit
```

If any critical step fails, roll back.

---

# 5. Concurrency

Gamification is concurrency-sensitive.

Example:

Two quiz submissions arrive simultaneously.

The XP system must prevent:
- duplicate XP
- duplicate badge
- inconsistent level
- broken leaderboard

Use:
- unique constraints
- transactions
- idempotency keys
- row/version checks where appropriate
