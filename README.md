# EduFlow AI 🎓🤖🎮
> **Learn. Play. Compete. Master.**  
> An AI-Powered Gamified Education Platform that transforms traditional coursework into adaptive missions, quizzes, XP progression, and personalized learning journeys.

[![Backend CI](https://github.com/organization/eduflow-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/organization/eduflow-ai/actions/workflows/ci.yml)
[![Framework](https://img.shields.io/badge/ASP.NET_Core-8.0-purple.svg)](https://dotnet.microsoft.com/)
[![Database](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Caching](https://img.shields.io/badge/Redis-7.x-red.svg)](https://redis.io/)
[![Frontend](https://img.shields.io/badge/React-18-cyan.svg)](https://reactjs.org/)
[![Mobile](https://img.shields.io/badge/Flutter-3.x-02569B.svg)](https://flutter.dev/)
[![AI](https://img.shields.io/badge/LangGraph-Agentic_AI-orange.svg)](https://langchain-ai.github.io/langgraph/)

---

## 🎯 What is EduFlow AI?

Most students lose focus. They use their phones, get distracted, and only study when forced. **EduFlow AI exists to fix that.**

EduFlow AI is a gamified, AI-powered education platform where:
- 📱 **Students learn through their phone** in a game-like experience — earning XP, unlocking badges, maintaining streaks, and competing on leaderboards
- 👨‍🏫 **Instructors manage courses and let AI do the heavy lifting** — uploading documents that become a searchable knowledge base, reviewing AI-generated quizzes, and monitoring student performance
- 👨‍💼 **Admins keep the platform running** — managing users, roles, and platform-wide settings
- 🤖 **AI agents power the intelligence** — RAG-based document Q&A, adaptive quiz generation, AI tutoring, and learning analytics

> The goal: students learn **by choice**, not by force.

---

## 🏗️ System Architecture

```
                              EDUFLOW AI
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
           Flutter              React              Admin
           Student           Instructor          Management
           Mobile                Web               Portal
              │                   │                   │
              └───────────┬───────┴───────────────────┘
                          │ HTTPS / WSS SignalR
                  ASP.NET Core 8.0 Web API
                          │
           ┌──────────────┼──────────────┐
           │              │              │
      [Component 1]  [Component 2]  [Component 3+4]
      Gamification    Assessment    Social & Analytics
      & Challenges    & Quizzes     & Reporting
           │              │              │
           └──────────────┼──────────────┘
                          │
                      PostgreSQL 16
                          │
                   ┌──────┴──────┐
                   │             │
                 Redis 7    AI Microservice
              (Leaderboard)  (Python + LangGraph)
                             │
                    ┌────────┴────────┐
                    │                 │
               RAG Pipeline    Multi-Agent Swarm
               (pgvector)      (4 Agents)
```

---

## 👥 User Roles

| Role | Interface | Key Capabilities |
|------|-----------|-----------------|
| **👨‍💼 Admin** | React Web Portal | User management, role assignment, platform config, global analytics, audit logs |
| **👨‍🏫 Instructor** | React Web Portal | Course creation, document upload, RAG knowledge base, AI quiz review, student monitoring |
| **🎓 Student** | Flutter Mobile App | Learn, take quizzes, chat with AI tutor, earn XP/badges, compete on leaderboard |

---

## ✨ Core Features

### For Students (Mobile App)
- 🗺️ **Visual Learning Journey** — gamified path map with lessons, milestones, and boss battles
- ⚡ **Adaptive Quizzes** — AI-generated, instructor-approved quizzes tailored to weak areas
- 🤖 **AI Tutor** — 24/7 chat assistant powered by course documents (RAG)
- 📄 **Document Summaries** — instant AI summaries of course materials
- 🔥 **Streak System** — daily activity streaks with reminders
- 🏆 **XP & Level System** — earn experience points, level up, unlock avatar frames
- 🥇 **Leaderboard** — weekly, course, and global rankings
- 🏅 **Badges & Achievements** — over 15 badge types for various accomplishments

### For Instructors (Web Dashboard)
- 📚 **Course Builder** — create courses → modules → lessons with ease
- 📂 **Document Upload & RAG** — PDFs/DOCX become a searchable AI knowledge base
- 🤖 **AI Quiz Generator** — one-click generation of MCQ, fill-in-blank, dropdown quizzes
- ✅ **Human-in-the-Loop Review** — approve, edit, or reject AI-generated questions
- 👩‍🎓 **Student Management** — add students, approve enrollment requests, view progress
- 📊 **Analytics Dashboard** — completion rates, quiz performance, struggling students

### For Admins (Management Portal)
- 👥 **Full User Control** — create, activate, deactivate, assign roles
- 🔧 **Platform Configuration** — XP rules, badge rules, enrollment settings
- 📈 **Platform-Wide Analytics** — institution-level insights and reports
- 🔍 **Audit Logs** — immutable log of all sensitive actions

---

## 🤖 AI Architecture

EduFlow AI uses a **LangGraph multi-agent swarm** with 4 specialized agents:

```
Coordinator / Planner Agent  →  Understands objectives, builds execution plan
Action / Tool Agent          →  Executes controlled education tools (quiz gen, summaries)
Domain Analysis Agent        →  Analyzes student performance, detects weak areas
Validation / Safety Agent    →  Validates AI output against business rules + schema
                                       ↓
                             Human-in-the-Loop Review
                             (Instructor approves before content reaches students)
```

> **Key principle**: AI generates drafts. Instructors approve. Backend enforces rules.  
> The AI never writes directly to the database, assigns grades, or bypasses instructor review.

### RAG Pipeline

```
Upload PDF/DOCX → Extract Text → Chunk (500 tokens) → Embed → pgvector store
                                                              ↓
Student asks question → Hybrid search (semantic + keyword) → Top 5 chunks
                                                              ↓
                                                    LLM generates answer
                                                    grounded in course content
```

---

## 🎮 Gamification System

| Mechanism | Description |
|-----------|-------------|
| **XP (Experience Points)** | Earned for lessons, quizzes, challenges, streaks |
| **Levels** | XP threshold: `100 × level^1.5` — 31 levels |
| **Badges** | 15+ badge types, awarded by server-side rule engine |
| **Daily Streak** | Calendar-day activity tracking with reminders |
| **Daily Missions** | Auto-generated daily & weekly challenges |
| **Leaderboard** | Weekly reset; course, global, and squad rankings |
| **Boss Battles** | Chapter-end challenges with high XP rewards |

---

## 📁 Repository Structure

```
EduFlow/
├── backend/                    # ASP.NET Core 8.0 Clean Architecture Web API
│   ├── EduFlow.Api/            # Controllers, SignalR Hubs, Middleware
│   ├── EduFlow.Core/           # Domain Entities, Interfaces, DTOs, Events
│   ├── EduFlow.Infrastructure/ # EF Core, PostgreSQL, Redis, AI Gateway
│   └── EduFlow.Tests/          # xUnit Unit & Integration Tests
│
├── frontend/                   # React 18 + Vite Instructor Web Portal
│   └── src/                    # Components, Pages, Zustand state
│
├── mobile/                     # Flutter 3.x Student Mobile App
│   └── lib/                    # Screens, features, Riverpod state
│
├── ai-agent/                   # Python 3.x + LangGraph AI Microservice
│   ├── graph/                  # 4-agent workflow graph
│   ├── models/                 # Pydantic schemas
│   └── tests/                  # AI validation tests
│
├── docs/                       # 📚 Full technical documentation
│   ├── INDEX.md                # ← START HERE for docs navigation
│   ├── 01_ARCHITECTURE.md
│   ├── 12_SYSTEM_WORKFLOW.md
│   ├── 13_RAG_ARCHITECTURE.md
│   ├── 14_QUIZ_PIPELINE.md
│   ├── 15_ROLES_AND_PERMISSIONS.md
│   ├── 16_MOBILE_APP_GUIDE.md
│   ├── 17_SECURITY_AND_PRIVACY.md
│   └── ... (17 total docs)
│
├── HOW_TO_RUN.md               # Setup & run instructions
└── README.md                   # ← You are here
```

---

## 🚀 Quick Start

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/)
- [Python 3.11+](https://python.org/)
- [Flutter 3.x](https://flutter.dev/docs/get-started/install)
- [PostgreSQL 16](https://www.postgresql.org/download/)
- [Redis 7](https://redis.io/download/)

### 1. Run the Backend (ASP.NET Core API)
```bash
cd backend/EduFlow.Api
dotnet run
# → API: http://localhost:5000
# → Swagger: http://localhost:5000/swagger
```

### 2. Run the AI Microservice (Python + LangGraph)
```bash
cd ai-agent
python -m venv venv
.\venv\Scripts\activate         # Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
# → AI Service: http://localhost:8000
```

### 3. Run the Instructor Web Portal (React)
```bash
cd frontend
npm install
npm run dev
# → Dashboard: http://localhost:2174
```

### 4. Run the Student Mobile App (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

> 📖 For detailed setup instructions, see [HOW_TO_RUN.md](./HOW_TO_RUN.md)

---

## 🔐 Demo Accounts

All accounts use password: `Password123!`

| Role | Name | Email | Profile |
|------|------|-------|---------|
| **Admin** | System Administrator | `admin@eduflow.ai` | Full permissions |
| **Instructor** | Dr. Sarah Jenkins | `instructor@eduflow.ai` | Course lead, HITL approvals |
| **Student** | Alex Rivera | `student@eduflow.ai` | Level 3, 5🔥 streak |
| **Student** | Maya Patel | `maya@eduflow.ai` | Level 6, 18🔥 streak, #1 leaderboard |
| **Student** | Chen Wei | `chen@eduflow.ai` | Level 4, 9🔥 streak |

---

## 🧪 Running Tests

```bash
# Backend .NET unit + integration tests
dotnet test backend/EduFlow.Tests/EduFlow.Tests.csproj
# → Passed: 15, Failed: 0

# Python AI agent tests
cd ai-agent
python -m pytest tests/ -v
# → 4 passed

# Frontend (Playwright E2E)
cd frontend
npx playwright test
```

---

## 📚 Documentation

| What you need | Where to go |
|---------------|-------------|
| **Full docs index** | [docs/INDEX.md](./docs/INDEX.md) |
| **System workflows (how it all works)** | [docs/12_SYSTEM_WORKFLOW.md](./docs/12_SYSTEM_WORKFLOW.md) |
| **RAG / document AI architecture** | [docs/13_RAG_ARCHITECTURE.md](./docs/13_RAG_ARCHITECTURE.md) |
| **Quiz generation pipeline** | [docs/14_QUIZ_PIPELINE.md](./docs/14_QUIZ_PIPELINE.md) |
| **Roles & permissions** | [docs/15_ROLES_AND_PERMISSIONS.md](./docs/15_ROLES_AND_PERMISSIONS.md) |
| **Mobile app (Flutter) guide** | [docs/16_MOBILE_APP_GUIDE.md](./docs/16_MOBILE_APP_GUIDE.md) |
| **Security & privacy** | [docs/17_SECURITY_AND_PRIVACY.md](./docs/17_SECURITY_AND_PRIVACY.md) |
| **AI agent architecture** | [docs/07_AI_ORCHESTRATION.md](./docs/07_AI_ORCHESTRATION.md) |
| **Database schema** | [docs/08_DATABASE_ER.md](./docs/08_DATABASE_ER.md) |
| **API contracts** | [docs/06_API_CONTRACTS.md](./docs/06_API_CONTRACTS.md) |
| **Gamification rules** | [docs/10_GAMIFICATION_RULEBOOK.md](./docs/10_GAMIFICATION_RULEBOOK.md) |
| **ADR (architecture decisions)** | [docs/ADR.md](./docs/ADR.md) |

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | ASP.NET Core 8.0 | REST API, SignalR real-time, RBAC |
| **Database** | PostgreSQL 16 + pgvector | Relational data + vector embeddings |
| **Cache** | Redis 7 | Leaderboards, session cache, hot data |
| **Web Frontend** | React 18 + Vite + Zustand | Instructor & Admin web portal |
| **Mobile** | Flutter 3.x + Riverpod | Student learning app (iOS + Android) |
| **AI Microservice** | Python 3.x + FastAPI + LangGraph | Multi-agent AI orchestration |
| **ORM** | Entity Framework Core 8 | Database access + migrations |
| **Auth** | JWT (RS256) + Refresh Tokens | Stateless authentication |
| **Real-time** | ASP.NET Core SignalR | XP toasts, badge alerts, leaderboard updates |
| **Vector Search** | pgvector (HNSW) | Semantic document retrieval |
| **LLM** | OpenAI GPT-4o / local model | Quiz generation, tutoring, summaries |
| **CI/CD** | GitHub Actions | Automated test + build pipeline |

---

## 📋 Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1-5 | Scope, DB schema, backend foundation, auth | ✅ Done |
| Phase 6-7 | Course management, assessment engine | ✅ Done |
| Phase 8-11 | XP ledger, level system, badges, streaks | ✅ Done |
| Phase 12-14 | Daily challenges, leaderboards, learning journey | ✅ Done |
| Phase 15-17 | Flutter app, profile, React dashboard | ✅ Done |
| Phase 18-22 | AI gateway, 4 agents, AI coach, adaptive loop | ✅ Done |
| Phase 23-26 | Domain events, notifications, SignalR, Redis | ✅ Done |
| Phase 27-31 | Testing, security, deployment, documentation | ✅ Done |

---

## 🎓 Academic Context

Developed for **SE3090 – Software Engineering Frameworks**.  
The platform is organized into **4 business components** with individual team ownership:

| Component | Description | Team Member |
|-----------|-------------|-------------|
| **C1** | Gamified Learning & Challenge Management | Member 1 |
| **C2** | Assessment & Interactive Quiz Management | Member 2 |
| **C3** | Progress, Rewards & Achievement Management | Member 3 |
| **C4** | Competition, Social Learning & Analytics | Member 4 |

---

## 📄 License

Developed for SE3090 – Software Engineering Frameworks. All rights reserved.
