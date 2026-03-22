"""
Scraper for Centrum Kultury Podgórza — www.ckpodgorza.pl
Listing: https://www.ckpodgorza.pl/oferta/wydarzenia

Uses Playwright to:
  1. Open the events page
  2. Select "dla dzieci" and "dla młodzieży" age group filters
  3. Click "zobacz więcej" until all events are loaded
  4. Parse all event blocks

HTML structure per event:
  <a class="blocks__item block" href="/oferta/wydarzenie/...">
    <span class="block__place">Ośrodek Ruczaj</span>
    <span class="date__day">13.10.2025 - 29.06.2026</span>
    <span class="date__hour">poniedziałek - 10:00</span>
    <span class="category__type">warsztaty</span>
    <h3 class="block__title">Tytuł</h3>
    <span class="bl__text">wstęp wolny</span>
  </a>
"""

from __future__ import annotations

import logging
import re
from datetime import datetime

from bs4 import BeautifulSoup

from backend.models import ExtractedEvent
from backend.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

# Map Polish category names from CKP to our categories
CATEGORY_MAP = {
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
    "inne": "inne",
}


class CkPodgorzaScraper(BaseScraper):

    def fetch_filtered_html(self) -> str:
        """Use Playwright to load filtered events (dzieci + młodzież) with all pages expanded."""
        from playwright.sync_api import sync_playwright

        logger.info("CK Podgórza: using Playwright for filtered listing")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1200, "height": 900})
            try:
                page.goto("https://www.ckpodgorza.pl/oferta/wydarzenia", wait_until="networkidle", timeout=30000)

                # Dismiss cookie banner
                page.evaluate("""() => {
                    const cookies = document.querySelector('.cookies.active');
                    if (cookies) cookies.remove();
                }""")
                page.wait_for_timeout(500)

                # Click filter labels via JS (bypasses Playwright visibility checks)
                page.evaluate('document.querySelector("label[for=group-1]").click()')
                page.wait_for_timeout(500)
                page.evaluate('document.querySelector("label[for=group-4]").click()')
                page.wait_for_timeout(4000)

                # Click "ZOBACZ WIĘCEJ" repeatedly to load all pages
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
                return html
            finally:
                browser.close()

    def scrape_listing(self, html: str) -> list[ExtractedEvent]:
        """Parse events from HTML. If html is from the unfiltered page,
        try Playwright for filtered results first."""
        # Try Playwright for filtered + expanded results
        try:
            filtered_html = self.fetch_filtered_html()
            html = filtered_html
            logger.info("CK Podgórza: using Playwright-filtered HTML")
        except Exception as e:
            logger.warning(f"CK Podgórza: Playwright failed ({e}), using static HTML")

        soup = BeautifulSoup(html, "html.parser")
        events: list[ExtractedEvent] = []

        for block in soup.select("a.block[href*='/oferta/wydarzenie/']"):
            try:
                event = self._parse_block(block)
                if event:
                    events.append(event)
            except Exception:
                continue

        return events

    def _parse_block(self, block) -> ExtractedEvent | None:
        # URL
        href = block.get("href", "")
        detail_url = self.full_url(href)

        # Title
        title_el = block.select_one("h3.block__title, .block__title")
        title = title_el.get_text(strip=True) if title_el else ""
        if not title:
            return None

        # Venue
        venue_el = block.select_one(".block__place")
        venue_name = venue_el.get_text(strip=True) if venue_el else None

        # Dates
        date_el = block.select_one(".date__day")
        date_text = date_el.get_text(strip=True) if date_el else ""
        start_at, end_at = self._parse_dates(date_text)

        # Time
        hour_el = block.select_one(".date__hour")
        hour_text = hour_el.get_text(strip=True) if hour_el else ""
        time = self._parse_time(hour_text)
        if time and start_at:
            start_at = start_at.replace("T00:00:00", f"T{time}:00")

        # Category
        cat_el = block.select_one(".category__type")
        cat_text = (cat_el.get_text(strip=True) if cat_el else "inne").lower()
        category = CATEGORY_MAP.get(cat_text, "inne")

        # Price
        price_el = block.select_one(".bl__text")
        price_text = price_el.get_text(strip=True).lower() if price_el else ""
        is_free = "wolny" in price_text or "bezpłatne" in price_text or "free" in price_text
        price_from = self._parse_price(price_text)

        return ExtractedEvent(
            title=title,
            detail_url=detail_url,
            start_at=start_at,
            end_at=end_at,
            date_text_raw=date_text,
            venue_name=venue_name,
            district="Podgórze",
            city="Kraków",
            categories=[category],
            is_free=is_free,
            price_from=price_from,
            overall_confidence=0.9,
            field_confidence={
                "title": 1.0,
                "start_at": 0.9 if start_at else 0.0,
                "venue_name": 1.0 if venue_name else 0.0,
                "categories": 0.8,
            },
        )

    def scrape_detail(self, html: str, event: ExtractedEvent) -> ExtractedEvent:
        """Enrich from detail page — full description, address, date/time, price, image.

        Detail page structure:
          .content__paragraph           → full description text
          .sidebar .text-block__content → date/time, price, venue/address, contact
          .text-block__price--free      → "wstęp wolny"
          .text-block__content--bold    → date + time (e.g. "poniedziałek 23.03.2026 11:30")
          .text-block__content--sm      → address (e.g. "ul. Dąbrowa 3, 30-381 Kraków")
          .wrapper img                  → event image
        """
        soup = BeautifulSoup(html, "html.parser")
        merged = event.model_copy()

        # Description — from .content__paragraph
        desc_el = soup.select_one(".content__paragraph")
        if desc_el:
            merged.description_long = desc_el.get_text(separator="\n", strip=True)
            if not merged.description_short or len(merged.description_short) < 30:
                first = merged.description_long.split(". ")[0]
                merged.description_short = (first[:197] + "...") if len(first) > 200 else first + "."

        # Date + time from sidebar
        date_block = soup.select_one(".sidebar .text-block__content--bold")
        if date_block:
            text = date_block.get_text(strip=True)
            # Extract date
            date_match = re.search(r"(\d{2}\.\d{2}\.\d{4})", text)
            # Extract time
            time_match = re.search(r"(\d{1,2}:\d{2})", text)
            if date_match:
                date_str = date_match.group(1)
                time_str = time_match.group(1) if time_match else "00:00"
                merged.start_at = self._to_iso(date_str, time_str)

        # End date — check if there's a second date
        all_dates = soup.select(".sidebar .text-block__content--bold")
        if len(all_dates) >= 2:
            second_text = all_dates[1].get_text(strip=True)
            end_date_match = re.search(r"(\d{2}\.\d{2}\.\d{4})", second_text)
            if end_date_match:
                merged.end_at = self._to_iso(end_date_match.group(1))

        # Price
        price_free = soup.select_one(".text-block__price--free")
        if price_free:
            merged.is_free = True
            merged.price_from = None
        else:
            price_el = soup.select_one(".text-block__price")
            if price_el:
                price_text = price_el.get_text(strip=True)
                merged.price_from = self._parse_price(price_text)
                if merged.price_from is not None:
                    merged.is_free = False

        # Venue name + address
        venue_bold = soup.select(".text-block__content--bold")
        venue_sm = soup.select_one(".text-block__content--sm")
        # Venue name is in the text-block that contains the address
        for bold in venue_bold:
            text = bold.get_text(strip=True)
            if "Centrum Kultury" in text or "Klub" in text or "Ośrodek" in text or "Teatr" in text or "Fort" in text or "Dwór" in text or "Strefa" in text:
                merged.venue_name = text
                break

        if venue_sm:
            merged.venue_address = venue_sm.get_text(strip=True)

        # Image
        img = soup.select_one(".wrapper img, .content img")
        if img and img.get("src"):
            src = img["src"]
            if not src.startswith("data:") and "icon" not in src:
                merged.image_url = self.full_url(src)

        # Tags — age group, category
        tags = [t.get_text(strip=True).lower() for t in soup.select(".filter-tag")]
        if "dla dzieci" in tags:
            merged.age_min = merged.age_min or 0
            merged.age_max = merged.age_max or 12
        if "dla młodzieży" in tags:
            merged.age_max = 18

        return merged

    def _parse_dates(self, text: str) -> tuple[str | None, str | None]:
        """Parse '13.10.2025 - 29.06.2026' → (ISO start, ISO end)"""
        dates = re.findall(r"(\d{2}\.\d{2}\.\d{4})", text)
        start = self._to_iso(dates[0]) if dates else None
        end = self._to_iso(dates[1]) if len(dates) > 1 else None
        return start, end

    def _to_iso(self, date_str: str, time_str: str = "00:00") -> str | None:
        """Convert DD.MM.YYYY + HH:MM → ISO 8601 with Europe/Warsaw timezone."""
        try:
            dt = datetime.strptime(f"{date_str} {time_str}", "%d.%m.%Y %H:%M")
            # Store with +01:00 (CET) or +02:00 (CEST) depending on date
            # For simplicity, use +01:00 (Jan-Mar, Oct-Dec) or +02:00 (Apr-Sep)
            offset = "+02:00" if 4 <= dt.month <= 9 else "+01:00"
            return dt.strftime(f"%Y-%m-%dT%H:%M:00{offset}")
        except ValueError:
            return None

    def _parse_time(self, text: str) -> str | None:
        """Extract HH:MM from text like 'poniedziałek - 10:00'"""
        match = re.search(r"(\d{1,2}:\d{2})", text)
        return match.group(1) if match else None

    def _parse_price(self, text: str) -> float | None:
        """Extract price from text like '25 zł' or 'od 30 zł'"""
        if "wolny" in text or "bezpłatne" in text:
            return None
        match = re.search(r"(\d+(?:[.,]\d+)?)", text)
        if match:
            return float(match.group(1).replace(",", "."))
        return None
