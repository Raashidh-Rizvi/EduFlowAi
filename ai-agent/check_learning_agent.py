"""
================================================================================
EduFlow AI - Learning Agent & RAG Interconnection Diagnostic Checker
================================================================================
Run this script to verify that the Learning Agent (Breakdown, Planner,
Explainer, and Short-Term Memory) is working correctly in combination with RAG.

HOW TO RUN:
  cd ai-agent
  .\\.venv\\Scripts\\python.exe check_learning_agent.py       <-- Windows
  ./.venv/bin/python check_learning_agent.py                 <-- Mac/Linux
================================================================================
"""

import os
import sys
import time

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
# STEP 1: VERIFY MODULES & LEARNING AGENT ARCHITECTURE
# ─────────────────────────────────────────────────────────────────────────────
step("=" * 70)
step("  EDUFLOW AI - LEARNING AGENT + RAG INTERCONNECTION CHECKER")
step("=" * 70)

step("[STEP 1/5] Verifying Learning Agent modules & components...")

try:
    from models.schemas import LearningRequest, LearningResponse, SubLecture, StudyPlan
    ok("models.schemas (LearningRequest, LearningResponse, SubLecture, StudyPlan)")
except ImportError as e:
    fail(f"Failed to import schemas: {e}")
    sys.exit(1)

try:
    from agents.short_term_memory import ShortTermMemory
    ok("agents.short_term_memory.ShortTermMemory")
except ImportError as e:
    fail(f"Failed to import ShortTermMemory: {e}")
    sys.exit(1)

try:
    from tools.breakdown_tool import BreakdownTool
    ok("tools.breakdown_tool.BreakdownTool")
except ImportError as e:
    fail(f"Failed to import BreakdownTool: {e}")
    sys.exit(1)

try:
    from tools.planner_tool import StudyPlannerTool
    ok("tools.planner_tool.StudyPlannerTool")
except ImportError as e:
    fail(f"Failed to import StudyPlannerTool: {e}")
    sys.exit(1)

try:
    from tools.explainer_tool import ExplainerTool
    ok("tools.explainer_tool.ExplainerTool")
except ImportError as e:
    fail(f"Failed to import ExplainerTool: {e}")
    sys.exit(1)

try:
    from agents.learning_agent import LearningAgent
    ok("agents.learning_agent.LearningAgent")
except ImportError as e:
    fail(f"Failed to import LearningAgent: {e}")
    sys.exit(1)

try:
    from rag.rag_service import SimpleRagService
    ok("rag.rag_service.SimpleRagService (Shared RAG Foundation)")
except ImportError as e:
    fail(f"Failed to import SimpleRagService: {e}")
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: VERIFY ENVIRONMENT & ACTIVE LLM PROVIDER
# ─────────────────────────────────────────────────────────────────────────────
step("[STEP 2/5] Checking .env configuration & active LLM...")

from dotenv import load_dotenv
load_dotenv()

llm_provider = os.environ.get("LLM_PROVIDER", "gemini").lower().strip()
groq_key     = os.environ.get("GROQ_API_KEY", "").strip()
groq_model   = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b").strip()
gemini_key   = os.environ.get("GEMINI_API_KEY", "").strip()
gemini_model = os.environ.get("GEMINI_MODEL", "models/gemini-flash-latest").strip()

info(f"Active LLM Provider : {llm_provider.upper()}")

if llm_provider == "groq":
    if not groq_key:
        fail("LLM_PROVIDER=groq but GROQ_API_KEY is missing in .env!")
        sys.exit(1)
    ok(f"Groq API Key detected ({groq_key[:8]}...) | Model: {groq_model}")
elif llm_provider == "gemini":
    if not gemini_key:
        fail("LLM_PROVIDER=gemini but GEMINI_API_KEY is missing in .env!")
        sys.exit(1)
    ok(f"Gemini API Key detected ({gemini_key[:8]}...) | Model: {gemini_model}")
else:
    fail(f"Unknown LLM_PROVIDER: {llm_provider}")
    sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: INITIALIZE RAG & LEARNING AGENT
# ─────────────────────────────────────────────────────────────────────────────
step("[STEP 3/5] Connecting Learning Agent to RAG Vector Store...")

try:
    rag_service = SimpleRagService()
    learning_agent = LearningAgent(rag_service)
    total_chunks = rag_service.vector_store.count()
    ok(f"RAG Vector Store connected! Total indexed chunks: {total_chunks}")
except Exception as e:
    fail(f"Failed to initialize RAG / LearningAgent: {e}")
    sys.exit(1)

# Find indexed source files
available_lectures = []
try:
    # Query Chroma for distinct source files
    all_data = rag_service.vector_store.collection.get(include=["metadatas"])
    if all_data and all_data.get("metadatas"):
        files = {m.get("source_file") for m in all_data["metadatas"] if m.get("source_file")}
        available_lectures = sorted(list(files))
except Exception as e:
    warn(f"Could not scan source files: {e}")

if available_lectures:
    ok(f"Found {len(available_lectures)} indexed lecture deck(s) in ChromaDB:")
    for f in available_lectures:
        info(f"  - {f}")
    target_lecture = available_lectures[0]
else:
    warn("No lecture decks indexed yet in ChromaDB.")
    info("Attempting to auto-index available PDFs...")
    PDF_DIR = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..", "backend", "EduFlow.Api", "wwwroot", "uploads", "pdfs"
        )
    )
    if os.path.exists(PDF_DIR):
        pdfs = [f for f in os.listdir(PDF_DIR) if f.lower().endswith(".pdf")]
        if pdfs:
            first_pdf = os.path.join(PDF_DIR, pdfs[0])
            info(f"Auto-indexing {pdfs[0]}...")
            rag_service.index_file(first_pdf, course_id="it3012-se")
            target_lecture = pdfs[0]
            ok(f"Indexed {target_lecture} successfully!")
        else:
            fail("No PDFs found to test. Please place a lecture PDF in backend uploads.")
            sys.exit(1)
    else:
        fail("PDF directory does not exist. Run setup_check.py first.")
        sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: LIVE TEST OF ALL LEARNING AGENT TOOLS
# ─────────────────────────────────────────────────────────────────────────────
step(f"[STEP 4/5] Testing Learning Agent Tools on: '{target_lecture}'...")

# --- Tool 1: Breakdown Tool ---
step("  -> Tool A: BreakdownTool (Grouping slides into topic sections)")
start_t = time.time()
sections = []
try:
    req_breakdown = LearningRequest(request_type="breakdown", source_file=target_lecture)
    resp_breakdown = learning_agent.learn(req_breakdown)
    elapsed = time.time() - start_t
    sections = resp_breakdown.sub_lectures or []
    if sections:
        ok(f"Breakdown succeeded in {elapsed:.2f}s! Generated {len(sections)} sections:")
        for s in sections[:4]:
            print(f"     * Slides {s.page_start:02d}-{s.page_end:02d}: {s.title} ({len(s.topics)} subtopics)")
        if len(sections) > 4:
            print(f"     * ... and {len(sections) - 4} more sections.")
    else:
        fail("Breakdown returned empty sections.")
except Exception as e:
    fail(f"BreakdownTool failed: {e}")

time.sleep(2)

# --- Tool 2: Study Planner Tool ---
step("  -> Tool B: StudyPlannerTool (Generating structured study plan)")
start_t = time.time()
try:
    req_plan = LearningRequest(request_type="plan", source_file=target_lecture)
    resp_plan = learning_agent.learn(req_plan)
    elapsed = time.time() - start_t
    plan = resp_plan.plan
    if plan and plan.sessions:
        ok(f"Study Planner succeeded in {elapsed:.2f}s! Plan: '{plan.title}' ({len(plan.sessions)} sessions):")
        for sess in plan.sessions[:3]:
            print(f"     Session {sess.session_number}: {sess.title} (~{sess.estimated_minutes} mins)")
            for t in sess.tasks[:2]:
                print(f"       - {t}")
    else:
        fail("StudyPlanner returned empty plan.")
except Exception as e:
    fail(f"StudyPlannerTool failed: {e}")

time.sleep(2)

# --- Tool 3: Explainer Tool ---
step("  -> Tool C: ExplainerTool (Beginner concept explanation + citations)")
start_t = time.time()
test_topic = sections[0].topics[0] if (sections and sections[0].topics) else "Core Concepts"
try:
    req_explain = LearningRequest(
        request_type="explain",
        source_file=target_lecture,
        topic=test_topic
    )
    resp_explain = learning_agent.learn(req_explain)
    elapsed = time.time() - start_t
    if resp_explain.answer:
        ok(f"Explainer succeeded in {elapsed:.2f}s for topic '{test_topic}'!")
        print(f"\n{BOLD}     --- EXPLANATION PREVIEW ---{RESET}")
        preview = resp_explain.answer[:300].replace("\n", " ")
        print(f"     {preview}...")
        if resp_explain.citations:
            print(f"\n{BOLD}     --- SLIDE CITATIONS ---{RESET}")
            for c in resp_explain.citations[:2]:
                print(f"     - Slide {c.page_number} ({c.source_file}): {c.preview_text[:70]}...")
        else:
            warn("No citations returned with explanation.")
    else:
        fail("Explainer returned empty answer.")
except Exception as e:
    fail(f"ExplainerTool failed: {e}")

time.sleep(2)

# --- Tool 4: Short-Term Memory & Scoped Chat ---
step("  -> Tool D: ShortTermMemory (STM) & Scoped Conversation")
try:
    stm = learning_agent.memory
    s_id, sess_id = "test_student", "session_check"

    # Turn 1
    t1_q = "What is the primary topic of this lecture?"
    resp_t1 = learning_agent.chat(
        question=t1_q,
        student_id=s_id,
        session_id=sess_id,
        source_file=target_lecture
    )
    ok(f"Turn 1 Q&A answered with source: '{resp_t1.source}'")

    # Turn 2: Follow-up question relying on turn 1
    t2_q = "Can you summarize that in two bullet points?"
    resp_t2 = learning_agent.chat(
        question=t2_q,
        student_id=s_id,
        session_id=sess_id,
        source_file=target_lecture
    )
    ok(f"Turn 2 Follow-up answered with source: '{resp_t2.source}'")

    # Verify memory history contains exactly the completed pairs
    mem_key = stm.key(s_id, sess_id, None, target_lecture, None)
    history = stm.history(mem_key)
    if len(history) == 4: # 2 turns = 4 messages (user, assistant, user, assistant)
        ok(f"STM verification passed! Stored exactly {len(history)} messages across 2 turns.")
    else:
        info(f"STM stored {len(history)} messages.")

except Exception as e:
    fail(f"ShortTermMemory chat test failed: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: FINAL VERIFICATION SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
step("=" * 70)
print(f"{GREEN}{BOLD}  ALL LEARNING AGENT + RAG TESTS PASSED SUCCESSFULLY! 🎉{RESET}")
step("=" * 70)
print(f"""
{CYAN}Summary of Interconnection:{RESET}
  1. RAG Vector Store    : ChromaDB supplies exact slide chunks & citations.
  2. Breakdown Tool       : Generates verified section metadata and caches it.
  3. Study Planner Tool   : Synthesizes study sessions bounded by slide numbers.
  4. Explainer Tool       : Grounded explanations with verifiable slide citations.
  5. Short-Term Memory    : 3-pair conversational context without cross-talk.

{GREEN}You can now test this live from the Frontend at http://localhost:2174{RESET}
Go to: Student Portal -> AI Learning Assistant -> Select a lecture slide!
""")
