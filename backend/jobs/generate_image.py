"""
Generate an event image via DALL-E and upload to Supabase Storage.
Run via: python -m backend.jobs.generate_image <json_args>

Triggered from admin panel image generation button.
Prints JSON result to stdout.
"""

from __future__ import annotations

import json
import logging
import sys

from backend import db as database
from backend.images.generator import generate_event_image
from backend.images.storage import upload_from_url
from backend.jobs.logging_setup import setup_logging

setup_logging("generate_image")
logger = logging.getLogger(__name__)


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python -m backend.jobs.generate_image '<json>'"}))
        sys.exit(1)

    args = json.loads(sys.argv[1])
    event_id: str = args["id"]
    title: str = args["title"]
    category: str = args.get("category", "inne")
    description: str = args.get("description", "")
    target: str = args.get("target", "events")

    logger.info("Generating image for event '%s' (id=%s, category=%s)", title, event_id, category)

    # Step 1: Generate image (returns temporary OpenAI URL)
    temp_url = generate_event_image(
        title=title,
        category=category,
        description=description,
    )

    # Step 2: Upload to Supabase Storage
    db = database.get_client()
    public_url = upload_from_url(db, temp_url, event_id, category=category)

    # Step 3: Update the event record
    table_name = "scraped_events" if target == "scraped" else "events"
    db.table(table_name).update({"image_url": public_url}).eq("id", event_id).execute()

    logger.info("Image saved for event %s: %s", event_id, public_url)

    # Output result as JSON to stdout (read by Next.js)
    print(json.dumps({"ok": True, "image_url": public_url}))


if __name__ == "__main__":
    main()
