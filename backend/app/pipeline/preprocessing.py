"""
Layer 3 — Preprocessing

Takes the raw extraction output and produces a clean, normalized
CleanDocument ready for the LLM reasoning layer.
"""

from __future__ import annotations

import re
import structlog

from app.models.extraction import CleanDocument, RawExtractionResult
from app.utils.text_cleaner import clean_text
from app.utils.medical_terms import normalize_term

log = structlog.get_logger(__name__)

# Heading detection — lines that are likely section headers in medical reports
_HEADING_PATTERN = re.compile(
    r"^(?:"
    r"(?:[A-Z][A-Z\s]{3,}:?)"           # ALL CAPS heading
    r"|(?:\d+\.\s+[A-Z][a-zA-Z\s]{3,})" # Numbered heading: "1. Patient Details"
    r"|(?:#{1,3}\s+.+)"                  # Markdown heading (rare in PDFs but possible)
    r")$"
)

# Patterns for merging multi-page table rows
_TABLE_CONTINUED = re.compile(r"\(cont(?:inued)?\.?\)", re.IGNORECASE)


def preprocess_document(raw: RawExtractionResult) -> CleanDocument:
    """
    Layer 3: Clean and structure the raw extracted content.

    Steps:
    1. Clean OCR noise from text
    2. Normalize medical terms/abbreviations
    3. Split text into headed sections
    4. Merge multi-page table fragments
    5. Compose final CleanDocument

    Args:
        raw: RawExtractionResult from Layer 2.

    Returns:
        CleanDocument ready for Gemini prompt injection.
    """
    log.info("preprocessing.start", raw_char_count=len(raw.text))

    # ── Step 1 & 2: Clean and normalize ─────────────────────────────────────────
    cleaned_text = clean_text(raw.text)
    normalized_text = _normalize_medical_text(cleaned_text)

    # ── Step 3: Detect and split sections ───────────────────────────────────────
    sections = _split_into_sections(normalized_text)

    # ── Step 4: Merge multi-page table fragments ─────────────────────────────────
    merged_tables = _merge_tables(raw.tables)

    # ── Step 5: Build document metadata ─────────────────────────────────────────
    doc_metadata = _build_metadata(raw.metadata)

    log.info(
        "preprocessing.complete",
        section_count=len(sections),
        table_count=len(merged_tables),
        output_char_count=len(normalized_text),
    )

    return CleanDocument(
        document_metadata=doc_metadata,
        sections=sections,
        tables=merged_tables,
        extracted_text=normalized_text,
    )


def _normalize_medical_text(text: str) -> str:
    """Apply medical term normalization line by line to preserve structure."""
    lines = text.split("\n")
    normalized_lines = []
    for line in lines:
        # Only normalize lines that look like content (not separators or numbers)
        if len(line.strip()) > 3:
            normalized_lines.append(normalize_term(line))
        else:
            normalized_lines.append(line)
    return "\n".join(normalized_lines)


def _split_into_sections(text: str) -> list[dict]:
    """
    Split the cleaned text into logical sections based on heading detection.
    Returns a list of { heading: str, content: str } dicts.
    """
    sections: list[dict] = []
    current_heading = "General"
    current_lines: list[str] = []

    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            current_lines.append("")
            continue

        if _HEADING_PATTERN.match(stripped):
            # Save previous section
            if current_lines:
                content = "\n".join(current_lines).strip()
                if content:
                    sections.append({"heading": current_heading, "content": content})
            # Start new section
            current_heading = stripped.rstrip(":")
            current_lines = []
        else:
            current_lines.append(line)

    # Flush final section
    if current_lines:
        content = "\n".join(current_lines).strip()
        if content:
            sections.append({"heading": current_heading, "content": content})

    # If no sections were detected, wrap everything in a single section
    if not sections:
        sections = [{"heading": "Document Content", "content": text.strip()}]

    return sections


def _merge_tables(tables: list[dict]) -> list[dict]:
    """
    Merge table fragments that span multiple pages.
    Tables marked with '(continued)' headers are merged with the previous table.
    """
    if not tables:
        return []

    merged: list[dict] = []
    for table in tables:
        title = str(table.get("title", ""))
        if merged and _TABLE_CONTINUED.search(title):
            # Append rows to the previous table
            prev = merged[-1]
            prev_rows = prev.get("rows", [])
            new_rows = table.get("rows", [])
            prev["rows"] = prev_rows + new_rows
        else:
            merged.append(dict(table))  # copy to avoid mutating original

    return merged


def _build_metadata(raw_metadata: dict) -> dict:
    """Extract relevant metadata fields from the raw Kreuzberg metadata dict."""
    return {
        "author": raw_metadata.get("author", ""),
        "title": raw_metadata.get("title", ""),
        "creation_date": raw_metadata.get("creation_date", ""),
        "page_count": raw_metadata.get("page_count", 1),
        "source": raw_metadata.get("source", "kreuzberg"),
    }
