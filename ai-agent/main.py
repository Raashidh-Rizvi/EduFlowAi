from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException
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
    AgentTopologyResponse
)
from graph.workflow import (
    StudyPlanOrchestrator, 
    AdaptiveChallengeOrchestrator, 
    QuizGeneratorOrchestrator,
    RetentionOrchestrator,
    AiCoachOrchestrator,
    AgentTopologyRegistry
)

app = FastAPI(
    title="EduFlow AI – Interconnected Multi-Agent Orchestration Service 🧠",
    description="Python LangGraph microservice powering 7 interconnected AI agents for personalized learning, adaptive assessments, deterministic safety, and retention governance.",
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
        ]
    }

@app.get("/agents/topology", response_model=AgentTopologyResponse)
def get_agents_topology():
    try:
        return AgentTopologyRegistry.get_topology()
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
def generate_diagnostic_quiz(request: DiagnosticQuizRequest):
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
