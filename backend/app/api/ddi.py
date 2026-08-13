"""
API router: Drug-Drug Interaction (DDI) Evaluation Endpoints.

POST /ddi/evaluate          — Evaluate a list of drug names directly
GET  /ddi/user/{profile_id}  — Evaluate medications belonging to a database user profile
"""

from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from supabase import Client

from app.dependencies import get_supabase_client
from app.models.ddi import UserDDIReport, DrugCombinationDDI
from app.services.ddi_service import DDIPipelineEngine, fetch_user_medications, run_ddi_pipeline_for_user

router = APIRouter(prefix="/ddi", tags=["Drug Interactions"])

# Lazy-loaded singleton DDI Engine instance
_engine_instance: Optional[DDIPipelineEngine] = None


def get_ddi_engine() -> DDIPipelineEngine:
    global _engine_instance
    if _engine_instance is None:
        try:
            _engine_instance = DDIPipelineEngine()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to initialize DDI Machine Learning Engine: {exc}",
            )
    return _engine_instance


class EvaluateRequest(BaseModel):
    drugs: List[str] = Field(..., description="List of medication names to evaluate", min_items=1)
    profile_id: Optional[str] = Field(None, description="Optional profile ID associated with request")
    threshold: float = Field(0.5, ge=0.0, le=1.0, description="Prediction confidence threshold")


@router.get(
    "/predict",
    response_model=DrugCombinationDDI,
    summary="Predict interaction for a single drug pair",
)
async def predict_single_pair(
    drug_a: str,
    drug_b: str,
    threshold: float = 0.5,
    engine: DDIPipelineEngine = Depends(get_ddi_engine),
) -> DrugCombinationDDI:
    """
    Predict DDI interaction for a single pair of drugs (drug_a and drug_b).
    """
    return engine.predict_pair(drug_a_raw=drug_a, drug_b_raw=drug_b, threshold=threshold)


@router.post(
    "/trigger/{profile_id}",
    summary="Automatically trigger DDI pipeline in background on user login",
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_user_ddi(
    profile_id: str,
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    """
    Triggers the DDI pipeline for the logged-in user in the background.
    Fetches all user medications strictly for `profile_id`, runs deep learning predictions,
    and logs execution silently without returning results to the UI.
    """
    background_tasks.add_task(run_ddi_pipeline_for_user, supabase, profile_id)
    return {
        "status": "triggered",
        "profile_id": profile_id,
        "message": f"DDI pipeline automatically triggered in background for user {profile_id}",
    }


@router.post(
    "/evaluate",
    response_model=UserDDIReport,
    summary="Evaluate DDI combinations for a list of drugs",
)
async def evaluate_drugs(
    request: EvaluateRequest,
    engine: DDIPipelineEngine = Depends(get_ddi_engine),
) -> UserDDIReport:
    """
    Evaluates all 2-drug combinations for the provided list of medication names
    using the pre-trained DDI Deep Learning model.
    """
    report = engine.evaluate_drug_list(
        drugs=request.drugs,
        profile_id=request.profile_id,
        threshold=request.threshold,
    )
    return report


@router.get(
    "/user/{profile_id}",
    response_model=UserDDIReport,
    summary="Evaluate DDI combinations for a user profile in the database",
)
async def evaluate_user_profile(
    profile_id: str,
    threshold: float = 0.5,
    supabase: Client = Depends(get_supabase_client),
    engine: DDIPipelineEngine = Depends(get_ddi_engine),
) -> UserDDIReport:
    """
    Queries medications for `profile_id` from the Supabase database,
    evaluates all drug combinations, and returns an app-ready DDI report.
    """
    medications, user_name = await fetch_user_medications(supabase, profile_id=profile_id)

    report = engine.evaluate_drug_list(
        drugs=medications,
        profile_id=profile_id,
        user_name=user_name,
        threshold=threshold,
    )
    return report
