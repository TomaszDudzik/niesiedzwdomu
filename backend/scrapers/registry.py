"""
Registry mapping source names to their custom scrapers.
If no scraper is registered, the pipeline falls back to LLM extraction.
"""

from __future__ import annotations

from backend.scrapers.base import BaseScraper
from backend.scrapers.ck_podgorza import CkPodgorzaScraper
from backend.scrapers.biletyna import BiletynaScraper

# Map source name (as stored in DB) to scraper class.
# Names are matched case-insensitively.
SCRAPER_MAP: dict[str, type[BaseScraper]] = {
    "ck podgorze": CkPodgorzaScraper,
    "ck podgórza": CkPodgorzaScraper,
    "centrum kultury podgórza": CkPodgorzaScraper,
    "biletyna.pl": BiletynaScraper,
    "biletyna": BiletynaScraper,
}


def get_scraper(source_name: str, base_url: str = "") -> BaseScraper | None:
    """Return a scraper instance for the given source name, or None to use LLM."""
    key = source_name.strip().lower()
    scraper_cls = SCRAPER_MAP.get(key)
    if scraper_cls:
        return scraper_cls(base_url=base_url)
    return None
