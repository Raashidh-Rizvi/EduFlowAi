# Documentation Catalog

Read [Start here](README.md) before choosing a document. Canonical design does not mean completed implementation; current evidence is summarized in [implementation status](project/17_IMPLEMENTATION_STATUS.md).

## Official assignment references

| Document | Authority |
|---|---|
| [Official assignment specification](reference/SEF-ASSINGMENT-01-%5BIntegrated-Full-Stack-and-Agentic-AI-Application-Development-Specification-With-Marking-Scheme%5D.md) | Authoritative requirements and marking scheme |
| [Assignment notice](reference/SEF-ASSINGMENT-01-Notice.md) | Supporting notice; does not replace the specification |
| [AutoCare AI guidance-only example](reference/SEF-ASSINGMENT-01-Sample-Scenario-Guidance-Only-%5BAutoCare-AI%5D.md) | Supporting example; prohibited as this project's chosen scenario |

Keep these supplied references unchanged. Written group-size approval remains **TO CONFIRM**.

## Current responsibilities

| Document | Purpose |
|---|---|
| [RESPONSIBILITY_MATRIX.md](responsibilities/RESPONSIBILITY_MATRIX.md) | Read first: current ownership, shared boundaries and approval caveats |
| [STUDENT_1_SYSTEM_ADMIN.md](responsibilities/STUDENT_1_SYSTEM_ADMIN.md) | Ahamed M.A. / IT24103352 — governance, reporting and AI safety |
| [STUDENT_2_INSTRUCTOR.md](responsibilities/STUDENT_2_INSTRUCTOR.md) | Raashidh M.R. / IT24104191 — curriculum, assessments and AI content |
| [STUDENT_3_STUDENT.md](responsibilities/STUDENT_3_STUDENT.md) | Atheek M.F. / IT24103933 — learning, gamification and adaptive guidance |

## Current project documents

The numbered sequence is a reading order, not a requirement to read every file before a task. Design references include unimplemented targets; the status summary and source distinguish them.

| Order | Canonical document | Purpose |
|---|---|---|
| 01 | [01_PROJECT_OVERVIEW.md](project/01_PROJECT_OVERVIEW.md) | Product scope, roles, stack and system boundary |
| 02 | [02_SYSTEM_WORKFLOWS.md](project/02_SYSTEM_WORKFLOWS.md) | User journeys and cross-role workflows |
| 03 | [03_ARCHITECTURE.md](project/03_ARCHITECTURE.md) | Layers, technical subsystems and request flow |
| 04 | [04_ROLES_AND_PERMISSIONS.md](project/04_ROLES_AND_PERMISSIONS.md) | Intended permissions and resource boundaries |
| 05 | [05_DATABASE_SCHEMA.md](project/05_DATABASE_SCHEMA.md) | Data relationships, integrity and migration design |
| 06 | [06_API_CONTRACTS.md](project/06_API_CONTRACTS.md) | API conventions and workflow contracts |
| 07 | [07_SECURITY_AND_PRIVACY.md](project/07_SECURITY_AND_PRIVACY.md) | Security requirements, risks and data handling |
| 08 | [08_COMPONENT_INTEGRATION.md](project/08_COMPONENT_INTEGRATION.md) | Producer/consumer contracts and shared boundaries |
| 09 | [09_AI_ORCHESTRATION.md](project/09_AI_ORCHESTRATION.md) | Four core roles, tools, state, safety and approval |
| 10 | [10_RAG_ARCHITECTURE.md](project/10_RAG_ARCHITECTURE.md) | Retrieval/ingestion design; documented-only infrastructure |
| 11 | [11_QUIZ_PIPELINE.md](project/11_QUIZ_PIPELINE.md) | Academic generation/review, grading and learner delivery |
| 12 | [12_GAMIFICATION_RULEBOOK.md](project/12_GAMIFICATION_RULEBOOK.md) | Reward/progress rules and design limitations |
| 13 | [13_MOBILE_APPLICATION.md](project/13_MOBILE_APPLICATION.md) | Flutter experience and integration targets |
| 14 | [14_ARCHITECTURE_DECISIONS.md](project/14_ARCHITECTURE_DECISIONS.md) | Decision register with explicit unresolved/proposed status |
| 15 | [15_GIT_TESTING_CI_CD.md](project/15_GIT_TESTING_CI_CD.md) | Contribution, testing and delivery practices |
| 16 | [16_IMPLEMENTATION_PLAN.md](project/16_IMPLEMENTATION_PLAN.md) | Six-phase remaining-work plan and acceptance criteria |
| 17 | [17_IMPLEMENTATION_STATUS.md](project/17_IMPLEMENTATION_STATUS.md) | Project-wide audit baseline, gaps and evidence |
| 18 | [18_RUN_AND_SETUP.md](project/18_RUN_AND_SETUP.md) | Local startup, verification commands and limitations |

## Subsystem entry points

| Document | Scope |
|---|---|
| [Backend README](../backend/README.md) | Backend purpose, commands, code entry points and central links |
| [Frontend README](../frontend/README.md) | React purpose, commands, entry points and central links |
| [Mobile README](../mobile/README.md) | Flutter prototype/integration limits, commands and entry points |
| [AI README](../ai-agent/README.md) | Python service commands, agent entry points and central contracts |
| [Repository README](../README.md) | Repository introduction and quick navigation |

[CI workflow configuration](../.github/workflows/ci.yml) is executable configuration, not evidence of a passing run.

## Legacy — historical reference only

**None of the following documents is a current source of instructions, ownership, roadmap or verified completion.** Their bodies preserve historical proposals; notices and links identify the canonical replacements.

| Archive | Historical role |
|---|---|
| [ORIGINAL_IMPLEMENTATION_PLAN.md](legacy/plans/ORIGINAL_IMPLEMENTATION_PLAN.md) | Original pre-reorganization plan |
| [ROOT_ADR.md](legacy/adrs/ROOT_ADR.md) | Competing root ADR proposals |
| [ROOT_FULL_IMPLEMENTATION.md](legacy/blueprints/ROOT_FULL_IMPLEMENTATION.md) | Overlapping full-implementation blueprint |
| [DOCS_FULL_IMPLEMENTATION.md](legacy/blueprints/DOCS_FULL_IMPLEMENTATION.md) | Overlapping full-implementation blueprint |
| [02_MEMBER1_USER_COURSE.md](legacy/responsibilities/02_MEMBER1_USER_COURSE.md) | Former personal allocation |
| [03_MEMBER2_ASSESSMENTS.md](legacy/responsibilities/03_MEMBER2_ASSESSMENTS.md) | Former personal allocation |
| [04_MEMBER3_GAMIFICATION.md](legacy/responsibilities/04_MEMBER3_GAMIFICATION.md) | Former personal allocation |
| [05_MEMBER4_ANALYTICS.md](legacy/responsibilities/05_MEMBER4_ANALYTICS.md) | Former personal allocation |

Return to [Start here](README.md) for current authority and reading order.
