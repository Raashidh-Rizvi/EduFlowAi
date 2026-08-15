# EduFlow AI – REST API Specification 📜
> **OpenAPI 3.0 / REST API Endpoint Contracts for ASP.NET Core 8 Web API**

---

## 1. Authentication & Security Endpoints

### 1.1 User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "instructor@eduflow.ai",
  "password": "Password123!"
}
```
- **Response `200 OK`**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "fullName": "Dr. Sarah Jenkins",
  "role": "Instructor",
  "expiresAt": "2026-08-16T12:00:00Z"
}
```

---

## 2. Course Management Endpoints (Component A)

### 2.1 Get Published Courses
- **Endpoint**: `GET /api/courses?page=1&pageSize=10&search=software`
- **Access**: Authenticated (`Student`, `Instructor`, `Admin`)
- **Response `200 OK`**:
```json
{
  "page": 1,
  "pageSize": 10,
  "totalCount": 24,
  "items": [
    {
      "id": "c1a2b3c4-0000-0000-0000-000000000001",
      "code": "SE3090",
      "title": "Software Engineering Frameworks",
      "instructorName": "Dr. Sarah Jenkins",
      "moduleCount": 8,
      "enrolledStudents": 120
    }
  ]
}
```

### 2.2 Enroll in Course
- **Endpoint**: `POST /api/courses/{courseId}/enroll`
- **Access**: `Student`
- **Response `201 Created`**:
```json
{
  "enrollmentId": "e1f2a3b4-0000-0000-0000-000000000001",
  "courseId": "c1a2b3c4-0000-0000-0000-000000000001",
  "studentId": "s9a8b7c6-0000-0000-0000-000000000001",
  "progressPercentage": 0.0,
  "status": "Active"
}
```

---

## 3. Progress Tracking & Analytics Endpoints (Component B)

### 3.1 Mark Lesson Complete
- **Endpoint**: `POST /api/progress/lessons/{lessonId}/complete`
- **Access**: `Student`
- **Response `200 OK`**:
```json
{
  "lessonId": "l1a2b3c4-0000-0000-0000-000000000001",
  "courseId": "c1a2b3c4-0000-0000-0000-000000000001",
  "newCourseProgress": 42.5,
  "completedAt": "2026-08-15T12:30:00Z"
}
```

### 3.2 Get At-Risk Students Analytics
- **Endpoint**: `GET /api/analytics/courses/{courseId}/at-risk`
- **Access**: `Instructor`, `Admin`
- **Response `200 OK`**:
```json
{
  "courseId": "c1a2b3c4-0000-0000-0000-000000000001",
  "atRiskThresholdScore": 50.0,
  "studentsAtRisk": [
    {
      "studentId": "s9a8b7c6-0000-0000-0000-000000000001",
      "studentName": "Alex Rivera",
      "averageQuizScore": 44.0,
      "completionRate": 25.0,
      "riskFactor": "LowQuizScoresAndLaggingPace"
    }
  ]
}
```

---

## 4. Assessment Engine Endpoints (Component C)

### 4.1 Submit Quiz Answers
- **Endpoint**: `POST /api/assessments/{assessmentId}/submit`
- **Access**: `Student`
- **Request Body**:
```json
{
  "answers": [
    { "questionId": "q1", "selectedOptionIndex": 2 },
    { "questionId": "q2", "selectedOptionIndex": 0 }
  ]
}
```
- **Response `200 OK`**:
```json
{
  "submissionId": "sub123",
  "scoreObtained": 85,
  "maxScore": 100,
  "passed": true,
  "feedback": "Great understanding of PostgreSQL indexing and EF Core transactions."
}
```

---

## 5. Agentic AI & Study Plan Endpoints (Component D)

### 5.1 Request Personalized AI Study Plan
- **Endpoint**: `POST /api/study-plans/request`
- **Access**: `Student`
- **Request Body**:
```json
{
  "courseId": "c1a2b3c4-0000-0000-0000-000000000001",
  "targetGoal": "Prepare for End-Semester Exam and master Entity Framework Core",
  "hoursPerWeek": 10.0,
  "targetCompletionWeeks": 3
}
```
- **Response `202 Accepted`**:
```json
{
  "studyPlanId": "sp-998877",
  "status": "PendingInstructorApproval",
  "estimatedReviewTime": "Within 24 hours",
  "message": "AI multi-agent workflow executed successfully. Proposal submitted to instructor for review."
}
```

### 5.2 Instructor Study Plan Decision (Approve / Reject / Revise)
- **Endpoint**: `POST /api/study-plans/{id}/decision`
- **Access**: `Instructor`, `Admin`
- **Request Body**:
```json
{
  "decision": "Approve", // "Approve" | "Reject" | "Revise"
  "instructorNotes": "Plan looks solid. Ensure student completes the bonus practice quiz on Day 5.",
  "modifiedItems": []
}
```
- **Response `200 OK`**:
```json
{
  "studyPlanId": "sp-998877",
  "status": "Approved",
  "approvedBy": "Dr. Sarah Jenkins",
  "approvedAt": "2026-08-15T13:00:00Z"
}
```
