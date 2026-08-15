from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Study Plan Schemas ---
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

class StudyPlanActivity(BaseModel):
    day_number: int
    activity_title: str
    description: str
    activity_type: str # Lesson | Quiz | Lab | Self-Test | Boss
    estimated_minutes: int = 45
    xp_reward: int = 40

class ValidationCheck(BaseModel):
    passed: bool
    errors: List[str] = []
    deterministic_rule_count: int

class AgentExecutionLog(BaseModel):
    agent_name: str
    execution_time_ms: int
    summary: str
    passed: bool

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

# --- Adaptive Challenge Generation Schemas ---
class AdaptiveChallengeRequest(BaseModel):
    student_id: str
    course_id: str
    student_level: int = 1
    weak_topic: str = "Clean Architecture"
    target_difficulty: str = "Medium" # Easy | Medium | Hard | Boss

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
    status: str = "PendingInstructorApproval"

# --- AI Coach Chat Schemas ---
class CoachChatRequest(BaseModel):
    student_id: str
    course_id: str
    message: str

class CoachChatResponse(BaseModel):
    reply: str
    suggested_action: Optional[str] = None
    recommended_challenge_id: Optional[str] = None
    confidence_score: float = 0.95
