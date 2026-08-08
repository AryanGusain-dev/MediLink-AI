"""
Supabase service — Layer 5 persistence.

Handles all database reads/writes and Supabase Storage uploads
after the AI pipeline completes.
"""

from __future__ import annotations

from datetime import datetime, timezone

import structlog
from supabase import Client

from app.models.analysis import AnalysisResult
from app.models.document import ProcessRequest

log = structlog.get_logger(__name__)


async def persist_pipeline_results(
    supabase: Client,
    request: ProcessRequest,
    result: AnalysisResult,
    raw_llm_output: dict,
    model_used: str,
) -> None:
    """
    Layer 5: Persist all pipeline outputs to Supabase.

    Order:
    1. Upload file bytes to Supabase Storage
    2. Update documents row (status, AI fields)
    3. Insert ai_analysis_results row
    4. Insert extracted_medical_values rows
    5. Update profiles.ai_health_summary
    6. Insert success notification

    On any error, marks document as failed.
    """
    try:
        # Step 1: Upload to Supabase Storage
        await _upload_to_storage(supabase, request)

        # Step 2: Update documents table
        await _update_document_record(supabase, request, result)

        # Step 3: Insert AI analysis result
        analysis_id = await _insert_analysis_result(supabase, request, result, raw_llm_output, model_used)

        # Step 4: Insert flat medical values
        await _insert_medical_values(supabase, request, result)

        # Step 5: Update profile AI summary
        await _update_profile_summary(supabase, request.profile_id, result)

        # Step 6: Push success notification
        await _insert_notification(
            supabase,
            profile_id=request.profile_id,
            title="Document analysed",
            message=f"'{result.generated_title}' has been processed and your health profile updated.",
            notif_type="ai_complete",
        )

        log.info("persist.success", document_id=request.document_id, analysis_id=analysis_id)

    except Exception as exc:
        log.error("persist.failed", document_id=request.document_id, error=str(exc))
        await _mark_document_failed(supabase, request.document_id, str(exc))
        await _insert_notification(
            supabase,
            profile_id=request.profile_id,
            title="Document processing failed",
            message=f"We could not analyse '{request.file_name}'. Please try uploading again.",
            notif_type="ai_error",
        )
        raise


async def _upload_to_storage(supabase: Client, request: ProcessRequest) -> None:
    """Upload the raw file bytes to Supabase Storage."""
    log.info("persist.storage_upload", storage_path=request.storage_path)
    try:
        supabase.storage.from_("documents").upload(
            path=request.storage_path,
            file=request.file_bytes,
            file_options={"content-type": request.content_type, "upsert": "true"},
        )
        log.info("persist.storage_upload_complete", storage_path=request.storage_path)
    except Exception as exc:
        # Storage upload failure is non-fatal — log and continue
        log.warning("persist.storage_upload_warning", error=str(exc))


async def _update_document_record(
    supabase: Client,
    request: ProcessRequest,
    result: AnalysisResult,
) -> None:
    """Update the documents row with AI processing results."""
    supabase.table("documents").update({
        "title": result.generated_title or request.file_name,
        "category": result.document_category,
        "document_category": result.document_category,
        "generated_title": result.generated_title,
        "status": "uploaded",
        "ai_processed": True,
        "ai_processed_at": datetime.now(timezone.utc).isoformat(),
        "mime_type": request.content_type,
        "file_size": len(request.file_bytes),
    }).eq("id", request.document_id).execute()


async def _insert_analysis_result(
    supabase: Client,
    request: ProcessRequest,
    result: AnalysisResult,
    raw_llm_output: dict,
    model_used: str,
) -> str:
    """Insert the full structured analysis into ai_analysis_results."""
    data = {
        "document_id": request.document_id,
        "profile_id": request.profile_id,
        "patient_info": result.patient.model_dump() if result.patient else None,
        "doctor_info": result.doctor.model_dump() if result.doctor else None,
        "hospital_info": result.hospital.model_dump() if result.hospital else None,
        "conditions": [c.model_dump() for c in result.conditions],
        "medications": [m.model_dump() for m in result.medications],
        "lab_results": [lr.model_dump() for lr in result.lab_results],
        "timeline_events": [te.model_dump() for te in result.timeline_events],
        "important_findings": [f.model_dump() for f in result.important_findings],
        "summary": result.summary,
        "raw_llm_output": raw_llm_output,
        "model_used": model_used,
    }
    resp = supabase.table("ai_analysis_results").insert(data).execute()
    return resp.data[0]["id"] if resp.data else "unknown"


async def _insert_medical_values(
    supabase: Client,
    request: ProcessRequest,
    result: AnalysisResult,
) -> None:
    """Flatten and insert individual medical values for fast querying."""
    rows: list[dict] = []

    for lr in result.lab_results:
        rows.append({
            "document_id": request.document_id,
            "profile_id": request.profile_id,
            "value_type": "lab_result",
            "name": lr.test_name,
            "value": lr.value,
            "unit": lr.unit,
            "reference_range": lr.reference_range,
            "is_abnormal": lr.is_abnormal,
            "recorded_at": result.document.report_date,
        })

    for med in result.medications:
        rows.append({
            "document_id": request.document_id,
            "profile_id": request.profile_id,
            "value_type": "medication",
            "name": med.name,
            "value": f"{med.dosage or ''} {med.frequency or ''}".strip(),
            "unit": med.route,
            "reference_range": None,
            "is_abnormal": False,
            "recorded_at": result.document.report_date,
        })

    for cond in result.conditions:
        rows.append({
            "document_id": request.document_id,
            "profile_id": request.profile_id,
            "value_type": "diagnosis",
            "name": cond.name,
            "value": cond.status,
            "unit": None,
            "reference_range": cond.icd_code,
            "is_abnormal": cond.status in ("active", "chronic"),
            "recorded_at": result.document.report_date,
        })

    if rows:
        supabase.table("extracted_medical_values").insert(rows).execute()
        log.info("persist.medical_values_inserted", count=len(rows))


async def _update_profile_summary(
    supabase: Client,
    profile_id: str,
    result: AnalysisResult,
) -> None:
    """Merge AI-generated health summary into the profiles table."""
    if not result.summary:
        return

    summary_payload = {
        "last_analysis_summary": result.summary,
        "detected_conditions": [c.name for c in result.conditions],
        "abnormal_flags": [lr.test_name for lr in result.lab_results if lr.is_abnormal],
    }
    supabase.table("profiles").update({
        "ai_health_summary": summary_payload,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", profile_id).execute()


async def _mark_document_failed(supabase: Client, document_id: str, error: str) -> None:
    """Mark a document as failed with the error message."""
    try:
        supabase.table("documents").update({
            "status": "failed",
            "processing_error": error[:1000],  # Truncate long errors
        }).eq("id", document_id).execute()
    except Exception as exc:
        log.error("persist.mark_failed_error", error=str(exc))


async def _insert_notification(
    supabase: Client,
    profile_id: str,
    title: str,
    message: str,
    notif_type: str,
) -> None:
    """Insert a notification row for the user."""
    try:
        supabase.table("notifications").insert({
            "profile_id": profile_id,
            "title": title,
            "message": message,
            "type": notif_type,
            "is_read": False,
        }).execute()
    except Exception as exc:
        log.warning("persist.notification_error", error=str(exc))


async def get_document_status(supabase: Client, document_id: str) -> dict | None:
    """Fetch document status fields for the polling endpoint."""
    resp = supabase.table("documents").select(
        "id, status, ai_processed, generated_title, document_category, processing_error, uploaded_at"
    ).eq("id", document_id).maybeSingle().execute()
    return resp.data


async def get_analysis_result(supabase: Client, document_id: str) -> dict | None:
    """Fetch the full AI analysis result for a document."""
    resp = supabase.table("ai_analysis_results").select("*").eq(
        "document_id", document_id
    ).maybeSingle().execute()
    return resp.data


async def get_medical_values(supabase: Client, document_id: str) -> list[dict]:
    """Fetch flat extracted medical values for a document."""
    resp = supabase.table("extracted_medical_values").select("*").eq(
        "document_id", document_id
    ).execute()
    return resp.data or []
