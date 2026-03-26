"""Process a single scrape source: discover, extract, store to scraped_events.

Called by run_single_source with a source config dict.
Supports both custom adapters (biletyna, ck_podgorza) and the generic pipeline.
"""

from __future__ import annotations

import hashlib
import logging
import re
import unicodedata
from datetime import datetime

from backend.db import get_client
from backend.ingest.fetch import fetch, polite_sleep
from backend.ingest.models import EventData
from backend.ingest.registry import get_adapter, load_adapters
from backend.ingest.pipeline import run_pipeline
from backend.ingest.store import flatten_events

logger = logging.getLogger(__name__)


def process_source(source: dict, *, force: bool = False) -> dict:
    """Run the full scrape pipeline for a single source.

    Args:
        source: Dict from _db_row_to_source_dict (includes id, name, listing_urls, etc.)
        force: If True, skip content-hash cache and re-extract everything.

    Returns:
        Summary dict: {created, updated, skipped, errors}
    """
    source_id = source["id"]
    source_name = source["name"]
    listing_urls = source.get("listing_urls") or []

    if not listing_urls:
        logger.warning("Source '%s' has no listing URLs — skipping", source_name)
        return {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    logger.info("Processing source: %s (%d listing URLs)", source_name, len(listing_urls))

    # Check explicit adapter in extractor_type, then fall back to name matching
    load_adapters()
    adapter_name = source.get("extractor_type", "generic")
    if adapter_name == "generic":
        adapter_name = None

    adapter_cls = get_adapter(adapter_name) if adapter_name else get_adapter(source_name)

    if adapter_cls:
        logger.info("Using custom adapter: %s", adapter_name or source_name)
        adapter = adapter_cls()
        raw_events = adapter.run(listing_urls[0] if listing_urls else "")
    else:
        logger.info("Using generic pipeline for: %s", source_name)
        raw_events = run_pipeline(
            listing_urls,
            source_name=source_name,
        )

    if not raw_events:
        logger.info("No events extracted from '%s'", source_name)
        _update_last_scraped(source_id)
        return {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    # Apply source defaults to events
    _apply_defaults(raw_events, source)

    # Flatten multi-date events
    flat_events = flatten_events(raw_events)

    logger.info("Storing %d event(s) from '%s' to scraped_events", len(flat_events), source_name)

    # Store to scraped_events table (not the canonical events table)
    counts = _store_scraped_events(flat_events, source_id)

    # Update last_scraped_at on the source
    _update_last_scraped(source_id, total_pushed=counts["created"] + counts["updated"])

    return counts


def _apply_defaults(events: list[EventData], source: dict) -> None:
    """Fill in blank fields from source defaults."""
    for ev in events:
        if not ev.venue_name and source.get("default_venue_name"):
            ev.venue_name = source["default_venue_name"]
        if not ev.venue_address and source.get("default_venue_address"):
            ev.venue_address = source["default_venue_address"]
        if not ev.city:
            ev.city = "Kraków"


def _store_scraped_events(events: list[EventData], source_id: str) -> dict:
    """Upsert events into the scraped_events table for review."""
    db = get_client()
    counts = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    for ev in events:
        try:
            row = _to_scraped_row(ev, source_id)
            if not row:
                counts["skipped"] += 1
                continue

            # Check for existing by source_url (detail page URL) + source_id
            existing = None
            if row.get("source_url"):
                result = (
                    db.table("scraped_events")
                    .select("id, status")
                    .eq("source_id", source_id)
                    .eq("source_url", row["source_url"])
                    .limit(1)
                    .execute()
                )
                existing = result.data[0] if result.data else None

            if existing:
                # Update but don't overwrite published/rejected status
                eid = existing["id"]
                update_data = {k: v for k, v in row.items() if k not in ("source_id",)}
                update_data["source_last_seen"] = datetime.utcnow().isoformat()
                update_data["is_new"] = False

                if existing["status"] in ("published", "rejected"):
                    update_data.pop("status", None)

                db.table("scraped_events").update(update_data).eq("id", eid).execute()
                counts["updated"] += 1
                logger.debug("Updated scraped: %s", ev.title)
            else:
                row["source_first_seen"] = datetime.utcnow().isoformat()
                row["source_last_seen"] = datetime.utcnow().isoformat()
                row["is_new"] = True
                db.table("scraped_events").insert(row).execute()
                counts["created"] += 1
                logger.info("Created scraped: %s", ev.title)

        except Exception as exc:
            counts["errors"] += 1
            logger.error("Failed to store scraped '%s': %s", ev.title, exc)

    return counts


def _to_scraped_row(ev: EventData, source_id: str) -> dict | None:
    """Convert EventData to a scraped_events table row."""
    if not ev.title:
        return None

    # Parse dates
    start_at = _parse_datetime(ev.start_at_raw)
    end_at = _parse_datetime(ev.end_at_raw) if ev.end_at_raw else None

    if not start_at:
        logger.warning("Skipping '%s' — no valid date in '%s'", ev.title, ev.start_at_raw)
        return None

    # Price
    price_from = _parse_price(ev.price)
    is_free = ev.price.lower().strip() in ("", "0", "wstęp wolny", "bezpłatne", "za darmo") or price_from == 0

    # Short description fallback
    desc_short = ev.description_short
    if not desc_short and ev.description_long:
        first = ev.description_long.split("\n")[0].split(". ")[0]
        desc_short = (first[:297] + "...") if len(first) > 300 else first

    return {
        "source_id": source_id,
        "title": ev.title,
        "description_short": desc_short or None,
        "description_long": ev.description_long or None,
        "start_at": start_at,
        "end_at": end_at or start_at,
        "venue_name": ev.venue_name or None,
        "venue_address": ev.venue_address or None,
        "district": None,
        "categories": ev.categories or [],
        "tags": ev.tags or [],
        "price_from": price_from,
        "is_free": is_free,
        "source_url": _sanitize_external_url(ev.detail_url),
        "image_url": ev.image_url or None,
        "confidence_score": ev.confidence,
        "status": "review",
    }


def _sanitize_external_url(raw_url: str) -> str | None:
    """Trim and strip hidden/control chars from external URLs before storing."""
    if not raw_url:
        return None

    # Remove leading/trailing whitespace and hidden/control chars (e.g. zero-width space).
    cleaned = "".join(ch for ch in raw_url.strip() if unicodedata.category(ch)[0] != "C")
    # Remove accidental whitespace inserted into copied URLs.
    cleaned = re.sub(r"\s+", "", cleaned)

    if not cleaned:
        return None
    if not re.match(r"^https?://", cleaned, flags=re.IGNORECASE):
        return None

    return cleaned


def _parse_datetime(raw: str) -> str | None:
    """Parse various date formats to ISO 8601."""
    if not raw:
        return None

    # DD.MM.YYYY HH:MM
    m = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?", raw)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        h, mi = m.group(4) or "0", m.group(5) or "0"
        try:
            dt = datetime(int(y), int(mo), int(d), int(h), int(mi))
            return dt.isoformat()
        except ValueError:
            return None

    # ISO format (YYYY-MM-DD...)
    m = re.match(r"(\d{4}-\d{2}-\d{2})", raw)
    if m:
        try:
            datetime.strptime(m.group(1), "%Y-%m-%d")
            return raw[:19] if len(raw) >= 19 else m.group(1) + "T00:00:00"
        except ValueError:
            return None

    return None


def _parse_price(price_str: str) -> float | None:
    """Extract numeric price from text."""
    if not price_str:
        return None
    m = re.search(r"(\d+[.,]\d{1,2})", price_str)
    if m:
        return float(m.group(1).replace(",", "."))
    m = re.search(r"(\d+)", price_str)
    if m:
        return float(m.group(1))
    return None


def _update_last_scraped(source_id: str, total_pushed: int = 0) -> None:
    """Update the source's last_scraped_at timestamp."""
    db = get_client()
    update: dict = {"last_scraped_at": datetime.utcnow().isoformat()}
    if total_pushed > 0:
        # Increment total_events_pushed
        existing = db.table("scrape_sources").select("total_events_pushed").eq("id", source_id).single().execute()
        current = (existing.data or {}).get("total_events_pushed", 0) or 0
        update["total_events_pushed"] = current + total_pushed
    db.table("scrape_sources").update(update).eq("id", source_id).execute()
