import uuid
from typing import Dict, Any, List
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
    AgentExecutionLog
)
from agents.planner import CoordinatorPlannerAgent
from agents.domain_analysis import DomainAnalysisAgent
from agents.content_action import ActionToolAgent
from agents.validation_guard import ValidationGuardAgent
from agents.quiz_generator import QuizGeneratorAgent
from agents.retention_behavior import RetentionBehaviorAgent
from agents.ai_coach import AiCoachAgent

# Instantiate singleton agent ecosystem
planner_agent = CoordinatorPlannerAgent()
domain_agent = DomainAnalysisAgent()
action_agent = ActionToolAgent()
validation_agent = ValidationGuardAgent()
quiz_agent = QuizGeneratorAgent()
retention_agent = RetentionBehaviorAgent()
coach_agent = AiCoachAgent()


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

        # Step 1: Coordinator / Planner Agent
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
            status=status
        )


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


class QuizGeneratorOrchestrator:
    """
    Orchestrates Quiz Generator Agent and Validation Guard Agent for curriculum assessments.
    """
    @staticmethod
    def generate_quiz(request: DiagnosticQuizRequest) -> DiagnosticQuizResponse:
        audit_trail: List[AgentExecutionLog] = []

        # Step 1: Quiz Generator Agent
        quiz, gen_log = quiz_agent.generate_quiz(request)
        audit_trail.append(gen_log)

        quiz.audit_trail = audit_trail
        return quiz


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


class AiCoachOrchestrator:
    """
    Orchestrates AI Coach with sub-agent calls to Domain Analysis and Content Tool agents.
    """
    @staticmethod
    def answer_student_query(request: CoachChatRequest) -> CoachChatResponse:
        response, coach_log = coach_agent.respond_to_student(request)
        response.audit_log = coach_log
        return response


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
                capabilities=["Goal Decomposition", "Milestone Allocation", "Dependency Resolution"]
            ),
            AgentTopologyNode(
                id="domain-analysis",
                name=domain_agent.name,
                role=domain_agent.role_description,
                ownership=domain_agent.member_owner,
                status="Active",
                capabilities=["Knowledge Gap Diagnosis", "Error Analysis", "Cognitive Load Index"]
            ),
            AgentTopologyNode(
                id="content-action",
                name=action_agent.name,
                role=action_agent.role_description,
                ownership=action_agent.member_owner,
                status="Active",
                capabilities=["Adaptive Challenges", "Lab Quests", "Tool Registry Execution"]
            ),
            AgentTopologyNode(
                id="validation-guard",
                name=validation_agent.name,
                role=validation_agent.role_description,
                ownership=validation_agent.member_owner,
                status="Active",
                capabilities=["Deterministic Rules", "XP Caps", "Schema Integrity", "Approval Gating"]
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
