"""Extract event data from a detail page.

Priority chain:
  1. JSON-LD  (``<script type="application/ld+json">``)
  2. OpenGraph / meta tags
  3. CSS selectors (common patterns)
  4. regex fallback for dates / prices

Each layer fills in blanks left by the layer above.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from bs4 import BeautifulSoup

from backend.ingest.models import EventData

logger = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════════════
# Public API
# ════════════════════════════════════════════════════════════════════

def extract_event(html: str, detail_url: str, listing_url: str = "") -> EventData:
    """Run the full extraction chain on *html* and return an ``EventData``."""
    soup = BeautifulSoup(html, "html.parser")
    event = EventData(detail_url=detail_url, listing_url=listing_url)

    _extract_json_ld(soup, event, detail_url)
    _extract_opengraph(soup, event)
    _extract_css(soup, event, detail_url)
    _extract_regex(html, event)

    event.confidence = _score(event)
    return event


# ════════════════════════════════════════════════════════════════════
# Layer 1 – JSON-LD
# ════════════════════════════════════════════════════════════════════

def _extract_json_ld(soup: BeautifulSoup, ev: EventData, page_url: str) -> None:
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        for obj in _find_event_objects(data):
            _apply_json_ld(obj, ev, page_url)
            return  # one Event is enough


def _find_event_objects(data: Any) -> list[dict]:
    """Recursively collect dicts whose ``@type`` contains *Event*."""
    hits: list[dict] = []
    if isinstance(data, list):
        for item in data:
            hits.extend(_find_event_objects(item))
    elif isinstance(data, dict):
        raw_type = data.get("@type", "")
        types = raw_type if isinstance(raw_type, list) else [raw_type]
        if any("Event" in t for t in types):
            hits.append(data)
        if "@graph" in data:
            hits.extend(_find_event_objects(data["@graph"]))
    return hits


def _apply_json_ld(d: dict, ev: EventData, page_url: str) -> None:
    ev.title = ev.title or _s(d.get("name"))
    ev.description_long = ev.description_long or _s(d.get("description"))
    ev.start_at_raw = ev.start_at_raw or _s(d.get("startDate"))

    loc = d.get("location") or {}
    if isinstance(loc, dict):
        ev.venue_name = ev.venue_name or _s(loc.get("name"))
        addr = loc.get("address") or {}
        if isinstance(addr, dict):
            ev.city = ev.city or _s(addr.get("addressLocality"))
        elif isinstance(addr, str):
            ev.city = ev.city or addr

    img = d.get("image")
    if isinstance(img, str):
        ev.image_url = ev.image_url or img
    elif isinstance(img, list) and img:
        ev.image_url = ev.image_url or (img[0] if isinstance(img[0], str) else _s(img[0].get("url")))
    elif isinstance(img, dict):
        ev.image_url = ev.image_url or _s(img.get("url"))

    offers = d.get("offers") or {}
    if isinstance(offers, list) and offers:
        offers = offers[0]
    if isinstance(offers, dict):
        price_val = offers.get("price")
        if price_val is not None:
            ev.price = ev.price or str(price_val)
        ev.currency = ev.currency or _s(offers.get("priceCurrency")) or "PLN"

    if d.get("isAccessibleForFree"):
        ev.price = ev.price or "0"

    org = d.get("organizer") or {}
    if isinstance(org, dict):
        pass  # not in schema yet
    ev.source = "json_ld"


# ════════════════════════════════════════════════════════════════════
# Layer 2 – OpenGraph / meta
# ════════════════════════════════════════════════════════════════════

def _extract_opengraph(soup: BeautifulSoup, ev: EventData) -> None:
    ev.title = ev.title or _meta(soup, "og:title") or _meta(soup, "twitter:title")

    og_desc = _meta(soup, "og:description") or _meta(soup, "description")
    if og_desc:
        if not ev.description_short or len(ev.description_short) < len(og_desc):
            ev.description_short = og_desc[:300]
        ev.description_long = ev.description_long or og_desc

    ev.image_url = ev.image_url or _meta(soup, "og:image") or _meta(soup, "twitter:image")

    if not ev.source:
        ev.source = "opengraph"


# ════════════════════════════════════════════════════════════════════
# Layer 3 – CSS selectors (common patterns)
# ════════════════════════════════════════════════════════════════════

_TITLE_SEL = "h1, .event-title, .entry-title, [itemprop='name']"
_DESC_SEL = (
    ".event-description, .entry-content, .event-content, "
    "article .description, [itemprop='description']"
)
_VENUE_SEL = ".venue, .location, .place, [itemprop='location'] [itemprop='name']"
_DATE_SEL = ".date, .event-date, time[datetime], [itemprop='startDate']"
_PRICE_SEL = ".price, .event-price, .ticket-price, [itemprop='price']"
_IMG_SEL = "article img, .event-image img, .event-header img"


def _extract_css(soup: BeautifulSoup, ev: EventData, page_url: str) -> None:
    if not ev.title:
        el = soup.select_one(_TITLE_SEL)
        if el:
            ev.title = el.get_text(strip=True)

    if not ev.description_long:
        el = soup.select_one(_DESC_SEL)
        if el:
            ev.description_long = el.get_text(separator="\n", strip=True)

    if not ev.venue_name:
        el = soup.select_one(_VENUE_SEL)
        if el:
            ev.venue_name = el.get_text(strip=True)

    if not ev.start_at_raw:
        el = soup.select_one(_DATE_SEL)
        if el:
            ev.start_at_raw = el.get("datetime") or el.get("content") or el.get_text(strip=True)

    if not ev.price:
        el = soup.select_one(_PRICE_SEL)
        if el:
            ev.price = el.get("content") or el.get_text(strip=True)

    if not ev.image_url:
        el = soup.select_one(_IMG_SEL)
        if el:
            src = el.get("data-src") or el.get("src") or ""
            if src and not src.startswith("data:"):
                from urllib.parse import urljoin
                ev.image_url = urljoin(page_url, src)

    # Auto-generate short from long
    if ev.description_long and not ev.description_short:
        first = ev.description_long.split("\n")[0].split(". ")[0]
        ev.description_short = (first[:297] + "...") if len(first) > 300 else first

    if not ev.source:
        ev.source = "css"


# ════════════════════════════════════════════════════════════════════
# Layer 4 – regex fallback
# ════════════════════════════════════════════════════════════════════

_DATE_RE = re.compile(
    r"(\d{1,2}[./]\d{1,2}[./]\d{4})"          # DD.MM.YYYY or DD/MM/YYYY
    r"(?:\s*(?:,\s*|\s+)godz\.?\s*(\d{1,2}:\d{2}))?",  # optional "godz. HH:MM"
    re.IGNORECASE,
)
_PRICE_RE = re.compile(
    r"(\d+(?:[.,]\d{1,2})?)\s*(?:zł|PLN|pln)",
    re.IGNORECASE,
)
_FREE_RE = re.compile(r"(wstęp\s+wolny|bezpłatn[eya]|za\s+darmo|free)", re.IGNORECASE)


def _extract_regex(html: str, ev: EventData) -> None:
    if not ev.start_at_raw:
        m = _DATE_RE.search(html)
        if m:
            ev.start_at_raw = m.group(0).strip()

    if not ev.price:
        if _FREE_RE.search(html):
            ev.price = "0"
        else:
            m = _PRICE_RE.search(html)
            if m:
                ev.price = m.group(0).strip()

    if not ev.source:
        ev.source = "regex"


# ════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════

def _s(val: Any) -> str:
    """Coerce to stripped string; None → ``""``."""
    if val is None:
        return ""
    return str(val).strip()


def _meta(soup: BeautifulSoup, name: str) -> str:
    """Read ``<meta property=name content=...>`` or ``<meta name=name ...>``."""
    el = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
    if el:
        return (el.get("content") or "").strip()
    return ""


def _score(ev: EventData) -> float:
    """Simple heuristic: count how many key fields are present."""
    filled = sum(bool(getattr(ev, f)) for f in ("title", "start_at_raw", "venue_name", "description_long", "image_url"))
    return round(filled / 5, 2)
