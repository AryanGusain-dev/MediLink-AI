"""
Layer 2 — Document Extraction

Uses Kreuzberg to extract text, tables, images and metadata
from the raw file bytes delivered by the ingestion layer.
"""

from __future__ import annotations

import asyncio
import base64
import io
import structlog

from app.models.extraction import RawExtractionResult

log = structlog.get_logger(__name__)


async def extract_document(
    file_bytes: bytes,
    content_type: str,
    file_name: str,
) -> RawExtractionResult:
    """
    Layer 2: Extract structured content from raw file bytes using Kreuzberg.

    For PDF files, Kreuzberg performs native text extraction with layout awareness.
    For image files, Kreuzberg performs OCR.

    Args:
        file_bytes:   Raw bytes of the document.
        content_type: MIME type of the document.
        file_name:    Original filename (used to help Kreuzberg infer type).

    Returns:
        RawExtractionResult with text, tables, images and metadata.
    """
    log.info("extraction.start", content_type=content_type, file_name=file_name)

    try:
        from kreuzberg import extract_bytes

        result = await extract_bytes(
            file_bytes,
            mime_type=content_type,
        )

        # Kreuzberg returns an ExtractionResult with .content (str) and .metadata (dict)
        extracted_text: str = result.content or ""
        metadata: dict = result.metadata or {}

        # Extract tables: Kreuzberg may return structured tables in metadata
        tables: list[dict] = _extract_tables_from_metadata(metadata)

        # Page count from metadata
        page_count: int = int(metadata.get("page_count", 1))

        log.info(
            "extraction.complete",
            file_name=file_name,
            char_count=len(extracted_text),
            table_count=len(tables),
            page_count=page_count,
        )

        return RawExtractionResult(
            text=extracted_text,
            tables=tables,
            images=[],          # Images are encoded if needed; skip for now to stay within LLM context
            page_count=page_count,
            metadata=metadata,
        )

    except ImportError:
        log.warning("extraction.kreuzberg_not_installed — falling back to pypdf")
        return await _fallback_extraction(file_bytes, content_type)

    except Exception as exc:
        log.error("extraction.failed", error=str(exc))
        # Attempt fallback before raising
        try:
            return await _fallback_extraction(file_bytes, content_type)
        except Exception:
            raise RuntimeError(f"Document extraction failed: {exc}") from exc


def _extract_tables_from_metadata(metadata: dict) -> list[dict]:
    """Parse table structures from Kreuzberg metadata if available."""
    tables = metadata.get("tables", [])
    if isinstance(tables, list):
        return [t if isinstance(t, dict) else {"raw": str(t)} for t in tables]
    return []


async def _fallback_extraction(file_bytes: bytes, content_type: str) -> RawExtractionResult:
    """
    Fallback extraction using pypdf for PDFs.
    Used when Kreuzberg is not installed or fails.
    """
    log.info("extraction.fallback_start", content_type=content_type)

    if content_type == "application/pdf":
        try:
            import pypdf

            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for page in reader.pages:
                pages_text.append(page.extract_text() or "")
            full_text = "\n\n".join(pages_text)
            return RawExtractionResult(
                text=full_text,
                tables=[],
                images=[],
                page_count=len(reader.pages),
                metadata={"source": "pypdf_fallback"},
            )
        except Exception as exc:
            raise RuntimeError(f"PDF fallback extraction failed: {exc}") from exc

    # For images, return minimal result — Gemini will handle image content via vision
    return RawExtractionResult(
        text="[Image document — content will be analysed by vision model]",
        tables=[],
        images=[base64.b64encode(file_bytes).decode()],
        page_count=1,
        metadata={"source": "image_passthrough"},
    )
