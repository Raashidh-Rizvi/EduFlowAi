from fastapi import FastAPI, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import StudyPlanRequest, StudyPlanProposalResponse
from graph.workflow import StudyPlanOrchestrator

app = FastAPI(
    title="EduFlow AI – Agentic AI Microservice",
    version="1.0.0",
    description="Internal LangGraph-based multi-agent orchestration service called strictly by ASP.NET Core API"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

@app.get("/health")
def health_check():
    return {
        "status": "Healthy",
        "service": "EduFlow Agentic AI Microservice",
        "framework": "LangGraph / Python 3.11",
        "agents": [
            "Planning Agent",
            "Learning Analysis Agent",
            "Recommendation Agent",
            "Validation Agent"
        ]
    }

@app.post("/orchestrate-study-plan", response_model=StudyPlanProposalResponse)
def orchestrate_study_plan(request: StudyPlanRequest):
    """
    Executes the multi-agent pipeline:
    Planning -> Learning Analysis -> Recommendation -> Deterministic Validation
    """
    try:
        response = StudyPlanOrchestrator.run_pipeline(request)
        return response
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agentic orchestration error: {str(ex)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
