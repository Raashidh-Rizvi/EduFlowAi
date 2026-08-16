import time
from typing import Dict, Any, Callable, List, Optional, Tuple
from core.errors import ToolUnavailable, ValidationError

# Permitted tool registry schema
class ToolDefinition:
    def __init__(self, name: str, description: str, allowed_agents: List[str], handler: Callable):
        self.name = name
        self.description = description
        self.allowed_agents = allowed_agents
        self.handler = handler


# -----------------------------------------------------------------------------
# Tool Handlers (Simulated backend data & draft generators)
# -----------------------------------------------------------------------------

def tool_get_course_content(params: Dict[str, Any]) -> Dict[str, Any]:
    course_id = params.get("course_id", "CS-301")
    return {
        "course_id": course_id,
        "title": "Advanced Database Architecture & Clean Systems",
        "modules": [
            {
                "module_id": "MOD-01",
                "title": "Relational Modeling & Indexing",
                "topics": ["PostgreSQL Schema Design", "B-Tree Indexes", "Composite Indexes", "Execution Plans"]
            },
            {
                "module_id": "MOD-02",
                "title": "Transaction Isolation & Concurrency",
                "topics": ["ACID Guarantees", "Deadlock Prevention", "EF Core Migrations", "Optimistic Locking"]
            },
            {
                "module_id": "MOD-03",
                "title": "Clean Architecture & Domain Boundaries",
                "topics": ["Repository Pattern", "Dependency Inversion", "Domain Events", "CQRS Separation"]
            }
        ]
    }

def tool_get_student_progress(params: Dict[str, Any]) -> Dict[str, Any]:
    student_id = params.get("student_id", "student-uuid")
    return {
        "student_id": student_id,
        "completion_rate_pct": 68.5,
        "completed_lessons": ["MOD-01-L01", "MOD-01-L02", "MOD-02-L01"],
        "active_streak": 4,
        "weekly_xp": 420,
        "time_on_task_minutes": 185.0
    }

def tool_get_quiz_results(params: Dict[str, Any]) -> Dict[str, Any]:
    student_id = params.get("student_id", "student-uuid")
    return {
        "student_id": student_id,
        "recent_quizzes": [
            {
                "quiz_id": "QZ-101",
                "topic": "PostgreSQL Composite Indexes",
                "score_pct": 45.0,
                "mistakes": [
                    "Failed to identify left-prefix rule in multi-column indexes",
                    "Confused sequential scan with bitmap index scan"
                ]
            },
            {
                "quiz_id": "QZ-102",
                "topic": "EF Core Transaction Rollbacks",
                "score_pct": 85.0,
                "mistakes": []
            }
        ],
        "overall_accuracy_pct": 65.0
    }

def tool_create_quiz_draft(params: Dict[str, Any]) -> Dict[str, Any]:
    target_topic = params.get("topic", "PostgreSQL Composite Indexes")
    difficulty = params.get("difficulty", "Medium")
    return {
        "draft_type": "Quiz",
        "topic": target_topic,
        "difficulty": difficulty,
        "questions": [
            {
                "question_id": 1,
                "question_text": f"Which column ordering is required for a composite index on (A, B) to accelerate a query filtered only on B?",
                "blooms_taxonomy": "Analysis",
                "options": [
                    "A composite index on (A, B) cannot optimize queries filtered only on B without A",
                    "Any order is equally performant in B-Trees",
                    "Column B must always be defined as an integer",
                    "Indexes ignore column positions automatically"
                ],
                "correct_index": 0,
                "distractor_rationales": [
                    "Correct: B-tree indexes require the leftmost prefix.",
                    "Incorrect: Position strictly dictates access path.",
                    "Incorrect: Data type is irrelevant to index ordering.",
                    "Incorrect: Engine uses leading prefix."
                ],
                "explanation": "Standard B-Tree composite indexes require matching the leftmost prefix of columns.",
                "points": 10
            }
        ],
        "total_points": 10
    }

def tool_create_challenge_draft(params: Dict[str, Any]) -> Dict[str, Any]:
    weak_topic = params.get("weak_topic", "PostgreSQL Composite Indexes")
    difficulty = params.get("difficulty", "Medium")
    xp = min(params.get("xp_reward", 120), 150) # Safe cap
    coins = min(params.get("coin_reward", 40), 100)
    time_limit = params.get("time_limit_minutes", 15)

    return {
        "draft_type": "AdaptiveChallenge",
        "title": f"Adaptive Quest: {weak_topic} Precision",
        "weak_topic": weak_topic,
        "difficulty": difficulty,
        "xp_reward": xp,
        "coin_reward": coins,
        "time_limit_minutes": time_limit,
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
    topic = params.get("topic", "PostgreSQL Composite Indexes")
    mistakes = params.get("mistakes", ["Composite index ordering"])
    return {
        "feedback_type": "PedagogicalRemediation",
        "topic": topic,
        "summary": f"Targeted practice recommended on {topic}.",
        "actionable_tips": [
            "Always align your WHERE filter order with composite index definitions.",
            "Review query execution plans using EXPLAIN ANALYZE before deploying schema changes."
        ],
        "linked_lesson_id": "MOD-01-L02"
    }

def tool_get_gamification_rules(_: Dict[str, Any] = None) -> Dict[str, Any]:
    return {
        "max_challenge_xp": 150,
        "max_activity_xp": 150,
        "max_challenge_coins": 100,
        "min_study_hours_per_week": 2.0,
        "max_study_hours_per_week": 20.0,
        "streak_shield_threshold_days": 2,
        "xp_per_level_base": 1000
    }


# -----------------------------------------------------------------------------
# Tool Registry Manager
# -----------------------------------------------------------------------------

class ToolRegistry:
    def __init__(self):
        self._registry: Dict[str, ToolDefinition] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        self.register(
            name="get_course_content",
            description="Retrieves course syllabus, modules, and topic taxonomy.",
            allowed_agents=["COORDINATOR_PLANNER", "DOMAIN_ANALYSIS", "ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_get_course_content
        )
        self.register(
            name="get_student_progress",
            description="Retrieves student lesson completions, time-on-task, and active streak.",
            allowed_agents=["COORDINATOR_PLANNER", "DOMAIN_ANALYSIS", "ACTION_TOOL"],
            handler=tool_get_student_progress
        )
        self.register(
            name="get_quiz_results",
            description="Retrieves student quiz scores, recent mistakes, and accuracy metrics.",
            allowed_agents=["COORDINATOR_PLANNER", "DOMAIN_ANALYSIS", "ACTION_TOOL"],
            handler=tool_get_quiz_results
        )
        self.register(
            name="create_quiz_draft",
            description="Generates Bloom's taxonomy tagged quiz questions with distractor rationales.",
            allowed_agents=["ACTION_TOOL", "COORDINATOR_PLANNER"],
            handler=tool_create_quiz_draft
        )
        self.register(
            name="create_challenge_draft",
            description="Generates calibrated interactive micro-challenges with XP and time bounds.",
            allowed_agents=["ACTION_TOOL", "COORDINATOR_PLANNER"],
            handler=tool_create_challenge_draft
        )
        self.register(
            name="generate_feedback_draft",
            description="Generates grounded pedagogical remediation feedback tied to error patterns.",
            allowed_agents=["ACTION_TOOL", "DOMAIN_ANALYSIS"],
            handler=tool_generate_feedback_draft
        )
        self.register(
            name="get_gamification_rules",
            description="Retrieves platform economy constraints, max XP caps, and streak rules.",
            allowed_agents=["COORDINATOR_PLANNER", "DOMAIN_ANALYSIS", "ACTION_TOOL", "VALIDATION_SAFETY"],
            handler=tool_get_gamification_rules
        )

    def register(self, name: str, description: str, allowed_agents: List[str], handler: Callable):
        self._registry[name] = ToolDefinition(name, description, allowed_agents, handler)

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._registry.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": t.name,
                "description": t.description,
                "allowed_agents": t.allowed_agents
            }
            for t in self._registry.values()
        ]

    def execute_tool(self, tool_name: str, agent_role: str, params: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
        tool_def = self.get_tool(tool_name)
        if not tool_def:
            raise ToolUnavailable(f"Tool '{tool_name}' does not exist in permitted tool registry.")

        # Explicit tool permission check
        normalized_role = agent_role.upper().replace(" ", "_").replace("/", "_")
        if not any(allowed in normalized_role for allowed in tool_def.allowed_agents):
            raise ValidationError(
                f"Agent role '{agent_role}' is not authorized to execute tool '{tool_name}'. Allowed: {tool_def.allowed_agents}"
            )

        start_time = time.time()
        try:
            result = tool_def.handler(params)
            duration_ms = max(int((time.time() - start_time) * 1000), 1)
            return result, duration_ms
        except Exception as e:
            raise ToolUnavailable(f"Execution failed for tool '{tool_name}': {str(e)}")

# Global singleton tool registry
tool_registry = ToolRegistry()
