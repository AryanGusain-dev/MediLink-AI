"""
FastAPI dependency providers.
"""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings

settings = get_settings()


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Return a cached Supabase client initialized with the service role key.
    The service role key bypasses RLS — use only in backend server code, never expose to clients.
    """
    return create_client(settings.supabase_url, settings.supabase_service_key)
