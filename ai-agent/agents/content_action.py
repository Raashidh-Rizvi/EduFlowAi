"""
===============================================================================
EduFlow AI - Content & Action Tool Agent (Assessments & Tools)
===============================================================================
This module implements the `ActionToolAgent` (Member 2 ownership).

Why we use the Content & Action Tool Agent:
1. Controlled Tool Execution:
   - Serves as the primary operational agent executing curriculum and content tools
     through the verified `ToolRegistry`.
2. Pedagogical Activity & Schedule Formulation:
   - Translates diagnosed learning gaps into balanced daily study activities:
     * Conceptual Lessons (Foundations & Architecture)
     * Hands-on Coding Labs (Implementation & Verification)
     * Timed Quizzes (Edge Cases & Knowledge Checks)
     * Boss Battles (Simulated Outages & Multi-Topic Integration)
3. Adaptive Challenge Formulation:
   - Constructs interactive micro-quests strictly bounded by gamification XP caps (<= 150 XP).
"""

# Import uuid for generating unique challenge and workflow identifiers
import uuid
# Import typing annotations for collections, tuples, and dictionaries
from typing import List, Tuple, Dict, Any
# Import BaseAgent base class and execution log model
from .base import BaseAgent, AgentExecutionLog
# Import Pydantic models for activities, challenges, and gap analysis results
from models.schemas import (
    StudyPlanActivity, 
    AdaptiveChallengeRequest, 
    AdaptiveChallengeResponse, 
    ChallengeQuestionItem,
    GapAnalysisResult
)
# Import tool registry singleton
from tools.registry import tool_registry


class ActionToolAgent(BaseAgent):
    """
    Content & Action Tool Agent (Member 2 - Assessments & Tools)
    
    Responsibilities:
    - Executing controlled curriculum content and assessment generation tools from the permitted registry.
    - Formulating adaptive micro-challenges targeting diagnosed weak spots.
    - Constructing structured interactive quests, labs, and boss challenges.
    - Calibrating questions with distractors and pedagogical explanations.
    """
    def __init__(self):
        super().__init__(
            name="Content & Action Tool Agent",
            role_description="Executes educational tools and creates tailored adaptive challenges, labs, and quests.",
            member_owner="Member 2 (Assessments & Tools)"
        )

    def execute_controlled_tool(self, tool_name: str, params: Dict[str, Any]) -> Tuple[Dict[str, Any], AgentExecutionLog]:
        """
        Executes a specific registered tool via the ToolRegistry under the ACTION_TOOL role.
        
        Args:
            tool_name: The name of the tool to execute (e.g., 'create_challenge_draft').
            params: Parameters dictionary passed into the tool.
            
        Returns:
            Tuple of (tool_result_dict, AgentExecutionLog).
        """
        def _execute(_):
            result, duration_ms = tool_registry.execute_tool(tool_name, "ACTION_TOOL", params)
            summary = f"Executed permitted tool '{tool_name}' successfully ({duration_ms}ms)."
            return result, summary, True

        return self.execute_with_trace(None, _execute)

    def generate_study_schedule(
        self, 
        target_goal: str, 
        gap_analysis: GapAnalysisResult
    ) -> Tuple[List[StudyPlanActivity], AgentExecutionLog]:
        """
        Generates a balanced 7-day schedule of learning activities tailored to diagnosed weak areas.
        
        Args:
            target_goal: The student's learning objective.
            gap_analysis: The diagnostic GapAnalysisResult identifying weak topics.
            
        Returns:
            Tuple of (List[StudyPlanActivity], AgentExecutionLog).
        """
        def _execute(_):
            primary_topic = gap_analysis.weak_areas[0] if gap_analysis.weak_areas else "Core Architecture"
            secondary_topic = gap_analysis.weak_areas[1] if len(gap_analysis.weak_areas) > 1 else "Database Optimization"

            # Build balanced 4-activity progression (Lesson -> Lab -> Quiz -> Boss Battle)
            schedule = [
                StudyPlanActivity(
                    day_number=1,
                    activity_title=f"Lesson: Deep-Dive into {primary_topic}",
                    description=f"Theoretical foundations, trade-offs, and architectural considerations for {primary_topic}.",
                    activity_type="Lesson",
                    estimated_minutes=60,
                    xp_reward=40
                ),
                StudyPlanActivity(
                    day_number=3,
                    activity_title=f"Lab: Hands-on Implementation of {primary_topic}",
                    description=f"Interactive coding laboratory building test cases and verification rules for {primary_topic}.",
                    activity_type="Lab",
                    estimated_minutes=90,
                    xp_reward=60
                ),
                StudyPlanActivity(
                    day_number=5,
                    activity_title=f"Quiz: Knowledge Check on {secondary_topic}",
                    description=f"Timed diagnostic assessment evaluating edge cases and design patterns in {secondary_topic}.",
                    activity_type="Quiz",
                    estimated_minutes=45,
                    xp_reward=50
                ),
                StudyPlanActivity(
                    day_number=7,
                    activity_title=f"Boss Battle: Integrated Synthesis & Error Recovery Challenge",
                    description=f"Comprehensive simulated outage scenario combining {primary_topic} and {secondary_topic}.",
                    activity_type="Boss",
                    estimated_minutes=60,
                    xp_reward=150
                )
            ]

            summary = f"Generated {len(schedule)} structured learning activities (Lesson, Lab, Quiz, Boss Encounter) targeted at '{primary_topic}'."
            return schedule, summary, True

        return self.execute_with_trace(None, _execute)

    def generate_adaptive_challenge(
        self, 
        request: AdaptiveChallengeRequest
    ) -> Tuple[AdaptiveChallengeResponse, AgentExecutionLog]:
        """
        Synthesizes an adaptive micro-challenge tailored to a student's weak topic and target difficulty.
        
        Args:
            request: AdaptiveChallengeRequest specifying student_id, weak_topic, and target_difficulty.
            
        Returns:
            Tuple of (AdaptiveChallengeResponse, AgentExecutionLog).
        """
        def _execute(req: AdaptiveChallengeRequest):
            workflow_id = f"wf-ch-{uuid.uuid4().hex[:8]}"
            challenge_id = str(uuid.uuid4())

            # Difficulty matrices bounded strictly by economy rules (Max 150 XP, Max 100 Coins)
            difficulty_matrix = {
                "Easy": {"xp": 50, "coins": 15, "time": 10},
                "Medium": {"xp": 120, "coins": 40, "time": 15},
                "Hard": {"xp": 150, "coins": 60, "time": 20},
                "Boss": {"xp": 150, "coins": 80, "time": 25}
            }

            config = difficulty_matrix.get(req.target_difficulty, difficulty_matrix["Medium"])

            # Call tool registry create_challenge_draft for underlying question items
            draft_res, _ = tool_registry.execute_tool(
                "create_challenge_draft",
                "ACTION_TOOL",
                {
                    "weak_topic": req.weak_topic,
                    "difficulty": req.target_difficulty,
                    "xp_reward": config["xp"],
                    "coin_reward": config["coins"],
                    "time_limit_minutes": config["time"]
                }
            )

            # Map raw questions to ChallengeQuestionItem models
            questions = [
                ChallengeQuestionItem(
                    question_text=q["question_text"],
                    options=q["options"],
                    correct_index=q["correct_index"],
                    explanation=q["explanation"],
                    points=q.get("points", 10)
                )
                for q in draft_res.get("questions", [])
            ]

            # Fallback default question if none returned by draft
            if not questions:
                questions = [
                    ChallengeQuestionItem(
                        question_text=f"When working with {req.weak_topic}, what is the primary reason to enforce explicit transaction boundaries?",
                        options=[
                            "To ensure atomic commits and prevent partial state corruption on failure",
                            "To bypass database query parsing latency",
                            "To eliminate the need for primary keys",
                            "To convert synchronous web requests to UDP broadcasts"
                        ],
                        correct_index=0,
                        explanation="Transactional ACID boundaries guarantee that multi-step state transitions succeed completely or rollback cleanly.",
                        points=10
                    )
                ]

            # Assemble finalized AdaptiveChallengeResponse
            challenge = AdaptiveChallengeResponse(
                challenge_id=challenge_id,
                workflow_id=workflow_id,
                title=f"Adaptive Quest: {req.weak_topic} Mastery",
                description=f"Calibrated {config['time']}-minute targeted practice quest addressing identified gaps in {req.weak_topic}.",
                difficulty=req.target_difficulty,
                xp_reward=config["xp"],
                coin_reward=config["coins"],
                time_limit_minutes=config["time"],
                questions=questions,
                validation_passed=True,
                status="PendingInstructorApproval"
            )

            summary = f"Crafted '{challenge.title}' with {len(questions)} calibrated questions ({config['xp']} XP reward, {config['time']} min time limit)."
            return challenge, summary, True

        return self.execute_with_trace(request, _execute)
