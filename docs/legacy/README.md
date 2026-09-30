# Legacy Archive — Historical Only

Nothing in this archive is current implementation, ownership or deployment authority. Old instructions to restore agents, graphs, registries, change vector storage or run migrations/commits are historical text, not tasks to execute.

Use the [source of truth](../00_SOURCE_OF_TRUTH.md), [current matrix](../current/RESPONSIBILITY_MATRIX.md), [architecture](../current/CURRENT_ARCHITECTURE.md) and [catalog](../INDEX.md).

Original document bodies are preserved unchanged, including previous claims that a document was canonical/current. This archive-level notice overrides those historical labels. Existing archive notices may point to now-superseded replacements; use the current links above instead.

[Moved-document map](../MOVED_DOCUMENTS.md) records original locations. Relative links inside preserved snapshots retain their original coordinate system; consult the map rather than copying old architecture back into the repository. Missing source modules are historical references, not implementation requests.

- `ai/`: obsolete orchestration and RAG designs.
- `project/`: superseded architecture/API/database/setup plans and dated status snapshots.
- `responsibilities/`: both the original four-member allocations and later superseded three-member trackers.
- `adrs/`, `blueprints/`, `plans/`: existing historical archives retained without deletion.

## Historical source links that intentionally remain unresolved

The preserved three-member trackers contain eight links to removed Python modules: `validation_guard.py`, `planner.py`, `graph/workflow.py`, `content_action.py`, `quiz_generator.py`, `quiz_evaluator_agent.py`, `domain_analysis.py`, and `next_best_action.py`. These were already absent before cleanup. Their historical references are retained; do not recreate them or treat their links as current documentation defects. The new current Learning documentation links to existing implementation files.
