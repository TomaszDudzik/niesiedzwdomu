"""Flatten multi-date events into individual rows for storage."""

from __future__ import annotations

import logging

from backend.ingest.models import EventData, ShowDate

logger = logging.getLogger(__name__)


def flatten_events(events: list[EventData]) -> list[EventData]:
    """Expand multi-date events into one EventData per show date.

    An event with 3 dates becomes 3 separate EventData objects,
    each with a single date in start_at_raw and an empty dates list.
    Single-date events pass through unchanged.
    """
    flat: list[EventData] = []

    for ev in events:
        if len(ev.dates) <= 1:
            # Single date or no dates — keep as-is
            flat.append(ev)
            continue

        # Explode: one row per ShowDate
        for show in ev.dates:
            row = EventData(
                source=ev.source,
                listing_url=ev.listing_url,
                detail_url=ev.detail_url,
                title=ev.title,
                description_short=ev.description_short,
                description_long=ev.description_long,
                start_at_raw=f"{show.date} {show.time}".strip(),
                venue_name=show.venue_name or ev.venue_name,
                venue_address=ev.venue_address,
                city=show.city or ev.city,
                price=show.price or ev.price,
                currency=ev.currency,
                image_url=ev.image_url,
                categories=ev.categories,
                tags=ev.tags,
                contact_email=ev.contact_email,
                contact_phone=ev.contact_phone,
                dates=[show],
                confidence=ev.confidence,
            )
            flat.append(row)

    logger.info("Flattened %d events → %d rows", len(events), len(flat))
    return flat
