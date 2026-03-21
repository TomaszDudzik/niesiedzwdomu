"""
Upload images to Supabase Storage and update event records.

Supabase Storage setup required (one-time, in dashboard):
  1. Go to Storage in Supabase dashboard
  2. Create a bucket called "event-images"
  3. Set it to Public
  4. Add policy: allow public SELECT (read)
"""

from __future__ import annotations

import hashlib
import logging
from io import BytesIO

import requests

from backend import db as database

logger = logging.getLogger(__name__)

BUCKET_NAME = "event-images"


def upload_from_url(db, image_url: str, event_id: str, filename: str | None = None) -> str:
    """Download image from URL and upload to Supabase Storage.

    Returns:
        Public URL of the uploaded image.
    """
    # Download image
    resp = requests.get(image_url, timeout=30)
    resp.raise_for_status()
    image_bytes = resp.content

    # Generate filename from event_id if not provided
    if not filename:
        ext = "png"
        if "jpeg" in resp.headers.get("content-type", "") or "jpg" in image_url:
            ext = "jpg"
        filename = f"{event_id}.{ext}"

    file_path = f"events/{filename}"

    # Upload to Supabase Storage
    result = db.storage.from_(BUCKET_NAME).upload(
        file_path,
        image_bytes,
        {"content-type": resp.headers.get("content-type", "image/png")},
    )

    # Get public URL
    public_url = db.storage.from_(BUCKET_NAME).get_public_url(file_path)

    logger.info(f"Uploaded image: {public_url}")
    return public_url


def generate_and_save(db, event_id: str, title: str, category: str = "inne", description: str = "") -> str:
    """Generate image with DALL-E, upload to Supabase Storage, update event record.

    Returns:
        Public URL of the stored image.
    """
    from backend.images.generator import generate_event_image

    # Generate with DALL-E (returns temporary URL)
    temp_url = generate_event_image(title, category, description=description)

    # Upload to permanent storage
    public_url = upload_from_url(db, temp_url, event_id)

    # Update the canonical event record
    db.table("events").update({"image_url": public_url}).eq("id", event_id).execute()

    logger.info(f"Event {event_id} image saved: {public_url}")
    return public_url
