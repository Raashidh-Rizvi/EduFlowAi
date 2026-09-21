"""
Smoke tests for Student 3 - Domain Analysis Agent
Tests verify the agent handles all data scenarios without crashing.
Author: Atheek M.F. (IT24103933)
"""
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from agents.domain_analysis import DomainAnalysisAgent


class TestDomainAnalysisSmoke:

    def test_agent_can_be_created(self):
        """Agent must initialize without errors."""
        agent = DomainAnalysisAgent()
        assert agent is not None, "Agent should be creatable"

    def test_agent_handles_empty_student_data(self):
        """Agent must return safe response for new student with no activity."""
        agent = DomainAnalysisAgent()
        # New student: no quizzes, no lessons
        result = agent.analyze(
            student_id="test-new-student",
            quiz_results=[],
            lesson_completions=[]
        )
        assert result is not None, "Should return something, not crash or return None"

    def test_agent_handles_low_quiz_score(self):
        """Agent should identify weakness when quiz score is below 50%."""
        agent = DomainAnalysisAgent()
        weak_results = [
            {"topic": "SQL Joins", "score": 0.2, "max_score": 1.0},
            {"topic": "Indexing", "score": 0.3, "max_score": 1.0}
        ]
        result = agent.analyze(
            student_id="test-weak-student",
            quiz_results=weak_results,
            lesson_completions=[]
        )
        assert result is not None

    def test_agent_handles_high_quiz_score(self):
        """Agent should give positive feedback when score is above 80%."""
        agent = DomainAnalysisAgent()
        strong_results = [
            {"topic": "Python Basics", "score": 0.9, "max_score": 1.0},
            {"topic": "OOP", "score": 0.85, "max_score": 1.0}
        ]
        result = agent.analyze(
            student_id="test-strong-student",
            quiz_results=strong_results,
            lesson_completions=[]
        )
        assert result is not None

    def test_agent_does_not_return_xp_award_action(self):
        """
        CRITICAL: AI agent must NEVER directly award XP.
        It can only RECOMMEND. XP must go through the backend service.
        """
        agent = DomainAnalysisAgent()
        result = agent.analyze(
            student_id="test-xp-check",
            quiz_results=[],
            lesson_completions=[]
        )
        result_str = str(result).lower()
        # Result must not contain direct XP modification commands
        forbidden_patterns = ['award_xp(', 'addxp(', 'grant_xp(']
        for pattern in forbidden_patterns:
            assert pattern not in result_str, \
                f"Agent output must not contain direct XP action: {pattern}"
