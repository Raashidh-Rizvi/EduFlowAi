"""Create a beginner study schedule from exactly the selected indexed content."""
from models.schemas import StudyPlan
from tools.learning_support import generate_json, lecture_context


class StudyPlannerTool:
    def __init__(self, rag):
        self.rag = rag

    def run(self, chunks, section=None, topic=None):
        scope = topic or (section.title if section else "the complete lecture")
        def validate(data):
            plan = StudyPlan.model_validate(data)
            for number, session in enumerate(plan.sessions, 1):
                if not session.title.strip() or any(not task.strip() for task in session.tasks):
                    raise ValueError("Empty study task")
                session.session_number = number
                session.sub_lecture_id = section.id if section else None
            return plan
        prompt = (
            f"Create a high-impact, beginner-friendly study plan for {scope!r}.\n\n"
            "INSTRUCTIONS:\n"
            "1. Choose a structured, logical sequence of study sessions (typically 2 to 4 sessions).\n"
            "2. For each session, formulate 2 to 4 concrete, actionable tasks.\n"
            "3. Anchor each task to a specific slide concept with clear objectives, e.g.:\n"
            "   'Review Slide 4: Understand the core definition and its 3 main components'\n"
            "   'Practice Example on Slide 7: Trace through the algorithm workflow step-by-step'\n"
            "4. Assign realistic estimated minutes (between 15 and 45 minutes per session).\n"
            "5. Base all tasks strictly on the supplied slides. Do not assign external links or videos.\n\n"
            'Return a JSON object: {"title": string, "sessions": [{"session_number": integer, "title": string, '
            '"tasks": [string], "estimated_minutes": integer}]}.'
        )
        return generate_json(self.rag, prompt, lecture_context(chunks), validate)
