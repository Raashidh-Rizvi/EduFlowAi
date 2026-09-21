"""
===============================================================================
EduFlow AI - Abstract Base Agent & Standardized Execution Tracing
===============================================================================
This module defines the `BaseAgent` abstract base class inherited by all 7 agents
in the EduFlow AI multi-agent platform.

Why we use an Abstract Base Agent:
1. Standardized Execution Logging & Auditability:
   - All agent methods execute through `execute_with_trace()`, which automatically wraps
     task execution with high-resolution start/end timestamps, error catching, and
     structured `AgentExecutionLog` generation.
2. Uniform Ownership & Role Identity:
   - Every agent declares its name, functional role description, and member ownership
     for governance, debugging, and visualization in the topology map.
"""

# Import time module for measuring agent execution duration in milliseconds
import time
# Import abstract base class utilities from Python's abc module
from abc import ABC, abstractmethod
# Import typing hints for function signatures and flexible dictionaries
from typing import Dict, Any, List, Optional, Tuple, Callable
# Import Pydantic models
from pydantic import BaseModel, Field
# Import AgentExecutionLog model for standardizing output audit trails
from models.schemas import AgentExecutionLog


class BaseAgent(ABC):
    """
    Abstract Base Agent enforcing standardized execution logging, latency monitoring,
    and state validation across all EduFlow AI agents.
    
    Why we use this class:
    - Guarantees consistent error handling and execution tracing across the entire system.
    - Prevents unhandled exceptions from bypassing the audit trail.
    """
    def __init__(self, name: str, role_description: str, member_owner: str = "Core"):
        """
        Initialize the base agent with metadata.
        
        Args:
            name: Display name of the agent (e.g. "Coordinator / Planner Agent").
            role_description: Detailed summary of what this agent is responsible for.
            member_owner: Team member or component owner responsible for this agent.
        """
        # Store human-readable name of the agent
        self.name = name
        # Store functional role description
        self.role_description = role_description
        # Store development ownership metadata
        self.member_owner = member_owner

    def execute_with_trace(self, input_data: Any, runner_fn: Callable[[Any], Tuple[Any, str, bool]]) -> Tuple[Any, AgentExecutionLog]:
        """
        Executes an agent task inside an automated latency-measuring and audit-logging wrapper.
        
        Why we use this method:
        - Eliminates boilerplate timing and logging code in individual agent implementations.
        - Automatically builds an AgentExecutionLog capturing execution time, summary narrative,
          and boolean passed/failed status.
          
        Args:
            input_data: The input payload, request object, or state dictionary passed into the agent.
            runner_fn: A callable function taking (input_data) and returning (result, summary_str, passed_bool).
            
        Returns:
            Tuple of (task_result, AgentExecutionLog).
            
        Raises:
            Exception: Re-raises any unhandled exception after capturing duration and logging the error.
        """
        # Record start timestamp in seconds
        start_time = time.time()
        try:
            # Execute the internal agent runner function
            result, summary, passed = runner_fn(input_data)
            
            # Calculate elapsed time in milliseconds
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Build successful execution log
            log = AgentExecutionLog(
                agent_name=self.name,
                execution_time_ms=max(duration_ms, 1),
                summary=summary,
                passed=passed
            )
            return result, log
            
        except Exception as e:
            # Calculate elapsed time even when a failure occurs
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Build failure execution log with error details
            log = AgentExecutionLog(
                agent_name=self.name,
                execution_time_ms=max(duration_ms, 1),
                summary=f"Execution error: {str(e)}",
                passed=False,
                details={"error": str(e)}
            )
            # Re-raise the exception so upstream graph error handlers or retry decorators can catch it
            raise e
