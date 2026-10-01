"""
Semantic Intent Router: Meaning-based intent matching for student chat queries.
Understands the underlying pedagogical goal (Plan, Breakdown, Explain, or QA)
regardless of user phrasing, slang, or negations.
"""
import logging
from typing import Optional, Tuple
from tools.learning_support import generate_json

logger = logging.getLogger(__name__)


class IntentRouter:
    def __init__(self, rag):
        self.rag = rag

    def classify(self, message: str) -> Tuple[str, Optional[str]]:
        """
        Classifies user message into ('plan', 'breakdown', 'explain', 'qa')
        and extracts an optional target concept/topic.
        Falls back safely to ('qa', None) on any failure or simple query.
        """
        clean_msg = (message or "").strip()
        if len(clean_msg) < 4:
            return "qa", None

        prompt = (
            "You are a semantic intent classifier for an educational AI tutor. "
            "Analyze the student's message and determine their primary pedagogical intent:\n"
            "1. 'plan': Student asks for a study plan, timetable, schedule, roadmap, pacing, or exam preparation strategy.\n"
            "2. 'breakdown': Student asks for a syllabus breakdown, outline, table of contents, chapters, or bird's-eye view of the lecture.\n"
            "3. 'explain': Student explicitly requests a deep, beginner-friendly conceptual explanation, breakdown, or analogy for a specific concept.\n"
            "4. 'qa': Student asks a direct factual question, checks slide details, or has normal conversation.\n\n"
            f"STUDENT MESSAGE: {clean_msg!r}\n\n"
            'Return valid JSON only: {"intent": "plan" | "breakdown" | "explain" | "qa", "topic": string | null}'
        )

        def validate(data):
            if not isinstance(data, dict):
                raise ValueError("Expected dictionary")
            intent = str(data.get("intent", "qa")).lower().strip()
            if intent not in {"plan", "breakdown", "explain", "qa"}:
                intent = "qa"
            topic = data.get("topic")
            if topic and not isinstance(topic, str):
                topic = None
            if topic and isinstance(topic, str):
                cleaned_topic = topic.lower().strip()
                generic_terms = {
                    "example", "real world example", "realworld example", "real-world example",
                    "one more example", "more examples", "another example", "give", "give more",
                    "more", "it", "this", "that"
                }
                if cleaned_topic in generic_terms:
                    topic = None
            return intent, topic

        try:
            return generate_json(self.rag, prompt, "", validate)
        except Exception as e:
            logger.warning("Intent classification failed (%s), defaulting to qa.", e)
            return "qa", None
