"""
Seed initial scrape sources into Supabase.
Usage: python scripts/seed_sources.py

Modify SOURCES list below with real source configs before running.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure project root is on sys.path so `backend` package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import db as database

# Add your real sources here. Each entry maps to a row in scrape_sources.
SOURCES = [
    {
        "name": "Example Source",
        "base_url": "https://example.com",
        "fetch_method": "requests",
        "extractor_type": "llm",
        "scrape_interval_hours": 24,
        "is_active": False,  # Set to True when adapter is ready
        "scrape_config": {
            "adapter_class": "example",
            "base_url": "https://example.com",
            "listing_paths": ["/wydarzenia"],
            "event_link_selector": "a.event-link",
        },
        "notes": "Template source — replace with real config",
    },
    # {
    #     "name": "Kraków dla dzieci",
    #     "base_url": "https://krakowdladzieci.pl",
    #     "fetch_method": "requests",
    #     "extractor_type": "llm",
    #     "scrape_interval_hours": 12,
    #     "is_active": True,
    #     "scrape_config": {
    #         "adapter_class": "krakow_dla_dzieci",
    #         "base_url": "https://krakowdladzieci.pl",
    #         "listing_paths": ["/wydarzenia"],
    #         "event_link_selector": "a.event-card-link",
    #     },
    # },
]


def main() -> None:
    db = database.get_client()

    for source in SOURCES:
        result = db.table("scrape_sources").insert(source).execute()
        print(f"Created source: {result.data[0]['name']} ({result.data[0]['id']})")

    print(f"\nSeeded {len(SOURCES)} source(s)")


if __name__ == "__main__":
    main()
