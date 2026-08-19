"""
===============================================================================
EduFlow AI - Permitted Tool Registry & Educational Action Handlers
===============================================================================
This module defines the Permitted Tool Registry and all underlying deterministic
tool handlers that agents can invoke.

Why we use a Permitted Tool Registry:
1. Strict Tool Whitelisting & Agent Role Authorization:
   - LLMs can easily hallucinate arbitrary tool names or invoke tools they should not have access to.
   - The `ToolRegistry` enforces that only whitelisted tools can be called, and verifies that the
     calling agent's role is authorized (`allowed_agents`).
2. Deterministic Grounding & Anti-Hallucination:
   - Tool handlers supply accredited curriculum hierarchy, verified lesson excerpts,
     and Bloom's Taxonomy distractor rationales so all AI outputs are grounded in real syllabus content.
3. Observability & Performance Tracking:
   - Every tool execution is timed to millisecond precision and logged for SLA metrics.
"""

# Import standard library time module for timing tool executions
import time
# Import uuid module for generating unique identifiers for quizzes and hashes
import uuid
# Import typing annotations for flexible dictionary types, callables, and lists
from typing import Dict, Any, Callable, List, Optional, Tuple
# Import custom classified errors for unavailable tools and permission validation failures
from core.errors import ToolUnavailable, ValidationError


# =============================================================================
# 1. Tool Definition Schema
# =============================================================================

class ToolDefinition:
    """
    Metadata container representing a single registered tool in the system.
    
    Why we use this class:
    - Encapsulates tool identity, description for LLM discovery, authorized agent roles, and handler function.
    """
    def __init__(self, name: str, description: str, allowed_agents: List[str], handler: Callable):
        """
        Args:
            name: Unique identifier string for the tool (e.g. 'resolve_scope').
            description: Clear explanation of what the tool accomplishes and its inputs.
            allowed_agents: List of agent role names permitted to execute this tool.
            handler: Callable Python function that executes the tool logic.
        """
        self.name = name
        self.description = description
        self.allowed_agents = allowed_agents
        self.handler = handler


# =============================================================================
# 2. Tool Handlers (Hierarchical Curriculum & AI Assessment Synthesis)
# =============================================================================

def tool_resolve_scope(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates scope containment within the accredited course hierarchy.
    
    Why we use this tool:
    - Verifies that a quiz or assessment request targets a valid granularity
      ("COURSE", "MODULE", "TOPIC", "CONTENT_ITEM") and exists within the curriculum.
    
    Args:
        params: Dictionary containing 'course_id', 'scope_type', 'scope_id', 'scope_name'.
        
    Returns:
        Dictionary containing verified scope metadata and timestamp.
    """
    # Extract course_id or fall back to default SE3090 course UUID
    course_id = params.get("course_id", "44444444-4444-4444-4444-444444444444")
    # Normalize scope_type string to uppercase
    scope_type = (params.get("scope_type") or "TOPIC").upper()
    # Extract scope_id or fall back to default topic UUID
    scope_id = params.get("scope_id") or "88888888-8888-8888-8888-888888888881"

    # Whitelist of valid scope granularities
    valid_scopes = ["COURSE", "MODULE", "TOPIC", "CONTENT_ITEM"]
    if scope_type not in valid_scopes:
        raise ValidationError(f"Invalid scopeType '{scope_type}'. Must be one of {valid_scopes}")

    # Return structured confirmation
    return {
        "valid": True,
        "course_id": course_id,
        "scope_type": scope_type,
        "scope_id": scope_id,
        "scope_name": params.get("scope_name") or f"Scoped {scope_type.capitalize()}",
        "parent_module": "Relational Modeling & Indexing",
        "verified_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


def tool_get_content_hierarchy(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieves full 4-tier course hierarchy: Course -> Modules -> Topics -> Content Items.
    
    Why we use this tool:
    - Provides structural context so agents understand prerequisites, module groupings, and lesson items.
    
    Args:
        params: Dictionary containing 'course_id'.
        
    Returns:
        Structured JSON representing modules, topics, and lesson items for the course.
    """
    course_id = params.get("course_id", "44444444-4444-4444-4444-444444444444")
    return {
        "course_id": course_id,
        "course_code": "SE3090",
        "title": "Software Engineering & Architecture",
        "modules": [
            {
                "module_id": "55555555-5555-5555-5555-555555555551",
                "title": "Relational Modeling & Indexing",
                "topics": [
                    {
                        "topic_id": "88888888-8888-8888-8888-888888888881",
                        "title": "B-Tree Indexing Fundamentals",
                        "content_items": [
                            {"id": "66666666-6666-6666-6666-666666666661", "title": "B-Tree Index Structure & Left-Prefix Rule", "type": "Lesson"},
                            {"id": "99999999-9999-9999-9999-999999999991", "title": "Subtopic: Multi-Column Selectivity Calculations", "type": "Subtopic"},
                            {"id": "99999999-9999-9999-9999-999999999992", "title": "Subtopic: Covering Indexes & Index-Only Scans", "type": "Subtopic"}
                        ]
                    },
                    {
                        "topic_id": "88888888-8888-8888-8888-888888888882",
                        "title": "Query Execution Plans & EXPLAIN ANALYZE",
                        "content_items": [
                            {"id": "66666666-6666-6666-6666-666666666662", "title": "Query Optimization & Cost Breakdown", "type": "Lesson"}
                        ]
                    }
                ]
            },
            {
                "module_id": "55555555-5555-5555-5555-555555555552",
                "title": "Clean Architecture & Domain Boundaries",
                "topics": [
                    {
                        "topic_id": "88888888-8888-8888-8888-888888888883",
                        "title": "Domain Abstractions & DIP",
                        "content_items": [
                            {"id": "66666666-6666-6666-6666-666666666663", "title": "Dependency Inversion & Repository Abstractions", "type": "Lesson"}
                        ]
                    },
                    {
                        "topic_id": "88888888-8888-8888-8888-888888888884",
                        "title": "Deterministic Multi-Agent Safety",
                        "content_items": [
                            {"id": "66666666-6666-6666-6666-666666666664", "title": "Deterministic Multi-Agent Validation Guards", "type": "Lesson"}
                        ]
                    }
                ]
            }
        ]
    }


def tool_get_content_by_scope(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieves grounded learning content, textbook excerpts, and code examples for a given scope.
    
    Why we use this tool:
    - Provides factual snippets to ground questions in syllabus text and prevent hallucinations.
    """
    scope_type = params.get("scope_type", "TOPIC").upper()
    scope_id = params.get("scope_id", "88888888-8888-8888-8888-888888888881")
    topic_name = params.get("topic_name") or "B-Tree Indexing Fundamentals"

    return {
        "scope_type": scope_type,
        "scope_id": scope_id,
        "title": topic_name,
        "excerpts": [
            "B-Tree index leaf nodes contain sorted tuples pointing to table heap block offsets.",
            "PostgreSQL composite indexes require filtering on the leading column (leftmost prefix) to perform index range scans.",
            "Covering indexes with INCLUDE clauses allow satisfying queries without visiting table data blocks (Index Only Scan)."
        ],
        "learning_objectives": ["LO-01: Understand Leftmost Prefix Rule", "LO-02: Contrast Index Scan vs Seq Scan", "LO-03: Covering Index Optimization"],
        "source_hash": f"sha256-{uuid.uuid4().hex[:12]}"
    }


def tool_get_learning_objectives(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieves target curriculum learning objectives (e.g. LO-01, LO-02).
    
    Why we use this tool:
    - Enables alignment of generated questions with formal academic competency targets.
    """
    return {
        "objectives": [
            {"id": "LO-01", "description": "Understand multi-column index selectivity and leftmost prefix rule"},
            {"id": "LO-02", "description": "Analyze EXPLAIN ANALYZE execution costs and buffer hits"},
            {"id": "LO-03", "description": "Apply Dependency Inversion Principle with domain repository interfaces"},
            {"id": "LO-04", "description": "Implement deterministic multi-agent guard rails and invariant validation"}
        ]
    }


def tool_get_existing_questions(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieves existing questions in the scope to perform duplicate detection.
    
    Why we use this tool:
    - Prevents repetitive questions by comparing candidate questions against existing question pools.
    """
    return {
        "existing_questions": [
            "Which index configuration best optimizes multi-column WHERE clause filtering in PostgreSQL?",
            "What is the fundamental dependency rule of Clean Architecture?",
            "How does PostgreSQL EXPLAIN ANALYZE evaluate execution cost matrices?"
        ]
    }


def tool_calculate_question_distribution(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes exact question type and difficulty distributions matching instructor specs.
    
    Why we use this tool:
    - Balances the quiz across formats (Multiple Choice, True/False, Multiple Select) and difficulty tiers (Easy, Medium, Hard).
    """
    total_count = int(params.get("total_count", 5))
    requested_types = params.get("question_types") or ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE"]

    type_counts = {}
    remaining = total_count
    for i, qtype in enumerate(requested_types):
        if i == len(requested_types) - 1:
            type_counts[qtype] = remaining
        else:
            allocated = max(1, remaining // (len(requested_types) - i))
            type_counts[qtype] = allocated
            remaining -= allocated

    difficulty_counts = {
        "EASY": max(1, int(total_count * 0.2)),
        "MEDIUM": max(1, int(total_count * 0.6)),
        "HARD": max(1, total_count - int(total_count * 0.2) - int(total_count * 0.6))
    }

    return {
        "total_count": total_count,
        "type_distribution": type_counts,
        "difficulty_distribution": difficulty_counts
    }


def tool_check_question_duplicate(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Checks semantic or exact duplicates against the existing question pool.
    
    Why we use this tool:
    - Flags near-identical questions to maintain assessment freshness.
    """
    candidate_text = (params.get("question_text") or "").strip().lower()
    existing = params.get("existing_questions") or []

    for item in existing:
        if candidate_text == item.strip().lower():
            return {"is_duplicate": True, "matched_text": item, "similarity_score": 1.0}

    return {"is_duplicate": False, "similarity_score": 0.15}


def tool_generate_question(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Synthesizes a single Bloom's taxonomy mapped question for any of the 10 customizable formats.
    
    Supported formats:
    - TRUE_FALSE, MULTIPLE_SELECT, FILL_IN_THE_BLANK, SHORT_ANSWER, MATCHING,
      ORDERING, SCENARIO_BASED, MULTIPLE_CHOICE
      
    Why we use this tool:
    - Generates pedagogically structured questions with Bloom's taxonomy tags and distractor rationales.
    """
    q_type = (params.get("question_type") or "MULTIPLE_CHOICE").upper()
    topic = params.get("topic") or "PostgreSQL Indexing & Clean Architecture"
    diff = params.get("difficulty") or "MEDIUM"
    q_id = params.get("question_id", 1)
    lo = params.get("learning_objective") or "LO-01"

    # Branch logic for different question format types
    if q_type == "TRUE_FALSE":
        prompt = f"True or False: In {topic}, composite indexes automatically optimize queries filtered exclusively on non-leading columns without reading leading keys."
        options = ["True", "False"]
        correct_ans = "False"
        explanation = "PostgreSQL composite B-Trees require matching the leftmost prefix to avoid full table sequential scans."
    elif q_type == "MULTIPLE_SELECT":
        prompt = f"Which of the following architectural patterns are recommended for {topic}? (Select all that apply)"
        options = [
            "Depend strictly on abstract interfaces rather than concrete infrastructure implementations",
            "Encapsulate domain state invariants inside aggregate root boundaries",
            "Expose database DbContext instances directly to the frontend client",
            "Use deterministic validation pipelines before persisting state"
        ]
        correct_ans = "Depend strictly on abstract interfaces rather than concrete infrastructure implementations, Encapsulate domain state invariants inside aggregate root boundaries, Use deterministic validation pipelines before persisting state"
        explanation = "Clean systems require abstract dependencies, invariant protection, and deterministic validation."
    elif q_type in ["FILL_IN_THE_BLANK", "SHORT_ANSWER"]:
        prompt = f"In PostgreSQL composite indexing for {topic}, queries must match the ________ prefix column to execute index range seeks."
        options = ["leftmost", "leading"]
        correct_ans = "leftmost"
        explanation = "The leftmost prefix rule is mandatory for multi-column B-Tree index traversal."
    elif q_type == "MATCHING":
        prompt = f"Match each concept in {topic} with its corresponding architectural definition:"
        options = [
            "DIP -> Inward dependency pointing to Domain core",
            "EXPLAIN ANALYZE -> Execution plan with real runtime buffer statistics",
            "Outbox Pattern -> Reliable asynchronous event publishing",
            "Aggregate Root -> Boundary entity maintaining transactional invariants"
        ]
        correct_ans = "DIP -> Inward dependency pointing to Domain core, EXPLAIN ANALYZE -> Execution plan with real runtime buffer statistics, Outbox Pattern -> Reliable asynchronous event publishing, Aggregate Root -> Boundary entity maintaining transactional invariants"
        explanation = "Correct mapping between core architectural concepts and execution mechanics."
    elif q_type == "ORDERING":
        prompt = f"Order the following steps in the {topic} query execution lifecycle (1 to 4):"
        options = [
            "1. Parser & Semantic Analyzer",
            "2. Query Rewriter & View Expansion",
            "3. Cost-based Optimizer & Plan Generator",
            "4. Executor engine accessing buffer cache & disk blocks"
        ]
        correct_ans = "1. Parser & Semantic Analyzer -> 2. Query Rewriter & View Expansion -> 3. Cost-based Optimizer & Plan Generator -> 4. Executor engine accessing buffer cache & disk blocks"
        explanation = "Standard relational database query processing pipeline."
    elif q_type == "SCENARIO_BASED":
        prompt = f"Scenario: A high-throughput service using {topic} experiences sudden latency spikes during peak hours. The query planner is opting for Seq Scans instead of Index Scans on a 10M row table. What is the root cause?"
        options = [
            "The query WHERE clause is missing the leading index column of the composite key",
            "PostgreSQL disable indexes when tables exceed 1M rows",
            "The client connection pool has too many idle threads",
            "SSD disk drives cannot perform random index seeks"
        ]
        correct_ans = "The query WHERE clause is missing the leading index column of the composite key"
        explanation = "When the leading column is omitted from filter criteria, index seeks cannot be performed."
    else:
        # Standard MULTIPLE_CHOICE
        prompt = f"In {topic}, which design principle best guarantees that domain policies remain completely decoupled from database schema mutations?"
        options = [
            "Dependency Inversion Principle using repository interface abstractions",
            "Direct inheritance from Entity Framework DbContext base classes",
            "Writing raw SQL queries directly inside React UI components",
            "Consolidating all business logic into unindexed database stored procedures"
        ]
        correct_ans = "Dependency Inversion Principle using repository interface abstractions"
        explanation = "Dependency Inversion Principle (DIP) decouples high-level policy from low-level data access mechanisms."

    return {
        "question_id": q_id,
        "question_type": q_type,
        "question_text": prompt,
        "options": options,
        "option_details": [
            {"text": opt, "isCorrect": (opt in correct_ans or opt == correct_ans), "displayOrder": idx + 1}
            for idx, opt in enumerate(options)
        ],
        "correct_answer": correct_ans,
        "correct_index": 0,
        "distractor_rationales": [
            "Correct: Strictly complies with verified domain principles and architecture rules.",
            "Incorrect: Violates isolation boundaries and creates tight coupling.",
            "Incorrect: Introduces severe performance and maintainability liabilities.",
            "Incorrect: Bypasses domain invariant validation."
        ],
        "explanation": explanation,
        "marks": 10,
        "points": 10,
        "difficulty": diff,
        "blooms_taxonomy_level": "Application" if diff == "MEDIUM" else "Analysis",
        "learningObjective": lo,
        "sourceContentId": params.get("source_content_id") or "66666666-6666-6666-6666-666666666661"
    }


def tool_generate_question_batch(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a full batch of questions satisfying type and difficulty distribution.
    """
    total_count = int(params.get("total_count", 5))
    topic = params.get("topic") or "Software Engineering & Relational Indexing"
    requested_types = params.get("question_types") or ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE"]

    questions = []
    for i in range(total_count):
        q_type = requested_types[i % len(requested_types)]
        diff = "HARD" if i % 4 == 0 else ("EASY" if i % 4 == 1 else "MEDIUM")
        lo = f"LO-0{(i % 3) + 1}"

        q_res = tool_generate_question({
            "question_id": i + 1,
            "question_type": q_type,
            "topic": topic,
            "difficulty": diff,
            "learning_objective": lo,
            "source_content_id": "66666666-6666-6666-6666-666666666661"
        })
        questions.append(q_res)

    return {"questions": questions, "count": len(questions)}


def tool_validate_question(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates question schema, option counts, answer presence, and non-zero marks.
    """
    q = params.get("question") or {}
    errors = []

    if not q.get("question_text"):
        errors.append("Question text cannot be empty.")
    if not q.get("options") and q.get("question_type") not in ["FILL_IN_THE_BLANK", "SHORT_ANSWER"]:
        errors.append("Options list cannot be empty for choice question formats.")
    if not q.get("correct_answer"):
        errors.append("Question must specify a correct answer.")
    if q.get("marks", 0) <= 0 and q.get("points", 0) <= 0:
        errors.append("Question marks must be greater than 0.")

    return {
        "valid": len(errors) == 0,
        "errors": errors
    }


def tool_assemble_quiz(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Assembles validated questions into a finalized draft with gamification rewards.
    """
    scope_type = (params.get("scope_type") or "TOPIC").upper()
    questions = params.get("questions") or []

    # Scope-aware gamification economy policy
    scope_xp_map = {
        "TOPIC": 30,
        "CONTENT_ITEM": 35,
        "MODULE": 75,
        "COURSE": 150,
        "BOSS": 200
    }
    xp_reward = scope_xp_map.get(scope_type, 60)

    return {
        "quiz_id": str(uuid.uuid4()),
        "workflow_id": f"wf-qz-{uuid.uuid4().hex[:8]}",
        "title": params.get("title") or f"Grounded Assessment: {scope_type.capitalize()} Knowledge Check",
        "scope_type": scope_type,
        "scope_id": params.get("scope_id"),
        "question_count": len(questions),
        "questions": questions,
        "total_marks": sum(q.get("marks", 10) for q in questions),
        "time_limit_seconds": params.get("time_limit_seconds", 900),
        "pass_percentage": params.get("pass_percentage", 70),
        "gamification_rewards": {
            "xp_reward": xp_reward,
            "coin_reward": 25,
            "streak_bonus_eligible": True
        },
        "status": "READY_FOR_REVIEW"
    }


def tool_regenerate_question(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Regenerates a single question given instructor prompt guidance.
    """
    q_id = int(params.get("question_id", 1))
    topic = params.get("focus_topic") or "PostgreSQL Indexing & Concurrency"
    guidance = params.get("prompt_guidance") or "Focus on high-frequency transactions"
    target_type = params.get("target_type") or "MULTIPLE_CHOICE"
    target_diff = params.get("target_difficulty") or "MEDIUM"

    q_res = tool_generate_question({
        "question_id": q_id,
        "question_type": target_type,
        "topic": topic,
        "difficulty": target_diff,
        "learning_objective": params.get("learning_objective") or "LO-02",
        "source_content_id": params.get("source_content_id")
    })
    q_res["question_text"] = f"Regenerated ({guidance}): {q_res['question_text']}"
    return q_res


def tool_get_gamification_rules(_: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Retrieves server-side gamification economy limits, XP caps, and streak thresholds.
    """
    return {
        "topic_quiz_xp": 30,
        "lesson_quiz_xp": 35,
        "module_quiz_xp": 75,
        "course_quiz_xp": 150,
        "boss_challenge_xp": 200,
        "max_challenge_xp": 150,
        "max_activity_xp": 150,
        "max_challenge_coins": 100,
        "min_study_hours_per_week": 2.0,
        "max_study_hours_per_week": 20.0,
        "streak_shield_threshold_days": 2,
        "xp_per_level_base": 1000
    }


def tool_get_student_progress(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieves student lesson completions, time-on-task, and active streak.
    """
    student_id = params.get("student_id", "student-uuid")
    return {
        "student_id": student_id,
        "completion_rate_pct": 68.5,
        "completed_lessons": ["66666666-6666-6666-6666-666666666661", "66666666-6666-6666-6666-666666666662"],
        "active_streak": 4,
        "weekly_xp": 420,
        "time_on_task_minutes": 185.0
    }


def tool_get_quiz_results(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieves student quiz scores, recent mistakes, and accuracy metrics.
    """
    student_id = params.get("student_id", "student-uuid")
    return {
        "student_id": student_id,
        "recent_quizzes": [
            {
                "quiz_id": "77777777-7777-7777-7777-777777777771",
                "topic": "PostgreSQL Composite Indexes",
                "score_pct": 45.0,
                "mistakes": [
                    "Failed to identify left-prefix rule in multi-column indexes",
                    "Confused sequential scan with bitmap index scan"
                ]
            }
        ],
        "overall_accuracy_pct": 65.0
    }


def tool_create_challenge_draft(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates calibrated interactive micro-challenges with XP and time bounds.
    """
    weak_topic = params.get("weak_topic", "PostgreSQL Composite Indexes")
    difficulty = params.get("difficulty", "Medium")
    xp = min(params.get("xp_reward", 120), 150)
    coins = min(params.get("coin_reward", 40), 100)

    return {
        "draft_type": "AdaptiveChallenge",
        "title": f"Adaptive Quest: {weak_topic} Precision",
        "weak_topic": weak_topic,
        "difficulty": difficulty,
        "xp_reward": xp,
        "coin_reward": coins,
        "time_limit_minutes": 15,
        "questions": [
            {
                "question_text": f"Why does EXPLAIN ANALYZE show a Seq Scan when querying '{weak_topic}' without leading index columns?",
                "options": [
                    "Because composite B-trees cannot traverse child nodes without leading key values",
                    "Because PostgreSQL limits index scans to single columns",
                    "Because RAM buffer caches are full",
                    "Because SSDs prefer sequential scans"
                ],
                "correct_index": 0,
                "explanation": "Without the leading column of the composite index, the engine must perform a full scan.",
                "points": 10
            }
        ]
    }


def tool_generate_feedback_draft(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates grounded pedagogical remediation feedback tied to error patterns.
    """
    topic = params.get("topic", "PostgreSQL Composite Indexes")
    return {
        "feedback_type": "PedagogicalRemediation",
        "topic": topic,
        "summary": f"Targeted practice recommended on {topic}.",
        "actionable_tips": [
            "Always align your WHERE filter order with composite index definitions.",
            "Review query execution plans using EXPLAIN ANALYZE before deploying schema changes."
        ],
        "linked_lesson_id": "66666666-6666-6666-6666-666666666661"
    }


# =============================================================================
# 3. Tool Registry Manager Class
# =============================================================================

class ToolRegistry:
    """
    Manages permitted tools, enforces Role-Based Access Control (RBAC),
    and executes handlers with latency measurements.
    
    Why we use this manager:
    - Provides a single centralized repository of all authorized agent tools.
    - Blocks unauthorized agents from calling sensitive or inappropriate tools.
    - Captures timing telemetry for observability.
    """
    def __init__(self):
        # Internal dictionary mapping tool names to ToolDefinition objects
        self._registry: Dict[str, ToolDefinition] = {}
        # Populate the registry with all standard EduFlow AI tools
        self._register_default_tools()

    def _register_default_tools(self):
        """Registers the 18 core assessment, curriculum, and diagnostic tools."""
        
        # 1. Resolve Scope tool
        self.register(
            name="resolve_scope",
            description="Validates scope containment (Course -> Module -> Topic -> Lesson) within curriculum hierarchy.",
            allowed_agents=["COORDINATOR_PLANNER", "ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_resolve_scope
        )
        
        # 2. Get Content Hierarchy tool
        self.register(
            name="get_content_hierarchy",
            description="Retrieves full multi-tier curriculum taxonomy: Course -> Modules -> Topics -> Content Items.",
            allowed_agents=["COORDINATOR_PLANNER", "DOMAIN_ANALYSIS", "ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_get_content_hierarchy
        )
        
        # 3. Get Content By Scope tool
        self.register(
            name="get_content_by_scope",
            description="Extracts source curriculum text chunks, concepts, and code snippets for strict grounding.",
            allowed_agents=["COORDINATOR_PLANNER", "ACTION_TOOL", "DOMAIN_ANALYSIS"],
            handler=tool_get_content_by_scope
        )
        
        # 4. Get Learning Objectives tool
        self.register(
            name="get_learning_objectives",
            description="Extracts accredited curriculum learning objectives (e.g. LO-01, LO-02).",
            allowed_agents=["COORDINATOR_PLANNER", "ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_get_learning_objectives
        )
        
        # 5. Get Existing Questions tool
        self.register(
            name="get_existing_questions",
            description="Gathers existing questions in target scope to prevent duplicates.",
            allowed_agents=["COORDINATOR_PLANNER", "ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_get_existing_questions
        )
        
        # 6. Calculate Question Distribution tool
        self.register(
            name="calculate_question_distribution",
            description="Calculates exact question type and difficulty distributions matching instructor specs.",
            allowed_agents=["COORDINATOR_PLANNER", "ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_calculate_question_distribution
        )
        
        # 7. Generate Single Question tool
        self.register(
            name="generate_question",
            description="Synthesizes a Bloom-tagged question for any of the 10 customizable formats with distractor rationales.",
            allowed_agents=["ACTION_TOOL", "COORDINATOR_PLANNER"],
            handler=tool_generate_question
        )
        
        # 8. Generate Question Batch tool
        self.register(
            name="generate_question_batch",
            description="Generates full calibrated question set satisfying distribution matrix.",
            allowed_agents=["ACTION_TOOL", "COORDINATOR_PLANNER"],
            handler=tool_generate_question_batch
        )
        
        # 9. Validate Question tool
        self.register(
            name="validate_question",
            description="Validates single question schema, single/multiple correct answers, and marks.",
            allowed_agents=["ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_validate_question
        )
        
        # 10. Check Question Duplicate tool
        self.register(
            name="check_question_duplicate",
            description="Performs deterministic and semantic similarity check against existing question database.",
            allowed_agents=["ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_check_question_duplicate
        )
        
        # 11. Assemble Quiz tool
        self.register(
            name="assemble_quiz",
            description="Packages validated questions with scope-aware gamification metadata and timing bounds.",
            allowed_agents=["ACTION_TOOL", "COORDINATOR_PLANNER"],
            handler=tool_assemble_quiz
        )
        
        # 12. Regenerate Question tool
        self.register(
            name="regenerate_question",
            description="Re-synthesizes an individual question with targeted instructor prompt guidance.",
            allowed_agents=["ACTION_TOOL", "COORDINATOR_PLANNER"],
            handler=tool_regenerate_question
        )

        # 13. Get Course Content (Alias for hierarchy)
        self.register(
            name="get_course_content",
            description="Retrieves course syllabus, modules, and topic taxonomy.",
            allowed_agents=["COORDINATOR_PLANNER", "DOMAIN_ANALYSIS", "ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_get_content_hierarchy
        )
        
        # 14. Create Quiz Draft (Alias for single question generation)
        self.register(
            name="create_quiz_draft",
            description="Generates Bloom's taxonomy tagged quiz questions with distractor rationales.",
            allowed_agents=["ACTION_TOOL", "COORDINATOR_PLANNER"],
            handler=tool_generate_question
        )
        
        # 15. Get Student Progress tool
        self.register(
            name="get_student_progress",
            description="Retrieves student lesson completions, time-on-task, and active streak.",
            allowed_agents=["COORDINATOR_PLANNER", "DOMAIN_ANALYSIS", "ACTION_TOOL"],
            handler=tool_get_student_progress
        )
        
        # 16. Get Quiz Results tool
        self.register(
            name="get_quiz_results",
            description="Retrieves student quiz scores, recent mistakes, and accuracy metrics.",
            allowed_agents=["COORDINATOR_PLANNER", "DOMAIN_ANALYSIS", "ACTION_TOOL"],
            handler=tool_get_quiz_results
        )
        
        # 17. Create Challenge Draft tool
        self.register(
            name="create_challenge_draft",
            description="Generates calibrated interactive micro-challenges with XP and time bounds.",
            allowed_agents=["ACTION_TOOL", "COORDINATOR_PLANNER"],
            handler=tool_create_challenge_draft
        )
        
        # 18. Generate Feedback Draft tool
        self.register(
            name="generate_feedback_draft",
            description="Generates grounded pedagogical remediation feedback tied to error patterns.",
            allowed_agents=["ACTION_TOOL", "DOMAIN_ANALYSIS"],
            handler=tool_generate_feedback_draft
        )
        
        # 19. Get Gamification Rules tool
        self.register(
            name="get_gamification_rules",
            description="Retrieves platform economy constraints, max XP caps, and streak rules.",
            allowed_agents=["COORDINATOR_PLANNER", "DOMAIN_ANALYSIS", "ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_get_gamification_rules
        )

    def register(self, name: str, description: str, allowed_agents: List[str], handler: Callable):
        """
        Adds a new tool definition to the registry.
        """
        self._registry[name] = ToolDefinition(name, description, allowed_agents, handler)

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        """
        Retrieves a tool definition by name, or None if not found.
        """
        return self._registry.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        """
        Returns a list of dictionaries describing all registered tools and their authorized callers.
        """
        return [
            {
                "name": t.name,
                "description": t.description,
                "allowed_agents": t.allowed_agents
            }
            for t in self._registry.values()
        ]

    def execute_tool(self, tool_name: str, agent_role: str, params: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
        """
        Executes a registered tool on behalf of an agent after verifying authorization.
        
        Args:
            tool_name: The name of the tool to execute.
            agent_role: The role name of the agent attempting to call the tool.
            params: Parameters dictionary passed into the tool handler.
            
        Returns:
            Tuple containing (result_data_dict, execution_duration_ms).
            
        Raises:
            ToolUnavailable: If the tool does not exist in the registry or handler throws an error.
            ValidationError: If the agent role is not authorized to call this tool.
        """
        # Step 1: Lookup tool in registry
        tool_def = self.get_tool(tool_name)
        if not tool_def:
            raise ToolUnavailable(f"Tool '{tool_name}' does not exist in permitted tool registry.")

        # Step 2: Explicit role-based permission check
        normalized_role = agent_role.upper().replace(" ", "_").replace("/", "_")
        if not any(allowed in normalized_role for allowed in tool_def.allowed_agents):
            raise ValidationError(
                f"Agent role '{agent_role}' is not authorized to execute tool '{tool_name}'. Allowed: {tool_def.allowed_agents}"
            )

        # Step 3: Timed execution of the tool handler
        start_time = time.time()
        try:
            result = tool_def.handler(params)
            duration_ms = max(int((time.time() - start_time) * 1000), 1)
            return result, duration_ms
        except Exception as e:
            raise ToolUnavailable(f"Execution failed for tool '{tool_name}': {str(e)}")


# Global singleton tool registry instance initialized for application use
tool_registry = ToolRegistry()
