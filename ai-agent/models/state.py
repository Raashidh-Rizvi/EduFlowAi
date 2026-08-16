from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class WorkflowStatus(str, Enum):
    DRAFT = "DRAFT"
    VALIDATING = "VALIDATING"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    REJECTED = "REJECTED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class PlanStep(BaseModel):
    stepId: str
    action: str
    owner: str  # "COORDINATOR_PLANNER" | "ACTION_TOOL" | "DOMAIN_ANALYSIS" | "VALIDATION_SAFETY"
    params: Dict[str, Any] = Field(default_factory=dict)
    status: str = "PENDING"  # PENDING | IN_PROGRESS | COMPLETED | FAILED


class ToolResultItem(BaseModel):
    toolName: str
    executedBy: str
    durationMs: int
    resultRef: Optional[str] = None  # Reference ID for large output
    data: Dict[str, Any] = Field(default_factory=dict)


class ApprovalRecord(BaseModel):
    required: bool = True
    status: str = "PENDING"  # PENDING | APPROVED | REJECTED | REVISION_REQUESTED
    reviewerId: Optional[str] = None
    reviewedAt: Optional[str] = None
    comments: Optional[str] = None
    revisionCount: int = 0


class SharedAgentState(BaseModel):
    """
    Standardized EduFlow AI Shared Agent State.
    Contains the 11 core state fields with reference storage for bounded memory footprint.
    """
    workflowId: str
    studentId: str
    objective: Dict[str, Any] = Field(default_factory=dict)
    studentContext: Dict[str, Any] = Field(default_factory=dict)
    plan: List[Dict[str, Any]] = Field(default_factory=list)
    toolResults: List[Dict[str, Any]] = Field(default_factory=list)
    analysis: Dict[str, Any] = Field(default_factory=dict)
    candidateOutput: Dict[str, Any] = Field(default_factory=dict)
    validation: Dict[str, Any] = Field(default_factory=dict)
    approval: Dict[str, Any] = Field(default_factory=dict)
    status: str = WorkflowStatus.DRAFT.value

    # Additional observability / metadata fields
    executionLogs: List[Dict[str, Any]] = Field(default_factory=list)
    observabilityMetrics: Dict[str, Any] = Field(default_factory=dict)

    def to_graph_dict(self) -> Dict[str, Any]:
        """Converts to LangGraph compatible dictionary."""
        return self.model_dump()

    @classmethod
    def from_graph_dict(cls, data: Dict[str, Any]) -> "SharedAgentState":
        return cls(**data)
