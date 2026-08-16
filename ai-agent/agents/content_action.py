import uuid
from typing import List, Tuple, Dict, Any
from .base import BaseAgent, AgentExecutionLog
from models.schemas import (
    StudyPlanActivity, 
    AdaptiveChallengeRequest, 
    AdaptiveChallengeResponse, 
    ChallengeQuestionItem,
    GapAnalysisResult
)

class ActionToolAgent(BaseAgent):
    """
    Action & Content Tool Agent (Member 2 - Assessments & Tools)
    Responsible for:
    - Executing controlled curriculum content and assessment generation tools
    - Formulating adaptive micro-challenges targeting diagnosed weak spots
    - Constructing structured interactive quests, labs, and boss challenges
    - Calibrating questions with distractors and explanations
    """
    def __init__(self):
        super().__init__(
            name="Content & Action Tool Agent",
            role_description="Executes educational tools and creates tailored adaptive challenges, labs, and quests.",
            member_owner="Member 2 (Assessments & Tools)"
        )

    def generate_study_schedule(
        self, 
        target_goal: str, 
        gap_analysis: GapAnalysisResult
    ) -> Tuple[List[StudyPlanActivity], AgentExecutionLog]:
        def _execute(_):
            primary_topic = gap_analysis.weak_areas[0] if gap_analysis.weak_areas else "Core Architecture"
            secondary_topic = gap_analysis.weak_areas[1] if len(gap_analysis.weak_areas) > 1 else "Database Optimization"

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
        def _execute(req: AdaptiveChallengeRequest):
            workflow_id = f"wf-ch-{uuid.uuid4().hex[:8]}"
            challenge_id = str(uuid.uuid4())

            # Difficulty matrices bounded strictly by economy rules
            difficulty_matrix = {
                "Easy": {"xp": 50, "coins": 15, "time": 10},
                "Medium": {"xp": 120, "coins": 40, "time": 15},
                "Hard": {"xp": 150, "coins": 60, "time": 20},
                "Boss": {"xp": 150, "coins": 80, "time": 25}
            }

            config = difficulty_matrix.get(req.target_difficulty, difficulty_matrix["Medium"])

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
                ),
                ChallengeQuestionItem(
                    question_text=f"Which diagnostic indicator most reliably reveals performance bottlenecks in {req.weak_topic}?",
                    options=[
                        "Database query execution plans showing sequential table scans instead of index seeks",
                        "Number of comments in the source code files",
                        "The color scheme of the client frontend",
                        "Using uppercase letters for C# property names"
                    ],
                    correct_index=0,
                    explanation="Execution plans showing full sequential scans indicate missing or suboptimal composite indexes.",
                    points=10
                )
            ]

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
