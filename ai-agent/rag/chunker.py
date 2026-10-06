"""
===============================================================================
EduFlow AI - Slide & Document Chunker (chunker.py)
===============================================================================
WHAT THIS FILE DOES:
1. Takes the parsed pages from parser.py.
2. Cuts large documents into manageable ~500-token chunks (approx. 1,800 characters).
3. Adds a 50-token (approx. 180 characters) sliding overlap so context is never cut in half.
4. Strictly attaches metadata (page number, course ID, file name) to EVERY chunk.
   This guarantees the AI knows exactly which slide each piece of information came from!
===============================================================================
"""

from typing import List, Dict, Any
from rag.parser import ParsedPage


class DocumentChunk:
    """
    Represents an individual chunk of text ready to be embedded into ChromaDB.
    
    Attributes:
        text (str): The chunk's text (prefixed with [Slide X: Title]).
        page_number (int): Original slide/page number (e.g. Slide 4).
        title (str): Slide title heading.
        source_file (str): The PDF filename (e.g. IT3012_Lecture_04.pdf).
        course_id (str): The course identifier to scope searches.
        module_id (str): The specific module/week section.
        chunk_index (int): Sequential index (0, 1, 2...).
    """
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
        """
        Converts properties into a metadata dictionary stored inside ChromaDB.
        Used for filtering and citation generation.
        """
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
    Chunks slide pages using an intelligent slide-boundary preservation strategy:
    - If a slide is short: Keeps the whole slide as 1 chunk.
    - If a slide is long: Uses a sliding window with overlap.
    """

    def __init__(self, chunk_size_chars: int = 1800, chunk_overlap_chars: int = 180):
        # 1800 characters ~= 500 tokens (Standard optimal size for semantic search)
        self.chunk_size = chunk_size_chars
        # 180 characters ~= 50 tokens (Ensures sentences at chunk boundaries are not lost)
        self.chunk_overlap = chunk_overlap_chars

    def chunk_pages(
        self,
        pages: List[ParsedPage],
        source_file: str,
        course_id: str,
        module_id: str = ""
    ) -> List[DocumentChunk]:
        """
        STEP-BY-STEP CHUNKING PROCESS:
        
        Args:
            pages: List of ParsedPage objects from parser.py
            source_file: Name of the PDF file
            course_id: Enrolled course ID
            module_id: Module ID
            
        Returns:
            List[DocumentChunk]: List of chunks ready for ChromaDB
        """
        chunks: List[DocumentChunk] = []
        global_chunk_idx = 0

        # Step 1: Process every page/slide one by one
        for page in pages:
            text = page.text.strip()
            # Skip empty slides
            if not text:
                continue

            # -------------------------------------------------------------
            # CASE A: Normal Slide (Length <= 1,800 characters)
            # Most lecture slides fit in this category. We keep the whole
            # slide intact as 1 complete chunk so context is 100% preserved.
            # -------------------------------------------------------------
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

            # -------------------------------------------------------------
            # CASE B: Large Slide / Dense Document (Length > 1,800 characters)
            # When a page has massive text, we slide a window of 1,800 chars
            # with 180 chars overlap across the text.
            # -------------------------------------------------------------
            else:
                start = 0
                part = 1
                while start < len(text):
                    end = start + self.chunk_size
                    chunk_text = text[start:end]

                    chunks.append(DocumentChunk(
                        text=f"[Slide {page.page_number}: {page.title} (Part {part})]\n{chunk_text}",
                        page_number=page.page_number,
                        title=page.title,
                        source_file=source_file,
                        course_id=course_id,
                        module_id=module_id,
                        chunk_index=global_chunk_idx
                    ))
                    global_chunk_idx += 1
                    part += 1

                    # Stop if we reached the end of the text
                    if end >= len(text):
                        break

                    # Slide forward by (chunk_size - overlap)
                    start += (self.chunk_size - self.chunk_overlap)

        return chunks
