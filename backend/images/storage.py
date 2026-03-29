"""
Upload images to Supabase Storage and update event records.

Supabase Storage setup required (one-time, in dashboard):
  1. Go to Storage in Supabase dashboard
  2. Create a bucket called "event-images"
  3. Set it to Public
  4. Add policy: allow public SELECT (read)
"""

from __future__ import annotations

import base64
import hashlib
import logging
from io import BytesIO

import requests
from PIL import Image, ImageDraw, ImageFont

from backend import db as database

logger = logging.getLogger(__name__)

BUCKET_NAME = "event-images"

# Category display names (Polish, capitalized)
CATEGORY_LABELS: dict[str, str] = {
    "warsztaty": "Warsztaty",
    "spektakl": "Spektakl",
    "muzyka": "Muzyka",
    "sport": "Sport",
    "natura": "Natura",
    "edukacja": "Edukacja",
    "festyn": "Festyn",
    "kino": "Kino",
    "wystawa": "Wystawa",
    "inne": "Inne",
}


def _crop_to_card(image_bytes: bytes, target_ratio: float = 3 / 2) -> bytes:
    """Crop image to match the card aspect ratio (3:2) by trimming top/bottom."""
    img = Image.open(BytesIO(image_bytes))
    w, h = img.size
    current_ratio = w / h

    if abs(current_ratio - target_ratio) < 0.01:
        return image_bytes  # already the right ratio

    if current_ratio < target_ratio:
        # Image is too tall — crop top and bottom
        new_h = int(w / target_ratio)
        offset = (h - new_h) // 2
        img = img.crop((0, offset, w, offset + new_h))
    else:
        # Image is too wide — crop left and right
        new_w = int(h * target_ratio)
        offset = (w - new_w) // 2
        img = img.crop((offset, 0, offset + new_w, h))

    out = BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


def _add_category_tab(image_bytes: bytes, category: str) -> bytes:
    """Overlay a category tab in the top-left corner of the image."""
    label = CATEGORY_LABELS.get(category, category.capitalize())

    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    w, h = img.size

    # Scale font size relative to image height
    font_size = max(24, h // 20)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except OSError:
        font = ImageFont.load_default(size=font_size)

    # Measure text
    temp_draw = ImageDraw.Draw(img)
    bbox = temp_draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    # Tab dimensions
    pad_x = int(font_size * 0.7)
    pad_y = int(font_size * 0.35)
    tab_w = text_w + 2 * pad_x
    tab_h = text_h + 2 * pad_y

    # Draw semi-transparent rounded tab
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    margin = int(font_size * 0.4)
    radius = int(font_size * 0.3)
    draw.rounded_rectangle(
        [margin, margin, margin + tab_w, margin + tab_h],
        radius=radius,
        fill=(0, 0, 0, 160),
    )

    # Draw text
    text_x = margin + pad_x
    text_y = margin + pad_y - bbox[1]  # offset for font baseline
    draw.text((text_x, text_y), label, fill=(255, 255, 255, 240), font=font)

    # Composite
    img = Image.alpha_composite(img, overlay)
    img = img.convert("RGB")

    out = BytesIO()
    img.save(out, format="PNG", quality=95)
    return out.getvalue()


def upload_from_url(
    db, image_url: str, event_id: str,
    filename: str | None = None, category: str | None = None,
) -> str:
    """Download image from URL, add category tab, upload to Supabase Storage.

    Returns:
        Public URL of the uploaded image.
    """
    # Get image bytes — from data URI (base64) or HTTP URL
    if image_url.startswith("data:"):
        # data:image/png;base64,<data>
        b64_data = image_url.split(",", 1)[1]
        image_bytes = base64.b64decode(b64_data)
    else:
        resp = requests.get(image_url, timeout=30)
        resp.raise_for_status()
        image_bytes = resp.content

    # Crop to 3:2 to match card aspect ratio
    image_bytes = _crop_to_card(image_bytes)

    # Generate filename from event_id if not provided
    if not filename:
        ext = "png"
        if not category and not image_url.startswith("data:"):
            if "jpeg" in resp.headers.get("content-type", "") or "jpg" in image_url:
                ext = "jpg"
        filename = f"{event_id}.{ext}"

    file_path = f"events/{filename}"
    content_type = "image/png" if filename.endswith(".png") else "image/jpeg"

    # Remove existing files for this event (both extensions)
    db.storage.from_(BUCKET_NAME).remove([
        f"events/{event_id}.png",
        f"events/{event_id}.jpg",
    ])

    # Upload to Supabase Storage
    result = db.storage.from_(BUCKET_NAME).upload(
        file_path,
        image_bytes,
        {"content-type": content_type},
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

    # Upload to permanent storage (with category tab)
    public_url = upload_from_url(db, temp_url, event_id, category=category)

    # Update the canonical event record
    db.table("events").update({"image_url": public_url}).eq("id", event_id).execute()

    logger.info(f"Event {event_id} image saved: {public_url}")
    return public_url
