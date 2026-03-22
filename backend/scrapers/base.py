"""
Base class for per-source scrapers.
Each source can have its own scraper that extracts events from raw HTML.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from urllib.parse import urljoin

from backend.models import ExtractedEvent


class BaseScraper(ABC):
    """Override per source. Implement scrape_listing() and optionally scrape_detail()."""

    def __init__(self, base_url: str = ""):
        self.base_url = base_url

    @abstractmethod
    def scrape_listing(self, html: str) -> list[ExtractedEvent]:
        """Extract events from a listing page HTML. Return list of ExtractedEvent."""
        ...

    def scrape_detail(self, html: str, event: ExtractedEvent) -> ExtractedEvent:
        """Optionally enrich an event from its detail page HTML.
        Default: return event unchanged. Override to add detail page parsing."""
        return event

    def full_url(self, path: str) -> str:
        """Resolve a relative URL against the base URL."""
        if path.startswith("http"):
            return path
        return urljoin(self.base_url, path)
