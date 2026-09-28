# EduFlow AI — Current Source of Truth

## IMPORTANT FOR AI CODING AGENTS

The project is already substantially implemented.

Do NOT redesign the existing architecture.
Do NOT restore old multi-agent architectures from historical documentation.

For current AI implementation decisions, use:

docs/current/DUAL_AGENT_RAG_PLAN.md

The current approved AI architecture is:

- Learning Agent
- Quiz Generator Agent

Shared tools:

- Knowledge Slide Breakdown Tool
- Study Planner Tool
- Explainer Tool

The existing RAG implementation must be reused, not rebuilt.

Existing working backend, frontend, mobile, authentication, database,
gamification and RAG functionality must be preserved.

Historical documents may contain obsolete AI-agent architectures.

When documentation conflicts:

1. Existing working source code
2. docs/current/DUAL_AGENT_RAG_PLAN.md
3. Other current project documentation
4. Historical/legacy documentation

For Student 1 work, implement only the Learning Agent and its required
shared tools unless another change is strictly necessary for integration.
