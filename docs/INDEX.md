# EduFlow AI – Documentation Index

> **EduFlow AI** — Learn. Play. Compete. Master.  
> An AI-Powered Gamified Education Platform for adaptive, engaging, and effective learning.

---

## 📚 Documentation Map

| # | File | Description |
|---|------|-------------|
| — | [INDEX.md](./INDEX.md) | **This file** – documentation navigator |
| — | [README.md](./README.md) | Project overview, vision, team roles, and sprint plan |
| 01 | [01_ARCHITECTURE.md](./01_ARCHITECTURE.md) | Modular monolith system architecture, layers, and data flow |
| 02 | [02_MEMBER1_USER_COURSE.md](./02_MEMBER1_USER_COURSE.md) | User & Course Management component (Member 1) |
| 03 | [03_MEMBER2_ASSESSMENTS.md](./03_MEMBER2_ASSESSMENTS.md) | Assessment & Quiz Engine component (Member 2) |
| 04 | [04_MEMBER3_GAMIFICATION.md](./04_MEMBER3_GAMIFICATION.md) | Gamification & Engagement component (Member 3) |
| 05 | [05_MEMBER4_ANALYTICS.md](./05_MEMBER4_ANALYTICS.md) | Analytics, Reporting & AI Validation component (Member 4) |
| 06 | [06_API_CONTRACTS.md](./06_API_CONTRACTS.md) | Cross-component API contract standards |
| 07 | [07_AI_ORCHESTRATION.md](./07_AI_ORCHESTRATION.md) | LangGraph multi-agent AI architecture & safety |
| 08 | [08_DATABASE_ER.md](./08_DATABASE_ER.md) | PostgreSQL entity relationship diagram |
| 09 | [09_GIT_CI_CD_TESTING.md](./09_GIT_CI_CD_TESTING.md) | Git workflow, CI/CD pipeline, and testing strategy |
| 10 | [10_GAMIFICATION_RULEBOOK.md](./10_GAMIFICATION_RULEBOOK.md) | XP, badges, streaks, and challenge fairness rules |
| 11 | [11_COMPONENT_INTEGRATION_MATRIX.md](./11_COMPONENT_INTEGRATION_MATRIX.md) | Integration touchpoints between all four components |
| 12 | [12_SYSTEM_WORKFLOW.md](./12_SYSTEM_WORKFLOW.md) | End-to-end real-world workflows for all three user roles |
| 13 | [13_RAG_ARCHITECTURE.md](./13_RAG_ARCHITECTURE.md) | Document ingestion, vector search, and RAG pipeline |
| 14 | [14_QUIZ_PIPELINE.md](./14_QUIZ_PIPELINE.md) | AI quiz generation, HITL review, and delivery pipeline |
| 15 | [15_ROLES_AND_PERMISSIONS.md](./15_ROLES_AND_PERMISSIONS.md) | Role-based access control matrix and capability map |
| 16 | [16_MOBILE_APP_GUIDE.md](./16_MOBILE_APP_GUIDE.md) | Flutter student mobile app: screens, flows, and AI features |
| 17 | [17_SECURITY_AND_PRIVACY.md](./17_SECURITY_AND_PRIVACY.md) | Security model, OWASP mitigations, data privacy |
| — | [ADR.md](./ADR.md) | Architectural Decision Records |
| — | [EduFlow_AI_FULL_IMPLEMENTATION.md](./EduFlow_AI_FULL_IMPLEMENTATION.md) | Complete SE3090 implementation blueprint (master reference) |

---

## 🗺️ Quick Navigation by Role

### 👨‍💼 Admin
- [Roles & Permissions](./15_ROLES_AND_PERMISSIONS.md)
- [System Workflow – Admin](./12_SYSTEM_WORKFLOW.md)
- [Analytics & Reporting](./05_MEMBER4_ANALYTICS.md)
- [Security Model](./17_SECURITY_AND_PRIVACY.md)

### 👨‍🏫 Instructor / Teacher
- [System Workflow – Instructor](./12_SYSTEM_WORKFLOW.md)
- [Course & User Management](./02_MEMBER1_USER_COURSE.md)
- [Quiz Pipeline (AI Generation + Review)](./14_QUIZ_PIPELINE.md)
- [RAG Document Architecture](./13_RAG_ARCHITECTURE.md)
- [AI Orchestration](./07_AI_ORCHESTRATION.md)

### 🎓 Student
- [System Workflow – Student](./12_SYSTEM_WORKFLOW.md)
- [Mobile App Guide](./16_MOBILE_APP_GUIDE.md)
- [Gamification Rules](./10_GAMIFICATION_RULEBOOK.md)
- [Assessment Engine](./03_MEMBER2_ASSESSMENTS.md)

---

## 🏗️ Quick Navigation by Topic

| Topic | Document |
|-------|----------|
| How does the whole system work? | [12_SYSTEM_WORKFLOW.md](./12_SYSTEM_WORKFLOW.md) |
| How does AI generate quizzes? | [14_QUIZ_PIPELINE.md](./14_QUIZ_PIPELINE.md) |
| How does document RAG work? | [13_RAG_ARCHITECTURE.md](./13_RAG_ARCHITECTURE.md) |
| What can each role do? | [15_ROLES_AND_PERMISSIONS.md](./15_ROLES_AND_PERMISSIONS.md) |
| How does XP / leveling work? | [10_GAMIFICATION_RULEBOOK.md](./10_GAMIFICATION_RULEBOOK.md) |
| How do all 4 components connect? | [11_COMPONENT_INTEGRATION_MATRIX.md](./11_COMPONENT_INTEGRATION_MATRIX.md) |
| What APIs exist? | [06_API_CONTRACTS.md](./06_API_CONTRACTS.md) |
| What is the database schema? | [08_DATABASE_ER.md](./08_DATABASE_ER.md) |
| How do I set up CI/CD? | [09_GIT_CI_CD_TESTING.md](./09_GIT_CI_CD_TESTING.md) |
| What AI agents exist? | [07_AI_ORCHESTRATION.md](./07_AI_ORCHESTRATION.md) |
