"""Tests for Layer 4 — LLM Reasoning."""

import json
import pytest
from unittest.mock import AsyncMock, patch

from app.models.extraction import CleanDocument
from app.pipeline.llm_reasoning import run_llm_reasoning


VALID_LLM_RESPONSE = {
    "patient": {"name": "Aryan Sharma", "age": 25, "gender": "male"},
    "doctor": {"name": "Dr. Priya Gupta", "specialty": "General Physician"},
    "hospital": {"name": "City Medical Centre"},
    "document": {"report_date": "2024-01-15", "report_type": "Blood Test"},
    "conditions": [{"name": "Type 2 Diabetes", "status": "active"}],
    "medications": [{"name": "Metformin", "dosage": "500mg", "frequency": "twice daily"}],
    "lab_results": [
        {"test_name": "HbA1c", "value": "8.2", "unit": "%", "reference_range": "< 5.7", "is_abnormal": True, "flag": "H"}
    ],
    "timeline_events": [{"date": "2024-01-15", "event": "Blood test performed", "category": "lab"}],
    "important_findings": [{"finding": "Elevated HbA1c indicating poor glucose control", "severity": "high", "action_required": True}],
    "summary": "Patient shows elevated HbA1c levels indicating poorly controlled Type 2 Diabetes. Metformin dosage review recommended.",
    "document_category": "Blood Test",
    "generated_title": "CBC and HbA1c Blood Test Report — Jan 2024",
}


def make_clean_doc() -> CleanDocument:
    return CleanDocument(
        document_metadata={"page_count": 1},
        sections=[{"heading": "Lab Results", "content": "HbA1c: 8.2%\nBlood Sugar: 210 mg/dL"}],
        tables=[],
        extracted_text="HbA1c: 8.2%\nBlood Sugar: 210 mg/dL",
    )


@pytest.mark.asyncio
async def test_llm_reasoning_valid_response():
    with patch("app.pipeline.llm_reasoning.call_gemini", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = VALID_LLM_RESPONSE

        result, raw = await run_llm_reasoning(make_clean_doc())

    assert result.generated_title == "CBC and HbA1c Blood Test Report — Jan 2024"
    assert result.document_category == "Blood Test"
    assert len(result.lab_results) == 1
    assert result.lab_results[0].is_abnormal is True
    assert len(result.conditions) == 1
    assert raw == VALID_LLM_RESPONSE


@pytest.mark.asyncio
async def test_llm_reasoning_fallback_on_parse_failure():
    """Should return a safe fallback AnalysisResult when all retries fail."""
    with patch("app.pipeline.llm_reasoning.call_gemini", new_callable=AsyncMock) as mock_call:
        mock_call.side_effect = ValueError("Invalid JSON")

        result, raw = await run_llm_reasoning(make_clean_doc())

    # Fallback result
    assert result.document_category == "Other"
    assert result.generated_title == "Medical Document"
    assert raw == {}
