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
# Import logging so Groq copy-generation failures are visible without breaking the request
import logging
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

# Import LangChain primitives to turn an already-decided intervention type into
# a short, personalized JSON {title, message} via Groq (mirrors quiz_generator.py's
# prompt | llm | parser pattern)
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
# Import the shared Groq client factory + resilient chain-invocation helper
from core.llm import get_gemini_llm, invoke_structured

# Module-level logger
logger = logging.getLogger(__name__)


def _generate_retention_copy(
    llm,
    action_type: str,
    fallback_title: str,
    fallback_message: str,
    context_lines: str
) -> Tuple[str, str]:
    """
    Asks Groq for a short, specific, encouraging title/message for an
    intervention TYPE that the deterministic rules engine has already decided
    on. This never influences the risk score or which intervention fires --
    it only rewrites the copy shown to the student.

    Falls back to the exact hardcoded template strings (unchanged) on any
    failure: missing GROQ_API_KEY, rate limits, malformed/missing JSON keys,
    or any other exception -- so a Groq outage can never break retention
    analysis.

    Args:
        llm: A constructed ChatGoogleGenerativeAI instance, or None if Groq is unavailable.
        action_type: The already-decided intervention type (e.g. "StreakShield").
        fallback_title: The existing hardcoded template title for this type.
        fallback_message: The existing hardcoded template message for this type.
        context_lines: Real student telemetry formatted as a bullet list, the
            ONLY facts the model is allowed to reference.

    Returns:
        Tuple of (title, message) -- either freshly generated or the fallback.
    """
    if llm is None:
        return fallback_title, fallback_message

    try:
        prompt = PromptTemplate(
            template=(
                "You are EduBuddy, an upbeat, concise in-app learning coach for the "
                "EduFlow AI platform.\n\n"
                "A deterministic rules engine has ALREADY decided this exact retention "
                "intervention for the student -- do not change it or invent a different one:\n"
                "Intervention type: {action_type}\n\n"
                "Real student context (use ONLY these facts -- never invent streaks, "
                "scores, topics, or numbers that are not listed here):\n"
                "{context}\n\n"
                "Write a short punchy notification title and ONE short, encouraging, "
                "specific motivational message for this student.\n"
                "- Naturally reference the concrete numbers/context above -- do not just "
                "restate the intervention type.\n"
                "- Positive, specific tone. No generic filler.\n"
                "- Title: max ~8 words, may include a single relevant emoji.\n"
                "- Message: 1-2 sentences, under 240 characters.\n\n"
                "Respond with ONLY a JSON object and nothing else:\n"
                '{{"title": "...", "message": "..."}}'
            ),
            input_variables=["action_type", "context"]
        )
        chain = prompt | llm | JsonOutputParser()
        result = invoke_structured(chain, {"action_type": action_type, "context": context_lines})

        title = result.get("title") if isinstance(result, dict) else None
        message = result.get("message") if isinstance(result, dict) else None
        if isinstance(title, str) and title.strip() and isinstance(message, str) and message.strip():
            return title.strip(), message.strip()

        logger.warning("Groq retention copy for %s missing title/message keys, using fallback.", action_type)
    except Exception as e:
        logger.warning("Groq retention copy generation failed for %s, using fallback template: %s", action_type, e)

    return fallback_title, fallback_message


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
            # 1.5 Construct the shared Groq client (best-effort, never fatal)
            # -----------------------------------------------------------------
            # NOTE: This LLM is used ONLY to rewrite the title/message copy of
            # whichever intervention(s) the deterministic logic below decides
            # to fire. It has no influence on risk_score, streak_health, or
            # which intervention TYPE(s) get selected. If Groq is unavailable
            # for any reason (missing GROQ_API_KEY, rate limit, network), every
            # intervention below silently falls back to its hardcoded template.
            try:
                retention_llm = get_gemini_llm(temperature=0.6)
            except Exception as e:
                logger.warning("Groq LLM unavailable for retention copy generation, using template fallback: %s", e)
                retention_llm = None

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
                fallback_title = "🛡️ Streak Shield Activation Recommended"
                fallback_message = "You are 1 day away from losing your current streak! Complete a 3-minute micro-quest to maintain your habit chain."
                ai_title, ai_message = _generate_retention_copy(
                    retention_llm, "StreakShield", fallback_title, fallback_message,
                    context_lines=(
                        f"- Current streak: {req.current_streak} day(s)\n"
                        f"- Days inactive: {req.days_inactive}\n"
                        f"- Reward for acting now: +60 XP, +25 coins\n"
                        f"- Urgency: High"
                    )
                )
                interventions.append(RetentionIntervention(
                    action_type="StreakShield",
                    title=ai_title,
                    message=ai_message,
                    reward_xp=60,
                    reward_coins=25,
                    urgency_level="High"
                ))

            # Condition 2: Accuracy drop detected
            if req.recent_quiz_accuracy < 70.0:
                fallback_title = "⚡ Targeted Confidence Booster Challenge"
                fallback_message = "Review the most common pitfalls with a quick 3-question adaptive quest."
                ai_title, ai_message = _generate_retention_copy(
                    retention_llm, "RefresherMicroChallenge", fallback_title, fallback_message,
                    context_lines=(
                        f"- Recent quiz accuracy: {req.recent_quiz_accuracy}%\n"
                        f"- Current streak: {req.current_streak} day(s)\n"
                        f"- Reward for acting now: +75 XP, +30 coins\n"
                        f"- Urgency: Medium"
                    )
                )
                interventions.append(RetentionIntervention(
                    action_type="RefresherMicroChallenge",
                    title=ai_title,
                    message=ai_message,
                    reward_xp=75,
                    reward_coins=30,
                    urgency_level="Medium"
                ))

            # Condition 3: Elevated churn risk
            if risk_score > 0.5:
                fallback_title = "🚀 2x XP Surge: Next Lesson Completion"
                fallback_message = "Jump back in today and earn double XP on your next lesson completion."
                ai_title, ai_message = _generate_retention_copy(
                    retention_llm, "XpBoosterQuest", fallback_title, fallback_message,
                    context_lines=(
                        f"- Computed churn risk score: {risk_score} (0.0=low risk, 1.0=high risk)\n"
                        f"- Days inactive: {req.days_inactive}\n"
                        f"- 7-day XP velocity: {req.xp_velocity_7d} XP\n"
                        f"- Reward for acting now: +100 XP, +40 coins\n"
                        f"- Urgency: High"
                    )
                )
                interventions.append(RetentionIntervention(
                    action_type="XpBoosterQuest",
                    title=ai_title,
                    message=ai_message,
                    reward_xp=100,
                    reward_coins=40,
                    urgency_level="High"
                ))

            # Default positive reinforcement if healthy
            if not interventions:
                fallback_title = "🌟 Momentum Master"
                fallback_message = "Excellent pacing! You are on track to master your current module this week."
                ai_title, ai_message = _generate_retention_copy(
                    retention_llm, "TutorNudge", fallback_title, fallback_message,
                    context_lines=(
                        f"- Current streak: {req.current_streak} day(s)\n"
                        f"- Recent quiz accuracy: {req.recent_quiz_accuracy}%\n"
                        f"- 7-day XP velocity: {req.xp_velocity_7d} XP\n"
                        f"- Streak health: {streak_health}\n"
                        f"- Reward for acting now: +40 XP, +15 coins\n"
                        f"- Urgency: Low"
                    )
                )
                interventions.append(RetentionIntervention(
                    action_type="TutorNudge",
                    title=ai_title,
                    message=ai_message,
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
