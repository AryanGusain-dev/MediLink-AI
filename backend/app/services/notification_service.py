"""
Notification service — thin wrapper over supabase_service for push notifications.
Kept separate for easy extension (e.g., email/push integrations in the future).
"""

from __future__ import annotations

import structlog
from supabase import Client

log = structlog.get_logger(__name__)


async def notify_user(
    supabase: Client,
    profile_id: str,
    title: str,
    message: str,
    notif_type: str = "info",
) -> None:
    """
    Insert a notification row in the Supabase `notifications` table.

    Args:
        supabase:    Initialized Supabase client.
        profile_id:  Profile UUID of the target user.
        title:       Short notification title.
        message:     Detailed notification message.
        notif_type:  One of 'info' | 'success' | 'warning' | 'danger' | 'ai_complete' | 'ai_error'
    """
    try:
        supabase.table("notifications").insert({
            "profile_id": profile_id,
            "title": title,
            "message": message,
            "type": notif_type,
            "is_read": False,
        }).execute()
        log.info("notification.sent", profile_id=profile_id, type=notif_type)
    except Exception as exc:
        log.warning("notification.failed", error=str(exc), profile_id=profile_id)
