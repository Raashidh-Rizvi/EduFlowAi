"""
===============================================================================
EduFlow AI - Slide Topic Discovery & Categorization Agent
===============================================================================
Inspects uploaded lecture slides (PDF/PPTX) and categorizes the contents into
4-6 coherent subtopics for selective or comprehensive quiz generation.
"""

import os
import time
import uuid
import json
from typing import List, Dict, Any, Tuple
from core.slide_parser import SlideParser, SlidePage
from core.llm import get_groq_llm, invoke_structured
from agents.base import BaseAgent, AgentExecutionLog
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser


class SlideTopicAgent(BaseAgent):
    """
    AI Agent that reads lecture slides and extracts categorized subtopics with slide ranges.
    """

    def __init__(self):
        super().__init__(
            name="Slide Topic Discovery Agent",
            role_description="Analyzes lecture slide presentations and extracts structured subtopics for RAG quiz targeting.",
            member_owner="SlideQuest AI Engine"
        )

    def categorize_slides(self, file_path: str, max_topics: int = 6) -> Tuple[Dict[str, Any], AgentExecutionLog]:
        start_time = time.time()
        file_name = os.path.basename(file_path)

        try:
            slides = SlideParser.extract_slides(file_path)
        except Exception as e:
            exec_time = int((time.time() - start_time) * 1000)
            log = AgentExecutionLog(
                agent_name=self.name,
                execution_time_ms=exec_time,
                summary=f"Failed to parse slides: {e}",
                passed=False
            )
            return {
                "slide_name": file_name,
                "total_slides": 0,
                "topics": [],
                "error": str(e)
            }, log

        if not slides:
            exec_time = int((time.time() - start_time) * 1000)
            log = AgentExecutionLog(
                agent_name=self.name,
                execution_time_ms=exec_time,
                summary="No text found in slide deck.",
                passed=False
            )
            return {
                "slide_name": file_name,
                "total_slides": 0,
                "topics": []
            }, log

        # Prepare summary of slides (Slide number + Title + preview)
        slide_catalog = []
        for s in slides:
            preview = s.text[:200].replace("\n", " ").strip()
            slide_catalog.append(f"Slide {s.page_number}: '{s.title}' -> {preview}")
        catalog_str = "\n".join(slide_catalog[:40]) # up to 40 slides

        topics = []
        used_llm = False

        # Attempt LLM Categorization
        try:
            llm = get_groq_llm(temperature=0.2)
            prompt = PromptTemplate(
                template="""You are an expert curriculum architect. Analyze the following lecture slide catalog and organize its content into {max_topics} distinct, high-level learning topics/modules.

Slide Catalog:
{catalog}

Return a JSON array of objects with the exact schema:
[
  {{
    "id": "topic_1",
    "title": "Clear Technical Topic Title",
    "summary": "1-2 sentence description of what students learn in this section.",
    "slide_range": "Slides X-Y",
    "key_concepts": ["concept1", "concept2", "concept3"]
  }}
]

Strictly return ONLY the JSON array.
""",
                input_variables=["max_topics", "catalog"]
            )
            parser = JsonOutputParser()
            chain = prompt | llm | parser
            result = invoke_structured(chain, {"max_topics": max_topics, "catalog": catalog_str})
            if isinstance(result, list) and len(result) > 0:
                topics = result
                used_llm = True
        except Exception as e:
            print(f"[SlideTopicAgent] LLM categorization failed, using deterministic clusterer: {e}")

        # Deterministic clusterer fallback if LLM is unavailable
        if not topics:
            topics = self._deterministic_categorize(slides, max_topics)

        exec_time = int((time.time() - start_time) * 1000)
        log = AgentExecutionLog(
            agent_name=self.name,
            execution_time_ms=exec_time,
            summary=f"Discovered {len(topics)} topics across {len(slides)} slides (LLM: {used_llm}).",
            passed=True,
            details={"slide_count": len(slides), "used_llm": used_llm}
        )

        return {
            "slide_name": file_name,
            "total_slides": len(slides),
            "topics": topics
        }, log

    def _deterministic_categorize(self, slides: List[SlidePage], max_topics: int) -> List[Dict[str, Any]]:
        total = len(slides)
        chunk_size = max(1, total // max_topics) if total >= max_topics else 1
        clusters = []

        for i in range(0, total, chunk_size):
            group = slides[i:i + chunk_size]
            if not group:
                continue
            first = group[0]
            last = group[-1]
            title = first.title if len(first.title) > 3 and not first.title.startswith("Slide") else f"Module Section {len(clusters) + 1}"
            keywords = []
            for g in group:
                words = [w for w in g.title.split() if len(w) > 4]
                keywords.extend(words[:2])

            clusters.append({
                "id": f"topic_{len(clusters) + 1}",
                "title": title,
                "summary": f"Covers {title} and related principles across slides {first.page_number} to {last.page_number}.",
                "slide_range": f"Slides {first.page_number}–{last.page_number}",
                "key_concepts": list(set(keywords))[:4] or ["Core Principles", "Architecture", "Best Practices"]
            })
            if len(clusters) >= max_topics:
                break

        return clusters
