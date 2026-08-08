"""
MediLink AI Backend — FastAPI Application Entry Point.

Registers all routers and configures CORS, logging, and startup events.
"""

from __future__ import annotations

import structlog
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analysis, documents, health
from app.config import get_settings

settings = get_settings()

# Configure structlog for structured JSON logging
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.debug else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(10 if settings.debug else 20),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup", service=settings.app_name, debug=settings.debug)
    yield
    log.info("shutdown", service=settings.app_name)


app = FastAPI(
    title=settings.app_name,
    description=(
        "AI-powered medical document processing pipeline. "
        "Uploads PDFs and images, extracts structured health data using Kreuzberg + Gemini, "
        "and persists results to Supabase."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(documents.router)
app.include_router(analysis.router)
