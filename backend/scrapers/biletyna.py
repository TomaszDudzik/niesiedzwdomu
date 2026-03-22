"""
Scraper for biletyna.pl — event ticket platform.
Listing: https://biletyna.pl/dla-dzieci/Krakow?city_id=16#list

Listing structure:
  <article class="event">
    <a class="event-img" href="/dla-dzieci/Czarodziej/Krakow">
      <img alt="Title" data-src="/file/get/..."/>
    </a>
    <h3 class="event-title"><a href="...">Title</a></h3>
    <p>od DD.MM.YYYY</p>
  </article>

Detail page structure:
  <div class="event-content">
    Title | DD.MM.YYYY | godz. HH:MM | City | Venue | Bilety od | XX,XX zł
  </div>
  <div class="important-text">short description</div>
  Full description in show-more-wrapper
"""

from __future__ import annotations

import re
from datetime import datetime

from bs4 import BeautifulSoup

from backend.models import ExtractedEvent
from backend.scrapers.base import BaseScraper


class BiletynaScraper(BaseScraper):

    def scrape_listing(self, html: str) -> list[ExtractedEvent]:
        soup = BeautifulSoup(html, "html.parser")
        events: list[ExtractedEvent] = []

        for article in soup.select("article.event"):
            try:
                event = self._parse_article(article)
                if event:
                    events.append(event)
            except Exception:
                continue

        return events

    def _parse_article(self, article) -> ExtractedEvent | None:
        # Title + link
        title_link = article.select_one("h3.event-title a, .event-title a")
        if not title_link:
            return None
        title = title_link.get_text(strip=True)
        href = title_link.get("href", "")
        detail_url = self.full_url(href)

        # Date from listing
        date_text = ""
        for p in article.select("p, .icon-row-flex p"):
            text = p.get_text(strip=True)
            if re.search(r"\d{2}\.\d{2}\.\d{4}", text):
                date_text = text
                break

        start_at = None
        date_match = re.search(r"(\d{2}\.\d{2}\.\d{4})", date_text)
        if date_match:
            try:
                dt = datetime.strptime(date_match.group(1), "%d.%m.%Y")
                start_at = dt.strftime("%Y-%m-%dT00:00:00+02:00")
            except ValueError:
                pass

        # Image
        img = article.select_one("img[data-src], img[src]")
        image_url = None
        if img:
            src = img.get("data-src") or img.get("src", "")
            if src and "zaslepka" not in src:
                image_url = self.full_url(src)

        return ExtractedEvent(
            title=title,
            detail_url=detail_url,
            start_at=start_at,
            date_text_raw=date_text,
            image_url=image_url,
            city="Kraków",
            categories=["spektakl"],
            overall_confidence=0.7,
            field_confidence={"title": 1.0, "start_at": 0.8 if start_at else 0.0},
        )

    def scrape_detail(self, html: str, event: ExtractedEvent) -> ExtractedEvent:
        """Enrich from detail page — venue, price, time, description."""
        soup = BeautifulSoup(html, "html.parser")
        merged = event.model_copy()

        # Event content block: "Title | 28.03.2026 | godz. 14:00 | Kraków | Venue | Bilety od | 125,43 zł"
        content = soup.select_one(".event-content")
        if content:
            text = content.get_text(separator=" | ", strip=True)

            # Time
            time_match = re.search(r"godz\.\s*(\d{1,2}:\d{2})", text)
            if time_match and merged.start_at:
                merged.start_at = merged.start_at.replace("T00:00:00", f"T{time_match.group(1)}:00")

            # Venue — text after city name
            venue_match = re.search(r"Kraków\s*\|\s*(.+?)\s*\|", text)
            if venue_match:
                merged.venue_name = venue_match.group(1).strip()

            # Price
            price_match = re.search(r"(\d+[.,]\d{2})\s*zł", text)
            if price_match:
                merged.price_from = float(price_match.group(1).replace(",", "."))

        # Description — biletyna loads full desc via JS, so we get what's available:
        # 1. Try JSON-LD structured data (often has description)
        import json as _json
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                ld = _json.loads(script.string or "")
                if isinstance(ld, dict) and ld.get("description"):
                    merged.description_long = ld["description"]
                    break
            except Exception:
                continue

        # 2. Try og:description meta tag
        if not merged.description_long:
            og_desc = soup.select_one('meta[property="og:description"]')
            if og_desc and og_desc.get("content") and len(og_desc["content"]) > 20:
                merged.description_long = og_desc["content"]

        # 3. Try regular meta description
        if not merged.description_long:
            meta = soup.select_one('meta[name="description"]')
            if meta and meta.get("content") and len(meta["content"]) > 20:
                merged.description_long = meta["content"]

        # 4. Try any visible text blocks that look like descriptions
        if not merged.description_long:
            for sel in [".event-description", ".description", "article p"]:
                el = soup.select_one(sel)
                if el:
                    text = el.get_text(strip=True)
                    if len(text) > 50:
                        merged.description_long = text
                        break

        # Auto-generate short from long
        if merged.description_long and (not merged.description_short or len(merged.description_short) < 30):
            # Clean up generic prefix
            desc = merged.description_long
            for prefix in ["Bilety na wydarzenie", "Kup Bilet Online"]:
                desc = desc.replace(prefix, "").strip(" ✔️➤.-")
            first = desc.split(". ")[0].strip()
            if len(first) > 10:
                merged.description_short = (first[:197] + "...") if len(first) > 200 else first + "."

        # OG image (usually better quality than listing thumbnail)
        og_img = soup.select_one('meta[property="og:image"]')
        if og_img and og_img.get("content"):
            merged.image_url = og_img["content"]

        return merged
