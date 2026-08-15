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
Traditional Learning Management Systems (LMS) act as passive, monotonous file repositories (static PDFs and lecture videos). This causes high dropout rates, low student engagement, and delayed instructor interventions. Superficial gamification (cosmetic badges slapped onto static syllabi) fails to create real motivation.

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

## 2. System Architecture & High-Level Topology

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

## 3. SE3090 Business Components Breakdown

To satisfy SE3090 modularity and individual ownership requirements, the platform is cleanly partitioned into **four core business components**:

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

## 4. Master 31-Phase Implementation Breakdown

| Phase | Title | Description & Key Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Freeze MVP Scope** | Scope definition across Student, Instructor, and Admin roles. |
| **Phase 2** | **Define 4 Components** | SE3090 component boundaries, service contracts, and ownership. |
| **Phase 3** | **Relational Database** | Normalized PostgreSQL 16 schema with strict relational integrity. |
| **Phase 4** | **Backend Foundation** | Clean Architecture in .NET 8 (`Api`, `Core`, `Infrastructure`, `Tests`). |
| **Phase 5** | **Authentication & RBAC**| JWT tokens, refresh tokens, role-based authorization policies. |
| **Phase 6** | **Course Management** | Hierarchical Course ➔ Module ➔ Lesson engine with prerequisites. |
| **Phase 7** | **Assessment Engine** | Interactive quizzes, question types, auto-scoring, and attempts. |
| **Phase 8** | **XP Engine & Ledger** | Transactional XP accounting (`xp_transactions`). No raw overwrites. |
| **Phase 9** | **Level System** | Mathematical level curve ($XP = 100 \times \text{level}^{1.5}$) and `LevelUp` events. |
| **Phase 10** | **Badge Engine** | Rule-based achievement engine evaluated upon domain events. |
| **Phase 11** | **Streak Engine** | Date-based activity tracking, streak increments, and freeze protection. |
| **Phase 12** | **Daily Challenges** | Dynamic daily & weekly missions with auto-expiring claimable rewards. |
| **Phase 13** | **Leaderboards** | Global, Weekly, and Course rankings powered by Redis Sorted Sets. |
| **Phase 14** | **Learning Journey** | Visual gamified path progression UI (Nodes, Bosses, Milestones). |
| **Phase 15** | **Flutter Student App** | Cross-platform mobile learning app built with Flutter 3.x and BLoC. |
| **Phase 16** | **Student Profile** | Showcase for Avatars, XP level, Streaks, Badges, and Stats. |
| **Phase 17** | **React Dashboard** | Instructor web portal for authoring, analytics, and AI approvals. |
| **Phase 18** | **AI Layer Gateway** | ASP.NET Core secure proxy communicating with LangGraph service. |
| **Phase 19** | **4 AI Agents** | Analysis Agent, Challenge Generator, AI Coach, Validation Agent. |
| **Phase 20** | **Deterministic Safety**| Schema validation, prerequisite checks, and reward bounding. |
| **Phase 21** | **AI Learning Coach** | Function-calling tool-augmented chatbot for targeted tutoring. |
| **Phase 22** | **Adaptive AI Loop** | Closed-loop continuous difficulty and challenge adaptation. |
| **Phase 23** | **Domain Events** | Internal decoupled event pipeline for gamification triggers. |
| **Phase 24** | **Notifications** | Real-time push and in-app alerts for streaks, badges, and challenges. |
| **Phase 25** | **Real-Time SignalR** | Live WebSockets for instant `+XP` toasts and leaderboard shifts. |
| **Phase 26** | **Redis Caching** | High-speed caching for leaderboards and hot session data. |
| **Phase 27** | **Automated Testing** | Unit tests, Integration tests, and AI schema resilience tests. |
| **Phase 28** | **Security Hardening** | OWASP Top 10 mitigation, rate limiting, and password hashing. |
| **Phase 29** | **Audit & Governance** | Immutable logging for all AI generations, validations, and approvals. |
| **Phase 30** | **Docker Deployment** | Multi-container Docker Compose setup for local and cloud environments. |
| **Phase 31** | **12-Sprint Roadmap** | Phased agile sprint plan for structured team implementation. |

---

## 5. Architectural Principle: Deterministic System First

```text
Deterministic System (Core Rules, XP Math, Levels, Badges)
                     +
          Gamification Engine (Events, Streaks, Missions)
                     +
             Agentic AI (LangGraph Recommendations)
                     +
         Human-in-the-Loop Review (Instructor Approval)
```

> ⚠️ **Key Rule**: The AI is **never** responsible for core business logic or raw database modifications. The backend remains the sole authoritative source of truth.

---

## 6. Repository Layout

```text
EduHub/
├── backend/                  # ASP.NET Core 8.0 Clean Architecture Web API
│   ├── EduFlow.Api/          # Controllers, SignalR Hubs, Middleware, Program.cs
│   ├── EduFlow.Core/         # Domain Entities, Interfaces, DTOs, Domain Events
│   ├── EduFlow.Infrastructure/# EF Core, PostgreSQL DbContext, Redis, AI Gateway
│   ├── EduFlow.Tests/        # xUnit & Moq Test Suites
│   └── README.md             # Backend architecture & API documentation
├── frontend/                 # React 18 + Vite + Zustand Instructor Web App
│   ├── src/                  # Components, Pages, Stores, Services
│   └── README.md             # Frontend portal guide & workflows
├── mobile/                   # Flutter 3.x Cross-Platform Student Mobile App
│   ├── lib/                  # BLoC state management, screens, widgets, data layer
│   └── README.md             # Mobile app documentation & UI flows
├── ai-agent/                 # Python 3.11 + LangGraph Multi-Agent Microservice
│   ├── graph/                # LangGraph workflow graphs and agent nodes
│   ├── models/               # Pydantic state and validation schemas
│   ├── tests/                # Deterministic validation and agent test suite
│   └── README.md             # AI subsystem architecture & safety guardrails
├── docs/                     # Technical specifications & design documents
│   ├── IMPLEMENTATION_PLAN.md# Complete 31-phase & 12-sprint execution plan
│   ├── DATABASE_SCHEMA.md    # PostgreSQL 16 ER diagram & entity specifications
│   ├── API_SPECIFICATION.md  # RESTful API endpoints & contracts
│   ├── ADR.md                # Architectural Decision Records
│   └── CI_CD.md              # CI/CD pipelines & GitHub Actions specs
└── README.md                 # Master repository documentation (This file)
```

---

## 7. Quick Start Guide

### Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)
- [Flutter 3.x SDK](https://flutter.dev/docs/get-started/install)
- [Python 3.11+](https://www.python.org/downloads/)
- [Docker Desktop & Compose](https://www.docker.com/products/docker-desktop/)

### 1. Clone the Repository
```bash
git clone https://github.com/organization/eduflow-ai.git
cd eduflow-ai
```

### 2. Start PostgreSQL & Redis with Docker
```bash
docker compose up -d postgres redis
```

### 3. Run Backend (.NET 8 Web API)
```bash
cd backend/EduFlow.Api
dotnet run
# API Swagger accessible at https://localhost:5001/swagger
```

### 4. Run AI Microservice (Python / FastAPI)
```bash
cd ai-agent
python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
# AI service running at http://localhost:8000
```

### 5. Run Instructor Dashboard (React 18)
```bash
cd frontend
npm install
npm run dev
# Dashboard running at http://localhost:5173
```

### 6. Run Student Mobile App (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

---

## 8. License & Academic Integrity
Developed for **SE3090 – Software Engineering Frameworks**. All rights reserved.
