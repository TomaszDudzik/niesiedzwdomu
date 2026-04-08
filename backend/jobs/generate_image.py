"""
Generate an image via DALL-E and upload to Supabase Storage.
Run via: python -m backend.jobs.generate_image <json_args>

Triggered from admin panel image generation button.
Supports both events and places.
Prints JSON result to stdout.
"""

from __future__ import annotations

import json
import logging
import sys

from backend import db as database
from backend.images.generator import generate_event_image, generate_place_image
from backend.images.storage import upload_from_url
from backend.jobs.logging_setup import setup_logging

setup_logging("generate_image")
logger = logging.getLogger(__name__)


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python -m backend.jobs.generate_image '<json>'"}))
        sys.exit(1)

    args = json.loads(sys.argv[1])
    item_id: str = args["id"]
    title: str = args["title"]
    target: str = args.get("target", "events")

    if target == "places":
        # Place image generation
        description_short: str = args.get("description_short", "")
        description_long: str = args.get("description_long", "")

        logger.info("Generating place image for '%s' (id=%s)", title, item_id)

        temp_url = generate_place_image(
            title=title,
            description_short=description_short,
            description_long=description_long,
        )

        db = database.get_client()
        public_url = upload_from_url(db, temp_url, item_id)
        db.table("places").update({"image_url": public_url}).eq("id", item_id).execute()

    elif target == "activities":
        # Activity image generation
        description: str = args.get("description", "")

        logger.info("Generating activity image for '%s' (id=%s)", title, item_id)

        temp_url = generate_event_image(
            title=title,
            category="inne",
            description=description,
        )

        db = database.get_client()
        public_url = upload_from_url(db, temp_url, item_id)
        db.table("activities").update({"image_url": public_url}).eq("id", item_id).execute()

    else:
        # Event image generation
        category: str = args.get("category", "inne")
        description: str = args.get("description", "")

        logger.info("Generating event image for '%s' (id=%s, category=%s)", title, item_id, category)

        temp_url = generate_event_image(
            title=title,
            category=category,
            description=description,
        )

        db = database.get_client()
        public_url = upload_from_url(db, temp_url, item_id, category=category)

        table_name = "scraped_events" if target == "scraped" else "events"
        db.table(table_name).update({"image_url": public_url}).eq("id", item_id).execute()

    logger.info("Image saved for %s: %s", item_id, public_url)
    print(json.dumps({"ok": True, "image_url": public_url}))


if __name__ == "__main__":
    main()
