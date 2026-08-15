from models.schemas import StudyPlanRequest
from graph.workflow import StudyPlanOrchestrator

def test_multi_agent_pipeline_success():
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
    request = StudyPlanRequest(
        student_id="33333333-3333-3333-3333-333333333333",
        course_id="44444444-4444-4444-4444-444444444444",
        student_name="Alex Rivera",
        target_goal="Goal",  # < 5 chars should trigger validation error
        hours_per_week=1.0,   # Very low hours will fail schedule constraint
        target_weeks=1
    )

    result = StudyPlanOrchestrator.run_pipeline(request)

    assert result.validation.passed is False
    assert len(result.validation.errors) > 0
    assert result.status == "ValidationFailed"
