"""
Normalize extracted event data: fix dates, map districts, clean text, etc.
"""

from __future__ import annotations

from datetime import datetime, timezone

from backend.config import config
from backend.models import ExtractedEvent


def normalize(event: ExtractedEvent, source_url: str, defaults: dict | None = None) -> dict:
    """Convert ExtractedEvent → dict ready for scraped_events table insert.

    Args:
        defaults: Source-level defaults (venue_name, venue_address, district, etc.)
                  Applied when the LLM returned empty/null for that field.
    """
    d = defaults or {}

    return {
        "title": _clean_text(event.title),
        "description_short": _truncate(_clean_text(event.description_short or ""), 200),
        "description_long": _clean_text(event.description_long or ""),
        "start_at": _normalize_datetime(event.start_at),
        "end_at": _normalize_datetime(event.end_at),
        "date_text_raw": event.date_text_raw,
        "age_min": _clamp(event.age_min, 0, 18),
        "age_max": _clamp(event.age_max, 0, 18),
        "price_from": max(0, event.price_from) if event.price_from is not None else None,
        "price_to": max(0, event.price_to) if event.price_to is not None else None,
        "is_free": event.is_free if event.is_free is not None else d.get("is_free"),
        "venue_name": _clean_text(event.venue_name or "") or d.get("venue_name", ""),
        "venue_address": _clean_text(event.venue_address or "") or d.get("venue_address", ""),
        "district": _normalize_district(event.district) or d.get("district"),
        "city": "Kraków",
        "organizer_name": _clean_text(event.organizer_name or "") or d.get("organizer_name", ""),
        "source_url": source_url,
        "image_url": event.image_url,
        "categories": _normalize_categories(event.categories),
        "tags": [t.lower().strip() for t in event.tags[:10]],
        "registration_url": event.registration_url,
        "extracted_data": event.model_dump(),
        "extraction_method": "llm",
        "extraction_notes": event.extraction_notes,
        "field_confidence": event.field_confidence,
    }


def _clean_text(text: str) -> str:
    """Strip and normalize whitespace."""
    return " ".join(text.split()).strip()


def _truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def _clamp(val: int | None, lo: int, hi: int) -> int | None:
    if val is None:
        return None
    return max(lo, min(hi, val))


def _normalize_datetime(dt_str: str | None) -> str | None:
    """Validate and normalize ISO datetime string."""
    if not dt_str:
        return None
    try:
        parsed = datetime.fromisoformat(dt_str)
        # Ensure timezone info
        if parsed.tzinfo is None:
            from zoneinfo import ZoneInfo
            parsed = parsed.replace(tzinfo=ZoneInfo("Europe/Warsaw"))
        return parsed.isoformat()
    except (ValueError, TypeError):
        return None


def _normalize_district(district: str | None) -> str | None:
    """Map extracted district to allowed enum value."""
    if not district:
        return None

    district_clean = district.strip()

    # Exact match
    if district_clean in config.krakow_districts:
        return district_clean

    # Case-insensitive match
    lower_map = {d.lower(): d for d in config.krakow_districts}
    if district_clean.lower() in lower_map:
        return lower_map[district_clean.lower()]

    return None


def _normalize_categories(categories: list[str]) -> list[str]:
    """Filter to allowed categories only."""
    allowed = set(config.allowed_categories)
    normalized = []
    for cat in categories:
        cat_lower = cat.lower().strip()
        if cat_lower in allowed:
            normalized.append(cat_lower)
    return normalized if normalized else ["inne"]
