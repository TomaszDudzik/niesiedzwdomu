"""
Expire past events job.
Run via: python -m backend.jobs.expire_events

Marks scraped events as 'expired' when their end_at (or start_at) has passed.
Also updates the canonical events table to 'cancelled' status.
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone

from backend import db as database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def run() -> None:
    db = database.get_client()
    count = database.expire_past_events(db)
    logger.info(f"Expired {count} past event(s)")


if __name__ == "__main__":
    run()
