# Report Draft Worksheet — Raashidh (IT24104191)

Part A is factual and drawn from the source and git history. Parts B, C and D are **yours to write in your own words** (see the assignment note). They hold prompts and a factual skeleton only. Delete this sentence before submitting.

---

## A. Implementations present in the final source

> Draft paragraph — check every claim against your code before submitting.

My responsibility was the instructor side of EduFlow (curriculum, content, assessments and grading) and the Quiz Generator Agent. On the backend I worked on `InstructorController` and `QuizzesController` in the ASP.NET Core API. Together they cover course and content authoring, quiz and assessment definitions, attempt evaluation and grading policies, with ownership and authorization tests (`InstructorOwnershipTests`, `IdorOwnershipTests`, `AssessmentIntegrityTests`, `EvaluationServiceTests`, `GradeServiceTests`). On the AI side, `ai-agent/agents/gemini_quiz_generation_service.py` implements slide-grounded quiz generation. It retrieves context through the shared RAG service, builds a prompt, calls a configurable provider (Gemini, Groq or Azure), validates the JSON payload strictly, and supports regenerating a single question. It has its own test file (`test_quiz_generation.py`). On the frontend I built the instructor portal views: dashboard, my courses, course creation, grading panel, enrollment requests, students, reviews and profile. Around the app I also helped with Docker and Vercel deployment, the CI pipelines (CodeQL, Dependabot, Docker image builds), the Flutter student app and the mobile-responsive catalog.

Checklist before submitting:
- [ ] Confirm the Quiz Generator is a distinct agent. The repo's own docs say this is **verification pending**, so don't claim more than the code shows.
- [ ] Add real test counts from a fresh run of `dotnet test` and `pytest`.
- [ ] Add commit hashes (e.g. `880dcee`, `934b86d`, `b60cf72`, `a7513a7`).

---

## B. Personal challenges (write in your own words)

Answer each in 1–3 sentences, then join them into a paragraph:

- Which task took the longest, and why?
- The Gemini model and provider errors: what went wrong, and how did you diagnose it?
- Connecting React, ASP.NET and Python: what broke at the boundaries?
- "AI part isn't working" (5 Oct): what was the root cause?
- Backend startup and port errors (3 Oct): what was happening?
- Docker, Vercel and CI failures (pytest failing in CI, 6 Oct): what fixed them?
- Teamwork: shared files (`Program.cs`, `AiGatewayClient`), merge conflicts, splitting work with Wazni and Atheek.
- Mobile responsiveness and making Flutter match the web student portal.

## C. Learning reflection (write in your own words)

- What can you do now that you couldn't on 15 Aug?
- What did you learn about RAG, LLM output validation, RBAC, or CI/CD?
- What would you do differently with more time?
- What did you learn about using AI tools, including where their output was wrong?

---

## D. AI-usage log

Real sessions from `~/.claude/projects/D--Project-EduFlow/`. The **date and topic** come from the transcripts. Fill in the last two columns yourself, and attach the transcripts or screenshots as evidence.

| Date | Tool | Task (from transcript) | What I used / accepted | What I changed / rejected |
|---|---|---|---|---|
| 3 Oct | Claude Code | Change Gemini model to 1.5 | | |
| 3 Oct | Claude Code | Fix backend startup/port errors | | |
| 3 Oct | Claude Code | Fix marketplace buttons so users can explore and enrol | | |
| 4 Oct | Claude Code | Vercel deployment config for backend | | |
| 5 Oct | Claude Code | Docker setup connecting frontend, backend and AI agent | | |
| 5 Oct | Claude Code | Fix AI feature not working | | |
| 5 Oct | Claude Code | Catalog filter / browse-courses feature | | |
| 5 Oct | Claude Code | Student UI nav bar and footer always visible | | |
| 5 Oct | Claude Code | Flutter app to match student web portal | | |
| 5 Oct | Claude Code | Mobile-responsive catalog and course pages | | |
| 5 Oct | Claude Code | Performance, bug and dead-code optimization pass | | |
| 5 Oct | Claude Code | Vercel deployment error | | |
| 6 Oct | Claude Code | Create PRs for CI/CD, docs, templates | | |
| 6 Oct | Claude Code | Fix failing CI pipelines | | |
| 6 Oct | Claude Code | Summarise my work; this worksheet | | |

Other tools you used (Jules, Palette, ChatGPT, Gemini and so on) are not in these transcripts. Add them from your own records. The repo has merged branches from `jules-*` and `palette/*`, which suggests Jules and Palette were used.
