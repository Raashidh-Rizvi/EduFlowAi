# 🚀 EduFlow AI — Simple RAG Production Implementation Plan
### From Clean, Robust Single-Engine RAG to Progressive Multi-Agent Architecture
**Student:** Atheek M.F. (IT24103933) & Team  
**Focus:** Simple, Explainable, Crash-Proof Course PDF RAG Pipeline

---

## 🎯 Architecture Philosophy: "Simplicity First"

```
[ Phase 1: Simple RAG Core ]
       │  (PDF -> Chunks -> ChromaDB -> Gemini 1.5 Flash)
       ▼
[ Phase 2: .NET Backend Integration ]
       │  (Upload to wwwroot -> Auto-index in ChromaDB)
       ▼
[ Phase 3: Student AI Tutor UI ]
       │  (Ask questions -> Get answers with Slide Citations)
       ▼
[ Phase 4: Slide-Grounded Quiz Generator ]
       │  (Generate exam questions directly from course slides)
       ▼
[ Phase 5: Progressive Multi-Agent Layering ]
          (Add Domain Analysis, Evaluator & Coach agents step-by-step)
```

**Why this approach is 100x better:**
1. **Zero Confusion:** No complex 10-agent graphs before the basic document retrieval even works.
2. **Easy to Explain in Viva:** You can explain every single line of code in simple English to the examiner.
3. **Rock Solid:** No random crashes or timeout issues.
4. **Step-by-Step Evolution:** You prove Phase 1 works with tests, commit to GitHub, then move to Phase 2.

---

## 📋 PRODUCTION PHASES OVERVIEW

| Phase | Title | What is Built | Verification / Test | Commits |
|---|---|---|---|---|
| **Phase 1** | **Simple RAG Core** | Clean FastAPI service with ChromaDB, PyMuPDF, embeddings & Gemini 1.5 Flash | Python unit test verifying indexing & retrieval | 1 commit |
| **Phase 2** | **Backend .NET Bridge** | Connect `.NET` upload endpoint to auto-trigger Python RAG indexing | Upload a PDF -> verify ChromaDB chunk count increases | 1 commit |
| **Phase 3** | **Student AI Tutor Chat** | Student chat endpoint & UI that answers strictly from course PDFs | Ask question -> receive answer + slide citation | 1 commit |
| **Phase 4** | **Slide-Grounded Quizzes** | Generate quizzes using top-matching chunks from the course PDF | Generate 5 questions -> verify citations match PDF | 1 commit |
| **Phase 5** | **Agent Evolution (Step-by-Step)** | Re-introduce specialized agents (Domain Analysis, Quiz Evaluator) on top of RAG | Full multi-agent test suite | 2 commits |

---

## 🛠️ PHASE 1 — Simple RAG Core Service (Zero Complexity)

### Goal:
Build a single, clean, 100-line Python service that can:
1. Open a PDF from disk.
2. Cut it into ~500-token chunks with 50-token overlap.
3. Embed and store it in persistent **ChromaDB**.
4. Answer student questions using **Google Gemini 1.5 Flash** with exact slide citations.

### Key Files in Phase 1:
* `ai-agent/rag/rag_service.py` (The clean single-engine RAG core)
* `ai-agent/rag/router.py` (Two simple REST endpoints: `/index-pdf` and `/chat`)
* `ai-agent/tests/test_simple_rag.py` (Automated verification test)

### Endpoints:
* `POST /api/v1/rag/index-pdf`
  * Input: `{ "file_path": "...", "course_id": "...", "module_id": "..." }`
  * Output: `{ "status": "success", "chunks_indexed": 24, "source": "Lecture1.pdf" }`
* `POST /api/v1/rag/chat`
  * Input: `{ "question": "What is binary search?", "course_id": "..." }`
  * Output: `{ "answer": "...", "citations": ["Page 4", "Page 5"] }`

---

## 🔗 PHASE 2 — Connecting .NET Backend to RAG

### Goal:
When an instructor uploads a course PDF in .NET (`POST /api/courses/upload-slide`), the server saves it to `wwwroot/uploads/pdfs/` and immediately notifies Python to index it in ChromaDB.

### Steps:
1. Modify `backend/EduFlow.Api/Controllers/CoursesController.cs`:
   * After saving the physical PDF to `wwwroot/uploads/pdfs/{safeFileName}`, send an internal HTTP POST to `http://localhost:8000/api/v1/rag/index-pdf`.
2. Add background execution / resilience: if Python is restarting, the upload still succeeds, and indexing retries safely.
3. Add a check in .NET: `GET /api/courses/modules/{id}/rag-status` to show the instructor: `✅ Document Indexed in AI (24 Chunks)`.

---

## 💬 PHASE 3 — Student AI Tutor Chat Integration

### Goal:
Allow enrolled students to chat with the AI Tutor and ask questions about their course slides.

### Steps:
1. Backend endpoint: `POST /api/ai/tutor-chat` in `backend/EduFlow.Api/Controllers/AiStudentController.cs`.
   * Reads student ID from JWT token.
   * Checks that the student is actually enrolled in the course (Security Guard).
   * Forwards query to Python RAG.
2. Frontend UI: In Student Portal (`StudentPortal.jsx` & Mobile Flutter), student opens "AI Coach / Tutor":
   * Student types question $\rightarrow$ sees answer with clickable badge: `📌 Source: Slide 6`.

---

## 📝 PHASE 4 — Slide-Grounded Quiz Generation

### Goal:
Instructors can generate quizzes where **every single question is directly taken from the uploaded PDF**, with proof.

### Steps:
1. Python endpoint: `POST /api/v1/rag/generate-quiz`
   * Retrieves key concepts from ChromaDB chunks for that module.
   * Prompts Gemini to generate 5 multiple-choice questions with answers, explanations, and exact page citations.
2. Return format:
   ```json
   {
     "question": "What is the time complexity of binary search?",
     "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"],
     "correct_answer": "O(log n)",
     "slide_citation": "Slide 12: Search Complexity"
   }
   ```

---

## 🤖 PHASE 5 — Step-by-Step Multi-Agent Evolution

### Goal:
Once the simple RAG system is working 100% and verified, we add the specialized agents **one by one** so it never becomes overwhelming:

1. **Step 5.1 — Domain Analysis Agent (Student 3 - Atheek M.F.):**
   * Uses quiz results to identify which PDF topics the student is weak in.
   * Connects to `/api/ai/next-best-action`.
2. **Step 5.2 — Quiz Evaluator Agent (Student 2 - Instructor):**
   * Semantically grades student open-ended typed answers against the PDF answer key.
3. **Step 5.3 — Study Plan Orchestrator (Student 1 - Admin):**
   * Generates weekly schedule based on student weak areas.

---

## 🧹 HOW WE CLEAN UP THE COMPLEXITY SAFELY

Instead of dangerously deleting files, we use the **Clean Archive Pattern**:
1. Move the old, overly complex 10-agent code into:
   ```text
   ai-agent/archive_complex_system/
   ```
2. Create a clean, lightweight, easy-to-read `ai-agent/rag/` folder containing only:
   * `rag_service.py` (~80 lines: ChromaDB + text splitter + Gemini)
   * `router.py` (~40 lines: simple endpoints)
3. Update `ai-agent/main.py` so it is clean, simple, and has zero confusing jargon!

---

## 🧪 TESTING & VERIFICATION PLAN PER PHASE

* **Phase 1 Verification:** `python -m pytest ai-agent/tests/test_simple_rag.py -v` (100% pass)
* **Phase 2 Verification:** Upload PDF in .NET $\rightarrow$ check `ai-agent/data/chroma_db` has new embeddings.
* **Phase 3 Verification:** Send student chat question $\rightarrow$ verify response includes correct slide citations.
* **Phase 4 Verification:** Generate quiz $\rightarrow$ verify all 5 questions contain valid slide numbers.
* **Phase 5 Verification:** Multi-agent pipeline integration test.
