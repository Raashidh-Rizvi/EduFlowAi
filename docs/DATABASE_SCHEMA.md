# EduFlow AI – Database Schema & ER Model 🗄️
> **PostgreSQL 16 Normalized Relational Schema & Entity Framework Core Model**

---

## 1. Entity Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ ENROLLMENTS : "has"
    USERS ||--o{ SUBMISSIONS : "submits"
    USERS ||--o{ STUDY_PLANS : "requests"
    USERS ||--o{ NOTIFICATIONS : "receives"
    
    COURSES ||--o{ MODULES : "contains"
    COURSES ||--o{ ENROLLMENTS : "enrolled in"
    COURSES ||--o{ ASSESSMENTS : "includes"
    COURSES ||--o{ STUDY_PLANS : "targets"
    
    MODULES ||--o{ LESSONS : "contains"
    LESSONS ||--o{ LESSON_COMPLETIONS : "completed by"
    
    ASSESSMENTS ||--o{ QUESTIONS : "contains"
    ASSESSMENTS ||--o{ SUBMISSIONS : "has"
    SUBMISSIONS ||--o{ SUBMISSION_ANSWERS : "contains"
    
    STUDY_PLANS ||--o{ STUDY_PLAN_ITEMS : "contains"
    STUDY_PLANS ||--o{ AI_WORKFLOW_LOGS : "generates"

    USERS {
        uuid id PK
        string full_name
        string email UK
        string password_hash
        string role "Admin | Instructor | Student"
        datetime created_at
        datetime updated_at
    }

    COURSES {
        uuid id PK
        string title
        string code UK
        text description
        uuid instructor_id FK
        boolean is_published
        datetime created_at
    }

    MODULES {
        uuid id PK
        uuid course_id FK
        string title
        int order_index
    }

    LESSONS {
        uuid id PK
        uuid module_id FK
        string title
        text content
        string video_url
        int estimated_minutes
        int order_index
    }

    ENROLLMENTS {
        uuid id PK
        uuid student_id FK
        uuid course_id FK
        datetime enrolled_at
        float progress_percentage
        string status "Active | Completed | Dropped"
    }

    ASSESSMENTS {
        uuid id PK
        uuid course_id FK
        string title
        string type "Quiz | Assignment"
        int time_limit_minutes
        int max_score
        datetime due_date
    }

    QUESTIONS {
        uuid id PK
        uuid assessment_id FK
        text question_text
        string question_type "MCQ | Text"
        jsonb options
        string correct_answer
        int points
    }

    SUBMISSIONS {
        uuid id PK
        uuid assessment_id FK
        uuid student_id FK
        datetime submitted_at
        int obtained_score
        string feedback
        string status "Submitted | Graded"
    }

    STUDY_PLANS {
        uuid id PK
        uuid student_id FK
        uuid course_id FK
        string target_goal
        int target_weeks
        float hours_per_week
        string status "PendingReview | Approved | Rejected"
        uuid approved_by_instructor_id FK
        datetime created_at
        datetime approved_at
    }

    STUDY_PLAN_ITEMS {
        uuid id PK
        uuid study_plan_id FK
        int day_number
        string activity_title
        uuid referenced_lesson_id FK
        uuid referenced_assessment_id FK
        boolean is_completed
    }

    AI_WORKFLOW_LOGS {
        uuid id PK
        uuid study_plan_id FK
        string agent_name
        jsonb input_data
        jsonb output_data
        int execution_time_ms
        datetime executed_at
    }
```

---

## 2. Table Schemas & Relational Constraints

### 2.1 Core Platform Tables
- `Users`: Stores student, instructor, and admin credentials, password hashes, and assigned roles. Unique constraint on `email`.
- `Courses`: Academic courses managed by instructors. Foreign key reference to `Users(id)`.
- `Modules` & `Lessons`: Hierarchical curriculum units with `order_index` constraints for ordered playback.
- `Enrollments`: Join table tracking student participation in courses, completion percentages, and active status.

### 2.2 Assessment & Grading Tables
- `Assessments`: Quizzes and homework assignments attached to specific courses.
- `Questions`: Multiple-choice and essay questions storing options and answer keys.
- `Submissions` & `SubmissionAnswers`: Student answers, auto-graded marks, and instructor rubric overrides.

### 2.3 Agentic AI Workflow & Audit Tables
- `StudyPlans`: AI-generated study recommendations tied to student goals and instructor approval status.
- `StudyPlanItems`: Granular daily/weekly actionable learning tasks proposed by the Recommendation Agent.
- `AiWorkflowLogs`: Immutable audit logs capturing agent names, tool execution timings, input payloads, and validation results.

---

## 3. Database Indexes & Performance Optimization

```sql
-- Indexes for rapid enrollment & progress lookup
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

-- Indexes for assessment submissions & gradebook querying
CREATE INDEX idx_submissions_assessment_student ON submissions(assessment_id, student_id);

-- Index for instructor pending AI approvals dashboard
CREATE INDEX idx_study_plans_status ON study_plans(status) WHERE status = 'PendingReview';

-- GIN Index on JSONB execution logs for fast audit inspection
CREATE INDEX idx_ai_workflow_logs_data ON ai_workflow_logs USING gin(output_data);
```
