from __future__ import annotations

from pydantic import BaseModel, Field


class RawExtractionResult(BaseModel):
    """Output of Layer 2 — raw content extracted by Kreuzberg."""

    text: str = Field(description="Full concatenated plain text from all pages")
    tables: list[dict] = Field(default_factory=list, description="Tables extracted as list of dicts")
    images: list[str] = Field(default_factory=list, description="Base64-encoded page images")
    page_count: int = Field(default=1)
    metadata: dict = Field(
        default_factory=dict,
        description="Document metadata: author, title, creation date, etc.",
    )


class CleanDocument(BaseModel):
    """Output of Layer 3 — preprocessed, normalized content ready for LLM."""

    document_metadata: dict = Field(default_factory=dict)
    sections: list[dict] = Field(
        default_factory=list,
        description="List of { heading: str, content: str } dicts",
    )
    tables: list[dict] = Field(default_factory=list)
    extracted_text: str = Field(description="Full cleaned and normalized text")
