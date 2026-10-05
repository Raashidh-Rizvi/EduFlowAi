# EduFlow AI — Application Overview Script

## 1. Intro (what it is)
- EduFlow AI is a learning platform with courses, quizzes, gamification and AI help.
- It has three roles: **Admin**, **Instructor** and **Student**.
- AI is used for two jobs:
  - **Quiz Generator Agent**: makes quizzes from lecture PDFs.
  - **Learning Agent**: an AI tutor for students.

## 2. Tech stack
- **Frontend**: React + Vite (port 2174). Admin, Instructor and Student portals.
- **Backend**: ASP.NET Core (.NET 8) + EF Core (port 5204). The main business API.
- **Database**: PostgreSQL.
- **AI service**: Python FastAPI (port 8888).
- **Vector DB**: ChromaDB. Stores indexed lecture chunks for RAG.
- **LLM providers**: Gemini, Groq and Azure OpenAI. You can pick one for each request.
- **Mobile**: Flutter student app.
- **Request flow**: React → ASP.NET → Python. The browser never calls Python directly.
- **Run locally**: `npm run dev` from the repo root starts all three services.

## 3. Admin
- Creates instructor accounts and manages all users (roles, activate or deactivate).
- Manages course inventory and access for the whole platform.
- Platform Summary dashboard: monitors the whole system.
- Audit Logs: tracks who did what.
- Support Desk: handles support tickets.
- Review Moderation: moderates course reviews and ratings.
- Admin Profile page.

## 4. Instructor
- Creates and manages their own courses, modules, lessons and topics.
- Uploads PDFs and slides, which are indexed into ChromaDB for RAG.
- **AI quiz generation**:
  - Chooses course or module, topic, difficulty, question count, question types, time limit, pass mark, XP and coin reward.
  - Can pick the AI provider and model.
  - Generated quizzes are saved as **Draft**. The instructor reviews them, then publishes (human-in-the-loop).
  - Can regenerate a single question.
- Remediation quizzes: a 4-question recovery quiz for students who are struggling.
- Grading: grading policies, grade bands, overrides and mark adjustments.
- Insights and analytics for the students in their courses.
- Announcements and communications.

## 5. Student
- Browses the marketplace and catalog, enrolls in courses, and views instructor profiles.
- Student Journey Map: shows course progress.
- Takes published quizzes and gets graded submissions.
- **Gamification**:
  - XP, levels, badges, streaks, daily missions, challenges and a leaderboard.
  - Teams.
  - XP is calculated only on the server, so the client can't fake it.
- **AI Learning Assistant** (in StudentPortal):
  - Picks a lecture, then chats with citations to slides.
  - Topic breakdown splits a lecture into sections.
  - Study planner builds a full or topic-based study plan.
  - Explainer gives a simple explanation of a topic.
  - Short-term memory keeps the last 3 chat exchanges.
- Leaves course reviews and ratings.
- Raises support tickets.

## 6. AI quiz pipeline
1. Checks auth and that the user owns the course.
2. Blocks duplicate requests, so one click can't create two quizzes.
3. Checks the provider and model (configured and on the allowlist).
4. Checks the document is processed (not still PROCESSING or FAILED).
5. Builds context from the file text, then RAG search, then module data as fallbacks.
6. The LLM returns structured JSON.
7. Validates the output: question count, options, correct answer, no duplicates, citations.
8. If invalid, retries once with the errors fed back. If it still fails, nothing is saved.
9. Saves the quiz as a Draft with the AI provider and model recorded.

## 7. RAG (shared pipeline)
- PDF → parser → chunker → embeddings → ChromaDB.
- Used by both the Quiz Generator and the Learning Agent.
- Uploading a PDF does not index it on its own. Indexing is a separate step.

## 8. Main database entities
- Users and auth: User, RefreshToken, InstructorProfile.
- Courses: Course, Module, Topic, ContentItem, Enrollment, CourseReview.
- Assessments: Assessment, Question, QuestionOption, QuizConfiguration, Submission, SubmissionAnswer.
- Grading: GradingPolicy, GradeBand, GradeOverride, MarkAdjustment, CourseResult.
- Gamification: StudentXp, XpTransaction, Level, Badge, StudentBadge, StudentStreak, Challenge, StudentDailyMission, Team.
- AI: AiWorkflowLog, StudyPlan, SkillMastery.
- Other: Notification, Announcement, SupportTicket, AuditLog, Report.

## 9. Security
- JWT with access and refresh tokens.
- Role checks are enforced on the server, not just hidden in the UI.
- Instructors can only edit their own courses.
- API keys stay in `ai-agent/.env` and are never sent to the browser.
- Error messages are clean, with a reference ID and no stack traces.

## 10. Team ownership
- **Wazni**: Admin user and course management, plus the Learning Agent.
- **Raashidh**: Instructor content, assessments and grading, plus the Quiz Generator Agent.
- **Atheek**: Student experience, progress and gamification, mobile, plus the shared RAG.

## 11. Current status (from docs, 2026-09-28)
- Learning Agent: verified (32 Python, 12 ASP.NET and 4 + 2 frontend tests passed).
- Shared RAG: implemented.
- Quiz Generator Agent: verification pending.
- Admin, Instructor and Student software: needs final verification.
- Flutter mobile and deployment: not fully verified.
