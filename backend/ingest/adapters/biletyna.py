"""Biletyna.pl adapter – kids events in Kraków.

Listing: https://biletyna.pl/dla-dzieci/Krakow?city_id=16#list
Only URLs matching /dla-dzieci/{title}/Krakow are followed.

Detail page data sources:
  - JSON-LD @type=PerformingGroup → clean title, description, image
  - tr.event-row → multiple dates/times, venue, price, tickets
  - .tag spans → categories
  - og:image fallback for image

One event can have multiple show dates (e.g. Świnka Peppa: 10:00, 13:00, 16:00).
All dates are captured in EventData.dates[].
"""

from __future__ import annotations

import json
import logging
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from backend.ingest.fetch import fetch, polite_sleep
from backend.ingest.models import EventData, ShowDate

logger = logging.getLogger(__name__)

_BASE = "https://biletyna.pl"
_DEFAULT_LISTING = "https://biletyna.pl/dla-dzieci/Krakow?city_id=16#list"


class BiletynAdapter:
    """Custom discovery + custom extraction for biletyna.pl."""

    def run(self, listing_url: str = "") -> list[EventData]:
        listing_url = listing_url or _DEFAULT_LISTING
        logger.info("[biletyna] listing: %s", listing_url)

        html = fetch(listing_url)
        detail_urls = self._discover(html)
        logger.info("[biletyna] discovered %d event URL(s)", len(detail_urls))

        events: list[EventData] = []
        for url in detail_urls:
            logger.info("[biletyna] detail: %s", url)
            try:
                detail_html = fetch(url)
            except Exception as exc:
                logger.error("[biletyna] FAILED %s: %s", url, exc)
                continue

            ev = _extract_detail(detail_html, url, listing_url)
            events.append(ev)
            polite_sleep()

        logger.info("[biletyna] extracted %d event(s)", len(events))
        return events

    def _discover(self, html: str) -> list[str]:
        """Find event detail links matching /dla-dzieci/{title}/Krakow."""
        soup = BeautifulSoup(html, "html.parser")
        seen: set[str] = set()
        urls: list[str] = []

        for article in soup.select("article.event"):
            link = (
                article.select_one("h3.event-title a, .event-title a")
                or article.select_one("a.event-img")
                or article.select_one("a[href]")
            )
            if not link:
                continue
            href = link.get("href", "")
            if not href or href.startswith("#"):
                continue
            full = urljoin(_BASE, href)
            if not re.match(r"https://biletyna\.pl/dla-dzieci/[^/]+/Krakow", full):
                continue
            norm = full.rstrip("/")
            if norm not in seen:
                seen.add(norm)
                urls.append(full)

        return urls


# ════════════════════════════════════════════════════════════════════
# Detail page extractor
# ════════════════════════════════════════════════════════════════════

def _extract_detail(html: str, detail_url: str, listing_url: str) -> EventData:
    soup = BeautifulSoup(html, "html.parser")

    # ── JSON-LD: title, description, image ──────────────────────
    title = ""
    description = ""
    image_url = ""

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            ld = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        if ld.get("@type") == "PerformingGroup":
            title = ld.get("name", "")
            description = ld.get("description", "")
            image_url = ld.get("image", "")
            break

    # Fallbacks
    if not title:
        og_title = soup.select_one('meta[property="og:title"]')
        title = (og_title.get("content", "") if og_title else "").strip()
        # Strip biletyna suffix from OG title
        title = re.sub(r"\s*\|.*$", "", title)
        title = re.sub(r"\s*-\s*Kraków.*$", "", title)

    if not image_url:
        og_img = soup.select_one('meta[property="og:image"]')
        image_url = og_img.get("content", "") if og_img else ""

    if not description:
        og_desc = soup.select_one('meta[property="og:description"]')
        description = og_desc.get("content", "") if og_desc else ""

    # Short description — first sentence
    description_short = ""
    if description:
        first = description.split("\n")[0].split(". ")[0]
        description_short = (first[:297] + "...") if len(first) > 300 else first

    # ── Tags / categories ───────────────────────────────────────
    tags = list({t.get_text(strip=True) for t in soup.select(".tag, .tags a, .category-tag")})

    # ── Ticket rows: all dates/times ────────────────────────────
    dates: list[ShowDate] = []

    for row in soup.select("tr.event-row"):
        sd = _parse_ticket_row(row)
        if sd:
            dates.append(sd)

    # Build summary fields from first date
    start_at_raw = ""
    venue_name = ""
    city = ""
    price = ""
    if dates:
        first = dates[0]
        start_at_raw = f"{first.date} {first.time}".strip()
        venue_name = first.venue_name
        city = first.city
        price = first.price
    # If multiple dates, also set end from last date
    end_at_raw = ""
    if len(dates) > 1 and dates[-1].date != dates[0].date:
        end_at_raw = dates[-1].date

    filled = sum(bool(v) for v in (title, start_at_raw, venue_name, description, image_url))

    return EventData(
        source="biletyna",
        listing_url=listing_url,
        detail_url=detail_url,
        title=title,
        description_short=description_short,
        description_long=description,
        start_at_raw=start_at_raw,
        end_at_raw=end_at_raw,
        venue_name=venue_name,
        city=city or "Kraków",
        price=price,
        image_url=image_url,
        categories=tags,
        tags=tags,
        dates=dates,
        confidence=round(filled / 5, 2),
    )


def _parse_ticket_row(row) -> ShowDate | None:
    """Parse a single tr.event-row into a ShowDate."""
    # Date
    date_el = row.select_one(".table-important-text")
    date_str = date_el.get_text(strip=True) if date_el else ""
    if not re.match(r"\d{2}\.\d{2}\.\d{4}", date_str):
        return None

    # Time — text after the date in .event-date
    time_str = ""
    date_div = row.select_one(".event-date")
    if date_div:
        full_text = date_div.get_text(" ", strip=True)
        time_match = re.search(r"godz\.?\s*(\d{1,2}:\d{2})", full_text)
        if time_match:
            time_str = time_match.group(1)

    # Venue — .event-place
    venue_name = ""
    place_div = row.select_one(".event-place")
    if place_div:
        # Second link is venue name, first is city
        links = place_div.select("a")
        if len(links) >= 2:
            venue_name = links[1].get_text(strip=True)
        elif len(links) == 1:
            venue_name = links[0].get_text(strip=True)

    # City
    city = ""
    city_el = row.select_one(".event-place .table-important-text")
    if city_el:
        city = city_el.get_text(strip=True)

    # Price
    price = ""
    price_div = row.select_one(".event-ticket-info")
    if price_div:
        price_text = price_div.get_text(" ", strip=True)
        price_match = re.search(r"(\d+[.,]\d{2})\s*zł", price_text)
        if price_match:
            price = f"{price_match.group(1)} zł"

    # Tickets available
    tickets = ""
    ticket_match = re.search(r"(\d+)", (price_div.get_text(" ", strip=True) if price_div else ""))
    if ticket_match and price_div:
        all_numbers = re.findall(r"\d+", price_div.get_text(" ", strip=True))
        # First number is usually ticket count, skip the price digits
        for n in all_numbers:
            if len(n) >= 2 and n not in (price.replace(",", "").replace(".", "").replace(" zł", "")):
                tickets = n
                break

    return ShowDate(
        date=date_str,
        time=time_str,
        venue_name=venue_name,
        city=city,
        price=price,
        tickets_available=tickets,
    )


def _register() -> None:
    from backend.ingest.registry import register_adapter
    register_adapter("biletyna", BiletynAdapter)

_register()
