# EduFlow AI – Backend Subsystem ⚙️
> **ASP.NET Core 8.0 Clean Architecture RESTful Web API, SignalR Hubs & PostgreSQL Data Persistence Layer**

---

## 1. Subsystem Architecture Overview

The EduFlow AI backend is built with **C# / ASP.NET Core 8.0**, adhering strictly to Clean Architecture and Event-Driven Domain-Driven Design (DDD) principles:

```text
backend/
├── EduFlow.Api/                    # Presentation Layer: Controllers, SignalR Hubs, Middleware, Filters
│   ├── Controllers/               # REST API Controllers (Auth, Courses, Quizzes, Gamification, AI)
│   ├── Hubs/                      # SignalR Real-Time Hubs (GamificationHub, LeaderboardHub)
│   ├── Middleware/                # Global Exception Handler, Request Logging, JWT Validation
│   ├── appsettings.json           # Environment configurations & DB Connection Strings
│   └── Program.cs                 # Dependency Injection & Pipeline Setup
├── EduFlow.Core/                   # Domain Core: Entities, Interfaces, Enums, DTOs, Domain Events
│   ├── Entities/                  # Domain Entities (User, Course, Quiz, XpTransaction, Badge, etc.)
│   ├── Events/                    # Domain Events (LessonCompleted, QuizCompleted, LevelUp, etc.)
│   ├── Interfaces/                # Repository & Service Interfaces (IGamificationService, etc.)
│   ├── DTOs/                      # Request / Response Data Transfer Objects
│   └── Enums/                     # XpSourceType, DifficultyLevel, ChallengeStatus, BadgeType
├── EduFlow.Infrastructure/         # Infrastructure: EF Core, PostgreSQL DbContext, Redis, External AI
│   ├── Data/                      # ApplicationDbContext, Entity Configurations (Fluent API)
│   ├── Migrations/                # EF Core Migration snapshots
│   ├── Repositories/              # Generic & Specific Repository Implementations
│   ├── Services/                  # GamificationService, RedisService, AiGatewayClient
│   └── EventHandlers/             # MediatR / Internal Event Handlers
└── EduFlow.Tests/                  # Testing: xUnit, Moq, FluentAssertions, Integration Tests
```

---

## 2. The 4 SE3090 Backend Business Components

Each component exposes well-defined REST endpoints, enforces Role-Based Access Control (RBAC), and integrates with the internal domain event pipeline.

### 2.1 Component 1: Gamified Learning & Challenge Management (Student 1)
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/challenges/daily` | `Student` | Retrieve today's active daily mission cards |
| `GET` | `/api/challenges/course/{courseId}` | `Student`, `Instructor` | List active course challenges & boss battles |
| `POST` | `/api/challenges` | `Instructor`, `Admin` | Create a new challenge or boss encounter |
| `POST` | `/api/challenges/{id}/start` | `Student` | **Business Operation**: Start challenge timer & record attempt |
| `POST` | `/api/challenges/{id}/submit` | `Student` | **Business Operation**: Submit challenge solution & claim rewards |
| `GET` | `/api/challenges/{id}/history` | `Student`, `Instructor` | View student challenge attempt history & metrics |

### 2.2 Component 2: Assessment & Interactive Quiz Management (Student 2)
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/quizzes` | `Instructor`, `Admin` | Author a new quiz with time limits & scoring rules |
| `POST` | `/api/quizzes/{id}/questions` | `Instructor` | Add MCQ, code snippet, or ordering questions |
| `GET` | `/api/quizzes/course/{courseId}` | `Student`, `Instructor` | Retrieve published quizzes for a course |
| `POST` | `/api/quizzes/{id}/attempts` | `Student` | **Business Operation**: Start timed attempt & receive randomized question set |
| `POST` | `/api/quizzes/attempts/{id}/submit` | `Student` | **Business Operation**: Auto-grade attempt, calculate score & dispatch events |
| `GET` | `/api/quizzes/attempts/{id}/results`| `Student`, `Instructor` | Fetch question breakdown, explanations, and score |

### 2.3 Component 3: Progress, Rewards & Achievement Management (Student 3)
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/students/me/gamification` | `Student` | Fetch real-time Level, total XP, current Streak, and next level threshold |
| `GET` | `/api/students/me/xp-ledger` | `Student`, `Admin` | **Business Operation**: Retrieve immutable audit log of all XP awards |
| `GET` | `/api/badges` | `Public / Auth` | List all available badges and unlock criteria |
| `GET` | `/api/students/{id}/badges` | `Student`, `Instructor` | View student unlocked badges and achievement progress |
| `POST` | `/api/gamification/streaks/freeze` | `Student` | **Business Operation**: Use streak freeze token to protect learning streak |
| `GET` | `/api/progress/courses/{courseId}` | `Student`, `Instructor` | Fetch visual learning journey path and completed node status |

### 2.4 Component 4: Competition & Social Learning (Student 4)
| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/leaderboards/weekly` | `Student`, `Instructor` | Top students ranked by XP earned during current week (Redis cached) |
| `GET` | `/api/leaderboards/course/{courseId}` | `Student`, `Instructor` | Course cohort leaderboard rankings |
| `POST` | `/api/teams` | `Student`, `Instructor` | Create a student learning squad/team |
| `POST` | `/api/teams/{id}/join` | `Student` | Join a student study squad |
| `GET` | `/api/teams/{id}/challenges` | `Student` | **Business Operation**: Fetch collaborative squad challenges and progress |
| `POST` | `/api/ai/challenges/request` | `Student` | Trigger LangGraph AI Adaptive Challenge generation |
| `GET` | `/api/ai/challenges/pending` | `Instructor` | **Business Operation**: Review AI-generated challenges awaiting HITL approval |
| `POST` | `/api/ai/challenges/{id}/decision` | `Instructor` | **Business Operation**: Approve, modify, or reject AI-generated challenge |

---

## 3. Dedicated Gamification Engine

All XP, Level, Badge, and Streak mutations are handled strictly by a dedicated, transactional `GamificationService`.

### 3.1 Immutable XP Ledger Rule
XP is never directly overwritten. Every award is recorded in `xp_transactions`:

```csharp
public async Task<XpTransactionResult> AwardXpAsync(
    Guid studentId, 
    XpSourceType sourceType, 
    Guid sourceId, 
    int xpAmount, 
    CancellationToken ct = default)
{
    // 1. Append immutable transaction
    var transaction = new XpTransaction(studentId, sourceType, sourceId, xpAmount);
    await _dbContext.XpTransactions.AddAsync(transaction, ct);

    // 2. Update cached student total
    var studentXp = await _dbContext.StudentXp.GetOrAddAsync(studentId, ct);
    studentXp.TotalXp += xpAmount;

    // 3. Evaluate Level Up
    var newLevel = CalculateLevel(studentXp.TotalXp);
    if (newLevel > studentXp.CurrentLevel)
    {
        studentXp.CurrentLevel = newLevel;
        await _eventBus.PublishAsync(new LevelUpEvent(studentId, newLevel));
    }

    // 4. Evaluate Badge rules & Streak
    await _badgeEvaluator.EvaluateAsync(studentId, sourceType, ct);
    
    // 5. Broadcast real-time SignalR toast
    await _hubContext.Clients.User(studentId.ToString())
        .SendAsync("XpEarned", new { Xp = xpAmount, TotalXp = studentXp.TotalXp, Level = studentXp.CurrentLevel });

    await _dbContext.SaveChangesAsync(ct);
    return new XpTransactionResult(studentXp.TotalXp, studentXp.CurrentLevel);
}
```

---

## 4. SignalR Real-Time Hubs

EduFlow AI utilizes ASP.NET Core SignalR WebSockets for zero-latency UI updates:
- **`GamificationHub` (`/hubs/gamification`)**: Dispatches `+XP` toasts, `LevelUp` confetti events, and `BadgeUnlocked` alerts directly to mobile and web clients.
- **`LeaderboardHub` (`/hubs/leaderboard`)**: Broadcasts real-time rank movements when top competitors complete high-XP challenges.

---

## 5. Redis In-Memory Caching Strategy

- **Leaderboards**: Maintained using Redis Sorted Sets (`ZADD`, `ZREVRANGE`) for $O(\log N)$ ranking lookups across tens of thousands of active learners.
- **Cache Invalidation**: On XP award, `ZINCRBY leaderboard:weekly <xp> <studentId>` updates rankings atomically.

---

## 6. Local Setup & Testing

```bash
# Navigate to backend directory
cd backend

# Restore dependencies
dotnet restore

# Run EF Core database migrations
dotnet ef database update --project EduFlow.Infrastructure --startup-project EduFlow.Api

# Run automated test suites
dotnet test

# Start the API server
dotnet run --project EduFlow.Api
```
