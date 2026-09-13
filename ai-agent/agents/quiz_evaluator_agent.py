"""
===============================================================================
EduFlow AI - Automated Quiz Evaluator & Marking Scheme Agent
===============================================================================
Performs 100% automated grading on student submissions across:
- Multiple Choice & Dropdown (deterministic)
- Fill in the Blanks (normalized keyword match)
- Matching pairs (term-definition correspondence)
- Typing / Short Answer (AI semantic rubric scoring)

Generates a transparent, detailed Marking Scheme without requiring instructor manual intervention.
"""

import time
import re
import json
from typing import List, Dict, Any, Tuple, Optional
from core.llm import get_gemini_llm, invoke_structured
from agents.base import BaseAgent, AgentExecutionLog
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser


class QuizEvaluatorAgent(BaseAgent):
    """
    Automated evaluation engine for student quizzes with semantic AI rubric grading for open answers.
    """

    def __init__(self):
        super().__init__(
            name="Automated Quiz Evaluator Agent",
            role_description="Automatically marks multi-format student answers using deterministic rules and semantic AI rubrics.",
            member_owner="SlideQuest AI Engine"
        )

    def evaluate_submission(
        self,
        questions: List[Dict[str, Any]],
        answers: List[Dict[str, Any]],
        pass_percentage: int = 70
    ) -> Tuple[Dict[str, Any], AgentExecutionLog]:
        start_time = time.time()
        
        answer_map = {}
        for ans in answers:
            qid = str(ans.get("question_id") or ans.get("questionId") or "")
            val = ans.get("selected_answer") or ans.get("selectedAnswer") or ans.get("answer") or ""
            answer_map[qid] = str(val).strip()

        breakdown = []
        total_points = 0
        earned_points = 0

        for idx, q in enumerate(questions):
            qid = str(q.get("id") or idx + 1)
            prompt = q.get("prompt") or q.get("question_text") or f"Question {idx + 1}"
            q_type = (q.get("type") or q.get("question_type") or "MultipleChoice").upper()
            max_pts = int(q.get("points") or q.get("marks") or 10)
            correct_ans = str(q.get("correct_answer") or q.get("correctAnswer") or "").strip()
            explanation = q.get("explanation") or "Evaluated against slide criteria."
            rubric = q.get("marking_scheme") or q.get("markingScheme") or explanation
            citation = q.get("slide_citation") or q.get("slideCitation") or "Grounded in lecture slides"

            student_ans = answer_map.get(qid, "")
            total_points += max_pts

            # -----------------------------------------------------------------
            # 1. Evaluate Question Type
            # -----------------------------------------------------------------
            if "TYP" in q_type or "SHORT" in q_type or "OPEN" in q_type or q_type in ["3", "4"]:
                # AI Semantic Rubric Grading for Typed / Short Answer
                res = self._grade_typed_answer(
                    prompt=prompt,
                    student_answer=student_ans,
                    correct_answer=correct_ans,
                    rubric=rubric,
                    max_points=max_pts,
                    citation=citation
                )
                awarded = res["points_awarded"]
                is_correct = awarded >= (max_pts * 0.7)
                feedback = res["feedback"]
            elif "FILL" in q_type:
                # Normalized string / keyword match for Fill in the Blanks
                awarded, is_correct, feedback = self._grade_fill_in_blank(student_ans, correct_ans, max_pts)
            elif "MATCH" in q_type:
                # Matching concept pairs
                awarded, is_correct, feedback = self._grade_matching(student_ans, correct_ans, max_pts, q.get("matching_pairs"))
            else:
                # MCQ & Dropdown Selection (Deterministic)
                is_correct = student_ans.strip().lower() == correct_ans.strip().lower()
                awarded = max_pts if is_correct else 0
                feedback = "Exact match verified." if is_correct else f"Incorrect. Correct answer: {correct_ans}"

            earned_points += awarded

            breakdown.append({
                "question_id": qid,
                "prompt": prompt,
                "question_type": q_type,
                "student_answer": student_ans or "(No answer provided)",
                "correct_answer": correct_ans,
                "is_correct": is_correct,
                "points_awarded": awarded,
                "max_points": max_pts,
                "rubric_explanation": feedback,
                "slide_citation": citation
            })

        percent = round((earned_points / max(1, total_points)) * 100, 1)
        passed = percent >= pass_percentage

        # Gamification calculation
        xp_earned = int(earned_points * 8 + (50 if passed else 15))
        coins_earned = int(earned_points * 2 + (20 if passed else 5))
        if percent >= 100:
            xp_earned += 50
            coins_earned += 25

        exec_time = int((time.time() - start_time) * 1000)
        log = AgentExecutionLog(
            agent_name=self.name,
            execution_time_ms=exec_time,
            summary=f"Graded {len(questions)} questions. Score: {percent}% ({earned_points}/{total_points} pts). Passed: {passed}",
            passed=True
        )

        return {
            "score_obtained": earned_points,
            "max_score": total_points,
            "percentage_score": percent,
            "passed": passed,
            "xp_earned": xp_earned,
            "coins_earned": coins_earned,
            "feedback": "Outstanding mastery of the slide material!" if percent >= 85 else ("Good effort, passing grade achieved!" if passed else "Review recommended topics from the slides to improve mastery."),
            "question_breakdown": breakdown
        }, log

    def _grade_typed_answer(
        self,
        prompt: str,
        student_answer: str,
        correct_answer: str,
        rubric: str,
        max_points: int,
        citation: str
    ) -> Dict[str, Any]:
        """
        Uses LLM to semantically evaluate student's typed text response against the rubric.
        """
        if not student_answer or len(student_answer.strip()) < 3:
            return {
                "points_awarded": 0,
                "feedback": "No substantial answer provided."
            }

        try:
            llm = get_gemini_llm(temperature=0.1)
            eval_prompt = PromptTemplate(
                template="""You are an impartial academic evaluator. Grade the student's typed answer based strictly on the model answer and marking scheme.
Do not require word-for-word memorization; grade based on conceptual understanding and presence of key technical points.

Question: {prompt}
Marking Scheme / Rubric: {rubric}
Model Answer: {correct_answer}
Student Answer: {student_answer}
Max Points: {max_points}

Return a JSON object with schema:
{{
  "points_awarded": <integer from 0 to {max_points}>,
  "feedback": "<concise 1-2 sentence justification explaining where marks were earned or missed>"
}}

Strictly return ONLY the JSON object.
""",
                input_variables=["prompt", "rubric", "correct_answer", "student_answer", "max_points"]
            )
            parser = JsonOutputParser()
            chain = eval_prompt | llm | parser
            result = invoke_structured(chain, {
                "prompt": prompt,
                "rubric": rubric,
                "correct_answer": correct_answer,
                "student_answer": student_answer,
                "max_points": max_points
            })
            if isinstance(result, dict) and "points_awarded" in result:
                pts = min(max_points, max(0, int(result["points_awarded"])))
                return {
                    "points_awarded": pts,
                    "feedback": result.get("feedback") or f"Awarded {pts}/{max_points} based on conceptual alignment."
                }
        except Exception as e:
            print(f"[QuizEvaluatorAgent] LLM semantic grading error: {e}")

        # Fallback keyword overlap heuristic
        keywords = [w.lower() for w in re.findall(r'\b[a-zA-Z]{4,}\b', correct_answer)]
        matched = sum(1 for kw in set(keywords) if kw in student_answer.lower())
        ratio = matched / max(1, len(set(keywords)))
        pts = round(ratio * max_points)
        return {
            "points_awarded": pts,
            "feedback": f"Automated semantic evaluation: captured {matched}/{len(set(keywords))} core key concepts."
        }

    def _grade_fill_in_blank(self, student_answer: str, correct_answer: str, max_points: int) -> Tuple[int, bool, str]:
        def normalize(s: str) -> str:
            return re.sub(r'[^\w\s]', '', s).strip().lower()

        s_norm = normalize(student_answer)
        c_norm = normalize(correct_answer)

        if s_norm == c_norm or (c_norm in s_norm and len(s_norm) < len(c_norm) + 6):
            return max_points, True, "Correct key term provided."
        return 0, False, f"Incorrect. Correct answer: '{correct_answer}'"

    def _grade_matching(
        self,
        student_answer: str,
        correct_answer: str,
        max_points: int,
        pairs: Optional[List[Dict[str, str]]]
    ) -> Tuple[int, bool, str]:
        # Student answers for matching can be comma-separated or JSON pairs e.g. "TermA->DefB, TermC->DefD"
        s_clean = student_answer.replace(" ", "").lower()
        c_clean = correct_answer.replace(" ", "").lower()

        if s_clean == c_clean:
            return max_points, True, "All concept pairs matched correctly."

        # Count matched pairs
        s_parts = [p.strip() for p in student_answer.split(",") if p.strip()]
        c_parts = [p.strip() for p in correct_answer.split(",") if p.strip()]
        matches = 0
        for sp in s_parts:
            if any(sp.replace(" ", "").lower() == cp.replace(" ", "").lower() for cp in c_parts):
                matches += 1
        
        awarded = round((matches / max(1, len(c_parts))) * max_points) if c_parts else 0
        is_correct = awarded >= (max_points * 0.7)
        return awarded, is_correct, f"Matched {matches}/{len(c_parts)} pairs correctly."
