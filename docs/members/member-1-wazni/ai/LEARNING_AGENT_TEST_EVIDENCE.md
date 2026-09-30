# Learning Agent — Recorded Test Evidence

Observed **2026-09-28** in the preceding implementation/verification sessions. Recorded during documentation cleanup; **not rerun in this documentation-only pass**. Source baseline `4f0fee3` plus the existing uncommitted live-chat test extension. Environment: Windows/PowerShell, Python virtual environment, local PostgreSQL/backend/AI/frontend, Playwright with Microsoft Edge. No production deployment is implied.

## Commands and scoped results

Run Python command from `ai-agent/`, gateway command from repository root, and Playwright commands from `frontend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_learning_agent.py -q
```

**32 passed.** Covers tool schemas/scopes, errors, existing chat, provider fallback, exact memory history, truncation and isolation.

```powershell
dotnet test backend/EduFlow.Tests/EduFlow.Tests.csproj -c Release --filter FullyQualifiedName~LearningAgentGatewayTests --no-restore --nologo
```

**12 passed.** Focused gateway identity/response/error contracts.

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
npx playwright test e2e/12-learning-agent.spec.js --reporter=list
```

**4 passed.** Mocked API regression tests: global/scoped chat, tree, full/topic plans, explanation, citations, discovery failure, retry and extractive rendering. These are not real-provider tests.

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
$env:EDUFLOW_LIVE_TESTS='1'
npx playwright test e2e/13-learning-agent-live.spec.js e2e/14-learning-breakdown-live.spec.js --reporter=list
```

**2 passed.** Actual frontend, authenticated ASP.NET gateway, Python, existing Chroma index and configured providers; no API mocks. Uses the existing student demonstration login provided by the local UI. Do not place credentials in documentation.

Relevant sources: [Python tests](../../../../ai-agent/tests/test_learning_agent.py), [gateway tests](../../../../backend/EduFlow.Tests/LearningAgentGatewayTests.cs), [frontend regression](../../../../frontend/e2e/12-learning-agent.spec.js), [live chat](../../../../frontend/e2e/13-learning-agent-live.spec.js), [live topics](../../../../frontend/e2e/14-learning-breakdown-live.spec.js).

## Real lecture observations

Lecture: `IT3091_Machine_Learning_Lecture_1.pdf`.

| Check | Observed result |
|---|---|
| Python health / ASP.NET health | HTTP 200 / HTTP 200 |
| Fresh breakdown | HTTP 200; six sections covering slides 1–23; **6.02 seconds** in the earlier diagnostic |
| Cached frontend breakdown | HTTP 200; **0.055 seconds** during continuation |
| Sections | Introduction 1–3; Foundations 4–8; Data Mining Process 9–13; Key Concepts & Terminology 14–18; Model Evaluation 19–20; Conclusion 21–23 |
| Section identity | Titles, key topics, source_file and sub_lecture_id retained |
| Selected-section plan | Three sessions; matching section ID; **3.227 seconds** |
| Selected subtopic explanation | Data Mining definition; beginner explanation/example; **7.082 seconds** |
| Explanation citations | Slides 4, 6, 5, 8; all in the selected lecture and section 4–8 |
| Grounding inspection | Definition compared with indexed slide 4; retail market-basket example with slide 8 |
| Normal chat | Global question plus **five lecture-scoped turns** succeeded with HTTP 200 and citations |
| STM | Live follow-up behavior observed; exact three-pair retention/drop verified by tests inspecting the LLM input |
| Request path | React → ASP.NET → Python; browser test found no direct port-8000 calls |
| Full-lecture plan | Previously verified working; covered by Python/frontend regression, not a newly measured step in the two continuation live tests |

Timings are observations, not fixed latency promises. Topic titles above are recorded outputs, not hardcoded application content.

## Interpretation and limitations

- STM is process-local and clears on restart. Chat excludes failed/extractive fallback turns from memory.
- Exact tests verify at most six historical messages plus current question, oldest-pair removal, and user/session/course/lecture isolation. Browser replies alone cannot prove exact hidden prompt contents.
- Broad conversational retrieval sometimes selected introductory slides and produced insufficient-detail answers.
- The original reported timeout was **not reproduced**. No production timeout setting changed.
- An earlier diagnostic Python server was stopped, leaving the reload-managed service. Duplicate instances were present, but were not proven to cause the timeout.
- Indexing is a prerequisite; no re-indexing or document/embedding replacement was performed during the continuation verification.
- Final health checks returned 200; `git diff --check` passed. Existing dependency/compiler warnings did not fail these focused suites.
- These results do **not** certify the whole EduFlow test suite, User/Course Management, Quiz Generator completion, mobile, deployment or assignment compliance. A legacy Python reliability test still references removed modules; do not restore those modules to satisfy it.
