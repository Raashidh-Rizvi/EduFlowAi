# Member 1 – User & Course Management

## Business Component

Owns:
- Students
- Instructors
- Admins
- profiles
- courses
- modules
- lessons
- enrollments

Its Agentic AI responsibility is the **Coordinator / Planner Agent**.

---

# 1. Database

## Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Roles

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
```

## User Roles

```sql
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);
```

## Courses

```text
courses
- id
- title
- description
- instructor_id
- status
- difficulty
- thumbnail_url
- created_at
- updated_at
```

## Modules

```text
modules
- id
- course_id
- title
- description
- display_order
```

## Lessons

```text
lessons
- id
- module_id
- title
- content
- duration_minutes
- display_order
```

## Enrollments

```text
enrollments
- id
- student_id
- course_id
- enrolled_at
- completion_percentage
- status
```

Unique constraint:

```text
(student_id, course_id)
```

---

# 2. API

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

## Users

```http
GET    /api/users/{id}
PUT    /api/users/{id}
GET    /api/users
PATCH  /api/users/{id}/status
```

## Courses

```http
POST   /api/courses
GET    /api/courses
GET    /api/courses/{id}
PUT    /api/courses/{id}
DELETE /api/courses/{id}
POST   /api/courses/{id}/publish
```

## Modules

```http
POST   /api/courses/{courseId}/modules
GET    /api/courses/{courseId}/modules
PUT    /api/modules/{id}
DELETE /api/modules/{id}
```

## Enrollment

```http
POST   /api/courses/{courseId}/enroll
DELETE /api/courses/{courseId}/enroll
GET    /api/students/me/courses
```

---

# 3. React

Pages:

```text
/admin/users
/admin/courses
/admin/courses/create
/admin/courses/:id
/admin/courses/:id/modules
/instructor/students
```

Course creation wizard:

```text
Course information
   ↓
Modules
   ↓
Lessons
   ↓
Publish
```

---

# 4. Flutter

Screens:

```text
Course Catalog
Course Details
Module List
Lesson View
My Courses
Profile
```

---

# 5. Coordinator / Planner Agent

Input:

```json
{
  "studentId": "uuid",
  "objective": "Create a personalized learning plan for Python",
  "courseId": "uuid",
  "constraints": {
    "deadline": "2026-09-01",
    "minutesPerDay": 30
  }
}
```

Output:

```json
{
  "objective": "Python improvement",
  "steps": [
    {
      "type": "ANALYZE_PROGRESS",
      "reason": "Need current skill profile"
    },
    {
      "type": "GENERATE_CHALLENGE",
      "reason": "Practice weak area"
    },
    {
      "type": "RECOMMEND_LESSON",
      "reason": "Reinforce prerequisite"
    }
  ]
}
```

The Coordinator must not directly modify the database.

It delegates tasks to tool-enabled components.

---

# 6. Planner Responsibilities

1. Validate the objective schema.
2. Determine required context.
3. Retrieve available capabilities.
4. Build a structured plan.
5. Delegate each step.
6. Track execution state.
7. Handle failure/retry.
8. Pass the final result to validation.

---

# 7. Planner Failure Handling

Example:

```text
Planner requests student progress
        ↓
Progress service unavailable
        ↓
Retry with exponential backoff
        ↓
Still unavailable
        ↓
Mark plan incomplete
        ↓
Return controlled error
```

The agent must never fabricate missing progress.
