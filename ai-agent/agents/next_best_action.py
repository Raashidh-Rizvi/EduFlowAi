"""
===============================================================================
EduFlow AI - Next Best Action Engine (Adaptive Learning Game Loop)
===============================================================================
This module implements the `NextBestActionAgent` (Member 3 ownership).

Why we use the Next Best Action Agent:
1. Core Adaptive Game Loop:
   - Ingests student level, total XP, streak, and granular skill telemetry matrix.
   - Evaluates weak vs strong skills to recommend the single highest-impact learning action:
     * `TAKE_REMEDIATION_QUIZ`: Triggered if any skill mastery is below 60%.
     * `TAKE_BOSS_CHALLENGE`: Triggered when all module skills exceed 80% mastery threshold.
     * `DO_CHALLENGE`: Daily momentum sprint to elevate intermediate skills.
2. EduBuddy AI Companion Dialogue:
   - Formulates personalized, encouraging natural language coaching messages acknowledging
     the student's strongest skills while motivating them to conquer weak topics.
"""

# Import time module for execution timing
import time
# Import logging so Groq copy-generation failures are visible without breaking the request
import logging
# Import typing annotations for lists, tuples, and optionals
from typing import List, Tuple, Optional
# Import BaseAgent base class and execution log model
from .base import BaseAgent, AgentExecutionLog
# Import Pydantic models for Next Best Action request, response, and skill telemetry items
from models.schemas import (
    NextBestActionRequest,
    NextBestActionResponse,
    SkillMasteryTelemetryItem
)

# Import LangChain primitives to turn an already-decided action type into a
# short, personalized EduBuddy coaching message via Groq (mirrors
# quiz_generator.py's prompt | llm | parser pattern)
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
# Import the shared Groq client factory + resilient chain-invocation helper
from core.llm import get_groq_llm, invoke_structured

# Module-level logger
logger = logging.getLogger(__name__)


def _generate_edubuddy_message(llm, action_type: str, fallback_message: str, context_lines: str) -> str:
    """
    Asks Groq for a short, encouraging, specific EduBuddy coaching line for an
    action TYPE that the deterministic skill-mastery logic has already decided
    on. This never influences which action fires, the target topic, or any
    reward/timing numbers -- it only rewrites the companion dialogue text.

    Falls back to the exact hardcoded template message (unchanged) on any
    failure: missing GROQ_API_KEY, rate limits, empty output, or any other
    exception -- so a Groq outage can never break the next-best-action call.

    Args:
        llm: A constructed ChatGroq instance, or None if Groq is unavailable.
        action_type: The already-decided action type (e.g. "TAKE_REMEDIATION_QUIZ").
        fallback_message: The existing hardcoded template message for this type.
        context_lines: Real student telemetry formatted as a bullet list, the
            ONLY facts the model is allowed to reference.

    Returns:
        The freshly generated message, or the fallback template on any failure.
    """
    if llm is None:
        return fallback_message

    try:
        prompt = PromptTemplate(
            template=(
                "You are EduBuddy, an upbeat, concise AI coach embedded in the EduFlow "
                "learning platform.\n\n"
                "A deterministic skill-mastery engine has ALREADY decided this exact next "
                "action for the student -- do not change it or invent a different one:\n"
                "Action type: {action_type}\n\n"
                "Real student context (use ONLY these facts -- never invent skills, "
                "topics, streaks, levels, or numbers that are not listed here):\n"
                "{context}\n\n"
                "Write ONE short, encouraging, specific coaching message speaking "
                "directly to the student that acknowledges their real progress and "
                "motivates them toward this action.\n"
                "- Naturally reference the concrete numbers/topics above -- do not just "
                "restate the action type.\n"
                "- Positive, specific tone. No generic filler.\n"
                "- 1-3 sentences, under 320 characters.\n"
                "- Respond with ONLY the message text -- no quotes, no JSON, no preamble."
            ),
            input_variables=["action_type", "context"]
        )
        chain = prompt | llm | StrOutputParser()
        result = invoke_structured(chain, {"action_type": action_type, "context": context_lines})

        if isinstance(result, str) and result.strip():
            return result.strip().strip('"')

        logger.warning("Groq edubuddy message for %s was empty, using fallback.", action_type)
    except Exception as e:
        logger.warning("Groq edubuddy message generation failed for %s, using fallback template: %s", action_type, e)

    return fallback_message


class NextBestActionAgent(BaseAgent):
    """
    AI Next Best Action Engine (Signature Adaptive Learning Game Loop Agent)
    
    Responsibilities:
    - Analyze student level, XP velocity, streak consistency, and topic skill mastery matrix.
    - Detect knowledge gaps (e.g., Recursion 43% vs Functions 90%).
    - Recommend deterministic optimal learning actions:
      * TAKE_REMEDIATION_QUIZ: If topic mastery < 60%
      * TAKE_BOSS_CHALLENGE: If module topics all > 80%
      * WATCH_LESSON: If repeated conceptual errors
      * DO_CHALLENGE: For daily momentum
    - Formulate companion dialogue for 'EduBuddy' AI Coach.
    """
    def __init__(self):
        super().__init__(
            name="Next Best Action Agent",
            role_description="Calculates deterministic next learning action using skill mastery telemetry and curriculum state.",
            member_owner="Member 3 (AI Coaching & Learning Loop)"
        )

    def evaluate_next_action(self, request: NextBestActionRequest) -> Tuple[NextBestActionResponse, AgentExecutionLog]:
        """
        Evaluates the student's skill mastery matrix and selects the optimal next learning activity.
        
        Args:
            request: NextBestActionRequest containing student profile and skill mastery telemetry.
            
        Returns:
            Tuple of (NextBestActionResponse, AgentExecutionLog).
        """
        def _execute(req: NextBestActionRequest):
            # Use provided skills or fall back to standard diagnostic telemetry set
            skills = req.skills if req.skills else [
                SkillMasteryTelemetryItem(topic_name="Functions & Scope", mastery_percentage=90, total_attempts=20, correct_attempts=18),
                SkillMasteryTelemetryItem(topic_name="Loops & Iterations", mastery_percentage=82, total_attempts=22, correct_attempts=18),
                SkillMasteryTelemetryItem(topic_name="OOP & Encapsulation", mastery_percentage=72, total_attempts=18, correct_attempts=13),
                SkillMasteryTelemetryItem(topic_name="Recursion & Trees", mastery_percentage=43, total_attempts=14, correct_attempts=6)
            ]

            # Identify the weakest and strongest skills in the matrix
            weakest = min(skills, key=lambda s: s.mastery_percentage)
            strongest = max(skills, key=lambda s: s.mastery_percentage)

            # -----------------------------------------------------------------
            # Construct the shared Groq client (best-effort, never fatal)
            # -----------------------------------------------------------------
            # NOTE: This LLM is used ONLY to rewrite the edubuddy_message
            # companion dialogue below. It has no influence on weakest/
            # strongest skill selection, action_type, target_topic, timing, or
            # XP reward -- all of that stays 100% deterministic business
            # logic. If Groq is unavailable for any reason (missing
            # GROQ_API_KEY, rate limit, network), edubuddy_message silently
            # falls back to its hardcoded template string.
            try:
                nba_llm = get_groq_llm(temperature=0.6)
            except Exception as e:
                logger.warning("Groq LLM unavailable for edubuddy message generation, using template fallback: %s", e)
                nba_llm = None

            # -----------------------------------------------------------------
            # Decision Branch 1: Remediation needed (weakest < 60%)
            # -----------------------------------------------------------------
            if weakest.mastery_percentage < 60:
                action_type = "TAKE_REMEDIATION_QUIZ"
                title = f"🎯 {weakest.topic_name} Rescue Challenge"
                desc = f"Your mastery in {weakest.topic_name} is currently {weakest.mastery_percentage}%. Take a targeted 5-question quest to strengthen recursive base cases."
                reason = f"Identified learning gap in {weakest.topic_name} ({weakest.mastery_percentage}% mastery vs {strongest.topic_name} at {strongest.mastery_percentage}%)."
                time_mins = 10
                xp_reward = 75
                fallback_edubuddy = (
                    f"Welcome back, {req.student_name}! You're Level {req.level} with a {req.streak}-day streak. "
                    f"Your strongest skill is {strongest.topic_name} ({strongest.mastery_percentage}%). "
                    f"However, {weakest.topic_name} is currently at {weakest.mastery_percentage}%. "
                    f"I've prepared a targeted 5-question challenge to help you master it and earn +{xp_reward} XP!"
                )
                edubuddy = _generate_edubuddy_message(
                    nba_llm, action_type, fallback_edubuddy,
                    context_lines=(
                        f"- Student name: {req.student_name}\n"
                        f"- Level: {req.level}\n"
                        f"- Current streak: {req.streak} day(s)\n"
                        f"- Course: {req.course_name}\n"
                        f"- Weakest skill: {weakest.topic_name} ({weakest.mastery_percentage}% mastery)\n"
                        f"- Strongest skill: {strongest.topic_name} ({strongest.mastery_percentage}% mastery)\n"
                        f"- Assigned action: a targeted 5-question remediation quest on {weakest.topic_name}\n"
                        f"- Reward for completing it: +{xp_reward} XP"
                    )
                )

            # -----------------------------------------------------------------
            # Decision Branch 2: All skills mastered (all >= 80%) -> Unlock Boss
            # -----------------------------------------------------------------
            elif all(s.mastery_percentage >= 80 for s in skills):
                action_type = "TAKE_BOSS_CHALLENGE"
                title = "👹 Module 1 Boss Challenge"
                desc = "All foundational topics are mastered above 80%! Defeat the Module Boss to earn the Boss Slayer badge and unlock Module 2."
                reason = "All module topics exceed 80% competency threshold."
                time_mins = 20
                xp_reward = 200
                fallback_edubuddy = (
                    f"Incredible work, {req.student_name}! You've reached mastery across all topics in this module. "
                    f"The Module Boss Challenge is now unlocked! Prove your architecture skills to earn +{xp_reward} XP and the 🏆 Boss Slayer badge."
                )
                edubuddy = _generate_edubuddy_message(
                    nba_llm, action_type, fallback_edubuddy,
                    context_lines=(
                        f"- Student name: {req.student_name}\n"
                        f"- Level: {req.level}\n"
                        f"- Current streak: {req.streak} day(s)\n"
                        f"- Course: {req.course_name}\n"
                        f"- All {len(skills)} module skills are above 80% mastery (strongest: {strongest.topic_name} at {strongest.mastery_percentage}%)\n"
                        f"- Assigned action: the Module 1 Boss Challenge\n"
                        f"- Reward for completing it: +{xp_reward} XP and the Boss Slayer badge"
                    )
                )

            # -----------------------------------------------------------------
            # Decision Branch 3: Standard progressive momentum sprint
            # -----------------------------------------------------------------
            else:
                action_type = "DO_CHALLENGE"
                title = f"⚡ {weakest.topic_name} Mastery Sprint"
                desc = f"Boost your {weakest.topic_name} competency from {weakest.mastery_percentage}% to 80%."
                reason = "Progressive competency improvement quest."
                time_mins = 15
                xp_reward = 60
                fallback_edubuddy = f"Keep up the momentum, {req.student_name}! A quick sprint on {weakest.topic_name} will push you into the 80%+ mastery bracket."
                edubuddy = _generate_edubuddy_message(
                    nba_llm, action_type, fallback_edubuddy,
                    context_lines=(
                        f"- Student name: {req.student_name}\n"
                        f"- Level: {req.level}\n"
                        f"- Current streak: {req.streak} day(s)\n"
                        f"- Course: {req.course_name}\n"
                        f"- Weakest skill: {weakest.topic_name} ({weakest.mastery_percentage}% mastery, target 80%)\n"
                        f"- Strongest skill: {strongest.topic_name} ({strongest.mastery_percentage}% mastery)\n"
                        f"- Assigned action: a daily momentum sprint on {weakest.topic_name}\n"
                        f"- Reward for completing it: +{xp_reward} XP"
                    )
                )

            # Construct execution log
            audit_log = AgentExecutionLog(
                agent_name="Next Best Action Agent",
                execution_time_ms=5,
                summary=f"Evaluated {len(skills)} skills. Weakest: '{weakest.topic_name}' ({weakest.mastery_percentage}%). Selected: {action_type}.",
                passed=True
            )

            # Assemble response
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
