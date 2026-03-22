"""
Enrich extracted events by following their detail URLs.
Fetches the full event page and merges additional data.
"""

from __future__ import annotations

import logging
from datetime import date

from openai import OpenAI

from backend.config import config
from backend.models import ExtractedEvent
from backend.scraping.fetcher import fetch_page
from backend.scraping.cleaner import clean_html

logger = logging.getLogger(__name__)

ENRICH_SYSTEM_PROMPT = """\
You are a data enrichment extractor. You are given:
1. Existing event data (already extracted from a listing page)
2. The full event detail page content

Your task: extract ADDITIONAL information from the detail page that is missing in the existing data.

RULES:
1. Only return fields that have NEW information not already in the existing data.
2. If a field already has a good value, do NOT override it — return null for that field.
3. Focus on: description_short (improve if too generic), description_long (full text from the page), price_from, price_to, is_free, age_min, age_max, venue_name, venue_address, registration_url, image_url, start_at (with exact time), end_at (with exact time).
4a. ALWAYS provide description_long — copy the full event description text from the detail page.
4. Dates must be ISO 8601 with Europe/Warsaw timezone.
5. Prices in PLN as numbers.
6. Return a single JSON object (not an array).
7. If the detail page has no additional useful info, return {"no_new_data": true}.\
"""


def enrich_event(
    event: ExtractedEvent,
    fetch_method: str = "requests",
) -> ExtractedEvent:
    """Follow the event's detail_url and merge additional data."""
    detail_url = event.detail_url
    if not detail_url:
        return event

    logger.info(f"Enriching: {event.title} → {detail_url}")

    try:
        result = fetch_page(detail_url, fetch_method)
        cleaned = clean_html(result.html, base_url=detail_url)

        # Build existing data summary for the LLM
        existing = {
            "title": event.title,
            "description_short": event.description_short,
            "start_at": event.start_at,
            "end_at": event.end_at,
            "price_from": event.price_from,
            "price_to": event.price_to,
            "is_free": event.is_free,
            "age_min": event.age_min,
            "age_max": event.age_max,
            "venue_name": event.venue_name,
            "venue_address": event.venue_address,
        }

        client = OpenAI(api_key=config.openai_api_key)
        today = date.today().isoformat()

        response = client.chat.completions.create(
            model=config.openai_model,
            messages=[
                {"role": "system", "content": ENRICH_SYSTEM_PROMPT},
                {"role": "user", "content": (
                    f"Today: {today}\n"
                    f"Existing data: {existing}\n\n"
                    f"--- DETAIL PAGE ---\n{cleaned[:6000]}\n--- END ---"
                )},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=2048,
        )

        import json
        content = response.choices[0].message.content
        if not content:
            return event

        enriched = json.loads(content)

        if enriched.get("no_new_data"):
            logger.info(f"No new data for: {event.title}")
            return event

        # Merge enriched data into event
        merged = event.model_copy()

        # description_long: always take from detail page (it's richer)
        if enriched.get("description_long"):
            merged.description_long = enriched["description_long"]

        # description_short: take from detail if current one is too generic (< 50 chars)
        if enriched.get("description_short"):
            old_short = merged.description_short or ""
            if len(old_short) < 50:
                merged.description_short = enriched["description_short"]

        # Other fields: only fill in if currently null/empty
        for field in [
            "price_from", "price_to", "is_free", "price_text_raw",
            "age_min", "age_max",
            "venue_name", "venue_address", "district",
            "organizer_name", "registration_url", "image_url",
        ]:
            new_val = enriched.get(field)
            old_val = getattr(merged, field, None)
            if new_val is not None and (old_val is None or old_val == "" or old_val == 0):
                setattr(merged, field, new_val)

        # For start_at/end_at, only update if the new value has time info (not just date)
        for dt_field in ["start_at", "end_at"]:
            new_val = enriched.get(dt_field)
            old_val = getattr(merged, dt_field, None)
            if new_val and old_val:
                # Only replace if new value has actual time (not 00:00:00)
                if "T" in str(new_val) and "T00:00:00" not in str(new_val):
                    setattr(merged, dt_field, new_val)
            elif new_val and not old_val:
                setattr(merged, dt_field, new_val)

        # Set source_url to the detail page
        merged.source_url = detail_url

        logger.info(f"Enriched: {event.title}")
        return merged

    except Exception as e:
        logger.warning(f"Enrichment failed for {detail_url}: {e}")
        return event
