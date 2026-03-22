"""
Main scraping pipeline job.
Run via: python -m backend.jobs.run_pipeline

Reads sources from the database (scrape_sources table).
Sequential execution — no Celery needed for MVP.
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from backend import db as database
from backend.scraping.fetcher import fetch_page
from backend.scraping.cleaner import clean_html
from backend.extraction.llm import extract_events
from backend.extraction.enrich import enrich_event
from backend.scrapers.registry import get_scraper
from backend.processing.normalizer import normalize
from backend.processing.validator import validate
from backend.processing.scorer import compute_score
from backend.processing.dedup import compute_fingerprint, find_duplicates
from backend.services.publish import route_event
from backend.sources.loader import (
    get_active_sources_from_db,
    get_all_listing_urls,
    is_inline_source,
    is_pre_filtered,
    get_link_selector,
    get_defaults,
    get_extraction_instructions,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def run() -> None:
    """Main entry point: process all active sources from database."""
    db = database.get_client()
    sources = get_active_sources_from_db(db)

    if not sources:
        logger.info("No active sources in database")
        return

    logger.info(f"Processing {len(sources)} source(s)")

    for source in sources:
        process_source(db, source)


def process_source(db, source: dict, force: bool = False) -> None:
    """Process a single source: fetch all listing pages → extract events."""
    source_name = source["name"]
    logger.info(f"[{source_name}] Starting scrape")

    # Source already comes from DB with id and _db_row
    db_source = source.get("_db_row", {})
    source_id = source["id"]

    run = database.create_source_run(db, source_id)
    run_id = run["id"]
    counters = {"pages_fetched": 0, "events_extracted": 0, "events_new": 0, "events_updated": 0}

    try:
        listing_urls = get_all_listing_urls(source)
        fetch_method = source.get("fetch_method", "requests")
        pre_filtered = is_pre_filtered(source)
        inline = is_inline_source(source)
        defaults = get_defaults(source)
        instructions = get_extraction_instructions(source)

        logger.info(f"[{source_name}] {len(listing_urls)} listing URL(s), "
                     f"inline={inline}, pre_filtered={pre_filtered}")

        for listing_url in listing_urls:
            try:
                result = fetch_page(listing_url, fetch_method)
                counters["pages_fetched"] += 1

                if inline:
                    # Events are on the listing page itself
                    process_page(db, source_id, source_name, run_id,
                                 listing_url, result.html, pre_filtered, counters,
                                 db_source=db_source, defaults=defaults, force=force, extraction_instructions=instructions)
                else:
                    # Follow links to individual event pages
                    selector = get_link_selector(source)
                    soup = BeautifulSoup(result.html, "html.parser")
                    links = soup.select(selector)
                    event_urls = []
                    for link in links:
                        href = link.get("href", "")
                        if href and not href.startswith("#"):
                            full = urljoin(source["base_url"], href)
                            if full not in event_urls:
                                event_urls.append(full)

                    logger.info(f"[{source_name}] Found {len(event_urls)} event links on {listing_url}")

                    for event_url in event_urls:
                        try:
                            ev_result = fetch_page(event_url, fetch_method)
                            counters["pages_fetched"] += 1
                            process_page(db, source_id, source_name, run_id,
                                         event_url, ev_result.html, pre_filtered, counters,
                                         db_source=db_source, defaults=defaults, force=force, extraction_instructions=instructions)
                        except Exception as e:
                            logger.error(f"[{source_name}] Failed event {event_url}: {e}")

            except Exception as e:
                logger.error(f"[{source_name}] Failed listing {listing_url}: {e}", exc_info=True)

        database.finish_source_run(db, run_id, status="completed", **counters)
        database.update_source_last_scraped(db, source_id)
        logger.info(f"[{source_name}] Done: {counters}")

    except Exception as e:
        logger.error(f"[{source_name}] Source failed: {e}", exc_info=True)
        database.finish_source_run(db, run_id, status="failed", error_log=str(e), **counters)


def process_page(
    db, source_id: str, source_name: str, run_id: str,
    url: str, raw_html: str, pre_filtered: bool, counters: dict,
    db_source: dict, defaults: dict | None = None, force: bool = False,
    extraction_instructions: str | None = None,
) -> None:
    """Process a single page: clean → cache check → extract → normalize → score → route."""
    cleaned = clean_html(raw_html, base_url=url)
    c_hash = database.content_hash(cleaned)

    # Skip if content unchanged since last scrape (unless force=True)
    u_hash = database.url_hash(url)
    prev_hash = database.find_latest_page_hash(db, u_hash)
    if not force and prev_hash == c_hash:
        existing = database.find_scraped_event_by_url(db, url)
        if existing:
            database.update_scraped_event(db, existing["id"], {
                "source_last_seen": datetime.now(timezone.utc).isoformat(),
            })
        logger.info(f"[{source_name}] Unchanged: {url}")
        return

    # Save raw page
    page = database.save_raw_page(
        db, source_run_id=run_id, source_id=source_id,
        url=url, raw_html=raw_html, cleaned_text=cleaned, http_status=200,
    )

    # Try custom scraper first, fall back to LLM
    scraper = get_scraper(source_name, base_url=db_source.get("base_url", ""))
    fetch_method = db_source.get("fetch_method", "requests")

    if scraper:
        # Custom Python scraper — fast, reliable, no LLM cost
        logger.info(f"[{source_name}] Using custom scraper: {scraper.__class__.__name__}")
        extracted = scraper.scrape_listing(raw_html)
        counters["events_extracted"] += len(extracted)
        logger.info(f"[{source_name}] Scraped {len(extracted)} event(s) from {url}")

        # Enrich from detail pages using the scraper's own detail parser
        enriched = []
        for event in extracted:
            if event.detail_url:
                try:
                    detail_result = fetch_page(event.detail_url, fetch_method)
                    counters["pages_fetched"] = counters.get("pages_fetched", 0) + 1
                    event = scraper.scrape_detail(detail_result.html, event)
                except Exception as e:
                    logger.warning(f"[{source_name}] Detail fetch failed: {event.detail_url}: {e}")
            enriched.append(event)
    else:
        # LLM extraction — fallback for sources without custom scrapers
        logger.info(f"[{source_name}] Using LLM extraction")
        extracted = extract_events(cleaned, url, pre_filtered=pre_filtered, extraction_instructions=extraction_instructions)
        counters["events_extracted"] += len(extracted)
        logger.info(f"[{source_name}] Extracted {len(extracted)} event(s) via LLM from {url}")

        # Enrich via LLM
        enriched = []
        for event in extracted:
            if event.detail_url:
                event = enrich_event(event, fetch_method=fetch_method)
            enriched.append(event)

    for event in enriched:
        normalized = normalize(event, source_url=event.detail_url or url, defaults=defaults)
        normalized["source_id"] = source_id
        normalized["raw_page_id"] = page["id"]

        errors = validate(normalized)
        score = compute_score(normalized, errors)
        normalized["confidence_score"] = score
        normalized["validation_errors"] = [e.model_dump() for e in errors]

        fp = compute_fingerprint(normalized)
        normalized["fingerprint"] = fp

        # Check for existing record by fingerprint (handles inline pages with multiple events)
        fp_matches = database.find_events_by_fingerprint(db, fp)
        existing = fp_matches[0] if fp_matches else None
        now_iso = datetime.now(timezone.utc).isoformat()

        if existing:
            # Check if anything actually changed
            changed_fields = []
            for key in ["title", "start_at", "end_at", "venue_name", "price_from", "description_short"]:
                old_val = existing.get(key)
                new_val = normalized.get(key)
                if str(old_val) != str(new_val) and not (old_val is None and new_val is None):
                    changed_fields.append(key)

            if changed_fields:
                # Content changed — update and mark
                normalized["previous_data"] = {
                    k: existing[k] for k in ["title", "start_at", "end_at", "venue_name", "price_from"]
                    if k in existing
                }
                normalized["source_last_seen"] = now_iso
                normalized["last_change_at"] = now_iso
                normalized["is_new"] = False
                database.update_scraped_event(db, existing["id"], normalized)
                counters["events_updated"] += 1
                logger.info(f"[{source_name}] Updated ({', '.join(changed_fields)}): {normalized['title']}")
            else:
                # No changes — just bump last_seen timestamp
                database.update_scraped_event(db, existing["id"], {
                    "source_last_seen": now_iso,
                })
                logger.info(f"[{source_name}] Unchanged: {normalized['title']}")
        else:
            # New event — check for fuzzy duplicates
            duplicates = find_duplicates(db, normalized)
            has_dupes = len(duplicates) > 0
            status = route_event(
                score=score, validation_errors=errors,
                has_duplicates=has_dupes,
                source_total_pushed=db_source.get("total_events_pushed", 0),
            )
            normalized["status"] = status
            normalized["is_new"] = True
            normalized["last_change_at"] = now_iso
            new_event = database.create_scraped_event(db, normalized)
            counters["events_new"] += 1

            for dup in duplicates:
                database.create_duplicate(db, new_event["id"], dup.event_id, dup.similarity, dup.match_type)

            logger.info(f"[{source_name}] New: '{normalized['title']}' → {status} (score={score})")



if __name__ == "__main__":
    run()
