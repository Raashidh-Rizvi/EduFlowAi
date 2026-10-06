# Dual-Agent RAG Learning System — Full Execution Plan

## CURRENT IMPLEMENTATION NOTES — 2026-09-28

This remains the approved **two-agent plan**. The original plan body below is preserved; its schedules, sample schemas, direct FastAPI diagram and proposed routes are design examples, not an inventory of implemented behavior. [Source of truth](../00_SOURCE_OF_TRUTH.md) and [actual contracts](API_CONTRACTS.md) govern implementation interpretation.

- Actual browser path: **React → ASP.NET Core AI gateway → Python**. Learning actions use public `POST /api/aireview/learn` → internal `POST /api/v1/agent/learn`. Chat uses `/api/aireview/coach/chat` → `/ai-coach-chat`.
- Learning Agent is implemented and verified within [recorded tests](../members/member-1-wazni/ai/LEARNING_AGENT_TEST_EVIDENCE.md). Tools run internally; do not add duplicate public endpoints merely to match the original examples.
- Actual plan output is `{title, sessions}` with `session_number`, not the original `days`/`day_number` example. Sections have `id`, `title`, `page_start`, `page_end`, `topics`, `source_file`; full text is not returned as the illustrative SubLecture model suggests.
- STM now retains the latest three completed pairs, isolated by user/session/course/lecture scope. It is process-local and resets on restart; chat failure/extractive fallback turns are excluded. No long-term-memory framework was introduced.
- Quiz Generator Agent is a separate responsibility assigned to Raashidh. Its distinct-agent completion is **implementation verification pending**. Existing slide-quiz generation does not prove all planned Quiz Agent routes exist.
- `/api/v1/agent/quiz`, `/api/v1/tools/*`, and the illustrated sub-lecture GET route are **planned examples, not currently registered endpoints**. RAG remains shared infrastructure, not another agent.
- Normal PDF upload does not automatically index. Local Chroma indexing precedes discovery. Reuse existing storage/embeddings; do not rebuild RAG or add Redis based on optional examples below.
- **Requirement/compliance confirmation pending:** lecturer approval is **UNVERIFIED / TEAM CONFIRMATION REQUIRED**. Preserve official requirements and report conflicts; do not restore legacy architecture.

---

### By: World-Class RAG Architect and Learning Platform Mentor

---

> **Reading Guide:** This plan uses simple English. Every section builds on the one before it.
> Read in order. Do not skip sections.

---

## SECTION 1: What We Are Building (Big Picture)

Think of this system like a **smart school inside your computer**. Here is what it has:

```
+----------------------------------------------------------+
|                 EduFlow AI Learning System                |
|                                                           |
|   +------------------+     +--------------------------+   |
|   |  Learning Agent  |     |   Quiz Generator Agent   |   |
|   |                  |     |                          |   |
|   |  - Breaks slides |     |  - Makes quizzes         |   |
|   |  - Makes plans   |     |  - Adjusts difficulty    |   |
|   |  - Explains text |     |  - Uses slide breakdowns |   |
|   +--------+---------+     +----------+---------------+   |
|            |                          |                   |
|            +-------------+-----------+                    |
|                          |                                |
|              +-----------v-------------+                  |
|              |   Shared RAG Pipeline   |                  |
|              |  (ChromaDB + LLM)       |                  |
|              +-------------------------+                  |
+----------------------------------------------------------+
```

**Two Agents. Three Tools. One RAG Brain. One Goal: Help Students Learn.**

---

## SECTION 2: Understanding Each Piece

### What is the RAG Pipeline?

RAG means **Retrieval-Augmented Generation**.

- **Step 1 (Store):** Upload lecture PDF → chop into small pieces → save in ChromaDB
- **Step 2 (Find):** Student asks a question → find the matching pieces in ChromaDB
- **Step 3 (Answer):** Send the pieces + question to the LLM → get a clear answer

Think of it like a **librarian** who finds the right book page and reads it to you.

---

## SECTION 3: The Three Tools (Shared by Both Agents)

These tools are like **functions** that both agents can call when they need help.

---

### Tool 1: Knowledge Slide Breakdown Tool

**What it does:**
Takes one big lecture PDF and splits it into small, meaningful **sub-lecture slides**.

**How it works (Step by Step):**

```
Input  --> Full Lecture PDF (e.g. IT3012 Lecture 4)
           |
Step 1 --> Parse all pages (already works with your parser.py)
           |
Step 2 --> Group pages by topic using LLM
           Example:
           - Sub-Slide 1: "Introduction to Search" (pages 1-4)
           - Sub-Slide 2: "BFS and DFS Algorithms" (pages 5-10)
           - Sub-Slide 3: "Heuristic Search" (pages 11-17)
           |
Step 3 --> Return list of sub-lectures with:
           - Title
           - Pages included
           - Key topics covered
           - Text content
Output --> Clean list of sub-lecture objects
```

**Why this tool is important:**
Without this tool, the other two agents cannot do sub-lecture work.
**This is the master tool.** Both agents call it first.

---

### Tool 2: Study Planner Tool

**What it does:**
Takes a lecture (full or sub-lecture) and creates a **day-by-day study plan**.

**How it works:**

```
Input  --> Full lecture OR one sub-lecture
           |
Step 1 --> Find all key topics in the content (using RAG search)
           |
Step 2 --> Estimate time needed for each topic
           |
Step 3 --> Create a beginner-friendly study schedule
           Example:
           Day 1: Read pages 1-4, understand what search means (30 min)
           Day 2: Study BFS with examples (45 min)
           Day 3: Practice DFS problems (45 min)
           |
Output --> Clean study plan (JSON + readable text)
```

---

### Tool 3: Explainer Tool

**What it does:**
Explains concepts from slides or study plans in simple English.

**How it works:**

```
Input  --> Sub-lecture content (from Tool 1)
           OR study plan topic (from Tool 2)
           |
Step 1 --> Retrieve relevant chunks from ChromaDB (RAG search)
           |
Step 2 --> Send chunks + question to LLM with prompt:
           "Explain this like I am 12 years old. Use simple words.
            Give one real-life example. Keep it short and clear."
           |
Step 3 --> Return clean explanation with:
           - Simple definition
           - Real-life example
           - Key takeaway sentence
Output --> Easy-to-read explanation
```

---

## SECTION 4: Agent 1 — Learning Agent

**Role:** The student's personal tutor.

### How the Learning Agent Thinks (Decision Flow):

```
Student Request
      |
      v
What does the student want?
      |
      +------------------+------------------+
      v                  v                  v
   "Break              "Make me          "Explain
   my slide"           a plan"           this topic"
      |                  |                  |
      v                  v                  v
  Tool 1             Tool 1 first       Tool 1 first
  (Breakdown)        then Tool 2        then Tool 3
                     (Study Plan)       (Explainer)
```

### Learning Agent Detailed Workflow:

#### Request Type 1: "Break down my lecture"
```
Student: "Break down IT3012 Lecture 4 into smaller parts"
   |
Agent calls --> Tool 1 (Breakdown Tool)
   |
Output: List of sub-lectures shown to student
```

#### Request Type 2: "Make me a study plan"
```
Student: "Make a study plan for the full lecture"
   |
Agent checks: Does student want full or sub-lecture plan?
   |
If FULL:    Agent calls Tool 2 directly with full lecture
If SUB:     Agent calls Tool 1 first, then calls Tool 2
   |
Output: Day-by-day plan shown to student
```

#### Request Type 3: "Explain this to me"
```
Student: "Explain BFS algorithm simply"
   |
Agent checks: Is this from a sub-lecture or study plan?
   |
If from sub-lecture: Agent calls Tool 1, finds the right sub-lecture, calls Tool 3
If from plan item:   Agent calls Tool 2, finds the topic, calls Tool 3
   |
Output: Simple, child-friendly explanation
```

---

## SECTION 5: Agent 2 — Quiz Generator Agent

**Role:** The student's personal test maker.

### How the Quiz Agent Thinks:

```
Student Request
      |
      v
What kind of quiz does student want?
      |
      +------------------+
      v                  v
   "Full Lecture      "Sub-lecture
   Quiz"               Quiz"
      |                  |
      |                  v
      |             Call Tool 1 first
      |             (Get sub-lectures)
      |                  |
      +------------------+
             |
             v
    Ask student: What difficulty?
    [ Easy | Medium | Hard ]
             |
             v
    Search ChromaDB for relevant chunks
             |
             v
    Generate quiz questions with LLM
             |
             v
    Output clean quiz to student
```

### Quiz Agent Detailed Workflow:

```
Step 1: Student picks lecture and says "Generate a quiz"
Step 2: Agent asks:
        - Full lecture quiz OR sub-lecture quiz?
        - Easy / Medium / Hard?
        - How many questions? (default: 5)
Step 3: If sub-lecture:
        - Call Tool 1 to get all sub-lectures
        - Ask student: "Which sub-lecture?" (show list)
Step 4: Search ChromaDB with the selected content
Step 5: Send to LLM with prompt:
        "Create N questions at this difficulty from this content.
         Format: Question, 4 options, Correct answer, Explanation."
Step 6: Return clean formatted quiz
Step 7: After student answers, show score and review
```

---

## SECTION 6: How Both Agents Connect (System Architecture)

### Full System Flow Diagram:

```
   STUDENT
      |
      v
+----------------------------------------+
|          Frontend (React)               |
|  - Lecture Selector Dropdown           |
|  - Chat Interface for Learning Agent   |
|  - Quiz Interface for Quiz Agent       |
+------------------+---------------------+
                   |
                   v (HTTP API calls)
+----------------------------------------+
|         FastAPI Backend (main.py)       |
|                                        |
|  POST /api/v1/agent/learn              |  <-- Learning Agent entry point
|  POST /api/v1/agent/quiz               |  <-- Quiz Agent entry point
|  POST /api/v1/tools/breakdown          |  <-- Tool 1 (shared)
|  POST /api/v1/tools/planner            |  <-- Tool 2 (shared)
|  POST /api/v1/tools/explain            |  <-- Tool 3 (shared)
+------------------+---------------------+
                   |
                   v
+----------------------------------------+
|         Agent Orchestrator Layer        |
|  (Decides which agent and tool to use) |
+------+--------------------+------------+
       |                    |
       v                    v
+------------+      +----------------+
|  Learning  |      |  Quiz Generator|
|  Agent     |      |  Agent         |
+-----+------+      +-------+--------+
      |                     |
      +----------+----------+
                 |
                 v
+----------------------------------------+
|         Shared Tool Layer               |
|  Tool 1: breakdown_tool()              |
|  Tool 2: planner_tool()                |
|  Tool 3: explainer_tool()              |
+------------------+---------------------+
                   |
                   v
+----------------------------------------+
|         RAG Pipeline Layer              |
|                                        |
|  ChromaDB (Vector Store)               |
|  +------------------------------------+ |
|  |  Chunks: IT3012 Lecture 4 (35)     | |
|  |  Chunks: IT3091 ML Lecture 1 (23)  | |
|  +------------------------------------+ |
|                                        |
|  Embedding Model (local ONNX / Gemini) |
|  LLM (Groq / Gemini for generation)   |
+----------------------------------------+
```

---

## SECTION 7: RAG Pipeline — How It Works With Agents

### Phase 1: Indexing (Before Students Use the System)

```
Teacher uploads PDF
      |
      v
Parser reads all pages (parser.py)
      |
      v
Chunker splits into 500-char pieces (chunker.py)
      |
      v
Each chunk gets metadata:
  - source_file (which PDF)
  - course_id (which course)
  - page_number (which page)
  - sub_lecture_id (NEW: which sub-lecture, added by Tool 1)
      |
      v
Embedding model converts text to numbers (vectors)
      |
      v
Stored in ChromaDB forever
```

### Phase 2: Retrieval (When Student Asks a Question)

```
Student question (e.g. "What is BFS?")
      |
      v
Agent picks the right filter:
  - If strict lecture: filter by source_file
  - If sub-lecture:    filter by sub_lecture_id
  - If global:         no filter
      |
      v
ChromaDB finds the 4 most matching chunks
      |
      v
Chunks passed to LLM as context
      |
      v
LLM generates answer grounded in those chunks
      |
      v
Answer + Citations returned to student
```

### Phase 3: Sub-Lecture Indexing (Tool 1 Enhancement)

```
Tool 1 runs breakdown for a lecture
      |
      v
Each sub-lecture gets a unique ID:
  e.g. "it3012-lecture4-sub-01-introduction"
      |
      v
ChromaDB chunks get updated with:
  metadata["sub_lecture_id"] = "it3012-lecture4-sub-01-introduction"
      |
      v
Now Quiz Agent and Learning Agent can filter
by exact sub-lecture when searching ChromaDB
```

---

## SECTION 8: How to Avoid Conflicts Between Agents

This is very important. Two agents using the same tools can cause problems.
Here is how we prevent that:

### Rule 1: Agents Never Talk Directly to Each Other
```
WRONG: Learning Agent calls Quiz Agent
RIGHT: Both agents call the SAME shared Tool 1
```

### Rule 2: Each Request Has a Unique Session ID
```python
session_id = "student-abc123-session-456"
# This ID is passed to every tool call
# Tools use this ID to keep work separate
# No two students mix their results
```

### Rule 3: Tools Are Stateless (No Memory Between Calls)
```
Each tool call is independent.
Tool 1 does NOT remember the last time it was called.
This makes the system safe and predictable.
```

### Rule 4: Agent Orchestrator Decides Who Works First
```
If both agents need Tool 1 at the same time:
  - Orchestrator queues the requests
  - First request runs
  - Second request runs after
  - Results never mix
```

### Rule 5: ChromaDB Filters Prevent Data Mixing
```
Learning Agent searching for sub-lecture 1:
  filter: {sub_lecture_id: "sub-01"}

Quiz Agent searching for sub-lecture 2:
  filter: {sub_lecture_id: "sub-02"}

They never see each other's data.
```

---

## SECTION 9: File Structure (How to Organize the Code)

```
ai-agent/
|
+-- agents/
|   +-- __init__.py
|   +-- learning_agent.py      <-- Agent 1 logic
|   +-- quiz_agent.py          <-- Agent 2 logic
|
+-- tools/
|   +-- __init__.py
|   +-- breakdown_tool.py      <-- Tool 1: Slide Breakdown
|   +-- planner_tool.py        <-- Tool 2: Study Planner
|   +-- explainer_tool.py      <-- Tool 3: Explainer
|
+-- rag/
|   +-- parser.py              <-- Already exists (tick)
|   +-- chunker.py             <-- Already exists (tick)
|   +-- vector_store.py        <-- Already exists (tick)
|   +-- rag_service.py         <-- Already exists (tick)
|
+-- models/
|   +-- schemas.py             <-- Already exists (tick) add new schemas
|
+-- main.py                    <-- Already exists (tick) add new routes
+-- orchestrator.py            <-- NEW: Decides which agent handles request
```

---

## SECTION 10: New API Endpoints Needed

```
Agent Endpoints:

POST /api/v1/agent/learn
  Body: { student_id, source_file, request_type, message }
  Returns: explanation OR plan OR breakdown

POST /api/v1/agent/quiz
  Body: { student_id, source_file, difficulty, sub_lecture_id, num_questions }
  Returns: quiz questions + options + answers

Tool Endpoints (Direct Access):

POST /api/v1/tools/breakdown
  Body: { source_file }
  Returns: list of sub-lectures

POST /api/v1/tools/planner
  Body: { source_file, sub_lecture_id (optional) }
  Returns: study plan

POST /api/v1/tools/explain
  Body: { topic, source_file, sub_lecture_id (optional) }
  Returns: simple explanation

Sub-Lecture Endpoints:

GET /api/v1/sub-lectures/{source_file}
  Returns: all sub-lectures for a lecture
```

---

## SECTION 11: Data Models (What Goes In and Out)

### Sub-Lecture Object:
```python
class SubLecture:
    id: str           # "it3012-lecture4-sub-01"
    title: str        # "Introduction to Search"
    page_start: int   # 1
    page_end: int     # 4
    topics: list[str] # ["what is search", "goal states"]
    text: str         # full text content
    source_file: str  # parent lecture PDF name
```

### Study Plan Object:
```python
class StudyPlan:
    lecture_title: str
    total_days: int
    days: list[StudyDay]

class StudyDay:
    day_number: int          # 1
    title: str               # "Introduction to Search"
    tasks: list[str]         # ["Read pages 1-4", "Watch example video"]
    estimated_minutes: int   # 45
    sub_lecture_id: str      # links back to sub-lecture
```

### Quiz Object:
```python
class Quiz:
    title: str
    difficulty: str          # "easy" | "medium" | "hard"
    source_file: str
    sub_lecture_id: str      # None if full lecture
    questions: list[QuizQuestion]

class QuizQuestion:
    question: str
    options: list[str]       # 4 options (A, B, C, D)
    correct_answer: str      # "A"
    explanation: str         # why this is correct
    page_reference: int      # which slide this came from
```

---

## SECTION 12: How to Build It — Step-by-Step Execution Plan

### PHASE 1: Foundation (Already Done in Your System)

- [x] PDF Parser works
- [x] Chunker works
- [x] ChromaDB connected
- [x] RAG search works
- [x] Basic chat endpoint works
- [x] Lecture dropdown in frontend works

### PHASE 2: Build the Three Tools (Week 1)

**Day 1-2: Build Tool 1 (Breakdown Tool)**
```
1. Create tools/breakdown_tool.py
2. Input: source_file name
3. Use RAG to get ALL chunks for that file
4. Send all chunk titles and text to LLM
5. Ask LLM: "Group these slides into logical sections.
   Give each section a title and list the page numbers."
6. Save each sub-lecture with a unique ID in ChromaDB metadata
7. Return structured list of SubLecture objects
8. Test with IT3012 PDF
```

**Day 3: Build Tool 2 (Study Planner Tool)**
```
1. Create tools/planner_tool.py
2. Input: SubLecture list OR full lecture chunks
3. For each topic, estimate time (simple rule: 1 page = 5 min)
4. Use LLM to create day-by-day plan
5. Return StudyPlan object
6. Test: "Make a 5-day plan for IT3012 Lecture 4"
```

**Day 4: Build Tool 3 (Explainer Tool)**
```
1. Create tools/explainer_tool.py
2. Input: topic name + optional sub_lecture_id
3. Filter ChromaDB by sub_lecture_id if given
4. Run RAG search with the topic
5. Send top 3 chunks to LLM
6. Prompt: "Explain this like a 12-year-old. Use an example."
7. Return clean explanation
8. Test: "Explain BFS simply"
```

### PHASE 3: Build the Two Agents (Week 2)

**Day 1-2: Build Learning Agent**
```
1. Create agents/learning_agent.py
2. Define 3 request types:
   - "breakdown" --> call Tool 1
   - "plan"      --> call Tool 1 if needed, then call Tool 2
   - "explain"   --> call Tool 1 if needed, then call Tool 3
3. Add intent detection:
   Student says "break down my lecture" --> type = "breakdown"
   Student says "make me a plan"        --> type = "plan"
   Student says "explain this"          --> type = "explain"
4. Test all 3 workflows
```

**Day 3-4: Build Quiz Generator Agent**
```
1. Create agents/quiz_agent.py
2. Define quiz request:
   - full lecture quiz OR sub-lecture quiz
   - difficulty level
   - number of questions
3. If sub-lecture quiz --> call Tool 1 first
4. Filter ChromaDB with correct scope
5. Use LLM to generate quiz
6. Format as QuizQuestion objects
7. Test: "Generate a hard quiz on BFS from IT3012"
```

**Day 5: Build Orchestrator**
```
1. Create orchestrator.py
2. Read the student's request
3. Decide: Is this a learning request or quiz request?
4. Route to the correct agent
5. Return result
```

### PHASE 4: Connect to Frontend (Week 3)

**Day 1-2: Add New API Routes to main.py**
```
1. Add POST /api/v1/agent/learn
2. Add POST /api/v1/agent/quiz
3. Add GET /api/v1/sub-lectures/{source_file}
4. Test with Postman or curl
```

**Day 3-4: Update Frontend (StudentPortal.jsx)**
```
1. Add "Breakdown" button in AI Coach tab
2. Show list of sub-lectures when breakdown is done
3. Student can click a sub-lecture to:
   - See a study plan for just that section
   - Get an explanation of a topic in that section
   - Generate a quiz for just that section
4. Add Quiz tab with difficulty selector
```

**Day 5: Testing and Fixing**
```
1. Test every workflow end-to-end
2. Check output quality
3. Fix any broken flows
```

### PHASE 5: Quality and Production (Week 4)

**Day 1: Output Quality Checks**
```
1. Add output validation:
   - SubLecture must have at least 1 page
   - Study plan must have at least 3 days
   - Quiz must have 4 options per question
   - Explainer must be under 300 words
2. If LLM gives bad output, retry once automatically
```

**Day 2: Error Handling**
```
1. If Tool 1 fails --> return helpful message
2. If LLM is slow --> add 30 second timeout
3. If ChromaDB finds nothing --> say "I could not find enough content"
4. Never crash the server
```

**Day 3: Caching**
```
1. Cache breakdown results per lecture (TTL: 24 hours)
2. Cache study plans per source_file
3. This makes the system MUCH faster
4. Use simple Python dict or Redis
```

**Day 4: Logging**
```
1. Log every agent call with:
   - student_id
   - request_type
   - tool_used
   - time_taken
   - success or error
2. This helps you fix problems later
```

**Day 5: Final Tests**
```
1. Test with 5 different students (different questions)
2. Test with 2 different lecture PDFs
3. Check that agents never mix data
4. Check that quiz difficulty actually changes the questions
```

---

## SECTION 13: LLM Prompts (The Most Important Part)

### Prompt for Tool 1 (Breakdown):
```
You are a university lecture organizer.
Below are slides from a lecture. Group them into logical sub-sections.
Each group should cover one clear topic.

Return a JSON array. Each item must have:
- "title": short title of the section (max 5 words)
- "page_start": first page number
- "page_end": last page number
- "topics": list of 2-3 key topics covered

LECTURE SLIDES:
{slide_content}

Return ONLY the JSON array. No extra text.
```

### Prompt for Tool 2 (Study Planner):
```
You are a friendly study coach.
Create a {N}-day study plan for this lecture section.
The student is a beginner. Use simple words.

Each day should have:
- A clear title
- 2-3 simple tasks
- Estimated time in minutes

LECTURE CONTENT:
{content}

Return a JSON array of study days. No extra text.
```

### Prompt for Tool 3 (Explainer):
```
You are a patient teacher. The student is learning English as a second language.
Explain the following concept very simply.
Use short sentences. Use one real-life example.
Maximum 200 words.

CONCEPT: {topic}
CONTENT FROM SLIDES:
{retrieved_chunks}

Format your answer as:
1. Simple Definition (1-2 sentences)
2. Real-life Example (2-3 sentences)
3. Key Takeaway (1 sentence)
```

### Prompt for Quiz Agent:
```
You are a quiz maker for university students.
Create {N} {difficulty} quiz questions from this lecture content.

Difficulty levels:
- easy: basic recall of facts
- medium: requires understanding
- hard: requires applying knowledge to new situations

For each question return:
- "question": the question text
- "options": array of exactly 4 options (labeled A, B, C, D)
- "correct": the letter of the correct option (e.g. "B")
- "explanation": one simple sentence explaining why
- "page": the slide page this came from

CONTENT:
{retrieved_chunks}

Return ONLY a JSON array of questions.
```

---

## SECTION 14: Production Checklist

Before you call this system "production ready", check these:

```
SECURITY
[ ] No API keys in frontend code
[ ] No API keys in git commits
[ ] Rate limiting: max 10 requests per student per minute

RELIABILITY
[ ] All tool calls have try/except error handling
[ ] LLM calls have 30-second timeout
[ ] ChromaDB is backed up daily
[ ] System restarts automatically if it crashes

QUALITY
[ ] Breakdown tool tested with 3 different PDFs
[ ] Study plan always has at least 3 days
[ ] Quiz questions actually come from the slide content
[ ] Explainer output is always simple and short

PERFORMANCE
[ ] Breakdown results are cached
[ ] RAG search is under 2 seconds
[ ] Full quiz generation is under 10 seconds

USER EXPERIENCE
[ ] Frontend shows loading spinner during generation
[ ] Error messages are human-friendly
[ ] Student can retry if something fails
```

---

## SECTION 15: Summary — The Simple Version

```
Step 1: Student uploads PDF --> RAG Pipeline stores it
Step 2: Student opens AI Tutor tab
Step 3: Student picks a lecture from the dropdown
Step 4: Student clicks one of:
         [Break Down]   --> Learning Agent --> Tool 1
         [Study Plan]   --> Learning Agent --> Tool 1 --> Tool 2
         [Explain This] --> Learning Agent --> Tool 1 --> Tool 3
         [Take a Quiz]  --> Quiz Agent --> Tool 1 --> Quiz Generator
Step 5: System returns clean, grounded output
Step 6: Student learns. System improves. Everyone is happy.
```

---

## Questions Before We Start Building

Please answer these so the plan is 100% correct for your system:

1. **Where do teachers upload PDFs?** (Admin panel? Or already uploaded manually?)
2. **How many students use the system at once?** (This affects caching choices)
3. **Do you want a quiz scoring system?** (Save score, show progress over time?)
4. **Should study plans be saved?** (Student comes back next day and sees their plan)
5. **What LLM do you use for generation?** (Groq? Gemini? We need to know for prompts)

Once you answer, I can give you the exact code to start building Phase 2 immediately.

---

*Plan created by: World-Class RAG Architect | EduFlow AI Mentor*
*Version: 1.0 | Last updated: 2026-09-27*
