"""
===============================================================================
EduFlow AI - Data Models & State Package Initialization
===============================================================================
This module serves as the central entry point for all data models, schemas,
and state definitions used throughout the EduFlow AI multi-agent ecosystem.

Why this file exists:
- Exposes Pydantic schemas representing requests, responses, and intermediate telemetry.
- Exposes the SharedAgentState and supporting state structures for LangGraph workflows.
- Allows clean, centralized imports across agents, graphs, tools, and FastAPI endpoints.
"""

# Import all Pydantic request/response schemas, DTOs, and utility models
from .schemas import *

# Import the core state-machine and workflow-state models
from .state import (
    SharedAgentState,   # The 11-field standardized multi-agent blackboard state
    WorkflowStatus,     # Enumeration of valid workflow lifecycle states
    PlanStep,           # Structured individual step in an agent execution plan
    ToolResultItem,     # Structured result payload returned by tool executions
    ApprovalRecord      # Human-in-the-loop review governance record
)
