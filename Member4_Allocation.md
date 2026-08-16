# Member 4 Allocation: Analytics, Reporting & Quality Assurance

## Overview
**Focus Area:** System-wide analytics, performance tracking, report generation, and third-party integrations (e.g., Email/SMS notifications).

## Technical Responsibilities
* **Backend & DB (ASP.NET Core / PostgreSQL):** 
  * Design schemas and APIs for aggregation queries, report history, and external API integrations.
* **React Web Application:** 
  * Build detailed charts, graphs, and downloadable reports for admins/instructors.
* **Flutter Mobile Application:** 
  * Develop a high-level dashboard for instructors to quickly view class performance on the go.

## Agentic AI Contribution
**Role:** Validation / Safety Agent ("Quality Assurance")
* **Description:** Acts as the workflow gatekeeper. It applies deterministic validation to the generated course and quizzes, checks for harmful content, and enforces **Human Approval**. It pauses the workflow and waits for the instructor to click "Approve" or "Reject" on the React interface before the system saves the AI-generated data.
* **Rubric Alignment:** Fulfills the strict "deterministic validation" and "human approval" requirements of the minimum assessed workflow.
