"""
===============================================================================
EduFlow AI - External Web Search Tool (web_search_tool.py)
===============================================================================
WHAT THIS MODULE DOES:
1. Connects to the Tavily AI academic search engine API.
2. Supports dual execution engines:
   - Primary: Official `tavily-python` SDK (dynamically imported to avoid IDE linter warnings)
   - Fallback: Direct `httpx` REST API (zero extra dependencies required)
3. Exposes an official Anthropic Model Context Protocol (MCP) tool schema
   (`get_mcp_tool_definition()`) so LLMs and Central MCP Hubs can dynamically
   understand when and how to call this tool.
===============================================================================
"""
import os
import importlib
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("EduFlow-WebSearch")


class WebSearchTool:
    """
    Academic Web Retrieval Tool powered by Tavily AI.
    Conforms to the Model Context Protocol (MCP) Tool Specification.
    """

    # -------------------------------------------------------------------------
    # STEP 1: INITIALIZATION & ENVIRONMENT CONFIGURATION
    # -------------------------------------------------------------------------
    def __init__(self, api_key: Optional[str] = None):
        """
        Loads the Tavily API key from the environment (.env) and initializes
        the connection. Uses dynamic import so IDE static linters (Pyrefly, Pylance)
        never trigger missing-import warnings if the package is in another venv.
        """
        # Read API key from parameter or fall back to system environment
        self.api_key = (api_key or os.environ.get("TAVILY_API_KEY", "")).strip()
        self.client = None

        if self.api_key:
            try:
                # Dynamic import: prevents IDE static linter missing-import error
                tavily_pkg = importlib.import_module("tavily")
                client_class = getattr(tavily_pkg, "TavilyClient", None)
                if client_class:
                    self.client = client_class(api_key=self.api_key)
                    logger.info("✅ Tavily WebSearchClient initialized via tavily-python SDK.")
            except ImportError:
                # SDK not in active venv: tool will seamlessly use built-in HTTPX REST API
                logger.info("ℹ️ 'tavily-python' SDK not found in active venv; using built-in HTTPX REST engine.")
            except Exception as e:
                logger.error(f"❌ Failed to initialize TavilyClient SDK: {e}")
        else:
            logger.warning("⚠️ TAVILY_API_KEY not found in environment. Web search fallback will remain inactive.")

    # -------------------------------------------------------------------------
    # STEP 2: AVAILABILITY & READINESS PROBE
    # -------------------------------------------------------------------------
    @property
    def is_available(self) -> bool:
        """
        Readiness check called by the MCP Hub before executing search.
        Returns True if the API key is configured.
        """
        return bool(self.api_key)

    # -------------------------------------------------------------------------
    # STEP 3: MODEL CONTEXT PROTOCOL (MCP) TOOL SPECIFICATION
    # -------------------------------------------------------------------------
    def get_mcp_tool_definition(self) -> Dict[str, Any]:
        """
        EXPLAINS THIS TOOL TO THE LLM (Standard Anthropic MCP Specification):
        - 'name': Unique identifier used by the LLM when requesting execution.
        - 'description': Teaches the LLM exactly WHEN to use this tool (i.e.
          only when lecture slides lack the required information).
        - 'inputSchema': Strict JSON-Schema defining valid input arguments.
        """
        return {
            "name": "academic_web_search",
            "description": (
                "Search the live web for verified academic, technical, and educational "
                "information when course lecture slides lack the required content."
            ),
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The specific academic question or topic to search online."
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of search results to return (default 3).",
                        "default": 3
                    }
                },
                "required": ["query"]
            }
        }

    # -------------------------------------------------------------------------
    # STEP 4: LIVE WEB SEARCH EXECUTION & CONTENT SANITIZATION
    # -------------------------------------------------------------------------
    def search(self, query: str, max_results: int = 3) -> Dict[str, Any]:
        """
        EXECUTES LIVE WEB SEARCH VIA TAVILY API:
        1. Checks tool availability.
        2. Dispatches query via TavilyClient SDK (if available) or HTTPX REST.
        3. Extracts clean text paragraphs (strips raw HTML, cookies, and ads).
        4. Returns structured snippets with authoritative URLs for citations.
        """
        # Step 4.1: Guard against missing API credentials
        if not self.is_available:
            return {
                "success": False,
                "error": "Tavily API key not configured.",
                "direct_answer": "",
                "results": []
            }

        target_limit = max(1, min(max_results, 5))

        try:
            logger.info(f"🌐 Querying Tavily live web for: '{query}' (limit={target_limit})")

            # Step 4.2: Execute via SDK if available, or direct REST API via HTTPX
            if self.client:
                response = self.client.search(
                    query=query,
                    search_depth="basic",
                    max_results=target_limit,
                    include_answer=True
                )
            else:
                # Built-in HTTPX REST Engine (Zero external SDK required)
                import httpx
                http_resp = httpx.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": self.api_key,
                        "query": query,
                        "search_depth": "basic",
                        "max_results": target_limit,
                        "include_answer": True
                    },
                    timeout=10.0
                )
                if http_resp.status_code == 200:
                    response = http_resp.json()
                else:
                    return {
                        "success": False,
                        "error": f"Tavily HTTP error {http_resp.status_code}: {http_resp.text}",
                        "direct_answer": "",
                        "results": []
                    }

            # Step 4.3: Sanitize and structure each web result into clean dicts
            results: List[Dict[str, str]] = []
            for item in response.get("results", []):
                results.append({
                    "title": item.get("title", "Web Source"),
                    "url": item.get("url", ""),
                    "content": item.get("content", "").strip()
                })

            # Step 4.4: Return clean payload to Central MCP Hub / RAG Service
            return {
                "success": True,
                "direct_answer": response.get("answer", "").strip(),
                "results": results
            }

        except Exception as exc:
            # Step 4.5: Catch network failures or rate limits safely
            logger.error(f"❌ Tavily search execution failed for '{query}': {exc}")
            return {
                "success": False,
                "error": str(exc),
                "direct_answer": "",
                "results": []
            }
