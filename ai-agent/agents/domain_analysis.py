from typing import Tuple, List, Optional
from .base import BaseAgent, AgentExecutionLog
from models.schemas import GapAnalysisResult

class DomainAnalysisAgent(BaseAgent):
    """
    Domain Analysis Agent (Member 3 - Gamification & Analytics)
    Responsible for:
    - Diagnostic analysis of quiz performance, failure patterns, and error frequency
    - Evaluating mastery levels and cognitive load index
    - Identifying critical knowledge gaps
    - Recommending optimal focus areas and challenge difficulty
    """
    def __init__(self):
        super().__init__(
            name="Domain Analysis Agent",
            role_description="Diagnoses learning gaps, analyzes error trends, and computes mastery levels.",
            member_owner="Member 3 (Gamification & Analytics)"
        )

    def analyze_learning_gaps(
        self, 
        student_id: str, 
        course_id: str, 
        recent_quiz_accuracy: float = 65.0,
        hint_topic: Optional[str] = None
    ) -> Tuple[GapAnalysisResult, AgentExecutionLog]:
        def _execute(_):
            if hint_topic:
                weak_areas = [f"{hint_topic} Fundamentals", f"{hint_topic} Edge Cases & Error Handling"]
                rec_focus = f"Reinforce core principles of {hint_topic} through guided practice"
            else:
                weak_areas = [
                    "Entity Framework Core Transaction Rollbacks",
                    "PostgreSQL Composite Index Slicing"
                ]
                rec_focus = "Focus on ACID transaction consistency and multi-column index execution plans"

            progress_pct = max(10.0, min(95.0, recent_quiz_accuracy * 0.85))
            cognitive_load = 0.72 if recent_quiz_accuracy < 70.0 else 0.45
            mastery = "Novice" if recent_quiz_accuracy < 50 else ("Intermediate" if recent_quiz_accuracy < 85 else "Advanced")

            result = GapAnalysisResult(
                weak_areas=weak_areas,
                current_progress_pct=round(progress_pct, 1),
                recommended_focus=rec_focus,
                mastery_level=mastery,
                cognitive_load_index=cognitive_load
            )

            summary = f"Diagnosed {len(weak_areas)} knowledge gaps. Current mastery: {mastery} ({progress_pct}% progress, cognitive load: {cognitive_load})."
            return result, summary, True

        return self.execute_with_trace(None, _execute)
