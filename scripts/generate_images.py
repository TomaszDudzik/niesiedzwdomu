"""
Generate images for published events that don't have one yet.

Usage:
    python scripts/generate_images.py              # all events without images
    python scripts/generate_images.py --limit 5    # only first 5
    python scripts/generate_images.py --dry-run    # preview what would be generated

Cost: ~$0.04-0.08 per image (DALL-E 3)

Prerequisites:
    1. Create "event-images" bucket in Supabase Storage (public)
    2. OPENAI_API_KEY must be set in .env
"""

from __future__ import annotations

import sys
import os
from pathlib import Path

if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import db as database
from backend.images.storage import generate_and_save


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    limit = 100
    for i, arg in enumerate(sys.argv):
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])

    db = database.get_client()

    # Find published events without images
    result = (
        db.table("events")
        .select("id, title, description_short, category, image_url")
        .eq("status", "published")
        .is_("image_url", "null")
        .limit(limit)
        .execute()
    )

    events = result.data
    if not events:
        print("All published events already have images.")
        return

    print(f"Found {len(events)} event(s) without images\n")

    for i, event in enumerate(events):
        title = event["title"]
        category = event.get("category", "inne")
        description = event.get("description_short", "")
        print(f"[{i + 1}/{len(events)}] {title}")
        print(f"  Category: {category}")
        if description:
            print(f"  Description: {description[:80]}...")

        if dry_run:
            print("  → Skipped (dry run)\n")
            continue

        try:
            url = generate_and_save(db, event["id"], title, category, description)
            print(f"  → Saved: {url}\n")
        except Exception as e:
            print(f"  → ERROR: {e}\n")


if __name__ == "__main__":
    main()
