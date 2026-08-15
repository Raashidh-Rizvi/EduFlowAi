# EduFlow AI – React Web Application 🖥️
> **Instructor & Administrator Dashboard built with React 18, Vite, and Zustand**

---

## 1. Subsystem Overview

The EduFlow AI Web Application serves as the comprehensive control center for instructors and administrators to manage curricula, construct quizzes, oversee student progress, launch gamified missions, and review AI-generated challenges via a **Human-in-the-Loop (HITL) Approval Portal**.

### Key Modules & Capabilities
1. **Course & Curriculum Builder**: Create and organize modular courses, interactive lessons, video streams, and milestone checkpoints.
2. **Interactive Assessment Author**: Build multi-format quizzes (MCQs, coding challenges, ordering puzzles) with custom scoring rubrics and time bounds.
3. **Gamification & Challenge Manager**: Create daily and weekly challenges, boss encounters, configure XP rewards, and set difficulty tiers.
4. **Student Analytics & At-Risk Early Warning**: Visual charts tracking completion velocity, score distributions, and flagging struggling students.
5. **AI Challenge HITL Review & Approval Portal**: Review AI-generated adaptive challenges, inspect reasoning and schema compliance, edit questions or rewards, and click **Approve / Reject / Revise**.
6. **Leaderboard & Competition Oversight**: Monitor live cohort rankings and manage student study teams.

---

## 2. Directory Structure

```text
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/                # Icons, gamification badges, illustration assets
│   ├── components/            # Reusable UI components
│   │   ├── common/            # Buttons, Modal dialogs, DataTables, Badges, Loaders
│   │   ├── layout/            # Sidebar, AppHeader, ProtectedRoute, DashboardShell
│   │   ├── courses/           # CourseCard, ModuleTree, LessonEditor
│   │   ├── assessments/       # QuizBuilder, QuestionForm, RubricMatrix
│   │   ├── gamification/      # ChallengeForm, BadgeCard, RewardSelector
│   │   └── ai-review/         # AiProposalDiff, SchemaInspector, ApprovalActions
│   ├── store/                 # Zustand Stores (authStore, courseStore, aiStore, gamificationStore)
│   ├── hooks/                 # Custom React hooks (useAuth, useSignalR, usePagination, useToast)
│   ├── pages/                 # Route views
│   │   ├── Auth/              # Login, Register, Forgot Password
│   │   ├── Dashboard/         # Overview metrics, active challenges, urgent AI reviews
│   │   ├── Courses/           # Course list, Curriculum builder, Enrolled students
│   │   ├── Quizzes/           # Quiz management, Question banks, Gradebook
│   │   ├── Challenges/        # Challenge creation, Daily missions, Boss battles
│   │   ├── Leaderboards/      # Cohort rankings, Squad competitions
│   │   ├── Analytics/         # Class progress, Velocity graphs, At-risk learners
│   │   └── AiReview/          # Pending AI-generated challenges awaiting HITL decision
│   ├── services/              # Axios API clients with JWT interceptors & SignalR listener
│   │   ├── api.js             # Base Axios instance with refresh token rotation
│   │   ├── authService.js     # Auth endpoints
│   │   ├── courseService.js   # Course & Module endpoints
│   │   ├── quizService.js     # Quiz & Question endpoints
│   │   ├── challengeService.js# Gamification & Challenge endpoints
│   │   └── aiReviewService.js # AI Proposal review & decision endpoints
│   ├── App.jsx                # Router configuration & Role-based routes
│   ├── main.jsx               # React DOM entry point
│   └── index.css              # Custom styling, dark mode tokens & glassmorphism variables
├── package.json
└── README.md
```

---

## 3. Human-in-the-Loop (HITL) AI Approval Flow

The React dashboard provides an intuitive interface for instructors to audit and approve AI-generated challenges:

```text
[AI Generates Challenge] ➔ [Deterministic Validation Pass] ➔ [Appears in Instructor Review Queue]
                                                                        │
                                   ┌────────────────────────────────────┼────────────────────────────────────┐
                                   ▼                                    ▼                                    ▼
                          [APPROVE]                           [MODIFY & APPROVE]                         [REJECT]
                   Instantly published to               Instructor tunes questions / XP            Flagged with feedback
                   target student / course                 before final publication                and sent back to AI
```

---

## 4. Local Setup & Development

```bash
# Navigate to frontend
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
# Dashboard available at http://localhost:5173
```
