# EduFlow AI – Agentic AI Subsystem 🧠
> **Multi-Agent Adaptive Orchestration Engine built with LangGraph, LangChain, and Python 3.11**

---

## 1. Subsystem Overview

The EduFlow AI Agentic Subsystem is an internal Python microservice responsible for orchestrating **Adaptive Gamification**. Instead of generic chatbots, it operates a **multi-agent state machine** powered by **LangGraph** where specialized autonomous agents analyze student performance, pinpoint comprehension gaps, generate calibrated game challenges, and enforce **strict deterministic safety guardrails** before queueing items for instructor approval.

---

## 2. Multi-Agent Swarm Architecture

```text
                  +----------------------------------------------+
                  |         Incoming Student Event / Request     |
                  |     (From ASP.NET Core via Internal API)     |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |          1. Learning Analysis Agent          |
                  |  - Analyzes quiz mistakes, scores & velocity |
                  |  - Computes strengths, weaknesses, skill gap |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |       2. Challenge Generation Agent          |
                  |  - Formulates targeted adaptive missions     |
                  |  - Calibrates difficulty, XP rewards & time  |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |       3. Deterministic Validation Guard      |
                  |  - Enforces Pydantic strict JSON schema      |
                  |  - Checks course catalog & syllabus bounds   |
                  |  - Caps max XP reward & verifies solutions   |
                  +----------------------+-----------------------+
                                         |
                  +----------------------+-----------------------+
                  | [Passes Validation]                           | [Fails Validation]
                  v                                               v
+------------------------------------+          +------------------------------------+
|  Queued for Instructor Review      |          |  Fallback State / Self-Correction  |
|  (Appears in HITL React Dashboard) |          |  (Returned with Diagnostic Logs)   |
+------------------------------------+          +------------------------------------+
```

---

## 3. The 4 Specialized AI Agents

### Agent 1 — Learning Analysis Agent
- **Input**: Student profile, course progress, quiz attempt answer history, mistakes.
- **Output**: Detailed skill assessment:
  ```json
  {
    "studentId": "uuid",
    "courseId": "uuid",
    "strengths": ["Python Syntax", "Basic Loops"],
    "weakAreas": ["Nested Loops", "List Comprehensions"],
    "recommendedDifficulty": "Medium",
    "confidenceScore": 0.92
  }
  ```

### Agent 2 — Challenge Generation Agent
- **Input**: Weak areas, target course curriculum, student level, difficulty target.
- **Output**: Adaptive challenge proposal:
  ```json
  {
    "title": "Nested Loop Navigator",
    "description": "Construct a 2D matrix traversal algorithm to escape the dungeon.",
    "difficulty": "Medium",
    "xpReward": 120,
    "coinReward": 40,
    "timeLimitMinutes": 15,
    "questions": [
      {
        "questionText": "What will be the output of the following nested loop?",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 2,
        "explanation": "The inner loop executes 3 times for each of the 4 outer iterations."
      }
    ]
  }
  ```

### Agent 3 — AI Learning Coach (Tool-Augmented)
A conversational tutor equipped with controlled, allow-listed tools:
- `get_student_progress()`: Queries current level, XP, and streak.
- `get_course_content()`: Reads authoritative lesson materials.
- `get_quiz_results()`: Inspects recent mistakes to give contextual hints without giving away the direct answer.
- `recommend_challenge()`: Suggests an instant 5-minute practice mission.
- `explain_question()`: Provides step-by-step conceptual walkthroughs.

### Agent 4 — Deterministic Validation Agent (Guard)
Applies non-negotiable platform rules before any content leaves the AI subsystem:
1. **Schema Integrity**: Validates full Pydantic models.
2. **Catalog Integrity**: Ensures all referenced `course_id`, `module_id`, and `lesson_id` exist.
3. **Reward Bounds**: Validates that $XP \le \text{MaxReward}(\text{Difficulty})$ (e.g., Easy $\le 50$, Medium $\le 150$, Hard $\le 300$).
4. **Answer Completeness**: Verifies every question has at least 2 options, exactly 1 valid `correctIndex`, and a non-empty explanation.

---

## 4. LangGraph State Machine

```python
class AdaptiveChallengeWorkflowState(TypedDict):
    workflow_id: str
    student_id: str
    course_id: str
    student_level: int
    raw_quiz_history: list[dict]
    analysis_report: dict
    generated_challenge: dict
    validation_passed: bool
    validation_errors: list[str]
    audit_trail: list[dict]
    status: str
```

---

## 5. Local Setup & Testing

```bash
# Navigate to AI agent directory
cd ai-agent

# Create virtual environment
python -m venv .venv
source .venv/bin/activate # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run deterministic test suite
pytest tests/

# Run FastAPI server
python main.py
```
