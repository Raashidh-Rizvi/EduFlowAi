# EduFlow AI – API Contract Blueprint

> **Canonical design/reference document.** Read [Start here](../README.md) and the [responsibility matrix](../responsibilities/RESPONSIBILITY_MATRIX.md). Use [implementation status](17_IMPLEMENTATION_STATUS.md) and current source/evidence to distinguish implemented behavior from targets. Examples and proposed routes are not certified runtime results.

> This document defines the shared API standards, conventions, and cross-component endpoint contracts used across all four business components.

---

## 1. API Standards

### 1.1 Base URL & Versioning

```text
Development:    http://localhost:5204/api
Production:     NOT DEPLOYED — no production URL exists yet

Versioning:     /api/v1/... (current version)
                /api/v2/... (future breaking changes)
```

### 1.2 Standard Response Envelope

All API responses use a consistent wrapper:

**Success (2xx):**
```json
{
  "success": true,
  "data": { },
  "error": null,
  "traceId": "a1b2c3d4-...",
  "timestamp": "2026-09-07T08:30:00Z"
}
```

**Error (4xx / 5xx):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "The requested course does not exist.",
    "details": [ ]
  },
  "traceId": "a1b2c3d4-...",
  "timestamp": "2026-09-07T08:30:00Z"
}
```

### 1.3 Standard Error Codes

| HTTP | Error Code | Meaning |
|------|-----------|---------|
| 400 | `VALIDATION_ERROR` | Input fails validation |
| 400 | `INVALID_REQUEST` | Malformed request |
| 401 | `UNAUTHORIZED` | No valid JWT token |
| 403 | `FORBIDDEN` | Authenticated but not authorized |
| 403 | `NOT_ENROLLED` | Student not enrolled in course |
| 403 | `NOT_OWNER` | Instructor does not own this resource |
| 404 | `{RESOURCE}_NOT_FOUND` | Resource doesn't exist |
| 409 | `ALREADY_EXISTS` | Duplicate resource |
| 409 | `ALREADY_ENROLLED` | Student already enrolled |
| 422 | `BUSINESS_RULE_VIOLATION` | Entity rule rejected (e.g., max attempts) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server-side failure (log + alert) |
| 503 | `AI_SERVICE_UNAVAILABLE` | LangGraph microservice down |

---

## 2. Endpoint Responsibility by Workflow

Read [RESPONSIBILITY_MATRIX.md](../responsibilities/RESPONSIBILITY_MATRIX.md) first. The routes below are contract/design references, not proof that every route or permission is implemented. Use the individual trackers and current controllers for audited routes and gaps.

### 2.1 Identity, Course and Participation APIs

Student 1 coordinates shared auth, user access and global course governance. Student 2 owns academic course/module/lesson/document authoring and publication, plus teaching roster administration. Student 3 owns self-enrollment, own-course access and lesson completion. Admin access does not transfer academic implementation ownership.

```http
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/change-password

# Users
GET    /api/users/me
GET    /api/users/{id}
PUT    /api/users/{id}
GET    /api/users                        [Admin]
PATCH  /api/users/{id}/status           [Admin]

# Courses
POST   /api/courses
GET    /api/courses
GET    /api/courses/mine                 [Instructor]
GET    /api/courses/all                  [Admin]
GET    /api/courses/{id}
PUT    /api/courses/{id}
DELETE /api/courses/{id}
POST   /api/courses/{id}/publish
POST   /api/courses/{id}/archive

# Modules & Lessons
POST   /api/courses/{courseId}/modules
GET    /api/courses/{courseId}/modules
PUT    /api/modules/{id}
DELETE /api/modules/{id}
POST   /api/modules/{moduleId}/lessons
GET    /api/modules/{moduleId}/lessons
GET    /api/lessons/{id}
PUT    /api/lessons/{id}
DELETE /api/lessons/{id}
POST   /api/lessons/{id}/complete        [Student]

# Enrollments
POST   /api/courses/{courseId}/enroll
DELETE /api/courses/{courseId}/enroll
GET    /api/students/me/courses
GET    /api/courses/{courseId}/students  [Instructor, Admin]
POST   /api/courses/{courseId}/students/{studentId}/approve
POST   /api/courses/{courseId}/students/invite

# Documents
POST   /api/courses/{courseId}/documents
GET    /api/courses/{courseId}/documents
DELETE /api/courses/{courseId}/documents/{docId}
GET    /api/courses/{courseId}/documents/{docId}/status
POST   /api/courses/{courseId}/documents/{docId}/summary
```

### 2.2 Assessment & Quiz APIs

Student 2 owns definitions, grading contracts, academic review and publication. Student 3 owns learner attempt/submission/result handling and rewards against those contracts.

```http
# Quiz Management [Instructor, Admin]
POST   /api/quizzes
GET    /api/courses/{courseId}/quizzes
GET    /api/quizzes/{id}
PUT    /api/quizzes/{id}
DELETE /api/quizzes/{id}
POST   /api/quizzes/{id}/publish
POST   /api/quizzes/{id}/close

# Question Management [Instructor, Admin]
POST   /api/quizzes/{quizId}/questions
GET    /api/quizzes/{quizId}/questions
PUT    /api/questions/{id}
DELETE /api/questions/{id}
GET    /api/courses/{courseId}/question-bank

# AI Quiz Generation [Instructor]
POST   /api/ai/quizzes/generate
GET    /api/ai/quiz-drafts
GET    /api/ai/quiz-drafts/{draftId}
PATCH  /api/ai/quiz-drafts/{questionId}/approve
PATCH  /api/ai/quiz-drafts/{questionId}/edit
PATCH  /api/ai/quiz-drafts/{questionId}/reject
POST   /api/ai/quiz-drafts/{draftId}/publish-all

# Student Quiz Flow [Student]
GET    /api/students/me/quizzes
GET    /api/quizzes/{id}/eligibility
POST   /api/quizzes/{id}/start
POST   /api/quizzes/{id}/submit
GET    /api/submissions/{id}/result
GET    /api/quizzes/{id}/history
```

### 2.3 Gamification & Engagement APIs

Student 3 owns learner rewards/progress and analysis; Student 2 owns course-scoped academic insights; Student 1 owns platform policy and audited administrative controls.

```http
# Student (Flutter)
GET    /api/gamification/me
GET    /api/gamification/me/xp
GET    /api/gamification/me/badges
GET    /api/gamification/me/streak
GET    /api/gamification/me/level
GET    /api/gamification/me/challenges
GET    /api/leaderboards/global/weekly
GET    /api/leaderboards/global/alltime
GET    /api/leaderboards/course/{courseId}
GET    /api/leaderboards/me/rank
GET    /api/challenges
GET    /api/challenges/{id}
POST   /api/challenges/{id}/start
POST   /api/challenges/{id}/complete

# Instructor / Admin
GET    /api/analytics/engagement
GET    /api/analytics/at-risk
PATCH  /api/admin/users/{id}/xp         [Admin only]
```

### 2.4 Reporting, AI Review and Notification APIs

Student 1 owns platform reports, workflow lifecycle/validation and notification governance. Student 2 owns academic analytics and approve/reject/revise decisions. Student 3 owns learner objectives, coach/retention/next-action consumers and status. Gateway, state and contracts are shared.

```http
# Analytics [Instructor, Admin]
GET    /api/analytics/student/{id}
GET    /api/analytics/course/{id}
GET    /api/analytics/platform           [Admin]
GET    /api/analytics/quiz/{quizId}

# Reports
POST   /api/reports                      Generate report
GET    /api/reports/{id}
GET    /api/reports/{id}/download        PDF/CSV export
GET    /api/reports                      [Instructor — own; Admin — all]

# AI Approval Workflow
GET    /api/ai/workflows                 List workflows [Instructor]
GET    /api/ai/workflows/{id}            Workflow detail
PATCH  /api/ai/workflows/{id}/approve    Approve AI output
PATCH  /api/ai/workflows/{id}/reject     Reject AI output
PATCH  /api/ai/workflows/{id}/revise     Request revision

# AI Tutor Chat
POST   /api/ai/chat                      Send message to AI tutor [Student]
GET    /api/ai/chat/history              Chat history [Student]
DELETE /api/ai/chat/history              Clear history [Student]

# Notifications
GET    /api/notifications
PATCH  /api/notifications/{id}/read
PATCH  /api/notifications/read-all
DELETE /api/notifications/{id}

# Audit Logs [Admin]
GET    /api/audit-logs
GET    /api/audit-logs?actorId={id}
GET    /api/audit-logs?eventType={type}
```

---

## 3. API Design Rules

### 3.1 Input Validation

Every endpoint must validate all inputs:

```csharp
// Use FluentValidation or Data Annotations
public class CreateCourseRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; }

    [MaxLength(2000)]
    public string Description { get; set; }

    [Required]
    [RegularExpression("^(BEGINNER|EASY|MEDIUM|HARD|EXPERT)$")]
    public string Difficulty { get; set; }
}
```

Return **400 VALIDATION_ERROR** with field-level detail:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more validation errors occurred.",
    "details": [
      { "field": "Title", "message": "Title is required." },
      { "field": "Difficulty", "message": "Invalid difficulty value." }
    ]
  }
}
```

### 3.2 DTOs — Never Return Entities

```csharp
// ❌ Bad — exposes database entity directly
return Ok(courseEntity);

// ✅ Good — map to DTO first
return Ok(new CourseResponseDto
{
    Id = course.Id,
    Title = course.Title,
    InstructorName = course.Instructor.FullName
    // password_hash, internal fields NOT included
});
```

### 3.3 HTTP Status Codes

| Situation | Status Code |
|-----------|------------|
| Create resource | 201 Created + Location header |
| Successful read/update | 200 OK |
| Delete / no content | 204 No Content |
| Async operation started | 202 Accepted |
| Validation error | 400 Bad Request |
| Unauthorized | 401 Unauthorized |
| Forbidden | 403 Forbidden |
| Not found | 404 Not Found |
| Conflict | 409 Conflict |
| Rate limited | 429 Too Many Requests |
| Server error | 500 Internal Server Error |

### 3.4 Pagination (All List Endpoints)

```http
GET /api/courses?page=1&pageSize=20&sort=createdAt&direction=desc&search=python
```

**Response:**
```json
{
  "items": [ ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 250,
  "totalPages": 13,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

For high-volume leaderboards, use **cursor pagination**:
```http
GET /api/leaderboards/global/weekly?cursor={last_rank_score}&limit=50
```

### 3.5 Idempotency

Critical operations that must be idempotent:

| Operation | Idempotency Method |
|-----------|-------------------|
| Quiz submission | UNIQUE(student_id, quiz_id, attempt_number) |
| XP grant | Check XP transactions for existing (student_id, source_type, source_id) |
| Badge award | PRIMARY KEY (student_id, badge_id) |
| Lesson completion | UNIQUE(student_id, lesson_id) |
| Enrollment | UNIQUE(student_id, course_id) |

Clients may include `Idempotency-Key: {uuid}` header for additional safety on payment-like operations.

### 3.6 Correlation / Trace IDs

Every request receives a unique `traceId` in the response. The same `traceId` is logged server-side for debugging:

```csharp
// Middleware injects trace ID
app.Use(async (ctx, next) =>
{
    ctx.TraceIdentifier = ctx.Request.Headers["X-Request-ID"].FirstOrDefault() 
                          ?? Guid.NewGuid().ToString();
    ctx.Response.Headers["X-Trace-ID"] = ctx.TraceIdentifier;
    await next();
});
```

---

## 4. Authentication Headers

```http
# All protected endpoints require:
Authorization: Bearer {access_token}

# Refresh token in cookie (httpOnly, secure)
Cookie: refresh_token={encrypted_token}
```

---

## 5. Rate Limiting Specification

```text
Default (per authenticated user):  100 requests / minute
Unauthenticated:                   20 requests / minute
POST /api/auth/login:              5 requests / minute per IP
POST /api/ai/chat:                 30 requests / minute per user
POST /api/ai/quizzes/generate:     5 requests / minute per instructor
GET  /api/leaderboards/*:          60 requests / minute (cached response)
```

---

## 6. API Documentation

Every endpoint must be documented with:

```yaml
# Swagger / OpenAPI annotation example
summary: Submit a quiz attempt
description: |
  Grades the student's answers server-side and awards XP.
  Timing is enforced server-side — submissions after expiry are accepted but time-penalized.
operationId: SubmitQuizAttempt
tags: [Assessment]
security: [{ bearerAuth: [] }]
parameters:
  - name: id
    in: path
    required: true
    schema: { type: string, format: uuid }
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/QuizSubmissionRequest'
responses:
  '200':
    description: Graded result returned
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/QuizResultResponse'
  '403':
    description: Not enrolled or max attempts reached
  '404':
    description: Quiz not found
```

---

## 7. SignalR Real-Time Events

```text
Hub URL: /hubs/game

Events emitted by server:
  XpGranted          { studentId, amount, sourceType, newTotal }
  LevelUp            { studentId, newLevel, tierName }
  BadgeUnlocked      { studentId, badgeCode, badgeName, iconUrl }
  StreakUpdated      { studentId, currentStreak, longestStreak }
  LeaderboardUpdated { topChanges: [{ studentId, newRank, oldRank, score }] }
  ChallengeAvailable { studentId, challengeId, title, xpReward, expiresAt }
  NotificationPushed { notificationId, type, title, body }
  AIApprovalRequired { instructorId, workflowId, draftTitle }
```
