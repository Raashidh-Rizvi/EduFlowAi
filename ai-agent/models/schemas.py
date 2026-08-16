from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# 1. Base Logs & Agent Topology Schemas
# -----------------------------------------------------------------------------
class AgentExecutionLog(BaseModel):
    agent_name: str
    execution_time_ms: int
    summary: str
    passed: bool
    details: Optional[Dict[str, Any]] = None

class AgentTopologyNode(BaseModel):
    id: str
    name: str
    role: str
    ownership: str
    status: str = "Active"
    capabilities: List[str]

class AgentTopologyEdge(BaseModel):
    source: str
    target: str
    label: str

class AgentTopologyResponse(BaseModel):
    service_name: str
    status: str
    version: str
    nodes: List[AgentTopologyNode]
    edges: List[AgentTopologyEdge]


# -----------------------------------------------------------------------------
# 2. Study Plan Orchestration Schemas (Coordinator/Planner + Domain + Action + Validation)
# -----------------------------------------------------------------------------
class StudyPlanRequest(BaseModel):
    student_id: str = Field(..., description="UUID of the requesting student")
    course_id: str = Field(..., description="UUID of the course")
    student_name: str = "Student"
    target_goal: str = Field(..., min_length=1, description="Student's stated learning goal")
    hours_per_week: float = Field(default=8.0, ge=1.0, le=40.0)
    target_weeks: int = Field(default=2, ge=1, le=16)

class PlanMilestone(BaseModel):
    milestone_id: int
    title: str
    target_topics: List[str]
    estimated_hours: float

class GapAnalysisResult(BaseModel):
    weak_areas: List[str]
    current_progress_pct: float
    recommended_focus: str
    mastery_level: str = "Intermediate"
    cognitive_load_index: float = 0.65

class StudyPlanActivity(BaseModel):
    day_number: int
    activity_title: str
    description: str
    activity_type: str  # Lesson | Quiz | Lab | Self-Test | Boss
    estimated_minutes: int = 45
    xp_reward: int = 40

class ValidationCheck(BaseModel):
    passed: bool
    errors: List[str] = []
    warnings: List[str] = []
    deterministic_rule_count: int = 5
    checked_at: Optional[str] = None

class StudyPlanProposalResponse(BaseModel):
    workflow_id: str
    student_id: str
    course_id: str
    target_goal: str
    milestones: List[PlanMilestone]
    gap_analysis: GapAnalysisResult
    schedule: List[StudyPlanActivity]
    validation: ValidationCheck
    audit_trail: List[AgentExecutionLog]
    status: str = "PendingInstructorApproval"


# -----------------------------------------------------------------------------
# 3. Adaptive Challenge Generation Schemas (Content/Action + Validation)
# -----------------------------------------------------------------------------
class AdaptiveChallengeRequest(BaseModel):
    student_id: str
    course_id: str
    student_level: int = 1
    weak_topic: str = "Clean Architecture"
    target_difficulty: str = "Medium"  # Easy | Medium | Hard | Boss

class ChallengeQuestionItem(BaseModel):
    question_text: str
    options: List[str]
    correct_index: int
    explanation: str
    points: int = 10

class AdaptiveChallengeResponse(BaseModel):
    challenge_id: str
    workflow_id: str
    title: str
    description: str
    difficulty: str
    xp_reward: int
    coin_reward: int
    time_limit_minutes: int
    questions: List[ChallengeQuestionItem]
    validation_passed: bool
    validation: Optional[ValidationCheck] = None
    audit_trail: List[AgentExecutionLog] = []
    status: str = "PendingInstructorApproval"


# -----------------------------------------------------------------------------
# 4. Automated Quiz & Assessment Generation Schemas (Quiz Generator Agent)
# -----------------------------------------------------------------------------
class DiagnosticQuizRequest(BaseModel):
    course_id: str
    module_title: str
    target_topics: List[str] = ["ASP.NET Core", "Entity Framework Core", "PostgreSQL"]
    difficulty: str = "Medium"
    question_count: int = Field(default=3, ge=1, le=10)

class QuizQuestionModel(BaseModel):
    question_id: int
    question_text: str
    blooms_taxonomy_level: str  # Knowledge | Comprehension | Application | Analysis
    options: List[str]
    correct_index: int
    distractor_rationales: List[str]
    explanation: str
    points: int = 10

class DiagnosticQuizResponse(BaseModel):
    quiz_id: str
    workflow_id: str
    title: str
    target_topics: List[str]
    difficulty: str
    questions: List[QuizQuestionModel]
    total_points: int
    validation_passed: bool
    validation: ValidationCheck
    audit_trail: List[AgentExecutionLog] = []
    status: str = "PendingInstructorApproval"


# -----------------------------------------------------------------------------
# 5. Gamification & Retention Intervention Schemas (Retention Agent)
# -----------------------------------------------------------------------------
class RetentionAnalysisRequest(BaseModel):
    student_id: str
    current_streak: int = 0
    days_inactive: int = 0
    recent_quiz_accuracy: float = 80.0
    xp_velocity_7d: int = 120

class RetentionIntervention(BaseModel):
    action_type: str  # "StreakShield" | "XpBoosterQuest" | "RefresherMicroChallenge" | "TutorNudge"
    title: str
    message: str
    reward_xp: int = 50
    reward_coins: int = 20
    urgency_level: str = "Medium"  # Low | Medium | High | Critical

class RetentionRiskResponse(BaseModel):
    workflow_id: str
    student_id: str
    churn_risk_score: float  # 0.0 to 1.0
    streak_health: str  # "Healthy" | "AtRisk" | "Broken" | "Recovered"
    recommended_interventions: List[RetentionIntervention]
    validation_passed: bool
    audit_trail: List[AgentExecutionLog] = []


# -----------------------------------------------------------------------------
# 6. AI Coach Chat Schemas (AiCoachAgent)
# -----------------------------------------------------------------------------
class CoachChatRequest(BaseModel):
    student_id: str
    course_id: str
    message: str

class CoachChatResponse(BaseModel):
    reply: str
    suggested_action: Optional[str] = None
    recommended_challenge_id: Optional[str] = None
    identified_weak_topic: Optional[str] = None
    confidence_score: float = 0.95
    audit_log: Optional[AgentExecutionLog] = None
