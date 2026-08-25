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
# Import logging so LLM failures degrade gracefully (log + deterministic fallback) instead of crashing
import logging
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

# Import LangChain prompt/parser primitives (mirrors agents/quiz_generator.py's existing pattern)
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
# Import the shared Groq LLM helper -- single choke point for ChatGroq construction plus
# consistent retry/error-classification behavior (core/llm.py)
from core.llm import get_groq_llm, invoke_structured
from core.errors import AIError

# Module-level logger for graceful-degradation warnings when a Groq call fails
logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Prompt: personalized study-schedule DESCRIPTIVE TEXT only.
# The day/activity-type progression, time budgets, and XP rewards are fixed
# platform/game-design rules applied deterministically in code below -- this
# prompt is only ever used to generate activity_title/description strings.
# -----------------------------------------------------------------------------
STUDY_SCHEDULE_PROMPT = PromptTemplate(
    template="""You are an expert instructional designer building a personalized study cycle.

Student's learning goal: {target_goal}
Diagnosed weak areas (priority order): {weak_areas}
Primary focus topic for this cycle: {primary_topic}
Secondary focus topic for this cycle: {secondary_topic}
Recommended pedagogical focus: {recommended_focus}
Current mastery level: {mastery_level}
Current progress through prerequisites: {current_progress_pct}%

Write grounded, specific descriptive text for EXACTLY 4 study activities, in this fixed order:
1. A Lesson (conceptual deep-dive) on the primary focus topic.
2. A Lab (hands-on coding/implementation practice) on the primary focus topic.
3. A Quiz (timed knowledge-check assessment) on the secondary focus topic.
4. A Boss Battle (integrated synthesis challenge) combining both topics.

For each activity write:
- "activity_title": a concise, specific title (max ~12 words), referencing real concepts relevant to the goal above -- no generic filler.
- "description": 1-2 sentences describing exactly what the student will do and why it matters for {target_goal}.

Output ONLY a JSON array of exactly 4 objects, in the order above, each with keys "activity_title" and "description". No markdown fences, no commentary, no extra keys.

JSON Array:""",
    input_variables=[
        "target_goal", "weak_areas", "primary_topic", "secondary_topic",
        "recommended_focus", "mastery_level", "current_progress_pct"
    ]
)

# -----------------------------------------------------------------------------
# Prompt: single adaptive-challenge question, grounded in the weak topic and
# target difficulty. Reward numbers (xp/coins/time/points) are attached
# afterward from the deterministic difficulty_matrix -- never by the LLM.
# -----------------------------------------------------------------------------
CHALLENGE_QUESTION_PROMPT = PromptTemplate(
    template="""You are an expert technical assessment author creating one adaptive micro-challenge question.

Target weak topic: {weak_topic}
Target difficulty: {difficulty}

Write ONE multiple-choice question that tests real, specific understanding of {weak_topic} calibrated to {difficulty} difficulty. Avoid generic or unrelated trivia -- ground it strictly in {weak_topic}.

Output ONLY a JSON object with these exact keys:
- "question_text": string, the question prompt
- "options": array of exactly 4 strings (one correct answer plus 3 plausible distractors)
- "correct_index": integer 0-3, zero-based index of the correct option within "options"
- "explanation": string, pedagogical rationale for why the correct answer is right

No markdown fences, no commentary, no extra keys.

JSON Object:""",
    input_variables=["weak_topic", "difficulty"]
)


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

            # -----------------------------------------------------------------
            # Deterministic structure: the Lesson -> Lab -> Quiz -> Boss Battle
            # progression, day placement, time budgets, and XP rewards are
            # fixed platform/game-design rules (the gamification economy) --
            # NOT something an LLM should invent. Only the descriptive text
            # (activity_title/description) attached below is LLM-generated.
            # -----------------------------------------------------------------
            activity_plan = [
                {"day_number": 1, "activity_type": "Lesson", "estimated_minutes": 60, "xp_reward": 40},
                {"day_number": 3, "activity_type": "Lab", "estimated_minutes": 90, "xp_reward": 60},
                {"day_number": 5, "activity_type": "Quiz", "estimated_minutes": 45, "xp_reward": 50},
                {"day_number": 7, "activity_type": "Boss", "estimated_minutes": 60, "xp_reward": 150},
            ]

            # Deterministic fallback text (identical to the original fixed
            # template) -- used only if the Groq call fails or returns a
            # malformed/short payload, so this path is always crash-proof.
            fallback_text = [
                (f"Lesson: Deep-Dive into {primary_topic}",
                 f"Theoretical foundations, trade-offs, and architectural considerations for {primary_topic}."),
                (f"Lab: Hands-on Implementation of {primary_topic}",
                 f"Interactive coding laboratory building test cases and verification rules for {primary_topic}."),
                (f"Quiz: Knowledge Check on {secondary_topic}",
                 f"Timed diagnostic assessment evaluating edge cases and design patterns in {secondary_topic}."),
                ("Boss Battle: Integrated Synthesis & Error Recovery Challenge",
                 f"Comprehensive simulated outage scenario combining {primary_topic} and {secondary_topic}."),
            ]

            # -----------------------------------------------------------------
            # Real, grounded text generation via Groq -- replaces the fixed
            # template text with a personalized day-by-day narrative built
            # from the actual diagnosed inputs (goal, weak areas, recommended
            # focus, mastery level, progress). Degrades gracefully to the
            # deterministic fallback_text above on any failure.
            # -----------------------------------------------------------------
            generated_text = None
            try:
                llm = get_groq_llm(temperature=0.4)
                chain = STUDY_SCHEDULE_PROMPT | llm | JsonOutputParser()
                result = invoke_structured(chain, {
                    "target_goal": target_goal,
                    "weak_areas": ", ".join(gap_analysis.weak_areas) if gap_analysis.weak_areas else primary_topic,
                    "primary_topic": primary_topic,
                    "secondary_topic": secondary_topic,
                    "recommended_focus": gap_analysis.recommended_focus,
                    "mastery_level": gap_analysis.mastery_level,
                    "current_progress_pct": gap_analysis.current_progress_pct
                })
                if isinstance(result, list) and len(result) >= 4:
                    generated_text = result
                else:
                    logger.warning(
                        "Groq study-schedule response was not a 4-item JSON array (got %r) -- using deterministic fallback text.",
                        type(result).__name__
                    )
            except AIError as e:
                logger.warning("Groq study-schedule generation failed, using deterministic fallback text: %s", e.message)
            except Exception as e:
                logger.warning("Unexpected error during Groq study-schedule generation, using deterministic fallback text: %s", e)

            # Assemble activities: deterministic numbers + structure from
            # activity_plan, descriptive text from Groq (or fallback_text).
            schedule = []
            for i, spec in enumerate(activity_plan):
                fb_title, fb_description = fallback_text[i]
                title, description = fb_title, fb_description

                if generated_text is not None and i < len(generated_text):
                    item = generated_text[i]
                    if isinstance(item, dict):
                        title = str(item.get("activity_title") or fb_title).strip() or fb_title
                        description = str(item.get("description") or fb_description).strip() or fb_description

                schedule.append(StudyPlanActivity(
                    day_number=spec["day_number"],
                    activity_title=title,
                    description=description,
                    activity_type=spec["activity_type"],
                    estimated_minutes=spec["estimated_minutes"],
                    xp_reward=spec["xp_reward"]
                ))

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

            # Call tool registry create_challenge_draft (Controlled Tool
            # Execution responsibility / audit trail). NOTE: as implemented in
            # tools/registry.py, this draft's "questions" are a single canned
            # template item (fixed "EXPLAIN ANALYZE / Seq Scan" scenario with
            # only weak_topic string-interpolated into it) and are NEVER
            # empty -- so gating Groq generation on "draft returned nothing"
            # would make the grounded path unreachable dead code. Groq
            # generation is therefore the PRIMARY source of question TEXT
            # below; the tool draft's questions (still genuinely tied to the
            # verified registry) and the static question after that serve as
            # sequential deterministic fallbacks so this path is always
            # crash-proof even if Groq is unavailable.
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
            tool_draft_questions_raw = draft_res.get("questions", [])

            # Primary path: real, grounded question generation via Groq.
            # Reward numbers (config["xp"/"coins"/"time"]) come from the
            # deterministic difficulty_matrix above, unchanged -- only the
            # question TEXT below is LLM-generated, and "points" stays a
            # fixed deterministic value (10) regardless of source.
            generated_question = None
            try:
                llm = get_groq_llm(temperature=0.4)
                chain = CHALLENGE_QUESTION_PROMPT | llm | JsonOutputParser()
                result = invoke_structured(chain, {
                    "weak_topic": req.weak_topic,
                    "difficulty": req.target_difficulty
                })
                if (
                    isinstance(result, dict)
                    and isinstance(result.get("question_text"), str) and result.get("question_text").strip()
                    and isinstance(result.get("options"), list) and len(result["options"]) >= 2
                    and isinstance(result.get("correct_index"), int)
                    and 0 <= result["correct_index"] < len(result["options"])
                ):
                    generated_question = result
                else:
                    logger.warning(
                        "Groq adaptive-challenge response had an unexpected shape (%r) -- using deterministic fallback question.",
                        result
                    )
            except AIError as e:
                logger.warning("Groq adaptive-challenge question generation failed, using deterministic fallback question: %s", e.message)
            except Exception as e:
                logger.warning("Unexpected error during Groq adaptive-challenge question generation, using deterministic fallback question: %s", e)

            if generated_question:
                questions = [
                    ChallengeQuestionItem(
                        question_text=generated_question["question_text"],
                        options=generated_question["options"],
                        correct_index=generated_question["correct_index"],
                        explanation=(generated_question.get("explanation") or "").strip()
                            or f"Review the core principles of {req.weak_topic} to see why this option is correct.",
                        points=10
                    )
                ]
            elif tool_draft_questions_raw:
                # Fallback #1: the tool registry's draft questions.
                questions = [
                    ChallengeQuestionItem(
                        question_text=q["question_text"],
                        options=q["options"],
                        correct_index=q["correct_index"],
                        explanation=q["explanation"],
                        points=q.get("points", 10)
                    )
                    for q in tool_draft_questions_raw
                ]
            else:
                # Fallback #2 (last resort): static deterministic question if
                # both Groq and the tool registry draft are unavailable --
                # keeps this path crash-proof.
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
