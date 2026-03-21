"""
Review service: admin actions on scraped events (approve, reject, edit).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from supabase import Client

from backend import db as database

logger = logging.getLogger(__name__)


def approve_event(db: Client, event_id: str, reviewed_by: str = "admin") -> dict:
    """Approve a scraped event: push to canonical events table."""
    scraped = database.get_scraped_event_detail(db, event_id)
    if not scraped:
        raise ValueError(f"Scraped event {event_id} not found")

    # Push to canonical events table
    canonical = database.push_to_canonical_events(db, scraped)

    # Update scraped event status
    database.update_scraped_event(db, event_id, {
        "status": "published",
        "canonical_event_id": canonical["id"],
        "reviewed_by": reviewed_by,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "published_at": datetime.now(timezone.utc).isoformat(),
    })

    # Increment source trust counter
    source_id = scraped["source_id"]
    db.rpc("increment_source_events_pushed", {"source_id_param": source_id}).execute()  # noqa: defined in 001_scraping_pipeline.sql

    logger.info(f"Approved event '{scraped['title']}' → canonical {canonical['id']}")
    return canonical


def reject_event(db: Client, event_id: str, reviewed_by: str = "admin") -> None:
    """Reject a scraped event."""
    database.update_scraped_event(db, event_id, {
        "status": "rejected",
        "reviewed_by": reviewed_by,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info(f"Rejected event {event_id}")


def update_and_keep_in_review(db: Client, event_id: str, updates: dict) -> dict:
    """Admin edits fields but keeps the event in review."""
    allowed_fields = {
        "title", "description_short", "description_long",
        "start_at", "end_at", "age_min", "age_max",
        "price_from", "price_to", "is_free",
        "venue_name", "venue_address", "district",
        "organizer_name", "categories", "tags",
    }
    safe_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    return database.update_scraped_event(db, event_id, safe_updates)
