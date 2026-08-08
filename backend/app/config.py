from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    supabase_url: str
    supabase_service_key: str  # Service role key — bypasses RLS
    supabase_storage_bucket: str = "documents"

    # Gemini
    gemini_api_key: str
    gemini_model: str = "gemini-2.0-flash"

    # Upload limits
    max_file_size_mb: int = 25
    allowed_mime_types: list[str] = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
    ]

    # App
    app_name: str = "MediLink AI Backend"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
