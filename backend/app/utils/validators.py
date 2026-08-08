"""
File validation utilities for the ingestion layer.
Checks MIME type and file size before the pipeline starts.
"""

from __future__ import annotations

from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

settings = get_settings()

EXTENSION_TO_MIME: dict[str, str] = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


def validate_upload_file(file: UploadFile, file_bytes: bytes) -> None:
    """
    Validate file type and size.
    Raises HTTP 422 if validation fails.
    """
    # 1. MIME type check
    content_type = file.content_type or ""

    # Fall back to extension-based check if content_type is generic
    if content_type in ("application/octet-stream", "", None):
        filename = file.filename or ""
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        content_type = EXTENSION_TO_MIME.get(ext, "application/octet-stream")

    if content_type not in settings.allowed_mime_types:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Unsupported file type '{content_type}'. "
                f"Allowed types: {', '.join(settings.allowed_mime_types)}"
            ),
        )

    # 2. File size check
    size_bytes = len(file_bytes)
    if size_bytes > settings.max_file_size_bytes:
        size_mb = size_bytes / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File size {size_mb:.1f} MB exceeds the maximum allowed "
                f"{settings.max_file_size_mb} MB."
            ),
        )

    # 3. Non-empty check
    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )


def resolve_content_type(filename: str, declared_type: str | None) -> str:
    """Return the best-guess MIME type for a file."""
    if declared_type and declared_type in settings.allowed_mime_types:
        return declared_type
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return EXTENSION_TO_MIME.get(ext, "application/octet-stream")
