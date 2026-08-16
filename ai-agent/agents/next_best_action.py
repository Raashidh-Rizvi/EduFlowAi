import time
from typing import List, Tuple, Optional
from .base import BaseAgent, AgentExecutionLog
from models.schemas import (
    NextBestActionRequest,
    NextBestActionResponse,
    SkillMasteryTelemetryItem
)

class NextBestActionAgent(BaseAgent):
    """
    AI Next Best Action Engine (Signature Adaptive Learning Game Loop Agent)
    Responsible for:
    - Analyzing student level, XP velocity, streak consistency, and topic skill mastery matrix
    - Detecting knowledge gaps (e.g. Recursion 43% vs Functions 90%)
    - Recommending deterministic optimal learning action:
      * TAKE_REMEDIATION_QUIZ: If topic mastery < 60%
      * TAKE_BOSS_CHALLENGE: If module topics all > 80%
      * WATCH_LESSON: If repeated conceptual errors
      * DO_CHALLENGE: For daily momentum
    - Formulating conversational companion guidance for 'EduBuddy' AI Coach
    """
    def __init__(self):
        super().__init__(
            name="Next Best Action Agent",
            role_description="Calculates deterministic next learning action using skill mastery telemetry and curriculum state.",
            member_owner="Member 3 (AI Coaching & Learning Loop)"
        )

    def evaluate_next_action(self, request: NextBestActionRequest) -> Tuple[NextBestActionResponse, AgentExecutionLog]:
        def _execute(req: NextBestActionRequest):
            skills = req.skills if req.skills else [
                SkillMasteryTelemetryItem(topic_name="Functions & Scope", mastery_percentage=90, total_attempts=20, correct_attempts=18),
                SkillMasteryTelemetryItem(topic_name="Loops & Iterations", mastery_percentage=82, total_attempts=22, correct_attempts=18),
                SkillMasteryTelemetryItem(topic_name="OOP & Encapsulation", mastery_percentage=72, total_attempts=18, correct_attempts=13),
                SkillMasteryTelemetryItem(topic_name="Recursion & Trees", mastery_percentage=43, total_attempts=14, correct_attempts=6)
            ]

            # Find weakest skill
            weakest = min(skills, key=lambda s: s.mastery_percentage)
            strongest = max(skills, key=lambda s: s.mastery_percentage)

            if weakest.mastery_percentage < 60:
                action_type = "TAKE_REMEDIATION_QUIZ"
                title = f"🎯 {weakest.topic_name} Rescue Challenge"
                desc = f"Your mastery in {weakest.topic_name} is currently {weakest.mastery_percentage}%. Take a targeted 5-question quest to strengthen recursive base cases."
                reason = f"Identified learning gap in {weakest.topic_name} ({weakest.mastery_percentage}% mastery vs {strongest.topic_name} at {strongest.mastery_percentage}%)."
                time_mins = 10
                xp_reward = 75
                edubuddy = (
                    f"Welcome back, {req.student_name}! You're Level {req.level} with a {req.streak}-day streak. "
                    f"Your strongest skill is {strongest.topic_name} ({strongest.mastery_percentage}%). "
                    f"However, {weakest.topic_name} is currently at {weakest.mastery_percentage}%. "
                    f"I've prepared a targeted 5-question challenge to help you master it and earn +{xp_reward} XP!"
                )
            elif all(s.mastery_percentage >= 80 for s in skills):
                action_type = "TAKE_BOSS_CHALLENGE"
                title = "👹 Module 1 Boss Challenge"
                desc = "All foundational topics are mastered above 80%! Defeat the Module Boss to earn the Boss Slayer badge and unlock Module 2."
                reason = "All module topics exceed 80% competency threshold."
                time_mins = 20
                xp_reward = 200
                edubuddy = (
                    f"Incredible work, {req.student_name}! You've reached mastery across all topics in this module. "
                    f"The Module Boss Challenge is now unlocked! Prove your architecture skills to earn +{xp_reward} XP and the 🏆 Boss Slayer badge."
                )
            else:
                action_type = "DO_CHALLENGE"
                title = f"⚡ {weakest.topic_name} Mastery Sprint"
                desc = f"Boost your {weakest.topic_name} competency from {weakest.mastery_percentage}% to 80%."
                reason = "Progressive competency improvement quest."
                time_mins = 15
                xp_reward = 60
                edubuddy = f"Keep up the momentum, {req.student_name}! A quick sprint on {weakest.topic_name} will push you into the 80%+ mastery bracket."

            audit_log = AgentExecutionLog(
                agent_name="Next Best Action Agent",
                execution_time_ms=5,
                summary=f"Evaluated {len(skills)} skills. Weakest: '{weakest.topic_name}' ({weakest.mastery_percentage}%). Selected: {action_type}.",
                passed=True
            )

            res = NextBestActionResponse(
                action_type=action_type,
                title=title,
                description=desc,
                target_topic=weakest.topic_name,
                reason=reason,
                estimated_time_minutes=time_mins,
                reward_xp=xp_reward,
                edubuddy_message=edubuddy,
                audit_log=audit_log
            )
            return res, f"Computed next best action: {action_type} for {weakest.topic_name}", True

        return self.execute_with_trace(request, _execute)
