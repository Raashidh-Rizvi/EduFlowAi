> **LEGACY — NOT CURRENT INSTRUCTIONS.** This original pre-reorganization plan is retained for historical/reference purposes only and is not a current source of truth or roadmap. Read the [current ownership matrix](../../responsibilities/RESPONSIBILITY_MATRIX.md), [architecture decisions](../../project/14_ARCHITECTURE_DECISIONS.md), [implementation status](../../project/17_IMPLEMENTATION_STATUS.md) and [current plan](../../project/16_IMPLEMENTATION_PLAN.md). Historical narrative is preserved; link destinations are rebased for this archive location.

# EduFlow AI — Master Step-by-Step Implementation Plan & Roadmap 🚀

> **A Comprehensive 31-Phase Execution Blueprint for Building a Gamified, Adaptive Education Platform**
> *SE3090 – Software Engineering Frameworks*

---

## 0. Final Product Definition & Core Game Loop

EduFlow AI is engineered as a **Gamified Learning Platform First, with AI making the Gamification Adaptive**.

```text
Student selects course
        ↓
Learns lesson (Modules / Videos / Notes)
        ↓
Completes interactive activity & practice
        ↓
Completes quiz / challenge
        ↓
Earns XP / Coins / Badges (Deterministic Gamification Engine)
        ↓
Progresses level & updates streak
        ↓
Leaderboard updates & achievements unlocked
        ↓
AI analyzes performance & identifies knowledge gaps
        ↓
AI generates next suitable adaptive challenge
        ↓
Instructor validates/approves generated content (HITL)
        ↓
Student receives new challenge & continues learning
```

The AI continuously answers:

> **"What is the most useful and engaging thing this student should do next?"**

---

## 1. Current Three-Student Ownership

Read [RESPONSIBILITY_MATRIX.md](../../responsibilities/RESPONSIBILITY_MATRIX.md) first. The execution plan below remains a planning reference, not evidence of implementation completion.

| Student / identity | Primary component | Agentic AI contribution |
|---|---|---|
| Student 1 — Ahamed M.A. / IT24103352 / System Admin | System Administration, User & Course Governance, Reporting and AI Safety | Primary: Validation / Safety. Supporting: Coordinator / Planner, workflow lifecycle, approval safety, auditability and observability |
| Student 2 — Raashidh M.R. / IT24104191 / Instructor | Instructor Curriculum, Assessment and AI Content Management | Primary: Action / Tool. Supporting: Quiz Generator, Slide Topic, Quiz Evaluator |
| Student 3 — Atheek M.F. / IT24103933 / Student | Student Learning, Progress, Gamification and Adaptive Guidance | Primary: Domain Analysis. Supporting: AI Coach, Retention Behaviour, Next Best Action |

Student 1 owns global user/course administration, access governance, platform reporting, auditing and configuration. Student 2 owns academic course content, modules, lessons, topics, documents, assessments, quizzes, grading contracts, academic publishing and academic AI review. Admin access to an Instructor operation does not transfer implementation ownership. Student 3 owns learner participation, attempts, progress, rewards and adaptive guidance.

Each student contributes backend, PostgreSQL, React, Flutter, testing, security/integration and genuine documentation/Git evidence. Shared authentication, database context/migrations, client infrastructure, AI gateway/state and CI remain shared.

The four core demonstrable roles remain **Planner → Domain Analysis → Action / Tool → Validation / Safety → authorized human approval where required**. Group-size approval and any proportional assignment adjustment remain **TO CONFIRM**. This allocation guides future work; it does not prove past contribution.

---

## 2. 31-Phase Execution Breakdown

### Phase 1 — Freeze the MVP Scope

- **Student**: Auth, Course browsing/enrollment, Interactive lessons, Quizzes, XP, Levels, Badges, Daily missions, Streaks, Leaderboards, AI Coach & Challenges.
- **Instructor**: Auth, Course/Module/Lesson CRUD, Quiz/Question CRUD, Student progress oversight, Challenge creation, AI challenge HITL review/approval, Analytics.
- **Admin**: User & role management, platform audit logs, gamification global configuration.

### Phase 2 — Define Four Business Components

Structured separation of concerns across the 4 SE3090 modules ensuring independent development, dedicated controllers, services, and clear database domain boundaries.

### Phase 3 — Relational Database Design (PostgreSQL 16)

- Normalized schemas for Identity, Education, Assessment, Gamification (XP transactions, Levels, Badges, Challenges, Streaks), Competition (Teams, Leaderboards), and AI Governance.

### Phase 4 — Backend Solution Architecture (ASP.NET Core 8.0)

- `EduFlow.Api`: REST API, SignalR Hubs, Middleware, RBAC.
- `EduFlow.Core`: Domain Entities, Enums, DTOs, Repository/Service Interfaces, Domain Events.
- `EduFlow.Infrastructure`: EF Core DbContext, Repositories, Redis, External AI HTTP Gateway.
- `EduFlow.Tests`: Unit and Integration test suites.

### Phase 5 — Authentication & RBAC

- JWT Bearer Authentication + Refresh Tokens.
- Roles: `Student`, `Instructor`, `Admin`. Secure password hashing with BCrypt.

### Phase 6 — Course & Curriculum Engine

- Hierarchical domain: `Course` ➔ `Module` ➔ `Lesson`.
- Enrollment management, prerequisites, and lesson completion tracking.

### Phase 7 — Assessment Engine & Automated Grading

- Quizzes, Question banks (multiple choice, true/false, fill-in-blank, code snippet).
- Timed quiz attempts, automated scoring engine, detailed answer feedback.

### Phase 8 — Deterministic XP Engine & Auditing

- Dedicated `GamificationService` & `XpTransactionService`.
- Every XP event creates an immutable ledger entry (`xp_transactions`). No raw overwrites.

### Phase 9 — Level Progression Curve

- Mathematical leveling curve ($XP = 100 \times \text{level}^{1.5}$).
- Automatic `LevelUpEvent` dispatch upon threshold crossing.

### Phase 10 — Badge & Achievement Rule Engine

- Rule-based badge evaluator: `FirstLessonAchievement`, `QuizMasterAchievement`, `SevenDayStreakAchievement`, `PerfectScoreAchievement`.
- Event listener triggers automatic badge unlocking.

### Phase 11 — Daily Streak Engine

- Date-based streak calculation preventing double-counting.
- Automatic streak increment, freeze tokens, and streak protection mechanisms.

### Phase 12 — Daily & Weekly Challenge System

- Automated mission generator.
- Multi-tier missions (e.g., Complete 1 lesson, Score $\ge 80\%$ on 1 quiz).
- Claimable XP and EduCoin reward payouts.

### Phase 13 — Multi-Tier Leaderboard Engine

- Weekly Leaderboards (resetting every Sunday midnight UTC).
- Course-specific Leaderboards and Global All-Time rankings.
- High-performance caching using Redis Sorted Sets (`ZREVRANGE`).

### Phase 14 — Visual Learning Journey Path

- Gamified node-based path progression (Start ➔ Mission 1 ➔ Challenge ➔ Mission 2 ➔ Boss Battle ➔ Level Up).

### Phase 15 — Flutter Student Mobile App

- Navigation: Home, Courses, Challenges, Leaderboard, Profile.
- Interactive game loop, animated XP bars, streak badges, and offline progress sync.

### Phase 16 — Student Profile & Badges Showcase

- Avatar customization, Level badge, XP progress bar, Streak counter, unlocked Badges gallery, course completion certificates.

### Phase 17 — React 18 Instructor Dashboard

- Modern web dashboard: Course authoring, Quiz builder, At-risk student early warning system, Challenge manager, AI HITL approval portal.

### Phase 18 — AI Microservice Architecture

- Python 3.11 + LangGraph state machine microservice.
- ASP.NET Core acts as the secure AI Gateway; no direct client-to-AI exposure.

### Phase 19 — Multi-Agent LangGraph Swarm

1. **Learning Analysis Agent**: Evaluates student mistakes, velocity, and strengths/weaknesses.
2. **Challenge Generation Agent**: Produces adaptive challenges with balanced difficulty and XP.
3. **AI Learning Coach**: Tool-augmented conversational assistant.
4. **Validation Agent**: Enforces strict JSON schemas and platform safety guardrails.

### Phase 20 — Deterministic AI Validation & Guardrails

- Pydantic schema validation, prerequisite integrity checks, XP reward caps, syllabus adherence.

### Phase 21 — Tool-Augmented AI Learning Coach

- Controlled function-calling tools: `get_student_progress()`, `get_course_content()`, `get_quiz_results()`, `recommend_challenge()`, `explain_question()`.

### Phase 22 — Full Adaptive Personalization Loop

- Closed-loop cycle: Student Activity ➔ Performance Data ➔ AI Analysis ➔ AI Challenge ➔ Deterministic Validation ➔ Instructor Approval ➔ Student Solves ➔ Continuous Adaptation.

### Phase 23 — Event-Driven Architecture (Domain Events)

- Internal decoupled event bus (`MediatR` / C# Event Handlers): `LessonCompleted`, `QuizCompleted`, `ChallengeCompleted`, `LevelUp`, `BadgeUnlocked`.

### Phase 24 — Engagement Notification Engine

- Push notifications & in-app alerts: Streak reminders, new challenge availability, badge unlocks, leaderboard overtakes.

### Phase 25 — Real-Time SignalR Hubs

- Instant UI updates without polling: Toast notifications for `+XP`, level-up confetti, real-time leaderboard rank shifts.

### Phase 26 — Redis In-Memory Caching

- Redis caching for sorted leaderboard rankings, active user session tokens, and hot course catalogs.

### Phase 27 — Comprehensive Testing Strategy

- Unit tests: XP mathematical curves, level thresholds, badge rule evaluation, quiz auto-scoring.
- Integration tests: End-to-end quiz completion ➔ XP transaction ➔ level up ➔ SignalR notification.
- AI tests: Schema adherence, prompt injection resilience, fallback handling.

### Phase 28 — Platform Security & Hardening

- OWASP Top 10 defenses, rate limiting, JWT HMAC-SHA256, HTTPS enforcement, parameter injection prevention.

### Phase 29 — Audit Trails & AI Governance

- Complete auditability for all AI proposals, validation outputs, and instructor approval decisions (`ai_approvals` & `audit_logs`).

### Phase 30 — Containerized Production Deployment

- Docker & Docker Compose setup: `frontend` (Nginx), `backend` (ASP.NET Core), `ai-agent` (FastAPI), `postgres` (PostgreSQL 16), `redis` (Redis 7).

### Phase 31 — 12-Sprint Phased Roadmap

- Systematic agile sprint execution plan from Sprint 1 (Foundation) through Sprint 12 (Finalization).

---

## 3. 12-Sprint Agile Development Roadmap

```text
Sprint 1: Foundation & Architecture (EF Core, PostgreSQL, JWT Auth, RBAC, Base Repositories)
Sprint 2: Education Engine (Courses, Modules, Lessons, Enrollments, Prerequisites)
Sprint 3: Assessment Engine (Quizzes, Questions, Auto-Scoring, Attempts, Feedback)
Sprint 4: Gamification Core (Auditable XP Transactions, Level System, Badge Engine, Streaks)
Sprint 5: Challenges & Missions (Daily/Weekly Challenges, Difficulty Curves, Claim Loops)
Sprint 6: Social & Competition (Leaderboards, Teams, Team Challenges, SignalR Hubs)
Sprint 7: Flutter Student App (Game Loop, Mission Cards, Quiz Player, Profile, XP Animations)
Sprint 8: React Instructor Portal (Course/Quiz CRUD, Analytics, Challenge Manager, AI Review)
Sprint 9: Agentic AI Layer (LangGraph Swarm, Learning Analysis, Challenge Generator, AI Coach)
Sprint 10: AI Governance & Validation (JSON Schemas, Business Constraints, HITL Approval Queue)
Sprint 11: Real-Time & Performance (SignalR Live Events, Redis Caching, DB Query Optimization)
Sprint 12: Finalization & Polish (Full Suite Tests, Security Hardening, Docker Compose, CI/CD)
```
