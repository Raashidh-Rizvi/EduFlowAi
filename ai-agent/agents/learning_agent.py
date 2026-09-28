"""Single orchestration point for Learning Agent operations (no quiz workflow)."""
from models.schemas import LearningRequest, LearningResponse
from tools.breakdown_tool import BreakdownTool
from tools.planner_tool import StudyPlannerTool
from tools.explainer_tool import ExplainerTool
from agents.short_term_memory import ShortTermMemory


class LearningAgent:
    def __init__(self, rag_service):
        self.rag = rag_service
        self.breakdown = BreakdownTool(rag_service)
        self.planner = StudyPlannerTool(rag_service)
        self.explainer = ExplainerTool(rag_service)
        self.memory = ShortTermMemory()

    def chat(self, question, student_id=None, session_id=None, course_id=None,
             source_file=None, module_id=None, max_citations=3):
        key = self.memory.key(student_id, session_id, course_id, source_file, module_id)
        result = self.rag.chat(
            question=question, course_id=None if source_file else course_id,
            source_file=source_file, module_id=module_id, max_citations=max_citations,
            conversation_history=self.memory.history(key),
        )
        # Errors and offline/no-content fallbacks are not completed AI turns.
        if result.source not in {"rag_fallback", "extractive_rag"}:
            self.memory.complete(key, question, result.answer)
        return result

    def learn(self, request: LearningRequest) -> LearningResponse:
        response = LearningResponse(request_type=request.request_type, source_file=request.source_file)
        if request.request_type == "breakdown":
            response.sub_lectures = self.breakdown.run(request.source_file, request.course_id)
            return response

        chunks = self.rag.vector_store.get_lecture_chunks(request.source_file, request.course_id)
        if not chunks:
            raise FileNotFoundError("This lecture is not indexed or has no readable content. Please select an indexed lecture.")
        section = None
        if request.sub_lecture_id or request.topic:
            sections = self.breakdown.run(request.source_file, request.course_id)
            matches = [s for s in sections if (
                s.id == request.sub_lecture_id if request.sub_lecture_id else
                request.topic in [s.title, *s.topics]
            )]
            if len(matches) != 1:
                raise ValueError("The selected topic is no longer available in this lecture. Regenerate the breakdown.")
            section = matches[0]
            if request.topic and request.topic not in [section.title, *section.topics]:
                raise ValueError("The selected topic does not belong to this lecture section.")
            chunks = [c for c in chunks if section.page_start <= c["metadata"]["page_number"] <= section.page_end]

        if request.request_type == "plan":
            response.plan = self.planner.run(chunks, section, request.topic)
        elif request.request_type == "explain":
            key = self.memory.key(request.student_id, request.session_id, request.course_id, request.source_file)
            response.answer, response.citations = self.explainer.run(request, section, self.memory.history(key))
            question = request.message or f"Explain {request.topic or section.title}"
            self.memory.complete(key, question, response.answer)
        else:
            raise ValueError("Unsupported learning request type.")
        return response
