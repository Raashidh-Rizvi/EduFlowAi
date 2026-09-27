# EduFlow AI — Simple RAG Microservice 📚

A clean, robust, and easily explainable **Retrieval-Augmented Generation (RAG)** microservice for EduFlow AI.

Built with **FastAPI**, **ChromaDB**, **PyPDF**, and **Google Gemini 1.5 Flash**.

---

## 🎯 What This Microservice Does

1. **Course Document Ingestion & Parsing:**
   - Reads lecture slide decks in **PDF** and **PowerPoint (.pptx)** formats from disk.
   - Extracts page numbers, slide titles, and body content cleanly.

2. **Context-Preserving Semantic Chunking:**
   - Cuts documents into ~500-token chunks (approx. 1,800 characters) with 50-token (180 characters) sliding overlap.
   - Attaches strict metadata to every chunk: `course_id`, `module_id`, `page_number`, `source_file`.

3. **Persistent Vector Storage (ChromaDB):**
   - Automatically stores embeddings locally in `./data/chroma_db`.
   - Supports course-scoped filtering so queries only search the student's enrolled course.

4. **Grounded Question Answering with Verifiable Citations:**
   - Answers student questions using top-matching lecture slide excerpts.
   - Powered by **Google Gemini 1.5 Flash** (with intelligent fallback).
   - Generates clickable citations showing the exact **Slide Number** and excerpt.

5. **Slide-Grounded Assessments:**
   - Auto-categorizes lecture slides into 3-6 syllabus topics.
   - Generates diagnostic quiz questions strictly grounded in lecture slides.

---

## 📁 Clean Architecture

```text
ai-agent/
├── data/
│   └── chroma_db/            # Persistent local ChromaDB vector database
├── models/
│   ├── __init__.py
│   └── schemas.py            # Clean Pydantic request & response models
├── rag/
│   ├── __init__.py
│   ├── parser.py             # PDF & PPTX slide text extractor
│   ├── chunker.py            # 500-token chunks with slide boundaries
│   ├── vector_store.py       # ChromaDB wrapper with course filtering
│   └── rag_service.py        # Core RAG indexing, search, & Gemini Q&A
├── tests/
│   └── test_simple_rag.py    # 8 automated unit & integration tests
├── .env                      # API keys and directory configuration
├── main.py                   # Production FastAPI REST microservice
└── requirements.txt          # Minimal, crash-proof dependencies
```

---

## 🚀 Running the Microservice

### 1. Activate Virtual Environment
```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1
```

### 2. Start the Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation available at:
`http://localhost:8000/docs`

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Basic liveness probe & chunk count |
| `GET` | `/api/v1/ai/status` | Microservice availability probe for .NET backend |
| `POST` | `/api/v1/rag/index-pdf` | Indexes a course PDF or slide deck into ChromaDB |
| `POST` | `/api/v1/rag/chat` | Answers student questions with slide citations |
| `POST` | `/api/v1/ai/slides/categorize-topics` | Extracts topic bands from uploaded slides |
| `POST` | `/api/v1/ai/slides/generate-quiz` | Generates quiz questions directly from slides |

---

## 🧪 Running Automated Tests

```bash
pytest tests/test_simple_rag.py -v
```
All 8 unit and integration tests pass with 100% success.

---

## 5. Local Setup & Testing

### 1. Virtual Environment & Dependencies

```powershell
# Navigate to AI agent directory
cd ai-agent

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration
Copy `.env.example` to `.env` inside `ai-agent/` and fill in your API keys.

### 3. Run the Microservice

```powershell
# Run FastAPI server with auto-reload
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- **Health Check**: http://localhost:8000/health
- **Interactive Swagger Docs**: http://localhost:8000/docs
