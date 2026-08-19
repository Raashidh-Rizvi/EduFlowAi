"""
===============================================================================
EduFlow AI - Graph & Orchestration Package Initialization
===============================================================================
This module exports the LangGraph workflow orchestrators and state machine:
1. ApprovalStateMachine (`approval_state_machine.py`)
2. LangGraphPipeline, StudyPlanOrchestrator, and individual agent orchestrators (`workflow.py`)

Why this package exists:
- Provides high-level entry points for multi-agent graph execution, state transitions,
  and human-in-the-loop approval workflows.
"""

# Export state machine and workflow orchestration classes
from .approval_state_machine import ApprovalStateMachine
from .workflow import (
    LangGraphPipeline,
    StudyPlanOrchestrator,
    AdaptiveChallengeOrchestrator,
    QuizGeneratorOrchestrator,
    RetentionOrchestrator,
    AiCoachOrchestrator,
    AgentTopologyRegistry,
    ACTIVE_WORKFLOWS
)
