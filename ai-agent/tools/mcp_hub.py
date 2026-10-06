"""
===============================================================================
EduFlow AI - Centralized Model Context Protocol (MCP) Tool Hub (mcp_hub.py)
===============================================================================
WHAT THIS MODULE DOES:
This file is the "Universal Motherboard" (Plugin Registry) of our AI system.
It acts as the single point of connection between:
1. The AI Agent / RAG Service (The Consumer)
2. External Real-World Tools (Tavily, Wikipedia, Calculators, YouTube, etc.)

WHY THIS IS PRODUCTION-GRADE ARCHITECTURE:
- Open-Closed Principle (SOLID): You can add 50 new external tools without
  touching a single line of your core RAG database code.
- Standardized MCP Protocol: Adheres to Anthropic's Model Context Protocol (MCP)
  so tools are completely swappable and self-describing.
- Centralized Telemetry & Safety: Handles exceptions, rate-limits, and errors
  in one place so external tool crashes never bring down the web app.
===============================================================================
"""
import logging
from typing import Dict, Any, List, Optional, Callable

logger = logging.getLogger("EduFlow-MCPHub")


class MCPToolHub:
    """
    Centralized Registry & Dynamic Dispatcher for Model Context Protocol (MCP) Tools.
    """

    # -------------------------------------------------------------------------
    # STEP 1: REGISTRY STORAGE INITIALIZATION
    # -------------------------------------------------------------------------
    def __init__(self):
        """
        Initializes in-memory registries:
        - `_tools`: Maps unique string names to tool instances.
        - `_descriptions`: Holds plain-English explanations for tool discovery.
        """
        self._tools: Dict[str, Any] = {}
        self._descriptions: Dict[str, str] = {}
        logger.info("🔌 [MCP Hub] Initialized empty Central MCP Tool Registry.")

    # -------------------------------------------------------------------------
    # STEP 2: PLUG-IN REGISTRATION (Adding New Tools)
    # -------------------------------------------------------------------------
    def register_tool(self, name: str, tool_instance: Any, description: Optional[str] = None):
        """
        PLUGS IN ANY EXTERNAL TOOL:
        Call this to connect Tavily, Wikipedia, or custom calculators.
        The tool instance simply needs to provide an execution method
        (like .search(), .execute(), or .run()).
        """
        # Store the tool instance in the registry map
        self._tools[name] = tool_instance

        # Extract or assign plain-English tool description
        if description:
            self._descriptions[name] = description
        elif hasattr(tool_instance, "get_mcp_tool_definition"):
            # Automatically extract description from tool's MCP schema
            schema = tool_instance.get_mcp_tool_definition()
            self._descriptions[name] = schema.get("description", "")
        else:
            self._descriptions[name] = f"Tool '{name}' registered in MCP Hub."

        logger.info(f"🔌 [MCP Hub] Successfully registered tool: '{name}'")

    # -------------------------------------------------------------------------
    # STEP 3: TOOL UNREGISTRATION & CLEANUP
    # -------------------------------------------------------------------------
    def unregister_tool(self, name: str):
        """Removes a tool from the hub if it is disabled or deprecated."""
        self._tools.pop(name, None)
        self._descriptions.pop(name, None)
        logger.info(f"🔌 [MCP Hub] Unregistered tool: '{name}'")

    # -------------------------------------------------------------------------
    # STEP 4: HEALTH & AVAILABILITY CHECKS
    # -------------------------------------------------------------------------
    def has_tool(self, name: str) -> bool:
        """
        Verifies both:
        1. That the tool is registered in the Hub.
        2. That the tool is currently available (API keys valid, network up).
        """
        if name not in self._tools:
            return False
        tool = self._tools[name]
        if hasattr(tool, "is_available"):
            return bool(tool.is_available)
        return True

    def get_tool(self, name: str) -> Optional[Any]:
        """Direct access to raw tool instance if needed."""
        return self._tools.get(name)

    def list_tools(self) -> List[str]:
        """Returns the list of all registered tool names."""
        return list(self._tools.keys())

    # -------------------------------------------------------------------------
    # STEP 5: MCP TOOL DEFINITIONS EXPORT (LLM Tool Discovery)
    # -------------------------------------------------------------------------
    def get_all_tool_definitions(self) -> List[Dict[str, Any]]:
        """
        COLLECTS SCHEMAS FOR THE LLM:
        Collects standardized JSON schemas from all registered tools and
        hands them to the LLM. The LLM reads these to decide which tool to call.
        """
        definitions: List[Dict[str, Any]] = []
        for name, tool in self._tools.items():
            if hasattr(tool, "get_mcp_tool_definition"):
                try:
                    definitions.append(tool.get_mcp_tool_definition())
                except Exception as e:
                    logger.error(f"❌ Failed to retrieve MCP schema from tool '{name}': {e}")
            else:
                # Fallback: Generate a minimal MCP schema automatically
                definitions.append({
                    "name": name,
                    "description": self._descriptions.get(name, f"Custom tool {name}"),
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Input query for tool"}
                        }
                    }
                })
        return definitions

    # -------------------------------------------------------------------------
    # STEP 6: UNIFIED DYNAMIC EXECUTION DISPATCHER
    # -------------------------------------------------------------------------
    def execute(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """
        EXECUTES ANY REGISTERED TOOL VIA ONE COMMAND:
        Example: hub.execute("academic_web_search", query="Quantum", max_results=3)
        1. Looks up tool in the registry.
        2. Validates availability.
        3. Calls tool method safely with kwargs.
        4. Intercepts crashes so your web backend never breaks.
        """
        # Step 6.1: Check existence
        if tool_name not in self._tools:
            logger.warning(f"⚠️ [MCP Hub] Execution attempted for unregistered tool: '{tool_name}'")
            return {
                "success": False,
                "error": f"Tool '{tool_name}' is not registered in MCP Tool Hub.",
                "results": []
            }

        tool = self._tools[tool_name]

        # Step 6.2: Check readiness
        if hasattr(tool, "is_available") and not tool.is_available:
            return {
                "success": False,
                "error": f"Tool '{tool_name}' is registered but unavailable (check API key in .env).",
                "results": []
            }

        try:
            logger.info(f"⚡ [MCP Hub] Dispatching execution to '{tool_name}' with args: {list(kwargs.keys())}")
            
            # Step 6.3: Dynamically match execution method
            if hasattr(tool, "execute") and callable(tool.execute):
                return tool.execute(**kwargs)
            elif hasattr(tool, "search") and callable(tool.search):
                return tool.search(**kwargs)
            elif hasattr(tool, "run") and callable(tool.run):
                return tool.run(**kwargs)
            elif callable(tool):
                return tool(**kwargs)
            else:
                return {
                    "success": False,
                    "error": f"Tool '{tool_name}' has no recognized execution method.",
                    "results": []
                }
        except Exception as exc:
            # Step 6.4: Safe error interception
            logger.error(f"❌ [MCP Hub] Exception executing tool '{tool_name}': {exc}", exc_info=True)
            return {
                "success": False,
                "error": f"Execution error in tool '{tool_name}': {str(exc)}",
                "results": []
            }


# -----------------------------------------------------------------------------
# STEP 7: GLOBAL SINGLETON FACTORY & EXTENSION POINTS
# -----------------------------------------------------------------------------
_global_mcp_hub: Optional[MCPToolHub] = None


def get_default_mcp_hub() -> MCPToolHub:
    """
    SINGLETON MCP HUB:
    Returns the shared Central MCP Hub.
    Pre-populates it with standard system tools on initial startup.
    """
    global _global_mcp_hub
    if _global_mcp_hub is None:
        _global_mcp_hub = MCPToolHub()

        # ---------------------------------------------------------------------
        # PLUGIN 1: Academic Web Search Tool (Tavily AI)
        # ---------------------------------------------------------------------
        try:
            from tools.web_search_tool import WebSearchTool
            _global_mcp_hub.register_tool("academic_web_search", WebSearchTool())
        except Exception as e:
            logger.warning(f"Could not initialize default WebSearchTool in MCP Hub: {e}")

        # ---------------------------------------------------------------------
        # FUTURE PLUGINS (Simply add new tools here in 1 line of code!):
        # ---------------------------------------------------------------------
        # from tools.wikipedia_tool import WikipediaTool
        # _global_mcp_hub.register_tool("wikipedia_search", WikipediaTool())
        #
        # from tools.arxiv_tool import ArxivTool
        # _global_mcp_hub.register_tool("arxiv_research", ArxivTool())
        #
        # from tools.youtube_tool import YouTubeLectureTool
        # _global_mcp_hub.register_tool("youtube_finder", YouTubeLectureTool())

    return _global_mcp_hub
