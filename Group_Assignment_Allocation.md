# EduFlow - Group Assignment Allocation

## 1. Project Domain & Overview
**Domain:** Education and E-Learning Platform (EduFlow / EduHub)
**Technologies:** ASP.NET Core Web API, PostgreSQL, React, Flutter, Agentic AI Framework.

This document outlines the division of work for a 4-member group in accordance with the SE3090 Assignment 1 Specification. It ensures the "One-Component-Per-Student" rule is met, and that exactly 4 distinct Agentic AI roles collaborate in a unified workflow.

---

## 2. Individual Member Allocations

### 🧑‍💻 Member 1: User & Course Management
* **Business Component:** Core user identities (Students, Instructors, Admins), course catalogs, enrollments, and profiles.
* **Backend & DB:** APIs and tables for `Users`, `Roles`, `Courses`, `Modules`, and `Enrollments`.
* **React Web:** Admin/Instructor dashboard for user management and course creation.
* **Flutter Mobile:** Student view for browsing the course catalog and managing their profile.
* **Agentic AI Role:** **Coordinator / Planner Agent ("Course Architect")**
  * *Responsibility:* Receives raw text prompts from instructors (e.g., "Create a Python crash course"). Analyzes the objective, generates a structured multi-step plan, and delegates specific tasks to other agents.

### 🧑‍💻 Member 2: Assessments & Quizzes
* **Business Component:** Managing quizzes, questions, student submissions, and grading.
* **Backend & DB:** APIs and tables for `Quizzes`, `Questions`, `Submissions`, and `Grades`.
* **React Web:** Instructor interface with forms to build and manage quizzes.
* **Flutter Mobile:** Student interface to take timed quizzes and view immediate results.
* **Agentic AI Role:** **Action / Tool Agent ("Quiz Master")**
  * *Responsibility:* Uses strictly allow-listed tools to execute actions. It receives the plan from the Planner Agent and generates quiz questions/answers based on the course topic, saving them temporarily in the workflow state.

### 🧑‍💻 Member 3: Gamification & Engagement
* **Business Component:** Points, badges, streaks, leaderboards, and student engagement tracking.
* **Backend & DB:** APIs and tables for `Badges`, `UserPoints`, `Leaderboards`, and `Achievements`.
* **React Web:** Admin interface to define gamification rules and view engagement metrics.
* **Flutter Mobile:** Interactive mobile view for students to see their badges, streaks, and leaderboard rank.
* **Agentic AI Role:** **Domain Analysis Agent ("Engagement Analyzer")**
  * *Responsibility:* Analyzes domain-specific data. It evaluates the generated course and quizzes to recommend and attach appropriate gamification rewards (e.g., assigning a 'Python Pioneer' badge upon completion of the generated quizzes).

### 🧑‍💻 Member 4: Analytics, Reporting & Quality Assurance
* **Business Component:** System-wide analytics, performance tracking, report generation, and third-party integrations (e.g., Email notifications).
* **Backend & DB:** Aggregation queries, report history, external API logging.
* **React Web:** Detailed charts, graphs, and downloadable reports for admins/instructors.
* **Flutter Mobile:** High-level dashboard for instructors to view class performance on the go.
* **Agentic AI Role:** **Validation / Safety Agent ("Quality Assurance")**
  * *Responsibility:* Acts as the gatekeeper. It applies deterministic validation to the generated course and quizzes, checks for harmful content, and enforces **Human Approval**. It pauses the workflow and waits for the instructor to click "Approve" or "Reject" on the React interface before committing the AI-generated data to the main PostgreSQL tables.

---

## 3. The Integrated Agentic AI Workflow
To satisfy the "Minimum Assessed Workflow" requirement, all 4 agents work together in the following scenario:

1. **Initiation (Flutter/React):** An Instructor submits a prompt: *"Create a 3-week crash course on basic Python with weekly quizzes and gamification rewards."*
2. **Planning (Member 1 Agent):** The Coordinator Agent breaks this into a structured JSON plan.
3. **Execution (Member 2 & 3 Agents):** 
   - The Action Agent generates the 3 quizzes using specific tools.
   - The Analysis Agent calculates and attaches the gamification badges for completing these quizzes.
4. **Validation & Approval (Member 4 Agent):** The Safety Agent validates the output formats. It halts execution and flags the generated package for **Human Approval**.
5. **Finalization (Cross-Platform):** The Instructor reviews the generated course on the React Web App. Once approved, the data is persisted, and students can see the new course immediately on their Flutter Mobile App.
