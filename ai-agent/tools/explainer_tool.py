"""Explain a selected topic through the existing Chroma retrieval and LLM."""
from models.schemas import SlideCitation
from tools.learning_support import generate, lecture_context, LearningUnavailable


class ExplainerTool:
    def __init__(self, rag):
        self.rag = rag

    def run(self, request, section=None, conversation_history=None):
        topic = request.topic or (section.title if section else request.message)
        if not topic or not topic.strip():
            raise ValueError("Choose a topic or enter a question to explain.")
        query = f"{topic}. {request.message or ''}"
        chunks = self.rag.vector_store.search(
            query=query, source_file=request.source_file, course_id=request.course_id,
            sub_lecture_id=section.id if section else None, top_k=4,
        )
        # Defense in depth: never pass an out-of-scope retrieval result to the LLM.
        chunks = [c for c in chunks if c["metadata"].get("source_file") == request.source_file
                  and (not request.course_id or c["metadata"].get("course_id") == request.course_id)
                  and (not section or (c["metadata"].get("sub_lecture_id") == section.id
                       and section.page_start <= c["metadata"]["page_number"] <= section.page_end))]
        if not chunks:
            raise LearningUnavailable("No indexed content was found for this topic. Please regenerate the breakdown and retry.")
        answer = generate(self.rag,
            f"Explain {query!r} in simple beginner-friendly English in at most 200 words. "
            "Include a simple definition, one example if supported by the excerpts, and a key takeaway. "
            "Cite exact slide numbers. If the excerpts do not explain the requested topic, say so clearly.",
            lecture_context(chunks), max_tokens=900, conversation_history=conversation_history)
        citations = [SlideCitation(
            page_number=c["metadata"]["page_number"], source_file=request.source_file,
            preview_text=c["text"].replace("\n", " ")[:160],
            relevance_score=c.get("relevance_score", 1.0),
        ) for c in chunks]
        return answer, citations
