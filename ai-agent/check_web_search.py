"""
===============================================================================
EduFlow AI - Web Search & Corrective RAG (CRAG) Verification Suite
===============================================================================
Tests:
1. Environment configuration (Tavily Key, Relevance Threshold, Fallback Flag)
2. WebSearchTool initialization & MCP Schema
3. Live Tavily Web Search API retrieval
4. In-Domain RAG Query (Course Slides Grounded)
5. Out-of-Domain RAG Query (Automated Tavily Web Fallback Triggered)
===============================================================================
"""
import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("CheckWebSearch")

def print_header(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

def test_environment():
    print_header("Step 1: Checking Environment Configuration")
    tavily_key = os.environ.get("TAVILY_API_KEY", "").strip()
    fallback_enabled = os.environ.get("ENABLE_WEB_SEARCH_FALLBACK", "true")
    threshold = os.environ.get("RAG_RELEVANCE_THRESHOLD", "0.45")

    print(f"  • ENABLE_WEB_SEARCH_FALLBACK: {fallback_enabled}")
    print(f"  • RAG_RELEVANCE_THRESHOLD:    {threshold}")
    
    if tavily_key:
        masked_key = tavily_key[:8] + "..." + tavily_key[-4:]
        print(f"  • TAVILY_API_KEY:            {masked_key} (Configured)")
    else:
        print("  ❌ TAVILY_API_KEY:            NOT FOUND in .env")
        return False
    return True

def test_mcp_tool_hub():
    print_header("Step 2: Testing Centralized MCP Tool Hub & Tool Registry")
    try:
        from tools.mcp_hub import get_default_mcp_hub
        hub = get_default_mcp_hub()
        
        tools_list = hub.list_tools()
        print(f"  • Registered MCP Tools: {tools_list}")
        
        # Test MCP schema definitions export
        mcp_schemas = hub.get_all_tool_definitions()
        print(f"  • Total MCP Schemas:   {len(mcp_schemas)}")
        for schema in mcp_schemas:
            name = schema.get("name")
            props = list(schema.get("inputSchema", {}).get("properties", {}).keys())
            print(f"    - Plugged-in Tool: '{name}' | Inputs: {props}")
            
        # Test Dynamic Execution via Hub Dispatcher
        print("\n  Executing Dispatch via MCP Hub -> 'academic_web_search'...")
        res = hub.execute("academic_web_search", query="Quantum Computing superposition definition", max_results=2)
        print(f"  • Dispatch Success: {res.get('success')}")
        if res.get("direct_answer"):
            print(f"  • Direct Summary:   {res.get('direct_answer')[:120]}...")
            
        results = res.get("results", [])
        print(f"  • Web Sources Found: {len(results)}")
        for idx, r in enumerate(results, 1):
            print(f"    [{idx}] {r.get('title')} -> {r.get('url')}")
            
        return res.get("success") and len(results) > 0
    except Exception as e:
        print(f"  ❌ MCP Tool Hub error: {e}")
        return False

def test_rag_integration():
    print_header("Step 3: Testing End-to-End RAG Integration")
    try:
        from rag.rag_service import SimpleRagService
        rag = SimpleRagService()
        
        test_file = "IT3012___Lecture_4_Notes_ V1.pdf"
        
        # Sub-test A: In-Domain Query
        print(f"\n[Test A] In-Domain Query on '{test_file}':")
        in_domain_q = "What is the primary topic of Lecture 4?"
        resp_a = rag.chat(question=in_domain_q, source_file=test_file, max_citations=2)
        print(f"  • Source Provider: {resp_a.source}")
        print(f"  • Confidence:      {resp_a.confidence_score}")
        print(f"  • Citations Count: {len(resp_a.citations)}")
        if resp_a.citations:
            print(f"  • Top Slide:       Slide {resp_a.citations[0].page_number} ({resp_a.citations[0].source_file})")
        print(f"  • Answer Preview:  {resp_a.answer[:150]}...")
        
        # Sub-test B: Out-of-Domain Query (Triggering Tavily Web Fallback)
        print(f"\n[Test B] Out-of-Domain Query on '{test_file}' (Expecting Web Fallback):")
        out_domain_q = "Explain Grover's Quantum Search Algorithm and amplitude amplification"
        resp_b = rag.chat(question=out_domain_q, source_file=test_file, max_citations=2)
        print(f"  • Source Provider: {resp_b.source}")
        print(f"  • Confidence:      {resp_b.confidence_score}")
        print(f"  • Citations Count: {len(resp_b.citations)}")
        for c in resp_b.citations:
            print(f"    - [{c.preview_text}] -> {c.source_file}")
        print(f"\n  • Full Response:\n{'-'*50}\n{resp_b.answer}\n{'-'*50}")
        
        success = (resp_b.source == "tavily_web_search") or ("tavily" in resp_b.source)
        if success:
            print("\n  🎉 SUCCESS: Out-of-domain question automatically triggered Tavily Web Fallback!")
        else:
            print(f"\n  ⚠️ Source was '{resp_b.source}' (Check relevance threshold)")
        return success
    except Exception as e:
        print(f"  ❌ RAG Integration error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print_header("EduFlow AI - Tavily Web Search Fallback Verification")
    env_ok = test_environment()
    if not env_ok:
        sys.exit(1)
        
    hub_ok = test_mcp_tool_hub()
    rag_ok = test_rag_integration()
    
    print_header("Final Verification Summary")
    print(f"  • Environment Check:    {'PASSED' if env_ok else 'FAILED'}")
    print(f"  • MCP Tool Hub:         {'PASSED' if hub_ok else 'FAILED'}")
    print(f"  • RAG Fallback System:  {'PASSED' if rag_ok else 'FAILED'}")
    print("=" * 70 + "\n")
