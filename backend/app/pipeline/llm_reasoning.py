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


async def run_batch_llm_reasoning(clean_docs: list[CleanDocument]) -> list[tuple[AnalysisResult, dict]]:
    """
    Consolidated Single-Request Batch LLM Reasoning.

    Bundles multiple cleaned documents into 1 single Gemini request,
    asking Gemini to return a JSON array containing structured analyses
    for all documents at once to minimize API calls and token cost.
    """
    if not clean_docs:
        return []

    log.info("batch_llm_reasoning.start", doc_count=len(clean_docs))

    # Build multi-document combined prompt
    doc_sections = []
    for idx, doc in enumerate(clean_docs):
        doc_sections.append(f"--- DOCUMENT INDEX {idx} --- \nTEXT:\n{doc.extracted_text}\n")

    combined_text = "\n".join(doc_sections)
    
    batch_prompt = f"""You are a top-tier medical AI. Analyze ALL of the following {len(clean_docs)} medical documents in ONE SINGLE RESPONSE.

For EACH document index (0 to {len(clean_docs)-1}), extract structured medical data according to the schema.

REQUIRED BATCH OUTPUT SCHEMA:
{{
  "documents": [
    {{
      "doc_index": 0,
      "summary": "2-4 sentence English summary",
      "document_category": "Blood Test|Prescription|MRI|CT Scan|X-Ray|Insurance|Other",
      "generated_title": "Descriptive Title",
      "conditions": [ {{ "name": "string", "status": "active" }} ],
      "medications": [ {{ "name": "string", "dosage": "string", "frequency": "string" }} ],
      "lab_results": [ {{ "test_name": "string", "value": "string", "unit": "string", "is_abnormal": true, "flag": "H|L|CRITICAL" }} ]
    }}
  ]
}}

DOCUMENT BATCH DATA:
{combined_text}

Return ONLY valid JSON matching the BATCH OUTPUT SCHEMA."""

    try:
        raw_output = await call_gemini(batch_prompt)
        docs_json = raw_output.get("documents", [])
        
        results = []
        for idx, doc in enumerate(clean_docs):
            doc_data = next((d for d in docs_json if d.get("doc_index") == idx), None)
            if not doc_data and idx < len(docs_json):
                doc_data = docs_json[idx]
            
            if doc_data:
                try:
                    res = AnalysisResult(
                        summary=doc_data.get("summary", "Processed medical document."),
                        document_category=doc_data.get("document_category", "Other"),
                        generated_title=doc_data.get("generated_title", "Medical Document"),
                        conditions=[Condition(**c) for c in doc_data.get("conditions", []) if isinstance(c, dict)],
                        medications=[Medication(**m) for m in doc_data.get("medications", []) if isinstance(m, dict)],
                        lab_results=[LabResult(**l) for l in doc_data.get("lab_results", []) if isinstance(l, dict)]
                    )
                    results.append((res, doc_data))
                except Exception as ve:
                    log.warning("batch_llm_reasoning.doc_parse_error", idx=idx, error=str(ve))
                    fb = AnalysisResult(summary="Batch parsed document.", document_category="Other", generated_title=f"Medical Document {idx+1}")
                    results.append((fb, {}))
            else:
                fb = AnalysisResult(summary="Batch parsed document.", document_category="Other", generated_title=f"Medical Document {idx+1}")
                results.append((fb, {}))

        log.info("batch_llm_reasoning.complete", parsed_count=len(results))
        return results

    except Exception as exc:
        log.error("batch_llm_reasoning.failed", error=str(exc))
        # Fallback to local parsing for each doc
        from app.pipeline.local_parser import LocalMedicalParser
        fallback_results = []
        for doc in clean_docs:
            res = LocalMedicalParser.parse_text(doc.extracted_text)
            fallback_results.append((res, {}))
        return fallback_results

