"""
EduFlow AI - Simple RAG Core Service API
========================================
Production FastAPI Microservice for Course Slide Indexing,
Grounded Student Q&A with Slide Citations, and Course Assessments.
"""

import os
import re
import json
import logging
import traceback
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load local environment variables (.env)
load_dotenv()

# ─────────────────────────────────────────────────────────────────
# LOGGING SETUP — Structured logs for every request/error/LLM call
# ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("eduflow.ai")

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
logger.info("[startup] Initializing SimpleRagService (ChromaDB + Embedding)...")
try:
    rag_service = SimpleRagService()
    logger.info("[startup] ✅ SimpleRagService initialized successfully.")
except Exception as e:
    logger.critical(f"[startup] ❌ FATAL: Could not initialize SimpleRagService: {e}")
    logger.critical(traceback.format_exc())
    raise


# -----------------------------------------------------------------------------
# 1. HEALTH & STATUS ENDPOINTS
# -----------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
def health_check():
    """Basic service liveness probe."""
    chunk_count = rag_service.vector_store.count()
    logger.info(f"[health] Health check: vector_store_chunks={chunk_count}")
    return {
        "status": "healthy",
        "service": "EduFlow Simple RAG Service",
        "version": "1.0.0",
        "vector_store_chunks": chunk_count
    }


@app.get("/api/v1/ai/status", tags=["Health"])
def ai_status():
    """Status probe used by .NET backend to check microservice availability."""
    chunk_count = rag_service.vector_store.count()
    llm_provider = rag_service.llm_provider
    gemini_key_present = bool(rag_service.gemini_api_key)
    groq_key_present = bool(rag_service.groq_api_key)

    logger.info(
        f"[ai_status] Status check: llm_provider={llm_provider}, "
        f"gemini_key={'✅' if gemini_key_present else '❌ MISSING'}, "
        f"groq_key={'✅' if groq_key_present else '❌ MISSING'}, "
        f"indexed_chunks={chunk_count}"
    )

    # Warn if the configured LLM provider has no API key
    if llm_provider == "gemini" and not gemini_key_present:
        logger.warning("[ai_status] ⚠️  LLM_PROVIDER=gemini but GEMINI_API_KEY is empty in .env!")
    elif llm_provider == "groq" and not groq_key_present:
        logger.warning("[ai_status] ⚠️  LLM_PROVIDER=groq but GROQ_API_KEY is empty in .env!")

    return {
        "status": "healthy",
        "status_color": "green",
        "message": "EduFlow Simple RAG Service is online and operational.",
        "can_generate": True,
        "indexed_chunks": chunk_count,
        "llm_provider": llm_provider,
        "gemini_key_configured": gemini_key_present,
        "groq_key_configured": groq_key_present,
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
    logger.info(
        f"[index_pdf] Request received: file_path={request.file_path}, "
        f"course_id={request.course_id}, module_id={request.module_id}"
    )
    try:
        response = rag_service.index_file(
            file_path=request.file_path,
            course_id=request.course_id,
            module_id=request.module_id
        )
        logger.info(
            f"[index_pdf] ✅ Indexed: file={response.file_name}, "
            f"pages={response.pages_parsed}, chunks={response.chunks_indexed}"
        )
        return response
    except FileNotFoundError as e:
        logger.error(f"[index_pdf] ❌ FileNotFoundError: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[index_pdf] ❌ Unexpected error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to index PDF: {str(e)}")


@app.post("/api/v1/rag/chat", response_model=RagChatResponse, tags=["RAG Core"])
def rag_chat(request: RagChatRequest):
    """
    Answers student questions grounded strictly in course lecture slides.
    Returns the answer and verifiable slide/page citations.
    """
    logger.info(
        f"[rag_chat] Request received: question='{request.question[:80]}...', "
        f"course_id={request.course_id}, module_id={request.module_id}, "
        f"source_file={request.source_file}"
    )
    try:
        response = rag_service.chat(
            question=request.question,
            course_id=None if request.source_file else request.course_id,
            module_id=request.module_id,
            source_file=request.source_file,
            max_citations=request.max_citations
        )
        logger.info(
            f"[rag_chat] ✅ Response: source={response.source}, "
            f"citations={len(response.citations)}, confidence={response.confidence_score}"
        )
        return response
    except Exception as e:
        logger.error(f"[rag_chat] ❌ Chat error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.post("/ai-coach-chat", response_model=CoachChatResponse, tags=["RAG Core"])
def ai_coach_chat(request: CoachChatRequest):
    """
    Bridge endpoint for .NET backend and Frontend Student Coach Tab.
    Translates incoming student question into slide-grounded RAG answer with citations.
    Supports optional Strict Lecture Deck Scoping (request.source_file).
    """
    logger.info(
        f"[ai_coach_chat] Request: student_id={request.student_id}, "
        f"course_id={request.course_id}, message='{request.message[:80]}...', "
        f"source_file={request.source_file}"
    )
    try:
        response = rag_service.chat(
            question=request.message,
            course_id=None if request.source_file else (request.course_id or "it3012-se"),
            source_file=request.source_file
        )
        first_citation = response.citations[0] if response.citations else None
        suggested_action = (
            f"Review Slide {first_citation.page_number} ({first_citation.source_file})"
            if first_citation
            else "Review your enrolled course slides."
        )
        topic = first_citation.source_file if first_citation else "Course Slides"

        logger.info(
            f"[ai_coach_chat] ✅ Response: source={response.source}, "
            f"citations={len(response.citations)}, suggested_action='{suggested_action}'"
        )
        return CoachChatResponse(
            reply=response.answer,
            suggested_action=suggested_action,
            identified_weak_topic=topic,
            citations=response.citations,
            confidence_score=response.confidence_score,
            source=response.source
        )
    except Exception as e:
        logger.error(f"[ai_coach_chat] ❌ Coach chat error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Coach chat error: {str(e)}")


@app.get("/api/v1/rag/slide-decks", response_model=ListSlideDecksResponse, tags=["RAG Core"])
def list_slide_decks():
    """
    Returns all unique indexed lecture slide decks available in ChromaDB.
    Enables frontend UI to populate targeted lecture selector dropdowns.
    """
    logger.info("[list_slide_decks] Fetching all indexed slide decks from ChromaDB...")
    decks = rag_service.vector_store.list_slide_decks()
    logger.info(f"[list_slide_decks] ✅ Found {len(decks)} slide deck(s)")
    for d in decks:
        logger.info(f"  - {d.get('display_title', d.get('source_file'))} | course={d.get('course_id')} | chunks={d.get('total_chunks')}")
    if len(decks) == 0:
        logger.warning("[list_slide_decks] ⚠️  No slide decks indexed! AI quiz will use generic fallback questions.")
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
    logger.info(f"[categorize_topics] Request: slide_path={request.slide_path}, max_topics={request.max_topics}")
    try:
        result = rag_service.categorize_slide_topics(
            slide_path=request.slide_path,
            max_topics=request.max_topics
        )
        logger.info(f"[categorize_topics] ✅ Extracted {len(result.topics)} topics from {result.total_slides} slides")
        return result
    except Exception as e:
        logger.error(f"[categorize_topics] ❌ Slide parsing error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Slide parsing error: {str(e)}")


@app.post("/api/v1/ai/slides/generate-quiz", response_model=GenerateSlideQuizResponse, tags=["Slides"])
def generate_slide_quiz(request: GenerateSlideQuizRequest):
    """
    Generates diagnostic quiz questions grounded directly in lecture slides.
    """
    logger.info(
        f"[generate_slide_quiz] Request: slide_path={request.slide_path}, "
        f"module_title={request.module_title}, num_questions={request.num_questions}, "
        f"difficulty={request.difficulty}, target_topics={request.target_topics}"
    )
    try:
        result = rag_service.generate_quiz(
            slide_path=request.slide_path,
            module_title=request.module_title or "Course Module",
            target_topics=request.target_topics,
            num_questions=request.num_questions,
            difficulty=request.difficulty
        )
        logger.info(
            f"[generate_slide_quiz] ✅ Generated quiz: quiz_id={result.quiz_id}, "
            f"questions={len(result.questions)}, source={result.source}"
        )
        return result
    except Exception as e:
        logger.error(f"[generate_slide_quiz] ❌ Quiz generation error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {str(e)}")


# -----------------------------------------------------------------------------
# 4. LEGACY ROUTE — /generate-quiz (called by .NET AiGatewayClient)
# NOTE: The .NET AiGatewayClient.GenerateQuizAsync calls POST /generate-quiz
# but this route was missing — causing the AI quiz generation to always fail.
# This bridge endpoint routes it to the RAG-grounded generate_slide_quiz logic.
# -----------------------------------------------------------------------------

@app.post("/generate-quiz", tags=["Legacy Bridge"])
def generate_quiz_legacy(request: dict):
    """
    Legacy bridge endpoint called by .NET AiGatewayClient.GenerateQuizAsync.
    Routes to the RAG-grounded quiz generation pipeline.
    """
    logger.info(
        f"[generate_quiz_legacy] /generate-quiz called by .NET backend: "
        f"course_id={request.get('course_id')}, topic={request.get('topic_title')}, "
        f"question_count={request.get('question_count')}, slide_path={request.get('slide_path')}"
    )
    llm_provider = rag_service.llm_provider
    gemini_key = rag_service.gemini_api_key
    groq_key = rag_service.groq_api_key
    logger.info(
        f"[generate_quiz_legacy] LLM Config: provider={llm_provider}, "
        f"gemini_key={'✅ SET' if gemini_key else '❌ EMPTY'}, "
        f"groq_key={'✅ SET' if groq_key else '❌ EMPTY'}"
    )

    try:
        slide_path = request.get("slide_path") or request.get("pdf_path")
        module_title = request.get("module_title") or request.get("topic_title") or "Course Module"
        num_questions = int(request.get("question_count", 5))
        difficulty = request.get("difficulty", "Medium")
        target_topics = request.get("selected_topics")

        logger.info(
            f"[generate_quiz_legacy] Generating quiz: slide_path={slide_path}, "
            f"module_title={module_title}, num_questions={num_questions}, difficulty={difficulty}"
        )

        result = rag_service.generate_quiz(
            slide_path=slide_path,
            module_title=module_title,
            target_topics=target_topics,
            num_questions=num_questions,
            difficulty=difficulty
        )

        # Map GenerateSlideQuizResponse fields to the format the .NET backend expects
        questions_out = []
        for q in result.questions:
            questions_out.append({
                "question_text": q.question_text,
                "question_type": "MULTIPLE_CHOICE",
                "options": q.options,
                "correct_answer": q.options[q.correct_index] if q.correct_index < len(q.options) else (q.options[0] if q.options else ""),
                "explanation": q.explanation,
                "marking_scheme": q.explanation,
                "slide_citation": q.slide_citation,
                "points": q.points,
            })

        logger.info(f"[generate_quiz_legacy] ✅ Generated {len(questions_out)} questions. source={result.source}")
        return {
            "quiz_id": result.quiz_id,
            "workflow_id": result.workflow_id,
            "title": result.title,
            "difficulty": result.difficulty,
            "total_points": result.total_points,
            "validation_passed": result.validation_passed,
            "status": result.status,
            "source": result.source,
            "questions": questions_out,
        }
    except Exception as e:
        logger.error(f"[generate_quiz_legacy] ❌ Quiz generation error: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {str(e)}")

