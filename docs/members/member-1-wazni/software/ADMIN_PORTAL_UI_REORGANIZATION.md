# Admin Portal UI Reorganization — Phase 1

Admin and Instructor currently share too much UI. This phase separates Admin navigation and simplifies User Management.

## Target Admin navigation

- Overview
- Course Management
- User Management
- Communications Hub

## Admin-only changes

- Hide Assessments & Quizzes, AI Study Approvals, Gamification & XP, and Cohort Insights from the sidebar.
- Rename Curriculum & Modules → Course Management.
- Rename Platform Governance → User Management.
- Retain the user Directory, search/filter controls, user details, roles, account status, enrolled date, and actions.
- Remove AI & Agent Telemetry, Platform Policy, and Telemetry tabs from the visible Admin UI.
- Remove only the visible XP column; XP data and models remain unchanged.
- Keep the Add User placeholder alert unchanged.

## Deferred

- Admin Overview redesign
- Course Management redesign
- Add User implementation
- CRUD/UAT verification
- Backend/database verification

Instructor navigation and functionality are preserved. Shared pages remain available. Learning Agent/RAG and backend/mobile/ai-agent are untouched.
