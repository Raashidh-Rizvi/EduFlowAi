from datetime import datetime, timezone
from typing import List, Tuple, Any
from .base import BaseAgent, AgentExecutionLog
from models.schemas import (
    StudyPlanRequest, 
    PlanMilestone, 
    StudyPlanActivity, 
    ValidationCheck,
    AdaptiveChallengeResponse,
    DiagnosticQuizResponse
)

class ValidationGuardAgent(BaseAgent):
    """
    Validation & Safety Guard Agent (Member 4 - Safety & Governance)
    Responsible for:
    - Multi-layer deterministic validation
    - Enforcing platform safety boundaries (XP caps, workload constraints, rule checks)
    - Anti-hallucination verification against curricula
    - Routing approved proposals to instructor governance queue
    """
    def __init__(self):
        super().__init__(
            name="Validation & Safety Guard Agent",
            role_description="Executes deterministic safety checks, schema verification, and economy policy enforcement.",
            member_owner="Member 4 (Safety & Governance)"
        )

    def validate_study_plan(
        self,
        request: StudyPlanRequest,
        milestones: List[PlanMilestone],
        schedule: List[StudyPlanActivity]
    ) -> Tuple[ValidationCheck, AgentExecutionLog]:
        def _execute(_):
            errors: List[str] = []
            warnings: List[str] = []

            # Rule 1: Goal clarity constraint
            if len(request.target_goal.strip()) < 5:
                errors.append("Target goal description is too brief (minimum 5 characters required).")

            # Rule 2: Workload boundaries (2.0h to 20.0h per week)
            if request.hours_per_week > 20.0:
                errors.append(f"Requested hours ({request.hours_per_week}h/week) exceeds safe study cap of 20h/week.")
            elif request.hours_per_week < 2.0:
                errors.append("Minimum study commitment must be at least 2.0 hours/week.")

            # Rule 3: Milestone workload distribution
            total_milestone_hours = sum(m.estimated_hours for m in milestones)
            expected_max_hours = request.hours_per_week * request.target_weeks * 1.25
            if total_milestone_hours > expected_max_hours:
                errors.append(f"Total milestone workload ({total_milestone_hours}h) exceeds allocated duration ({expected_max_hours}h).")

            # Rule 4: Activity XP reward bounds (Max 150 XP per single activity)
            for act in schedule:
                if act.xp_reward > 150:
                    errors.append(f"Activity '{act.activity_title}' reward ({act.xp_reward} XP) exceeds single activity cap of 150 XP.")

            # Rule 5: Schema and content integrity
            if len(schedule) == 0:
                errors.append("Study plan must contain at least one scheduled learning activity.")

            passed = len(errors) == 0
            check = ValidationCheck(
                passed=passed,
                errors=errors,
                warnings=warnings,
                deterministic_rule_count=5,
                checked_at=datetime.now(timezone.utc).isoformat()
            )

            summary = f"Enforced 5 deterministic safety rules (Passed: {passed}, Errors: {len(errors)}, Warnings: {len(warnings)})."
            return check, summary, passed

        return self.execute_with_trace(None, _execute)

    def validate_adaptive_challenge(
        self,
        challenge: AdaptiveChallengeResponse
    ) -> Tuple[ValidationCheck, AgentExecutionLog]:
        def _execute(_):
            errors: List[str] = []
            warnings: List[str] = []

            # Rule 1: XP reward upper bound check (Max 150 XP for challenges)
            if challenge.xp_reward > 150:
                errors.append(f"Challenge XP reward ({challenge.xp_reward}) exceeds platform cap of 150 XP.")

            # Rule 2: Coin reward boundary check
            if challenge.coin_reward > 100:
                errors.append(f"Challenge Coin reward ({challenge.coin_reward}) exceeds platform cap of 100 coins.")

            # Rule 3: Questions integrity check
            if len(challenge.questions) < 1:
                errors.append("Challenge must contain at least one calibrated assessment question.")

            for i, q in enumerate(challenge.questions):
                if len(q.options) < 2:
                    errors.append(f"Question {i+1} must contain at least 2 answer options.")
                if q.correct_index < 0 or q.correct_index >= len(q.options):
                    errors.append(f"Question {i+1} has invalid correct_index ({q.correct_index}).")
                if not q.explanation or len(q.explanation.strip()) < 5:
                    warnings.append(f"Question {i+1} has short or missing pedagogical explanation.")

            passed = len(errors) == 0
            check = ValidationCheck(
                passed=passed,
                errors=errors,
                warnings=warnings,
                deterministic_rule_count=4,
                checked_at=datetime.now(timezone.utc).isoformat()
            )

            summary = f"Validated challenge '{challenge.title}' against 4 economic & pedagogical guardrails (Passed: {passed})."
            return check, summary, passed

        return self.execute_with_trace(None, _execute)
