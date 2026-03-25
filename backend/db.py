"""
Database access layer using supabase-py.
"""

from __future__ import annotations

from datetime import datetime, timezone

from supabase import create_client, Client

from backend.config import config


def get_client() -> Client:
    """Return a Supabase client with service role (full access)."""
    return create_client(config.supabase_url, config.supabase_service_key)


def expire_past_events(db: Client) -> int:
    """Mark published scraped events as expired if their date has passed."""
    now = datetime.now(timezone.utc).isoformat()
    result = (
        db.table("scraped_events")
        .update({"status": "expired"})
        .eq("status", "published")
        .lt("end_at", now)
        .execute()
    )
    return len(result.data)
