"""
Load source definitions from the database (scrape_sources table).
Each DB row is converted to a source config dict used by the pipeline.

Falls back to sources.yaml for initial seeding only.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import yaml

if TYPE_CHECKING:
    from supabase import Client

SOURCES_FILE = Path(__file__).parent / "sources.yaml"


# ------------------------------------------------------------------
# Primary: load from database
# ------------------------------------------------------------------

def load_sources_from_db(db: "Client") -> list[dict]:
    """Load all source configs from scrape_sources table."""
    result = db.table("scrape_sources").select("*").execute()
    return [_db_row_to_source_dict(row) for row in result.data]


def get_active_sources_from_db(db: "Client") -> list[dict]:
    """Load only active sources from database."""
    result = (
        db.table("scrape_sources")
        .select("*")
        .eq("is_active", True)
        .execute()
    )
    return [_db_row_to_source_dict(row) for row in result.data]


def _db_row_to_source_dict(row: dict) -> dict:
    """Convert a scrape_sources DB row to the source config dict
    expected by the pipeline (same shape as the old YAML entries)."""
    source: dict = {
        "id": row["id"],
        "name": row["name"],
        "base_url": row["base_url"],
        "fetch_method": row.get("fetch_method", "requests"),
        "pre_filtered": row.get("pre_filtered", False),
        "is_active": row.get("is_active", True),
        "notes": row.get("notes"),
        "listing": {
            "urls": row.get("listing_urls") or [],
            "pagination": row.get("pagination", "none"),
            "max_pages": row.get("max_pages", 5),
            "page_pattern": row.get("page_pattern") or "",
        },
        "events": {
            "mode": row.get("events_mode", "inline"),
            "link_selector": row.get("link_selector", "a"),
        },
        "defaults": {},
        # Keep DB metadata for pipeline use
        "_db_row": row,
    }

    # Build defaults dict from explicit columns
    defaults = {}
    if row.get("default_venue_name"):
        defaults["venue_name"] = row["default_venue_name"]
    if row.get("default_venue_address"):
        defaults["venue_address"] = row["default_venue_address"]
    if row.get("default_district"):
        defaults["district"] = row["default_district"]
    if row.get("default_organizer"):
        defaults["organizer_name"] = row["default_organizer"]
    if row.get("default_is_free") is not None:
        defaults["is_free"] = row["default_is_free"]
    source["defaults"] = defaults

    return source


# ------------------------------------------------------------------
# YAML fallback (for seeding / backward compat)
# ------------------------------------------------------------------

def load_sources() -> list[dict]:
    """Load all source configs from YAML. Returns list of dicts."""
    with open(SOURCES_FILE, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("sources", [])


def get_active_sources() -> list[dict]:
    """Load only active sources from YAML (legacy fallback)."""
    return [s for s in load_sources() if s.get("is_active", False)]


# ------------------------------------------------------------------
# Seed: import YAML sources into database
# ------------------------------------------------------------------

def seed_sources_to_db(db: "Client") -> list[dict]:
    """Import all sources from YAML into the database.
    Skips sources that already exist (by name). Returns created rows."""
    yaml_sources = load_sources()
    created = []

    for src in yaml_sources:
        name = src["name"]
        existing = (
            db.table("scrape_sources")
            .select("id")
            .eq("name", name)
            .limit(1)
            .execute()
        )
        if existing.data:
            continue

        listing = src.get("listing", {})
        row = {
            "name": name,
            "base_url": src.get("base_url", ""),
            "fetch_method": src.get("fetch_method", "requests"),
            "extractor_type": "llm",
            "is_active": src.get("is_active", False),
            "pre_filtered": src.get("pre_filtered", False),
            "listing_urls": listing.get("urls", []),
            "pagination": listing.get("pagination", "none"),
            "max_pages": listing.get("max_pages", 5),
            "page_pattern": listing.get("page_pattern"),
            "events_mode": src.get("events", {}).get("mode", "inline"),
            "link_selector": src.get("events", {}).get("link_selector", "a"),
            "default_venue_name": src.get("defaults", {}).get("venue_name"),
            "default_venue_address": src.get("defaults", {}).get("venue_address"),
            "default_district": src.get("defaults", {}).get("district"),
            "default_organizer": src.get("defaults", {}).get("organizer_name"),
            "default_is_free": src.get("defaults", {}).get("is_free"),
            "scrape_config": src,
            "notes": src.get("notes"),
        }
        result = db.table("scrape_sources").insert(row).execute()
        created.append(result.data[0])

    return created


# ------------------------------------------------------------------
# Helper functions (unchanged API — used by pipeline)
# ------------------------------------------------------------------

def get_all_listing_urls(source: dict) -> list[str]:
    """Build the full list of URLs to scrape for a source, including pagination."""
    listing = source.get("listing", {})
    base_urls = listing.get("urls", [])
    pagination = listing.get("pagination", "none")
    max_pages = listing.get("max_pages", 5)
    page_pattern = listing.get("page_pattern", "")

    urls = list(base_urls)

    if pagination != "none" and page_pattern:
        for page_num in range(2, max_pages + 1):
            urls.append(page_pattern.replace("{page}", str(page_num)))

    return urls


def is_inline_source(source: dict) -> bool:
    """True if events are embedded in the listing page (no individual event pages)."""
    return source.get("events", {}).get("mode", "inline") == "inline"


def get_link_selector(source: dict) -> str:
    """CSS selector for finding event links on a listing page."""
    return source.get("events", {}).get("link_selector", "a")


def is_pre_filtered(source: dict) -> bool:
    """True if this source only lists kids/family events — skip audience filtering."""
    return source.get("pre_filtered", False)


def get_defaults(source: dict) -> dict:
    """Return source-level default field values (venue_name, district, etc.)."""
    return source.get("defaults", {})
