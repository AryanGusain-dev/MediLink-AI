"""Tests for Layer 3 — Preprocessing."""

import pytest
from app.models.extraction import RawExtractionResult
from app.pipeline.preprocessing import preprocess_document


def make_raw(text: str, tables=None, metadata=None) -> RawExtractionResult:
    return RawExtractionResult(
        text=text,
        tables=tables or [],
        images=[],
        page_count=1,
        metadata=metadata or {},
    )


def test_preprocess_basic_text():
    raw = make_raw("  Patient:  John Doe  \n\nDiagnosis:  DM  \n\n")
    result = preprocess_document(raw)
    assert result.extracted_text  # non-empty
    assert len(result.sections) >= 1


def test_preprocess_removes_duplicate_lines():
    header = "CONFIDENTIAL"
    raw = make_raw("\n".join([header] * 10 + ["Patient: Jane Doe", "Blood Pressure: 120/80"]))
    result = preprocess_document(raw)
    # The repeated CONFIDENTIAL should be deduplicated
    assert result.extracted_text.count(header) <= 1


def test_preprocess_section_splitting():
    text = (
        "PATIENT INFORMATION\n"
        "Name: Aryan\nAge: 25\n\n"
        "LAB RESULTS\n"
        "Hemoglobin: 14.2 g/dL\nWBC: 7500 /uL\n"
    )
    raw = make_raw(text)
    result = preprocess_document(raw)
    headings = [s["heading"] for s in result.sections]
    # Should detect at least one of the sections
    assert any("PATIENT" in h or "LAB" in h for h in headings)


def test_preprocess_merges_continued_tables():
    tables = [
        {"title": "Lab Results", "rows": [{"test": "HB", "value": "14"}]},
        {"title": "Lab Results (continued)", "rows": [{"test": "WBC", "value": "7500"}]},
    ]
    raw = make_raw("some text", tables=tables)
    result = preprocess_document(raw)
    assert len(result.tables) == 1
    assert len(result.tables[0]["rows"]) == 2


def test_preprocess_empty_text():
    raw = make_raw("")
    result = preprocess_document(raw)
    assert result.extracted_text == ""
    assert isinstance(result.sections, list)
