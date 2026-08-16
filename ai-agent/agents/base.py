import time
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from models.schemas import AgentExecutionLog

class BaseAgent(ABC):
    """
    Abstract Base Agent enforcing standardized execution logging, latency monitoring,
    and state validation across all EduFlow AI agents.
    """
    def __init__(self, name: str, role_description: str, member_owner: str = "Core"):
        self.name = name
        self.role_description = role_description
        self.member_owner = member_owner

    def execute_with_trace(self, input_data: Any, runner_fn) -> tuple[Any, AgentExecutionLog]:
        start_time = time.time()
        try:
            result, summary, passed = runner_fn(input_data)
            duration_ms = int((time.time() - start_time) * 1000)
            log = AgentExecutionLog(
                agent_name=self.name,
                execution_time_ms=max(duration_ms, 1),
                summary=summary,
                passed=passed
            )
            return result, log
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            log = AgentExecutionLog(
                agent_name=self.name,
                execution_time_ms=max(duration_ms, 1),
                summary=f"Execution error: {str(e)}",
                passed=False,
                details={"error": str(e)}
            )
            raise e
