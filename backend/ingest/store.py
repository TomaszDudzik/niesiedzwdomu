"""Flatten multi-date events and upsert into the canonical `events` table.

Each ShowDate becomes a separate row in the DB so the frontend
can list/filter by individual date.

Slug format: {title-slug}-{date}-{time} → guarantees uniqueness per show.
"""

from __future__ import annotations

import hashlib
import logging
import re
import unicodedata
from datetime import datetime

from backend.db import get_client
from backend.ingest.models import EventData, ShowDate

logger = logging.getLogger(__name__)

# Map common Polish tags to event_category enum values
_CATEGORY_MAP: dict[str, str] = {
    "warsztaty": "warsztaty",
    "spektakl": "spektakl",
    "spektakle dla dzieci": "spektakl",
    "spektakle": "spektakl",
    "inne spektakle": "spektakl",
    "koncert": "muzyka",
    "muzyka": "muzyka",
    "sport": "sport",
    "natura": "natura",
    "edukacja": "edukacja",
    "festyn": "festyn",
    "piknik/festyn": "festyn",
    "kino": "kino",
    "wystawa": "wystawa",
    "wernisaż": "wystawa",
    "magia i iluzja": "spektakl",
}

# Valid DB enum values
_VALID_CATEGORIES = {
    "warsztaty", "spektakl", "muzyka", "sport",
    "natura", "edukacja", "festyn", "kino", "wystawa", "inne",
}


def flatten_events(events: list[EventData]) -> list[EventData]:
    """Expand multi-date events into one EventData per show date.

    An event with 3 dates becomes 3 separate EventData objects,
    each with a single date in start_at_raw and an empty dates list.
    Single-date events pass through unchanged.
    """
    flat: list[EventData] = []

    for ev in events:
        if len(ev.dates) <= 1:
            # Single date or no dates — keep as-is
            flat.append(ev)
            continue

        # Explode: one row per ShowDate
        for show in ev.dates:
            row = EventData(
                source=ev.source,
                listing_url=ev.listing_url,
                detail_url=ev.detail_url,
                title=ev.title,
                description_short=ev.description_short,
                description_long=ev.description_long,
                start_at_raw=f"{show.date} {show.time}".strip(),
                venue_name=show.venue_name or ev.venue_name,
                venue_address=ev.venue_address,
                city=show.city or ev.city,
                price=show.price or ev.price,
                currency=ev.currency,
                image_url=ev.image_url,
                categories=ev.categories,
                tags=ev.tags,
                contact_email=ev.contact_email,
                contact_phone=ev.contact_phone,
                dates=[show],
                confidence=ev.confidence,
            )
            flat.append(row)

    logger.info("Flattened %d events → %d rows", len(events), len(flat))
    return flat


def store_events(events: list[EventData], *, publish: bool = False) -> dict:
    """Upsert events into the `events` table.

    Args:
        events: Already-flattened list (one date per EventData).
        publish: If True, set status='published'. Otherwise 'draft'.

    Returns:
        Summary dict with counts: created, updated, skipped, errors.
    """
    db = get_client()
    status = "published" if publish else "draft"
    counts = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    for ev in events:
        try:
            row = _to_db_row(ev, status)
            if not row:
                counts["skipped"] += 1
                continue

            slug = row["slug"]

            # Check if slug already exists
            existing = (
                db.table("events")
                .select("id, title, status")
                .eq("slug", slug)
                .limit(1)
                .execute()
            )

            if existing.data:
                # Update existing row (don't overwrite manual edits to status)
                eid = existing.data[0]["id"]
                update_data = {k: v for k, v in row.items() if k != "slug"}
                # Don't downgrade published → draft
                if existing.data[0]["status"] == "published":
                    update_data.pop("status", None)
                db.table("events").update(update_data).eq("id", eid).execute()
                counts["updated"] += 1
                logger.info("Updated: %s", ev.title)
            else:
                db.table("events").insert(row).execute()
                counts["created"] += 1
                logger.info("Created: %s (%s)", ev.title, row["date_start"])

        except Exception as exc:
            counts["errors"] += 1
            logger.error("Failed to store '%s': %s", ev.title, exc)

    logger.info(
        "Store complete: %d created, %d updated, %d skipped, %d errors",
        counts["created"], counts["updated"], counts["skipped"], counts["errors"],
    )
    return counts


def _to_db_row(ev: EventData, status: str) -> dict | None:
    """Convert EventData → dict matching the events table columns."""
    if not ev.title:
        return None

    # Parse date + time
    date_start, time_start = _parse_date_time(ev.start_at_raw)
    if not date_start:
        logger.warning("Skipping '%s' — no valid date in '%s'", ev.title, ev.start_at_raw)
        return None

    # Parse end date if present
    date_end = None
    if ev.end_at_raw:
        date_end, _ = _parse_date_time(ev.end_at_raw)

    # Category
    category = _map_category(ev.categories + ev.tags)

    # Price
    price_num = _parse_price(ev.price)
    is_free = ev.price.lower().strip() in ("", "wstęp wolny", "0", "bezpłatne") or price_num == 0

    # Slug — unique per title+date+time
    slug = _make_slug(ev.title, date_start, time_start)

    # Short description fallback
    desc_short = ev.description_short
    if not desc_short and ev.description_long:
        first = ev.description_long.split("\n")[0].split(". ")[0]
        desc_short = (first[:297] + "...") if len(first) > 300 else first

    return {
        "title": ev.title,
        "slug": slug,
        "description_short": desc_short or "",
        "description_long": ev.description_long or "",
        "image_url": ev.image_url or None,
        "date_start": date_start,
        "date_end": date_end,
        "time_start": time_start,
        "venue_name": ev.venue_name or "",
        "venue_address": ev.venue_address or "",
        "district": "Inne",
        "category": category,
        "price": price_num,
        "is_free": is_free,
        "source_url": _sanitize_external_url(ev.detail_url),
        "status": status,
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


def _parse_date_time(raw: str) -> tuple[str | None, str | None]:
    """Parse '26.04.2026 10:00' → ('2026-04-26', '10:00:00') for DB."""
    if not raw:
        return None, None

    # Try DD.MM.YYYY
    date_match = re.search(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", raw)
    if date_match:
        d, m, y = date_match.groups()
        date_str = f"{y}-{m.zfill(2)}-{d.zfill(2)}"
    elif re.match(r"\d{4}-\d{2}-\d{2}", raw):
        date_str = raw[:10]
    else:
        return None, None

    # Validate
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return None, None

    # Time
    time_match = re.search(r"(\d{1,2}):(\d{2})", raw)
    time_str = None
    if time_match:
        h, m = time_match.groups()
        time_str = f"{h.zfill(2)}:{m}:00"

    return date_str, time_str


def _map_category(tags: list[str]) -> str:
    """Map source tags to a valid event_category enum value."""
    for tag in tags:
        mapped = _CATEGORY_MAP.get(tag.lower().strip())
        if mapped and mapped in _VALID_CATEGORIES:
            return mapped
    return "inne"


def _parse_price(price_str: str) -> float | None:
    """Extract numeric price from text like '51,65 zł'."""
    if not price_str:
        return None
    match = re.search(r"(\d+[.,]\d{1,2})", price_str)
    if match:
        return float(match.group(1).replace(",", "."))
    match = re.search(r"(\d+)", price_str)
    if match:
        return float(match.group(1))
    return None


def _make_slug(title: str, date: str, time: str | None) -> str:
    """Generate a unique slug: title-slug-date-time-hash."""
    text = unicodedata.normalize("NFKD", title.lower())
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text).strip("-")[:60]

    # Append date and time for uniqueness
    parts = [text, date]
    if time:
        parts.append(time[:5].replace(":", ""))

    slug_base = "-".join(parts)
    # Short hash to handle edge cases
    short_hash = hashlib.md5(slug_base.encode()).hexdigest()[:4]
    return f"{slug_base}-{short_hash}"
