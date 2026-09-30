# EduFlow AI — Learning Agent Complete Walkthrough

> **Author**: Member 1 (Wazni / IT24103352)  
> **Target Audience**: Team members, examiners, and developers  
> **Tone**: Plain, simple English with step-by-step technical explanations  

---

## 1. What is the Learning Agent? (The Big Picture)

Imagine you are a university student studying for an exam. You have a 50-slide PDF lecture. 
A standard AI chatbot just gives generic textbook answers from the internet. 

The **Learning Agent** is different. It is an intelligent tutor built directly into EduFlow AI that:
1. **Reads only your actual lecture slides** (using Atheek's RAG system).
2. **Breaks the lecture into chapters** like a table of contents (*"Break Into Topics"*).
3. **Creates a realistic study timetable** with small tasks and estimated minutes (*"Complete Lecture Study Plan"*).
4. **Explains hard topics in simple words** with exact slide citations (*"Explain This Topic"*).
5. **Remembers your conversation** for up to 3 turns so you can ask natural follow-up questions without repeating yourself.

---

## 2. System Architecture: How Everything Connects

Here is the exact path of a student's click from the browser to the AI and back:

```text
[ 1. React Frontend ] (Student clicks "Break Into Topics" or "Explain")
         │
         ▼  HTTP POST /api/aireview/learn
[ 2. ASP.NET Backend Gateway ] (Checks student login, forwards internal request)
         │
         ▼  HTTP POST http://localhost:8000/api/v1/agent/learn
[ 3. FastAPI Python Engine ] (ai-agent/main.py)
         │
         ▼
[ 4. LearningAgent ] (ai-agent/agents/learning_agent.py)
         │
    ┌────┴─────────────────────────────┬──────────────────────────────┐
    ▼                                  ▼                              ▼
[ BreakdownTool ]              [ StudyPlannerTool ]           [ ExplainerTool ]
(Creates sections)             (Creates study tasks)          (Explains concepts)
    │                                  │                              │
    └──────────────────────────────────┼──────────────────────────────┘
                                       ▼
                       [ 5. Shared RAG System ]
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
       ChromaDB Vector Store                          Active LLM Provider
     (Finds exact slide text)                   (Groq / Google Gemini)
```

---

## 3. File-by-File Explanation (What Every File Does)

### File 1: `ai-agent/agents/learning_agent.py` — The Brain / Orchestrator
* **What it does**: This is the main manager. When a request arrives from the frontend, `LearningAgent` decides which tool should do the job.
* **Key Functions**:
  * `learn(request)`: Checks `request.request_type`:
    * If `"breakdown"` ➔ calls `BreakdownTool`.
    * If `"plan"` ➔ calls `StudyPlannerTool`.
    * If `"explain"` ➔ calls `ExplainerTool`.
  * `chat(...)`: Wraps standard RAG chat with the **Short-Term Memory** buffer so students can ask follow-up questions.
* **Why it's smart**: It prevents cross-lecture mixing. If you are studying Lecture 5, it will never let slides from Lecture 1 sneak in.

---

### File 2: `ai-agent/agents/short_term_memory.py` — The Conversation Notepad
* **What it does**: Remembers recent conversation turns.
* **How it works**:
  * Uses a Python `deque(maxlen=3)` that stores the last **3 question-and-answer pairs**.
  * Creates an isolated memory key using: `student_id + session_id + lecture_name`.
* **Why it matters**:
  * **Turn 1**: Student asks *"What is regression?"* ➔ AI explains regression.
  * **Turn 2**: Student asks *"Can you give a real-life example of that?"* ➔ The agent knows *"that"* refers to regression!
  * **Safety**: Student A's chat will never leak into Student B's chat because each key is strictly separated.

---

### File 3: `ai-agent/tools/breakdown_tool.py` — The Chapter Creator ("Break Into Topics")
* **What it does**: Takes all slides of a lecture (e.g. 30 slides) and groups them into logical chapters.
* **Step-by-step process**:
  1. Loads all slide text from ChromaDB.
  2. Calculates a **SHA-256 fingerprint** of the slides.
  3. **Instant Cache Check**: If this lecture was already broken down before, it loads the saved chapters in **0.05 seconds** without calling the LLM!
  4. If first time: Asks the LLM to group slides into continuous ranges (e.g., Slides 1–3: Introduction, Slides 4–10: Core Algorithms, etc.).
  5. **Validation Rules**:
     * No gaps (every slide must belong to a chapter).
     * No overlapping slides.
     * Every chapter must have a valid title and subtopics.
  6. Saves the validated chapters into ChromaDB metadata so future clicks are instant.

---

### File 4: `ai-agent/tools/planner_tool.py` — The Personal Study Coach ("Study Plan")
* **What it does**: Generates a structured study schedule tailored specifically to the lecture material.
* **Step-by-step process**:
  1. Gathers the text of the selected slides (either full lecture or a single topic chapter).
  2. Instructs the LLM to create 3 to 5 realistic study sessions.
  3. Enforces strict rules:
     * Tasks must be concrete: *"Read Slide 4 and practice the formula"*, not generic advice like *"Watch a YouTube video"*.
     * Assigns estimated study minutes (e.g., 20 mins, 35 mins).
  4. Validates the structure using Pydantic `StudyPlan` schema before returning it to the user.

---

### File 5: `ai-agent/tools/explainer_tool.py` — The Patient Tutor ("Explain This Topic")
* **What it does**: Explains any difficult topic in simple, beginner-friendly English with citations.
* **Step-by-step process**:
  1. Searches ChromaDB for the top 4 most relevant slide excerpts for the topic.
  2. **Defensive Filtering**: Checks each retrieved chunk to ensure it truly belongs to the requested lecture and section.
  3. Prompts the LLM:
     * Max 200 words.
     * Simple beginner definition.
     * One real-world example from the slides.
     * One key takeaway.
  4. Attaches **verifiable slide citations** (e.g., *Slide 4, Slide 7*) so the student can verify the answer against the professor's original slides.

---

### File 6: `ai-agent/tools/learning_support.py` — The Helper Toolkit
* **What it does**: Provides helper functions used by all tools.
* **Key Functions**:
  * `lecture_context(chunks)`: Formats slide text with headers like `[Source: Lecture.pdf - Slide 4]`. Rejects lectures if text exceeds 120,000 characters to prevent crashes.
  * `generate(rag, prompt, context)`: Calls the shared RAG LLM engine (`Groq` or `Gemini`). If the LLM is down, it cleanly raises `LearningUnavailable`.
  * `generate_json(rag, prompt, context, validate)`: Cleans Markdown backticks (` ```json `), parses JSON, and validates it. If the AI returns malformed JSON, it automatically retries once with a corrective prompt!

---

### File 7: `ai-agent/models/schemas.py` — The Data Contracts
* **What it does**: Defines Pydantic classes to ensure data sent between Frontend, Backend, and AI has the exact expected format.
* **Key Models**:
  * `LearningRequest`: What the student wants (`request_type`, `source_file`, `topic`, `sub_lecture_id`).
  * `SubLecture`: Represents a topic section (`title`, `page_start`, `page_end`, `topics`).
  * `StudyPlan` / `StudySession`: Represents the timetable (`session_number`, `title`, `tasks`, `estimated_minutes`).
  * `LearningResponse`: The combined payload sent back to the student.

---

### File 8: `ai-agent/main.py` — The FastAPI Web Gateway
* **What it does**: Exposes the Python HTTP endpoints that the ASP.NET backend calls:
  * `POST /api/v1/agent/learn`: Endpoint for Breakdown, Planner, and Explainer tools.
  * `POST /ai-coach-chat`: Endpoint for interactive conversational coaching with citations.
  * `POST /api/v1/rag/chat`: Direct question-answering on slides.

---

### File 9: `backend/EduFlow.Api/Controllers/AiReviewController.cs` & `AiGatewayClient.cs`
* **What they do**: Act as the secure bridge between the browser and the Python AI service.
* **Security & Auth**:
  * Students communicate with the .NET backend using their JWT Bearer token.
  * The .NET controller extracts the logged-in student's ID and forwards the request internally to `http://localhost:8000` with a secure internal token (`INTERNAL_SERVICE_TOKEN`).
  * The browser never talks directly to Python port 8000, keeping the AI microservice private and secure.

---

### File 10: `frontend/src/pages/Student/StudentPortal.jsx` & `aiService.js`
* **What they do**: The user interface where students interact with the Learning Agent:
  * **Lecture Selector Dropdown**: Lets the student pick which indexed lecture they want to focus on.
  * **Action Buttons**: *"Break Into Topics"*, *"Complete Lecture Study Plan"*.
  * **Interactive Topic Tree**: Shows expandable topic sections where students can click *"Explain This Topic"* or *"Study This Topic"*.
  * **Citation Cards**: Shows clickable slide references with confidence scores.

---

## 4. How RAG and the Learning Agent Cooperate

| Responsibility | Shared RAG Foundation (Atheek) | Learning Agent Layer (Wazni) |
|---|---|---|
| **PDF Extraction & Chunking** | Yes (PyPDF + sliding window) | Reuses existing chunks |
| **Vector Storage** | Yes (ChromaDB) | Reuses ChromaDB |
| **Embedding Generation** | Yes (Gemini / MiniLM) | Reuses same embeddings |
| **LLM Provider Switching** | Yes (Groq `gpt-oss-120b` / Gemini) | Delegates to same LLM |
| **Lecture Sectioning** | No | **Yes (`BreakdownTool`)** |
| **Study Scheduling** | No | **Yes (`StudyPlannerTool`)** |
| **Beginner Explanations** | No (Answers raw Q&A) | **Yes (`ExplainerTool`)** |
| **Conversation Memory** | No (Stateless single-turn) | **Yes (`ShortTermMemory`)** |

---

## 5. How to Verify Everything Locally

You can test both systems with the two diagnostic scripts:

### Test 1: Verify the Core RAG System
```powershell
cd ai-agent
.\.venv\Scripts\python.exe setup_check.py
```
* Verifies Python packages, `.env`, ChromaDB indexing, and raw Q&A.

### Test 2: Verify the Learning Agent Tools & Memory
```powershell
cd ai-agent
.\.venv\Scripts\python.exe check_learning_agent.py
```
* Verifies Breakdown Tool, Study Planner Tool, Explainer Tool, and Short-Term Memory.
