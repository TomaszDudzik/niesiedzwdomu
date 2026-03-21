"""
Load source definitions from sources.yaml.
Each YAML entry becomes a source config dict used by the pipeline.
"""

from __future__ import annotations

from pathlib import Path

import yaml


SOURCES_FILE = Path(__file__).parent / "sources.yaml"


def load_sources() -> list[dict]:
    """Load all source configs from YAML. Returns list of dicts."""
    with open(SOURCES_FILE, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("sources", [])


def get_active_sources() -> list[dict]:
    """Load only active sources."""
    return [s for s in load_sources() if s.get("is_active", False)]


def get_all_listing_urls(source: dict) -> list[str]:
    """Build the full list of URLs to scrape for a source, including pagination."""
    listing = source.get("listing", {})
    base_urls = listing.get("urls", [])
    pagination = listing.get("pagination", "none")
    max_pages = listing.get("max_pages", 5)
    page_pattern = listing.get("page_pattern", "")

    urls = list(base_urls)

    if pagination != "none" and page_pattern:
        # Page 1 is usually the base URL, start from page 2
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
