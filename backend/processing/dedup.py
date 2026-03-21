"""
Duplicate detection: exact URL, fingerprint, and (later) fuzzy matching.
"""

from __future__ import annotations

import hashlib
import unicodedata
from difflib import SequenceMatcher

from supabase import Client

from backend import db as database
from backend.models import DuplicateCandidate


def compute_fingerprint(event: dict) -> str:
    """Normalized hash for fast exact dedup: title + date + venue."""
    parts = [
        _normalize_text(event.get("title", "")),
        (event.get("start_at") or "")[:10],  # date portion only
        _normalize_text(event.get("venue_name", "")),
    ]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def find_duplicates(db: Client, event: dict, event_id: str | None = None) -> list[DuplicateCandidate]:
    """Find duplicate candidates for a given event. Returns list sorted by similarity desc."""
    candidates: list[DuplicateCandidate] = []

    # Layer 1: exact URL match
    source_url = event.get("source_url", "")
    existing = database.find_scraped_event_by_url(db, source_url)
    if existing and existing["id"] != event_id:
        return [DuplicateCandidate(
            event_id=existing["id"],
            similarity=1.0,
            match_type="exact_url",
        )]

    # Layer 2: fingerprint match
    fp = event.get("fingerprint") or compute_fingerprint(event)
    fp_matches = database.find_events_by_fingerprint(db, fp, exclude_id=event_id)
    for match in fp_matches:
        candidates.append(DuplicateCandidate(
            event_id=match["id"],
            similarity=0.95,
            match_type="fingerprint",
        ))

    # Layer 3: fuzzy match (phase 2 — placeholder for now)
    # TODO: implement fuzzy title+date matching

    candidates.sort(key=lambda c: c.similarity, reverse=True)
    return candidates


def _normalize_text(text: str) -> str:
    """Lowercase, strip diacritics, remove special chars, normalize whitespace."""
    text = text.lower().strip()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if c.isalnum() or c == " ")
    return " ".join(text.split())


def text_similarity(a: str, b: str) -> float:
    """Levenshtein-like ratio on normalized strings. For future fuzzy matching."""
    a_norm = _normalize_text(a)
    b_norm = _normalize_text(b)
    return SequenceMatcher(None, a_norm, b_norm).ratio()
