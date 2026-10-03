"""
EduFlow AI - Quiz Generation Service (Gemini / Groq / Azure OpenAI)
====================================================================

The LLM is chosen in ai-agent/.env:
    QUIZ_LLM_PROVIDER = gemini | groq | azure   (default: gemini)
    QUIZ_LLM_MODEL    = optional model/deployment override; otherwise
                        GEMINI_MODEL, GROQ_MODEL or AZURE_OPENAI_CHAT_DEPLOYMENT.

Grounded, schema-validated assessment generation for instructors.

Design rules (LMS refactor, PR 7):
- Generation ALWAYS calls the configured LLM with a strict JSON schema; template questions
  are forbidden. If the LLM is unavailable or its output fails validation, the
  call fails loudly (no canned fallback questions, no "correct index 0").
- Questions must be grounded in real course material: parsed lecture slides
  and/or the module context (description, topics, content items) resolved from
  the database by the .NET backend. Every question cites its slide.
- Output is validated with Pydantic before it leaves this service. The .NET
  marking service stays the single source of truth for marks; this service only
  proposes question drafts that await instructor review and publication.

Pipeline:
    Instructor request
        -> content digest (slides + module context)
        -> Gemini / Groq / Azure OpenAI (JSON mode)
        -> Pydantic + domain validation (retry once with the error list)
        -> validated GenerateSlideQuizResponse / SingleQuestionRegenerateResponse
"""

import json
import logging
import os
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from models.schemas import (
    GenerateSlideQuizRequest,
    GenerateSlideQuizResponse,
    QuizQuestionItem,
    RegeneratedQuestionItem,
    SingleQuestionRegenerateRequest,
    SingleQuestionRegenerateResponse,
)

logger = logging.getLogger(__name__)

# Question formats this service can generate. Formats outside this list are
# rejected during validation rather than silently mapped to multiple choice.
SUPPORTED_QUESTION_TYPES = (
    "MULTIPLE_CHOICE",
    "MULTIPLE_SELECT",
    "TRUE_FALSE",
    "FILL_IN_THE_BLANK",
    "SHORT_ANSWER",
    "MATCHING",
)
CHOICE_TYPES = {"MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE"}
BLOOMS_LEVELS = ("Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating")

# Cap the grounding material so prompts stay focused (Gemini Flash handles
# far more, but focused context measurably improves question quality).
MAX_CONTENT_CHARS = 16000
# Without slides, the module's DB text is the only grounding. Below this size it is
# just a title/placeholder, and the model ends up writing questions *about the module
# record* instead of the subject, so refuse rather than produce junk.
MIN_CONTEXT_CHARS_WITHOUT_SLIDES = 400
MAX_ATTEMPTS = 2  # initial attempt + one corrective retry with validation errors
MAX_OUTPUT_TOKENS = 8192
REQUEST_TIMEOUT_SECONDS = 60

# QUIZ_LLM_PROVIDER values (a few common spellings are accepted).
PROVIDER_ALIASES = {"google": "gemini", "grok": "groq", "azure_openai": "azure", "azure-openai": "azure"}
PROVIDER_LABELS = {"gemini": "Gemini", "groq": "Groq", "azure": "Azure OpenAI"}
PROVIDER_KEY_VARS = {"gemini": "GEMINI_API_KEY", "groq": "GROQ_API_KEY", "azure": "AZURE_OPENAI_API_KEY"}
PROVIDER_MODEL_VARS = {"gemini": "GEMINI_MODEL", "groq": "GROQ_MODEL", "azure": "AZURE_OPENAI_CHAT_DEPLOYMENT"}


class QuizGenerationUnavailable(Exception):
    """Raised when the quiz LLM is not configured or unreachable. Never fall back."""


class QuizGenerationValidationError(Exception):
    """Raised when the model output cannot be repaired into the strict schema."""

    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


class GeminiQuizGenerationService:
    """LLM-backed quiz generation grounded in real course content."""

    def __init__(self, rag_service):
        # Reuse the RAG service's slide parser and provider configuration so
        # generation stays consistent with the rest of the AI microservice.
        self._rag = rag_service
        self._azure_deployment_cache: Optional[str] = None
        self._azure_deployments_seen: List[str] = []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_quiz(self, request: GenerateSlideQuizRequest) -> GenerateSlideQuizResponse:
        num_questions = request.effective_question_count()
        target_topics = request.effective_target_topics()
        question_types = request.effective_question_types()
        slide_path = request.effective_slide_path()

        content = self._build_content_context(
            slide_path=slide_path,
            module_context=request.module_context,
            module_description=request.module_description,
        )
        if not content.strip():
            raise ValueError(
                "No course material is available for this module. Upload lecture slides "
                "or add topics/content items before generating an AI quiz."
            )
        has_slides = self._count_slides(slide_path) > 0
        logger.info("Quiz generation context: slides=%s, chars=%d", has_slides, len(content))
        if not has_slides and len(content.strip()) < MIN_CONTEXT_CHARS_WITHOUT_SLIDES:
            raise ValueError(
                "This module has no lecture slides and too little written content to build a "
                "meaningful quiz. Upload the lecture slides (PDF) for this module, or add "
                "detailed topic descriptions/content items, then try again."
            )

        prompt = self._build_quiz_prompt(
            content=content,
            num_questions=num_questions,
            target_topics=target_topics,
            question_types=question_types,
            difficulty=request.difficulty,
            course_title=request.course_title,
            module_title=request.module_title or "Course Module",
            topic_title=request.topic_title,
            learning_objectives=request.learning_objectives,
            has_slides=has_slides,
        )

        total_slides = self._count_slides(slide_path)
        payload = self._call_with_validation(
            prompt,
            lambda p: self._validate_quiz_payload(p, num_questions=num_questions,
                                                  question_types=question_types,
                                                  total_slides=total_slides),
            temperature=0.3,
        )
        questions = [self._to_question_item(q, i + 1) for i, q in enumerate(payload["questions"])]
        title_topic = request.topic_title or request.module_title or "Course Module"
        return GenerateSlideQuizResponse(
            quiz_id=str(uuid.uuid4()),
            workflow_id=f"wf-qz-{uuid.uuid4().hex[:8]}",
            title=f"{title_topic} Assessment ({request.difficulty})",
            target_topics=target_topics or [title_topic],
            difficulty=request.difficulty,
            total_points=sum(q.points for q in questions),
            validation_passed=True,
            status="PendingInstructorApproval",
            source=self.provider,
            questions=questions,
        )

    def regenerate_question(self, request: SingleQuestionRegenerateRequest) -> SingleQuestionRegenerateResponse:
        slide_path = request.effective_slide_path()
        content = self._build_content_context(
            slide_path=slide_path,
            module_context=request.module_context,
        )
        if not content.strip():
            raise ValueError(
                "No course material is available to regenerate this question. Upload lecture "
                "slides or add topics/content items to the module first."
            )

        prompt = self._build_regenerate_prompt(
            content=content,
            focus_topic=request.focus_topic,
            prompt_guidance=request.prompt_guidance,
            target_type=request.target_type,
            target_difficulty=request.target_difficulty,
            learning_objective=request.learning_objective,
            source_question_text=request.source_question_text,
            has_slides=self._count_slides(slide_path) > 0,
        )

        payload = self._call_with_validation(
            prompt,
            lambda p: self._validate_single_question_payload(
                p, total_slides=self._count_slides(slide_path)),
            temperature=0.2,
        )

        return SingleQuestionRegenerateResponse(
            question=RegeneratedQuestionItem(
                question_id=request.question_id,
                question_text=payload["question"]["question_text"],
                question_type=payload["question"]["question_type"],
                blooms_taxonomy_level=payload["question"]["blooms_taxonomy_level"],
                options=payload["question"].get("options", []),
                correct_answer=payload["question"]["correct_answer"],
                explanation=payload["question"]["explanation"],
                distractor_rationales=payload["question"].get("distractor_rationales", []),
                marking_scheme=payload["question"].get("marking_scheme"),
                learning_objective=request.learning_objective,
                slide_citation=payload["question"].get("slide_citation"),
            ),
            validation_passed=True,
            source=self.provider,
        )

    # ------------------------------------------------------------------
    # Gemini call + validation loop
    # ------------------------------------------------------------------

    def _call_with_validation(self, prompt: str, validator, temperature: float) -> Dict[str, Any]:
        """Call the LLM, validate, and retry once feeding the errors back in."""
        errors: List[str] = []
        last_payload: Optional[Dict[str, Any]] = None
        for attempt in range(MAX_ATTEMPTS):
            attempt_prompt = prompt
            if errors:
                attempt_prompt = (
                    f"{prompt}\n\nYOUR PREVIOUS ATTEMPT WAS REJECTED FOR THESE EXACT REASONS:\n"
                    + "\n".join(f"- {e}" for e in errors)
                    + "\n\nReturn corrected JSON that satisfies every requirement."
                )
            raw = self._call_llm_json(attempt_prompt, temperature=temperature)
            last_payload = self._parse_json_object(raw)
            if last_payload is None:
                errors = ["The model did not return a JSON object."]
                continue
            errors = validator(last_payload)
            if not errors:
                return last_payload

        raise QuizGenerationValidationError(errors or ["The model returned an empty response."])

    # ------------------------------------------------------------------
    # Provider selection (QUIZ_LLM_PROVIDER / QUIZ_LLM_MODEL in .env)
    # ------------------------------------------------------------------

    @property
    def provider(self) -> str:
        """Which LLM generates quizzes: "gemini", "groq" or "azure" (read live from .env)."""
        raw = (os.environ.get("QUIZ_LLM_PROVIDER") or "gemini").strip().lower()
        return PROVIDER_ALIASES.get(raw, raw)

    @property
    def model_name(self) -> str:
        """QUIZ_LLM_MODEL overrides the provider's own model/deployment setting."""
        override = (os.environ.get("QUIZ_LLM_MODEL") or "").strip()
        if override:
            return override
        provider = self.provider
        if provider == "groq":
            return self._rag.groq_model_name or "openai/gpt-oss-120b"
        if provider == "azure":
            return (os.environ.get("AZURE_OPENAI_CHAT_DEPLOYMENT") or "").strip()
        return self._rag.gemini_model_name or "models/gemini-flash-latest"

    @property
    def provider_label(self) -> str:
        return PROVIDER_LABELS.get(self.provider, self.provider)

    def _call_llm_json(self, prompt: str, temperature: float) -> str:
        """Single call to the configured provider that must answer with raw JSON."""
        provider = self.provider
        callers = {
            "gemini": self._call_gemini_json,
            "groq": self._call_groq_json,
            "azure": self._call_azure_json,
        }
        if provider not in callers:
            raise QuizGenerationUnavailable(
                f"Unknown QUIZ_LLM_PROVIDER '{provider}' in ai-agent/.env. "
                "Use one of: gemini, groq, azure."
            )
        try:
            text = callers[provider](prompt, temperature)
            if not text or not text.strip():
                raise QuizGenerationUnavailable(f"{self.provider_label} returned an empty response.")
            return text
        except (QuizGenerationUnavailable, QuizGenerationValidationError):
            raise
        except Exception as exc:  # network, quota, safety-block, SDK errors
            message = self._describe_provider_error(exc)
            logger.warning(
                "%s quiz generation call failed: %s (code=%s, status=%s): %s",
                self.provider_label, type(exc).__name__, self._error_code(exc),
                getattr(exc, "status", None), str(getattr(exc, "message", None) or exc)[:500],
            )
            raise QuizGenerationUnavailable(message) from exc

    def _call_gemini_json(self, prompt: str, temperature: float) -> str:
        api_key = (self._rag.gemini_api_key or "").strip()
        if not api_key:
            raise QuizGenerationUnavailable(
                "GEMINI_API_KEY is not configured in ai-agent/.env, so the Gemini quiz generator is disabled. "
                "Add the key or switch QUIZ_LLM_PROVIDER to groq/azure."
            )
        from google import genai
        from google.genai import types
        # Gemini Flash regularly returns 503 "high demand" spikes; retry those briefly.
        client = genai.Client(api_key=api_key, http_options=types.HttpOptions(
            timeout=REQUEST_TIMEOUT_SECONDS * 1000,
            retry_options=types.HttpRetryOptions(
                attempts=4, initial_delay=2.0, max_delay=12.0,
                http_status_codes=[429, 500, 503, 504],
            ),
        ))
        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=MAX_OUTPUT_TOKENS,
                response_mime_type="application/json",
            ),
        )
        return response.text if response else ""

    def _call_groq_json(self, prompt: str, temperature: float) -> str:
        api_key = (self._rag.groq_api_key or "").strip()
        if not api_key:
            raise QuizGenerationUnavailable(
                "GROQ_API_KEY is not configured in ai-agent/.env, so the Groq quiz generator is disabled. "
                "Add the key or switch QUIZ_LLM_PROVIDER to gemini/azure."
            )
        from groq import Groq
        client = Groq(api_key=api_key, timeout=float(REQUEST_TIMEOUT_SECONDS), max_retries=2)
        completion = client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": "You are an assessment author. Reply with a single JSON object only."},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_completion_tokens=MAX_OUTPUT_TOKENS,
            response_format={"type": "json_object"},
        )
        return completion.choices[0].message.content if completion.choices else ""

    def _call_azure_json(self, prompt: str, temperature: float) -> str:
        api_key = (os.environ.get("AZURE_OPENAI_API_KEY") or "").strip()
        endpoint = (os.environ.get("AZURE_OPENAI_ENDPOINT") or "").strip()
        base_url = (os.environ.get("AZURE_OPENAI_BASE_URL") or "").strip()
        missing = [name for name, value in (
            ("AZURE_OPENAI_API_KEY", api_key),
            ("AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_BASE_URL", endpoint or base_url),
        ) if not value]
        if missing:
            raise QuizGenerationUnavailable(
                "Azure OpenAI quiz generation is not fully configured. Set " + ", ".join(missing)
                + " in ai-agent/.env (shown in Azure AI Foundry under Keys and Endpoint)."
            )
        deployment = self.model_name or self._discover_azure_chat_deployment(api_key, endpoint or base_url)
        if not deployment:
            raise QuizGenerationUnavailable(
                "Azure OpenAI is connected, but this Azure resource has no chat model deployed "
                f"(found only: {', '.join(self._azure_deployments_seen) or 'no deployments'}). "
                "Embedding models cannot write quizzes. In Azure AI Foundry open Deployments -> Deploy model, "
                "deploy a chat model (e.g. gpt-4o-mini), then try again - it is picked up automatically, "
                "or set AZURE_OPENAI_CHAT_DEPLOYMENT in ai-agent/.env."
            )
        if endpoint:
            from openai import AzureOpenAI
            client = AzureOpenAI(
                api_key=api_key,
                azure_endpoint=endpoint,
                api_version=(os.environ.get("AZURE_OPENAI_API_VERSION") or "2024-10-21").strip(),
                timeout=float(REQUEST_TIMEOUT_SECONDS),
                max_retries=2,
            )
        else:
            # The /openai/v1 endpoint speaks the plain OpenAI protocol (no api-version).
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=base_url,
                            timeout=float(REQUEST_TIMEOUT_SECONDS), max_retries=2)
        request = dict(
            model=deployment,
            messages=[
                {"role": "system", "content": "You are an assessment author. Reply with a single JSON object only."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            max_completion_tokens=MAX_OUTPUT_TOKENS,
        )
        try:
            completion = client.chat.completions.create(temperature=temperature, **request)
        except Exception as exc:
            # Reasoning deployments (o-series, gpt-5) only accept the default temperature.
            if self._error_code(exc) == 400 and "temperature" in str(exc).lower():
                completion = client.chat.completions.create(**request)
            else:
                raise
        return completion.choices[0].message.content if completion.choices else ""

    def _discover_azure_chat_deployment(self, api_key: str, endpoint: str) -> str:
        """Find a chat deployment on the Azure resource when none is configured.

        Only a successful match is cached, so a model deployed later is picked
        up on the next request without restarting the service.
        """
        if self._azure_deployment_cache:
            return self._azure_deployment_cache
        import urllib.request
        root = re.sub(r"/openai(/v1)?/?$", "", endpoint.rstrip("/"))
        url = f"{root}/openai/deployments?api-version=2022-12-01"
        try:
            with urllib.request.urlopen(
                urllib.request.Request(url, headers={"api-key": api_key}), timeout=20
            ) as resp:
                data = json.load(resp).get("data", [])
        except Exception as exc:
            logger.warning("Could not list Azure OpenAI deployments: %s", exc)
            return ""
        non_chat = ("embedding", "whisper", "tts", "dall-e", "gpt-image", "sora")
        self._azure_deployments_seen = [d.get("id", "") for d in data]
        for d in data:
            model = str(d.get("model", "")).lower()
            if d.get("status") == "succeeded" and not any(tag in model for tag in non_chat):
                self._azure_deployment_cache = d.get("id", "")
                logger.info("Using Azure OpenAI chat deployment '%s' (%s)", d.get("id"), model)
                return self._azure_deployment_cache
        return ""

    # ------------------------------------------------------------------
    # Error messages an instructor can act on
    # ------------------------------------------------------------------

    @staticmethod
    def _error_code(exc: Exception) -> Optional[int]:
        # google-genai uses .code; openai/groq SDKs use .status_code.
        for attr in ("code", "status_code"):
            value = getattr(exc, attr, None)
            if isinstance(value, int):
                return value
        return None

    def _describe_provider_error(self, exc: Exception) -> str:
        """Turn an SDK/network exception into a message an instructor can act on."""
        code = self._error_code(exc)
        status = str(getattr(exc, "status", "") or "").upper()
        detail = str(getattr(exc, "message", "") or "").strip()
        label = self.provider_label
        provider = self.provider
        key_var = PROVIDER_KEY_VARS.get(provider, "the API key")
        model_var = ("QUIZ_LLM_MODEL" if (os.environ.get("QUIZ_LLM_MODEL") or "").strip()
                     else PROVIDER_MODEL_VARS.get(provider, "QUIZ_LLM_MODEL"))
        model = self.model_name

        if code == 429 or status == "RESOURCE_EXHAUSTED":
            return (
                f"The {label} quota for this API key has been used up (rate limit / daily limit reached). "
                f"Wait a few minutes and try again, or set a {key_var} with available quota "
                "(or switch QUIZ_LLM_PROVIDER) in ai-agent/.env."
            )
        if code in (401, 403) or status in ("UNAUTHENTICATED", "PERMISSION_DENIED"):
            return (
                f"The {label} API key was rejected (invalid, expired or missing permission). "
                f"Check {key_var} in ai-agent/.env and restart the AI service."
            )
        if code == 404 or status == "NOT_FOUND":
            what = "deployment" if provider == "azure" else "model"
            return (
                f"The configured {label} {what} '{model}' was not found or is not available for this key. "
                f"Update {model_var} in ai-agent/.env."
            )
        if code == 413:
            return (
                f"The lecture material is too large for the {label} model '{model}'. "
                "Choose a model with a larger context window."
            )
        if code in (400, 422) or status in ("INVALID_ARGUMENT", "FAILED_PRECONDITION"):
            text = str(exc)
            if "api key" in detail.lower() or "API_KEY" in detail:
                return f"The {label} API key is invalid. Check {key_var} in ai-agent/.env and restart the AI service."
            if "content_filter" in text or "content management policy" in text.lower():
                return f"{label} blocked the request with its content filter. Try different slides or relax the content filter."
            return f"{label} rejected the quiz request: {detail or text[:300] or status or 'bad request'}"
        if isinstance(code, int) and code >= 500:
            return (
                f"{label} is temporarily overloaded or unavailable (server error {code}). "
                "Please try again in a minute."
            )

        name = type(exc).__name__.lower()
        if "timeout" in name or "timedout" in name:
            return f"{label} did not respond in time. Please try again; large slide decks can take longer."
        if "connect" in name or "network" in name:
            return (
                f"The AI service could not reach {label} (network/connection error). "
                "Check the internet connection and the endpoint in ai-agent/.env."
            )
        return f"{label} call failed ({type(exc).__name__}): {detail or str(exc)[:200] or 'unknown error'}"

    @staticmethod
    def _parse_json_object(raw: str) -> Optional[Dict[str, Any]]:
        """Parse a JSON object out of the model output (tolerates code fences)."""
        if raw is None:
            return None
        text = raw.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE).strip()
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            return None
        return payload if isinstance(payload, dict) else None

    # ------------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------------

    def _validate_quiz_payload(
        self,
        payload: Dict[str, Any],
        num_questions: int,
        question_types: List[str],
        total_slides: int,
    ) -> List[str]:
        errors: List[str] = []
        questions = payload.get("questions")
        if not isinstance(questions, list) or not questions:
            return ["The response must contain a non-empty 'questions' array."]

        if len(questions) != num_questions:
            errors.append(f"Exactly {num_questions} questions are required; the response has {len(questions)}.")

        for i, q in enumerate(questions[:num_questions]):
            errors.extend(
                self._validate_question_fields(q, f"Question {i + 1}", question_types, total_slides)
            )
        return errors

    def _validate_single_question_payload(self, payload: Dict[str, Any], total_slides: int) -> List[str]:
        question = payload.get("question")
        if not isinstance(question, dict):
            return ["The response must contain a 'question' object."]
        return self._validate_question_fields(question, "The question", None, total_slides)

    def _validate_question_fields(
        self,
        q: Any,
        label: str,
        question_types: Optional[List[str]],
        total_slides: int,
    ) -> List[str]:
        if not isinstance(q, dict):
            return [f"{label} must be an object."]

        errors: List[str] = []
        q_type = str(q.get("question_type", "MULTIPLE_CHOICE")).strip().upper()
        text = (q.get("question_text") or "").strip()
        options = [str(o).strip() for o in (q.get("options") or [])]
        options = [o for o in options if o]
        correct = (q.get("correct_answer") or "").strip()

        if not text:
            errors.append(f"{label} is missing question_text.")
        if question_types is not None and q_type not in question_types:
            errors.append(
                f"{label} has question_type '{q_type}' which is not one of the requested formats: "
                f"{', '.join(question_types)}."
            )
        if q_type not in SUPPORTED_QUESTION_TYPES:
            errors.append(
                f"{label} has unsupported question_type '{q_type}'. Supported: "
                f"{', '.join(SUPPORTED_QUESTION_TYPES)}."
            )

        if q_type in CHOICE_TYPES:
            if q_type == "TRUE_FALSE":
                normalized = [o.upper() for o in options]
                if normalized != ["TRUE", "FALSE"]:
                    errors.append(f"{label} (TRUE_FALSE) must have exactly the options TRUE and FALSE.")
            else:
                if len(options) < 2:
                    errors.append(f"{label} ({q_type}) needs at least 2 options.")
                if len(options) != len(set(o.lower() for o in options)):
                    errors.append(f"{label} ({q_type}) has duplicate options.")
            if correct.upper() not in [o.upper() for o in options]:
                errors.append(
                    f"{label} ({q_type}) correct_answer '{correct}' must exactly match one of the options."
                )
        elif q_type == "MATCHING":
            pairs = q.get("matching_pairs")
            if not isinstance(pairs, list) or len(pairs) < 2:
                errors.append(f"{label} (MATCHING) requires at least 2 matching_pairs.")
            else:
                for j, pair in enumerate(pairs):
                    if not isinstance(pair, dict) or not pair.get("left") or not pair.get("right"):
                        errors.append(f"{label} matching_pairs[{j}] must have 'left' and 'right' values.")
        else:  # FILL_IN_THE_BLANK / SHORT_ANSWER
            if not correct:
                errors.append(f"{label} ({q_type}) requires a model answer in correct_answer.")

        blooms = str(q.get("blooms_taxonomy_level", "")).strip().capitalize()
        if blooms not in BLOOMS_LEVELS:
            errors.append(
                f"{label} blooms_taxonomy_level must be one of {', '.join(BLOOMS_LEVELS)}."
            )

        citation = str(q.get("slide_citation") or "").strip()
        if total_slides > 0:
            match = re.search(r"slide\s*(\d+)", citation, flags=re.IGNORECASE)
            if not match or not (1 <= int(match.group(1)) <= total_slides):
                errors.append(
                    f"{label} slide_citation must reference a real slide number (1-{total_slides}), e.g. "
                    f"'Slide 3: <slide title>'; got '{citation or None}'."
                )

        try:
            points = int(q.get("points", 10))
        except (TypeError, ValueError):
            points = 0
        if not 1 <= points <= 100:
            errors.append(f"{label} points must be an integer between 1 and 100.")

        return errors

    @staticmethod
    def _to_question_item(q: Dict[str, Any], order: int) -> QuizQuestionItem:
        q_type = str(q.get("question_type", "MULTIPLE_CHOICE")).strip().upper()
        options = [str(o).strip() for o in (q.get("options") or []) if str(o).strip()]
        correct = (q.get("correct_answer") or "").strip()

        if q_type == "TRUE_FALSE":
            options = ["TRUE", "FALSE"]
            correct = "TRUE" if correct.upper().startswith("T") else "FALSE"

        correct_index = None
        if q_type in CHOICE_TYPES:
            for idx, opt in enumerate(options):
                if opt.upper() == correct.upper():
                    correct_index = idx
                    correct = opt  # store the exact option text
                    break

        pairs = q.get("matching_pairs")
        matching_pairs = (
            [{"left": str(p["left"]), "right": str(p["right"])} for p in pairs]
            if isinstance(pairs, list) and q_type == "MATCHING"
            else None
        )

        try:
            points = int(q.get("points", 10))
        except (TypeError, ValueError):
            points = 10
        points = max(1, min(points, 100))

        return QuizQuestionItem(
            question_id=order,
            question_text=str(q.get("question_text", "")).strip(),
            question_type=q_type,
            blooms_taxonomy_level=str(q.get("blooms_taxonomy_level", "Understanding")).strip().capitalize(),
            options=options,
            correct_answer=correct or None,
            correct_index=correct_index,
            explanation=str(q.get("explanation", "")).strip(),
            marking_scheme=(str(q.get("marking_scheme")).strip() or None) if q.get("marking_scheme") else None,
            learning_objective=(str(q.get("learning_objective")).strip() or None) if q.get("learning_objective") else None,
            slide_citation=(str(q.get("slide_citation")).strip() or None) if q.get("slide_citation") else None,
            matching_pairs=matching_pairs,
            points=points,
        )

    # ------------------------------------------------------------------
    # Prompt construction
    # ------------------------------------------------------------------

    def _build_content_context(
        self,
        slide_path: Optional[str],
        module_context: Optional[str] = None,
        module_description: Optional[str] = None,
    ) -> str:
        """Real course material: parsed slide pages first, DB module context second."""
        sections: List[str] = []

        if slide_path and os.path.exists(slide_path):
            try:
                pages = self._rag.parser.parse(slide_path)
            except Exception as exc:
                logger.warning("Slide parsing failed for %s: %s", slide_path, type(exc).__name__)
                pages = []
            for page in pages:
                body = (page.text or "").replace("\n", " ").strip()
                if body:
                    sections.append(f"Slide {page.page_number} ({page.title}):\n{body}")

        if module_description and module_description.strip():
            sections.append(f"Module description: {module_description.strip()}")
        if module_context and module_context.strip():
            sections.append(module_context.strip())

        return "\n\n".join(sections)[:MAX_CONTENT_CHARS]

    def _count_slides(self, slide_path: Optional[str]) -> int:
        if not slide_path or not os.path.exists(slide_path):
            return 0
        try:
            return len(self._rag.parser.parse(slide_path))
        except Exception:
            return 0

    def _build_quiz_prompt(
        self,
        content: str,
        num_questions: int,
        target_topics: List[str],
        question_types: List[str],
        difficulty: str,
        course_title: Optional[str],
        module_title: str,
        topic_title: Optional[str],
        learning_objectives: List[str],
        has_slides: bool,
    ) -> str:
        topic_line = ", ".join(target_topics) if target_topics else (topic_title or module_title)
        objectives = "; ".join(learning_objectives) if learning_objectives else "Not specified"
        citation_rule = (
            "Every question's slide_citation MUST name the slide it is grounded in, formatted exactly "
            "like 'Slide 3: <slide title>'."
            if has_slides
            else "Set slide_citation to null for every question (no slides are attached)."
        )

        return f"""You are an expert university assessment writer for the course "{course_title or 'the course'}".
Create a {difficulty} difficulty quiz for the module "{module_title}" covering: {topic_line}.

STRICT RULES:
1. Ground EVERY question in the COURSE MATERIAL below. Never invent facts that are not present there.
   Questions must test the SUBJECT KNOWLEDGE taught in the material (concepts, definitions, methods,
   formulas, worked examples, comparisons, applications). NEVER ask about the module, course, slides,
   syllabus, descriptions, outlines, "artifacts", "entities" or how the course is organised, and never
   quote headings like "Module description" or "Topic" as if they were subject matter.
2. Produce EXACTLY {num_questions} questions, each with a distinct angle; do not repeat the same concept.
3. Allowed question_type values: {", ".join(question_types)}.
4. question_type MULTIPLE_CHOICE / MULTIPLE_SELECT: 3-5 unique options.
   question_type TRUE_FALSE: options exactly ["TRUE", "FALSE"].
   question_type FILL_IN_THE_BLANK / SHORT_ANSWER: options = [] and correct_answer = the model answer.
   question_type MATCHING: 3-5 matching_pairs objects with "left" and "right" strings, options = [].
5. correct_answer must EXACTLY equal one option for choice questions (copy the option text verbatim).
6. Every question needs explanation (why the answer is right, referencing the material) and a marking_scheme
   (how full/partial/no marks are awarded, referencing the marks).
7. blooms_taxonomy_level must be exactly one of: {", ".join(BLOOMS_LEVELS)}. Spread the levels across the quiz.
8. points is an integer between 1 and 100 (default 10).
9. {citation_rule}
10. learning_objective: the objective each question assesses, or null.
11. Answer with RAW JSON ONLY (no markdown, no commentary) matching EXACTLY this schema:
{{
  "title": "quiz title",
  "target_topics": ["..."],
  "questions": [
    {{
      "question_text": "...",
      "question_type": "MULTIPLE_CHOICE",
      "blooms_taxonomy_level": "Understanding",
      "options": ["...", "..."],
      "correct_answer": "...",
      "explanation": "...",
      "marking_scheme": "...",
      "learning_objective": null,
      "slide_citation": "Slide 2: Title",
      "points": 10
    }}
  ]
}}

COURSE MATERIAL:
{content}

QUIZ: {num_questions} questions, difficulty {difficulty}, topics: {topic_line}. Learning objectives: {objectives}.
JSON:"""

    def _build_regenerate_prompt(
        self,
        content: str,
        focus_topic: Optional[str],
        prompt_guidance: Optional[str],
        target_type: Optional[str],
        target_difficulty: Optional[str],
        learning_objective: Optional[str],
        source_question_text: Optional[str],
        has_slides: bool,
    ) -> str:
        q_type = (target_type or "MULTIPLE_CHOICE").strip().upper()
        if q_type not in SUPPORTED_QUESTION_TYPES:
            q_type = "MULTIPLE_CHOICE"
        citation_rule = (
            "The slide_citation MUST name the slide the question is grounded in, formatted exactly like "
            "'Slide 3: <slide title>'."
            if has_slides
            else "Set slide_citation to null (no slides are attached)."
        )

        return f"""You are an expert university assessment writer. Replace ONE question with a fresh, better one.

STRICT RULES:
1. Ground the question in the COURSE MATERIAL below. Never invent facts that are not present there.
   Questions must test the SUBJECT KNOWLEDGE taught in the material (concepts, definitions, methods,
   formulas, worked examples, comparisons, applications). NEVER ask about the module, course, slides,
   syllabus, descriptions, outlines, "artifacts", "entities" or how the course is organised, and never
   quote headings like "Module description" or "Topic" as if they were subject matter.
2. question_type must be {q_type}.
3. question_type MULTIPLE_CHOICE / MULTIPLE_SELECT: 3-5 unique options.
   question_type TRUE_FALSE: options exactly ["TRUE", "FALSE"].
   question_type FILL_IN_THE_BLANK / SHORT_ANSWER: options = [] and correct_answer = the model answer.
   question_type MATCHING: 3-5 matching_pairs objects with "left" and "right" strings, options = [].
4. correct_answer must EXACTLY equal one option for choice questions (copy the option text verbatim).
5. explanation: why the answer is right, referencing the material.
6. distractor_rationales: one string per option (first = why the correct answer is right, rest = why each
   wrong option is wrong).
7. blooms_taxonomy_level must be exactly one of: {", ".join(BLOOMS_LEVELS)}.
8. {citation_rule}
9. Answer with RAW JSON ONLY (no markdown, no commentary) matching EXACTLY this schema:
{{
  "question": {{
    "question_text": "...",
    "question_type": "{q_type}",
    "blooms_taxonomy_level": "Applying",
    "options": ["...", "..."],
    "correct_answer": "...",
    "explanation": "...",
    "distractor_rationales": ["...", "...", "...", "..."],
    "marking_scheme": "...",
    "slide_citation": "Slide 2: Title"
  }}
}}

COURSE MATERIAL:
{content}

CONTEXT:
- Focus topic: {focus_topic or "any topic in the module"}
- Instructor guidance: {prompt_guidance or "a fresh question on the same topic, different from the original"}
- Learning objective: {learning_objective or "Not specified"}
- Difficulty: {target_difficulty or "same as the original"}
- Original question being replaced (make the new one meaningfully different): {source_question_text or "n/a"}
JSON:"""
