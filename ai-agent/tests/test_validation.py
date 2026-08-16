import pytest
from models.schemas import (
    StudyPlanRequest, 
    AdaptiveChallengeRequest, 
    DiagnosticQuizRequest,
    RetentionAnalysisRequest,
    CoachChatRequest,
    DomainFeatureInputs,
    WorkflowDecisionRequest
)
from models.state import SharedAgentState, WorkflowStatus
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
from agents.planner import CoordinatorPlannerAgent
from agents.domain_analysis import DomainAnalysisAgent
from agents.content_action import ActionToolAgent
from agents.validation_guard import ValidationGuardAgent
from agents.quiz_generator import QuizGeneratorAgent
from tools.registry import tool_registry, ToolRegistry
from graph.approval_state_machine import ApprovalStateMachine
from core.errors import (
    AIError,
    ValidationError,
    ToolUnavailable,
    Timeout,
    RateLimit,
    ModelFailure,
    InvalidOutput,
    ApprovalTimeout
)
from core.retry import retry_with_backoff
from core.observability import redact_sensitive_info, redact_dict, ObservabilityCollector


# -----------------------------------------------------------------------------
# 1. Agent Roles & Topology Tests
# -----------------------------------------------------------------------------
def test_agent_topology_registry():
    topology = AgentTopologyRegistry.get_topology()

    assert topology.status == "Healthy"
    assert len(topology.nodes) == 7
    assert len(topology.edges) >= 8

    node_names = [n.name for n in topology.nodes]
    assert "Coordinator / Planner Agent" in node_names
    assert "Domain Analysis Agent" in node_names
    assert "Content & Action Tool Agent" in node_names
    assert "Validation & Safety Guard Agent" in node_names


# -----------------------------------------------------------------------------
# 2. Shared Agent State (11 Core Fields) Tests
# -----------------------------------------------------------------------------
def test_shared_agent_state_schema():
    state = SharedAgentState(
        workflowId="wf-test-01",
        studentId="student-uuid-1",
        objective={"goal": "Master PostgreSQL Composite Indexes"},
        studentContext={"course_id": "CS-301"},
        plan=[{"stepId": "1", "action": "ANALYZE_PROGRESS", "owner": "DOMAIN_ANALYSIS"}],
        toolResults=[{"toolName": "get_student_progress", "executedBy": "ACTION_TOOL", "durationMs": 10}],
        analysis={"learningGaps": []},
        candidateOutput={"title": "Index Mastery"},
        validation={"passed": True},
        approval={"required": True, "status": "PENDING"},
        status=WorkflowStatus.DRAFT.value
    )

    state_dict = state.to_graph_dict()
    assert state_dict["workflowId"] == "wf-test-01"
    assert state_dict["status"] == "DRAFT"
    assert "objective" in state_dict
    assert "candidateOutput" in state_dict
    assert "validation" in state_dict
    assert "approval" in state_dict


# -----------------------------------------------------------------------------
# 3. LangGraph Pipeline End-to-End Test
# -----------------------------------------------------------------------------
def test_langgraph_pipeline_execution():
    result_state = LangGraphPipeline.execute_workflow(
        student_id="student-uuid-123",
        objective={"goal": "Master EF Core transactions and PostgreSQL Indexes"},
        student_context={
            "course_id": "CS-301",
            "recent_quiz_scores": [50.0, 60.0],
            "streak": 5,
            "time_on_task": 140.0
        },
        requires_human_approval=True
    )

    assert result_state.workflowId.startswith("wf-")
    assert result_state.status == WorkflowStatus.PENDING_APPROVAL.value
    assert len(result_state.plan) == 4
    assert "learningGaps" in result_state.analysis
    assert "questions" in result_state.candidateOutput
    assert result_state.validation["passed"] is True
    assert result_state.approval["required"] is True
    assert "observabilityMetrics" in result_state.model_dump()


# -----------------------------------------------------------------------------
# 4. Planner Agent & Tool Whitelisting Tests
# -----------------------------------------------------------------------------
def test_planner_tool_whitelisting_success():
    planner = CoordinatorPlannerAgent()
    plan_output, log = planner.build_execution_plan(
        objective={"goal": "Prepare for SQL Midterm"},
        context={"student_id": "std-1", "course_id": "CS-301", "hours_per_week": 8.0}
    )

    assert len(plan_output.steps) == 4
    assert log.passed is True
    assert all(step.owner in ["ACTION_TOOL", "DOMAIN_ANALYSIS", "VALIDATION_SAFETY", "COORDINATOR_PLANNER"] for step in plan_output.steps)


def test_planner_rejects_invented_tools():
    planner = CoordinatorPlannerAgent()
    from models.schemas import PlanStepModel

    invalid_steps = [
        PlanStepModel(stepId="1", action="HACK_DATABASE_ACCESS", owner="ACTION_TOOL")
    ]
    with pytest.raises(ValidationError) as exc:
        planner.validate_plan_tools(invalid_steps)
    assert "unauthorized/invented action" in str(exc.value)


# -----------------------------------------------------------------------------
# 5. Tool Agent & Registry Permissions Tests
# -----------------------------------------------------------------------------
def test_tool_registry_execution():
    tools = tool_registry.list_tools()
    tool_names = [t["name"] for t in tools]
    assert "get_course_content" in tool_names
    assert "get_student_progress" in tool_names
    assert "get_quiz_results" in tool_names
    assert "create_quiz_draft" in tool_names
    assert "create_challenge_draft" in tool_names
    assert "generate_feedback_draft" in tool_names
    assert "get_gamification_rules" in tool_names

    # Test execution
    res, duration_ms = tool_registry.execute_tool(
        "get_gamification_rules",
        "VALIDATION_SAFETY",
        {}
    )
    assert res["max_challenge_xp"] == 150
    assert duration_ms >= 1


def test_tool_registry_permission_denial():
    # Attempting to call create_quiz_draft from an unauthorized role
    with pytest.raises(ValidationError) as exc:
        tool_registry.execute_tool("create_quiz_draft", "UNAUTHORIZED_STUDENT_ROLE", {})
    assert "not authorized" in str(exc.value)


# -----------------------------------------------------------------------------
# 6. Domain Analysis Telemetry & Grounded Evidence Tests
# -----------------------------------------------------------------------------
def test_domain_analysis_with_grounded_evidence():
    agent = DomainAnalysisAgent()
    features = DomainFeatureInputs(
        recent_quiz_scores=[45.0, 50.0],
        topic_level_performance={"PostgreSQL Composite Indexes": 40.0, "Clean Architecture": 88.0},
        lesson_completion=["MOD-01-L01"],
        challenge_completion={"completed": 1, "attempted": 3},
        streak=1,
        xp_trend=[20, 30],
        time_on_task=20.0,  # Low time-on-task
        recent_mistakes=["Missed index leftmost prefix rule"]
    )

    output, log = agent.analyze_student_features(features)

    assert log.passed is True
    assert len(output.learningGaps) >= 1
    assert "PostgreSQL Composite Indexes" in output.learningGaps[0].topic
    assert "40.0%" in output.learningGaps[0].evidence  # Grounded in data
    assert len(output.strengths) >= 1
    assert "Clean Architecture" in output.strengths[0].topic
    assert output.engagementState == "at_risk"
    assert output.nextBestAction in ["STREAK_PROTECT", "CHALLENGE"]


# -----------------------------------------------------------------------------
# 7. Deterministic Validation & Economy Limits (Max XP = 150) Tests
# -----------------------------------------------------------------------------
def test_validation_rejects_excessive_xp_reward():
    val_agent = ValidationGuardAgent()

    # AI proposes XP = 500 (Platform max = 150)
    draft_with_excess_xp = {
        "title": "Super Quest",
        "topic": "PostgreSQL Composite Indexes",
        "xp_reward": 500,  # Violates platform rule
        "coin_reward": 40
    }

    check, log = val_agent.validate_candidate_draft("AdaptiveChallenge", draft_with_excess_xp)

    assert check.passed is False
    assert any("INVALID_REWARD" in err for err in check.errors)
    assert any("500" in err for err in check.errors)


def test_validation_rejects_safety_boundary_mutations():
    val_agent = ValidationGuardAgent()

    # AI attempts to mutate user permissions or alter final grade
    illegal_mutation_draft = {
        "title": "Grade Bypass",
        "assign_grade": "A+",
        "xp_reward": 100
    }

    check, _ = val_agent.validate_candidate_draft("AdaptiveChallenge", illegal_mutation_draft)
    assert check.passed is False
    assert any("SAFETY_VIOLATION" in err for err in check.errors)


# -----------------------------------------------------------------------------
# 8. Human Approval State Machine Tests
# -----------------------------------------------------------------------------
def test_approval_state_machine_happy_path():
    # DRAFT -> VALIDATING -> PENDING_APPROVAL -> APPROVED -> EXECUTING -> COMPLETED
    t1 = ApprovalStateMachine.transition("DRAFT", "VALIDATING")
    assert t1["success"] is True

    t2 = ApprovalStateMachine.transition("VALIDATING", "PENDING_APPROVAL")
    assert t2["success"] is True

    t3 = ApprovalStateMachine.transition("PENDING_APPROVAL", "APPROVED", reviewer_id="Inst-1", comments="Looks great!")
    assert t3["success"] is True

    t4 = ApprovalStateMachine.transition("APPROVED", "EXECUTING")
    assert t4["success"] is True

    t5 = ApprovalStateMachine.transition("EXECUTING", "COMPLETED")
    assert t5["success"] is True


def test_approval_state_machine_rejection_and_revision():
    # PENDING_APPROVAL -> REJECTED
    t_rej = ApprovalStateMachine.transition("PENDING_APPROVAL", "REJECTED", reviewer_id="Inst-1", comments="Unsuitable topic")
    assert t_rej["success"] is True

    # PENDING_APPROVAL -> REVISION_REQUESTED -> VALIDATING
    t_rev = ApprovalStateMachine.transition("PENDING_APPROVAL", "REVISION_REQUESTED", reviewer_id="Inst-1", comments="Add more indexing labs")
    assert t_rev["success"] is True

    t_reval = ApprovalStateMachine.transition("REVISION_REQUESTED", "VALIDATING")
    assert t_reval["success"] is True


def test_approval_state_machine_illegal_transition_blocked():
    with pytest.raises(ValidationError) as exc:
        ApprovalStateMachine.transition("DRAFT", "COMPLETED")
    assert "Illegal state transition" in str(exc.value)


# -----------------------------------------------------------------------------
# 9. Error Classification & Resilience (Retry with Backoff) Tests
# -----------------------------------------------------------------------------
def test_error_classification_hierarchy():
    val_err = ValidationError("Bad format")
    assert val_err.is_retryable is False

    tool_err = ToolUnavailable("DB Down")
    assert tool_err.is_retryable is True

    timeout_err = Timeout("Took too long")
    assert timeout_err.is_retryable is True

    rate_limit_err = RateLimit("Too many requests")
    assert rate_limit_err.is_retryable is True


def test_retry_with_backoff_decorator():
    attempts = 0

    @retry_with_backoff(max_retries=2, initial_delay=0.01, multiplier=1.5, jitter=False)
    def flaky_tool():
        nonlocal attempts
        attempts += 1
        if attempts < 2:
            raise ToolUnavailable("Transient tool connection error")
        return "SUCCESS"

    result = flaky_tool()
    assert result == "SUCCESS"
    assert attempts == 2


def test_retry_with_backoff_fails_fast_on_non_retryable():
    attempts = 0

    @retry_with_backoff(max_retries=3, initial_delay=0.01)
    def non_retryable_operation():
        nonlocal attempts
        attempts += 1
        raise ValidationError("Schema mismatch")

    with pytest.raises(ValidationError):
        non_retryable_operation()

    assert attempts == 1  # Should not retry non-retryable errors


# -----------------------------------------------------------------------------
# 10. AI Observability & PII Redaction Tests
# -----------------------------------------------------------------------------
def test_observability_collector_and_redaction():
    collector = ObservabilityCollector("wf-obs-100")
    collector.record_agent_duration("Planner", 120)
    collector.record_tool_latency("get_course_content", 45)
    collector.record_token_usage(100, 50)
    collector.record_approval_duration(3000)

    summary = collector.get_summary()
    assert summary.workflow_id == "wf-obs-100"
    assert summary.agent_durations["Planner"] == 120
    assert summary.tool_latencies["get_course_content"] == 45
    assert summary.token_usage.total_tokens == 150
    assert summary.approval_duration_ms == 3000

    # Test PII Redaction
    raw_text = "Contact student at alex.rivera@university.edu with Bearer eyJhbGciOiJIUz and secret: myPassword123"
    sanitized = redact_sensitive_info(raw_text)
    assert "alex.rivera@university.edu" not in sanitized
    assert "[REDACTED_EMAIL]" in sanitized
    assert "[REDACTED_TOKEN]" in sanitized
    assert "[REDACTED_SECRET]" in sanitized


# -----------------------------------------------------------------------------
# 11. Study Plan, Adaptive Challenge, Quiz, Retention End-to-End Orchestration
# -----------------------------------------------------------------------------
def test_study_plan_pipeline_end_to_end():
    request = StudyPlanRequest(
        student_id="33333333-3333-3333-3333-333333333333",
        course_id="44444444-4444-4444-4444-444444444444",
        student_name="Alex Rivera",
        target_goal="Prepare for Midterm Quiz in 2 weeks on PostgreSQL Indexing",
        hours_per_week=10.0,
        target_weeks=2
    )

    result = StudyPlanOrchestrator.run_pipeline(request)

    assert result.workflow_id.startswith("wf-")
    assert len(result.milestones) == 2
    assert len(result.schedule) == 4
    assert result.validation.passed is True
    assert result.status == "PendingInstructorApproval"
    assert len(result.audit_trail) == 4


def test_adaptive_challenge_generation():
    request = AdaptiveChallengeRequest(
        student_id="33333333-3333-3333-3333-333333333333",
        course_id="44444444-4444-4444-4444-444444444444",
        student_level=2,
        weak_topic="Entity Framework Core Indexing",
        target_difficulty="Medium"
    )

    result = AdaptiveChallengeOrchestrator.generate_challenge(request)

    assert result.workflow_id.startswith("wf-ch-")
    assert result.difficulty == "Medium"
    assert result.xp_reward == 120
    assert len(result.questions) >= 1
    assert result.validation_passed is True
    assert result.status == "PendingInstructorApproval"


def test_quiz_generator_agent():
    request = DiagnosticQuizRequest(
        course_id="44444444-4444-4444-4444-444444444444",
        module_title="PostgreSQL Indexing & Optimization",
        target_topics=["B-Tree Indexes", "Execution Plans"],
        difficulty="Medium",
        question_count=2
    )

    result = QuizGeneratorOrchestrator.generate_quiz(request)

    assert result.workflow_id.startswith("wf-qz-")
    assert len(result.questions) == 2
    assert result.total_points == 20
    assert result.validation_passed is True
    assert result.gamification_rewards.xp_reward == 100
    assert result.gamification_rewards.coin_reward == 30


def test_hierarchical_topic_and_module_quiz_generation():
    # 1. Topic-level micro-quiz
    topic_req = DiagnosticQuizRequest(
        topic_title="PostgreSQL B-Tree Indexes",
        scope_level="Topic",
        quiz_type="MicroQuiz",
        difficulty="Easy",
        question_count=3
    )
    topic_res = QuizGeneratorOrchestrator.generate_quiz(topic_req)
    assert topic_res.scope_level == "Topic"
    assert "MicroQuiz" in topic_res.title
    assert "PostgreSQL B-Tree Indexes" in topic_res.title
    assert len(topic_res.questions) == 3
    assert topic_res.gamification_rewards.xp_reward <= 150
    assert any(q.question_type == "CodeSnippet" for q in topic_res.questions)
    assert any(q.question_type == "TrueFalse" for q in topic_res.questions)

    # 2. Module-level formative assessment
    mod_req = DiagnosticQuizRequest(
        module_title="Transaction Isolation & Concurrency",
        scope_level="Module",
        quiz_type="Formative",
        difficulty="Hard",
        question_count=4
    )
    mod_res = QuizGeneratorOrchestrator.generate_quiz(mod_req)
    assert mod_res.scope_level == "Module"
    assert "Transaction Isolation & Concurrency" in mod_res.title
    assert len(mod_res.questions) == 4
    assert mod_res.gamification_rewards.xp_reward == 140
    assert mod_res.validation_passed is True


def test_quiz_validation_enforces_gamification_xp_cap():
    from models.schemas import GamificationRewardConfig
    val_agent = ValidationGuardAgent()
    quiz_agent = QuizGeneratorAgent()

    req = DiagnosticQuizRequest(
        topic_title="Clean Architecture Invariants",
        difficulty="Boss",
        question_count=2,
        gamification=GamificationRewardConfig(
            xp_reward=500, # Intentionally violates 150 cap
            coin_reward=200
        )
    )

    # Generate quiz with generator
    quiz_res, _ = quiz_agent.generate_quiz(req)
    # Force excessive reward to test validator
    quiz_res.gamification_rewards.xp_reward = 500
    val_check, _ = val_agent.validate_quiz_assessment(quiz_res)

    assert val_check.passed is False
    assert any("INVALID_REWARD" in err for err in val_check.errors)



def test_retention_agent_risk_interventions():
    request = RetentionAnalysisRequest(
        student_id="33333333-3333-3333-3333-333333333333",
        current_streak=6,
        days_inactive=2,
        recent_quiz_accuracy=55.0,
        xp_velocity_7d=30
    )

    result = RetentionOrchestrator.analyze_retention(request)

    assert result.workflow_id.startswith("wf-ret-")
    assert result.streak_health == "AtRisk"
    assert result.churn_risk_score > 0.4
    assert len(result.recommended_interventions) >= 2


def test_ai_coach_agent():
    request = CoachChatRequest(
        student_id="33333333-3333-3333-3333-333333333333",
        course_id="44444444-4444-4444-4444-444444444444",
        message="Can you explain how composite B-Tree indexes work in PostgreSQL?"
    )

    response = AiCoachOrchestrator.answer_student_query(request)

    assert response.confidence_score >= 0.90
    assert response.suggested_action is not None
