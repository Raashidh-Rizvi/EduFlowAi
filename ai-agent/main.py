"""
===============================================================================
EduFlow AI - FastAPI Microservice & Multi-Agent HTTP REST API Endpoints
===============================================================================
This module is the main HTTP server entry point for the EduFlow AI microservice.

Why we use FastAPI:
1. High-Performance Asynchronous Python Server:
   - Serves high-throughput requests for multi-agent workflows, quiz generation,
     retention analysis, and conversational AI coaching.
2. Automatic OpenAPI Documentation:
   - Automatically generates interactive Swagger UI (`/docs`) and ReDoc (`/redoc`)
     specifications from Pydantic schemas.
3. Clean Integration with .NET Backend & React Frontend:
   - Exposes REST endpoints consumed by the .NET Web API and Next.js / React clients.
"""

# Import dotenv to load environment variables from .env file (e.g. OPENAI_API_KEY, PORT)
from dotenv import load_dotenv
# Execute dotenv loading immediately upon module import
load_dotenv()

import logging
logging.basicConfig(level=logging.INFO)

# Import typing annotations for flexible dictionaries and optional values
from typing import Dict, Any, Optional
# Import FastAPI core framework, HTTP exception handler, request body extractor, and dependency injector
from fastapi import FastAPI, HTTPException, Body, Depends
# Import CORS middleware to allow cross-origin requests from frontend apps
from fastapi.middleware.cors import CORSMiddleware

# Import the internal service-to-service authentication guard (shared-secret header check)
from core.internal_auth import verify_internal_token

# Import all Pydantic request and response schemas
from models.schemas import (
    StudyPlanRequest, 
    StudyPlanProposalResponse,
    AdaptiveChallengeRequest,
    AdaptiveChallengeResponse,
    DiagnosticQuizRequest,
    DiagnosticQuizResponse,
    RetentionAnalysisRequest,
    RetentionRiskResponse,
    CoachChatRequest,
    CoachChatResponse,
    NextBestActionRequest,
    NextBestActionResponse,
    AgentTopologyResponse,
    WorkflowDecisionRequest,
    WorkflowDecisionResponse,
    SlideCategorizeRequest,
    SlideCategorizeResponse,
    QuizAutoGradeRequest,
    QuizAutoGradeResponse
)
from agents.slide_topic_agent import SlideTopicAgent
from agents.quiz_evaluator_agent import QuizEvaluatorAgent

# Import state models
from models.state import SharedAgentState

# Import workflow orchestrators, state machine registry, and active workflows store
from graph.workflow import (
    StudyPlanOrchestrator, 
    AdaptiveChallengeOrchestrator, 
    QuizGeneratorOrchestrator,
    RetentionOrchestrator,
    AiCoachOrchestrator,
    AgentTopologyRegistry,
    LangGraphPipeline,
    ACTIVE_WORKFLOWS
)
# Import singleton tool registry to expose registered tools endpoint
from tools.registry import tool_registry


# -----------------------------------------------------------------------------
# FastAPI Application Initialization & Metadata
# -----------------------------------------------------------------------------
app = FastAPI(
    title="EduFlow AI – Interconnected Multi-Agent Orchestration Service 🧠",
    description=(
        "Python LangGraph microservice powering 7 interconnected AI agents for personalized learning, "
        "adaptive assessments, deterministic safety, tool registries, and retention governance."
    ),
    version="2.0.0"
)

# -----------------------------------------------------------------------------
# Cross-Origin Resource Sharing (CORS) Middleware Configuration
# -----------------------------------------------------------------------------
# Allows the React/Next frontend and .NET backend running on different ports/domains to communicate seamlessly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # Allow all origins in development
    allow_credentials=True,      # Allow authorization cookies and headers
    allow_methods=["*"],          # Allow all HTTP methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],          # Allow all headers
)


# =============================================================================
# 1. System Health & Agent Topology Endpoints
# =============================================================================

@app.get("/health")
def health_check():
    """
    Health check endpoint returning system status, active agents count, and tool counts.
    """
    return {
        "status": "healthy",
        "service": "EduFlow Agentic AI Microservice",
        "version": "2.0.0",
        "active_agents_count": 7,
        "agents": [
            "CoordinatorPlannerAgent",
            "DomainAnalysisAgent",
            "ActionToolAgent",
            "ValidationGuardAgent",
            "QuizGeneratorAgent",
            "RetentionBehaviorAgent",
            "AiCoachAgent"
        ],
        "tool_registry_count": len(tool_registry.list_tools())
    }


@app.get("/agents/topology", response_model=AgentTopologyResponse)
def get_agents_topology(_: None = Depends(verify_internal_token)):
    """
    Returns the full interactive topology map of all 7 interconnected agents and their communication channels.
    """
    try:
        return AgentTopologyRegistry.get_topology()
    except Exception as e:
        logging.error(f"Error getting topology: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while retrieving the agent topology.")


@app.get("/tools/registry")
def get_tool_registry(_: None = Depends(verify_internal_token)):
    """
    Returns all registered permitted tools, their descriptions, and authorized agent roles.
    """
    try:
        return {
            "total_tools": len(tool_registry.list_tools()),
            "tools": tool_registry.list_tools()
        }
    except Exception as e:
        logging.error(f"Error getting tool registry: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while retrieving the tool registry.")


# =============================================================================
# 2. Study Plan & Adaptive Challenge Endpoints
# =============================================================================

@app.post("/orchestrate-study-plan", response_model=StudyPlanProposalResponse)
def orchestrate_study_plan(request: StudyPlanRequest, _: None = Depends(verify_internal_token)):
    """
    Orchestrates the 4-agent pipeline to create a multi-week personalized study plan proposal.
    """
    try:
        return StudyPlanOrchestrator.run_pipeline(request)
    except Exception as e:
        logging.error(f"Error orchestrating study plan: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while creating the study plan.")


@app.post("/generate-adaptive-challenge", response_model=AdaptiveChallengeResponse)
def generate_adaptive_challenge(request: AdaptiveChallengeRequest, _: None = Depends(verify_internal_token)):
    """
    Generates a targeted, calibrated micro-challenge addressing diagnosed student knowledge gaps.
    """
    try:
        return AdaptiveChallengeOrchestrator.generate_challenge(request)
    except Exception as e:
        logging.error(f"Error generating adaptive challenge: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while generating the adaptive challenge.")


# =============================================================================
# 3. Hierarchical Quiz & Assessment Endpoints
# =============================================================================

@app.post("/generate-quiz", response_model=DiagnosticQuizResponse)
@app.post("/api/v1/ai/quiz-generation", response_model=DiagnosticQuizResponse)
def generate_diagnostic_quiz(request: DiagnosticQuizRequest, _: None = Depends(verify_internal_token)):
    """
    Synthesizes a curriculum-aligned quiz assessment across Course, Module, Topic, or Lesson scopes.
    """
    try:
        return QuizGeneratorOrchestrator.generate_quiz(request)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating quiz: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while generating the quiz.")


@app.post("/api/v1/ai/questions/{question_id}/regenerate")
def regenerate_single_question(question_id: str, request: Dict[str, Any] = Body(...), _: None = Depends(verify_internal_token)):
    """
    Regenerates an individual question within a quiz using custom instructor natural language prompt guidance.

    `question_id` is a string (not int) because it is the .NET-owned Question.Id,
    which is a Guid and serializes as a string -- see SingleQuestionRegenerateRequest
    in models/schemas.py for the matching request field.
    """
    try:
        from models.schemas import SingleQuestionRegenerateRequest
        req_obj = SingleQuestionRegenerateRequest(
            question_id=question_id,
            focus_topic=request.get("focus_topic"),
            prompt_guidance=request.get("prompt_guidance"),
            target_type=request.get("target_type", "MULTIPLE_CHOICE"),
            target_difficulty=request.get("target_difficulty", "MEDIUM"),
            learning_objective=request.get("learning_objective"),
            source_content_id=request.get("source_content_id")
        )
        from graph.workflow import quiz_agent
        return quiz_agent.regenerate_single_question(req_obj)
    except Exception as e:
        logging.error(f"Error regenerating question: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while regenerating the question.")


@app.post("/api/v1/ai/quiz-generation/{workflow_id}/regenerate", response_model=DiagnosticQuizResponse)
def regenerate_quiz_workflow(workflow_id: str, request: DiagnosticQuizRequest, _: None = Depends(verify_internal_token)):
    """
    Re-executes the quiz generation workflow for an entire assessment.
    """
    try:
        return QuizGeneratorOrchestrator.generate_quiz(request)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error regenerating quiz workflow: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while regenerating the quiz workflow.")


# -----------------------------------------------------------------------------
# SlideQuest AI - Slide Topic Discovery & Automated Marking Endpoints
# -----------------------------------------------------------------------------

@app.post("/api/v1/ai/slides/categorize-topics", response_model=SlideCategorizeResponse)
def categorize_slide_topics(request: SlideCategorizeRequest, _: None = Depends(verify_internal_token)):
    """
    Analyzes lecture slide presentations (PDF/PPTX) and categorizes subtopics for quiz creation.
    """
    try:
        agent = SlideTopicAgent()
        res, log = agent.categorize_slides(file_path=request.slide_path, max_topics=request.max_topics)
        res["audit_log"] = log
        return res
    except Exception as e:
        logging.error(f"Error categorizing slide topics: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while categorizing slide topics.")


@app.post("/api/v1/ai/slides/generate-quiz", response_model=DiagnosticQuizResponse)
def generate_slide_rag_quiz(request: DiagnosticQuizRequest, _: None = Depends(verify_internal_token)):
    """
    Generates a multi-format quiz strictly grounded in chosen slide topics.
    """
    try:
        return QuizGeneratorOrchestrator.generate_quiz(request)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating slide RAG quiz: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while generating the slide quiz.")


@app.post("/api/v1/ai/quizzes/auto-grade", response_model=QuizAutoGradeResponse)
def auto_grade_quiz_submission(request: QuizAutoGradeRequest, _: None = Depends(verify_internal_token)):
    """
    Automatically evaluates student quiz answers across all formats with AI semantic grading for typed responses.
    """
    try:
        agent = QuizEvaluatorAgent()
        res, _ = agent.evaluate_submission(
            questions=request.questions,
            answers=request.answers,
            pass_percentage=request.pass_percentage
        )
        return res
    except Exception as e:
        logging.error(f"Error auto-grading quiz: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while evaluating the quiz submission.")


# =============================================================================
# 4. Retention Analysis & AI Coaching Endpoints
# =============================================================================

@app.post("/analyze-retention", response_model=RetentionRiskResponse)
def analyze_retention(request: RetentionAnalysisRequest, _: None = Depends(verify_internal_token)):
    """
    Analyzes student dropout risk and returns personalized habit retention interventions.
    """
    try:
        return RetentionOrchestrator.analyze_retention(request)
    except Exception as e:
        logging.error(f"Error analyzing retention: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while analyzing retention.")


@app.post("/ai-coach-chat", response_model=CoachChatResponse)
def ai_coach_chat(request: CoachChatRequest, _: None = Depends(verify_internal_token)):
    """
    Conversational tutor endpoint for EduBuddy AI Coach, providing contextual guidance and practice actions.
    """
    try:
        return AiCoachOrchestrator.answer_student_query(request)
    except Exception as e:
        logging.error(f"Error in AI coach chat: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while connecting to the AI Coach.")


@app.post("/api/v1/ai/next-best-action", response_model=NextBestActionResponse)
def get_next_best_action(request: NextBestActionRequest, _: None = Depends(verify_internal_token)):
    """
    Computes the deterministic next best action in the adaptive learning game loop based on student skill telemetry.
    """
    try:
        from agents.next_best_action import NextBestActionAgent
        nba_agent = NextBestActionAgent()
        res, _ = nba_agent.evaluate_next_action(request)
        return res
    except Exception as e:
        logging.error(f"Error getting next best action: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while determining the next action.")


# =============================================================================
# 5. LangGraph Blackboard Workflow & Approval State Machine Endpoints
# =============================================================================

@app.post("/workflows/execute", response_model=SharedAgentState)
def execute_langgraph_workflow(
    student_id: str = Body(..., embed=True),
    objective: Dict[str, Any] = Body(..., embed=True),
    student_context: Dict[str, Any] = Body(default_factory=dict, embed=True),
    requires_human_approval: bool = Body(default=True, embed=True),
    _: None = Depends(verify_internal_token)
):
    """
    Executes the end-to-end 11-field shared state LangGraph pipeline.
    """
    try:
        return LangGraphPipeline.execute_workflow(
            student_id=student_id,
            objective=objective,
            student_context=student_context,
            requires_human_approval=requires_human_approval
        )
    except Exception as e:
        logging.error(f"Error executing LangGraph workflow: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while executing the workflow.")


@app.post("/workflows/{workflow_id}/decision", response_model=WorkflowDecisionResponse)
def submit_workflow_decision(workflow_id: str, request: WorkflowDecisionRequest, _: None = Depends(verify_internal_token)):
    """
    Submits a human instructor review decision (APPROVED, REJECTED, REVISION_REQUESTED) into the state machine.
    """
    try:
        updated_state = LangGraphPipeline.process_review_decision(
            workflow_id=workflow_id,
            decision=request.decision,
            reviewer_id=request.reviewer_id,
            comments=request.comments
        )
        return WorkflowDecisionResponse(
            workflow_id=workflow_id,
            previous_status="PENDING_APPROVAL",
            current_status=updated_state.status,
            decision=request.decision,
            reviewer_id=request.reviewer_id,
            comments=request.comments,
            transition_timestamp=updated_state.approval.get("reviewedAt", ""),
            message=f"Workflow state successfully updated to '{updated_state.status}'."
        )
    except Exception as e:
        logging.error(f"Error submitting workflow decision: {e}")
        raise HTTPException(status_code=400, detail="An error occurred while processing your decision. Please verify your input and try again.")


@app.get("/workflows/{workflow_id}/status", response_model=SharedAgentState)
def get_workflow_status(workflow_id: str, _: None = Depends(verify_internal_token)):
    """
    Retrieves the current SharedAgentState snapshot of an active workflow.
    """
    if workflow_id not in ACTIVE_WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found.")
    return ACTIVE_WORKFLOWS[workflow_id]


@app.get("/observability/metrics")
def get_observability_metrics(_: None = Depends(verify_internal_token)):
    """
    Returns system-wide telemetry stats, active workflow counts, and resilience policies.
    """
    active_count = len(ACTIVE_WORKFLOWS)
    return {
        "active_workflows_tracked": active_count,
        "registered_tools_count": len(tool_registry.list_tools()),
        "privacy_enforcement": "PII redaction active",
        "error_classification": "8 classified exception types",
        "resilience_policy": "Exponential backoff with randomized jitter"
    }


# -----------------------------------------------------------------------------
# Application Runner
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    # Start the Uvicorn ASGI server on port 8000 with auto-reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["agents", "core", "graph", "models", "tools"])

# Trigger reload
