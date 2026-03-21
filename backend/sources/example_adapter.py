"""
Example source adapter — template for building real adapters.
Replace this with real implementations per source site.
"""

from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup

from backend.sources.base import BaseSourceAdapter


class ExampleAdapter(BaseSourceAdapter):
    """
    Example adapter for a typical events listing site.
    Config expected in scrape_config:
      {
        "adapter_class": "example",
        "base_url": "https://example.com",
        "listing_paths": ["/wydarzenia"],
        "event_link_selector": "a.event-link",
      }
    """

    def get_listing_urls(self) -> list[str]:
        base = self.config.get("base_url", "")
        paths = self.config.get("listing_paths", ["/"])
        return [urljoin(base, path) for path in paths]

    def get_event_urls(self, listing_html: str) -> list[str]:
        base = self.config.get("base_url", "")
        selector = self.config.get("event_link_selector", "a")

        soup = BeautifulSoup(listing_html, "html.parser")
        links = soup.select(selector)

        urls = []
        for link in links:
            href = link.get("href", "")
            if href and not href.startswith("#"):
                full_url = urljoin(base, href)
                if full_url not in urls:
                    urls.append(full_url)

        return urls
