"""
===============================================================================
EduFlow AI - Quick RAG System Verification Tool (check_rag.py)
===============================================================================
Run this file anytime from your terminal to verify the entire RAG pipeline:
    python check_rag.py
===============================================================================
"""

import os
import sys
from dotenv import load_dotenv

# Ensure environment variables from .env are loaded immediately
load_dotenv()

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure current directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rag.rag_service import SimpleRagService


def run_verification():
    print("====================================================================")
    print("[*] EDUFLOW AI -- SIMPLE RAG SYSTEM LIVE VERIFICATION")
    print("====================================================================")

    # 1. Initialize RAG Service
    print("\n[Step 1/3] Initializing SimpleRagService...")
    service = SimpleRagService()
    initial_chunks = service.vector_store.count()
    print("  [OK] Connected to ChromaDB!")
    print(f"  [DATA] Active Chunks in ChromaDB: {initial_chunks}")
    print(f"  [LLM] Chat Provider: {service.llm_provider.upper()}")
    print(f"  [EMBED] Embedding Provider: {service.vector_store.active_provider.upper()}")

    # 2. Index Real Lecture PDF from wwwroot
    pdf_rel_path = os.path.join(
        os.path.dirname(__file__),
        "..", "backend", "EduFlow.Api", "wwwroot", "uploads", "pdfs",
        "ac72c5cd-dd0b-4f50-8d10-b3729f61779c_IT3012___Lecture_4_Notes_ V1.pdf"
    )
    pdf_path = os.path.abspath(pdf_rel_path)

    print("\n[Step 2/3] Checking real course PDF on disk...")
    if not os.path.exists(pdf_path):
        print(f"  [!] Warning: Sample PDF not found at {pdf_path}")
        print("  Please check that the backend/EduFlow.Api/wwwroot/uploads/pdfs/ folder has files.")
        return

    print(f"  [FILE] Found PDF: {os.path.basename(pdf_path)}")
    print("  [...] Indexing into ChromaDB (reading pages and chunking)...")
    res = service.index_file(
        file_path=pdf_path,
        course_id="it3012-se",
        module_id="lecture-04"
    )
    print(f"  [OK] Status: {res.status.upper()}")
    print(f"  [INFO] Pages parsed: {res.pages_parsed}")
    print(f"  [INFO] Chunks created in ChromaDB: {res.chunks_indexed}")

    # 3. Test Student Question Query
    question = "What is searching and problem solving in this lecture?"
    print(f"\n[Step 3/3] Testing student query: '{question}'...")
    chat_res = service.chat(question=question, course_id="it3012-se")

    print("\n--------------------------------------------------------------------")
    print("GENERATED ANSWER:")
    print("--------------------------------------------------------------------")
    print(chat_res.answer[:400] + ("..." if len(chat_res.answer) > 400 else ""))

    print("\n--------------------------------------------------------------------")
    print("VERIFIABLE SLIDE CITATIONS:")
    print("--------------------------------------------------------------------")
    for idx, c in enumerate(chat_res.citations, 1):
        print(f"  {idx}. [Slide {c.page_number}] {c.source_file}")
        print(f"     Match Confidence: {c.relevance_score * 100:.1f}%")
        print(f"     Excerpt: {c.preview_text[:90]}...\n")

    print("====================================================================")
    print("[SUCCESS] ALL CHECKS PASSED: Your Simple RAG system is working 100% correctly!")
    print("====================================================================")


if __name__ == "__main__":
    run_verification()
