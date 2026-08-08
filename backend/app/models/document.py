from __future__ import annotations

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Returned immediately after POST /documents/upload (202 Accepted)."""

    document_id: str
    status: str = "processing"
    message: str = "Document received. AI processing started in background."


class DocumentStatusResponse(BaseModel):
    """Returned by GET /documents/{document_id}/status."""

    document_id: str
    status: str                        # processing | uploaded | failed
    ai_processed: bool = False
    generated_title: str | None = None
    document_category: str | None = None
    processing_error: str | None = None
    uploaded_at: str | None = None


class ProcessRequest(BaseModel):
    """Internal model passed through the pipeline stages."""

    profile_id: str
    document_id: str
    file_bytes: bytes
    file_name: str
    content_type: str
    storage_path: str
