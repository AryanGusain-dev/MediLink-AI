"""Tests for Layer 1 — Document Ingestion."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import UploadFile
from io import BytesIO

from app.pipeline.ingestion import ingest_document


def make_upload_file(filename: str, content_type: str, data: bytes) -> UploadFile:
    return UploadFile(filename=filename, file=BytesIO(data), headers={"content-type": content_type})


@pytest.mark.asyncio
async def test_ingest_valid_pdf():
    file = make_upload_file("report.pdf", "application/pdf", b"%PDF-1.4 test content" * 100)
    file_bytes = b"%PDF-1.4 test content" * 100

    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "test-uuid"}]
    )

    result = await ingest_document(
        file=file,
        file_bytes=file_bytes,
        profile_id="profile-123",
        supabase_client=mock_supabase,
    )

    assert result.profile_id == "profile-123"
    assert result.file_name == "report.pdf"
    assert result.content_type == "application/pdf"
    assert result.storage_path.endswith(".pdf")
    assert len(result.file_bytes) > 0


@pytest.mark.asyncio
async def test_ingest_rejects_unsupported_type():
    from fastapi import HTTPException
    file = make_upload_file("data.csv", "text/csv", b"col1,col2\nval1,val2")
    file_bytes = b"col1,col2\nval1,val2"

    mock_supabase = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        await ingest_document(
            file=file,
            file_bytes=file_bytes,
            profile_id="profile-123",
            supabase_client=mock_supabase,
        )
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_ingest_rejects_empty_file():
    from fastapi import HTTPException
    file = make_upload_file("empty.pdf", "application/pdf", b"")
    file_bytes = b""

    mock_supabase = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        await ingest_document(
            file=file,
            file_bytes=file_bytes,
            profile_id="profile-123",
            supabase_client=mock_supabase,
        )
    assert exc_info.value.status_code == 422
