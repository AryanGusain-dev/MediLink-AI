"""
Layer 1 — Document Ingestion

Receives raw file bytes from the API upload handler.
Validates the file, generates storage path and document ID,
and creates a placeholder row in the Supabase `documents` table with status='processing'.
"""

from __future__ import annotations

import uuid
import structlog

from fastapi import HTTPException, UploadFile, status

from app.config import get_settings
from app.models.document import ProcessRequest
from app.utils.validators import validate_upload_file, resolve_content_type

log = structlog.get_logger(__name__)
settings = get_settings()


async def ingest_document(
    file: UploadFile,
    file_bytes: bytes,
    profile_id: str,
    supabase_client,
) -> ProcessRequest:
    """
    Layer 1: Validate the uploaded file and create a placeholder DB record.

    Args:
        file:            The FastAPI UploadFile object (carries filename, content_type).
        file_bytes:      Raw bytes of the uploaded file (already read by caller).
        profile_id:      The Supabase profile UUID of the authenticated user.
        supabase_client: Initialized Supabase client from dependencies.

    Returns:
        ProcessRequest ready to pass to Layer 2 (extraction).

    Raises:
        HTTPException 422 / 413 on validation failure.
        HTTPException 500 if DB record creation fails.
    """
    log.info("ingestion.start", profile_id=profile_id, filename=file.filename)

    # ── Step 1: Validate ────────────────────────────────────────────────────────
    validate_upload_file(file, file_bytes)

    content_type = resolve_content_type(file.filename or "", file.content_type)
    ext = (file.filename or "document").rsplit(".", 1)[-1].lower()
    document_id = str(uuid.uuid4())
    storage_path = f"{profile_id}/{document_id}.{ext}"

    log.info(
        "ingestion.validated",
        document_id=document_id,
        content_type=content_type,
        size_bytes=len(file_bytes),
        storage_path=storage_path,
    )

    # ── Step 2: Create placeholder row in `documents` table ─────────────────────
    try:
        result = supabase_client.table("documents").insert({
            "id": document_id,
            "profile_id": profile_id,
            "title": file.filename or "Medical Document",
            "file_name": file.filename or "document",
            "storage_path": storage_path,
            "mime_type": content_type,
            "file_size": len(file_bytes),
            "status": "processing",
            "category": "Other",
            "ai_processed": False,
        }).execute()

        if not result.data:
            raise RuntimeError("Empty response from Supabase insert")

    except Exception as exc:
        log.error("ingestion.db_insert_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create document record: {exc}",
        ) from exc

    log.info("ingestion.db_record_created", document_id=document_id)

    return ProcessRequest(
        profile_id=profile_id,
        document_id=document_id,
        file_bytes=file_bytes,
        file_name=file.filename or "document",
        content_type=content_type,
        storage_path=storage_path,
    )
