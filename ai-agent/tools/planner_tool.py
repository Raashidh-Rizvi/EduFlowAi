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
        return generate_json(self.rag,
            f'Create a beginner-friendly study plan for {scope!r}. '
            'Choose a reasonable number of sessions based on the supplied content. '
            'For a selected topic, include ONLY that topic and necessary prerequisites present in its slides. '
            'Use simple English and concrete reading, recall and practice tasks tied to slide numbers. '
            'Do not assign videos, links or content absent from the lecture. Return a JSON object '
            '{"title": string, "sessions": [{"session_number": integer, "title": string, '
            '"tasks": [string], "estimated_minutes": integer}]}.',
            lecture_context(chunks), validate)
