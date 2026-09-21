"""
===============================================================================
EduFlow AI - Human-in-the-Loop (HITL) Approval State Machine
===============================================================================
This module implements the `ApprovalStateMachine` governing the workflow lifecycle.

Why we use a State Machine:
1. Strict Governance of AI Operations:
   - Prevents AI agents from automatically executing actions or mutating student data
     without passing through validated states and human approval gates.
2. Formal Verification of Legal Transitions:
   - Blocks illegal lifecycle skips (e.g., jumping directly from `DRAFT` to `COMPLETED`
     without undergoing `VALIDATING` and `PENDING_APPROVAL`).
3. Feedback & Revision Loops:
   - Supports `REVISION_REQUESTED`, allowing human instructors to send candidate proposals
     back to the Planner Agent with specific feedback for automated re-evaluation.
"""

# Import datetime and timezone for ISO timestamping of state transitions
from datetime import datetime, timezone
# Import typing annotations for dictionaries, lists, and optional fields
from typing import Dict, Any, List, Optional
# Import WorkflowStatus enum
from models.state import WorkflowStatus
# Import custom ValidationError for illegal transitions
from core.errors import ValidationError


class ApprovalStateMachine:
    """
    State Machine managing Human-in-the-Loop review and workflow lifecycle transitions:
    
    Standard Happy Path:
      DRAFT -> VALIDATING -> PENDING_APPROVAL -> APPROVED -> EXECUTING -> COMPLETED
      
    Rejection Path:
      PENDING_APPROVAL -> REJECTED (Terminal State)
      
    Revision Loop:
      PENDING_APPROVAL -> REVISION_REQUESTED -> VALIDATING / DRAFT (Loops back to Planner)
    """

    # Dictionary defining the legal target states for every current workflow state
    TRANSITIONS = {
        # From DRAFT: can proceed to VALIDATING or transition to FAILED
        WorkflowStatus.DRAFT.value: [
            WorkflowStatus.VALIDATING.value, 
            WorkflowStatus.FAILED.value
        ],
        # From VALIDATING: can proceed to PENDING_APPROVAL, EXECUTING (if auto-approved), or FAILED
        WorkflowStatus.VALIDATING.value: [
            WorkflowStatus.PENDING_APPROVAL.value, 
            WorkflowStatus.EXECUTING.value, 
            WorkflowStatus.FAILED.value
        ],
        # From PENDING_APPROVAL: can be APPROVED, REJECTED, or REVISION_REQUESTED by human reviewer
        WorkflowStatus.PENDING_APPROVAL.value: [
            WorkflowStatus.APPROVED.value,
            WorkflowStatus.REJECTED.value,
            WorkflowStatus.REVISION_REQUESTED.value
        ],
        # From REVISION_REQUESTED: loops back to DRAFT or VALIDATING for automated replanning
        WorkflowStatus.REVISION_REQUESTED.value: [
            WorkflowStatus.DRAFT.value, 
            WorkflowStatus.VALIDATING.value
        ],
        # From APPROVED: advances to EXECUTING
        WorkflowStatus.APPROVED.value: [
            WorkflowStatus.EXECUTING.value
        ],
        # From EXECUTING: completes successfully or fails
        WorkflowStatus.EXECUTING.value: [
            WorkflowStatus.COMPLETED.value, 
            WorkflowStatus.FAILED.value
        ],
        # Terminal state: REJECTED cannot transition further
        WorkflowStatus.REJECTED.value: [],
        # Terminal state: COMPLETED cannot transition further
        WorkflowStatus.COMPLETED.value: [],
        # From FAILED: can be reset to DRAFT for a fresh retry
        WorkflowStatus.FAILED.value: [
            WorkflowStatus.DRAFT.value
        ]
    }

    @classmethod
    def can_transition(cls, from_status: str, to_status: str) -> bool:
        """
        Checks if a state transition from `from_status` to `to_status` is legally permitted.
        
        Args:
            from_status: The current workflow status string.
            to_status: The desired destination status string.
            
        Returns:
            True if transition is allowed; False otherwise.
        """
        # Look up allowed destination states for the current status
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
        
        Args:
            current_status: The active workflow status before transition.
            target_status: The target workflow status to transition into.
            reviewer_id: Optional identifier of the human reviewer (e.g. "Instructor-1").
            comments: Optional review comments or revision instructions.
            
        Returns:
            Dictionary recording the transition record with timestamp and metadata.
            
        Raises:
            ValidationError: If the requested state transition is illegal.
        """
        # Verify transition legality
        if not cls.can_transition(current_status, target_status):
            raise ValidationError(
                f"Illegal state transition from '{current_status}' to '{target_status}'. Allowed target states: {cls.TRANSITIONS.get(current_status, [])}"
            )

        # Generate current UTC ISO timestamp
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Build and return transition record
        return {
            "from_status": current_status,
            "to_status": target_status,
            "timestamp": now_iso,
            "reviewer_id": reviewer_id,
            "comments": comments,
            "success": True
        }
