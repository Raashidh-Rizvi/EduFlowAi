"""
EduFlow AI - Simple RAG Core Service API
========================================
Production FastAPI Microservice for Course Slide Indexing,
Grounded Student Q&A with Slide Citations, and Course Assessments.
"""

import hmac
import logging
import os
from typing import List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load local environment variables (.env)
load_dotenv(override=True)

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
    GenerateSlideQuizResponse,
    SingleQuestionRegenerateRequest,
    SingleQuestionRegenerateResponse
)
from rag.rag_service import SimpleRagService
from agents.gemini_quiz_generation_service import (
    GeminiQuizGenerationService,
    QuizGenerationUnavailable,
    QuizGenerationValidationError,
)
from agents.learning_agent import LearningAgent
from models.schemas import LearningRequest, LearningResponse
from tools.learning_support import LearningUnavailable

logger = logging.getLogger("eduflow.ai")

_DEFAULT_UPLOADS_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "backend", "EduFlow.Api", "wwwroot", "uploads",
)


class InternalAuthError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


def verify_internal_token(x_internal_api_key: Optional[str] = Header(None, alias="X-Internal-Api-Key")) -> None:
    """
    Mirrors the .NET InternalServiceAuthFilter: every non-health route requires the shared
    INTERNAL_SERVICE_TOKEN in X-Internal-Api-Key (sent by AiGatewayClient from AiService:ApiKey).
    Fails closed when the token is not configured unless INTERNAL_AUTH_FAIL_OPEN=true (local dev only).
    """
    expected = os.getenv("INTERNAL_SERVICE_TOKEN", "").strip()
    if not expected:
        if os.getenv("INTERNAL_AUTH_FAIL_OPEN", "").strip().lower() == "true":
            logger.warning("INTERNAL_SERVICE_TOKEN is not set; accepting unauthenticated call because INTERNAL_AUTH_FAIL_OPEN=true.")
            return
        raise InternalAuthError(503, "INTERNAL_AUTH_NOT_CONFIGURED", "Internal service authentication is not configured.")
    if not x_internal_api_key or not hmac.compare_digest(x_internal_api_key.encode("utf-8"), expected.encode("utf-8")):
        raise InternalAuthError(401, "INTERNAL_AUTH_FAILED", "Invalid or missing internal service token.")


def _allowed_upload_roots() -> List[str]:
    raw = os.getenv("UPLOADS_ROOT", "").strip() or _DEFAULT_UPLOADS_ROOT
    return [os.path.realpath(r.strip()) for r in raw.split(",") if r.strip()]


def require_upload_path(path: Optional[str]) -> Optional[str]:
    """Rejects file paths outside UPLOADS_ROOT so callers cannot make the service read arbitrary files."""
    if not path:
        return path
    resolved = os.path.normcase(os.path.realpath(path))
    for root in _allowed_upload_roots():
        root = os.path.normcase(root)
        try:
            if os.path.commonpath([resolved, root]) == root:
                return path
        except ValueError:
            # Different drives on Windows.
            continue
    logger.warning("Rejected file path outside the allowed uploads root.")
    raise HTTPException(status_code=400, detail="The requested file is not in an allowed location.")


def _allowed_origins() -> List[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "").strip() or "http://localhost:5173,http://localhost:5204"
    return [o.strip() for o in raw.split(",") if o.strip()]


# Initialize FastAPI Application
app = FastAPI(
    title="EduFlow AI - Simple RAG Service",
    description="Clean, robust Course Document RAG microservice with slide citations.",
    version="1.0.0"
)



@app.exception_handler(InternalAuthError)
def _internal_auth_error_handler(_request, exc: InternalAuthError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.message, "code": exc.code, "errors": None, "traceId": None},
    )


# CORS: explicit origin list from ALLOWED_ORIGINS (never "*" together with credentials).
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

internal_auth = [Depends(verify_internal_token)]

# Initialize Simple RAG Engine
rag_service = SimpleRagService()
learning_agent = LearningAgent(rag_service)

# Quiz generation always goes through Gemini with strict schema validation.
quiz_generation_service = GeminiQuizGenerationService(rag_service)


@app.post("/api/v1/agent/learn", response_model=LearningResponse, tags=["Learning Agent"], dependencies=internal_auth)
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


@app.get("/api/v1/ai/status", tags=["Health"], dependencies=internal_auth)
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

@app.post("/api/v1/rag/index-pdf", response_model=IndexPdfResponse, tags=["RAG Core"], dependencies=internal_auth)
def index_pdf(request: IndexPdfRequest):
    """
    Indexes an uploaded lecture slide PDF/PPTX into persistent ChromaDB.
    Called automatically when instructors upload module slides.
    """
    try:
        response = rag_service.index_file(
            file_path=require_upload_path(request.file_path),
            course_id=request.course_id,
            module_id=request.module_id
        )
        return response
    except HTTPException:
        raise
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="The lecture file was not found.")
    except Exception:
        logger.exception("Indexing a lecture file failed.")
        raise HTTPException(status_code=500, detail="Failed to index the lecture file.")


@app.post("/api/v1/rag/chat", response_model=RagChatResponse, tags=["RAG Core"], dependencies=internal_auth)
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
    except Exception:
        logger.exception("RAG chat failed.")
        raise HTTPException(status_code=500, detail="The AI assistant could not answer right now. Please retry.")


@app.post("/ai-coach-chat", response_model=CoachChatResponse, tags=["RAG Core"], dependencies=internal_auth)
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
        if first_citation:
            if first_citation.page_number == 0 or str(first_citation.source_file).startswith("http"):
                suggested_action = f"Explore external reference: {first_citation.preview_text or 'Web Source'}"
                topic = first_citation.preview_text or "Web Search"
            else:
                suggested_action = f"Review Slide {first_citation.page_number} ({first_citation.source_file})"
                topic = first_citation.source_file
        else:
            suggested_action = "Review your enrolled course slides."
            topic = "Course Slides"

        return CoachChatResponse(
            reply=response.answer,
            suggested_action=suggested_action,
            identified_weak_topic=topic,
            citations=response.citations,
            confidence_score=response.confidence_score,
            source=response.source
        )
    except Exception:
        logger.exception("Coach chat failed.")
        raise HTTPException(status_code=500, detail="The AI coach could not answer right now. Please retry.")


@app.get("/api/v1/rag/slide-decks", response_model=ListSlideDecksResponse, tags=["RAG Core"], dependencies=internal_auth)
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

@app.post("/api/v1/ai/slides/categorize-topics", response_model=CategorizeTopicsResponse, tags=["Slides"], dependencies=internal_auth)
def categorize_topics(request: CategorizeTopicsRequest):
    """
    Extracts 3 to 6 major topic bands from uploaded lecture slides
    for instructor quiz configuration.
    """
    try:
        return rag_service.categorize_slide_topics(
            slide_path=require_upload_path(request.slide_path),
            max_topics=request.max_topics
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Slide topic categorization failed.")
        raise HTTPException(status_code=500, detail="The slides could not be analysed.")


@app.post("/api/v1/ai/slides/generate-quiz", response_model=GenerateSlideQuizResponse, tags=["Slides"], dependencies=internal_auth)
def generate_slide_quiz(request: GenerateSlideQuizRequest):
    """
    Generates an instructor quiz draft grounded in real course material.

    Calls Gemini with a strict JSON schema and validates every question before
    returning it. There is deliberately NO template fallback: if Gemini is
    unavailable or its output fails validation, the call fails so the .NET
    backend can surface the error instead of persisting fake questions.
    """
    request.slide_path = require_upload_path(request.slide_path)
    request.pdf_path = require_upload_path(request.pdf_path)
    try:
        return quiz_generation_service.generate_quiz(request)
    except QuizGenerationUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except QuizGenerationValidationError as e:
        logger.warning("AI quiz output failed validation: %s", e)
        raise HTTPException(status_code=502, detail="AI quiz output failed validation. Please retry.")
    except Exception:
        logger.exception("Quiz generation failed.")
        raise HTTPException(status_code=500, detail="Quiz generation failed. Please retry.")


@app.post("/api/v1/ai/questions/{question_id}/regenerate", response_model=SingleQuestionRegenerateResponse, tags=["Slides"], dependencies=internal_auth)
def regenerate_quiz_question(question_id: str, request: SingleQuestionRegenerateRequest):
    """
    Regenerates a single question for the instructor review step.

    Same grounding and validation rules as full quiz generation. The .NET
    backend treats any failure here as "leave the original question unchanged".
    """
    request.question_id = request.question_id or question_id
    request.slide_path = require_upload_path(request.slide_path)
    request.pdf_path = require_upload_path(request.pdf_path)
    try:
        return quiz_generation_service.regenerate_question(request)
    except QuizGenerationUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except QuizGenerationValidationError as e:
        logger.warning("AI question output failed validation: %s", e)
        raise HTTPException(status_code=502, detail="AI question output failed validation. Please retry.")
    except Exception:
        logger.exception("Question regeneration failed.")
        raise HTTPException(status_code=500, detail="Question regeneration failed. Please retry.")
