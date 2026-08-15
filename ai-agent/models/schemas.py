from typing import List, Optional
from pydantic import BaseModel, Field

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
    activity_type: str # Lesson | Quiz | Lab | Self-Test
    estimated_minutes: int = 45

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
