"""
Base class for source adapters.
Each source site gets its own adapter that knows how to:
  1. list pages with events
  2. extract individual event URLs from a listing page
  3. optionally customize HTML cleaning
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class BaseSourceAdapter(ABC):
    """Override per source site. Minimal interface for MVP."""

    def __init__(self, source_config: dict):
        self.config = source_config

    @abstractmethod
    def get_listing_urls(self) -> list[str]:
        """Return URLs of pages that list events (e.g. /events, /kalendarz)."""
        ...

    @abstractmethod
    def get_event_urls(self, listing_html: str) -> list[str]:
        """Extract individual event page URLs from a listing page's HTML."""
        ...

    def get_event_urls_from_listing_text(self, listing_html: str) -> list[str]:
        """Alternative: some sites have all event data on the listing page.
        Override this to return empty list and process listing page directly."""
        return []

    def is_single_page_source(self) -> bool:
        """If True, listing pages contain full event data — no need to fetch individual URLs.
        The pipeline will pass the listing page directly to the extractor."""
        return False
