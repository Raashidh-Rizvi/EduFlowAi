from dotenv import load_dotenv
load_dotenv()
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
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
    AgentTopologyResponse,
    WorkflowDecisionRequest,
    WorkflowDecisionResponse
)
from models.state import SharedAgentState
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
from tools.registry import tool_registry

app = FastAPI(
    title="EduFlow AI – Interconnected Multi-Agent Orchestration Service 🧠",
    description="Python LangGraph microservice powering 7 interconnected AI agents for personalized learning, adaptive assessments, deterministic safety, tool registries, and retention governance.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
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
def get_agents_topology():
    try:
        return AgentTopologyRegistry.get_topology()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tools/registry")
def get_tool_registry():
    """Returns all registered permitted tools and their allowed agent callers."""
    try:
        return {
            "total_tools": len(tool_registry.list_tools()),
            "tools": tool_registry.list_tools()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/orchestrate-study-plan", response_model=StudyPlanProposalResponse)
def orchestrate_study_plan(request: StudyPlanRequest):
    try:
        return StudyPlanOrchestrator.run_pipeline(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-adaptive-challenge", response_model=AdaptiveChallengeResponse)
def generate_adaptive_challenge(request: AdaptiveChallengeRequest):
    try:
        return AdaptiveChallengeOrchestrator.generate_challenge(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-quiz", response_model=DiagnosticQuizResponse)
@app.post("/api/v1/ai/quiz-generation", response_model=DiagnosticQuizResponse)
def generate_diagnostic_quiz(request: DiagnosticQuizRequest):
    try:
        return QuizGeneratorOrchestrator.generate_quiz(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ai/questions/{question_id}/regenerate")
def regenerate_single_question(question_id: int, request: Dict[str, Any] = Body(...)):
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
        return quiz_agent.regenerate_single_question(req_obj)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ai/quiz-generation/{workflow_id}/regenerate", response_model=DiagnosticQuizResponse)
def regenerate_quiz_workflow(workflow_id: str, request: DiagnosticQuizRequest):
    try:
        return QuizGeneratorOrchestrator.generate_quiz(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-retention", response_model=RetentionRiskResponse)
def analyze_retention(request: RetentionAnalysisRequest):
    try:
        return RetentionOrchestrator.analyze_retention(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai-coach-chat", response_model=CoachChatResponse)
def ai_coach_chat(request: CoachChatRequest):
    try:
        return AiCoachOrchestrator.answer_student_query(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ai/next-best-action", response_model=NextBestActionResponse)
def get_next_best_action(request: NextBestActionRequest):
    try:
        from agents.next_best_action import NextBestActionAgent
        nba_agent = NextBestActionAgent()
        res, _ = nba_agent.evaluate_next_action(request)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/workflows/execute", response_model=SharedAgentState)
def execute_langgraph_workflow(
    student_id: str = Body(..., embed=True),
    objective: Dict[str, Any] = Body(..., embed=True),
    student_context: Dict[str, Any] = Body(default_factory=dict, embed=True),
    requires_human_approval: bool = Body(default=True, embed=True)
):
    """Executes end-to-end 11-field shared state LangGraph pipeline."""
    try:
        return LangGraphPipeline.execute_workflow(
            student_id=student_id,
            objective=objective,
            student_context=student_context,
            requires_human_approval=requires_human_approval
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workflows/{workflow_id}/decision", response_model=WorkflowDecisionResponse)
def submit_workflow_decision(workflow_id: str, request: WorkflowDecisionRequest):
    """Human approval state machine decision handler."""
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
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/workflows/{workflow_id}/status", response_model=SharedAgentState)
def get_workflow_status(workflow_id: str):
    if workflow_id not in ACTIVE_WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found.")
    return ACTIVE_WORKFLOWS[workflow_id]

@app.get("/observability/metrics")
def get_observability_metrics():
    active_count = len(ACTIVE_WORKFLOWS)
    return {
        "active_workflows_tracked": active_count,
        "registered_tools_count": len(tool_registry.list_tools()),
        "privacy_enforcement": "PII redaction active",
        "error_classification": "8 classified exception types",
        "resilience_policy": "Exponential backoff with randomized jitter"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
