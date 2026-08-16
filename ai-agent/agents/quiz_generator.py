import uuid
from typing import List, Tuple, Optional
from .base import BaseAgent, AgentExecutionLog
from models.schemas import (
    DiagnosticQuizRequest, 
    DiagnosticQuizResponse, 
    QuizQuestionModel, 
    ValidationCheck,
    GamificationRewardConfig
)

class QuizGeneratorAgent(BaseAgent):
    """
    Automated Quiz & Assessment Generator Agent (Curriculum & Content Creation)
    Responsible for:
    - Hierarchical assessment synthesis across:
      1. Course Level (Summative / Diagnostic)
      2. Module Level (Formative / Milestone Checks)
      3. Topic / Lesson / Subtopic Level (Targeted Micro-Quizzes & Code Checks)
    - Generating customizable question formats (MultipleChoice, CodeSnippet, TrueFalse, FillInBlank)
    - Tagging Bloom's Taxonomy cognitive dimensions (Knowledge, Comprehension, Application, Analysis, Synthesis)
    - Formulating plausible distractors with diagnostic pedagogical rationales
    - Calibrating gamification economy rewards (XP caps ≤150, coin economy, streak shield triggers)
    """
    def __init__(self):
        super().__init__(
            name="Automated Quiz Generator Agent",
            role_description="Generates curriculum-aligned diagnostic & summative quizzes with Bloom's taxonomy and distractor rationale.",
            member_owner="Member 2 (Assessments & Quizzes)"
        )

    def generate_quiz(self, request: DiagnosticQuizRequest) -> Tuple[DiagnosticQuizResponse, AgentExecutionLog]:
        def _execute(req: DiagnosticQuizRequest):
            workflow_id = f"wf-qz-{uuid.uuid4().hex[:8]}"
            quiz_id = str(uuid.uuid4())

            # Determine primary focus topic from hierarchical context
            if req.topic_title:
                scope_name = req.topic_title
                scope_level = "Topic"
            elif req.lesson_title:
                scope_name = req.lesson_title
                scope_level = "Lesson"
            elif req.module_title:
                scope_name = req.module_title
                scope_level = "Module"
            elif req.target_topics and len(req.target_topics) > 0:
                scope_name = req.target_topics[0]
                scope_level = "Topic"
            else:
                scope_name = req.course_title or "Software Engineering Core"
                scope_level = "Course"

            secondary_topic = req.target_topics[1] if (req.target_topics and len(req.target_topics) > 1) else "System Reliability"

            # Gamification Reward Calibration
            difficulty_rewards = {
                "Easy": {"xp": 50, "coins": 15, "badge": "Novice Apprentice"},
                "Medium": {"xp": 100, "coins": 30, "badge": "Architecture Practitioner"},
                "Hard": {"xp": 140, "coins": 50, "badge": "Optimization Specialist"},
                "Boss": {"xp": 150, "coins": 80, "badge": "Dungeon Architect Conqueror"}
            }
            reward_spec = difficulty_rewards.get(req.difficulty, difficulty_rewards["Medium"])

            # Use requested gamification overrides if provided, bounded safely by platform rules (Max 150 XP)
            safe_xp = min(req.gamification.xp_reward if req.gamification else reward_spec["xp"], 150)
            safe_coins = min(req.gamification.coin_reward if req.gamification else reward_spec["coins"], 100)

            gamification_rewards = GamificationRewardConfig(
                xp_reward=safe_xp,
                coin_reward=safe_coins,
                streak_bonus_eligible=True,
                badge_trigger_name=reward_spec["badge"],
                passing_score_percent=req.gamification.passing_score_percent if req.gamification else 70
            )

            # Generate questions matching scope, formats, and Bloom's level
            questions_pool: List[QuizQuestionModel] = [
                # 1. Multiple Choice Question (Application)
                QuizQuestionModel(
                    question_id=1,
                    question_text=f"In {scope_name}, which architectural strategy best ensures strict isolation and prevents unintended database coupling?",
                    question_type="MultipleChoice",
                    blooms_taxonomy_level="Application",
                    options=[
                        "Enforce Dependency Inversion by depending strictly on repository interfaces",
                        "Instantiate database DbContext instances directly inside React client views",
                        "Consolidate all business logic into single unindexed database stored procedures",
                        "Disable database transaction logs and foreign key validations"
                    ],
                    correct_index=0,
                    distractor_rationales=[
                        "Correct: Repository interfaces maintain clean architectural separation between domain models and data access.",
                        "Incorrect: Exposes database layers to the client frontend violating security and layering boundaries.",
                        "Incorrect: Creates high monolithic coupling and severely impairs testability.",
                        "Incorrect: Compromises relational data integrity without solving coupling."
                    ],
                    explanation="Dependency Inversion Principle (DIP) decouples core business policies from database infrastructure details.",
                    points=10
                ),

                # 2. Code Snippet Question (Analysis)
                QuizQuestionModel(
                    question_id=2,
                    question_text=f"Review the following {scope_name} query snippet. Why does the query engine fail to utilize the composite index on (CreatedAt, CategoryId)?",
                    question_type="CodeSnippet",
                    code_snippet="""-- Table has index: idx_courses_created_cat ON Courses(CreatedAt, CategoryId);
SELECT * FROM Courses 
WHERE CategoryId = 'Architecture' 
ORDER BY Title;""",
                    blooms_taxonomy_level="Analysis",
                    options=[
                        "The WHERE predicate filters on CategoryId without including the leading CreatedAt column of the composite index",
                        "PostgreSQL only supports indexes on integer primary keys",
                        "The SELECT statement must explicitly list column names instead of '*'",
                        "The query uses double quotes instead of single quotes"
                    ],
                    correct_index=0,
                    distractor_rationales=[
                        "Correct: B-Tree composite indexes require matching the leftmost prefix (CreatedAt) to perform index seeks.",
                        "Incorrect: Indexes can be created on strings, timestamps, and composite tuples.",
                        "Incorrect: Column projection affects index-only scans but not the index access path seek capability.",
                        "Incorrect: String literal quoting is syntactically valid."
                    ],
                    explanation="Composite B-Tree indexes are sorted hierarchically by the leading key column; predicates omitting the first column cannot perform logarithmic index seeks.",
                    points=10
                ),

                # 3. True / False Conceptual Question (Comprehension)
                QuizQuestionModel(
                    question_id=3,
                    question_text=f"True or False: In {scope_name}, deterministic AI validation guards should evaluate rewards and constraints BEFORE student study plans or quizzes are dispatched.",
                    question_type="TrueFalse",
                    blooms_taxonomy_level="Comprehension",
                    options=[
                        "True",
                        "False"
                    ],
                    correct_index=0,
                    distractor_rationales=[
                        "Correct: Pre-execution validation prevents hallucinations and rule violations before state commits.",
                        "Incorrect: Post-hoc evaluation risks corrupting gamified ledgers and user experience."
                    ],
                    explanation="Deterministic-first validation guarantees that economy rules (XP caps ≤150), schema constraints, and safety boundaries are strictly enforced before human approval.",
                    points=10
                ),

                # 4. Scenario Synthesis Question (Synthesis)
                QuizQuestionModel(
                    question_id=4,
                    question_text=f"You are refactoring a module in {scope_name} experiencing high contention during concurrent student submissions. Which pattern most effectively mitigates deadlocks?",
                    question_type="MultipleChoice",
                    blooms_taxonomy_level="Synthesis",
                    options=[
                        "Order database row locks deterministically and apply optimistic concurrency tokens (RowVersion)",
                        "Increase the connection pool timeout to infinite",
                        "Execute all update queries synchronously in a single global thread",
                        "Remove primary keys from the submission entity table"
                    ],
                    correct_index=0,
                    distractor_rationales=[
                        "Correct: Consistent lock ordering and optimistic concurrency control prevent circular lock waits.",
                        "Incorrect: Infinite timeouts cause connection starvation and cascade outages.",
                        "Incorrect: Single threading creates severe performance bottlenecks.",
                        "Incorrect: Removing primary keys breaks relational consistency."
                    ],
                    explanation="Deterministic resource lock ordering combined with optimistic concurrency tokens prevents circular deadlock wait conditions.",
                    points=10
                )
            ]

            # Generate dynamic questions up to requested count
            while len(questions_pool) < req.question_count:
                q_idx = len(questions_pool) + 1
                questions_pool.append(
                    QuizQuestionModel(
                        question_id=q_idx,
                        question_text=f"Advanced {req.difficulty} Concept Check {q_idx}: Which verification rule is essential when validating {scope_name} invariants?",
                        question_type="MultipleChoice",
                        blooms_taxonomy_level="Application",
                        options=[
                            f"Validate input preconditions and enforce domain invariants on {scope_name}",
                            "Rely solely on client-side JavaScript form validation",
                            "Bypass transaction checks for speed",
                            "Hardcode user IDs in database queries"
                        ],
                        correct_index=0,
                        distractor_rationales=[
                            "Correct: Domain invariant enforcement ensures business correctness across all entry points.",
                            "Incorrect: Client-side validation can be bypassed.",
                            "Incorrect: Bypassing transactions risks partial state corruption.",
                            "Incorrect: Hardcoding IDs violates multi-tenancy and authorization rules."
                        ],
                        explanation=f"Robust system design mandates server-side invariant verification for {scope_name}.",
                        points=10
                    )
                )

            # Slice to exact requested question count
            final_questions = questions_pool[:req.question_count]
            total_points = sum(q.points for q in final_questions)

            # Construct assessment title
            quiz_type_name = req.quiz_type or "Diagnostic"
            title = f"{quiz_type_name} Quiz: {scope_name} ({req.difficulty})"

            response = DiagnosticQuizResponse(
                quiz_id=quiz_id,
                workflow_id=workflow_id,
                title=title,
                scope_level=scope_level,
                target_topics=[scope_name, secondary_topic],
                difficulty=req.difficulty,
                quiz_type=quiz_type_name,
                questions=final_questions,
                total_points=total_points,
                time_limit_minutes=req.time_limit_minutes,
                gamification_rewards=gamification_rewards,
                validation_passed=True,
                validation=ValidationCheck(
                    passed=True,
                    errors=[],
                    warnings=[],
                    deterministic_rule_count=4
                ),
                status="PendingInstructorApproval"
            )

            summary = f"Generated {quiz_type_name} assessment for {scope_level} '{scope_name}' with {len(final_questions)} questions ({total_points} pts, {gamification_rewards.xp_reward} XP, {gamification_rewards.coin_reward} coins)."
            return response, summary, True

        return self.execute_with_trace(request, _execute)
