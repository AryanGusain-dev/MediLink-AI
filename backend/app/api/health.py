"""
API router: Health check endpoints.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@router.get("/health", response_model=HealthResponse, summary="Liveness check")
async def health_check() -> HealthResponse:
    """Returns OK if the service is running."""
    return HealthResponse(status="ok", service="medilink-ai-backend", version="1.0.0")
