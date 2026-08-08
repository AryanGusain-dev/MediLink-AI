"""
Gemini API service wrapper.

Handles client initialization, prompt building, and JSON response parsing
with retry logic for the LLM reasoning layer.
"""

from __future__ import annotations

import json
import structlog
from functools import lru_cache

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from app.config import get_settings

log = structlog.get_logger(__name__)
settings = get_settings()


@lru_cache(maxsize=1)
def get_gemini_model():
    """Initialize and cache the Gemini generative model."""
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel(
        model_name=settings.gemini_model,
        generation_config=GenerationConfig(
            response_mime_type="application/json",
            temperature=0.1,       # Low temperature for consistent structured output
            top_p=0.95,
            max_output_tokens=8192,
        ),
    )


ANALYSIS_SCHEMA = """
{
  "patient": {
    "name": "string or null",
    "age": "integer or null",
    "gender": "string or null",
    "dob": "string or null",
    "blood_group": "string or null",
    "patient_id": "string or null",
    "address": "string or null",
    "phone": "string or null"
  },
  "doctor": {
    "name": "string or null",
    "specialty": "string or null",
    "license_number": "string or null",
    "phone": "string or null",
    "email": "string or null"
  },
  "hospital": {
    "name": "string or null",
    "address": "string or null",
    "phone": "string or null",
    "department": "string or null"
  },
  "document": {
    "report_date": "string or null",
    "report_type": "string or null",
    "accession_number": "string or null"
  },
  "conditions": [
    {
      "name": "string",
      "icd_code": "string or null",
      "status": "active|resolved|chronic|null",
      "notes": "string or null"
    }
  ],
  "medications": [
    {
      "name": "string",
      "dosage": "string or null",
      "frequency": "string or null",
      "route": "string or null",
      "duration": "string or null",
      "prescribed_by": "string or null"
    }
  ],
  "lab_results": [
    {
      "test_name": "string",
      "value": "string or null",
      "unit": "string or null",
      "reference_range": "string or null",
      "is_abnormal": "boolean",
      "flag": "H|L|CRITICAL|null"
    }
  ],
  "timeline_events": [
    {
      "date": "string or null",
      "event": "string",
      "category": "diagnosis|medication|procedure|lab|null"
    }
  ],
  "important_findings": [
    {
      "finding": "string",
      "severity": "low|medium|high|critical|null",
      "action_required": "boolean"
    }
  ],
  "summary": "string — 2 to 4 sentence plain English summary of the document",
  "document_category": "Blood Test|Prescription|MRI|CT Scan|X-Ray|Insurance|Other",
  "generated_title": "string — a short descriptive title for this document"
}
"""


def build_prompt(document_text: str, sections: list[dict], tables: list[dict]) -> str:
    """Build the structured Gemini prompt from the preprocessed document content."""

    sections_text = "\n\n".join(
        f"## {s['heading']}\n{s['content']}" for s in sections
    ) if sections else document_text

    tables_text = ""
    if tables:
        table_lines = []
        for i, table in enumerate(tables, 1):
            table_lines.append(f"### Table {i}: {table.get('title', 'Untitled')}")
            rows = table.get("rows", [])
            if rows:
                table_lines.append(str(rows))
        tables_text = "\n".join(table_lines)

    prompt = f"""You are an expert medical document analyst with deep knowledge of clinical terminology, laboratory values, medications, and medical imaging reports.

Analyze the following structured medical document and return ONLY valid JSON matching the schema below.
Do not include any text, explanation, or markdown outside the JSON object.

REQUIRED OUTPUT SCHEMA:
{ANALYSIS_SCHEMA}

INSTRUCTIONS:
- Extract ALL patient information, doctor details, and hospital/facility information visible in the document.
- For lab results, always include reference ranges and flag abnormal values as true with the appropriate flag (H=High, L=Low, CRITICAL=Critical).
- For medications, include complete dosage instructions as written.
- Generate timeline_events in chronological order where dates can be determined.
- The summary must be plain English, suitable for a non-medical audience, 2-4 sentences.
- document_category must be exactly one of: Blood Test, Prescription, MRI, CT Scan, X-Ray, Insurance, Other.
- generated_title should be a short (5-10 words) descriptive title.
- Use null for any field where the information is not present in the document.
- Return empty arrays [] for lists where no items are found.

DOCUMENT CONTENT:

{sections_text}

{f"TABLES FOUND IN DOCUMENT:{chr(10)}{tables_text}" if tables_text else ""}

Return ONLY the JSON object. No preamble, no explanation."""

    return prompt


async def call_gemini(prompt: str) -> dict:
    """
    Send the prompt to Gemini and return the parsed JSON dict.
    The model is configured to return application/json.
    """
    model = get_gemini_model()
    log.info("gemini.request_start", prompt_chars=len(prompt))

    response = await model.generate_content_async(prompt)

    raw_text = response.text or ""
    log.info("gemini.response_received", response_chars=len(raw_text))

    # Strip any accidental markdown fences
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.rsplit("```", 1)[0]

    parsed = json.loads(raw_text.strip())
    return parsed
