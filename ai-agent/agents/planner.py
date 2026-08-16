from typing import List, Tuple
from .base import BaseAgent, AgentExecutionLog
from models.schemas import StudyPlanRequest, PlanMilestone

class CoordinatorPlannerAgent(BaseAgent):
    """
    Coordinator / Planner Agent (Member 1 - Architecture & Planning)
    Responsible for:
    - Understanding student learning goals and constraints
    - Goal decomposition into coherent weekly milestones
    - Allocating balanced workload hours across target weeks
    - Orchestrating sub-agent execution order
    """
    def __init__(self):
        super().__init__(
            name="Coordinator / Planner Agent",
            role_description="Decomposes student objectives into structured milestones and coordinates agent delegation.",
            member_owner="Member 1 (Architecture & Planning)"
        )

    def plan_milestones(self, request: StudyPlanRequest) -> Tuple[List[PlanMilestone], AgentExecutionLog]:
        def _execute(req: StudyPlanRequest):
            # Parse topics from goal or provide structured progressive learning track
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
