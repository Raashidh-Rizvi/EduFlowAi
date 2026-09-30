# Current Responsibility Matrix

Allocation confirmed by the user for this documentation pass, 2026-09-28. [Authority](../00_SOURCE_OF_TRUTH.md). Maintainer allocation, historical contribution, runtime permission and assessment credit are distinct.

| Member | Software responsibility | AI responsibility/contribution | Status |
|---|---|---|---|
| Wazni — IT24103352 | Admin-side User Management and Admin/platform Course Management | Learning Agent, its three tools, STM and required gateway/UI integration | Learning verified; software AUDIT / VERIFICATION PENDING |
| Raashidh — IT24104191 | Instructor-side academic curriculum, content and assessment responsibilities supported by existing evidence | Quiz Generator Agent | Assigned / implementation verification pending; do not claim distinct agent complete |
| Atheek — IT24103933 | Student experience, participation, progress/gamification and supported mobile contributions | Primary/shared implementation contribution to RAG | Shared RAG exists and Learning uses it; Final assessed AI allocation requires team/lecturer confirmation. |

RAG is a **shared pipeline, not a third agent**. Do not retain Domain Analysis as a current agent to fill an allocation gap.

## Software and integration boundaries

- Wazni: Admin user directory, account/role/status governance and platform course inventory/access/administration are software audit scope, not certified completed features.
- Raashidh: academic metadata, curriculum/content, assessment definitions/grading and academic authoring/publishing. Course-management overlap with Wazni is shared/coordinated; Admin permission does not silently transfer academic authorship.
- Atheek: learner participation/completion, attempts/results, progress/rewards and student-facing consumption of shared course/assessment contracts.
- Shared: identity/authentication, `Program.cs`, database relationships/migrations, `AiGatewayClient`, API schemas, client shell/session and CI. Changes should preserve consumer contracts and existing implementation.
- Keep one course model and consistent identifiers; do not duplicate APIs or data models merely to divide responsibility.

## Contribution provenance

Atheek's commits `9cd2724` and `b0886af` support the original Simple RAG/scoped-search contribution. Raashidh's `880dcee`, `934b86d`, `b60cf72`, `a7513a7` support instructor/assessment/integration evidence. Wazni's Learning commits are listed in his [contribution summary](../members/member-1-wazni/CONTRIBUTION_SUMMARY.md). These do not establish exclusive ownership of every shared file.

Member summaries: [Wazni](../members/member-1-wazni/README.md), [Raashidh](../members/member-2-raashidh/README.md), [Atheek](../members/member-3-atheek/README.md).

Lecturer approval is **UNVERIFIED / TEAM CONFIRMATION REQUIRED**. Requirement/compliance confirmation pending; no automatic architecture change follows from this unresolved matter.
