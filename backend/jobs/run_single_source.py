"""
Scrape a single source by ID.
Run via: python -m backend.jobs.run_single_source <source_id> [--force]

Triggered from admin panel "Scrapuj teraz" button.
--force skips the content hash cache and re-extracts everything.
"""

from __future__ import annotations

import logging
import sys

from backend import db as database
from backend.jobs.logging_setup import setup_logging
from backend.jobs.run_pipeline import process_source
from backend.sources.loader import _db_row_to_source_dict

setup_logging("scraper")
logger = logging.getLogger(__name__)


def run(source_id: str, force: bool = False) -> None:
    """Load source from DB and process it."""
    db = database.get_client()

    # Fetch source config from scrape_sources
    result = (
        db.table("scrape_sources")
        .select("*")
        .eq("id", source_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        logger.error("Source not found: %s", source_id)
        sys.exit(1)

    source = _db_row_to_source_dict(result.data[0])
    logger.info("Loaded source: %s (id=%s)", source["name"], source_id)

    counts = process_source(source, force=force)

    logger.info(
        "Done: %d created, %d updated, %d skipped, %d errors",
        counts["created"], counts["updated"], counts["skipped"], counts["errors"],
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Scrape a single source by ID")
    parser.add_argument("source_id", help="UUID of the scrape_source")
    parser.add_argument("--force", action="store_true", help="Skip content hash cache")

    args = parser.parse_args()
    run(args.source_id, force=args.force)
