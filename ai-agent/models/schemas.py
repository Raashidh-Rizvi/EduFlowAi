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
# 2. Planner & Tool Schemas
# -----------------------------------------------------------------------------
class PlanStepModel(BaseModel):
    stepId: str
    action: str
    owner: str
    params: Dict[str, Any] = Field(default_factory=dict)

class PlannerOutput(BaseModel):
    steps: List[PlanStepModel]
    total_estimated_hours: float = 0.0
    rationale: str = ""


# -----------------------------------------------------------------------------
# 3. Domain Analysis Telemetry & Grounded Output Schemas
# -----------------------------------------------------------------------------
class LearningGapItem(BaseModel):
    topic: str
    accuracy_pct: float
    evidence: str  # Linked to specific test scores or mistakes

class StrengthItem(BaseModel):
    topic: str
    accuracy_pct: float
    evidence: str

class DomainFeatureInputs(BaseModel):
    recent_quiz_scores: List[float] = Field(default_factory=lambda: [65.0, 70.0])
    topic_level_performance: Dict[str, float] = Field(default_factory=lambda: {"PostgreSQL Composite Indexes": 45.0, "EF Core Migrations": 85.0})
    lesson_completion: List[str] = Field(default_factory=lambda: ["MOD-01-L01", "MOD-01-L02"])
    challenge_completion: Dict[str, Any] = Field(default_factory=lambda: {"completed": 3, "attempted": 4})
    streak: int = 4
    xp_trend: List[int] = Field(default_factory=lambda: [50, 60, 120, 90])
    time_on_task: float = 185.0  # Minutes
    recent_mistakes: List[str] = Field(default_factory=lambda: ["Missed leftmost prefix index ordering in query planner"])

class DomainAnalysisOutput(BaseModel):
    learningGaps: List[LearningGapItem]
    strengths: List[StrengthItem]
    recommendedDifficulty: str = "medium"  # easy | medium | hard | boss
    engagementState: str = "healthy"       # healthy | at_risk | inactive | surging
    nextBestAction: str = "CHALLENGE"      # LESSON | QUIZ | CHALLENGE | LAB | STREAK_PROTECT | COACH_NUDGE
    cognitiveLoadIndex: float = 0.65
    masteryLevel: str = "Intermediate"


# -----------------------------------------------------------------------------
# 4. Deterministic Validation Schemas
# -----------------------------------------------------------------------------
class ValidationCheck(BaseModel):
    passed: bool
    errors: List[str] = []
    warnings: List[str] = []
    deterministic_rule_count: int = 5
    checked_at: Optional[str] = None
    requires_human_approval: bool = True
    validated_layers: List[str] = [
        "1. JSON Schema Integrity",
        "2. Course Curriculum Reference",
        "3. Platform Business Rules (XP <= 150)",
        "4. Safety & Grade Isolation",
        "5. Approval Gating Decision"
    ]


# -----------------------------------------------------------------------------
# 5. Human Approval & Workflow State Machine Schemas
# -----------------------------------------------------------------------------
class WorkflowDecisionRequest(BaseModel):
    decision: str = Field(..., description="'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'")
    comments: Optional[str] = None
    reviewer_id: Optional[str] = "Instructor-1"

class WorkflowDecisionResponse(BaseModel):
    workflow_id: str
    previous_status: str
    current_status: str
    decision: str
    reviewer_id: Optional[str]
    comments: Optional[str]
    transition_timestamp: str
    message: str


# -----------------------------------------------------------------------------
# 6. Study Plan Orchestration Schemas
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
    shared_state: Optional[Dict[str, Any]] = None


# -----------------------------------------------------------------------------
# 7. Adaptive Challenge Generation Schemas
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
# 8. Automated Quiz & Assessment Schemas (Hierarchical & Customizable)
# -----------------------------------------------------------------------------
class GamificationRewardConfig(BaseModel):
    xp_reward: int = 60
    coin_reward: int = 25
    streak_bonus_eligible: bool = True
    badge_trigger_name: Optional[str] = "Quiz Champion"
    passing_score_percent: int = 70

class QuestionOptionModel(BaseModel):
    text: str
    isCorrect: bool = False
    displayOrder: int = 1

class QuizQuestionModel(BaseModel):
    question_id: int
    question_text: str
    question_type: str = "MULTIPLE_CHOICE"  # MULTIPLE_CHOICE | MULTIPLE_SELECT | TRUE_FALSE | SHORT_ANSWER | FILL_IN_THE_BLANK | MATCHING | ORDERING | SCENARIO_BASED | TIMED_CHALLENGE
    blooms_taxonomy_level: str = "Application"  # Knowledge | Comprehension | Application | Analysis | Synthesis | Evaluation
    options: List[str] = Field(default_factory=list)
    option_details: List[QuestionOptionModel] = Field(default_factory=list)
    correct_index: int = 0
    correct_answer: Optional[str] = None
    distractor_rationales: List[str] = Field(default_factory=list)
    explanation: str = ""
    points: int = 10
    marks: int = 10
    difficulty: str = "MEDIUM"
    sourceContentId: Optional[str] = None
    sourceContentVersion: Optional[str] = "v1.0"
    learningObjective: Optional[str] = None
    sourceReference: Optional[str] = None
    code_snippet: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class QuestionDistributionConfig(BaseModel):
    question_types: Dict[str, int] = Field(default_factory=lambda: {"MULTIPLE_CHOICE": 3, "TRUE_FALSE": 1, "MULTIPLE_SELECT": 1})
    difficulty: Dict[str, int] = Field(default_factory=lambda: {"EASY": 1, "MEDIUM": 3, "HARD": 1})

class DiagnosticQuizRequest(BaseModel):
    course_id: Optional[str] = "44444444-4444-4444-4444-444444444444"
    course_title: Optional[str] = "Software Engineering & Architecture"
    scope_type: str = "TOPIC"  # "COURSE" | "MODULE" | "TOPIC" | "CONTENT_ITEM"
    scope_id: Optional[str] = None
    module_id: Optional[str] = None
    module_title: Optional[str] = "Relational Modeling & Indexing"
    topic_id: Optional[str] = None
    topic_title: Optional[str] = None
    lesson_title: Optional[str] = None
    scope_level: str = "Topic"
    target_topics: List[str] = Field(default_factory=lambda: ["PostgreSQL Schema Design", "B-Tree Indexes"])
    learning_objectives: List[str] = Field(default_factory=lambda: ["LO-01", "LO-02"])
    quiz_type: str = "MIXED"  # MULTIPLE_CHOICE | MULTIPLE_SELECT | TRUE_FALSE | SHORT_ANSWER | FILL_IN_THE_BLANK | MATCHING | ORDERING | SCENARIO_BASED | TIMED_CHALLENGE | MIXED
    question_types: List[str] = Field(default_factory=lambda: ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE"])
    difficulty: str = "MEDIUM"  # "EASY" | "MEDIUM" | "HARD" | "BOSS"
    blooms_taxonomy_focus: str = "Application"
    question_count: int = Field(default=5, ge=1, le=25)
    time_limit_minutes: int = Field(default=15, ge=2, le=90)
    time_limit_seconds: int = Field(default=900, ge=60, le=5400)
    attempts_allowed: int = Field(default=3, ge=1, le=10)
    pass_percentage: int = Field(default=70, ge=1, le=100)
    randomize_questions: bool = True
    randomize_options: bool = True
    distribution: Optional[QuestionDistributionConfig] = None
    gamification: Optional[GamificationRewardConfig] = None

class DiagnosticQuizResponse(BaseModel):
    quiz_id: str
    workflow_id: str
    title: str
    scope_type: str = "TOPIC"
    scope_id: Optional[str] = None
    scope_level: str = "Topic"
    target_topics: List[str]
    difficulty: str
    quiz_type: str = "MIXED"
    questions: List[QuizQuestionModel]
    total_points: int
    time_limit_minutes: int = 15
    time_limit_seconds: int = 900
    pass_percentage: int = 70
    attempts_allowed: int = 3
    randomize_questions: bool = True
    randomize_options: bool = True
    gamification_rewards: GamificationRewardConfig
    validation_passed: bool
    validation: ValidationCheck
    audit_trail: List[AgentExecutionLog] = []
    status: str = "READY_FOR_REVIEW"  # DRAFT -> AI_GENERATING -> VALIDATING -> READY_FOR_REVIEW -> APPROVED -> PUBLISHED

class SingleQuestionRegenerateRequest(BaseModel):
    question_id: int
    focus_topic: Optional[str] = None
    prompt_guidance: Optional[str] = None
    target_type: Optional[str] = "MULTIPLE_CHOICE"
    target_difficulty: Optional[str] = "MEDIUM"
    learning_objective: Optional[str] = None
    source_content_id: Optional[str] = None

class SingleQuestionRegenerateResponse(BaseModel):
    question: QuizQuestionModel
    validation_passed: bool
    audit_log: AgentExecutionLog



# -----------------------------------------------------------------------------
# 9. Retention & Gamification Schemas
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
# 10. AI Coach Chat Schemas
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


# -----------------------------------------------------------------------------
# 11. Next Best Action (Game Loop Learning Orchestration)
# -----------------------------------------------------------------------------
class SkillMasteryTelemetryItem(BaseModel):
    topic_name: str
    skill_name: Optional[str] = None
    mastery_percentage: int
    total_attempts: int = 0
    correct_attempts: int = 0

class NextBestActionRequest(BaseModel):
    student_id: str
    student_name: str = "Alex Rivera"
    level: int = 12
    total_xp: int = 6420
    streak: int = 14
    course_name: str = "Python Programming & Architecture"
    skills: List[SkillMasteryTelemetryItem] = Field(default_factory=list)

class NextBestActionResponse(BaseModel):
    action_type: str  # TAKE_REMEDIATION_QUIZ | TAKE_BOSS_CHALLENGE | WATCH_LESSON | REVIEW_TOPIC | DO_CHALLENGE | REST
    title: str
    description: str
    target_topic: str
    reason: str
    estimated_time_minutes: int = 10
    reward_xp: int = 75
    edubuddy_message: str
    audit_log: AgentExecutionLog

