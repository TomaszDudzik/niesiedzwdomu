"""Discover event detail URLs from a listing page."""

from __future__ import annotations

import logging
import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ── URL classification ──────────────────────────────────────────────

# Extensions that are never event pages
_STATIC_EXT = re.compile(
    r"\.(css|js|png|jpe?g|gif|svg|ico|woff2?|ttf|eot|pdf|zip|xml|rss)$",
    re.IGNORECASE,
)

# Path segments that suggest an event detail page
_EVENT_PATH_HINTS = re.compile(
    r"/(event|wydarzen|koncert|spektakl|festiwal|stand-up|pokaz|warsztaty|"
    r"oferta/wydarzenie|program|repertuar|bilet|dla-dzieci)/",
    re.IGNORECASE,
)

# Paths that are almost certainly NOT event detail pages
_BLACKLIST = re.compile(
    r"/(tag|kategori|login|regist|koszyk|cart|checkout|kontakt|regulamin|"
    r"polityka|privacy|cookie|search|szukaj|rss|feed|wp-content|wp-admin|"
    r"api/|static/|assets/|profile/|order/|produkty/|file/get/)|(#|javascript:|mailto:|tel:)",
    re.IGNORECASE,
)


def is_event_url(url: str) -> bool:
    """Return ``True`` if *url* looks like an event detail page."""
    if _BLACKLIST.search(url):
        return False
    if _STATIC_EXT.search(urlparse(url).path):
        return False
    if _EVENT_PATH_HINTS.search(url):
        return True
    # Keep any path that is at least 2 segments deep (might be a detail page)
    path = urlparse(url).path.rstrip("/")
    return path.count("/") >= 2


def make_absolute(href: str, base_url: str) -> str | None:
    """Convert *href* to an absolute URL, or return ``None`` if unusable."""
    href = href.strip()
    if not href or href.startswith(("#", "javascript:", "mailto:", "tel:")):
        return None
    return urljoin(base_url, href)


def discover_event_urls(html: str, listing_url: str) -> list[str]:
    """Parse *html* for ``<a href>`` and return likely event detail URLs.

    Duplicates within the page are removed (sliders often repeat blocks),
    but no cross-page dedup is done.
    """
    soup = BeautifulSoup(html, "html.parser")
    seen: set[str] = set()
    urls: list[str] = []

    for a in soup.find_all("a", href=True):
        abs_url = make_absolute(a["href"], listing_url)
        if abs_url is None:
            continue
        # Normalise trailing slash so /foo and /foo/ don't both appear
        normalised = abs_url.rstrip("/")
        if normalised in seen:
            continue
        if not is_event_url(abs_url):
            continue
        seen.add(normalised)
        urls.append(abs_url)

    logger.info("Discovered %d event URL(s) from %s", len(urls), listing_url)
    return urls
