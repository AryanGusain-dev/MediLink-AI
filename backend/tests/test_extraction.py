"""Tests for Layer 2 — Document Extraction."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.pipeline.extraction import extract_document


MINIMAL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
    b"xref\n0 4\n0000000000 65535 f\n"
    b"trailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n0\n%%EOF"
)


@pytest.mark.asyncio
async def test_extraction_fallback_on_no_kreuzberg():
    """Test that pypdf fallback works when Kreuzberg is not installed."""
    with patch("app.pipeline.extraction.extract_bytes", side_effect=ImportError("no kreuzberg")):
        with patch("pypdf.PdfReader") as mock_reader:
            mock_page = MagicMock()
            mock_page.extract_text.return_value = "Patient: John Doe\nDiagnosis: Hypertension"
            mock_reader.return_value.pages = [mock_page]
            mock_reader.return_value.pages.__len__ = lambda s: 1

            result = await extract_document(MINIMAL_PDF, "application/pdf", "test.pdf")

        assert result.text
        assert result.page_count >= 1


@pytest.mark.asyncio
async def test_extraction_image_passthrough():
    """Image files should return base64 passthrough when Kreuzberg is unavailable."""
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100

    with patch("app.pipeline.extraction.extract_bytes", side_effect=ImportError):
        result = await extract_document(png_bytes, "image/png", "scan.png")

    assert result.page_count == 1
    assert len(result.images) == 1  # base64-encoded image
