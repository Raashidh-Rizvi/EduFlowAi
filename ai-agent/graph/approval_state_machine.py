from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from models.state import WorkflowStatus
from core.errors import ValidationError

class ApprovalStateMachine:
    """
    State Machine managing Human-in-the-Loop review and workflow lifecycle transitions:
    - Standard path: DRAFT -> VALIDATING -> PENDING_APPROVAL -> APPROVED -> EXECUTING -> COMPLETED
    - Rejection:     PENDING_APPROVAL -> REJECTED
    - Revision:      PENDING_APPROVAL -> REVISION_REQUESTED -> VALIDATING / DRAFT
    """

    # Defined legal state transitions
    TRANSITIONS = {
        WorkflowStatus.DRAFT.value: [WorkflowStatus.VALIDATING.value, WorkflowStatus.FAILED.value],
        WorkflowStatus.VALIDATING.value: [WorkflowStatus.PENDING_APPROVAL.value, WorkflowStatus.EXECUTING.value, WorkflowStatus.FAILED.value],
        WorkflowStatus.PENDING_APPROVAL.value: [
            WorkflowStatus.APPROVED.value,
            WorkflowStatus.REJECTED.value,
            WorkflowStatus.REVISION_REQUESTED.value
        ],
        WorkflowStatus.REVISION_REQUESTED.value: [WorkflowStatus.DRAFT.value, WorkflowStatus.VALIDATING.value],
        WorkflowStatus.APPROVED.value: [WorkflowStatus.EXECUTING.value],
        WorkflowStatus.EXECUTING.value: [WorkflowStatus.COMPLETED.value, WorkflowStatus.FAILED.value],
        WorkflowStatus.REJECTED.value: [],
        WorkflowStatus.COMPLETED.value: [],
        WorkflowStatus.FAILED.value: [WorkflowStatus.DRAFT.value]
    }

    @classmethod
    def can_transition(cls, from_status: str, to_status: str) -> bool:
        allowed = cls.TRANSITIONS.get(from_status, [])
        return to_status in allowed

    @classmethod
    def transition(
        cls,
        current_status: str,
        target_status: str,
        reviewer_id: Optional[str] = None,
        comments: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes and records a validated state transition.
        """
        if not cls.can_transition(current_status, target_status):
            raise ValidationError(
                f"Illegal state transition from '{current_status}' to '{target_status}'. Allowed target states: {cls.TRANSITIONS.get(current_status, [])}"
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        return {
            "from_status": current_status,
            "to_status": target_status,
            "timestamp": now_iso,
            "reviewer_id": reviewer_id,
            "comments": comments,
            "success": True
        }
