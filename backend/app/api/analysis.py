"""
API router: Analysis result retrieval endpoints.

GET /analysis/{document_id}         — Full AI analysis result
GET /analysis/{document_id}/values  — Flat extracted medical values
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.dependencies import get_supabase_client
from app.services.supabase_service import get_analysis_result, get_medical_values

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.get(
    "/{document_id}",
    summary="Get full AI analysis result for a document",
)
async def get_analysis(
    document_id: str,
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    Retrieve the full structured AI analysis result from `ai_analysis_results`
    for a given document.

    Returns the complete JSON with patient info, conditions, medications,
    lab results, timeline events, findings, and summary.
    """
    data = await get_analysis_result(supabase, document_id)

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analysis result found for document '{document_id}'. "
                   "The document may still be processing or processing may have failed.",
        )

    return data


@router.get(
    "/{document_id}/values",
    summary="Get flat extracted medical values for a document",
)
async def get_values(
    document_id: str,
    supabase: Client = Depends(get_supabase_client),
) -> list[dict]:
    """
    Retrieve flat individual medical values (lab results, medications, diagnoses)
    from `extracted_medical_values` for a given document.

    Useful for building timelines, charts, and summary views.
    """
    values = await get_medical_values(supabase, document_id)
    return values
