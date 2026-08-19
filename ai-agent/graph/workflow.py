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

class LangGraphPipeline:
    """
    Executes the 11-field Shared State LangGraph multi-agent graph:
    [START] -> [Planner] -> [Domain Analysis] -> [Action / Tool] -> [Validation Guard] -> [Human Review Gate] -> [Execute] -> [END]
                                                                                                 ^           |
                                                                                                 |--Revision-|
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
        state = SharedAgentState(
            workflowId=workflow_id,
            studentId=student_id,
            objective=objective,
            studentContext=student_context,
            status=WorkflowStatus.DRAFT.value
        )

        try:
            # -----------------------------------------------------------------
            # Node 1: Coordinator / Planner Agent (Goal Decomposition & Whitelist)
            # -----------------------------------------------------------------
            plan_out, plan_log = planner_agent.build_execution_plan(objective, student_context)
            state.plan = [s.model_dump() for s in plan_out.steps]
            state.executionLogs.append(plan_log.model_dump())
            obs.record_agent_duration("Coordinator / Planner Agent", plan_log.execution_time_ms)
            obs.record_token_usage(120, 85)

            # -----------------------------------------------------------------
            # Node 2: Domain Analysis Agent (Telemetry Diagnostic Ingestion)
            # -----------------------------------------------------------------
            features = DomainFeatureInputs(
                recent_quiz_scores=student_context.get("recent_quiz_scores", [65.0, 70.0]),
                topic_level_performance=student_context.get("topic_performance", {"PostgreSQL Composite Indexes": 45.0}),
                lesson_completion=student_context.get("lesson_completion", ["MOD-01-L01"]),
                streak=int(student_context.get("streak", 4)),
                time_on_task=float(student_context.get("time_on_task", 185.0)),
                recent_mistakes=student_context.get("mistakes", ["Composite index ordering"])
            )
            analysis_out, domain_log = domain_agent.analyze_student_features(features)
            state.analysis = analysis_out.model_dump()
            state.executionLogs.append(domain_log.model_dump())
            obs.record_agent_duration("Domain Analysis Agent", domain_log.execution_time_ms)
            obs.record_token_usage(95, 110)

            # -----------------------------------------------------------------
            # Node 3: Content & Action Tool Agent (Controlled Tool Execution)
            # -----------------------------------------------------------------
            tool_res, tool_log = action_agent.execute_controlled_tool(
                "create_challenge_draft",
                {
                    "weak_topic": analysis_out.learningGaps[0].topic if analysis_out.learningGaps else "Core Architecture",
                    "difficulty": analysis_out.recommendedDifficulty,
                    "xp_reward": 120,
                    "coin_reward": 40,
                    "time_limit_minutes": 15
                }
            )
            state.toolResults.append({
                "toolName": "create_challenge_draft",
                "executedBy": "ACTION_TOOL",
                "durationMs": tool_log.execution_time_ms,
                "data": tool_res
            })
            state.candidateOutput = tool_res
            state.executionLogs.append(tool_log.model_dump())
            obs.record_agent_duration("Content & Action Tool Agent", tool_log.execution_time_ms)
            obs.record_tool_latency("create_challenge_draft", tool_log.execution_time_ms)
            obs.record_token_usage(140, 160)

            # -----------------------------------------------------------------
            # Node 4: Validation & Safety Guard Agent (Deterministic Rules)
            # -----------------------------------------------------------------
            state.status = WorkflowStatus.VALIDATING.value
            val_check, val_log = validation_agent.validate_candidate_draft("AdaptiveChallenge", state.candidateOutput)
            state.validation = val_check.model_dump()
            state.executionLogs.append(val_log.model_dump())
            obs.record_agent_duration("Validation & Safety Guard Agent", val_log.execution_time_ms)

            # Check if validation failed
            if not val_check.passed:
                for err in val_check.errors:
                    obs.record_validation_failure(err)
                state.status = WorkflowStatus.FAILED.value
                state.observabilityMetrics = obs.get_summary().model_dump()
                ACTIVE_WORKFLOWS[workflow_id] = state
                return state

            # -----------------------------------------------------------------
            # Node 5: Human Review Gate (HITL Governance)
            # -----------------------------------------------------------------
            if requires_human_approval and val_check.requires_human_approval:
                state.status = WorkflowStatus.PENDING_APPROVAL.value
                state.approval = ApprovalRecord(required=True, status="PENDING").model_dump()
            else:
                # Direct safe auto-execution if human approval is not mandated
                state.status = WorkflowStatus.COMPLETED.value
                state.approval = ApprovalRecord(required=False, status="AUTO_APPROVED").model_dump()

            # Record final metrics summary
            state.observabilityMetrics = obs.get_summary().model_dump()
            ACTIVE_WORKFLOWS[workflow_id] = state
            return state

        except Exception as e:
            # Capture failure and update state
            obs.record_failure(str(e))
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

        # Execute state machine transition
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

        # If revision requested, trigger Planner re-evaluation loop
        if target_status == WorkflowStatus.REVISION_REQUESTED.value:
            state.objective["revision_instructions"] = comments
            plan_out, plan_log = planner_agent.build_execution_plan(state.objective, state.studentContext)
            state.plan = [s.model_dump() for s in plan_out.steps]
            state.executionLogs.append(plan_log.model_dump())
            state.status = WorkflowStatus.VALIDATING.value

        # If approved, advance to completed execution
        elif target_status == WorkflowStatus.APPROVED.value:
            state.status = WorkflowStatus.COMPLETED.value

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
