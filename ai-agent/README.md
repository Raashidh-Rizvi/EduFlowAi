# EduFlow AI – Agentic AI Subsystem 🧠
> **Multi-Agent Orchestration Engine built with LangGraph, LangChain, and Python 3.11**

---

## 1. Subsystem Overview

The EduFlow AI Agentic Subsystem is an internal Python microservice responsible for orchestrating multi-step, personalized educational workflows. Unlike simple prompt-completion chatbots, it implements a **stateful multi-agent directed acyclic graph (DAG)** powered by **LangGraph**, where specialized autonomous agents collaborate, invoke allow-listed tools, execute deterministic safety validation, and produce structured study plan proposals for instructor approval.

---

## 2. Multi-Agent Architecture & Specialization

The system incorporates **4 distinct specialized agents**, each with dedicated system prompts, distinct schemas, and least-privilege tool access:

```
                  +----------------------------------------------+
                  |         Incoming Student Goal Request        |
                  |     (From ASP.NET Core via Internal API)     |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |              1. Planning Agent               |
                  |  - Deconstructs objective into learning phases|
                  |  - Coordinates analysis tasks & timeline     |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |          2. Learning Analysis Agent          |
                  |  - Tool: fetch_student_quiz_history()        |
                  |  - Tool: fetch_lesson_completion_velocity()   |
                  |  - Identifies weak topics & comprehension gaps|
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |           3. Recommendation Agent            |
                  |  - Tool: query_course_content_catalog()      |
                  |  - Tool: get_remedial_reading_references()   |
                  |  - Builds tailored daily study sequence      |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |          4. Validation Agent (Guard)         |
                  |  - Deterministic JSON schema verification    |
                  |  - Enforces platform time & scope bounds     |
                  |  - Checks prerequisite coherence & safety    |
                  +----------------------+-----------------------+
                                         |
                 +-----------------------+-----------------------+
                 | [Passes Validation]                           | [Fails Validation]
                 v                                               v
+------------------------------------+          +------------------------------------+
|  Structured Study Plan Proposal    |          |  Safe Rejection / Fallback State   |
|  (Awaiting Instructor Approval)    |          |  (Returned with Diagnostic Errors) |
+------------------------------------+          +------------------------------------+
```

### 2.1 Agent Responsibilities & Tool Allow-List

| Agent Role | Primary Responsibility | Input Contract | Output Contract | Controlled Allow-Listed Tools |
| :--- | :--- | :--- | :--- | :--- |
| **1. Planning Agent** | Decomposes high-level student goals into structured learning milestones. | Student Goal, Available Hours/Week, Target Exam Date | `PlanningMilestoneOutput` | `estimate_curriculum_workload()` |
| **2. Learning Analysis Agent** | Analyzes quiz performance, submission scores, and identifies knowledge gaps. | Student ID, Enrolled Course ID, Milestone Specs | `GapAnalysisReport` | `fetch_student_quiz_scores()`, `fetch_module_progress()` |
| **3. Recommendation Agent** | Assembles curated sequence of review lessons, exercises, and reading materials. | Gap Analysis Report, Available Course Content | `StudySequenceProposal` | `search_course_lessons()`, `get_quiz_practice_bank()` |
| **4. Validation Agent** | Applies deterministic rules, prerequisite validation, and strict JSON schema checks. | Raw Study Proposal, Course Constraints | `ValidatedStudyPlanResult` | `verify_lesson_ids_exist()`, `validate_time_budget()` |

---

## 3. LangGraph State Machine & Schema

The graph maintains a persistent execution state object across all agent transitions:

```python
class StudyPlanWorkflowState(TypedDict):
    workflow_id: str
    student_id: int
    course_id: int
    raw_goal: str
    target_date: str
    hours_per_week: float
    milestones: List[dict]
    knowledge_gaps: List[str]
    proposed_schedule: List[dict]
    validation_passed: bool
    validation_errors: List[str]
    audit_trail: List[dict]
    current_status: str
```

### Deterministic Safety Guardrails
- **No Hallucinated Resources**: The Validation Agent verifies every recommended `lesson_id` and `quiz_id` against the PostgreSQL database catalog.
- **Time Boundary Enforcement**: Verifies total weekly hours do not exceed student constraints or platform caps (max 20 hours/week).
- **Prompt Injection Defense**: Input sanitizer strips prompt injection attempts before delegating to the Planning Agent.
- **Strict Output Schema**: Pydantic models validate LLM outputs; non-conforming responses are automatically retried up to 3 times before failing safely.

---

## 4. Directory Structure

```
ai-agent/
├── agents/                    # Specialized Agent implementations
│   ├── planning_agent.py      # Goal decomposition agent
│   ├── analysis_agent.py      # Knowledge gap analysis agent
│   ├── recommendation_agent.py# Sequence generator agent
│   └── validation_agent.py    # Deterministic rule & schema validator
├── tools/                     # Allow-listed domain tools
│   ├── database_tools.py      # Read-only catalog & score lookups
│   └── validation_tools.py    # Deterministic sanity validators
├── graph/                     # LangGraph StateGraph orchestration
│   ├── state.py               # StudyPlanWorkflowState TypedDict definition
│   └── workflow.py            # Node additions, conditional edges, graph compiler
├── models/                    # Pydantic structured output models
│   └── schemas.py             # PlanRequest, PlanResponse, AuditLogEntry
├── tests/                     # Automated Agent Evaluation & Golden Test Cases
│   ├── test_golden_cases.py   # Golden evaluation test suite
│   ├── test_validation.py     # Schema & boundary unit tests
│   └── test_safety.py         # Prompt injection & safe failure tests
├── main.py                    # FastAPI internal server entry point
├── requirements.txt           # Python dependencies (LangGraph, FastAPI, etc.)
└── README.md                  # This file
```

---

## 5. Local Setup & Execution Guide

### 5.1 Prerequisites
- [Python 3.11+](https://www.python.org/)
- OpenAI API Key / Google Gemini API Key / Local Ollama instance (e.g., `llama3`)

### 5.2 Create Virtual Environment & Install Dependencies
```bash
cd ai-agent

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 5.3 Configure Environment (`.env`)
Create a `.env` file in the `ai-agent` directory:
```env
PORT=8000
INTERNAL_API_SECRET=internal_ai_gateway_secret_token
BACKEND_API_URL=http://localhost:5000/api

# LLM Provider Configuration (OpenAI, Gemini, or Local Ollama)
LLM_PROVIDER=openai # or 'gemini' or 'ollama'
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=gpt-4o-mini # or 'gemini-1.5-flash' or 'llama3'
```

### 5.4 Run the FastAPI Microservice
```bash
python main.py
```
- API will start on: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

---

## 6. Agent Evaluation & Golden Test Suite

To satisfy SE3090 evaluation requirements, the agentic subsystem includes automated golden test suites verifying planning quality, tool selection, schema conformity, and safe failure behavior:

```bash
# Run all agent evaluation tests
pytest tests/ -v
```

### Evaluated Dimensions
1. **Golden Cases**: Predefined student goal scenarios verifying that the generated plan targets the correct weak areas.
2. **Schema Conformity**: 100% adherence to required JSON output contracts.
3. **Safe Failure**: Verifying that invalid input (e.g., non-existent course ID or unachievable timeline) returns a clean, structured diagnostic error without unhandled exceptions.
4. **Prompt Injection Resistance**: Verifying adversarial prompts attempting to bypass instructor review are neutralized by the Validation Agent.
