"""
EduFlow AI - Clean RAG Data Models & Schemas
============================================
Lightweight, simple Pydantic models for document indexing,
hybrid retrieval-augmented generation (RAG), and slide assessments.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# 1. RAG Indexing Schemas
# -----------------------------------------------------------------------------

class IndexPdfRequest(BaseModel):
    file_path: str = Field(..., description="Absolute path on disk to the uploaded PDF/PPTX file")
    course_id: str = Field(..., description="Course ID or GUID to scope the vector chunks")
    module_id: Optional[str] = Field(None, description="Module ID or GUID for the course section")


class IndexPdfResponse(BaseModel):
    status: str = "success"
    file_name: str
    pages_parsed: int
    chunks_indexed: int
    course_id: str
    module_id: Optional[str] = None
    message: str


# -----------------------------------------------------------------------------
# 2. RAG Student Chat & Q&A Schemas
# -----------------------------------------------------------------------------

class SlideCitation(BaseModel):
    page_number: int
    source_file: str
    preview_text: str
    relevance_score: float = 1.0


class RagChatRequest(BaseModel):
    question: str = Field(..., description="Student query or question regarding the course slides")
    course_id: Optional[str] = Field(None, description="Optional Course ID to restrict retrieval")
    module_id: Optional[str] = Field(None, description="Optional Module ID to restrict retrieval")
    max_citations: int = Field(3, description="Maximum number of slide citations to return")


class RagChatResponse(BaseModel):
    answer: str
    citations: List[SlideCitation] = []
    source: str = "rag"
    confidence_score: float = 0.95


# -----------------------------------------------------------------------------
# 3. Slide Topic Categorization & Quiz Generation Schemas
# -----------------------------------------------------------------------------

class SlideTopicItem(BaseModel):
    id: str
    title: str
    summary: str
    slide_range: str
    key_concepts: List[str] = []


class CategorizeTopicsRequest(BaseModel):
    slide_path: str
    max_topics: int = 6


class CategorizeTopicsResponse(BaseModel):
    slide_name: str
    total_slides: int
    topics: List[SlideTopicItem]
    source: str = "rag"


class QuizQuestionItem(BaseModel):
    question_id: int
    question_text: str
    blooms_taxonomy_level: str = "Understanding"
    options: List[str]
    correct_index: int
    explanation: str
    slide_citation: Optional[str] = None
    points: int = 10


class GenerateSlideQuizRequest(BaseModel):
    slide_path: Optional[str] = None
    module_id: Optional[str] = None
    module_title: Optional[str] = "Course Module"
    target_topics: List[str] = []
    num_questions: int = 5
    difficulty: str = "Medium"


class GenerateSlideQuizResponse(BaseModel):
    quiz_id: str
    workflow_id: str
    title: str
    target_topics: List[str]
    difficulty: str
    total_points: int
    validation_passed: bool = True
    status: str = "Ready"
    source: str = "rag"
    questions: List[QuizQuestionItem]
