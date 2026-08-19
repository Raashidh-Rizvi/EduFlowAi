"""
===============================================================================
EduFlow AI - Tools Package Initialization
===============================================================================
This module exports the Permitted Tool Registry system for EduFlow AI agents.

Why we use this module:
- Implements strict Tool Whitelisting & Role-Based Access Control (RBAC).
- Prevents agents from hallucinating or invoking unauthorized tools.
"""

# Export the singleton tool registry instance, class definition, and tool definition model
from .registry import (
    tool_registry,     # Global singleton instance of ToolRegistry containing all 18 registered tools
    ToolRegistry,      # Tool registry manager class implementing registration and permission checks
    ToolDefinition     # Metadata schema defining a registered tool's name, description, roles, and handler
)
