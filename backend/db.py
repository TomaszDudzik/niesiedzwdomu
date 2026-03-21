"""
Database access layer using supabase-py.
All pipeline tables are accessed via the service role client.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import create_client, Client

from backend.config import config


def get_client() -> Client:
    """Return a Supabase client with service role (full access)."""
    return create_client(config.supabase_url, config.supabase_service_key)


# ------------------------------------------------------------------
# Sources
# ------------------------------------------------------------------

def get_active_sources_due(db: Client) -> list[dict]:
    """Fetch sources that are active and due for a scrape."""
    now = datetime.now(timezone.utc)
    result = (
        db.table("scrape_sources")
        .select("*")
        .eq("is_active", True)
        .execute()
    )
    sources = []
    for s in result.data:
        last = s.get("last_scraped_at")
        interval = s.get("scrape_interval_hours", 24)
        if last is None:
            sources.append(s)
        else:
            last_dt = datetime.fromisoformat(last)
            if now - last_dt >= timedelta(hours=interval):
                sources.append(s)
    return sources


def update_source_last_scraped(db: Client, source_id: str) -> None:
    db.table("scrape_sources").update({
        "last_scraped_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", source_id).execute()


# ------------------------------------------------------------------
# Source runs
# ------------------------------------------------------------------

def create_source_run(db: Client, source_id: str) -> dict:
    result = db.table("source_runs").insert({
        "source_id": source_id,
        "status": "running",
    }).execute()
    return result.data[0]


def finish_source_run(db: Client, run_id: str, *, status: str, **counters: Any) -> None:
    db.table("source_runs").update({
        "status": status,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        **counters,
    }).eq("id", run_id).execute()


# ------------------------------------------------------------------
# Raw pages
# ------------------------------------------------------------------

def url_hash(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def find_latest_page_hash(db: Client, hashed_url: str) -> str | None:
    """Return content_hash of the most recent raw_page for this URL, or None."""
    result = (
        db.table("raw_pages")
        .select("content_hash")
        .eq("url_hash", hashed_url)
        .order("fetched_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]["content_hash"]
    return None


def save_raw_page(db: Client, *, source_run_id: str, source_id: str,
                  url: str, raw_html: str, cleaned_text: str,
                  http_status: int) -> dict:
    result = db.table("raw_pages").insert({
        "source_run_id": source_run_id,
        "source_id": source_id,
        "url": url,
        "url_hash": url_hash(url),
        "http_status": http_status,
        "raw_html": raw_html,
        "cleaned_text": cleaned_text,
        "content_hash": content_hash(cleaned_text),
    }).execute()
    return result.data[0]


# ------------------------------------------------------------------
# Scraped events
# ------------------------------------------------------------------

def find_scraped_event_by_url(db: Client, source_url: str) -> dict | None:
    """Find an active scraped event by its source URL."""
    result = (
        db.table("scraped_events")
        .select("*")
        .eq("source_url", source_url)
        .not_.in_("status", ["rejected", "expired"])
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def find_events_by_fingerprint(db: Client, fingerprint: str, exclude_id: str | None = None) -> list[dict]:
    query = (
        db.table("scraped_events")
        .select("*")
        .eq("fingerprint", fingerprint)
        .not_.in_("status", ["rejected", "expired"])
    )
    if exclude_id:
        query = query.neq("id", exclude_id)
    return query.execute().data


def create_scraped_event(db: Client, data: dict) -> dict:
    result = db.table("scraped_events").insert(data).execute()
    return result.data[0]


def update_scraped_event(db: Client, event_id: str, data: dict) -> dict:
    result = (
        db.table("scraped_events")
        .update(data)
        .eq("id", event_id)
        .execute()
    )
    return result.data[0]


def get_review_queue(db: Client, limit: int = 50) -> list[dict]:
    """Get events pending review, lowest confidence first."""
    result = (
        db.table("scraped_events")
        .select("*, scrape_sources(name)")
        .eq("status", "review")
        .order("confidence_score", desc=False)
        .limit(limit)
        .execute()
    )
    return result.data


def get_scraped_event_detail(db: Client, event_id: str) -> dict | None:
    result = (
        db.table("scraped_events")
        .select("*, scrape_sources(name, base_url), raw_pages(cleaned_text, url)")
        .eq("id", event_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


# ------------------------------------------------------------------
# Duplicates
# ------------------------------------------------------------------

def create_duplicate(db: Client, event_a_id: str, event_b_id: str,
                     similarity: float, match_type: str) -> None:
    db.table("event_duplicates").insert({
        "event_a_id": event_a_id,
        "event_b_id": event_b_id,
        "similarity": similarity,
        "match_type": match_type,
    }).execute()


# ------------------------------------------------------------------
# Publishing: push approved scraped_event → canonical events table
# ------------------------------------------------------------------

def push_to_canonical_events(db: Client, scraped: dict) -> dict:
    """Insert or update the canonical events table from a scraped event.
    Raises ValueError if required fields (title, start_at) are missing."""
    if not scraped.get("start_at"):
        raise ValueError("Cannot publish event without start_at date")

    # Map scraped_events fields → canonical events fields
    canonical = {
        "title": scraped["title"],
        "slug": _make_slug(scraped["title"]),
        "description_short": scraped.get("description_short") or "",
        "description_long": scraped.get("description_long") or "",
        "image_url": scraped.get("image_url"),
        "date_start": scraped["start_at"][:10],
        "date_end": scraped["end_at"][:10] if scraped.get("end_at") else None,
        "age_min": scraped.get("age_min"),
        "age_max": scraped.get("age_max"),
        "price": scraped.get("price_from"),
        "is_free": scraped.get("is_free", False),
        "category": (scraped.get("categories") or ["inne"])[0],
        "district": scraped.get("district") or "Inne",
        "venue_name": scraped.get("venue_name") or "",
        "venue_address": scraped.get("venue_address") or "",
        "source_url": scraped.get("source_url"),
        "organizer": scraped.get("organizer_name"),
        "status": "published",
    }

    existing_id = scraped.get("canonical_event_id")
    if existing_id:
        result = db.table("events").update(canonical).eq("id", existing_id).execute()
        return result.data[0]
    else:
        result = db.table("events").insert(canonical).execute()
        return result.data[0]


def _make_slug(title: str) -> str:
    """Generate a URL-safe slug from a Polish title."""
    import re
    import unicodedata
    text = unicodedata.normalize("NFKD", title.lower())
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text).strip("-")
    # Append short hash to avoid collisions
    short_hash = hashlib.md5(title.encode()).hexdigest()[:6]
    return f"{text[:80]}-{short_hash}"


# ------------------------------------------------------------------
# Expire
# ------------------------------------------------------------------

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
