"""Group indexed lecture content and persist reusable section metadata."""
import hashlib
import json
from threading import RLock

from models.schemas import LectureSection, SubLecture
from tools.learning_support import generate_json, lecture_context

# Serialize first-time section creation so concurrent requests reuse one breakdown.
_breakdown_lock = RLock()


class BreakdownTool:
    def __init__(self, rag):
        self.rag = rag

    def run(self, source_file, course_id=None):
        with _breakdown_lock:
            chunks = self.rag.vector_store.get_lecture_chunks(source_file, course_id)
            if not chunks:
                raise FileNotFoundError("This lecture is not indexed or has no readable content. Please select an indexed lecture.")
            fingerprint = hashlib.sha256(json.dumps([
                (c["id"], c["text"], c["metadata"]["page_number"]) for c in chunks
            ]).encode()).hexdigest()
            if all(c["metadata"].get("learning_fingerprint") == fingerprint and
                   c["metadata"].get("learning_section") for c in chunks):
                try:
                    cached = {c["metadata"]["sub_lecture_id"]:
                              SubLecture.model_validate_json(c["metadata"]["learning_section"])
                              for c in chunks}
                    return sorted(cached.values(), key=lambda s: s.page_start)
                except (ValueError, KeyError):
                    pass

            pages = {c["metadata"]["page_number"] for c in chunks}

            def validate(data):
                if not isinstance(data, list) or not data:
                    raise ValueError("Expected sections")
                sections = sorted([LectureSection.model_validate(s) for s in data], key=lambda s: s.page_start)
                last_end = 0
                for section in sections:
                    if (section.page_start not in pages or section.page_end not in pages or
                            section.page_start > section.page_end or section.page_start <= last_end or
                            not section.title.strip() or any(not t.strip() for t in section.topics)):
                        raise ValueError("Invalid slide ranges or empty topics")
                    last_end = section.page_end
                if any(sum(s.page_start <= p <= s.page_end for s in sections) != 1 for p in pages):
                    raise ValueError("Every indexed slide must belong to exactly one section")
                return sections

            sections = generate_json(self.rag,
                'Group ALL supplied slides into logical topic sections for a beginner. '
                'Return a JSON array of {"title": string, "page_start": integer, '
                '"page_end": integer, "topics": [string]}. Use actual slide numbers. '
                'Ranges must not overlap and must cover every supplied slide. '
                'Each title and subtopic must be supported by that section\'s slides.',
                lecture_context(chunks), validate)
            result = [SubLecture(
                **s.model_dump(), source_file=source_file,
                id=f"{fingerprint[:16]}-slides-{s.page_start}-{s.page_end}"
            ) for s in sections]
            self.rag.vector_store.save_lecture_sections(chunks, result, fingerprint)
            return result
