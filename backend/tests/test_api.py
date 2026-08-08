"""Integration tests for the FastAPI API layer."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "medilink-ai-backend"


@pytest.mark.asyncio
async def test_upload_returns_202():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "doc-uuid-1234"}]
    )

    pdf_bytes = b"%PDF-1.4 minimal test pdf content" * 50

    with patch("app.api.documents.get_supabase_client", return_value=mock_supabase):
        with patch("app.pipeline.ingestion.get_settings") as mock_settings:
            mock_settings.return_value.max_file_size_bytes = 25 * 1024 * 1024
            mock_settings.return_value.allowed_mime_types = ["application/pdf"]

            with patch("app.api.documents._run_pipeline", new_callable=AsyncMock):
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                    response = await client.post(
                        "/documents/upload",
                        files={"file": ("report.pdf", pdf_bytes, "application/pdf")},
                        data={"profile_id": "profile-uuid-123"},
                    )

    assert response.status_code == 202
    assert "document_id" in response.json()
    assert response.json()["status"] == "processing"


@pytest.mark.asyncio
async def test_status_not_found():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybeSingle.return_value.execute.return_value = MagicMock(data=None)

    with patch("app.api.documents.get_supabase_client", return_value=mock_supabase):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/documents/nonexistent-id/status")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_analysis_not_found():
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybeSingle.return_value.execute.return_value = MagicMock(data=None)

    with patch("app.api.analysis.get_supabase_client", return_value=mock_supabase):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/analysis/nonexistent-id")

    assert response.status_code == 404
