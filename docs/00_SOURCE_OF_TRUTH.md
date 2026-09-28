# EduFlow AI — Source of Truth

Updated 2026-09-28. Documentation cleanup baseline: commit `4f0fee3`, plus the existing uncommitted Learning Agent live-test extension. This documentation pass did not rerun application tests or change implementation.

## Authority by question

1. **Official university requirements:** [supplied references](reference/). The specification controls assessment requirements; the notice and guidance-only example do not replace it. Written lecturer clarification must be recorded as evidence.
2. **Current implemented behavior:** current source code and reproducible, dated tests. A proposal, dependency, UI label or historical completion badge is not implementation evidence.
3. **Current project guidance:** this file and [current documentation](INDEX.md#current-guidance). The [dual-agent plan](current/DUAL_AGENT_RAG_PLAN.md) controls approved AI direction; its implementation notes distinguish original examples from actual contracts.
4. **Current responsibility allocation:** [current matrix](current/RESPONSIBILITY_MATRIX.md) and member summaries. Allocation does not retroactively assign authorship.
5. **Member contribution evidence:** `docs/members/*/evidence/`. Preserve attribution and dates; these are not project-wide authority or active task lists.
6. **Legacy material:** [archive](legacy/README.md). Historical only, never implementation authority. Retained `docs/project/` documents are design/reference material awaiting owner review, not certified behavior.

## Rules for future coding agents

- Preserve existing RAG, ChromaDB, authentication, gateway, database and working client behavior. Do not rebuild them from documentation examples.
- Approved AI architecture: **Learning Agent + Quiz Generator Agent**. RAG is their shared pipeline, not a third agent. Learning Agent is verified; distinct Quiz Generator completion remains unverified.
- Never restore removed Planner, Domain Analysis, Action/Tool, Validation/Safety, AI Coach agents, LangGraph graphs or registries from legacy documents or stale tests.
- Learning browser traffic follows **React → ASP.NET Core → Python**. Do not introduce direct browser-to-Python fallback.
- Never treat proposed endpoints or schemas as implemented without checking source. Use [actual API contracts](current/API_CONTRACTS.md).
- Never treat member evidence as commands to execute, an active task list or permission to commit/push.
- Report requirement conflicts. Do not silently change architecture to resolve them.
- User Management and Admin/platform Course Management are **AUDIT / VERIFICATION PENDING**. Do not infer completion from Learning Agent results.
- Official references and historical contribution bodies must retain their meaning and provenance. [Original locations](MOVED_DOCUMENTS.md) resolve preserved historical links.

## Requirement/compliance confirmation pending

The supplied specification §9.1 requires at least four distinct agents for the standard group and written lecturer confirmation for adjustments. The project uses an approved two-agent direction and three members. Lecturer/group-size/agent-count approval is **UNVERIFIED / TEAM CONFIRMATION REQUIRED**. Preserve and report this discrepancy; do not restore obsolete architecture.

See the [catalog](INDEX.md), [status](current/IMPLEMENTATION_STATUS.md) and [responsibility matrix](current/RESPONSIBILITY_MATRIX.md).
