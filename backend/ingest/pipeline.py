"""Minimal pipeline: listing pages → event URLs → detail pages → EventData list."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Callable

from backend.ingest.discover import discover_event_urls
from backend.ingest.extract import extract_event
from backend.ingest.fetch import fetch, polite_sleep
from backend.ingest.models import EventData

logger = logging.getLogger(__name__)


def run_pipeline(
    listing_urls: list[str],
    *,
    source_name: str = "",
    url_filter: Callable[[str], bool] | None = None,
) -> list[EventData]:
    """Crawl *listing_urls*, discover detail pages, extract events.

    Args:
        listing_urls: One or more listing/index pages to crawl.
        source_name: Label stored in ``EventData.source`` prefix.
        url_filter: Optional extra predicate on discovered URLs.
                    Return ``True`` to keep.

    Returns:
        List of extracted ``EventData`` objects.
    """
    all_detail_urls: list[str] = []

    # Step 1 – fetch listings & discover detail URLs
    for listing_url in listing_urls:
        logger.info("[listing] %s", listing_url)
        try:
            html = fetch(listing_url)
        except Exception as exc:
            logger.error("[listing] FAILED %s: %s", listing_url, exc)
            continue

        found = discover_event_urls(html, listing_url)

        if url_filter:
            found = [u for u in found if url_filter(u)]

        for u in found:
            if u not in all_detail_urls:
                all_detail_urls.append(u)

        polite_sleep()

    logger.info("[pipeline] %d unique detail URL(s) to process", len(all_detail_urls))

    # Step 2 – fetch each detail page & extract
    events: list[EventData] = []
    for detail_url in all_detail_urls:
        logger.info("[detail] %s", detail_url)
        try:
            html = fetch(detail_url)
        except Exception as exc:
            logger.error("[detail] FAILED %s: %s", detail_url, exc)
            continue

        ev = extract_event(html, detail_url, listing_url=listing_urls[0] if listing_urls else "")
        if source_name:
            ev.source = f"{source_name}:{ev.source}"
        events.append(ev)
        polite_sleep()

    logger.info("[pipeline] Extracted %d event(s)", len(events))
    return events


def export_json(events: list[EventData], path: str | Path) -> None:
    """Write *events* to a JSON file."""
    out = [e.to_dict() for e in events]
    Path(path).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Exported %d event(s) to %s", len(events), path)


def print_events(events: list[EventData]) -> None:
    """Pretty-print events to stdout."""
    if not events:
        print("\nNo events extracted.")
        return

    print(f"\n{'=' * 70}")
    print(f" {len(events)} event(s) extracted")
    print(f"{'=' * 70}")
    for i, ev in enumerate(events, 1):
        print(f"\n--- {i} ---")
        print(f"  title:       {ev.title}")
        print(f"  start:       {ev.start_at_raw or '(none)'}")
        print(f"  end:         {ev.end_at_raw or '(none)'}")
        print(f"  venue:       {ev.venue_name or '(none)'}")
        print(f"  address:     {ev.venue_address or '(none)'}")
        print(f"  city:        {ev.city or '(none)'}")
        print(f"  price:       {ev.price or '(none)'}")
        print(f"  image:       {ev.image_url or '(none)'}")
        print(f"  categories:  {ev.categories or '(none)'}")
        print(f"  tags:        {ev.tags or '(none)'}")
        if ev.contact_email or ev.contact_phone:
            print(f"  contact:     {ev.contact_email or ''} / {ev.contact_phone or ''}")
        print(f"  confidence:  {ev.confidence}")
        print(f"  source:      {ev.source}")
        print(f"  detail_url:  {ev.detail_url}")
        if ev.description_short:
            print(f"  desc_short:  {ev.description_short[:120]}{'...' if len(ev.description_short) > 120 else ''}")
        if ev.dates:
            print(f"  dates ({len(ev.dates)}):")
            for d in ev.dates:
                parts = [d.date, d.time, d.venue_name, d.price]
                print(f"    - {' | '.join(p for p in parts if p)}")
