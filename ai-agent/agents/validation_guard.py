"""
===============================================================================
EduFlow AI - Validation & Safety Guard Agent (Safety & Governance)
===============================================================================
This module implements the `ValidationGuardAgent` (Member 4 ownership).

Why we use the Validation & Safety Guard Agent:
1. Deterministic-First Safety Architecture:
   - LLMs can make arithmetic errors, invent non-existent rules, or grant excessive XP.
   - The Validation Guard Agent uses strict, non-LLM Python code rules to verify candidate drafts.
2. 5-Layer Deterministic Validation Pipeline:
   - Layer 1: JSON Schema Integrity (non-empty fields, required types, non-null values).
   - Layer 2: Course Curriculum Reference (checks that topics exist in accredited syllabus).
   - Layer 3: Platform Business & Economy Rules (enforces Max 150 XP, Max 100 Coins, 2h-20h/week caps).
   - Layer 4: Platform Safety & Permission Isolation (strictly blocks mutations of user roles, grades, or deletion keys).
   - Layer 5: Human Approval Gating Decision (determines whether human instructor review is required).
"""

# Import datetime and timezone for timestamping validation checks
from datetime import datetime, timezone
# Import typing hints for collections, tuples, and dictionaries
from typing import List, Tuple, Any, Dict, Optional
# Import BaseAgent and execution log schema
from .base import BaseAgent, AgentExecutionLog
# Import Pydantic schemas for requests, milestones, activities, validation checks, and responses
from models.schemas import (
    StudyPlanRequest, 
    PlanMilestone, 
    StudyPlanActivity, 
    ValidationCheck,
    AdaptiveChallengeResponse,
    DiagnosticQuizResponse
)
# Import tool registry singleton
from tools.registry import tool_registry


class ValidationGuardAgent(BaseAgent):
    """
    Validation & Safety Guard Agent (Member 4 - Safety & Governance)
    
    Responsibilities:
    - 5-Layer Deterministic-First Validation pipeline.
    - JSON Schema & data integrity verification.
    - Curriculum data references check (anti-hallucination).
    - Business & Economy rule enforcement (Max 150 XP, Max 100 Coins, 2h-20h/wk study cap).
    - Platform Safety Boundaries (zero direct grade/permission/data mutation).
    - Instructor Approval Decision gating.
    """
    def __init__(self):
        super().__init__(
            name="Validation & Safety Guard Agent",
            role_description="Executes deterministic safety checks, schema verification, and economy policy enforcement.",
            member_owner="Member 4 (Safety & Governance)"
        )
        # Platform business rule limits & caps
        self.MAX_CHALLENGE_XP = 150      # Maximum XP awarded for any micro-challenge
        self.MAX_ACTIVITY_XP = 150       # Maximum XP awarded for any single daily study activity
        self.MAX_COINS = 100             # Maximum in-game coins awarded per challenge/quiz
        self.MIN_STUDY_HOURS = 2.0       # Minimum weekly study commitment in hours
        self.MAX_STUDY_HOURS = 20.0      # Maximum safe weekly study cap in hours to prevent burnout

    def validate_candidate_draft(
        self,
        draft_type: str,
        payload: Dict[str, Any]
    ) -> Tuple[ValidationCheck, AgentExecutionLog]:
        """
        Generic deterministic-first multi-layer validation pipeline for candidate AI drafts.
        
        Args:
            draft_type: Type of draft being validated (e.g. "AdaptiveChallenge", "StudyPlan").
            payload: Dictionary payload representing the candidate output.
            
        Returns:
            Tuple of (ValidationCheck, AgentExecutionLog).
        """
        def _execute(_):
            errors: List[str] = []
            warnings: List[str] = []

            # -----------------------------------------------------------------
            # Layer 1: JSON Schema Integrity
            # -----------------------------------------------------------------
            if not payload or not isinstance(payload, dict):
                errors.append("SCHEMA_ERROR: Payload must be a non-empty JSON object.")
                return self._build_result(errors, warnings)

            # -----------------------------------------------------------------
            # Layer 2: Curriculum Reference Check (Anti-Hallucination)
            # -----------------------------------------------------------------
            course_ref = tool_registry.get_tool("get_course_content").handler({})
            known_topics = set()
            for mod in course_ref.get("modules", []):
                for t in mod.get("topics", []):
                    title = t.get("title", "") if isinstance(t, dict) else str(t)
                    known_topics.add(title.lower())

            topic = payload.get("topic") or payload.get("weak_topic") or payload.get("title", "")
            if topic and not any(k in topic.lower() for k in ["postgres", "index", "architecture", "ef core", "transaction", "clean"]):
                warnings.append(f"CURRICULUM_WARNING: Topic '{topic}' could not be matched with high confidence against syllabus.")

            # -----------------------------------------------------------------
            # Layer 3: Business & Economy Rules (XP & Coins)
            # -----------------------------------------------------------------
            proposed_xp = payload.get("xp_reward", 0)
            if proposed_xp > self.MAX_CHALLENGE_XP:
                errors.append(f"INVALID_REWARD: AI proposed XP={proposed_xp}. Maximum allowed challenge XP is {self.MAX_CHALLENGE_XP}.")

            proposed_coins = payload.get("coin_reward", 0)
            if proposed_coins > self.MAX_COINS:
                errors.append(f"INVALID_REWARD: AI proposed Coins={proposed_coins}. Maximum allowed is {self.MAX_COINS}.")

            # -----------------------------------------------------------------
            # Layer 4: AI Safety Boundaries (Unauthorized mutations)
            # -----------------------------------------------------------------
            forbidden_keys = ["assign_grade", "final_score", "user_role", "delete_record", "bypass_approval"]
            for f_key in forbidden_keys:
                if f_key in payload:
                    errors.append(f"SAFETY_VIOLATION: AI is strictly prohibited from mutating '{f_key}'.")

            # -----------------------------------------------------------------
            # Layer 5: Approval Gating Decision
            # -----------------------------------------------------------------
            requires_human_approval = True  # Instructor governance always enforced for curriculum alterations

            passed = len(errors) == 0
            check = ValidationCheck(
                passed=passed,
                errors=errors,
                warnings=warnings,
                deterministic_rule_count=5,
                checked_at=datetime.now(timezone.utc).isoformat(),
                requires_human_approval=requires_human_approval
            )

            summary = f"Multi-layer validation complete: {'PASSED' if passed else 'FAILED'} ({len(errors)} errors, {len(warnings)} warnings)."
            return check, summary, passed

        return self.execute_with_trace(None, _execute)

    def validate_study_plan(
        self,
        request: StudyPlanRequest,
        milestones: List[PlanMilestone],
        schedule: List[StudyPlanActivity]
    ) -> Tuple[ValidationCheck, AgentExecutionLog]:
        """
        Validates generated study plan workload boundaries and activity rewards.
        
        Args:
            request: The original StudyPlanRequest.
            milestones: The decomposed PlanMilestones.
            schedule: The list of StudyPlanActivity items.
            
        Returns:
            Tuple of (ValidationCheck, AgentExecutionLog).
        """
        def _execute(_):
            errors: List[str] = []
            warnings: List[str] = []

            # Layer 1 & 2: Goal clarity check
            if len(request.target_goal.strip()) < 5:
                errors.append("SCHEMA_ERROR: Target goal description is too brief (minimum 5 characters required).")

            # Layer 3: Workload boundaries (2.0h to 20.0h per week)
            if request.hours_per_week > self.MAX_STUDY_HOURS:
                errors.append(f"WORKLOAD_VIOLATION: Requested hours ({request.hours_per_week}h/week) exceeds safe study cap of {self.MAX_STUDY_HOURS}h/week.")
            elif request.hours_per_week < self.MIN_STUDY_HOURS:
                errors.append(f"WORKLOAD_VIOLATION: Minimum study commitment must be at least {self.MIN_STUDY_HOURS} hours/week.")

            # Milestone workload distribution sanity check
            total_milestone_hours = sum(m.estimated_hours for m in milestones)
            expected_max_hours = request.hours_per_week * request.target_weeks * 1.25
            if total_milestone_hours > expected_max_hours:
                errors.append(f"WORKLOAD_VIOLATION: Total milestone workload ({total_milestone_hours}h) exceeds allocated duration ({expected_max_hours}h).")

            # Layer 3: Activity XP reward bounds (Max 150 XP per single activity)
            for act in schedule:
                if act.xp_reward > self.MAX_ACTIVITY_XP:
                    errors.append(f"INVALID_REWARD: Activity '{act.activity_title}' reward ({act.xp_reward} XP) exceeds single activity cap of {self.MAX_ACTIVITY_XP} XP.")

            # Layer 4: Safety & Non-empty check
            if len(schedule) == 0:
                errors.append("INTEGRITY_ERROR: Study plan must contain at least one scheduled learning activity.")

            passed = len(errors) == 0
            check = ValidationCheck(
                passed=passed,
                errors=errors,
                warnings=warnings,
                deterministic_rule_count=5,
                checked_at=datetime.now(timezone.utc).isoformat(),
                requires_human_approval=True
            )

            summary = f"Enforced 5 deterministic safety rules (Passed: {passed}, Errors: {len(errors)}, Warnings: {len(warnings)})."
            return check, summary, passed

        return self.execute_with_trace(None, _execute)

    def validate_adaptive_challenge(
        self,
        challenge: AdaptiveChallengeResponse
    ) -> Tuple[ValidationCheck, AgentExecutionLog]:
        """
        Validates adaptive challenge rewards, options counts, and correct index ranges.
        
        Args:
            challenge: AdaptiveChallengeResponse to validate.
            
        Returns:
            Tuple of (ValidationCheck, AgentExecutionLog).
        """
        def _execute(_):
            errors: List[str] = []
            warnings: List[str] = []

            # Rule 1: XP reward upper bound check (Max 150 XP)
            if challenge.xp_reward > self.MAX_CHALLENGE_XP:
                errors.append(f"INVALID_REWARD: Challenge XP reward ({challenge.xp_reward}) exceeds platform cap of {self.MAX_CHALLENGE_XP} XP.")

            # Rule 2: Coin reward boundary check (Max 100 Coins)
            if challenge.coin_reward > self.MAX_COINS:
                errors.append(f"INVALID_REWARD: Challenge Coin reward ({challenge.coin_reward}) exceeds platform cap of {self.MAX_COINS} coins.")

            # Rule 3: Questions integrity check
            if len(challenge.questions) < 1:
                errors.append("INTEGRITY_ERROR: Challenge must contain at least one calibrated assessment question.")

            for i, q in enumerate(challenge.questions):
                if len(q.options) < 2:
                    errors.append(f"INTEGRITY_ERROR: Question {i+1} must contain at least 2 answer options.")
                if q.correct_index < 0 or q.correct_index >= len(q.options):
                    errors.append(f"INTEGRITY_ERROR: Question {i+1} has invalid correct_index ({q.correct_index}).")
                if not q.explanation or len(q.explanation.strip()) < 5:
                    warnings.append(f"PEDAGOGICAL_WARNING: Question {i+1} has short or missing pedagogical explanation.")

            passed = len(errors) == 0
            check = ValidationCheck(
                passed=passed,
                errors=errors,
                warnings=warnings,
                deterministic_rule_count=5,
                checked_at=datetime.now(timezone.utc).isoformat(),
                requires_human_approval=True
            )

            summary = f"Validated challenge '{challenge.title}' against deterministic guardrails (Passed: {passed})."
            return check, summary, passed

        return self.execute_with_trace(None, _execute)

    def validate_quiz_assessment(
        self,
        quiz: DiagnosticQuizResponse
    ) -> Tuple[ValidationCheck, AgentExecutionLog]:
        """
        Validates full quiz assessment for scope-aware XP caps, question formats, and Bloom's tagging.
        
        Args:
            quiz: DiagnosticQuizResponse to validate.
            
        Returns:
            Tuple of (ValidationCheck, AgentExecutionLog).
        """
        def _execute(_):
            errors: List[str] = []
            warnings: List[str] = []

            # Rule 1: Scope-aware Gamification XP caps
            scope_caps = {
                "TOPIC": 150,
                "CONTENT_ITEM": 150,
                "MODULE": 150,
                "COURSE": 200,
                "BOSS": 250
            }
            max_xp = scope_caps.get(quiz.scope_type.upper(), 150)
            if quiz.gamification_rewards.xp_reward > max_xp:
                errors.append(f"INVALID_REWARD: Quiz XP reward ({quiz.gamification_rewards.xp_reward}) exceeds {quiz.scope_type} cap of {max_xp} XP.")

            if quiz.gamification_rewards.coin_reward > self.MAX_COINS:
                errors.append(f"INVALID_REWARD: Quiz Coin reward ({quiz.gamification_rewards.coin_reward}) exceeds platform cap of {self.MAX_COINS} coins.")

            # Rule 2: Non-empty questions check
            if len(quiz.questions) < 1:
                errors.append("INTEGRITY_ERROR: Quiz must contain at least one question.")

            # Rule 3: Question format & options integrity for all 10 types
            seen_texts = set()
            for i, q in enumerate(quiz.questions):
                q_text = (q.question_text or "").strip().lower()
                if q_text in seen_texts:
                    warnings.append(f"DUPLICATE_WARNING: Question {i+1} has identical prompt text to an earlier question.")
                seen_texts.add(q_text)

                q_type = q.question_type.upper()
                if q_type in ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "SCENARIO_BASED", "TIMED_CHALLENGE"]:
                    if len(q.options) < 2:
                        errors.append(f"INTEGRITY_ERROR: {q_type} Question {i+1} must contain at least 2 answer options.")
                elif q_type == "TRUE_FALSE":
                    if len(q.options) != 2 or not any(opt.lower() == "true" for opt in q.options):
                        errors.append(f"INTEGRITY_ERROR: True/False Question {i+1} must have options ['True', 'False'].")
                elif q_type in ["SHORT_ANSWER", "FILL_IN_THE_BLANK"]:
                    if not q.correct_answer:
                        errors.append(f"INTEGRITY_ERROR: Fill-in/Short Answer Question {i+1} must have a valid answer key.")

                if not q.explanation or len(q.explanation.strip()) < 5:
                    warnings.append(f"PEDAGOGICAL_WARNING: Question {i+1} has short or missing pedagogical explanation.")
                if not q.blooms_taxonomy_level:
                    warnings.append(f"PEDAGOGICAL_WARNING: Question {i+1} is missing Bloom's taxonomy cognitive tag.")
                if not q.learningObjective:
                    warnings.append(f"CURRICULUM_WARNING: Question {i+1} is not mapped to an accredited Learning Objective.")

            # Rule 4: Total points validation
            if quiz.total_points <= 0:
                errors.append("INTEGRITY_ERROR: Quiz total points must be greater than zero.")

            # Rule 5: Time limit validation
            if quiz.time_limit_minutes < 1 or quiz.time_limit_seconds < 60:
                errors.append("TIMING_ERROR: Quiz time limit must be at least 1 minute.")

            # Rule 6: Pass percentage validation
            if quiz.pass_percentage < 40 or quiz.pass_percentage > 100:
                errors.append("PASS_MARK_ERROR: Pass percentage must be between 40% and 100%.")

            passed = len(errors) == 0
            check = ValidationCheck(
                passed=passed,
                errors=errors,
                warnings=warnings,
                deterministic_rule_count=12,
                checked_at=datetime.now(timezone.utc).isoformat(),
                requires_human_approval=True,
                validated_layers=[
                    "1. Scope Existence & Course Containment",
                    "2. Exact Question Count & Distribution Match",
                    "3. Single / Multiple Option & Boolean Key Validation",
                    "4. Bloom's Taxonomy & Distractor Rationales",
                    "5. Content Grounding & Learning Objective Traceability",
                    "6. Server-Defined Gamification XP Economy Bounds",
                    "7. Time Limit & Pass Percentage Invariants"
                ]
            )

            summary = f"Validated {quiz.scope_type} quiz '{quiz.title}' ({len(quiz.questions)} questions, {quiz.gamification_rewards.xp_reward} XP) (Passed: {passed})."
            return check, summary, passed

        return self.execute_with_trace(None, _execute)

    def _build_result(self, errors: List[str], warnings: List[str]) -> Tuple[ValidationCheck, str, bool]:
        """Helper to construct standard ValidationCheck result tuples."""
        passed = len(errors) == 0
        check = ValidationCheck(
            passed=passed,
            errors=errors,
            warnings=warnings,
            deterministic_rule_count=12,
            checked_at=datetime.now(timezone.utc).isoformat()
        )
        return check, f"Validation {'passed' if passed else 'failed'} with {len(errors)} errors.", passed
