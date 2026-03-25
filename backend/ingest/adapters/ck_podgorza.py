"""CK Podgórza adapter — Centrum Kultury Podgórza.

Listing: https://www.ckpodgorza.pl/oferta/wydarzenia

Uses Playwright to click "dla dzieci" + "dla młodzieży" filters
and "zobacz więcej" to load all events.

Detail pages have a consistent layout:
  - h1                              → title
  - .filter-tag                     → tags (venue, age group, category)
  - .content__paragraph             → description
  - .text-block__content--bold      → day-of-week + date range, price, venue name
  - .text-block__content--sm        → street address
  - .text-block--single .text-block__content → contact (email + phone)
  - .wrapper img                    → image
"""

from __future__ import annotations

import logging
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from backend.ingest.fetch import fetch, polite_sleep
from backend.ingest.models import EventData

logger = logging.getLogger(__name__)

_BASE = "https://www.ckpodgorza.pl"
_DEFAULT_LISTING = "https://www.ckpodgorza.pl/oferta/wydarzenia"

_DETAIL_RE = re.compile(r"^https://www\.ckpodgorza\.pl/oferta/wydarzenie/[^/]+$")

# Map CKP tag text → our category
_CATEGORY_MAP = {
    "warsztaty": "warsztaty",
    "warsztaty florystyczne": "warsztaty",
    "koncert": "muzyka",
    "spektakl": "spektakl",
    "spektakl dla dzieci": "spektakl",
    "wernisaż": "wystawa",
    "wystawa": "wystawa",
    "kino": "kino",
    "piknik/festyn": "festyn",
    "festyn": "festyn",
}


class CkPodgorzaAdapter:
    """Playwright-filtered listing → custom CSS extraction on detail pages."""

    def run(self, listing_url: str = "") -> list[EventData]:
        listing_url = listing_url or _DEFAULT_LISTING
        logger.info("[ck_podgorza] listing (Playwright): %s", listing_url)

        html = self._fetch_filtered(listing_url)
        detail_urls = self._discover(html)
        logger.info("[ck_podgorza] discovered %d event URL(s)", len(detail_urls))

        events: list[EventData] = []
        for url in detail_urls:
            logger.info("[ck_podgorza] detail: %s", url)
            try:
                detail_html = fetch(url)
            except Exception as exc:
                logger.error("[ck_podgorza] FAILED %s: %s", url, exc)
                continue

            ev = _extract_detail(detail_html, url, listing_url)
            events.append(ev)
            polite_sleep()

        logger.info("[ck_podgorza] extracted %d event(s)", len(events))
        return events

    # ── Playwright listing ──────────────────────────────────────

    def _fetch_filtered(self, url: str) -> str:
        from playwright.sync_api import sync_playwright

        logger.info("[ck_podgorza] launching Playwright for filtered listing")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1200, "height": 900})
            try:
                page.goto(url, wait_until="networkidle", timeout=30_000)

                page.evaluate("""() => {
                    const c = document.querySelector('.cookies.active');
                    if (c) c.remove();
                }""")
                page.wait_for_timeout(500)

                # Click "dla dzieci" (group-1) and "dla młodzieży" (group-4)
                page.evaluate('document.querySelector("label[for=group-1]")?.click()')
                page.wait_for_timeout(500)
                page.evaluate('document.querySelector("label[for=group-4]")?.click()')
                page.wait_for_timeout(4000)

                # Expand all pages
                for _ in range(20):
                    try:
                        clicked = page.evaluate("""() => {
                            const spans = document.querySelectorAll('span.btn');
                            for (const s of spans) {
                                if (s.textContent.trim().toUpperCase().includes('ZOBACZ')) {
                                    s.click();
                                    return true;
                                }
                            }
                            return false;
                        }""")
                        if not clicked:
                            break
                        page.wait_for_timeout(3000)
                    except Exception:
                        break

                html = page.content()
                logger.info("[ck_podgorza] Playwright: got %d chars", len(html))
                return html
            finally:
                browser.close()

    # ── URL discovery ───────────────────────────────────────────

    def _discover(self, html: str) -> list[str]:
        soup = BeautifulSoup(html, "html.parser")
        seen: set[str] = set()
        urls: list[str] = []

        for block in soup.select("a.block[href*='/oferta/wydarzenie/']"):
            href = block.get("href", "")
            if not href:
                continue
            full = urljoin(_BASE, href)
            if not _DETAIL_RE.match(full):
                continue
            norm = full.rstrip("/")
            if norm not in seen:
                seen.add(norm)
                urls.append(full)

        return urls


# ════════════════════════════════════════════════════════════════════
# Detail page extractor — pure CSS, no LLM
# ════════════════════════════════════════════════════════════════════

def _extract_detail(html: str, detail_url: str, listing_url: str) -> EventData:
    """Extract all event data from a CK Podgórza detail page."""
    soup = BeautifulSoup(html, "html.parser")

    # Title
    h1 = soup.select_one("h1")
    title = h1.get_text(strip=True) if h1 else ""

    # Tags (blue badges: venue location, age groups, category)
    raw_tags = [t.get_text(strip=True) for t in soup.select(".filter-tag")]

    # Map tags → categories
    categories: list[str] = []
    for tag in raw_tags:
        mapped = _CATEGORY_MAP.get(tag.lower())
        if mapped and mapped not in categories:
            categories.append(mapped)
    if not categories:
        categories = ["inne"]

    # Description
    desc_el = soup.select_one(".content__paragraph")
    description_long = desc_el.get_text(separator="\n", strip=True) if desc_el else ""
    description_short = ""
    if description_long:
        first = description_long.split("\n")[0].split(". ")[0]
        description_short = (first[:297] + "...") if len(first) > 300 else first

    # Sidebar bold blocks: date, price, venue name
    bolds = [" ".join(el.get_text(strip=True).split()) for el in soup.select(".text-block__content--bold")]

    # Date/time — first bold block typically contains the date
    start_at_raw = ""
    end_at_raw = ""
    for bold in bolds:
        dates = re.findall(r"\d{2}\.\d{2}\.\d{4}", bold)
        if dates:
            time_match = re.search(r"(\d{1,2}:\d{2})", bold)
            time_str = time_match.group(1) if time_match else ""
            start_at_raw = f"{dates[0]} {time_str}".strip()
            if len(dates) > 1:
                end_at_raw = dates[1]
            break

    # Price — bold block containing "wolny" or "zł"
    price = ""
    price_el = soup.select_one(".text-block__price--free, .text-block__price")
    if price_el:
        price = price_el.get_text(strip=True)
    if not price:
        for bold in bolds:
            if "wolny" in bold.lower() or "zł" in bold.lower():
                price = bold
                break

    # Venue name — bold block that's not a date and not a price
    venue_name = ""
    for bold in bolds:
        if re.search(r"\d{2}\.\d{2}\.\d{4}", bold):
            continue
        if "wolny" in bold.lower() or "zł" in bold.lower() or "bilet" in bold.lower():
            continue
        venue_name = bold
        break

    # Address — small text under venue
    address_el = soup.select_one(".text-block__content--sm")
    venue_address = " ".join(address_el.get_text(strip=True).split()) if address_el else ""

    # Contact — in the .text-block--single block
    contact_email = ""
    contact_phone = ""
    contact_block = soup.select_one(".text-block--single .text-block__content")
    if contact_block:
        contact_text = contact_block.get_text(separator=" ", strip=True)
        email_match = re.search(r"[\w.-]+@[\w.-]+\.\w+", contact_text)
        if email_match:
            contact_email = email_match.group(0)
        phones = re.findall(r"[\d ]{9,}", contact_text)
        contact_phone = ", ".join(p.strip() for p in phones if len(p.strip()) >= 9)

    # Image
    image_url = ""
    img = soup.select_one(".wrapper img")
    if img:
        src = img.get("src", "")
        if src and not src.startswith("data:") and "icon" not in src.lower():
            image_url = urljoin(_BASE, src)
    # Fallback: OG image (usually just the favicon though)
    if not image_url:
        og = soup.select_one('meta[property="og:image"]')
        if og and og.get("content") and "favicon" not in og["content"]:
            image_url = og["content"]

    # Confidence
    filled = sum(bool(v) for v in (title, start_at_raw, venue_name, description_long, image_url))
    confidence = round(filled / 5, 2)

    return EventData(
        source="ck_podgorza",
        listing_url=listing_url,
        detail_url=detail_url,
        title=title,
        description_short=description_short,
        description_long=description_long,
        start_at_raw=start_at_raw,
        end_at_raw=end_at_raw,
        venue_name=venue_name,
        venue_address=venue_address,
        city="Kraków",
        price=price,
        image_url=image_url,
        categories=categories,
        tags=raw_tags,
        contact_email=contact_email,
        contact_phone=contact_phone,
        confidence=confidence,
    )


def _register() -> None:
    from backend.ingest.registry import register_adapter
    register_adapter("ck_podgorza", CkPodgorzaAdapter)

_register()
