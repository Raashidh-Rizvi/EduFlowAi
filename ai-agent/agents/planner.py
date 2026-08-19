"""
===============================================================================
EduFlow AI - Coordinator / Planner Agent (Architecture & Planning)
===============================================================================
This module implements the `CoordinatorPlannerAgent` (Member 1 ownership).

Why we use the Coordinator / Planner Agent:
1. Goal Decomposition & Multi-Agent Delegation:
   - Ingests high-level student learning objectives and target deadlines.
   - Decomposes goals into a coherent, multi-step execution plan delegating subtasks to:
     * Domain Analysis Agent (for diagnostic knowledge gap evaluations)
     * Content & Action Tool Agent (for quest/challenge synthesis)
     * Validation & Safety Guard Agent (for deterministic rule checks)
2. Strict Tool Whitelisting Enforcement:
   - Validates that every step in the proposed plan corresponds strictly to an authorized,
     registered tool or permitted agent action.
   - Blocks invented or unauthorized actions immediately.
"""

# Import typing hints for collections, tuples, and dictionaries
from typing import List, Tuple, Dict, Any, Optional
# Import BaseAgent base class and execution log schema
from .base import BaseAgent, AgentExecutionLog
# Import Pydantic schemas for study plan requests, milestones, and planner outputs
from models.schemas import StudyPlanRequest, PlanMilestone, PlannerOutput, PlanStepModel
# Import tool registry singleton to verify tool existence
from tools.registry import tool_registry
# Import custom ValidationError for unauthorized actions
from core.errors import ValidationError


class CoordinatorPlannerAgent(BaseAgent):
    """
    Coordinator / Planner Agent (Member 1 - Architecture & Planning)
    
    Responsibilities:
    - Ingest student learning goals and time constraints (hours/week, target weeks).
    - Goal decomposition into a structured multi-step execution plan.
    - Milestone allocation balancing foundational theory vs applied practice.
    - Strictly enforcing permitted tool whitelisting (never inventing arbitrary tools).
    - Delegating sub-tasks across the agent ecosystem.
    """
    def __init__(self):
        # Initialize base agent with identity, role description, and member ownership
        super().__init__(
            name="Coordinator / Planner Agent",
            role_description="Understands student objectives, builds multi-step execution plans, and enforces tool whitelisting.",
            member_owner="Member 1 (Architecture & Planning)"
        )
        # Whitelist mapping of allowed planner actions to authorized agent roles
        self.permitted_actions = {
            "ANALYZE_PROGRESS": "DOMAIN_ANALYSIS",
            "EVALUATE_MASTERY": "DOMAIN_ANALYSIS",
            "GET_COURSE_CONTENT": "ACTION_TOOL",
            "GET_STUDENT_PROGRESS": "ACTION_TOOL",
            "GET_QUIZ_RESULTS": "ACTION_TOOL",
            "CREATE_QUIZ_DRAFT": "ACTION_TOOL",
            "CREATE_CHALLENGE_DRAFT": "ACTION_TOOL",
            "GENERATE_FEEDBACK_DRAFT": "ACTION_TOOL",
            "GET_GAMIFICATION_RULES": "ACTION_TOOL",
            "VALIDATE_OUTPUT": "VALIDATION_SAFETY",
            "ENFORCE_SAFETY_BOUNDS": "VALIDATION_SAFETY"
        }

    def validate_plan_tools(self, steps: List[PlanStepModel]) -> bool:
        """
        Enforces that the planner never invents non-registered tools or unauthorized actions.
        
        Why we use this method:
        - Security & Reliability: LLMs can hallucinate non-existent tool names. This method
          strictly compares all proposed actions against the permitted actions and registered tools.
          
        Args:
            steps: List of PlanStepModel objects in the proposed plan.
            
        Returns:
            True if all steps are authorized.
            
        Raises:
            ValidationError: If any action in the plan is not in the whitelist or registry.
        """
        # Fetch uppercase names of all tools registered in ToolRegistry
        registered_tools = {t["name"].upper() for t in tool_registry.list_tools()}
        
        # Validate each proposed step in the plan
        for step in steps:
            action_upper = step.action.upper()
            # If action is neither in permitted actions map nor in tool registry, reject it
            if action_upper not in self.permitted_actions and action_upper not in registered_tools:
                raise ValidationError(
                    f"Planner proposed unauthorized/invented action: '{step.action}'. Must be in permitted registry."
                )
        return True

    def build_execution_plan(self, objective: Dict[str, Any], context: Dict[str, Any]) -> Tuple[PlannerOutput, AgentExecutionLog]:
        """
        Builds a structured LangGraph execution plan delegating across the agent ecosystem.
        
        Args:
            objective: Dictionary containing the student's target goal and parameters.
            context: Dictionary containing student context (student_id, course_id, hours_per_week).
            
        Returns:
            Tuple of (PlannerOutput, AgentExecutionLog).
        """
        def _execute(_):
            # Extract goal or fall back to default
            goal = objective.get("goal", "Master Core Architecture")
            # Extract student ID
            student_id = context.get("student_id", "student-uuid")
            # Extract course ID
            course_id = context.get("course_id", "CS-301")

            # Formulate 4-step delegated execution pipeline
            steps = [
                PlanStepModel(
                    stepId="1",
                    action="GET_STUDENT_PROGRESS",
                    owner="ACTION_TOOL",
                    params={"student_id": student_id}
                ),
                PlanStepModel(
                    stepId="2",
                    action="ANALYZE_PROGRESS",
                    owner="DOMAIN_ANALYSIS",
                    params={"student_id": student_id, "course_id": course_id}
                ),
                PlanStepModel(
                    stepId="3",
                    action="CREATE_CHALLENGE_DRAFT",
                    owner="ACTION_TOOL",
                    params={"course_id": course_id, "goal": goal}
                ),
                PlanStepModel(
                    stepId="4",
                    action="VALIDATE_OUTPUT",
                    owner="VALIDATION_SAFETY",
                    params={"check_rewards": True, "check_safety": True}
                )
            ]

            # Enforce tool whitelisting on the proposed steps
            self.validate_plan_tools(steps)

            # Build strongly-typed PlannerOutput
            output = PlannerOutput(
                steps=steps,
                total_estimated_hours=float(context.get("hours_per_week", 8.0)),
                rationale=f"Constructed 4-step delegated execution plan for goal '{goal}' ensuring complete tool whitelisting."
            )

            # Summary narrative for execution audit trail
            summary = f"Generated {len(steps)}-step multi-agent execution plan with strict tool whitelist validation."
            return output, summary, True

        # Wrap in automated execution trace
        return self.execute_with_trace(None, _execute)

    def plan_milestones(self, request: StudyPlanRequest) -> Tuple[List[PlanMilestone], AgentExecutionLog]:
        """
        Decomposes a multi-week study plan request into progressive milestone phases.
        
        Args:
            request: StudyPlanRequest containing target_goal, hours_per_week, and target_weeks.
            
        Returns:
            Tuple of (List[PlanMilestone], AgentExecutionLog).
        """
        def _execute(req: StudyPlanRequest):
            goal_lower = req.target_goal.lower()
            
            # Contextual topic selection based on student goal keywords
            if "index" in goal_lower or "database" in goal_lower or "sql" in goal_lower:
                m1_topics = ["PostgreSQL Schema Design", "B-Tree Indexes", "Composite Indexes"]
                m2_topics = ["EF Core Migrations", "Query Optimization", "Transaction Isolation"]
            elif "frontend" in goal_lower or "react" in goal_lower:
                m1_topics = ["Component Hierarchy", "State Management (Context/Redux)", "React Hooks"]
                m2_topics = ["Tailwind/CSS Design Tokens", "REST API Integration", "Performance Profiling"]
            else:
                m1_topics = ["Core Domain Models", "Repository & Clean Architecture", "Data Validation"]
                m2_topics = ["ASP.NET Core Web APIs", "JWT Security & RBAC", "Unit & Integration Tests"]

            # Balance workload: 45% of hours in Phase 1 (Foundations), 55% in Phase 2 (Applied)
            hours_p1 = round(req.hours_per_week * 0.45, 1)
            hours_p2 = round(req.hours_per_week * 0.55, 1)

            # Construct milestone phases
            milestones = [
                PlanMilestone(
                    milestone_id=1,
                    title="Phase 1: Fundamental Concepts & Data Architecture",
                    target_topics=m1_topics,
                    estimated_hours=hours_p1
                ),
                PlanMilestone(
                    milestone_id=2,
                    title="Phase 2: Applied Engineering & Architectural Integrity",
                    target_topics=m2_topics,
                    estimated_hours=hours_p2
                )
            ]

            summary = f"Decomposed goal '{req.target_goal[:35]}...' into {len(milestones)} progressive milestones over {req.target_weeks} weeks ({req.hours_per_week} hrs/week)."
            return milestones, summary, True

        return self.execute_with_trace(request, _execute)
