"""
EduFlow AI - Simple RAG Core Service API
========================================
Production FastAPI Microservice for Course Slide Indexing,
Grounded Student Q&A with Slide Citations, and Course Assessments.
"""

from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load local environment variables (.env)
load_dotenv()

from models.schemas import (
    IndexPdfRequest,
    IndexPdfResponse,
    RagChatRequest,
    RagChatResponse,
    CoachChatRequest,
    CoachChatResponse,
    SlideDeckItem,
    ListSlideDecksResponse,
    CategorizeTopicsRequest,
    CategorizeTopicsResponse,
    GenerateSlideQuizRequest,
    GenerateSlideQuizResponse
)
from rag.rag_service import SimpleRagService
from agents.learning_agent import LearningAgent
from models.schemas import LearningRequest, LearningResponse
from tools.learning_support import LearningUnavailable

# Initialize FastAPI Application
app = FastAPI(
    title="EduFlow AI - Simple RAG Service",
    description="Clean, robust Course Document RAG microservice with slide citations.",
    version="1.0.0"
)

# Enable CORS for Frontend & Gateway
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Simple RAG Engine
rag_service = SimpleRagService()
learning_agent = LearningAgent(rag_service)


@app.post("/api/v1/agent/learn", response_model=LearningResponse, tags=["Learning Agent"])
def learn(request: LearningRequest):
    try:
        return learning_agent.learn(request)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except LearningUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=503, detail="The learning service could not complete this request. Please retry.")


# -----------------------------------------------------------------------------
# 1. HEALTH & STATUS ENDPOINTS
# -----------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
def health_check():
    """Basic service liveness probe."""
    return {
        "status": "healthy",
        "service": "EduFlow Simple RAG Service",
        "version": "1.0.0",
        "vector_store_chunks": rag_service.vector_store.count()
    }


@app.get("/api/v1/ai/status", tags=["Health"])
def ai_status():
    """Status probe used by .NET backend to check microservice availability."""
    return {
        "status": "healthy",
        "status_color": "green",
        "message": "EduFlow Simple RAG Service is online and operational.",
        "can_generate": True,
        "indexed_chunks": rag_service.vector_store.count()
    }


# -----------------------------------------------------------------------------
# 2. CORE SIMPLE RAG ENDPOINTS (PDF Indexing & Student Chat)
# -----------------------------------------------------------------------------

@app.post("/api/v1/rag/index-pdf", response_model=IndexPdfResponse, tags=["RAG Core"])
def index_pdf(request: IndexPdfRequest):
    """
    Indexes an uploaded lecture slide PDF/PPTX into persistent ChromaDB.
    Called automatically when instructors upload module slides.
    """
    try:
        response = rag_service.index_file(
            file_path=request.file_path,
            course_id=request.course_id,
            module_id=request.module_id
        )
        return response
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index PDF: {str(e)}")


@app.post("/api/v1/rag/chat", response_model=RagChatResponse, tags=["RAG Core"])
def rag_chat(request: RagChatRequest):
    """
    Answers student questions grounded strictly in course lecture slides.
    Returns the answer and verifiable slide/page citations.
    """
    try:
        response = learning_agent.chat(
            question=request.question,
            student_id=request.student_id,
            session_id=request.session_id,
            course_id=request.course_id,
            module_id=request.module_id,
            source_file=request.source_file,
            max_citations=request.max_citations
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.post("/ai-coach-chat", response_model=CoachChatResponse, tags=["RAG Core"])
def ai_coach_chat(request: CoachChatRequest):
    """
    Bridge endpoint for .NET backend and Frontend Student Coach Tab.
    Translates incoming student question into slide-grounded RAG answer with citations.
    Supports optional Strict Lecture Deck Scoping (request.source_file).
    """
    try:
        response = learning_agent.chat(
            question=request.message,
            student_id=request.student_id,
            session_id=request.session_id,
            course_id=request.course_id or (None if request.source_file else "it3012-se"),
            source_file=request.source_file
        )
        first_citation = response.citations[0] if response.citations else None
        suggested_action = (
            f"Review Slide {first_citation.page_number} ({first_citation.source_file})"
            if first_citation
            else "Review your enrolled course slides."
        )
        topic = first_citation.source_file if first_citation else "Course Slides"

        return CoachChatResponse(
            reply=response.answer,
            suggested_action=suggested_action,
            identified_weak_topic=topic,
            citations=response.citations,
            confidence_score=response.confidence_score,
            source=response.source
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Coach chat error: {str(e)}")


@app.get("/api/v1/rag/slide-decks", response_model=ListSlideDecksResponse, tags=["RAG Core"])
def list_slide_decks():
    """
    Returns all unique indexed lecture slide decks available in ChromaDB.
    Enables frontend UI to populate targeted lecture selector dropdowns.
    """
    decks = rag_service.vector_store.list_slide_decks()
    return ListSlideDecksResponse(slide_decks=decks)


# -----------------------------------------------------------------------------
# 3. SLIDE EXPLORATION & QUIZ GENERATION (Strictly Grounded in RAG)
# -----------------------------------------------------------------------------

@app.post("/api/v1/ai/slides/categorize-topics", response_model=CategorizeTopicsResponse, tags=["Slides"])
def categorize_topics(request: CategorizeTopicsRequest):
    """
    Extracts 3 to 6 major topic bands from uploaded lecture slides
    for instructor quiz configuration.
    """
    try:
        return rag_service.categorize_slide_topics(
            slide_path=request.slide_path,
            max_topics=request.max_topics
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slide parsing error: {str(e)}")


@app.post("/api/v1/ai/slides/generate-quiz", response_model=GenerateSlideQuizResponse, tags=["Slides"])
def generate_slide_quiz(request: GenerateSlideQuizRequest):
    """
    Generates diagnostic quiz questions grounded directly in lecture slides.
    """
    try:
        return rag_service.generate_quiz(
            slide_path=request.slide_path,
            module_title=request.module_title or "Course Module",
            target_topics=request.target_topics,
            num_questions=request.num_questions,
            difficulty=request.difficulty
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {str(e)}")
