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
        prompt = (
            f"Explain {query!r} in clear, beginner-friendly English with rich depth and practical understanding.\n\n"
            "Format the response using this clean, structured layout:\n"
            "Simple Definition -\n"
            "[Provide a clear, intuitive definition of the concept in 2-3 sentences]\n\n"
            "Real-World Example -\n"
            "[Provide a concrete, practical real-world analogy or scenario grounded in the lecture material]\n\n"
            "Key Breakdown -\n"
            "• [First core mechanism or principle, citing slide numbers like (Slide X)]\n"
            "• [Second core mechanism or principle, citing slide numbers like (Slide Y)]\n"
            "• [Third key insight or distinction, if covered in the slides]\n\n"
            "Key Takeaway -\n"
            "[One essential summary point to remember for exams]\n\n"
            "GUIDELINES:\n"
            "1. Ground all facts strictly in the provided course excerpts.\n"
            "2. Cite exact slide numbers throughout the explanation.\n"
            "3. If the excerpts do not contain enough information, state that clearly."
        )
        answer = generate(self.rag, prompt,
            lecture_context(chunks), max_tokens=2048, conversation_history=conversation_history)
        citations = [SlideCitation(
            page_number=c["metadata"]["page_number"], source_file=request.source_file,
            preview_text=c["text"].replace("\n", " ")[:160],
            relevance_score=c.get("relevance_score", 1.0),
        ) for c in chunks]
        return answer, citations
