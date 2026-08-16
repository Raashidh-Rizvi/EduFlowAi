import pytest
from models.schemas import (
    StudyPlanRequest, 
    AdaptiveChallengeRequest, 
    DiagnosticQuizRequest,
    RetentionAnalysisRequest,
    CoachChatRequest
)
from graph.workflow import (
    StudyPlanOrchestrator, 
    AdaptiveChallengeOrchestrator, 
    QuizGeneratorOrchestrator,
    RetentionOrchestrator,
    AiCoachOrchestrator,
    AgentTopologyRegistry
)

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
    assert all(log.passed for log in result.audit_trail)


def test_validation_agent_enforces_rules():
    # Test violation of min goal length and min hours
    request = StudyPlanRequest(
        student_id="33333333-3333-3333-3333-333333333333",
        course_id="44444444-4444-4444-4444-444444444444",
        student_name="Alex Rivera",
        target_goal="Goal",  # < 5 chars triggers validation error
        hours_per_week=1.0,   # < 2.0 hrs fails safety constraint
        target_weeks=1
    )

    result = StudyPlanOrchestrator.run_pipeline(request)

    assert result.validation.passed is False
    assert len(result.validation.errors) >= 2
    assert result.status == "ValidationFailed"


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
    assert len(result.questions) >= 2
    assert result.validation_passed is True
    assert result.status == "PendingInstructorApproval"
    assert len(result.audit_trail) == 2


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
    assert result.status == "PendingInstructorApproval"
    assert result.questions[0].blooms_taxonomy_level in ["Knowledge", "Comprehension", "Application", "Analysis"]


def test_retention_agent_risk_interventions():
    # Test at-risk student with 2 days of inactivity and streak
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
    assert any(i.action_type == "StreakShield" for i in result.recommended_interventions)


def test_ai_coach_agent_sub_agent_interconnection():
    request = CoachChatRequest(
        student_id="33333333-3333-3333-3333-333333333333",
        course_id="44444444-4444-4444-4444-444444444444",
        message="Can you explain how composite B-Tree indexes work in PostgreSQL?"
    )

    response = AiCoachOrchestrator.answer_student_query(request)

    assert response.confidence_score >= 0.90
    assert "index" in response.reply.lower() or "b-tree" in response.reply.lower() or "postgresql" in response.reply.lower()
    assert response.suggested_action is not None
    assert response.identified_weak_topic is not None


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
    assert "Automated Quiz Generator Agent" in node_names
    assert "Gamification & Retention Agent" in node_names
    assert "AI Coach & Interactive Tutor Agent" in node_names
