"""
===============================================================================
EduFlow AI - Data Models & API Contracts (models/schemas.py)
===============================================================================
WHAT THIS FILE DOES:
This file is the "Rulebook" and "Blueprint" for our entire AI microservice.
It uses Pydantic (BaseModel) to define:
1. Incoming Data Rules (Requests): What fields MUST be sent by .NET or React.
2. Outgoing Data Rules (Responses): The exact structure of data sent back.
3. Automatic Type Safety: Stops invalid data from crashing our server.
4. Auto-Documentation: Generates the interactive docs at http://localhost:8888/docs.

SECTIONS IN THIS FILE:
- SECTION 1: Document Indexing (When an instructor uploads lecture slides)
- SECTION 2: Student Chat & Slide Citations (When a student asks questions)
- SECTION 3: Slide Assessments (Topic discovery and quiz question generation)
===============================================================================
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


# =============================================================================
# SECTION 1: DOCUMENT INDEXING SCHEMAS
# =============================================================================

class IndexPdfRequest(BaseModel):
    """
    INCOMING FORM: Used when the .NET backend asks Python to index a PDF/PPTX.
    
    Fields:
        file_path (str): The physical location of the file on disk.
                         Example: 'C:/.../wwwroot/uploads/pdfs/lecture4.pdf'
                         The '...' means this field is 100% REQUIRED.
                         
        course_id (str): The unique ID of the course this PDF belongs to.
                         Example: 'course-it3012'
                         Ensures chunks are scoped only to this course.
                         
        module_id (Optional[str]): The optional section or week ID.
                                   Example: 'mod-week-4'
    """
    file_path: str = Field(..., description="Absolute path on disk to the uploaded PDF/PPTX file")
    course_id: str = Field(..., description="Course ID or GUID to scope the vector chunks")
    module_id: Optional[str] = Field(None, description="Optional Module ID or GUID for the course section")


class IndexPdfResponse(BaseModel):
    """
    OUTGOING RECEIPT: Sent back to .NET after the PDF has been successfully indexed.
    
    Fields:
        status (str): "success" or "warning".
        file_name (str): Name of the file (e.g. 'IT3012_Lecture_04.pdf').
        pages_parsed (int): Total number of slides read by pypdf.
        chunks_indexed (int): Number of 500-token vectors saved in ChromaDB.
        course_id (str): Echoes back the course ID.
        module_id (Optional[str]): Echoes back the module ID.
        message (str): Human-readable confirmation message for UI display.
    """
    status: str = "success"
    file_name: str
    pages_parsed: int
    chunks_indexed: int
    course_id: str
    module_id: Optional[str] = None
    message: str


# =============================================================================
# SECTION 2: STUDENT CHAT & SLIDE CITATIONS SCHEMAS
# =============================================================================

class SlideCitation(BaseModel):
    """
    VERIFIABLE PROOF: Represents a single slide citation attached to an AI answer.
    
    Fields:
        page_number (int): The exact slide number where the answer was found.
                           Example: 4 (meaning Slide 4).
                           
        source_file (str): The name of the lecture slide deck.
                           Example: 'IT3012_Lecture_04.pdf'.
                           
        preview_text (str): Short 150-character excerpt from the slide.
                            Allows students to verify the source text immediately.
                            
        relevance_score (float): How closely this slide matches the question.
                                 Example: 0.95 (95% semantic match).
    """
    page_number: int
    source_file: str
    preview_text: str
    relevance_score: float = 1.0


class RagChatRequest(BaseModel):
    """
    INCOMING FORM: Used when a student types a question in the chat portal.
    
    Fields:
        question (str): The student's question text.
                        Example: 'What is B-Tree index optimization?'
                        
        course_id (Optional[str]): The course the student is currently viewing.
                                   Restricts search so students only see their own course slides.
                                   
        module_id (Optional[str]): Optional filter to limit search to a single week/module.
        
        max_citations (int): Maximum number of slide citations to return.
                             Default is 3.
    """
    question: str = Field(..., description="Student query or question regarding the course slides")
    student_id: Optional[str] = None
    session_id: Optional[str] = Field(None, min_length=1, max_length=128)
    course_id: Optional[str] = Field(None, description="Optional Course ID to restrict retrieval")
    module_id: Optional[str] = Field(None, description="Optional Module ID to restrict retrieval")
    source_file: Optional[str] = Field(None, description="Optional PDF filename to restrict search to a specific lecture slide deck")
    max_citations: int = Field(3, description="Maximum number of slide citations to return")


class RagChatResponse(BaseModel):
    """
    OUTGOING RECEIPT: The final answer delivered to the student's screen.
    
    Fields:
        answer (str): The AI-generated explanation grounded in lecture slides.
                      Example: 'According to Slide 4, B-Tree indexes speed up lookups...'
                      
        citations (List[SlideCitation]): List of clickable slide reference badges.
        
        source (str): Identifies the engine used:
                      - 'gemini_rag'   (Generated by Google Gemini 1.5 Flash)
                      - 'groq_rag'     (Generated by Groq Llama 3.3 70B)
                      - 'extractive_rag' (Offline extractive fallback)
                      
        confidence_score (float): Confidence level of the retrieved answer (0.0 to 1.0).
    """
    answer: str
    citations: List[SlideCitation] = []
    source: str = "rag"
    confidence_score: float = 0.95


class CoachChatRequest(BaseModel):
    """
    INCOMING REQUEST from .NET Backend or Frontend Student Coach:
    Matches payload: { "student_id": "...", "course_id": "...", "message": "...", "source_file": "..." }
    """
    student_id: Optional[str] = Field(None, description="Optional Student GUID")
    session_id: Optional[str] = Field(None, min_length=1, max_length=128)
    course_id: Optional[str] = Field(None, description="Optional Course ID/code")
    message: str = Field(..., description="Student question or chat message")
    source_file: Optional[str] = Field(None, description="Optional PDF filename to lock search to a specific slide deck")


class CoachChatResponse(BaseModel):
    """
    OUTGOING RESPONSE for .NET Backend and Frontend Student Coach:
    Contains the RAG answer, suggested slide review action, and citations.
    """
    reply: str
    suggested_action: Optional[str] = None
    identified_weak_topic: Optional[str] = None
    citations: List[SlideCitation] = []
    confidence_score: float = 0.95
    source: str = "rag"


class SlideDeckItem(BaseModel):
    """Represents an indexed slide deck available in ChromaDB."""
    source_file: str
    course_id: Optional[str] = None
    module_id: Optional[str] = None
    total_chunks: int = 0
    display_title: str


class ListSlideDecksResponse(BaseModel):
    """List of available indexed lecture slide decks."""
    slide_decks: List[SlideDeckItem] = []


class LearningRequest(BaseModel):
    student_id: Optional[str] = None
    session_id: Optional[str] = Field(None, min_length=1, max_length=128)
    course_id: Optional[str] = None
    source_file: str = Field(..., min_length=1, pattern=r"\S")
    request_type: Literal["breakdown", "plan", "explain"]
    sub_lecture_id: Optional[str] = None
    topic: Optional[str] = None
    message: Optional[str] = None


class LectureSection(BaseModel):
    title: str = Field(..., min_length=1)
    page_start: int = Field(..., ge=1)
    page_end: int = Field(..., ge=1)
    topics: List[str] = Field(..., min_length=1)


class SubLecture(LectureSection):
    id: str
    source_file: str


class StudySession(BaseModel):
    session_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=1)
    tasks: List[str] = Field(..., min_length=1)
    estimated_minutes: int = Field(..., ge=1, le=480)
    sub_lecture_id: Optional[str] = None


class StudyPlan(BaseModel):
    title: str = Field(..., min_length=1)
    sessions: List[StudySession] = Field(..., min_length=1)


class LearningResponse(BaseModel):
    request_type: Literal["breakdown", "plan", "explain"]
    source_file: str
    sub_lectures: List[SubLecture] = Field(default_factory=list)
    plan: Optional[StudyPlan] = None
    answer: Optional[str] = None
    citations: List[SlideCitation] = Field(default_factory=list)
    source: str = "learning_agent"


# =============================================================================
# SECTION 3: SLIDE TOPIC CATEGORIZATION & QUIZ GENERATION SCHEMAS
# =============================================================================

class SlideTopicItem(BaseModel):
    """
    TOPIC ITEM: Represents a discovered syllabus topic extracted from the slides.
    
    Fields:
        id (str): Unique topic identifier (e.g. 'topic_1').
        title (str): Title of the topic (e.g. '1. Relational Modeling & Indexing').
        summary (str): Brief 1-2 sentence description of what this topic covers.
        slide_range (str): Page boundaries (e.g. 'Slides 1-5').
        key_concepts (List[str]): Keywords (e.g. ['B-Tree', 'Indexes', 'Execution Plans']).
    """
    id: str
    title: str
    summary: str
    slide_range: str
    key_concepts: List[str] = []


class CategorizeTopicsRequest(BaseModel):
    """
    INCOMING FORM: Request to discover topics from an uploaded slide deck.
    
    Fields:
        slide_path (str): Full disk path to the PDF/PPTX file.
        max_topics (int): Maximum number of topic bands to discover (default: 6).
    """
    slide_path: str
    max_topics: int = 6


class CategorizeTopicsResponse(BaseModel):
    """
    OUTGOING RECEIPT: List of discovered topics returned to the instructor.
    
    Fields:
        slide_name (str): Filename of the slides.
        total_slides (int): Total number of slides found in the deck.
        topics (List[SlideTopicItem]): Discovered topic bands with slide ranges.
        source (str): Processing source identifier ('rag').
    """
    slide_name: str
    total_slides: int
    topics: List[SlideTopicItem]
    source: str = "rag"


class QuizQuestionItem(BaseModel):
    """
    QUIZ QUESTION: A single AI-generated question, validated before it leaves the service.

    The .NET backend accepts both `correct_answer` (option text, preferred) and
    `correct_index` (0-based fallback), so both are populated for choice questions.

    Fields:
        question_id (int): Number of the question (1, 2, 3...).
        question_text (str): The actual question text grounded in course material.
        question_type (str): MULTIPLE_CHOICE | MULTIPLE_SELECT | TRUE_FALSE |
                             FILL_IN_THE_BLANK | SHORT_ANSWER | MATCHING.
        blooms_taxonomy_level (str): Academic level ('Remembering', 'Understanding',
                                     'Applying', 'Analyzing', 'Evaluating', 'Creating').
        options (List[str]): Answer options (empty for short-answer/fill-in questions).
        correct_answer (Optional[str]): Exact option text, or the accepted answer.
        correct_index (Optional[int]): Index of the correct answer for choice questions.
        explanation (str): Why the correct answer is right, citing the source material.
        marking_scheme (Optional[str]): How marks are awarded for this question.
        learning_objective (Optional[str]): Objective this question assesses.
        slide_citation (Optional[str]): Slide reference (e.g. 'Slide 4: Index Optimization').
        matching_pairs (Optional[List[Dict[str, str]]]): left/right pairs for MATCHING.
        points (int): Mark value (1-100, default 10).
    """
    question_id: int
    question_text: str
    question_type: str = "MULTIPLE_CHOICE"
    blooms_taxonomy_level: str = "Understanding"
    options: List[str] = []
    correct_answer: Optional[str] = None
    correct_index: Optional[int] = None
    explanation: str = ""
    marking_scheme: Optional[str] = None
    learning_objective: Optional[str] = None
    slide_citation: Optional[str] = None
    matching_pairs: Optional[List[Dict[str, str]]] = None
    points: int = 10


class GenerateSlideQuizRequest(BaseModel):
    """
    INCOMING FORM: Request from the .NET backend to generate a quiz draft.

    The .NET `GenerateAiQuiz` payload sends both snake_case duplicates of some
    fields (`question_count`/`num_questions`, `selected_topics`/`target_topics`,
    `slide_path`/`pdf_path`); all of them are bound here so instructor choices
    are never silently dropped.

    Fields:
        slide_path / pdf_path (Optional[str]): Disk path to the lecture slides.
        module_id (Optional[str]): Module GUID.
        module_title (Optional[str]): Title of the module.
        module_description (Optional[str]): Module description from the database.
        module_context (Optional[str]): Real course content (topic titles, content
            item text) sent by the .NET backend to ground generation without slides.
        course_id (Optional[str]): Course GUID.
        course_title (Optional[str]): Course title.
        topic_title (Optional[str]): The specific topic the instructor selected.
        scope_type / scope_level (Optional[str]): Module | Topic | ContentItem | Course.
        target_topics / selected_topics (List[str]): Instructor-selected topics.
        num_questions / question_count (int): Number of questions to generate.
        difficulty (str): 'Easy', 'Medium' or 'Hard'.
        question_types (List[str]): Allowed question formats the instructor picked.
        learning_objectives (List[str]): Objectives the quiz should assess.
        time_limit_minutes / pass_percentage: Config echo (informational).
        provider (Optional[str]): AI provider override for this request
            (gemini | groq | azure). Defaults to QUIZ_LLM_PROVIDER. Validated
            server-side against the provider registry; unknown/unconfigured
            providers fail with a stable AI_PROVIDER_NOT_CONFIGURED error.
        model (Optional[str]): Model/deployment override for this request.
            Must be on the server-side allowlist for the selected provider.
    """
    provider: Optional[str] = None
    model: Optional[str] = None
    slide_path: Optional[str] = None
    pdf_path: Optional[str] = None
    module_id: Optional[str] = None
    module_title: Optional[str] = "Course Module"
    module_description: Optional[str] = None
    module_context: Optional[str] = None
    course_id: Optional[str] = None
    course_title: Optional[str] = None
    topic_title: Optional[str] = None
    scope_type: Optional[str] = None
    scope_level: Optional[str] = None
    target_topics: List[str] = []
    selected_topics: Optional[List[str]] = None
    num_questions: int = 5
    question_count: Optional[int] = None
    difficulty: str = "Medium"
    question_types: Optional[List[str]] = None
    learning_objectives: List[str] = []
    time_limit_minutes: Optional[int] = None
    pass_percentage: Optional[int] = None

    def effective_question_count(self) -> int:
        """Instructor-requested question count, bounded to a sane range."""
        count = self.question_count if self.question_count and self.question_count > 0 else self.num_questions
        return max(1, min(count, 30))

    def effective_target_topics(self) -> List[str]:
        """Instructor-selected topics; 'All Topics' is a UI placeholder, not a topic."""
        raw = self.selected_topics if self.selected_topics is not None else self.target_topics
        return [t for t in (raw or []) if t and t.strip() and t.strip().lower() != "all topics"]

    def effective_slide_path(self) -> Optional[str]:
        return self.slide_path or self.pdf_path

    def effective_question_types(self) -> List[str]:
        """Allowed question formats; defaults to the three objective formats."""
        allowed = {"MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE",
                   "FILL_IN_THE_BLANK", "SHORT_ANSWER", "MATCHING"}
        requested = [t.strip().upper() for t in (self.question_types or []) if t and t.strip()]
        usable = [t for t in requested if t in allowed]
        return usable or ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE"]


class GenerateSlideQuizResponse(BaseModel):
    """
    OUTGOING RECEIPT: The generated assessment ready for student quizzes.
    
    Fields:
        quiz_id (str): Unique identifier for the quiz.
        workflow_id (str): Tracking ID for audits.
        title (str): Assessment title (e.g. 'Diagnostic Assessment: Architecture (Medium)').
        target_topics (List[str]): Topics covered in this quiz.
        difficulty (str): Difficulty level.
        total_points (int): Maximum score (e.g. 50 points).
        validation_passed (bool): Verification flag (True).
        status (str): Current status ('Ready').
        source (str): Source identifier ('rag').
        questions (List[QuizQuestionItem]): List of generated questions.
    """
    quiz_id: str
    workflow_id: str
    title: str
    target_topics: List[str]
    difficulty: str
    total_points: int
    validation_passed: bool = True
    status: str = "PendingInstructorApproval"
    source: str = "gemini"
    questions: List[QuizQuestionItem]


# -----------------------------------------------------------------------------
# SINGLE-QUESTION REGENERATION (instructor review step)
# -----------------------------------------------------------------------------

class SingleQuestionRegenerateRequest(BaseModel):
    """
    INCOMING FORM: .NET `POST /api/v1/ai/questions/{question_id}/regenerate`.

    Carries the instructor's intent plus optional grounding material resolved by
    the .NET backend (module description, content items, slide path) so the new
    question is grounded in the same course content as the original.
    """
    question_id: Optional[str] = None
    focus_topic: Optional[str] = None
    prompt_guidance: Optional[str] = None
    target_type: Optional[str] = None
    target_difficulty: Optional[str] = None
    learning_objective: Optional[str] = None
    source_content_id: Optional[str] = None
    course_id: Optional[str] = None
    course_title: Optional[str] = None
    module_title: Optional[str] = None
    module_context: Optional[str] = None
    slide_path: Optional[str] = None
    pdf_path: Optional[str] = None
    source_question_text: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None

    def effective_slide_path(self) -> Optional[str]:
        return self.slide_path or self.pdf_path


class RegeneratedQuestionItem(BaseModel):
    """A single replacement question. Mirrors the fields the .NET parser reads."""
    question_id: Optional[str] = None
    question_text: str
    question_type: str = "MULTIPLE_CHOICE"
    blooms_taxonomy_level: str = "Applying"
    options: List[str] = []
    correct_answer: str
    explanation: str = ""
    distractor_rationales: List[str] = []
    marking_scheme: Optional[str] = None
    learning_objective: Optional[str] = None
    slide_citation: Optional[str] = None


class SingleQuestionRegenerateResponse(BaseModel):
    """Outgoing receipt for single-question regeneration."""
    question: RegeneratedQuestionItem
    validation_passed: bool = True
    source: str = "gemini"
