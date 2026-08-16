# EduFlow AI – API Contract Blueprint

## 1. API Standards

Base path:

```text
/api/v1
```

Responses:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "traceId": "uuid"
}
```

Error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "Course does not exist."
  },
  "traceId": "uuid"
}
```

---

# 2. Endpoint Ownership

## Member 1

```text
POST   /auth/register
POST   /auth/login

GET    /users
GET    /users/{id}
PUT    /users/{id}

POST   /courses
GET    /courses
GET    /courses/{id}
PUT    /courses/{id}
DELETE /courses/{id}

POST   /courses/{id}/modules
GET    /courses/{id}/modules

POST   /modules/{id}/lessons
PUT    /lessons/{id}

POST   /courses/{id}/enroll
GET    /students/me/courses
```

## Member 2

```text
POST /quizzes
GET  /quizzes/{id}
PUT  /quizzes/{id}

POST /quizzes/{id}/questions

POST /quizzes/{id}/attempts
POST /attempts/{id}/submit
GET  /attempts/{id}/result
```

## Member 3

```text
GET /gamification/me
GET /gamification/me/xp
GET /gamification/me/badges
GET /gamification/me/achievements
GET /gamification/me/streak

GET /leaderboards/global
GET /leaderboards/course/{courseId}
GET /leaderboards/weekly

GET /challenges
GET /challenges/{id}
POST /challenges/{id}/start
POST /challenges/{id}/complete
```

## Member 4

```text
GET  /analytics/student/{id}
GET  /analytics/course/{id}
GET  /analytics/platform

POST /reports
GET  /reports/{id}

GET /ai/workflows
GET /ai/workflows/{id}
POST /ai/workflows/{id}/approve
POST /ai/workflows/{id}/reject

GET /audit-logs
```

---

# 3. API Rules

- Validate all input.
- Use pagination for collections.
- Use filtering/sorting where appropriate.
- Never return database entities directly.
- Use DTOs.
- Return correct HTTP status codes.
- Include correlation/trace IDs.
- Enforce authorization at endpoint and application level.

---

# 4. Pagination

Recommended:

```text
GET /courses?page=1&pageSize=20&sort=createdAt&direction=desc
```

Response:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 250,
  "totalPages": 13
}
```

For very large leaderboards, cursor pagination is preferable.

---

# 5. Idempotency

Important operations:
- quiz submission
- XP grant
- webhook processing
- report generation
- notification sending

Use an idempotency key where repeated requests could create duplicate effects.
