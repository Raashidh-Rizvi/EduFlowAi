"""
===============================================================================
EduFlow AI - Agents Package Initialization
===============================================================================
This module exports the complete suite of 7 specialized AI agents powering the
EduFlow AI ecosystem, along with the BaseAgent abstraction and execution log DTO.

Why this package exists:
- Provides a clean, centralized interface for importing any agent across the codebase.
- Enforces standardized execution logging, latency tracing, and role ownership.
"""

# Import the foundational BaseAgent and execution log model
from .base import BaseAgent, AgentExecutionLog

# Import Member 1: Architecture & Planning Agent
from .planner import CoordinatorPlannerAgent

# Import Member 3: Gamification, Telemetry & Domain Analysis Agent
from .domain_analysis import DomainAnalysisAgent

# Import Member 2: Assessments & Action Content Tools Agent
from .content_action import ActionToolAgent

# Import Member 4: Safety & Deterministic Validation Guard Agent
from .validation_guard import ValidationGuardAgent

# Import Member 2: Automated Hierarchical Quiz Generator Agent
from .quiz_generator import QuizGeneratorAgent

# Import Member 3: Gamification & Retention Behavior Agent
from .retention_behavior import RetentionBehaviorAgent

# Import Interactive Guidance: Conversational AI Coach (EduBuddy) Agent
from .ai_coach import AiCoachAgent

# Import Member 3: AI Next Best Action Learning Loop Engine Agent
from .next_best_action import NextBestActionAgent

# Explicitly export all agent classes and utilities for clean external imports
__all__ = [
    "BaseAgent",
    "AgentExecutionLog",
    "CoordinatorPlannerAgent",
    "DomainAnalysisAgent",
    "ActionToolAgent",
    "ValidationGuardAgent",
    "QuizGeneratorAgent",
    "RetentionBehaviorAgent",
    "AiCoachAgent",
    "NextBestActionAgent"
]
