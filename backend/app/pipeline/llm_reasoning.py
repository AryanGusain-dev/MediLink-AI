"""
Layer 4 — LLM Reasoning

Sends the preprocessed CleanDocument to Gemini and returns
a validated AnalysisResult Pydantic model.

Retries up to 3 times with exponential backoff on parse failures.
"""

from __future__ import annotations

import json
import structlog
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.models.analysis import AnalysisResult
from app.models.extraction import CleanDocument
from app.services.gemini_service import build_prompt, call_gemini

log = structlog.get_logger(__name__)


async def run_llm_reasoning(clean_doc: CleanDocument) -> tuple[AnalysisResult, dict]:
    """
    Layer 4: Send the cleaned document to Gemini and return a validated AnalysisResult.

    Args:
        clean_doc: CleanDocument from Layer 3 (preprocessing).

    Returns:
        Tuple of (AnalysisResult, raw_llm_output_dict).

    Raises:
        RuntimeError if all retries fail.
    """
    log.info(
        "llm_reasoning.start",
        section_count=len(clean_doc.sections),
        table_count=len(clean_doc.tables),
    )

    prompt = build_prompt(
        document_text=clean_doc.extracted_text,
        sections=clean_doc.sections,
        tables=clean_doc.tables,
    )

    last_error: Exception | None = None

    async for attempt in AsyncRetrying(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((json.JSONDecodeError, ValueError, KeyError)),
        reraise=False,
    ):
        with attempt:
            try:
                log.info("llm_reasoning.attempt", attempt_number=attempt.retry_state.attempt_number)
                raw_output = await call_gemini(prompt)
                result = AnalysisResult.model_validate(raw_output)
                log.info(
                    "llm_reasoning.success",
                    conditions=len(result.conditions),
                    medications=len(result.medications),
                    lab_results=len(result.lab_results),
                    timeline_events=len(result.timeline_events),
                    findings=len(result.important_findings),
                    category=result.document_category,
                )
                return result, raw_output

            except (json.JSONDecodeError, ValueError) as exc:
                last_error = exc
                log.warning(
                    "llm_reasoning.parse_failed",
                    attempt=attempt.retry_state.attempt_number,
                    error=str(exc),
                )
                raise  # triggers tenacity retry

    # All retries exhausted — return a minimal safe fallback
    log.error("llm_reasoning.all_retries_failed", last_error=str(last_error))
    fallback = AnalysisResult(
        summary="Automated analysis could not be completed for this document.",
        document_category="Other",
        generated_title="Medical Document",
    )
    return fallback, {}
