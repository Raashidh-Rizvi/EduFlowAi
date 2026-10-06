"""
================================================================================
EduFlow AI - RAG System Setup Checker & Auto-Indexer
================================================================================
Run this file ONCE after pulling the code from GitHub.
It will:
  1. Check all Python packages are installed
  2. Check your .env file has the required API keys
  3. Auto-index the lecture PDFs into ChromaDB
  4. Run a live chat test to confirm everything works

HOW TO RUN:
  cd ai-agent
  .venv\Scripts\python.exe setup_check.py      <-- Windows
  .venv/bin/python setup_check.py              <-- Mac/Linux
================================================================================
"""

import os
import sys

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ─────────────────────────────────────────────────────────────────────────────
# COLOUR HELPERS
# ─────────────────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):    print(f"  {GREEN}[OK]{RESET}   {msg}")
def fail(msg):  print(f"  {RED}[FAIL]{RESET} {msg}")
def warn(msg):  print(f"  {YELLOW}[WARN]{RESET} {msg}")
def info(msg):  print(f"  {CYAN}[INFO]{RESET} {msg}")
def step(msg):  print(f"\n{BOLD}{msg}{RESET}")


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: CHECK PYTHON PACKAGES
# ─────────────────────────────────────────────────────────────────────────────
step("=" * 65)
step("  EDUFLOW AI - RAG SYSTEM SETUP CHECKER")
step("=" * 65)

step("[STEP 1/5] Checking Python packages...")

REQUIRED_PACKAGES = {
    "fastapi":             "fastapi",
    "uvicorn":             "uvicorn",
    "pydantic":            "pydantic",
    "dotenv":              "python-dotenv",
    "pypdf":               "pypdf",
    "chromadb":            "chromadb",
    "google.genai": "google-genai",
    "groq":                "groq",
    "httpx":               "httpx",
}

missing_packages = []
for import_name, pip_name in REQUIRED_PACKAGES.items():
    try:
        __import__(import_name)
        ok(f"{pip_name}")
    except ImportError:
        fail(f"{pip_name} -- NOT installed")
        missing_packages.append(pip_name)

if missing_packages:
    print(f"\n{RED}  Some packages are missing. Run this to install:{RESET}")
    print(f"\n    pip install -r requirements.txt\n")
    sys.exit(1)
else:
    ok("All required packages are installed!")


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: CHECK .env FILE AND API KEYS
# ─────────────────────────────────────────────────────────────────────────────
step("[STEP 2/5] Checking .env file and API keys...")

env_path = os.path.join(os.path.dirname(__file__), ".env")

if not os.path.exists(env_path):
    fail(".env file NOT FOUND!")
    print(f"""
{YELLOW}  You must create the .env file. Steps:{RESET}

    Windows:
      copy .env.example .env

    Mac/Linux:
      cp .env.example .env

    Then open .env and fill in at least ONE of these:
      GEMINI_API_KEY  --> https://aistudio.google.com/app/apikey  (free)
      GROQ_API_KEY    --> https://console.groq.com/keys            (free)

    Set which one you want to use:
      LLM_PROVIDER=groq    (recommended - fast)
      LLM_PROVIDER=gemini  (alternative)

    Run this script again after saving .env
""")
    sys.exit(1)

ok(".env file found!")

from dotenv import load_dotenv
load_dotenv()

llm_provider   = os.environ.get("LLM_PROVIDER", "gemini").lower().strip()
gemini_key     = os.environ.get("GEMINI_API_KEY", "").strip()
groq_key       = os.environ.get("GROQ_API_KEY", "").strip()
embedding_prov = os.environ.get("EMBEDDING_PROVIDER", "default").lower().strip()
chroma_dir     = os.environ.get("CHROMA_PERSIST_DIR", "./data/chroma_db")

info(f"LLM Provider       : {llm_provider.upper()}")
info(f"Embedding Provider : {embedding_prov.upper()}")
info(f"ChromaDB Path      : {chroma_dir}")

if llm_provider == "groq" and not groq_key:
    fail("LLM_PROVIDER=groq but GROQ_API_KEY is empty in .env!")
    print(f"\n  Get free key: https://console.groq.com/keys")
    print(f"  Add to .env:  GROQ_API_KEY=gsk_xxxxxxxxxxxx\n")
    sys.exit(1)

if llm_provider == "gemini" and not gemini_key:
    fail("LLM_PROVIDER=gemini but GEMINI_API_KEY is empty in .env!")
    print(f"\n  Get free key: https://aistudio.google.com/app/apikey")
    print(f"  Add to .env:  GEMINI_API_KEY=AIzaxxxxxxxx\n")
    sys.exit(1)

if llm_provider == "groq" and groq_key:
    ok(f"Groq API key found ({groq_key[:8]}...)")
if llm_provider == "gemini" and gemini_key:
    ok(f"Gemini API key found ({gemini_key[:8]}...)")


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: CHECK PDF FILES
# ─────────────────────────────────────────────────────────────────────────────
step("[STEP 3/5] Checking lecture PDF files...")

PDF_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..", "backend", "EduFlow.Api", "wwwroot", "uploads", "pdfs"
    )
)

pdf_files = []

if not os.path.exists(PDF_DIR):
    warn(f"PDF folder not found at:\n    {PDF_DIR}")
    print(f"\n  {YELLOW}You need to get PDF files from your team or upload via the app.{RESET}\n")
else:
    pdf_files = [f for f in os.listdir(PDF_DIR) if f.lower().endswith(".pdf")]
    if not pdf_files:
        warn(f"No PDF files found in:\n    {PDF_DIR}")
        print(f"\n  {YELLOW}The RAG system needs lecture PDFs to answer questions.{RESET}")
        print(f"  Ask your team for the PDFs and place them in:\n    {PDF_DIR}\n")
    else:
        ok(f"Found {len(pdf_files)} PDF file(s):")
        for f in pdf_files:
            info(f"  - {f}")


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: INITIALIZE RAG SERVICE AND INDEX PDFS
# ─────────────────────────────────────────────────────────────────────────────
step("[STEP 4/5] Initializing RAG service and indexing PDFs...")

try:
    from rag.rag_service import SimpleRagService
    service = SimpleRagService()
    existing_chunks = service.vector_store.count()
    ok(f"ChromaDB connected! Existing chunks: {existing_chunks}")
except Exception as e:
    fail(f"Failed to initialize RAG service: {e}")
    sys.exit(1)

if pdf_files:
    for pdf_file in pdf_files:
        pdf_path = os.path.join(PDF_DIR, pdf_file)
        info(f"Indexing: {pdf_file}")
        try:
            result = service.index_file(
                file_path=pdf_path,
                course_id="it3012-se",
                module_id="lecture-auto"
            )
            if result.status == "success":
                ok(f"  {result.pages_parsed} pages -> {result.chunks_indexed} chunks")
            else:
                warn(f"  Warning: {result.message}")
        except Exception as e:
            fail(f"  Failed to index {pdf_file}: {e}")

    total_chunks = service.vector_store.count()
    ok(f"Total chunks in ChromaDB: {total_chunks}")
else:
    warn("No PDFs found - skipping indexing step.")


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: LIVE CHAT TEST
# ─────────────────────────────────────────────────────────────────────────────
step("[STEP 5/5] Running live RAG chat test...")

chunks_now = service.vector_store.count()

if chunks_now == 0:
    warn("ChromaDB is empty - cannot run chat test.")
    print(f"\n  {YELLOW}Put PDF files in:{RESET}")
    print(f"    {PDF_DIR}")
    print(f"  Then run this script again.\n")
else:
    test_question = "What are the main topics covered in this lecture?"
    info(f'Test question: "{test_question}"')

    try:
        response = service.chat(question=test_question)

        print(f"\n{BOLD}  --- AI ANSWER ---{RESET}")
        answer_preview = response.answer[:400]
        print(f"  {answer_preview}{'...' if len(response.answer) > 400 else ''}")

        if response.citations:
            print(f"\n{BOLD}  --- SLIDE CITATIONS ---{RESET}")
            for i, citation in enumerate(response.citations, 1):
                print(f"  {i}. Slide {citation.page_number} | {citation.source_file}")
                print(f"     Confidence : {citation.relevance_score * 100:.1f}%")
                print(f"     Excerpt    : {citation.preview_text[:80]}...")
        else:
            warn("No slide citations returned.")

        ok(f"Chat test passed! Source engine: {response.source}")

    except Exception as e:
        fail(f"Chat test failed: {e}")
        sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# FINAL RESULT
# ─────────────────────────────────────────────────────────────────────────────
print(f"\n{BOLD}{'=' * 65}{RESET}")
print(f"{GREEN}{BOLD}  ALL CHECKS PASSED! Your RAG system is ready.{RESET}")
print(f"{BOLD}{'=' * 65}{RESET}")
print(f"""
{CYAN}  NEXT STEP - Start the full application:{RESET}

  Go back to the ROOT project folder and run:

    cd ..
    npm run dev

  Then open browser:
    Frontend  :  http://localhost:2174
    AI Docs   :  http://localhost:8888/docs
    Backend   :  http://localhost:5204/swagger

  Go to Student page -> AI Learning Assistant -> Ask any question!
""")
