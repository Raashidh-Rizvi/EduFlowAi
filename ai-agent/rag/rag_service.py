"""
===============================================================================
EduFlow AI - Simple RAG Core Service (rag_service.py)
===============================================================================
WHAT THIS FILE DOES:
This is the central coordinator (the "Brain") of our RAG subsystem.
It connects all the pieces together:
1. Document Ingestion: parser.py -> chunker.py -> vector_store.py
2. Student Q&A Chat: vector_store.py (search) -> LLM Provider (Gemini or Groq)
3. Verifiable Citations: Returns exact slide numbers with relevance scores.
4. Flexible Chat LLM Switch:
   - LLM_PROVIDER="gemini" (Google Gemini 1.5 Flash)
   - LLM_PROVIDER="groq"   (Ultra-fast Groq LPU with Llama 3.3 70B)
5. Slide Topic Discovery: Categorizes uploaded slides into syllabus topics.
6. Slide-Grounded Quizzes: Generates quiz questions directly from slides.
===============================================================================
"""

import os
import re
import json
import logging
import threading
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

logger = logging.getLogger("EduFlow-RAG")

from rag.parser import DocumentParser, ParsedPage
from rag.chunker import SlideChunker, DocumentChunk
from rag.vector_store import ChromaVectorStore
from tools.mcp_hub import get_default_mcp_hub, MCPToolHub
from models.schemas import (
    IndexPdfResponse,
    RagChatResponse,
    SlideCitation,
    SlideTopicItem,
    CategorizeTopicsResponse
)


class SimpleRagService:
    """
    Core RAG Engine orchestrating parsing, indexing, vector search, and dual-LLM Q&A.
    """

    def __init__(self, vector_store: Optional[ChromaVectorStore] = None):
        """
        INITIALIZATION:
        Loads parser, chunker, vector store, and credentials for both Gemini and Groq.
        """
        self.parser = DocumentParser()
        self.chunker = SlideChunker()
        self.vector_store = vector_store or ChromaVectorStore()

        # Document ingestion states (UPLOADED/PROCESSING/READY/FAILED) are
        # persisted next to the vector index so the .NET gateway can refuse to
        # generate from a document that has not finished processing.
        # On Vercel only /tmp is writable.
        data_dir = ("/tmp/eduflow" if os.environ.get("VERCEL")
                    else os.path.join(os.path.dirname(os.path.dirname(__file__)), "data"))
        self._status_path = os.path.join(data_dir, "document_status.json")
        self._status_lock = threading.Lock()

        # LLM Provider Switch: "gemini" or "groq"
        self.llm_provider = os.environ.get("LLM_PROVIDER", "gemini").lower().strip()

        # Google Gemini Credentials (GOOGLE_API_KEY accepted as a documented alias)
        self.gemini_api_key = (
            os.environ.get("GEMINI_API_KEY", "").strip()
            or os.environ.get("GOOGLE_API_KEY", "").strip()
        )
        self.gemini_model_name = os.environ.get("GEMINI_MODEL", "models/gemini-flash-latest")

        # Groq Credentials (Ultra-Fast LPU Inference)
        self.groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()
        self.groq_model_name = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

        # External Tools & Plugins (Centralized MCP Tool Hub)
        self.web_search_enabled = os.environ.get("ENABLE_WEB_SEARCH_FALLBACK", "true").lower() == "true"
        self.relevance_threshold = float(os.environ.get("RAG_RELEVANCE_THRESHOLD", "0.45"))
        self.mcp_hub: MCPToolHub = get_default_mcp_hub()

    # -------------------------------------------------------------------------
    # 1. DOCUMENT INDEXING WORKFLOW
    # -------------------------------------------------------------------------

    def index_file(
        self,
        file_path: str,
        course_id: str,
        module_id: Optional[str] = None
    ) -> IndexPdfResponse:
        """
        STEP-BY-STEP INDEXING PIPELINE:
        Called when an instructor uploads a course PDF in the web portal.

        State transitions are recorded so callers can observe
        PROCESSING -> READY / FAILED instead of guessing.
        """
        file_name = os.path.basename(file_path or "")
        self._set_document_state(file_name, "PROCESSING", course_id=course_id, module_id=module_id)

        if not os.path.exists(file_path):
            self._set_document_state(file_name, "FAILED",
                                     error="File not found on disk.",
                                     course_id=course_id, module_id=module_id)
            raise FileNotFoundError(f"File not found on disk: {file_path}")

        try:
            # Step 1: Parse document into structured pages
            pages = self.parser.parse(file_path)
            if not pages:
                self._set_document_state(
                    file_name, "FAILED",
                    error="File was read but contained no extractable text.",
                    course_id=course_id, module_id=module_id, pages_parsed=0,
                )
                return IndexPdfResponse(
                    status="warning",
                    file_name=file_name,
                    pages_parsed=0,
                    chunks_indexed=0,
                    course_id=course_id,
                    module_id=module_id,
                    message="File was read but contained no extractable text."
                )

            # Step 2: Chunk pages into 500-token segments retaining slide metadata
            chunks = self.chunker.chunk_pages(
                pages=pages,
                source_file=file_name,
                course_id=course_id,
                module_id=module_id or ""
            )
            if not chunks:
                self._set_document_state(
                    file_name, "FAILED",
                    error="File was read but contained no extractable text.",
                    course_id=course_id, module_id=module_id, pages_parsed=len(pages),
                )
                return IndexPdfResponse(
                    status="warning",
                    file_name=file_name,
                    pages_parsed=len(pages),
                    chunks_indexed=0,
                    course_id=course_id,
                    module_id=module_id,
                    message="File was read but contained no extractable text."
                )

            # Step 3: Save vectors into local ChromaDB
            indexed_count = self.vector_store.add_chunks(chunks)
        except Exception as exc:
            # Technical reason stays server-side in the status record + logs.
            logger.exception("Indexing %s failed.", file_name)
            self._set_document_state(
                file_name, "FAILED",
                error=f"{type(exc).__name__}: {str(exc)[:200]}",
                course_id=course_id, module_id=module_id,
            )
            raise

        self._set_document_state(
            file_name, "READY",
            course_id=course_id, module_id=module_id,
            pages_parsed=len(pages), chunks_indexed=indexed_count,
            embedding_provider=self.vector_store.active_provider,
            embedding_model=self.vector_store.embedding_model_name,
            embedding_version=self.vector_store.embedding_version,
        )
        logger.info("Indexed %s: %d pages -> %d chunks (course=%s module=%s)",
                    file_name, len(pages), indexed_count, course_id, module_id or "-")

        return IndexPdfResponse(
            status="success",
            file_name=file_name,
            pages_parsed=len(pages),
            chunks_indexed=indexed_count,
            course_id=course_id,
            module_id=module_id,
            message=f"Successfully indexed {len(pages)} pages into {indexed_count} vector chunks."
        )

    # -----------------------------------------------------------------------------
    # 1b. DOCUMENT INGESTION STATUS (UPLOADED / PROCESSING / READY / FAILED)
    # -----------------------------------------------------------------------------

    def _read_status_registry(self) -> Dict[str, Dict[str, Any]]:
        try:
            with open(self._status_path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            return data if isinstance(data, dict) else {}
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _write_status_registry(self, registry: Dict[str, Dict[str, Any]]) -> None:
        os.makedirs(os.path.dirname(self._status_path), exist_ok=True)
        tmp_path = self._status_path + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as fh:
            json.dump(registry, fh, indent=2, ensure_ascii=False)
        os.replace(tmp_path, self._status_path)

    @staticmethod
    def _camel_case(key: str) -> str:
        parts = key.split("_")
        return parts[0] + "".join(p.title() for p in parts[1:])

    def _set_document_state(self, file_name: str, state: str, **fields: Any) -> None:
        if not file_name:
            return
        try:
            with self._status_lock:
                registry = self._read_status_registry()
                record = registry.get(file_name) or {}
                # Writers pass snake_case kwargs; document_status() reads camelCase.
                record.update({self._camel_case(k): v for k, v in fields.items() if v is not None})
                record["state"] = state
                record["updatedAt"] = datetime.now(timezone.utc).isoformat()
                if state != "FAILED":
                    record.pop("error", None)
                registry[file_name] = record
                self._write_status_registry(registry)
        except OSError:
            # Status bookkeeping must never break indexing itself.
            logger.warning("Could not persist document status for %s.", file_name)

    def document_status(self, file_name: str) -> Dict[str, Any]:
        """Ingestion state + embedding metadata for one stored document.

        A document with no status record but existing chunks is READY (indexed
        before status bookkeeping existed). A document with neither is UPLOADED
        (stored, not yet processed). `embeddingMismatch` tells the caller the
        chunks were produced by a different embedding model and a re-index is
        required before mixing them with new ones.
        """
        name = os.path.basename((file_name or "").strip())
        if not name:
            raise ValueError("file_name is required.")

        record = self._read_status_registry().get(name)
        try:
            chunks = self.vector_store.count_source_file(name)
        except Exception:
            chunks = 0

        state = (record or {}).get("state")
        if state is None:
            state = "READY" if chunks else "UPLOADED"

        stored_model = (record or {}).get("embeddingModel")
        active_model = getattr(self.vector_store, "embedding_model_name", None)
        mismatch = bool(stored_model and active_model and stored_model != active_model)

        return {
            "fileName": name,
            "state": state,
            "chunksIndexed": chunks,
            "pagesParsed": (record or {}).get("pagesParsed"),
            "courseId": (record or {}).get("courseId"),
            "moduleId": (record or {}).get("moduleId"),
            "updatedAt": (record or {}).get("updatedAt"),
            "embeddingProvider": (record or {}).get("embeddingProvider"),
            "embeddingModel": stored_model,
            "embeddingVersion": (record or {}).get("embeddingVersion"),
            "activeEmbeddingModel": active_model,
            "embeddingMismatch": mismatch,
            "reindexRecommended": mismatch,
            "error": (record or {}).get("error") if state == "FAILED" else None,
        }

    # -------------------------------------------------------------------------
    # 2. GROUNDED CHAT & QUESTION ANSWERING (GEMINI / GROQ SWITCH)
    # -------------------------------------------------------------------------

    def chat(
        self,
        question: str,
        course_id: Optional[str] = None,
        module_id: Optional[str] = None,
        source_file: Optional[str] = None,
        max_citations: int = 3,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> RagChatResponse:
        """
        STEP-BY-STEP STUDENT CHAT WORKFLOW:
        Called when a student asks the AI Tutor a question about the course.
        Supports both Gemini and Groq, with optional Strict Slide Deck Scoping.
        """
        # Step 1: Retrieve best-matching slide chunks from ChromaDB
        # Prior user questions help resolve follow-ups; contextualize query to capture core topic
        search_query = self._contextualize_query(question, conversation_history)
        retrieval_question = f"{search_query}\n{question}" if search_query != question else question

        search_results = self.vector_store.search(
            query=retrieval_question,
            course_id=course_id,
            module_id=module_id,
            source_file=source_file,
            top_k=max(4, max_citations)
        )

        # Step 1.1: Smart fallback if no chunks were found:
        # If source_file was specified, retry searching by source_file alone (in case course_id/module_id restricted it)
        if not search_results and source_file:
            search_results = self.vector_store.search(
                query=retrieval_question,
                course_id=None,
                module_id=None,
                source_file=source_file,
                top_k=max(4, max_citations)
            )

        # If still no chunks and global course_id/module_id filter was used, search across all indexed materials
        if not search_results and not source_file and (course_id or module_id):
            search_results = self.vector_store.search(
                query=retrieval_question,
                course_id=None,
                module_id=None,
                source_file=None,
                top_k=max(4, max_citations)
            )

        # ---------------------------------------------------------------------
        # STEP 2.2: EVALUATE RETRIEVAL CONFIDENCE (RELEVANCE THRESHOLD CHECK)
        # ---------------------------------------------------------------------
        # ChromaDB converts cosine distance into a 0.0 - 1.0 similarity score:
        # - Score >= 0.45: Lecture slides contain high/medium confidence matching facts.
        # - Score < 0.45 or empty: Out-of-syllabus query or topic missing from slides.
        has_relevant_slides = bool(
            search_results and any(res.get("relevance_score", 0.0) >= self.relevance_threshold for res in search_results)
        )

        # ---------------------------------------------------------------------
        # STEP 2.3: CORRECTIVE RAG (CRAG) DECISION GATE
        # ---------------------------------------------------------------------
        if not has_relevant_slides:
            # FALLBACK OPTION A: DISPATCH TO CENTRALIZED MCP TOOL HUB
            # If the lecture slides lack content, we call the Central MCP Hub
            # to run live academic web search via Tavily without hallucinating.
            if self.web_search_enabled and self.mcp_hub.has_tool("academic_web_search"):
                logger.info(f"⚡ [CRAG Gate] Slide relevance low/empty. Dispatching to MCP Hub -> 'academic_web_search' for: '{search_query}' (Original: '{question}')")
                
                # Execute tool dynamically through the Central MCP Hub using contextualized query
                web_res = self.mcp_hub.execute("academic_web_search", query=search_query, max_results=max_citations)
                
                if web_res.get("success") and web_res.get("results"):
                    # Synthesize an academic answer with Groq/Gemini using web extracts
                    answer_text, active_provider = self._generate_web_fallback_answer(
                        question=question,
                        web_results=web_res["results"],
                        direct_answer=web_res.get("direct_answer", ""),
                        source_file=source_file,
                        conversation_history=conversation_history
                    )
                    
                    # Package web links as citations for the frontend (page_number=0 signifies external URL)
                    citations = [
                        SlideCitation(
                            page_number=0,
                            source_file=r.get("url", "Web"),
                            preview_text=r.get("title", "Web Source"),
                            relevance_score=0.88
                        )
                        for r in web_res["results"]
                    ]
                    return RagChatResponse(
                        answer=answer_text,
                        citations=citations,
                        source="tavily_web_search",
                        confidence_score=0.88
                    )

            # FALLBACK OPTION B: Polite Missing Knowledge Message (If web search is disabled or offline)
            scope_desc = f"in '{source_file}'" if source_file else "in the uploaded course lecture slides"
            return RagChatResponse(
                answer=(
                    f"I could not find relevant content {scope_desc} for this question. "
                    "Please ensure the lecture slides or course notes have been uploaded and indexed."
                ),
                citations=[],
                source="rag_fallback",
                confidence_score=0.4
            )

        # ---------------------------------------------------------------------
        # STEP 2.4: IN-DOMAIN SLIDE SYNTHESIS (When slides DO contain the answer)
        # ---------------------------------------------------------------------

        # Step 3: Build citations list and context string
        citations: List[SlideCitation] = []
        context_snippets: List[str] = []

        for res in search_results[:max_citations]:
            meta = res.get("metadata", {})
            page_num = meta.get("page_number", 1)
            chunk_source = meta.get("source_file", "Lecture Slides")
            raw_text = res.get("text", "")
            
            preview = raw_text.replace("\n", " ").strip()
            if len(preview) > 160:
                preview = preview[:157] + "..."

            citations.append(SlideCitation(
                page_number=page_num,
                source_file=chunk_source,
                preview_text=preview,
                relevance_score=res.get("relevance_score", 0.9)
            ))
            context_snippets.append(f"[Source: {chunk_source} - Slide/Page {page_num}]\n{raw_text}")

        context_text = "\n\n---\n\n".join(context_snippets)

        # Step 4: Ask selected LLM (Gemini or Groq) to synthesize the answer
        answer_text, active_provider = self._generate_llm_answer(
            question, context_text, conversation_history=conversation_history
        )

        # ---------------------------------------------------------------------
        # STEP 5: CRAG POST-GENERATION KNOWLEDGE GAP & SELF-CORRECTION CHECK
        # ---------------------------------------------------------------------
        # Even if ChromaDB found chunks with score >= 0.45, the LLM may discover
        # upon reading them that the slide text does NOT define or explain the concept.
        # When the LLM states that the concept is not covered in the slides,
        # Corrective RAG (CRAG) self-heals by querying Tavily Web Search via MCP!
        if self._is_missing_knowledge_answer(answer_text):
            if self.web_search_enabled and self.mcp_hub.has_tool("academic_web_search"):
                logger.info(f"⚡ [CRAG Self-Correction] Slide excerpts lack content for '{question}'. Triggering Tavily Web Fallback for: '{search_query}'.")
                web_res = self.mcp_hub.execute("academic_web_search", query=search_query, max_results=max_citations)
                if web_res.get("success") and web_res.get("results"):
                    fallback_text, active_provider = self._generate_web_fallback_answer(
                        question=question,
                        web_results=web_res["results"],
                        direct_answer=web_res.get("direct_answer", ""),
                        source_file=source_file,
                        conversation_history=conversation_history
                    )
                    web_citations = [
                        SlideCitation(
                            page_number=0,
                            source_file=r.get("url", "Web"),
                            preview_text=r.get("title", "Web Source"),
                            relevance_score=0.88
                        )
                        for r in web_res["results"]
                    ]
                    return RagChatResponse(
                        answer=fallback_text,
                        # Slide excerpts stay first (grounding is real and was used for
                        # the initial answer); supplementary web sources follow.
                        citations=citations + web_citations,
                        source="tavily_web_search",
                        confidence_score=0.88
                    )

        clean_answer = answer_text.replace("[NOT COVERED IN SLIDES]", "").strip()
        return RagChatResponse(
            answer=clean_answer,
            citations=citations,
            source=f"{active_provider}_rag",
            confidence_score=0.96
        )

    def _is_missing_knowledge_answer(self, text: str) -> bool:
        """
        Detects if the LLM's answer indicates that the course slides do not contain the answer.
        Used by the Corrective RAG (CRAG) loop to self-heal and trigger Tavily Web Search.
        """
        if not text:
            return True
        lower = text.lower()

        # 1. Direct explicit machine flag
        if "[not covered in slides]" in lower:
            return True

        # 2. Comprehensive semantic rejection indicators
        rejection_indicators = [
            "do not contain",
            "does not contain",
            "not covered in",
            "not mentioned in",
            "no information about",
            "cannot find any information",
            "could not find any information",
            "do not mention",
            "does not mention",
            "not provided in",
            "not found in",
            "slides do not",
            "excerpts do not",
            "lecture notes do not",
            "slides do not explain",
            "context does not contain",
            "none of these slides",
            "none of the slides",
            "no slide discusses",
            "no slide mentions",
            "no slides discuss",
            "no slides mention",
            "outside the scope of the provided",
            "outside the scope of the lecture",
            "outside the scope of the current",
            "cannot give a detailed explanation",
            "cannot provide a definition",
            "cannot answer based on",
            "neither of these slides",
            "no definition for it",
            "no definition of",
            "does not provide a definition",
            "do not provide a definition",
            "no direct mention",
            "solely on the current course excerpts",
            "based solely on the current course",
            "based solely on the provided",
        ]
        if any(phrase in lower for phrase in rejection_indicators):
            return True

        # 3. Structural pattern: Negative assertion + Course Material Mention
        has_negative = any(neg in lower for neg in [
            "cannot", "can not", "unable", "none of", "no slide", "not mention", "no mention", "not discuss", "no discussion"
        ])
        has_material = any(mat in lower for mat in [
            "slide", "slides", "excerpt", "excerpts", "lecture material", "provided material", "course notes"
        ])
        if has_negative and has_material:
            return True

        return False

    def _contextualize_query(
        self,
        question: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        ANAPHORA RESOLUTION & SEARCH QUERY REWRITING:
        If a student asks a follow-up question (e.g. 'give one more realworld example',
        'why does this happen?', 'how does it work?'), the raw question lacks the core subject.
        This method rewrites follow-ups into a standalone search query using conversation history,
        ensuring Tavily web search targets the correct academic subject rather than filler words.
        """
        clean_q = question.strip()
        if not conversation_history:
            return clean_q

        q_lower = clean_q.lower()
        follow_up_tokens = {
            "it", "this", "that", "these", "those", "they", "them",
            "one more", "another", "more", "example", "why", "how", "what about",
            "explain more", "give me", "tell me more", "what else", "compare",
            "difference", "contrast", "second", "third", "additional", "else"
        }
        words = re.findall(r'\b\w+\b', q_lower)
        is_short = len(words) <= 6
        has_follow_up_token = any(token in q_lower for token in follow_up_tokens)

        # Standalone, detailed questions without pronouns do not need rewriting
        if not is_short and not has_follow_up_token:
            return clean_q

        # Extract previous user queries from history
        user_msgs = [m.get("content", "") for m in conversation_history if m.get("role") == "user"]
        last_user_q = user_msgs[-1] if user_msgs else ""

        # Option A: Fast LLM Query Reformulation (Groq LPU < 0.2s or Gemini)
        if self.llm_provider == "groq" and self.groq_api_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.groq_api_key, timeout=4.0, max_retries=0)
                recent_history = conversation_history[-3:]
                history_text = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')[:160]}" for m in recent_history])
                prompt = (
                    "You are a search query rewriting engine for an AI academic tutor.\n"
                    "Given the recent conversation and a student's follow-up question, "
                    "output ONLY a standalone academic search query (3 to 6 words) that includes the main topic and intent.\n"
                    "Do NOT answer the question. Do NOT include quotation marks, markdown, or explanations.\n\n"
                    f"Conversation:\n{history_text}\n\n"
                    f"Follow-up Question: {clean_q}\n\n"
                    "Standalone Search Query:"
                )
                completion = client.chat.completions.create(
                    model=self.groq_model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.0,
                    max_tokens=25
                )
                if completion.choices and completion.choices[0].message.content:
                    rewritten = completion.choices[0].message.content.strip().strip('"\'`\n')
                    rewritten = re.sub(r'^(Standalone Search Query:|\bQuery:\b)', '', rewritten, flags=re.IGNORECASE).strip()
                    if rewritten and len(rewritten) >= 3 and "\n" not in rewritten:
                        logger.info(f"⚡ [Query Contextualizer] Rewrote '{clean_q}' -> '{rewritten}' via Groq")
                        return rewritten
            except Exception as e:
                logger.warning(f"Groq query contextualizer failed ({e}); using heuristic fallback.")

        elif self.gemini_api_key:
            try:
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=self.gemini_api_key, http_options=types.HttpOptions(timeout=4_000))
                recent_history = conversation_history[-3:]
                history_text = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')[:160]}" for m in recent_history])
                prompt = (
                    "Given the recent conversation and a student's follow-up question, "
                    "output ONLY a standalone academic search query (3 to 6 words) that captures the main topic and intent.\n"
                    "No quotes or explanations.\n\n"
                    f"Conversation:\n{history_text}\n\n"
                    f"Follow-up: {clean_q}\n\n"
                    "Query:"
                )
                response = client.models.generate_content(
                    model=self.gemini_model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(max_output_tokens=25, temperature=0.0),
                )
                if response and response.text:
                    rewritten = response.text.strip().strip('"\'`\n')
                    rewritten = re.sub(r'^(Standalone Search Query:|\bQuery:\b)', '', rewritten, flags=re.IGNORECASE).strip()
                    if rewritten and len(rewritten) >= 3 and "\n" not in rewritten:
                        logger.info(f"⚡ [Query Contextualizer] Rewrote '{clean_q}' -> '{rewritten}' via Gemini")
                        return rewritten
            except Exception as e:
                logger.warning(f"Gemini query contextualizer failed ({e}); using heuristic fallback.")

        # Option B: Deterministic Heuristic Fallback (Instant, Offline, 100% Reliable)
        if last_user_q:
            subject = re.sub(
                r'^(can you\s+)?(explain|what is|what are|describe|tell me about|how does|why is|give me a breakdown of)\s+',
                '',
                last_user_q,
                flags=re.IGNORECASE
            ).strip('?.! ')
            if subject and len(subject) > 2:
                combined = f"{subject} {clean_q}"
                logger.info(f"⚡ [Query Contextualizer] Heuristic fallback: '{clean_q}' -> '{combined}'")
                return combined

        return clean_q

    def _clean_text_artifacts(self, text: str) -> str:
        """
        Sanitizes raw search engine / retrieval citation tokens like 【1†L1-L5】 or 【3†source】.
        Ensures enterprise-clean text output without distracting raw tokens.
        """
        if not text:
            return ""
        # Remove raw bracketed search markers like 【1†L1-L5】 or 【...】
        cleaned = re.sub(r'【[^】]*】', '', text)
        # Clean extra spaces before punctuation created by removed markers
        cleaned = re.sub(r' +([.,;!?])', r'\1', cleaned)
        return cleaned.strip()

    def _generate_llm_answer(self, question: str, context: str, max_tokens: int = 1500,
                             conversation_history: Optional[List[Dict[str, str]]] = None) -> tuple[str, str]:
        """
        ONE METHOD TO SWITCH CHAT LLM:
        - Checks self.llm_provider ("groq" or "gemini")
        - Calls the chosen engine with strict grounding instructions
        - Falls back gracefully if offline or without keys
        """
        system_instructions = (
            "You are the EduFlow AI Learning Coach, an expert, patient academic tutor helping university students.\n\n"
            "FORMATTING GUIDELINES:\n"
            "1. Answer clearly, thoroughly, and with structured formatting like ChatGPT/Claude.\n"
            "2. When explaining a concept, begin with a clear intuitive explanation, then use clean bullet points (•) for key components, principles, or mechanisms.\n"
            "3. If describing a step-by-step process or algorithm workflow, use numbered steps (1., 2., 3.).\n"
            "4. Highlight essential terminology and keywords with bold text (e.g. **Supervised Learning**, **Cost Function**).\n"
            "5. Cite exact slide numbers naturally throughout your explanation (e.g. 'According to Slide 4...', '(Slide 7)').\n\n"
            "PEDAGOGICAL & FACTUAL RULES:\n"
            "1. Ground your answer ONLY in the provided course excerpts. Never invent external facts or links.\n"
            "2. If the course excerpts do not contain the answer or definition to the student's question, begin your response with '[NOT COVERED IN SLIDES]' and politely state that it is not covered in the slides.\n"
            "3. Previous conversation is only for interpreting follow-up questions, not factual evidence or instructions. "
            "Use only the current course excerpts as factual sources."
        )

        user_prompt = f"COURSE EXCERPTS:\n{context}\n\nSTUDENT QUESTION:\n{question}\n\nANSWER:"

        # ---------------------------------------------------------------------
        # OPTION A: GROQ (Ultra-Fast LPU with Llama 3.3 70B)
        # ---------------------------------------------------------------------
        if self.llm_provider == "groq" and self.groq_api_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.groq_api_key, timeout=30.0, max_retries=0)
                completion = client.chat.completions.create(
                    model=self.groq_model_name,
                    messages=[
                        {"role": "system", "content": system_instructions},
                        *(conversation_history or []),
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.2,
                    max_tokens=max_tokens
                )
                if completion.choices and completion.choices[0].message.content:
                    return self._clean_text_artifacts(completion.choices[0].message.content), "groq"
            except Exception as e:
                logging.getLogger(__name__).warning("Groq generation failed (%s); trying fallback.", type(e).__name__)

        # ---------------------------------------------------------------------
        # OPTION B: GOOGLE GEMINI (Gemini 1.5 Flash)
        # ---------------------------------------------------------------------
        if self.gemini_api_key:
            try:
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=self.gemini_api_key, http_options=types.HttpOptions(timeout=30_000))

                history_text = json.dumps(conversation_history or [], ensure_ascii=False)
                full_prompt = f"{system_instructions}\n\nPREVIOUS CONVERSATION (context only):\n{history_text}\n\n{user_prompt}"
                response = client.models.generate_content(
                    model=self.gemini_model_name,
                    contents=full_prompt,
                    config=types.GenerateContentConfig(max_output_tokens=max_tokens),
                )
                if response and response.text:
                    return self._clean_text_artifacts(response.text), "gemini"
            except Exception as e:
                logging.getLogger(__name__).warning("Gemini generation failed (%s); using retrieved excerpts.", type(e).__name__)

        # ---------------------------------------------------------------------
        # OPTION C: Extractive Fallback (Runs 100% offline without any API keys)
        # ---------------------------------------------------------------------
        fallback_answer = (
            f"Based on the course lecture slides:\n\n"
            f"{context[:450]}...\n\n"
            f"*(Refer to the attached slide citations for complete details)*"
        )
        return fallback_answer, "extractive"

    def _generate_web_fallback_answer(
        self,
        question: str,
        web_results: List[Dict[str, str]],
        direct_answer: str = "",
        source_file: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        max_tokens: int = 1500
    ) -> tuple[str, str]:
        """
        SYNTHESIZES GROUNDED ACADEMIC WEB ANSWER:
        Called when ChromaDB slide search returns low confidence.
        Enforces clear academic notice, structured format, and verified sources.
        """
        # ---------------------------------------------------------------------
        # STEP 1: ASSEMBLE CLEAN WEB CONTEXT FROM TAVILY EXTRACTS
        # ---------------------------------------------------------------------
        web_context_parts = []
        for idx, item in enumerate(web_results, 1):
            title = item.get("title", f"Web Source {idx}")
            url = item.get("url", "")
            content = item.get("content", "")
            web_context_parts.append(f"[{idx}] {title} ({url}):\n{content}")

        web_context = "\n\n---\n\n".join(web_context_parts)
        if direct_answer:
            web_context = f"QUICK SUMMARY FROM SEARCH ENGINE:\n{direct_answer}\n\nAUTHORITATIVE SOURCES:\n{web_context}"

        scope_msg = f"in '{source_file}'" if source_file else "in your uploaded lecture slides"

        # ---------------------------------------------------------------------
        # STEP 2: SYSTEM INSTRUCTIONS & ACADEMIC TRANSPARENCY NOTICE
        # ---------------------------------------------------------------------
        system_instructions = (
            "You are the EduFlow AI Learning Coach, an expert academic tutor helping university students.\n\n"
            f"IMPORTANT NOTICE: The student's question was NOT found {scope_msg}. "
            "You are providing an academic explanation based on verified external web sources retrieved via Tavily AI Search.\n\n"
            "FORMATTING GUIDELINES:\n"
            f"1. Start your answer with this exact notice:\n"
            f"   🌐 Note: This topic was not found {scope_msg}. The explanation below was retrieved from verified academic web sources.\n\n"
            "2. If introducing or explaining a core concept from scratch, structure your answer as:\n"
            "   Simple Definition -\n"
            "   [A clear, intuitive explanation of the concept]\n\n"
            "   Real-World Example -\n"
            "   [A concrete, relatable practical example]\n\n"
            "   Key Breakdown -\n"
            "   • [Key mechanism or point 1]\n"
            "   • [Key mechanism or point 2]\n"
            "   • [Key mechanism or point 3]\n\n"
            "   Key Takeaway -\n"
            "   [One memorable sentence summarizing the core insight]\n\n"
            "3. If the student is asking a follow-up question (such as asking for an additional real-world example, asking 'why', or comparing):\n"
            "   - Address the student's specific request directly and with deep technical clarity.\n"
            "   - If they asked for another real-world example, introduce the new real-world example directly (e.g. MRI scanners, lasers, quantum encryption) with its underlying mechanism and practical impact.\n"
            "   - Do NOT provide a meta-definition of words like 'real-world example' or 'give'. Always stay focused on the subject matter.\n"
            "   - Provide a Key Breakdown and Key Takeaway relevant to the follow-up.\n\n"
            "4. Verified Web Sources -\n"
            "   End with the verified web sources:\n"
            "   • [Source Title 1](url1)\n"
            "   • [Source Title 2](url2)\n"
        )

        # ---------------------------------------------------------------------
        # STEP 3: CONSTRUCT GROUNDED USER PROMPT ENVELOPE
        # ---------------------------------------------------------------------
        user_prompt = (
            f"EXTERNAL WEB RESEARCH CONTEXT:\n{web_context}\n\n"
            f"STUDENT QUESTION:\n{question}\n\n"
            "ANSWER:"
        )

        # ---------------------------------------------------------------------
        # STEP 4: LLM INFERENCE (PRIMARY: GROQ LPU, SECONDARY: GEMINI)
        # ---------------------------------------------------------------------
        # 4.1: Groq Fast LPU Inference
        if self.llm_provider == "groq" and self.groq_api_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.groq_api_key, timeout=30.0, max_retries=0)
                messages = [{"role": "system", "content": system_instructions}]
                for msg in (conversation_history or [])[-4:]:
                    messages.append({"role": msg["role"], "content": msg["content"]})
                messages.append({"role": "user", "content": user_prompt})

                completion = client.chat.completions.create(
                    messages=messages,
                    model=self.groq_model_name,
                    temperature=0.2,
                    max_tokens=max_tokens,
                )
                if completion.choices and completion.choices[0].message.content:
                    return self._clean_text_artifacts(completion.choices[0].message.content), "groq_tavily"
            except Exception as e:
                logger.error(f"Groq web fallback synthesis failed: {e}")

        # 4.2: Gemini Fallback Inference
        if self.gemini_api_key:
            try:
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=self.gemini_api_key, http_options=types.HttpOptions(timeout=30_000))
                history_snippets = []
                if conversation_history:
                    for m in conversation_history[-4:]:
                        history_snippets.append(f"{m.get('role', 'user').upper()}: {m.get('content', '')[:300]}")
                gemini_prompt = (
                    f"CONVERSATION HISTORY:\n{chr(10).join(history_snippets)}\n\n{user_prompt}"
                    if history_snippets else user_prompt
                )
                response = client.models.generate_content(
                    model=self.gemini_model_name,
                    contents=gemini_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instructions,
                        temperature=0.2,
                        max_output_tokens=max_tokens
                    )
                )
                if response and response.text:
                    return self._clean_text_artifacts(response.text), "gemini_tavily"
            except Exception as e:
                logger.error(f"Gemini web fallback synthesis failed: {e}")

        # 4.3: Direct Offline Text Fallback (Guarantees zero-failure output)
        sources_list = "\n".join([f"• [{r.get('title', 'Source')}]({r.get('url', '')})" for r in web_results])
        offline_answer = (
            f"🌐 Note: This topic was not found {scope_msg}. Here is the verified information found online:\n\n"
            f"{direct_answer or web_results[0].get('content', '')}\n\n"
            f"Verified Web Sources:\n{sources_list}"
        )
        return self._clean_text_artifacts(offline_answer), "tavily_direct"

    # -------------------------------------------------------------------------
    # 3. TOPIC DISCOVERY FROM SLIDES
    # -------------------------------------------------------------------------

    def categorize_slide_topics(self, slide_path: str, max_topics: int = 6) -> CategorizeTopicsResponse:
        pages = self.parser.parse(slide_path)
        slide_name = os.path.basename(slide_path)
        total_slides = len(pages)

        if total_slides == 0:
            return CategorizeTopicsResponse(
                slide_name=slide_name,
                total_slides=0,
                topics=[],
                source="rag"
            )

        num_topics = min(max_topics, max(2, total_slides // 3))
        step = max(1, total_slides // num_topics)

        topics: List[SlideTopicItem] = []
        for i in range(num_topics):
            start_page = i * step + 1
            end_page = min(total_slides, (i + 1) * step) if i < num_topics - 1 else total_slides
            
            rep_page = pages[start_page - 1]
            title = rep_page.title
            if not title or title.startswith("Slide"):
                title = f"Topic {i + 1}: Foundational Concepts"

            summary = rep_page.text.replace("\n", " ").strip()[:140]
            if not summary:
                summary = f"Core principles and mechanisms covered across slides {start_page} to {end_page}."

            words = [w for w in re.findall(r'\b[A-Z][a-zA-Z]{3,}\b', rep_page.text) if len(w) > 3]
            key_concepts = list(dict.fromkeys(words))[:3]
            if not key_concepts:
                key_concepts = ["Architecture", "Fundamentals"]

            topics.append(SlideTopicItem(
                id=f"topic_{i + 1}",
                title=f"{i + 1}. {title}",
                summary=summary,
                slide_range=f"Slides {start_page}-{end_page}",
                key_concepts=key_concepts
            ))

        return CategorizeTopicsResponse(
            slide_name=slide_name,
            total_slides=total_slides,
            topics=topics,
            source="rag"
        )
