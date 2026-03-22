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
from backend.jobs.run_pipeline import process_source
from backend.sources.loader import _db_row_to_source_dict

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def run(source_id: str, force: bool = False) -> None:
    db = database.get_client()

    result = (
        db.table("scrape_sources")
        .select("*")
        .eq("id", source_id)
        .single()
        .execute()
    )

    if not result.data:
        logger.error(f"Source not found: {source_id}")
        return

    source = _db_row_to_source_dict(result.data)
    logger.info(f"Manual scrape triggered for: {source['name']}" + (" (FORCE)" if force else ""))
    process_source(db, source, force=force)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m backend.jobs.run_single_source <source_id> [--force]")
        sys.exit(1)
    force = "--force" in sys.argv
    run(sys.argv[1], force=force)
