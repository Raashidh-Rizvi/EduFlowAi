from typing import List, Tuple, Dict, Any, Optional
from .base import BaseAgent, AgentExecutionLog
from models.schemas import StudyPlanRequest, PlanMilestone, PlannerOutput, PlanStepModel
from tools.registry import tool_registry
from core.errors import ValidationError

class CoordinatorPlannerAgent(BaseAgent):
    """
    Coordinator / Planner Agent (Member 1 - Architecture & Planning)
    Responsible for:
    - Understanding student learning goals and authorized constraints
    - Goal decomposition into a coherent multi-step execution plan
    - Allocating balanced workload hours across target weeks
    - Strictly enforcing permitted tool whitelisting (never inventing arbitrary tools)
    - Delegating sub-tasks to Action/Tool, Domain Analysis, and Validation agents
    """
    def __init__(self):
        super().__init__(
            name="Coordinator / Planner Agent",
            role_description="Understands student objectives, builds multi-step execution plans, and enforces tool whitelisting.",
            member_owner="Member 1 (Architecture & Planning)"
        )
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
        """Enforces that the planner never invents non-registered tools."""
        registered_tools = {t["name"].upper() for t in tool_registry.list_tools()}
        for step in steps:
            action_upper = step.action.upper()
            if action_upper not in self.permitted_actions and action_upper not in registered_tools:
                raise ValidationError(
                    f"Planner proposed unauthorized/invented action: '{step.action}'. Must be in permitted registry."
                )
        return True

    def build_execution_plan(self, objective: Dict[str, Any], context: Dict[str, Any]) -> Tuple[PlannerOutput, AgentExecutionLog]:
        """
        Builds a structured LangGraph execution plan delegating across the agent ecosystem.
        """
        def _execute(_):
            goal = objective.get("goal", "Master Core Architecture")
            student_id = context.get("student_id", "student-uuid")
            course_id = context.get("course_id", "CS-301")

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

            # Validate against tool whitelist
            self.validate_plan_tools(steps)

            output = PlannerOutput(
                steps=steps,
                total_estimated_hours=float(context.get("hours_per_week", 8.0)),
                rationale=f"Constructed 4-step delegated execution plan for goal '{goal}' ensuring complete tool whitelisting."
            )

            summary = f"Generated {len(steps)}-step multi-agent execution plan with strict tool whitelist validation."
            return output, summary, True

        return self.execute_with_trace(None, _execute)

    def plan_milestones(self, request: StudyPlanRequest) -> Tuple[List[PlanMilestone], AgentExecutionLog]:
        def _execute(req: StudyPlanRequest):
            goal_lower = req.target_goal.lower()
            
            if "index" in goal_lower or "database" in goal_lower or "sql" in goal_lower:
                m1_topics = ["PostgreSQL Schema Design", "B-Tree Indexes", "Composite Indexes"]
                m2_topics = ["EF Core Migrations", "Query Optimization", "Transaction Isolation"]
            elif "frontend" in goal_lower or "react" in goal_lower:
                m1_topics = ["Component Hierarchy", "State Management (Context/Redux)", "React Hooks"]
                m2_topics = ["Tailwind/CSS Design Tokens", "REST API Integration", "Performance Profiling"]
            else:
                m1_topics = ["Core Domain Models", "Repository & Clean Architecture", "Data Validation"]
                m2_topics = ["ASP.NET Core Web APIs", "JWT Security & RBAC", "Unit & Integration Tests"]

            hours_p1 = round(req.hours_per_week * 0.45, 1)
            hours_p2 = round(req.hours_per_week * 0.55, 1)

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
