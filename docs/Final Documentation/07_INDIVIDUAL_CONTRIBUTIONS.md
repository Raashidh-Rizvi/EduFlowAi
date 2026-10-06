# Phase 7 — Git and Individual Contribution Evidence

Prepared: 2026-10-01  
Repository: `Raashidh-Rizvi/EduFlowAi`  
Canonical remote supplied by the team: `https://github.com/Raashidh-Rizvi/EduFlowAi.git`

## 1. Scope and Evidence Method

This phase consolidates individual contribution evidence from:

- the locally exported Git history (`git log --all --numstat`);
- the locally exported author shortlog;
- the locally exported merge history;
- the configured Git remote;
- current repository responsibility documentation from earlier phases;
- GitHub pull-request metadata available for the repository;
- technical findings already verified in Phases 2, 3, 5 and 6.

This is a **contribution-evidence document**, not a mark allocation and not a claim that every historical feature still exists in the final implementation.

Important evidence rules used here:

1. **Git authorship is preserved as recorded.** Names/emails that clearly represent the same student are grouped only for summary purposes.
2. **A commit proves contribution to that revision, not that the feature still exists or works in the final system.**
3. **Pull-request descriptions are author-supplied evidence.** Runtime/build/test claims inside PR descriptions are not upgraded to current verified results unless independently supported by the earlier evidence phases.
4. **Current source wins over historical Git.** This is especially important for the AI subsystem, where earlier multi-agent code was later removed/replaced.
5. **Shared files are not assigned exclusively to one person merely because one commit touched them.**
6. **Generated-file line counts and large migrations inflate raw additions.** Line totals are therefore not used as a quality score.
7. The official individual AI reflection must be written personally by each student. This document does not generate it.

### Evidence cutoff

The assignment deadline recorded in Phase 0 is **2026-09-30 23:50 Sri Lanka time**. Contribution evidence merged after that point must not be presented as pre-deadline submission evidence.

A GitHub PR observed after the local export, **PR #24**, merged at approximately **2026-10-01 00:57 Sri Lanka time**, after the stated deadline. It is therefore excluded from the assessed pre-deadline contribution evidence in this document.

## 2. Repository and Collaboration Evidence

The exported remote confirms:

```text
origin  https://github.com/Raashidh-Rizvi/EduFlowAi.git (fetch)
origin  https://github.com/Raashidh-Rizvi/EduFlowAi.git (push)
```

The repository is hosted under the `Raashidh-Rizvi/EduFlowAi` GitHub repository and uses `main` as the default branch.

The local merge history records feature-branch and pull-request integration rather than a single final dump. Examples include:

- PR #5 — Wazni responsibility/documentation baseline;
- PR #7/#8 — Atheek student/mobile/security work;
- PR #13/#14 — Atheek Simple RAG and follow-up fixes;
- PR #16/#17 — Wazni verified baseline and Admin User Management;
- PR #18 — updated courses/landing work;
- PR #19 — Wazni Admin Course Management.

GitHub metadata additionally confirms pre-deadline merged PRs including:

- PR #20 — Wazni Admin support/platform summary/profile/audit work;
- PR #21 — Atheek RAG setup/diagnostic documentation;
- PR #22 — Raashidh quiz/API/frontend update.

This supports a genuine branch/PR collaboration history. It does **not** by itself prove review quality, branch-protection policy, CI success, or issue/project-board usage.

## 3. Author Identity Normalization

The exported shortlog contains multiple author identities for the same students. For reporting, the following aliases are grouped:

| Student | Student ID | Git author identities observed | Local exported commit count |
|---|---|---|---:|
| Wazni / Ahamed M.A. | IT24103352 | `WAZNI AHAMED (IT24103352)`, `Ahamed M.A.` using the SLIIT email | **41** |
| Raashidh Rizvi | IT24104191 | `Raashidh Rizvi`, `raashidh rizvi`, `Raashidh-Rizvi` across personal/medoment/noreply addresses | **71** |
| Atheek Fareez | IT24103933 | `Atheek-Fareez`, `Atheek_Fareez` across personal addresses | **17** |

These are counts from the supplied **local export snapshot**, not the final remote repository after all later merges. Remote PRs #20, #21 and #22 show additional integration activity after the newest commit in that local snapshot.

Do not compare these counts as marks. Commit granularity varies greatly, and several commits contain generated migrations, documentation moves, or large refactors.

## 4. Responsibility Baseline

Current project responsibility documentation associates the students with the following principal areas:

| Student | Primary documented business responsibility | Current AI / supporting responsibility |
|---|---|---|
| **Wazni (IT24103352)** | Admin-side User Management and Admin/platform Course Management; later governance/support/audit/platform-summary work | Current Learning Agent, its three learning tools, STM, gateway/UI integration |
| **Raashidh (IT24104191)** | Instructor academic curriculum/content/assessment and quiz workflows | Intended Quiz Generator contribution and extensive historical quiz/orchestration development |
| **Atheek (IT24103933)** | Student experience, participation/progress/gamification/mobile | Simple RAG foundation and retrieval infrastructure |

This allocation is a responsibility map, not proof of exclusive authorship. The sections below add Git evidence.

---

# 5. Wazni / Ahamed M.A. — IT24103352

## 5.1 Contribution statement supported by Git evidence

Wazni's strongest final-state contribution evidence is concentrated in two areas:

1. **Admin/governance business functionality** across ASP.NET Core, EF Core/PostgreSQL schema, React, tests and documentation.
2. **The current Learning Agent implementation** across Python/FastAPI, ASP.NET gateway integration, React Learning Assistant integration and focused automated test source.

These align closely with the documented responsibility matrix and with the current source findings in Phases 2, 3 and 5.

## 5.2 Admin / governance implementation evidence

Representative commits:

| Commit | Evidence |
|---|---|
| `463eae9` | Secure Admin user creation and guarded permanent deletion; backend auth/admin changes, React Admin Management and `UserCourseManagementTests` |
| `db85a81` | Dedicated Admin Course Management workspace |
| `679d413` | Support-ticket backend domain, API endpoints, EF Core schema/migrations and service implementation |
| `2224b08` | Support Desk integration/concurrency test source |
| `feadfcc` | Student/Instructor/Admin support workflow UI |
| `446d56e` | Platform summary backend aggregation and test coverage |
| `e4617a9` | Admin Platform Summary React UI |
| `ffe0d1e` | Admin personal-details/profile React view |
| `ef66a27` | Governance audit coverage, audit infrastructure and backend tests |
| `88b0e9a` | Admin audit-log explorer and API service |
| `9a42c62` | Governance routes/navigation integrated into shared Admin shell |

Associated merged PR evidence:

- **PR #17** — Complete Admin User Management and Admin Portal Cleanup.
- **PR #19** — Complete Admin Course Management.
- **PR #20** — Support Desk, Platform Summary, Admin Profile and Audit Logging integration.

These PRs were merged before the stated assignment deadline.

### Safe final-report claim

> Wazni contributed the current Admin governance area, including Admin user management, Admin course-management UI, support-desk workflows, platform-summary functionality, Admin profile UI and governance audit functionality, with corresponding backend/database/frontend/test changes evidenced in Git.

### Qualification

Some of these files are shared surfaces. The contribution should not be described as exclusive ownership of all code in `AdminController`, `CoursesController`, `App.jsx`, shared navigation, or shared authentication.

## 5.3 Current Learning Agent contribution evidence

Representative commits from 2026-09-28:

| Commit | Evidence |
|---|---|
| `b7dc552` | Added Breakdown, Study Planner and Explainer learning tools |
| `5cb34a1` | Added scoped short-term conversation memory |
| `c8a9496` | Added current `LearningAgent` orchestration and learn/chat endpoints |
| `55f82ba` | Added ASP.NET gateway proxy integration for Learning Agent endpoints |
| `c763c2f` | Added React Learning Assistant breakdown/plan/explanation UI integration |
| `ebf4f13` | Added focused Python Learning Agent pytest source |
| `0427779` | Added ASP.NET `LearningAgentGatewayTests` |
| `70d8715` | Added Playwright Learning Agent UI-flow tests |
| `1642bb0` | Extended live Learning Agent E2E source |
| `0879f0e` | Added RAG setup/checking script |

PR evidence:

- **PR #15** — Learning Agent, STM, RAG integration, backend/frontend gateway changes and tests.
- **PR #16** — promoted the verified Wazni v3 baseline into `main`.

### Current-source alignment

Phase 5 independently found that the **Learning Agent is the one distinct current agent** and that it owns three fixed tools plus scoped STM and RAG integration.

This makes Wazni's Learning Agent contribution one of the strongest areas where Git history and final current source agree.

### Safe final-report claim

> Wazni implemented and integrated the current Learning Agent, including the Breakdown, Study Planner and Explainer tools, scoped short-term memory, ASP.NET gateway endpoints, React Learning Assistant integration and focused test source.

Do not extend this claim to a complete multi-agent assessed workflow: Phase 5 found no current structured multi-agent execution plan/delegation or fully correlated approval chain.

## 5.4 Testing / collaboration evidence

Evidence includes:

- Python Learning Agent focused test source;
- ASP.NET gateway test source;
- mocked/live Playwright Learning Agent test source;
- Admin/support/audit/backend test additions;
- several feature branches and merged PRs;
- explicit merge/reconciliation commits preserving the shared baseline.

Phase 6 carries the execution-status caveat: current test suites were not rerun during the documentation audit; only dated focused historical results may be reported as historical evidence.

## 5.5 Individual report evidence placeholders

**Owned/major technical areas to explain in viva:**

- Admin User Management and guarded deletion;
- Admin Course Management;
- Support Desk and concurrency/version handling;
- governance audit architecture;
- platform summary;
- current Learning Agent/tool dispatch/STM;
- React → ASP.NET → FastAPI Learning integration.

**Key evidence to reference:** commits above and PRs #15, #16, #17, #19, #20.

**Challenges and learning:** `STUDENT TO WRITE IN OWN WORDS`.

**Individual AI usage log:** `STUDENT TO SUPPLY FROM ACTUAL TOOL USE`.

**Required one-page AI reflection:** `STUDENT MUST WRITE PERSONALLY — DO NOT AI-GENERATE`.

---

# 6. Raashidh Rizvi — IT24104191

## 6.1 Contribution statement supported by Git evidence

Raashidh has the largest historical commit footprint in the supplied local snapshot and is strongly evidenced in:

1. initial repository/framework setup;
2. ASP.NET/EF Core/auth/integration foundations;
3. Instructor/curriculum/assessment/quiz functionality;
4. React course/assessment/instructor/marketplace work;
5. CI/E2E/test scaffolding;
6. extensive historical Agentic AI/Quiz Generator experimentation and integration.

The final report must distinguish **historical AI contribution** from **current final AI implementation**.

## 6.2 Foundational platform / integration evidence

Representative commits:

| Commit | Evidence |
|---|---|
| `1ad94f2` | Initial repository documentation/CI/subproject scaffolding |
| `e44a153` | Initial .NET API/Core/Infrastructure/Tests solution structure |
| `9a29bf6` | Early full-stack scaffold: ASP.NET, PostgreSQL models, React, Flutter and AI microservice |
| `0967a87` | Cross-layer authentication, gamification, AI review, API and frontend integration |
| `d0d2042` | EF Core/JWT backend infrastructure |
| `25d47f6` | Playwright E2E setup and development runner/build-watcher integration |
| `0da0576` | Backend/AI service infrastructure and CI changes |

This is meaningful architectural/foundation work, but early scaffolding should not be described as sole ownership of later final implementations.

## 6.3 Instructor / course / assessment evidence

Representative commits:

| Commit | Evidence |
|---|---|
| `e191f6d` | Assessment/quiz entities, DTOs, controllers, unit-test source and React assessment/course work |
| `931dce6` | AI gateway + course-based quiz/assessment integration |
| `9fbf91e` | Quiz-management backend, React assessment/course integration and tests |
| `880dcee` | Controller/security-test expansion |
| `b60cf72` | Cross-student contracts and broad backend/mobile test-source expansion |
| `e22f81e` | Course ownership, marketplace, instructor profiles/reviews, review moderation, migrations and tests |
| `a3da766` | Marketplace/instructor portal/backend API expansion |
| `c76d55d` | Portals/marketplace/backend/E2E integration |
| remote PR #22 | Final-day quiz controller/AI gateway/frontend update merged before deadline |

These changes support the documented Instructor/curriculum/assessment responsibility, while some course and marketplace files are shared with other members.

### Safe final-report claim

> Raashidh made substantial contributions to the Instructor, curriculum, assessment and quiz-management areas, including backend APIs and data changes, React Instructor/Assessment/Course interfaces, marketplace/profile/review functionality, AI-gateway integration, and associated test/E2E source.

## 6.4 AI / Quiz Generator historical contribution

Raashidh has extensive historical commits to earlier Quiz Generator and multi-agent/orchestration code, including:

- `c15f8dc` — early multi-agent framework;
- `8c39dca` / `5332e1d` / `825effd` — Quiz Generator Agent development;
- `023d87b` — LangGraph orchestration integration;
- `0fa0333` / `5ffdd54` — provider/fallback evolution;
- `370858e`, `4657acb`, `9fbf91e`, `a7513a7` — quiz-generation/API/UI integration.

### Critical current-state qualification

The current final source **does not contain a distinct implemented Quiz Generator Agent**. Phase 5 found only the current Learning Agent as a distinct agent; current quiz generation is a service function/template path rather than the historical dedicated agent.

A major Simple RAG replacement later removed the previous complex multi-agent modules. Therefore:

**Allowed wording**

> Raashidh developed substantial historical Quiz Generator/multi-agent and quiz-integration work and continued to contribute to current assessment/quiz API and UI integration.

**Not allowed**

> Raashidh's distinct Quiz Generator Agent is implemented in the final system.

That second statement conflicts with the current-source audit.

## 6.5 Testing / CI / collaboration evidence

Evidence includes:

- initial and subsequent CI workflow work;
- E2E/Playwright infrastructure;
- broad ASP.NET test-source additions;
- Instructor/Marketplace/Assessment tests;
- merged feature work and integration with other member branches.

Commit messages such as “279 tests” are not treated as current pass results. Phase 6 found test source but did not verify a current comprehensive pass.

## 6.6 Individual report evidence placeholders

**Owned/major technical areas to explain in viva:**

- Instructor/curriculum workflows;
- quiz/assessment lifecycle;
- course ownership/profile/review/marketplace interactions;
- quiz-to-AI gateway integration;
- historical evolution of Quiz Generator work and why current final source differs;
- CI/E2E foundations.

**Key evidence to reference:** representative commits above and pre-deadline PR #22; PR/commit history should be used with the current-source caveat.

**Challenges and learning:** `STUDENT TO WRITE IN OWN WORDS`.

**Individual AI usage log:** `STUDENT TO SUPPLY FROM ACTUAL TOOL USE`.

**Required one-page AI reflection:** `STUDENT MUST WRITE PERSONALLY — DO NOT AI-GENERATE`.

---

# 7. Atheek Fareez — IT24103933

## 7.1 Contribution statement supported by Git evidence

Atheek's Git evidence aligns strongly with:

1. Student-facing identity/gamification security;
2. Flutter/mobile API and authentication integration;
3. RAG simplification and Chroma-based retrieval foundation;
4. CI correction and RAG setup/support tooling;
5. targeted backend/Python test-source contributions.

## 7.2 Student / gamification / security evidence

Representative commits:

| Commit | Evidence |
|---|---|
| `30bf839` | Added self-only authorization checks to student/gamification endpoints |
| `98f3d01` | Replaced frontend hardcoded student ID with active session identity |
| `c8d8e9c` | Gamification level/dashboard test-source additions |

These support the documented Student/gamification responsibility, but they do not prove every final gamification action is correctly persisted; Phase 3 found several local/fallback paths in the current React Student UI.

## 7.3 Flutter/mobile evidence

Representative commits:

| Commit | Evidence |
|---|---|
| `61d556d` | Mobile platform/configuration setup |
| `ed29f25` | Flutter API/Auth/Gamification service layer |
| `fe4b2a9` | Login screen connected to backend authentication |

PR evidence:

- **PR #8** — Student Role MVP with frontend session identity, Flutter API/auth integration and test additions.

Phase 4 is being independently audited and remains the authority for what the final Flutter application actually supports. This Git evidence demonstrates contribution, not runtime completeness.

### Safe final-report claim

> Atheek contributed the Flutter API/authentication integration and student/gamification session-security work, including authenticated mobile service classes and login integration.

Do not claim a complete mobile→AI→React approval workflow unless Phase 4/runtime evidence later proves it.

## 7.4 Current RAG contribution evidence

Representative commits:

| Commit | Evidence |
|---|---|
| `9cd2724` | Replaced the earlier complex multi-agent system with a Simple RAG core using parser/chunker/vector-store/RAG-service modules |
| `b0886af` | Expanded Simple RAG with ChromaDB, Groq integration and scoped lecture search |
| `4571995` | AI-service local-build fixes |

PR evidence:

- **PR #13** — Replace Multi-Agent System with Production Simple RAG Core.
- **PR #21** — teammate RAG setup/diagnostic documentation, merged before deadline.

Phase 5 independently confirmed that RAG is a real current subsystem but is **infrastructure, not a distinct agent**.

### Safe final-report claim

> Atheek implemented the Simple RAG foundation used by the current Learning system, including parsing/chunking/vector retrieval, Chroma persistence and scoped lecture retrieval/provider integration.

### Critical qualification

RAG contribution must **not** be counted as a second distinct agent. Historical Domain Analysis smoke-test work also must not be represented as a current final agent because the later RAG simplification removed the earlier complex-agent tree.

## 7.5 CI / test / collaboration evidence

Representative evidence:

- `b512765` — corrected CI backend solution path from `.sln` to `.slnx`;
- `973569c` — historical Domain Analysis smoke-test source;
- `c8d8e9c` — gamification test source;
- PRs #7, #8, #13 and #21;
- multiple merge/conflict-resolution commits associated with the Student/RAG branch.

Phase 6 found the current Flutter tests mostly local/copy-based and did not execute them. Therefore PR descriptions reporting pass results should be labeled historical/self-reported unless raw run evidence is separately retained.

## 7.6 Post-deadline exclusion

GitHub PR **#24** (MCP Tool Hub / Tavily CRAG / intent routing) was merged after the stated submission deadline. It may be discussed as later development if useful for viva/future work, but it should **not** be presented as part of the pre-deadline assessed implementation unless the lecturer explicitly accepts post-deadline changes.

## 7.7 Individual report evidence placeholders

**Owned/major technical areas to explain in viva:**

- student/gamification self-authorization;
- active-session identity;
- Flutter API/Auth/Gamification services;
- Simple RAG parser/chunker/vector-store/retrieval architecture;
- Chroma/provider configuration and scoped search;
- CI `.slnx` correction.

**Key evidence to reference:** commits above and PRs #7, #8, #13, #21.

**Challenges and learning:** `STUDENT TO WRITE IN OWN WORDS`.

**Individual AI usage log:** `STUDENT TO SUPPLY FROM ACTUAL TOOL USE`.

**Required one-page AI reflection:** `STUDENT MUST WRITE PERSONALLY — DO NOT AI-GENERATE`.

---

# 8. Balanced Team Contribution Presentation

The final consolidated report should present all three students using the **same evidence structure**, rather than trying to make the raw commit counts equal.

Recommended structure for each student:

1. Identity and documented responsibility;
2. business component;
3. backend/API contribution;
4. database contribution;
5. React contribution;
6. Flutter contribution;
7. AI contribution;
8. testing contribution;
9. Git/PR evidence;
10. technical challenges/learning — written personally;
11. AI usage log;
12. personal AI reflection — written personally;
13. signed declaration.

The evidence supports different strengths:

| Student | Strongest evidence areas | Important limitation to disclose |
|---|---|---|
| Wazni | Current Admin/governance stack + current Learning Agent + focused tests | Complete multi-agent assessed workflow still absent |
| Raashidh | Foundational architecture + Instructor/course/assessment/quiz + broad tests/integration | Historical Quiz Generator work is not a distinct current final agent |
| Atheek | Student/mobile/gamification security + current Simple RAG | RAG is infrastructure, not a distinct agent; Flutter runtime remains to be verified |

This is balanced because each member receives the same reporting framework while claims remain evidence-based.

# 9. Shared / Cross-Cutting Contributions

Some areas should be explicitly classified as shared:

- `Program.cs`, authentication/session foundations and common API infrastructure;
- `ApplicationDbContext`, shared entities and evolving migrations;
- shared React application shell/navigation/services;
- course/quiz/student portal files touched by multiple members over time;
- ASP.NET AI gateway evolution;
- CI workflow evolution;
- documentation reorganization and integration;
- integration/merge/conflict-resolution work.

The final report should avoid assigning these entire files to a single student unless a particular commit/PR is being cited for a particular change.

# 10. Key PR Evidence Table

| PR | Member evidence | Main relevance | Deadline status |
|---:|---|---|---|
| #7 | Atheek | Student/gamification authorization | Pre-deadline |
| #8 | Atheek | Student MVP, Flutter API/auth, tests | Merged pre-deadline |
| #13 | Atheek | Simple RAG replacement | Merged pre-deadline |
| #15 | Wazni | Learning Agent v2 integration | Merged pre-deadline |
| #16 | Wazni | Learning Agent/current baseline promotion | Merged pre-deadline |
| #17 | Wazni | Admin User Management | Merged pre-deadline |
| #19 | Wazni | Admin Course Management | Merged pre-deadline |
| #20 | Wazni | Support/platform-summary/profile/audit integration | Merged pre-deadline |
| #21 | Atheek | RAG setup/diagnostic guide | Merged pre-deadline |
| #22 | Raashidh | Quiz/API/frontend integration update | Merged pre-deadline |
| #24 | Atheek | MCP/CRAG/intent-routing later development | **Post-deadline — exclude from assessed pre-deadline evidence** |

PRs are collaboration/provenance evidence. Their descriptions are not substitutes for current source verification.

# 11. Evidence Risks and Reporting Rules

The final report should preserve the following caveats:

- Do not state that commit totals equal contribution quality.
- Do not sum PR addition counts because overlapping PRs/branches can double-count the same lines.
- Do not describe historical removed agents as current implementation.
- Do not claim test counts from commit messages or PR descriptions as current results without retained execution evidence.
- Do not claim deployment, APK, current CI success, or real PostgreSQL execution based on Git alone.
- Do not claim exclusive authorship of shared files.
- Do not count documentation-only or generated migration volume as equivalent to business functionality.
- Do not use post-deadline PR #24 as pre-deadline assessed evidence.
- Keep lecturer approval for the three-member/two-intended-agent variation marked as unresolved unless the team supplies authentic written approval.

# 12. Final-Report Inputs

## G13 — Collaboration and Contribution Evidence

Safe report-ready inputs:

- Git history shows sustained work across August and September rather than only one final import.
- Multiple feature branches and pull requests were used for member work.
- Wazni has direct Git/PR evidence for current Admin/governance functionality and the current Learning Agent.
- Raashidh has direct Git evidence for foundational architecture, Instructor/course/assessment/quiz development, marketplace work, testing/E2E infrastructure and historical Quiz Generator development.
- Atheek has direct Git/PR evidence for student/gamification security, Flutter API/auth integration and the current Simple RAG foundation.
- Merge/conflict-resolution history demonstrates integration work among member branches.
- Current-source audits must be cited alongside Git evidence where historical functionality was later replaced.

## Individual Section — Wazni

Use §§5.1–5.5, together with Phase 2/3/5 technical findings and the student's own usage log/reflection.

## Individual Section — Raashidh

Use §§6.1–6.6, but explicitly distinguish historical Quiz Generator code from the final current AI state.

## Individual Section — Atheek

Use §§7.1–7.7, together with the completed Phase 4 Flutter audit when available.

## Material still required from students

- personal challenges/learning narrative;
- individual AI usage log with date/tool/task/output/change/verification;
- approximately one-page personal AI reflection;
- signed declaration;
- any student-specific screenshots they want to cite;
- lecturer approval evidence for team/agent-count variation, if it exists.

# 13. Phase 7 Status

**Phase 7 contribution evidence: COMPLETE for available Git/PR evidence.**

Remaining uncertainty is not about whether the three students contributed; Git history clearly shows contributions from all three. The remaining issues are:

- exact current runtime success of features;
- final Flutter source/runtime status pending Phase 4;
- missing complete assessed multi-agent workflow;
- missing deployment/APK/current comprehensive test evidence;
- lecturer approval for the team/agent-count variation;
- personally written individual reflection/AI-usage material.

