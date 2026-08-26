"""
===============================================================================
EduFlow AI - LangGraph Multi-Agent Orchestration & Workflow Pipelines
===============================================================================
This module serves as the central orchestration engine connecting all 7 AI agents:
1. `LangGraphPipeline`:
   - Executes the 11-field `SharedAgentState` LangGraph graph pipeline:
     [START] -> [Planner] -> [Domain Analysis] -> [Action Tool] -> [Validation Guard] -> [Human Gate] -> [END]
2. Specific Domain Orchestrators:
   - `StudyPlanOrchestrator`: Multi-week milestone and daily activity generation.
   - `AdaptiveChallengeOrchestrator`: Targeted remediation micro-quests.
   - `QuizGeneratorOrchestrator`: Hierarchical Bloom's taxonomy assessments.
   - `RetentionOrchestrator`: Habit chain protection & churn risk interventions.
   - `AiCoachOrchestrator`: Conversational tutoring with sub-agent delegation.
3. `AgentTopologyRegistry`:
   - Produces the complete visual and functional topology graph for dashboard rendering.
"""

# Import uuid for workflow identifier generation
import uuid
# Import time for timestamping and duration calculations
import time
# Import typing annotations for flexible dictionaries, lists, and optional fields
from typing import Dict, Any, List, Optional

# Import all Pydantic schemas for requests, responses, execution logs, and topology models
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
    AgentTopologyResponse,
    AgentTopologyNode,
    AgentTopologyEdge,
    AgentExecutionLog,
    DomainFeatureInputs
)
# Import state models: SharedAgentState, WorkflowStatus enum, and ApprovalRecord
from models.state import SharedAgentState, WorkflowStatus, ApprovalRecord

# Import all 7 concrete agent classes
from agents.planner import CoordinatorPlannerAgent
from agents.domain_analysis import DomainAnalysisAgent
from agents.content_action import ActionToolAgent
from agents.validation_guard import ValidationGuardAgent
from agents.quiz_generator import QuizGeneratorAgent
from agents.retention_behavior import RetentionBehaviorAgent
from agents.ai_coach import AiCoachAgent

# Import Human Approval State Machine
from graph.approval_state_machine import ApprovalStateMachine

# Import core observability and resilience utilities
from core.observability import ObservabilityCollector, redact_dict
from core.retry import retry_with_backoff
from tools.registry import tool_registry

# Import the real langgraph StateGraph primitives used to orchestrate LangGraphPipeline.
# `SharedAgentState` (a Pydantic BaseModel) is used directly as the graph's state schema --
# langgraph accepts Pydantic models as state schemas natively, validating every partial
# node update against the model on merge.
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.runnables import RunnableConfig


# -----------------------------------------------------------------------------
# Global Singleton Agent Instances
# -----------------------------------------------------------------------------
planner_agent = CoordinatorPlannerAgent()
domain_agent = DomainAnalysisAgent()
action_agent = ActionToolAgent()
validation_agent = ValidationGuardAgent()
quiz_agent = QuizGeneratorAgent()
retention_agent = RetentionBehaviorAgent()
coach_agent = AiCoachAgent()

# Global in-memory workflow store for active graphs & state machine tracking
ACTIVE_WORKFLOWS: Dict[str, SharedAgentState] = {}


# =============================================================================
# 1. LangGraph Pipeline (Shared Blackboard State Graph)
# =============================================================================
#
# The node functions below are real `langgraph.graph.StateGraph` nodes. Each one wraps
# -- without reimplementing -- the exact same agent method call the pipeline used to make
# sequentially. `SharedAgentState` (a Pydantic BaseModel) is used directly as the graph's
# state schema: langgraph accepts Pydantic models natively, hands each node a validated
# instance, and merges each node's returned partial-update dict back into the channel
# state using last-write-wins semantics per field.
#
# Per-call dependencies that are not part of the persisted blackboard (the running
# `ObservabilityCollector` and the `requires_human_approval` flag) are threaded through
# via `config["configurable"]`, which langgraph passes to every node and conditional-edge
# routing function for the duration of a single `invoke()` call.

def _planner_node(state: SharedAgentState, config: RunnableConfig) -> Dict[str, Any]:
    """
    LangGraph node wrapping `CoordinatorPlannerAgent.build_execution_plan` (Stage 1).

    This node is the graph's entry point and is re-entered directly whenever
    `LangGraphPipeline.process_review_decision` routes a REVISION_REQUESTED decision
    back into the graph -- a genuine cycle back to the planner node rather than a
    duplicated inline call. On that re-entry `state.status` is REVISION_REQUESTED
    (set by the caller immediately before invoking the graph), so this node replans
    and moves status to VALIDATING; `_route_after_planner` then halts the graph there,
    matching the legacy pipeline's behavior of only replanning on revision (it never
    re-ran domain analysis / action / validation after a revision request).
    """
    obs: ObservabilityCollector = config["configurable"]["obs"]

    plan_out, plan_log = planner_agent.build_execution_plan(state.objective, state.studentContext)
    obs.record_agent_duration("Coordinator / Planner Agent", plan_log.execution_time_ms)
    obs.record_token_usage(120, 85)

    updates: Dict[str, Any] = {
        "plan": [s.model_dump() for s in plan_out.steps],
        "executionLogs": state.executionLogs + [plan_log.model_dump()]
    }
    if state.status == WorkflowStatus.REVISION_REQUESTED.value:
        updates["status"] = WorkflowStatus.VALIDATING.value
    return updates


def _route_after_planner(state: SharedAgentState, config: RunnableConfig) -> str:
    """Revision replans halt right after the planner node; fresh runs continue the pipeline."""
    if state.status == WorkflowStatus.VALIDATING.value:
        return END
    return "domain_analysis"


def _domain_analysis_node(state: SharedAgentState, config: RunnableConfig) -> Dict[str, Any]:
    """LangGraph node wrapping `DomainAnalysisAgent.analyze_student_features` (Stage 2)."""
    obs: ObservabilityCollector = config["configurable"]["obs"]

    student_context = state.studentContext
    features = DomainFeatureInputs(
        recent_quiz_scores=student_context.get("recent_quiz_scores", [65.0, 70.0]),
        topic_level_performance=student_context.get("topic_performance", {"PostgreSQL Composite Indexes": 45.0}),
        lesson_completion=student_context.get("lesson_completion", ["MOD-01-L01"]),
        streak=int(student_context.get("streak", 4)),
        time_on_task=float(student_context.get("time_on_task", 185.0)),
        recent_mistakes=student_context.get("mistakes", ["Composite index ordering"])
    )
    analysis_out, domain_log = domain_agent.analyze_student_features(features)
    obs.record_agent_duration("Domain Analysis Agent", domain_log.execution_time_ms)
    obs.record_token_usage(95, 110)

    return {
        "analysis": analysis_out.model_dump(),
        "executionLogs": state.executionLogs + [domain_log.model_dump()]
    }


def _action_node(state: SharedAgentState, config: RunnableConfig) -> Dict[str, Any]:
    """LangGraph node wrapping `ActionToolAgent.execute_controlled_tool` (Stage 3)."""
    obs: ObservabilityCollector = config["configurable"]["obs"]

    # `state.analysis` is the domain-analysis node's already-serialized (model_dump'd) output,
    # so fields are read by dict key here rather than by attribute.
    learning_gaps = state.analysis.get("learningGaps", [])
    weak_topic = learning_gaps[0]["topic"] if learning_gaps else "Core Architecture"
    difficulty = state.analysis.get("recommendedDifficulty", "medium")

    tool_res, tool_log = action_agent.execute_controlled_tool(
        "create_challenge_draft",
        {
            "weak_topic": weak_topic,
            "difficulty": difficulty,
            "xp_reward": 120,
            "coin_reward": 40,
            "time_limit_minutes": 15
        }
    )
    obs.record_agent_duration("Content & Action Tool Agent", tool_log.execution_time_ms)
    obs.record_tool_latency("create_challenge_draft", tool_log.execution_time_ms)
    obs.record_token_usage(140, 160)

    tool_result_entry = {
        "toolName": "create_challenge_draft",
        "executedBy": "ACTION_TOOL",
        "durationMs": tool_log.execution_time_ms,
        "data": tool_res
    }
    return {
        "toolResults": state.toolResults + [tool_result_entry],
        "candidateOutput": tool_res,
        "executionLogs": state.executionLogs + [tool_log.model_dump()]
    }


def _validation_node(state: SharedAgentState, config: RunnableConfig) -> Dict[str, Any]:
    """LangGraph node wrapping `ValidationGuardAgent.validate_candidate_draft` (Stage 4)."""
    obs: ObservabilityCollector = config["configurable"]["obs"]

    val_check, val_log = validation_agent.validate_candidate_draft("AdaptiveChallenge", state.candidateOutput)
    obs.record_agent_duration("Validation & Safety Guard Agent", val_log.execution_time_ms)

    return {
        "status": WorkflowStatus.VALIDATING.value,
        "validation": val_check.model_dump(),
        "executionLogs": state.executionLogs + [val_log.model_dump()]
    }


def _route_after_validation(state: SharedAgentState, config: RunnableConfig) -> str:
    """Branches to the fail / human-gate / auto-complete terminal node, mirroring the legacy if/else."""
    if not state.validation.get("passed", False):
        return "fail"

    requires_human_approval = config["configurable"].get("requires_human_approval", True)
    if requires_human_approval and state.validation.get("requires_human_approval", False):
        return "pending_gate"
    return "auto_complete"


def _fail_node(state: SharedAgentState, config: RunnableConfig) -> Dict[str, Any]:
    """Terminal node for a failed deterministic validation pass."""
    obs: ObservabilityCollector = config["configurable"]["obs"]
    for err in state.validation.get("errors", []):
        obs.record_validation_failure(err)
    return {"status": WorkflowStatus.FAILED.value}


def _pending_gate_node(state: SharedAgentState, config: RunnableConfig) -> Dict[str, Any]:
    """Terminal node for the Human Review Gate (HITL Governance) -- parks the workflow for instructor sign-off."""
    return {
        "status": WorkflowStatus.PENDING_APPROVAL.value,
        "approval": ApprovalRecord(required=True, status="PENDING").model_dump()
    }


def _auto_complete_node(state: SharedAgentState, config: RunnableConfig) -> Dict[str, Any]:
    """Terminal node for direct safe auto-execution when human approval is not mandated."""
    return {
        "status": WorkflowStatus.COMPLETED.value,
        "approval": ApprovalRecord(required=False, status="AUTO_APPROVED").model_dump()
    }


def _build_pipeline_graph():
    """
    Builds and compiles the real `StateGraph` backing `LangGraphPipeline`:

    [START] -> planner -> [domain_analysis -> action -> validation] -> fail            -> [END]
                  ^                                                 -> pending_gate    -> [END]
                  |                                                 -> auto_complete   -> [END]
                  |
                  +-- (conditional edge, REVISION_REQUESTED re-entry) -----------------< [END]

    A `MemorySaver` checkpointer is attached (keyed per-call by `workflow_id` as the
    thread id) so that if a node raises, the partially-completed state up to the last
    successful node is still recoverable via `get_state()` -- matching the legacy
    implementation's in-place mutation, which also preserved partial progress on failure.
    """
    graph = StateGraph(SharedAgentState)

    graph.add_node("planner", _planner_node)
    graph.add_node("domain_analysis", _domain_analysis_node)
    graph.add_node("action", _action_node)
    graph.add_node("validation", _validation_node)
    graph.add_node("fail", _fail_node)
    graph.add_node("pending_gate", _pending_gate_node)
    graph.add_node("auto_complete", _auto_complete_node)

    graph.set_entry_point("planner")
    graph.add_conditional_edges(
        "planner",
        _route_after_planner,
        {"domain_analysis": "domain_analysis", END: END}
    )
    graph.add_edge("domain_analysis", "action")
    graph.add_edge("action", "validation")
    graph.add_conditional_edges(
        "validation",
        _route_after_validation,
        {"fail": "fail", "pending_gate": "pending_gate", "auto_complete": "auto_complete"}
    )
    graph.add_edge("fail", END)
    graph.add_edge("pending_gate", END)
    graph.add_edge("auto_complete", END)

    return graph.compile(checkpointer=MemorySaver())


# Module-level compiled graph singleton, built once at import time and reused across requests.
_PIPELINE_GRAPH = _build_pipeline_graph()


class LangGraphPipeline:
    """
    Executes the 11-field Shared State LangGraph multi-agent graph via a real, compiled
    `langgraph.graph.StateGraph` (see `_build_pipeline_graph` above):

    [START] -> [Planner] -> [Domain Analysis] -> [Action / Tool] -> [Validation Guard] -> [Human Review Gate] -> [END]
                    ^                                                                             |
                    |----------------------------- Revision (conditional edge) --------------------|

    `execute_workflow` and `process_review_decision` are the class's public API and keep
    their exact original signatures and return shapes -- both still return a `SharedAgentState`
    instance -- while internally driving the compiled graph instead of plain sequential calls.
    """
    @staticmethod
    def execute_workflow(
        student_id: str,
        objective: Dict[str, Any],
        student_context: Dict[str, Any],
        requires_human_approval: bool = True
    ) -> SharedAgentState:
        """
        Runs the end-to-end multi-agent pipeline using the 11-field SharedAgentState blackboard.

        Args:
            student_id: UUID of the student.
            objective: High-level goal specification dictionary.
            student_context: Historical performance context dictionary.
            requires_human_approval: Flag indicating if instructor gating is enforced (default True).

        Returns:
            Updated SharedAgentState object.
        """
        workflow_id = f"wf-{uuid.uuid4().hex[:8]}"
        obs = ObservabilityCollector(workflow_id)

        # Initialize the 11-field SharedAgentState
        initial_state = SharedAgentState(
            workflowId=workflow_id,
            studentId=student_id,
            objective=objective,
            studentContext=student_context,
            status=WorkflowStatus.DRAFT.value
        )

        graph_config = {
            "configurable": {
                "thread_id": workflow_id,
                "obs": obs,
                "requires_human_approval": requires_human_approval
            }
        }

        try:
            # Invoke the compiled StateGraph: planner -> domain_analysis -> action -> validation
            # -> (fail | pending_gate | auto_complete). Returns the fully-merged final state dict.
            result_dict = _PIPELINE_GRAPH.invoke(initial_state, config=graph_config)
            state = SharedAgentState.from_graph_dict(result_dict)

            # Record final metrics summary
            state.observabilityMetrics = obs.get_summary().model_dump()
            ACTIVE_WORKFLOWS[workflow_id] = state
            return state

        except Exception as e:
            # Capture failure and update state, preserving whatever progress the graph's
            # checkpointer captured from nodes that completed before the failing one.
            obs.record_failure(str(e))
            try:
                snapshot = _PIPELINE_GRAPH.get_state(graph_config)
                recovered = dict(snapshot.values) if snapshot and snapshot.values else {}
            except Exception:
                recovered = {}
            merged = {**initial_state.model_dump(), **recovered}
            state = SharedAgentState.from_graph_dict(merged)
            state.status = WorkflowStatus.FAILED.value
            state.observabilityMetrics = obs.get_summary().model_dump()
            ACTIVE_WORKFLOWS[workflow_id] = state
            raise e

    @staticmethod
    def process_review_decision(
        workflow_id: str,
        decision: str,
        reviewer_id: Optional[str] = None,
        comments: Optional[str] = None
    ) -> SharedAgentState:
        """
        Handles human instructor review decisions (APPROVED, REJECTED, REVISION_REQUESTED)
        and transitions the shared state graph accordingly.

        Args:
            workflow_id: Unique identifier of the active workflow.
            decision: Instructor's decision ('APPROVED' | 'REJECTED' | 'REVISION_REQUESTED').
            reviewer_id: Identifier of the reviewer.
            comments: Feedback or revision guidance.

        Returns:
            Updated SharedAgentState reflecting the decision and new lifecycle status.
        """
        if workflow_id not in ACTIVE_WORKFLOWS:
            # Create a placeholder state if not present
            ACTIVE_WORKFLOWS[workflow_id] = SharedAgentState(
                workflowId=workflow_id,
                studentId="student-uuid",
                status=WorkflowStatus.PENDING_APPROVAL.value
            )

        state = ACTIVE_WORKFLOWS[workflow_id]
        current_status = state.status

        decision_upper = decision.upper()
        if decision_upper == "APPROVED":
            target_status = WorkflowStatus.APPROVED.value
        elif decision_upper == "REJECTED":
            target_status = WorkflowStatus.REJECTED.value
        elif decision_upper in ["REVISION_REQUESTED", "REVISE"]:
            target_status = WorkflowStatus.REVISION_REQUESTED.value
        else:
            target_status = WorkflowStatus.PENDING_APPROVAL.value

        # Execute state machine transition (raises ValidationError on an illegal transition)
        transition_record = ApprovalStateMachine.transition(
            current_status=current_status,
            target_status=target_status,
            reviewer_id=reviewer_id,
            comments=comments
        )

        state.status = target_status
        approval_rec = ApprovalRecord(
            required=True,
            status=target_status,
            reviewerId=reviewer_id,
            reviewedAt=transition_record["timestamp"],
            comments=comments,
            revisionCount=state.approval.get("revisionCount", 0) + (1 if target_status == WorkflowStatus.REVISION_REQUESTED.value else 0)
        )
        state.approval = approval_rec.model_dump()

        # If revision requested, re-enter the compiled graph at its entry point (the planner
        # node) -- a real conditional-edge cycle back to the planner, rather than an inline
        # duplicate call. `_route_after_planner` halts the graph immediately after replanning
        # (status becomes VALIDATING), matching the legacy behavior of only replanning on a
        # revision request without re-running domain analysis / action / validation.
        if target_status == WorkflowStatus.REVISION_REQUESTED.value:
            state.objective["revision_instructions"] = comments
            # This collector's summary is intentionally not persisted onto state.observabilityMetrics,
            # matching the legacy method which never touched that field during a revision replan.
            revision_obs = ObservabilityCollector(workflow_id)
            graph_config = {
                "configurable": {
                    "thread_id": workflow_id,
                    "obs": revision_obs,
                    "requires_human_approval": True
                }
            }
            result_dict = _PIPELINE_GRAPH.invoke(state, config=graph_config)
            state = SharedAgentState.from_graph_dict(result_dict)

        # If approved, advance to completed execution
        elif target_status == WorkflowStatus.APPROVED.value:
            state.status = WorkflowStatus.COMPLETED.value

        ACTIVE_WORKFLOWS[workflow_id] = state
        return state


# =============================================================================
# 2. Study Plan Orchestrator (4-Agent Collaboration)
# =============================================================================

class StudyPlanOrchestrator:
    """
    LangGraph State Machine orchestrating 4 interconnected agents:
    1. Coordinator / Planner Agent (Milestones & Workload)
    2. Domain Analysis Agent (Knowledge Gaps & Mastery)
    3. Content & Action Tool Agent (Adaptive Schedule & Quests)
    4. Validation & Safety Guard Agent (Deterministic Platform Rules)
    """
    @staticmethod
    def run_pipeline(request: StudyPlanRequest) -> StudyPlanProposalResponse:
        workflow_id = f"wf-{uuid.uuid4().hex[:8]}"
        audit_trail: List[AgentExecutionLog] = []

        # Step 1: Coordinator / Planner Agent (Milestone decomposition)
        milestones, plan_log = planner_agent.plan_milestones(request)
        audit_trail.append(plan_log)

        # Step 2: Domain Analysis Agent (Diagnostic knowledge gap evaluation)
        gap_analysis, domain_log = domain_agent.analyze_learning_gaps(
            student_id=request.student_id,
            course_id=request.course_id,
            hint_topic=milestones[0].target_topics[0] if milestones else None
        )
        audit_trail.append(domain_log)

        # Step 3: Content & Action Tool Agent (Activity & Quest formulation)
        schedule, action_log = action_agent.generate_study_schedule(
            target_goal=request.target_goal,
            gap_analysis=gap_analysis
        )
        audit_trail.append(action_log)

        # Step 4: Validation & Safety Guard Agent (Deterministic Rules)
        val_check, val_log = validation_agent.validate_study_plan(
            request=request,
            milestones=milestones,
            schedule=schedule
        )
        audit_trail.append(val_log)

        status = "PendingInstructorApproval" if val_check.passed else "ValidationFailed"

        # Construct shared blackboard state record
        shared_state = SharedAgentState(
            workflowId=workflow_id,
            studentId=request.student_id,
            objective={"goal": request.target_goal, "target_weeks": request.target_weeks, "hours_per_week": request.hours_per_week},
            studentContext={"student_name": request.student_name, "course_id": request.course_id},
            plan=[m.model_dump() for m in milestones],
            analysis=gap_analysis.model_dump(),
            candidateOutput={"schedule": [s.model_dump() for s in schedule]},
            validation=val_check.model_dump(),
            status=WorkflowStatus.PENDING_APPROVAL.value if val_check.passed else WorkflowStatus.FAILED.value
        )
        ACTIVE_WORKFLOWS[workflow_id] = shared_state

        return StudyPlanProposalResponse(
            workflow_id=workflow_id,
            student_id=request.student_id,
            course_id=request.course_id,
            target_goal=request.target_goal,
            milestones=milestones,
            gap_analysis=gap_analysis,
            schedule=schedule,
            validation=val_check,
            audit_trail=audit_trail,
            status=status,
            shared_state=shared_state.model_dump()
        )


# =============================================================================
# 3. Adaptive Challenge Orchestrator
# =============================================================================

class AdaptiveChallengeOrchestrator:
    """
    Orchestrates Domain Analysis, Content Generation, and Validation Guard agents
    to generate calibrated micro-challenges.
    """
    @staticmethod
    def generate_challenge(request: AdaptiveChallengeRequest) -> AdaptiveChallengeResponse:
        audit_trail: List[AgentExecutionLog] = []

        # Step 1: Content & Action Tool Agent
        challenge, action_log = action_agent.generate_adaptive_challenge(request)
        audit_trail.append(action_log)

        # Step 2: Validation Guard Agent
        val_check, val_log = validation_agent.validate_adaptive_challenge(challenge)
        audit_trail.append(val_log)

        challenge.validation_passed = val_check.passed
        challenge.validation = val_check
        challenge.audit_trail = audit_trail
        challenge.status = "PendingInstructorApproval" if val_check.passed else "ValidationFailed"

        return challenge


# =============================================================================
# 4. Quiz Generator Orchestrator
# =============================================================================

class QuizGeneratorOrchestrator:
    """
    Orchestrates Quiz Generator Agent and Validation Guard Agent for curriculum assessments
    across Course, Module, and Topic/Lesson scopes with gamification economy validation.
    """
    @staticmethod
    def generate_quiz(request: DiagnosticQuizRequest) -> DiagnosticQuizResponse:
        audit_trail: List[AgentExecutionLog] = []

        # Step 1: Quiz Generator Agent (Curriculum assessment synthesis)
        quiz, gen_log = quiz_agent.generate_quiz(request)
        audit_trail.append(gen_log)

        # Step 2: Validation Guard Agent (Deterministic rules & gamification caps)
        val_check, val_log = validation_agent.validate_quiz_assessment(quiz)
        audit_trail.append(val_log)

        quiz.validation_passed = val_check.passed
        quiz.validation = val_check
        quiz.audit_trail = audit_trail
        quiz.status = "PendingInstructorApproval" if val_check.passed else "ValidationFailed"
        return quiz


# =============================================================================
# 5. Retention Orchestrator
# =============================================================================

class RetentionOrchestrator:
    """
    Orchestrates Retention & Behavior Agent with Gamification Economy rules.
    """
    @staticmethod
    def analyze_retention(request: RetentionAnalysisRequest) -> RetentionRiskResponse:
        audit_trail: List[AgentExecutionLog] = []

        # Step 1: Retention Agent
        res, ret_log = retention_agent.analyze_retention(request)
        audit_trail.append(ret_log)

        res.audit_trail = audit_trail
        return res


# =============================================================================
# 6. AI Coach Orchestrator
# =============================================================================

class AiCoachOrchestrator:
    """
    Orchestrates AI Coach with sub-agent calls to Domain Analysis and Content Tool agents.
    """
    @staticmethod
    def answer_student_query(request: CoachChatRequest) -> CoachChatResponse:
        response, coach_log = coach_agent.respond_to_student(request)
        response.audit_log = coach_log
        return response


# =============================================================================
# 7. Agent Topology Registry
# =============================================================================

class AgentTopologyRegistry:
    """
    Registry providing full metadata and visual topology of all 7 interconnected agents.
    """
    @staticmethod
    def get_topology() -> AgentTopologyResponse:
        nodes = [
            AgentTopologyNode(
                id="coordinator-planner",
                name=planner_agent.name,
                role=planner_agent.role_description,
                ownership=planner_agent.member_owner,
                status="Active",
                capabilities=["Goal Decomposition", "Milestone Allocation", "Tool Whitelisting", "Delegation"]
            ),
            AgentTopologyNode(
                id="domain-analysis",
                name=domain_agent.name,
                role=domain_agent.role_description,
                ownership=domain_agent.member_owner,
                status="Active",
                capabilities=["Telemetry Ingestion", "Grounded Learning Gaps", "Mastery Evaluation", "Next Action Selection"]
            ),
            AgentTopologyNode(
                id="content-action",
                name=action_agent.name,
                role=action_agent.role_description,
                ownership=action_agent.member_owner,
                status="Active",
                capabilities=["Tool Registry Execution", "Adaptive Challenges", "Lab Quests", "Pedagogical Feedback"]
            ),
            AgentTopologyNode(
                id="validation-guard",
                name=validation_agent.name,
                role=validation_agent.role_description,
                ownership=validation_agent.member_owner,
                status="Active",
                capabilities=["Deterministic Rules", "XP Caps (<=150)", "Schema Integrity", "Safety Boundaries", "Approval Gating"]
            ),
            AgentTopologyNode(
                id="quiz-generator",
                name=quiz_agent.name,
                role=quiz_agent.role_description,
                ownership=quiz_agent.member_owner,
                status="Active",
                capabilities=["Bloom's Taxonomy Tagging", "Distractor Rationales", "Diagnostic Quizzes"]
            ),
            AgentTopologyNode(
                id="retention-behavior",
                name=retention_agent.name,
                role=retention_agent.role_description,
                ownership=retention_agent.member_owner,
                status="Active",
                capabilities=["Streak Protection", "Drop-off Detection", "Motivational Interventions"]
            ),
            AgentTopologyNode(
                id="ai-coach",
                name=coach_agent.name,
                role=coach_agent.role_description,
                ownership=coach_agent.member_owner,
                status="Active",
                capabilities=["Contextual Tutoring", "Sub-Agent Delegation", "Personalized Advice"]
            )
        ]

        edges = [
            AgentTopologyEdge(source="coordinator-planner", target="domain-analysis", label="Passes Objective & Constraints"),
            AgentTopologyEdge(source="domain-analysis", target="content-action", label="Supplies Diagnosed Gaps"),
            AgentTopologyEdge(source="domain-analysis", target="retention-behavior", label="Feeds Learning Velocity"),
            AgentTopologyEdge(source="content-action", target="validation-guard", label="Submits Candidate Drafts"),
            AgentTopologyEdge(source="quiz-generator", target="validation-guard", label="Submits Assessment Drafts"),
            AgentTopologyEdge(source="retention-behavior", target="validation-guard", label="Validates Intervention Economy"),
            AgentTopologyEdge(source="ai-coach", target="domain-analysis", label="Queries Student Weak Spots"),
            AgentTopologyEdge(source="ai-coach", target="content-action", label="Requests Practice Quests"),
            AgentTopologyEdge(source="validation-guard", target="coordinator-planner", label="Signals Approval Gate Ready")
        ]

        return AgentTopologyResponse(
            service_name="EduFlow Multi-Agent System",
            status="Healthy",
            version="2.0.0",
            nodes=nodes,
            edges=edges
        )
