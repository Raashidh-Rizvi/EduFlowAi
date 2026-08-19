"""
===============================================================================
EduFlow AI - Gamification, Engagement & Retention Agent
===============================================================================
This module implements the `RetentionBehaviorAgent` (Member 3 ownership).

Why we use the Retention Behavior Agent:
1. Dropout & Churn Prediction:
   - Evaluates inactivity duration, streak degradation, and learning velocity (7-day XP velocity).
   - Computes a normalized churn risk score (0.0 to 1.0) and streak health state
     (Healthy, AtRisk, Broken, Recovered).
2. Behavioral Habit Loop Protection:
   - Prescribes motivational interventions:
     * Streak Shields (for learners 1 day away from losing active streaks)
     * Refresher Micro-Challenges (for learners struggling with accuracy < 70%)
     * XP Surge Quests (double XP rewards to re-ignite inactive learners)
     * Tutor Nudges (positive momentum reinforcement for healthy learners)
"""

# Import uuid for unique workflow tracking identifiers
import uuid
# Import typing annotations for lists and tuples
from typing import List, Tuple
# Import BaseAgent base class and execution log model
from .base import BaseAgent, AgentExecutionLog
# Import Pydantic models for retention requests, responses, and interventions
from models.schemas import (
    RetentionAnalysisRequest, 
    RetentionRiskResponse, 
    RetentionIntervention
)


class RetentionBehaviorAgent(BaseAgent):
    """
    Gamification, Engagement & Retention Agent (Member 3 - Gamification Engine)
    
    Responsibilities:
    - Analyze student inactivity duration, streak vulnerability, and XP velocity.
    - Predict drop-off and churn risks using behavioral patterns.
    - Formulate targeted motivational interventions (Streak Shields, XP Boosters, Micro-Quests).
    - Protect student habit loops through positive reinforcement.
    """
    def __init__(self):
        super().__init__(
            name="Gamification & Retention Agent",
            role_description="Monitors learning velocity, detects streak dropout risks, and prescribes retention interventions.",
            member_owner="Member 3 (Gamification & Engagement)"
        )

    def analyze_retention(self, request: RetentionAnalysisRequest) -> Tuple[RetentionRiskResponse, AgentExecutionLog]:
        """
        Calculates churn risk score and generates personalized motivational interventions.
        
        Args:
            request: RetentionAnalysisRequest with streak count, days inactive, quiz accuracy, and 7-day XP velocity.
            
        Returns:
            Tuple of (RetentionRiskResponse, AgentExecutionLog).
        """
        def _execute(req: RetentionAnalysisRequest):
            workflow_id = f"wf-ret-{uuid.uuid4().hex[:8]}"

            # -----------------------------------------------------------------
            # 1. Churn Risk Heuristic Calculation
            # -----------------------------------------------------------------
            risk_score = 0.0
            
            # Penalize inactivity duration
            if req.days_inactive >= 3:
                risk_score += 0.45
            elif req.days_inactive >= 1:
                risk_score += 0.20

            # Penalize low academic accuracy (frustration / disengagement factor)
            if req.recent_quiz_accuracy < 60.0:
                risk_score += 0.35
            elif req.recent_quiz_accuracy < 75.0:
                risk_score += 0.15

            # Penalize low XP velocity (learning pace slowdown)
            if req.xp_velocity_7d < 50:
                risk_score += 0.20

            # Cap risk score between 0.0 and 1.0
            risk_score = min(1.0, round(risk_score, 2))

            # -----------------------------------------------------------------
            # 2. Evaluate Streak Health State
            # -----------------------------------------------------------------
            if req.current_streak >= 5 and req.days_inactive == 0:
                streak_health = "Healthy"
            elif req.current_streak > 0 and req.days_inactive >= 1:
                streak_health = "AtRisk"
            elif req.current_streak == 0 and req.days_inactive >= 4:
                streak_health = "Broken"
            else:
                streak_health = "Healthy"

            # -----------------------------------------------------------------
            # 3. Formulate Behavioral Interventions
            # -----------------------------------------------------------------
            interventions: List[RetentionIntervention] = []

            # Condition 1: Streak is at risk of expiring
            if streak_health == "AtRisk":
                interventions.append(RetentionIntervention(
                    action_type="StreakShield",
                    title="🛡️ Streak Shield Activation Recommended",
                    message="You are 1 day away from losing your current streak! Complete a 3-minute micro-quest to maintain your habit chain.",
                    reward_xp=60,
                    reward_coins=25,
                    urgency_level="High"
                ))

            # Condition 2: Accuracy drop detected
            if req.recent_quiz_accuracy < 70.0:
                interventions.append(RetentionIntervention(
                    action_type="RefresherMicroChallenge",
                    title="⚡ Targeted Confidence Booster Challenge",
                    message="Review the most common pitfalls with a quick 3-question adaptive quest.",
                    reward_xp=75,
                    reward_coins=30,
                    urgency_level="Medium"
                ))

            # Condition 3: Elevated churn risk
            if risk_score > 0.5:
                interventions.append(RetentionIntervention(
                    action_type="XpBoosterQuest",
                    title="🚀 2x XP Surge: Next Lesson Completion",
                    message="Jump back in today and earn double XP on your next lesson completion.",
                    reward_xp=100,
                    reward_coins=40,
                    urgency_level="High"
                ))

            # Default positive reinforcement if healthy
            if not interventions:
                interventions.append(RetentionIntervention(
                    action_type="TutorNudge",
                    title="🌟 Momentum Master",
                    message="Excellent pacing! You are on track to master your current module this week.",
                    reward_xp=40,
                    reward_coins=15,
                    urgency_level="Low"
                ))

            # Assemble finalized response
            response = RetentionRiskResponse(
                workflow_id=workflow_id,
                student_id=req.student_id,
                churn_risk_score=risk_score,
                streak_health=streak_health,
                recommended_interventions=interventions,
                validation_passed=True
            )

            summary = f"Assessed retention risk: score={risk_score}, streak={streak_health}, generated {len(interventions)} personalized interventions."
            return response, summary, True

        return self.execute_with_trace(request, _execute)
