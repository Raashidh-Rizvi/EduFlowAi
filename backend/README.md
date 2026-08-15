# EduFlow AI – Backend Subsystem ⚙️
> **ASP.NET Core 8.0 RESTful Web API & PostgreSQL Data Persistence Layer**

---

## 1. Subsystem Architecture Overview

The EduFlow AI backend is built with **C# / ASP.NET Core 8.0**, adhering to Clean Architecture principles with a layered separation of concerns:

```
backend/
├── EduFlow.Api/                    # Presentation Layer: Controllers, Middleware, Filters, Swagger
│   ├── Controllers/               # REST API Controllers (Course, Progress, Assessment, Comms, AI)
│   ├── Middleware/                # Global Exception Handler, Request Logging, JWT Validation
│   ├── appsettings.json           # Environment configurations & DB Connection Strings
│   └── Program.cs                 # Dependency Injection & Pipeline Setup
├── EduFlow.Core/                   # Domain Core: Entities, Interfaces, Enums, DTOs
│   ├── Entities/                  # Domain Entities (User, Course, Assessment, StudyPlan, etc.)
│   ├── Interfaces/                # Repository & Service Interfaces
│   ├── DTOs/                      # Request / Response Data Transfer Objects
│   └── Enums/                     # UserRole, PlanStatus, AssessmentType, etc.
├── EduFlow.Infrastructure/         # Infrastructure: EF Core, PostgreSQL DbContext, External Services
│   ├── Data/                      # ApplicationDbContext, Entity Configurations
│   ├── Migrations/                # EF Core Migration snapshots
│   ├── Repositories/              # Generic & Specific Repository Implementations
│   └── Services/                  # AI Client, Email (SendGrid), Push Notification (FCM)
└── EduFlow.Tests/                  # Testing: xUnit, Moq, FluentAssertions, Integration Tests
```

---

## 2. Security & Role-Based Access Control (RBAC)

- **Authentication**: JWT (JSON Web Token) Bearer authentication with HMAC-SHA256 signature verification.
- **Authorization**: Role-based policies (`AdminOnly`, `InstructorOnly`, `StudentOnly`, `InstructorOrAdmin`).
- **Password Hashing**: Cryptographically secure hashing with BCrypt / ASP.NET Core Identity PasswordHasher.
- **CORS Configuration**: Strict allow-list restricting cross-origin requests exclusively to the deployed React dashboard and localhost development ports.

---

## 3. Business Components & API Endpoints

In accordance with SE3090 requirements, each of the 4 student components provides at least 4 meaningful REST endpoints including at least one business-specific operation:

### 3.1 Component A: Course Management (Student 1)
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/courses` | Public / Auth | List published courses with search, filtering, and pagination |
| `POST` | `/api/courses` | `Instructor`, `Admin` | Create a new course with syllabus structure |
| `PUT` | `/api/courses/{id}` | `Instructor`, `Admin` | Update course details, modules, and lessons |
| `DELETE` | `/api/courses/{id}` | `Admin` | Soft-delete / Archive a course |
| `POST` | `/api/courses/{id}/enroll` | `Student` | **Business Operation**: Enroll student and initialize progress tracking |
| `GET` | `/api/courses/{id}/curriculum`| `Student`, `Instructor`| Fetch deep module and lesson tree with prerequisites |

### 3.2 Component B: Progress Tracking & Analytics (Student 2)
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/progress/student/{studentId}` | `Student`, `Instructor` | Fetch real-time completion percentages and module milestones |
| `POST` | `/api/progress/lessons/{lessonId}/complete` | `Student` | **Business Operation**: Mark lesson complete, recalculate pacing velocity |
| `GET` | `/api/analytics/courses/{courseId}/at-risk` | `Instructor`, `Admin` | **Business Operation**: Identify struggling students using scoring signals |
| `GET` | `/api/transcripts/student/{studentId}` | `Student`, `Admin` | Generate student transcript and academic record |
| `GET` | `/api/analytics/dashboard` | `Instructor`, `Admin` | High-level cohort completion and engagement stats |

### 3.3 Component C: Assessment Engine & Grading (Student 3)
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/assessments` | `Instructor` | Create quiz or assignment with rubrics and time constraints |
| `GET` | `/api/assessments/course/{courseId}`| `Student`, `Instructor`| List assessments for a given course |
| `POST` | `/api/assessments/{id}/submit` | `Student` | **Business Operation**: Submit answers for auto-grading or instructor review |
| `GET` | `/api/submissions/{id}` | `Student`, `Instructor` | Retrieve submission results, breakdown, and feedback |
| `PUT` | `/api/submissions/{id}/grade` | `Instructor` | Override/Apply manual rubric scoring with feedback notes |

### 3.4 Component D: Communication Hub & AI Approvals (Student 4)
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/notifications/broadcast` | `Instructor`, `Admin` | Dispatch broadcast announcement to course or platform |
| `GET` | `/api/notifications/user` | `Auth User` | Fetch user notification feed with read/unread toggle |
| `POST` | `/api/study-plans/request` | `Student` | **Business Operation**: Submit goal to trigger Agentic AI study plan workflow |
| `GET` | `/api/study-plans/pending-approval` | `Instructor` | List AI study plan proposals awaiting human review |
| `POST` | `/api/study-plans/{id}/decision` | `Instructor` | **Business Operation**: Approve, reject, or revise AI study plan proposal |
| `GET` | `/api/study-plans/{id}/audit-trail` | `Instructor`, `Admin` | View complete agent execution trace and decision history |

---

## 4. Internal Agentic AI Service Integration

The ASP.NET Core API acts as the **exclusive gateway** to the Python LangGraph microservice. Neither React nor Flutter ever communicates directly with the AI service.

```
[ASP.NET Core Web API] 
       | (POST /orchestrate-study-plan with JWT & student profile)
       v
[Internal Python LangGraph Service @ http://localhost:8000]
       | (Synchronous state machine execution with timeout & retry)
       v
[Valid JSON Study Plan Proposal returned to ASP.NET Core]
       | (Persisted to PostgreSQL with status 'PendingApproval')
```

---

## 5. Local Setup & Execution Guide

### 5.1 Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [PostgreSQL 16](https://www.postgresql.org/)

### 5.2 Configure Environment (`appsettings.Development.json`)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=eduflow_db;Username=postgres;Password=your_password"
  },
  "JwtSettings": {
    "Secret": "SUPER_SECRET_KEY_FOR_JWT_TOKEN_SIGNING_MIN_32_CHARS_LONG",
    "Issuer": "EduFlowAPI",
    "Audience": "EduFlowClients",
    "ExpiryMinutes": 1440
  },
  "AiService": {
    "BaseUrl": "http://localhost:8000",
    "ApiKey": "internal_ai_gateway_secret_token",
    "TimeoutSeconds": 30
  }
}
```

### 5.3 Apply Database Migrations & Seed Data
```bash
# Navigate to API project
cd backend/EduFlow.Api

# Add a migration (if schema modified)
dotnet ef migrations add InitialCreate --project ../EduFlow.Infrastructure --startup-project .

# Apply migrations to PostgreSQL
dotnet ef database update --project ../EduFlow.Infrastructure --startup-project .
```

### 5.4 Run the Backend API
```bash
dotnet run
```
- API Base URL: `https://localhost:7001` or `http://localhost:5000`
- Swagger UI: `https://localhost:7001/swagger`
- Health Check: `https://localhost:7001/health`

---

## 6. Automated Testing

The backend includes comprehensive test suites covering unit logic, service layers, EF Core data access, and API integration:

```bash
# Run all backend tests
cd backend
dotnet test --logger "console;verbosity=detailed"
```

Test coverage targets:
- **Unit Tests**: DTO validation, business domain calculators, grading logic.
- **Integration Tests**: Controller endpoints with in-memory / test PostgreSQL instance.
- **Security Tests**: Protected endpoints return `401 Unauthorized` / `403 Forbidden` without valid claims.
