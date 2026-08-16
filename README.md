# EduFlow AI 🎓🎮🤖
> **EduFlow AI — Learn. Play. Compete. Master.**  
> **An AI-Powered Gamified Education Platform Transforming Traditional Coursework into Adaptive Missions, Quizzes, XP Progression, and Personalized Learning Journeys.**  
> *SE3090 – Software Engineering Frameworks | Assignment 1 Project*

[![Backend CI](https://github.com/organization/eduflow-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/organization/eduflow-ai/actions/workflows/ci.yml)
[![Framework](https://img.shields.io/badge/ASP.NET_Core-8.0-purple.svg)](https://dotnet.microsoft.com/)
[![Database](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Caching](https://img.shields.io/badge/Redis-7.x-red.svg)](https://redis.io/)
[![Frontend](https://img.shields.io/badge/React-18-cyan.svg)](https://reactjs.org/)
[![Mobile](https://img.shields.io/badge/Flutter-3.x-02569B.svg)](https://flutter.dev/)
[![AI Orchestration](https://img.shields.io/badge/LangGraph-Agentic_AI-orange.svg)](https://langchain-ai.github.io/langgraph/)

---

## 1. Executive Summary & Core Game Loop

### 1.1 The Real-World Problem
Traditional Learning Management Systems (LMS) act as passive file repositories (static PDFs and lecture videos). This causes high dropout rates, low student engagement, and delayed instructor interventions. Superficial gamification (cosmetic badges slapped onto static syllabi) fails to create real motivation.

### 1.2 The EduFlow AI Solution
**EduFlow AI is built as a Gamified Learning Platform First, with AI making the gamification adaptive.**

```text
Student selects course
        ↓
Learns lesson (Modules, Videos, Notes)
        ↓
Completes interactive practice
        ↓
Completes quiz / challenge
        ↓
Earns XP / EduCoins / Badges (Immutable XP Ledger)
        ↓
Progresses level & updates streak 🔥
        ↓
Leaderboard updates & achievements unlocked 🏆
        ↓
AI analyzes performance & identifies knowledge gaps 🤖
        ↓
AI generates next suitable adaptive challenge
        ↓
Instructor validates & approves generated challenge (HITL) 👨‍🏫
        ↓
Student continues learning on their personalized journey
```

The AI continuously answers:
> **"What is the most useful and engaging thing this student should do next?"**

---

## 2. Seeded Demo Accounts (One-Click RBAC Testing)

All accounts are pre-seeded in PostgreSQL with the master password: `Password123!`

| Role | Name | Email | Starting Profile | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@eduflow.ai` | Full RBAC Permissions | Platform config, user management, global oversight |
| **Instructor** | Dr. Sarah Jenkins | `instructor@eduflow.ai` | Course Lead (SE3090, CS2040) | Curriculum authoring, AI HITL approvals, cohort insights |
| **Student (Novice)** | Alex Rivera | `student@eduflow.ai` | Level 2 (1,250 XP), 5🔥 streak | Daily mission loop, quiz attempts, remedial quests |
| **Student (Master)** | Maya Patel | `maya@eduflow.ai` | Level 6 (8,420 XP), 18🔥 streak | Top of weekly podium, unlocked trophy showcases |
| **Student (Adept)** | Chen Wei | `chen@eduflow.ai` | Level 4 (4,650 XP), 9🔥 streak | Squad member, active challenge participant |
| **Student (Scholar)**| Elena Rostova | `elena@eduflow.ai` | Level 3 (2,940 XP), 6🔥 streak | AI study plan candidate |

---

## 3. System Architecture & High-Level Topology

```text
                                EDUFLOW AI
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
             Flutter              React              Admin
             Student           Instructor          Management
             Mobile                Web               Portal
                │                   │                   │
                └───────────┬───────┴───────────────────┘
                            │ (HTTPS / WSS SignalR)
                    ASP.NET Core 8.0 Web API
                            │
             ┌──────────────┼──────────────┐
             │              │              │
        [Comp 1 & 3]   [Comp 2 & 3]   [Comp 4]
        Gamification    Assessment    Social &
        & Challenges    & Quizzes    Competition
             │              │              │
             └──────────────┼──────────────┘
                            │
                        PostgreSQL 16 (Authoritative Data)
                            │
                     ┌──────┴──────┐
                     │             │
                   Redis 7    Domain Events
                 (Leaderboard/     │
                  Fast Cache)      ▼
                     │       Agentic AI (LangGraph Swarm)
                     │             │
                     │      ┌──────┴──────┐
                     │      │             │
                     │  Learning      Challenge
                     │  Analysis      Generator
                     │   Agent          Agent
                     │      │             │
                     │      └──────┬──────┘
                     │             ▼
                     │    Deterministic Validation
                     │    (Schema, Prerequisites, XP Caps)
                     │             ▼
                     │    Instructor Review (HITL)
                     │             ▼
                     └─────► Published Adaptive Challenges
```

---

## 4. SE3090 Business Components Breakdown

To satisfy SE3090 modularity and individual ownership requirements, the platform is partitioned into **four core business components**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SE3090 MODULE MATRIX                             │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ Component 1       │ Gamified Learning & Challenge Management                │
│ Responsibilities  │ Challenges, missions, difficulty curves, daily/weekly   │
│                   │ missions, boss battles, challenge attempts & grading.   │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Component 2       │ Assessment & Interactive Quiz Management                │
│ Responsibilities  │ Quizzes, question banks (MCQ, code), scoring rubrics,   │
│                   │ timed quiz attempts, automated scoring, answer history. │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Component 3       │ Progress, Rewards & Achievement Management              │
│ Responsibilities  │ Immutable XP transactions, level progression curve,     │
│                   │ badge rule evaluation, daily streaks, certificates.    │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Component 4       │ Competition & Social Learning                           │
│ Responsibilities  │ Leaderboards (Weekly/Course/Class), student teams,      │
│                   │ collaborative missions, SignalR live notifications.     │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 5. Master 31-Phase Implementation Breakdown

| Phase | Title | Description & Key Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Freeze MVP Scope** | Scope definition across Student, Instructor, and Admin roles. | ✅ Done |
| **Phase 2** | **Define 4 Components** | SE3090 component boundaries, service contracts, and ownership. | ✅ Done |
| **Phase 3** | **Relational Database** | Normalized PostgreSQL 16 schema with strict relational integrity. | ✅ Done |
| **Phase 4** | **Backend Foundation** | Clean Architecture in .NET 8 (`Api`, `Core`, `Infrastructure`, `Tests`). | ✅ Done |
| **Phase 5** | **Authentication & RBAC**| JWT tokens, refresh tokens, role-based authorization policies. | ✅ Done |
| **Phase 6** | **Course Management** | Hierarchical Course ➔ Module ➔ Lesson engine with prerequisites. | ✅ Done |
| **Phase 7** | **Assessment Engine** | Interactive quizzes, question types, auto-scoring, and attempts. | ✅ Done |
| **Phase 8** | **XP Engine & Ledger** | Transactional XP accounting (`xp_transactions`). No raw overwrites. | ✅ Done |
| **Phase 9** | **Level System** | Mathematical level curve ($XP = 100 \times \text{level}^{1.5}$) and `LevelUp` events. | ✅ Done |
| **Phase 10** | **Badge Engine** | Rule-based achievement engine evaluated upon domain events. | ✅ Done |
| **Phase 11** | **Streak Engine** | Date-based activity tracking, streak increments, and freeze protection. | ✅ Done |
| **Phase 12** | **Daily Challenges** | Dynamic daily & weekly missions with auto-expiring claimable rewards. | ✅ Done |
| **Phase 13** | **Leaderboards** | Global, Weekly, and Course rankings powered by Redis Sorted Sets. | ✅ Done |
| **Phase 14** | **Learning Journey** | Visual gamified path progression UI (Nodes, Bosses, Milestones). | ✅ Done |
| **Phase 15** | **Flutter Student App** | Cross-platform mobile learning app built with Flutter 3.x. | ✅ Done |
| **Phase 16** | **Student Profile** | Showcase for Avatars, XP level, Streaks, Badges, and Stats. | ✅ Done |
| **Phase 17** | **React Dashboard** | Instructor web portal for authoring, analytics, and AI approvals. | ✅ Done |
| **Phase 18** | **AI Layer Gateway** | ASP.NET Core secure proxy communicating with LangGraph service. | ✅ Done |
| **Phase 19** | **4 AI Agents** | Analysis Agent, Challenge Generator, AI Coach, Validation Agent. | ✅ Done |
| **Phase 20** | **Deterministic Safety**| Schema validation, prerequisite checks, and reward bounding. | ✅ Done |
| **Phase 21** | **AI Learning Coach** | Function-calling tool-augmented chatbot for targeted tutoring. | ✅ Done |
| **Phase 22** | **Adaptive AI Loop** | Closed-loop continuous difficulty and challenge adaptation. | ✅ Done |
| **Phase 23** | **Domain Events** | Internal decoupled event pipeline for gamification triggers. | ✅ Done |
| **Phase 24** | **Notifications** | Real-time push and in-app alerts for streaks, badges, and challenges. | ✅ Done |
| **Phase 25** | **Real-Time SignalR** | Live WebSockets for instant `+XP` toasts and leaderboard shifts. | ✅ Done |
| **Phase 26** | **Redis Caching** | High-speed caching for leaderboards and hot session data. | ✅ Done |
| **Phase 27** | **Automated Testing** | Unit tests, Integration tests, and AI schema resilience tests. | ✅ Done |
| **Phase 28** | **Security Hardening** | OWASP Top 10 mitigation, rate limiting, and password hashing. | ✅ Done |
| **Phase 29** | **Audit & Governance** | Immutable logging for all AI generations, validations, and approvals. | ✅ Done |
| **Phase 30** | **Docker Deployment** | Multi-container Docker Compose setup for local and cloud environments. | ✅ Done |
| **Phase 31** | **12-Sprint Roadmap** | Phased agile sprint plan for structured team implementation. | ✅ Done |

---

## 6. Architectural Principle: Deterministic System First

```text
Deterministic System (Core Rules, XP Math, Levels, Badges)
                     +
          Gamification Engine (Events, Streaks, Missions)
                     +
             Agentic AI (LangGraph Recommendations)
                     +
         Human-in-the-Loop Review (Instructor Approval)
```

> ⚠️ **Key Mandate**: The AI is **never** responsible for core business logic or raw database modifications. The backend remains the sole authoritative source of truth.

---

## 7. Repository Layout & Port Configuration

```text
EduHub/
├── backend/                  # ASP.NET Core 8.0 Clean Architecture Web API (Port 5000 / 5001)
│   ├── EduFlow.Api/          # Controllers, SignalR Hubs, Middleware, Program.cs
│   ├── EduFlow.Core/         # Domain Entities, Interfaces, DTOs, Domain Events
│   ├── EduFlow.Infrastructure/# EF Core, PostgreSQL DbContext, Redis, AI Gateway Client
│   ├── EduFlow.Tests/        # 15 xUnit Unit Tests (100% Passing)
│   └── README.md             # Backend architecture & API documentation
├── frontend/                 # React 18 + Vite + Zustand Instructor Web App (Port 2174)
│   ├── src/                  # Components, Pages (Dashboard, AI Review, Curriculum, Assessments)
│   └── README.md             # Frontend portal guide & workflows
├── mobile/                   # Flutter 3.x Student Mobile App
│   ├── lib/                  # Screens (Home, Journey, Quiz, AI Coach, Podium, Profile)
│   └── README.md             # Mobile app documentation & UI flows
├── ai-agent/                 # Python 3.13 + LangGraph Multi-Agent Microservice (Port 8000)
│   ├── graph/                # 4-Agent Workflow Graph (Analysis, Generator, Coach, Guard)
│   ├── models/               # Pydantic state and validation schemas
│   ├── tests/                # 4 PyTest Validation & Guardrail Tests (100% Passing)
│   └── README.md             # AI subsystem architecture & safety guardrails
├── docs/                     # Technical specifications & design documents
│   ├── IMPLEMENTATION_PLAN.md# Complete 31-phase & 12-sprint execution plan
│   ├── DATABASE_SCHEMA.md    # PostgreSQL 16 ER diagram & entity specifications
│   ├── API_SPECIFICATION.md  # RESTful API endpoints & contracts
│   ├── ADR.md                # Architectural Decision Records (ADR-001 through ADR-009)
│   └── CI_CD.md              # CI/CD pipelines & GitHub Actions specs
└── README.md                 # Master repository documentation (This file)
```

---

## 8. Automated Test Execution Commands

### Run Backend .NET Unit Tests
```bash
dotnet test backend/EduFlow.Tests/EduFlow.Tests.csproj
# Output: Passed! - Failed: 0, Passed: 15, Skipped: 0, Total: 15
```

### Run Python LangGraph AI Test Suite
```bash
cd ai-agent
.\venv\Scripts\python -m pytest tests/
# Output: 4 passed in 0.05s (100%)
```

### Build & Validate React Frontend Production Bundle
```bash
cd frontend
npm run build
# Output: ✓ built in ~4s with 0 errors
```

---

## 9. Quick Start Guide

### 1. Run Backend (.NET 8 Web API)
```bash
cd backend/EduFlow.Api
dotnet run
# API Swagger accessible at https://localhost:5001/swagger or http://localhost:5000/swagger
```

### 2. Run AI Microservice (Python LangGraph / FastAPI)
```bash
cd ai-agent
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
# AI microservice running at http://localhost:8000
```

### 3. Run Instructor Web Dashboard (React 18)
```bash
cd frontend
npm install
npm run dev
# Dashboard running at http://localhost:2174
```

### 4. Run Student Mobile App (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

---

## 10. License & Academic Integrity
Developed for **SE3090 – Software Engineering Frameworks**. All rights reserved.
