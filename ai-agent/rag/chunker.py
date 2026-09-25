"""
EduFlow AI - Slide & Document Chunker
=====================================
Splits parsed course pages into optimal chunks (~500 tokens / 1800 chars)
with 50-token (180 chars) sliding overlap while strictly preserving page/slide boundaries.
"""

from typing import List, Dict, Any
from rag.parser import ParsedPage


class DocumentChunk:
    def __init__(
        self,
        text: str,
        page_number: int,
        title: str,
        source_file: str,
        course_id: str,
        module_id: str = "",
        chunk_index: int = 0
    ):
        self.text = text
        self.page_number = page_number
        self.title = title
        self.source_file = source_file
        self.course_id = course_id
        self.module_id = module_id
        self.chunk_index = chunk_index

    def to_metadata(self) -> Dict[str, Any]:
        return {
            "page_number": self.page_number,
            "title": self.title,
            "source_file": self.source_file,
            "course_id": self.course_id,
            "module_id": self.module_id or "",
            "chunk_index": self.chunk_index
        }


class SlideChunker:
    """
    Chunks course slides while retaining slide-level and paragraph context.
    """

    def __init__(self, chunk_size_chars: int = 1800, chunk_overlap_chars: int = 180):
        self.chunk_size = chunk_size_chars
        self.chunk_overlap = chunk_overlap_chars

    def chunk_pages(
        self,
        pages: List[ParsedPage],
        source_file: str,
        course_id: str,
        module_id: str = ""
    ) -> List[DocumentChunk]:
        chunks: List[DocumentChunk] = []
        global_chunk_idx = 0

        for page in pages:
            text = page.text.strip()
            if not text:
                continue

            # Case A: Slide text fits comfortably in a single chunk
            if len(text) <= self.chunk_size:
                chunks.append(DocumentChunk(
                    text=f"[Slide {page.page_number}: {page.title}]\n{text}",
                    page_number=page.page_number,
                    title=page.title,
                    source_file=source_file,
                    course_id=course_id,
                    module_id=module_id,
                    chunk_index=global_chunk_idx
                ))
                global_chunk_idx += 1
            else:
                # Case B: Large slide or multi-paragraph page needs sliding window
                start = 0
                while start < len(text):
                    end = start + self.chunk_size
                    chunk_text = text[start:end]

                    chunks.append(DocumentChunk(
                        text=f"[Slide {page.page_number}: {page.title} (Part {start // (self.chunk_size - self.chunk_overlap) + 1})]\n{chunk_text}",
                        page_number=page.page_number,
                        title=page.title,
                        source_file=source_file,
                        course_id=course_id,
                        module_id=module_id,
                        chunk_index=global_chunk_idx
                    ))
                    global_chunk_idx += 1

                    if end >= len(text):
                        break
                    start += (self.chunk_size - self.chunk_overlap)

        return chunks
