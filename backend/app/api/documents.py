"""
API router: Document upload and status endpoints.

POST /documents/upload  — Receives file via multipart, triggers pipeline in background.
GET  /documents/{document_id}/status — Poll current processing status.
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, status
from supabase import Client

from app.dependencies import get_supabase_client
from app.models.document import DocumentStatusResponse, UploadResponse
from app.pipeline.extraction import extract_document
from app.pipeline.ingestion import ingest_document
from app.pipeline.llm_reasoning import run_llm_reasoning
from app.pipeline.preprocessing import preprocess_document
from app.services.supabase_service import (
    get_document_status,
    persist_pipeline_results,
)
from app.config import get_settings

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])
settings = get_settings()


async def _run_pipeline(
    file_bytes: bytes,
    file_name: str,
    content_type: str,
    profile_id: str,
    document_id: str,
    storage_path: str,
    supabase: Client,
) -> None:
    """
    Full 5-layer pipeline executed as a background task.
    Errors are caught and written to the documents row.
    """
    from app.models.document import ProcessRequest

    request = ProcessRequest(
        profile_id=profile_id,
        document_id=document_id,
        file_bytes=file_bytes,
        file_name=file_name,
        content_type=content_type,
        storage_path=storage_path,
    )

    try:
        # Layer 2 — Extraction
        log.info("pipeline.extraction", document_id=document_id)
        raw_extraction = await extract_document(file_bytes, content_type, file_name)

        # Layer 3 — Preprocessing
        log.info("pipeline.preprocessing", document_id=document_id)
        clean_doc = preprocess_document(raw_extraction)

        # Layer 4 — LLM Reasoning
        log.info("pipeline.llm_reasoning", document_id=document_id)
        result, raw_llm = await run_llm_reasoning(clean_doc)

        # Layer 5 — Persist
        log.info("pipeline.persisting", document_id=document_id)
        await persist_pipeline_results(
            supabase=supabase,
            request=request,
            result=result,
            raw_llm_output=raw_llm,
            model_used=settings.gemini_model,
        )

        # Layer 6 — Automatic DDI Pipeline Trigger (Silent Background Execution)
        try:
            log.info("pipeline.ddi_trigger_start", profile_id=profile_id)
            from app.services.ddi_service import run_ddi_pipeline_for_user
            await run_ddi_pipeline_for_user(supabase=supabase, profile_id=profile_id)
        except Exception as ddi_err:
            log.warning("pipeline.ddi_trigger_failed", profile_id=profile_id, error=str(ddi_err))

        log.info("pipeline.complete", document_id=document_id)

    except Exception as exc:
        log.error("pipeline.unhandled_error", document_id=document_id, error=str(exc))
        # Mark document failed
        try:
            supabase.table("documents").update({
                "status": "failed",
                "processing_error": str(exc)[:1000],
            }).eq("id", document_id).execute()
        except Exception:
            pass


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a medical document and trigger AI pipeline",
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    profile_id: str = Form(..., description="Supabase profile UUID of the authenticated user"),
    supabase: Client = Depends(get_supabase_client),
) -> UploadResponse:
    """
    **Upload a medical document (PDF or image) and trigger the 5-layer AI processing pipeline.**

    - Validates file type and size immediately.
    - Creates a placeholder `documents` row with `status='processing'`.
    - Returns `202 Accepted` with the new `document_id`.
    - The pipeline runs asynchronously in the background.
    - Poll `GET /documents/{document_id}/status` to check when processing completes.

    **Supported formats:** PDF, PNG, JPG, WEBP (max 25 MB)
    """
    # Read file bytes into memory (needed for both validation and pipeline)
    file_bytes = await file.read()

    # Layer 1 — Ingestion (validates + creates DB placeholder row)
    process_request = await ingest_document(
        file=file,
        file_bytes=file_bytes,
        profile_id=profile_id,
        supabase_client=supabase,
    )

    # Kick off the remaining pipeline layers as a background task
    background_tasks.add_task(
        _run_pipeline,
        file_bytes=file_bytes,
        file_name=process_request.file_name,
        content_type=process_request.content_type,
        profile_id=process_request.profile_id,
        document_id=process_request.document_id,
        storage_path=process_request.storage_path,
        supabase=supabase,
    )

    log.info("upload.accepted", document_id=process_request.document_id, profile_id=profile_id)

    return UploadResponse(document_id=process_request.document_id)


@router.get(
    "/{document_id}/status",
    response_model=DocumentStatusResponse,
    summary="Poll document processing status",
)
async def get_status(
    document_id: str,
    supabase: Client = Depends(get_supabase_client),
) -> DocumentStatusResponse:
    """
    Poll the current AI processing status for a document.

    Returns one of:
    - `processing` — pipeline is still running
    - `uploaded` — pipeline completed successfully
    - `failed` — pipeline failed (see `processing_error`)
    """
    doc = await get_document_status(supabase, document_id)

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )

    return DocumentStatusResponse(
        document_id=doc["id"],
        status=doc["status"],
        ai_processed=doc.get("ai_processed", False),
        generated_title=doc.get("generated_title"),
        document_category=doc.get("document_category"),
        processing_error=doc.get("processing_error"),
        uploaded_at=str(doc.get("uploaded_at", "")),
    )


@router.get(
    "/{document_id}/download",
    summary="Download or stream document file content",
)
async def download_document_file(
    document_id: str,
    supabase: Client = Depends(get_supabase_client),
):
    """
    Retrieves document metadata from database and streams the file from Supabase Storage.
    """
    res = supabase.table("documents").select("*").eq("id", document_id).maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = res.data
    storage_path = doc.get("storage_path")
    file_name = doc.get("file_name") or doc.get("title") or "document.pdf"
    mime_type = doc.get("mime_type") or "application/pdf"

    if storage_path:
        try:
            file_bytes = supabase.storage.from_("documents").download(storage_path)
            from fastapi.responses import Response
            return Response(
                content=file_bytes,
                media_type=mime_type,
                headers={"Content-Disposition": f'inline; filename="{file_name}"'},
            )
        except Exception as exc:
            log.warning("storage.download_failed", document_id=document_id, error=str(exc))

    raise HTTPException(status_code=404, detail="File content not available in storage")
