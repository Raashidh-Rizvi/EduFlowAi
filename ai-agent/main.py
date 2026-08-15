from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import (
    StudyPlanRequest, 
    StudyPlanProposalResponse,
    AdaptiveChallengeRequest,
    AdaptiveChallengeResponse,
    CoachChatRequest,
    CoachChatResponse
)
from graph.workflow import StudyPlanOrchestrator, AdaptiveChallengeOrchestrator, AiCoachOrchestrator

app = FastAPI(
    title="EduFlow AI – Multi-Agent Orchestration Service 🧠",
    description="Internal Python LangGraph microservice powering multi-agent study plans, adaptive challenges, and AI coach interactions.",
    version="1.0.0"
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
        "framework": "LangGraph & FastAPI",
        "active_agents": ["PlanningAgent", "LearningAnalysisAgent", "RecommendationAgent", "ValidationGuardAgent", "AiCoachAgent"]
    }

@app.post("/orchestrate-study-plan", response_model=StudyPlanProposalResponse)
def orchestrate_study_plan(request: StudyPlanRequest):
    try:
        result = StudyPlanOrchestrator.run_pipeline(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-adaptive-challenge", response_model=AdaptiveChallengeResponse)
def generate_adaptive_challenge(request: AdaptiveChallengeRequest):
    try:
        result = AdaptiveChallengeOrchestrator.generate_challenge(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai-coach-chat", response_model=CoachChatResponse)
def ai_coach_chat(request: CoachChatRequest):
    try:
        result = AiCoachOrchestrator.answer_student_query(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
