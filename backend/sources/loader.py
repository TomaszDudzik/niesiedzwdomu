"""Load source configuration from the scrape_sources table."""

from __future__ import annotations

from backend.db import get_client


def _db_row_to_source_dict(row: dict) -> dict:
    """Convert a Supabase scrape_sources row to a plain dict
    with the keys the pipeline expects."""
    return {
        "id": row["id"],
        "name": row.get("name", ""),
        "base_url": row.get("base_url", ""),
        "extractor_type": row.get("extractor_type", "generic"),
        "is_active": row.get("is_active", False),
        "content_type": row.get("content_type", "wydarzenia"),
        "listing_urls": row.get("listing_urls") or [],
        "default_venue_name": row.get("default_venue_name"),
        "default_venue_address": row.get("default_venue_address"),
        "default_district": row.get("default_district"),
        "default_organizer": row.get("default_organizer"),
        "default_is_free": row.get("default_is_free"),
        "scrape_interval_hours": row.get("scrape_interval_hours", 24),
        "notes": row.get("notes"),
    }


def load_source_by_id(source_id: str) -> dict | None:
    """Fetch a single source from the DB by its UUID."""
    db = get_client()
    result = (
        db.table("scrape_sources")
        .select("*")
        .eq("id", source_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    return _db_row_to_source_dict(result.data[0])
