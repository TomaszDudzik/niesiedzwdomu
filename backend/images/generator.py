"""
Image generation for events using OpenAI.

Categories with a base image (e.g. warsztaty.png) use GPT-4o image generation
to create a new version of the scene with event-specific items added.
Other categories use DALL-E 3 to generate from scratch.
"""

from __future__ import annotations

import logging
from pathlib import Path

from openai import OpenAI

from backend.config import config

logger = logging.getLogger(__name__)

# Directory containing base images
BASES_DIR = Path(__file__).parent

# ── Base scenes per category ────────────────────────────────────────
# Used only for categories WITHOUT a base image (full generation).

CATEGORY_SCENES: dict[str, str] = {
    "spektakl": (
        "A warm theater stage seen from the audience perspective. "
        "Rows of children and parents sit in soft red seats, watching the performance. "
        "On stage: {details}. "
        "Warm spotlight illuminates the stage, the audience is in soft shadow."
    ),
    "warsztaty": (
        "A natural, realistic scene with a warm wooden table as the main focus, viewed from a slightly angled top-down perspective (not perfectly flat). "
        "The table fills most of the frame and shows natural wood texture and subtle imperfections. "
        "Soft warm sunlight falls across the table, creating gentle shadows. "
        "On the table, a small number of neatly arranged objects related to the event are visible: {details}. "
        "The objects are placed loosely in the center with plenty of empty space around them. "
        "A subtle hint of a chair or seat edge is visible at the side of the table, partially cropped and out of focus. "
        "No people, no hands, no faces. "
        "No clutter or additional furniture beyond the minimal hint of seating. "
        "Calm, cozy, lived-in atmosphere, natural lighting, warm tones."
    ),
    "muzyka": (
        "A lively concert scene in an intimate venue. "
        "On a small stage: {details}. "
        "Families sit on blankets or chairs, children clap and dance. "
        "Colorful stage lights and a joyful atmosphere."
    ),
    "sport": (
        "An outdoor sports activity in a green park setting. "
        "Children and parents are actively engaged in {details}. "
        "Trees and grass surround the area, sunny weather. "
        "Energy and movement fill the scene."
    ),
    "natura": (
        "A family nature outing in a beautiful green setting. "
        "Children explore and discover: {details}. "
        "Lush trees, flowers, and a path winding through nature. "
        "Golden hour light, peaceful and curious atmosphere."
    ),
    "edukacja": (
        "A bright educational space with engaged children. "
        "The activity: {details}. "
        "Interactive displays, books, or experiments on tables. "
        "A modern, welcoming classroom or museum interior."
    ),
    "festyn": (
        "A colorful outdoor festival in a town square or park. "
        "Stalls, decorations, and families enjoying: {details}. "
        "Bunting flags, food stands, and happy crowds. "
        "Bright daylight, festive and cheerful energy."
    ),
    "kino": (
        "A cozy cinema screening room with families settled in. "
        "The big screen glows with: {details}. "
        "Children sit with popcorn, eyes wide with wonder. "
        "Dim ambient light, comfortable seats, magical atmosphere."
    ),
    "wystawa": (
        "A bright gallery or museum space with families exploring. "
        "On display: {details}. "
        "Children point and look up at exhibits, parents explain. "
        "Clean white walls, modern display lighting, spacious."
    ),
    "inne": (
        "A family-friendly event in Kraków. "
        "The scene shows: {details}. "
        "Families with children participate together. "
        "Warm, inviting atmosphere with a Kraków cityscape hint in the background."
    ),
}

DALLE_STYLE = (
    "Realistic photography style. "
    "No clutter, limited number of objects. "
    "No people, no hands, no faces. "
    "Clean composition, soft natural lighting, warm tones. "
    "The image should be simple, clear, and focused on the objects on the table. "
    "16:9 aspect ratio."
    "Use soft shadows and natural imperfections, like a real photograph."
)

FALLBACK_PROMPT = "Clean composition. No text, no faces, no full figures. "

FILL_SYSTEM_PROMPT = """\
You are a poster-style designer for a family events website.

Given an event title, category, and optional description, create a poster.
No text, no faces, no full figures.
"""


def _has_base_image(category: str) -> bool:
    """Check if a category has a base image + mask pair."""
    return (
        (BASES_DIR / f"{category}.png").exists()
        and (BASES_DIR / f"{category}_mask.png").exists()
    )


def generate_event_image(
    title: str,
    category: str = "inne",
    description: str = "",
    size: str = "1792x1024",
    quality: str = "standard",
) -> str:
    """Generate an event image.

    If the category has a base image (e.g. warsztaty.png), uses GPT-4o
    to generate a new image based on the reference photo with event items added.
    Otherwise, generates from scratch with DALL-E 3.
    """
    client = OpenAI(api_key=config.openai_api_key)

    if _has_base_image(category):
        return _generate_with_reference(client, title, category, description)
    else:
        return _generate_from_scratch(client, title, category, description, size, quality)


def _generate_with_reference(
    client: OpenAI, title: str, category: str, description: str,
) -> str:
    """Use gpt-image-1 edit API with a base image.

    Sends the base image + mask to the edit API which fills in
    event-specific items on the table while keeping the rest intact.
    """
    base_path = BASES_DIR / f"{category}.png"
    mask_path = BASES_DIR / f"{category}_mask.png"

    logger.info("Using base image for '%s': %s", category, base_path.name)

    # Build the prompt
    event_info = f"Event: {title}"
    if description:
        event_info += f"\nDescription: {description[:300]}"

    prompt = (
        f"On this wooden table, arrange a rich spread of objects "
        f"related to this event:\n\n"
        f"{event_info}\n\n"
        f"Place 6-10 varied objects across the table, filling most of the surface. "
        f"Mix larger items with smaller details — tools, materials, decorations. "
        f"Some items can overlap slightly or be grouped together naturally. "
        f"The table should look actively used and inviting, not empty. "
        f"Match the existing warm lighting and perspective. "
        f"No people, no hands, no faces, no text. "
        f"Realistic photography style."
    )

    logger.info("Generating image with edit for: %s", title)

    # Open files for the API
    with open(base_path, "rb") as img_file, open(mask_path, "rb") as mask_file:
        response = client.images.edit(
            model="gpt-image-1",
            image=img_file,
            mask=mask_file,
            prompt=prompt,
            n=1,
            size="1536x1024",
            quality="medium",
        )

    # gpt-image-1 returns b64_json by default
    result = response.data[0]
    if result.url:
        logger.info("Image edited: %s...", result.url[:80])
        return result.url
    elif result.b64_json:
        logger.info("Image edited (base64, %d chars)", len(result.b64_json))
        return f"data:image/png;base64,{result.b64_json}"

    raise RuntimeError("gpt-image-1 did not return an image")


def _generate_from_scratch(
    client: OpenAI, title: str, category: str, description: str,
    size: str, quality: str,
) -> str:
    """Generate a full image from scratch with DALL-E 3."""
    details = _fill_details(client, title, category, description)
    logger.info("Details for '%s': %s", title, details)

    template = CATEGORY_SCENES.get(category, CATEGORY_SCENES["inne"])
    scene = template.format(details=details, category=category)
    logger.info("Scene for '%s': %s", title, scene)

    dalle_prompt = f"{scene}\n\nStyle: {DALLE_STYLE}"

    logger.info("Generating image for: %s", title)
    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=dalle_prompt,
            n=1,
            size=size,
            quality=quality,
        )
    except Exception as e:
        if "content_policy_violation" in str(e):
            logger.warning("Scene prompt rejected by DALL-E, retrying with fallback")
            response = client.images.generate(
                model="dall-e-3",
                prompt=FALLBACK_PROMPT,
                n=1,
                size=size,
                quality=quality,
            )
        else:
            raise

    image_url = response.data[0].url
    logger.info("Image generated: %s...", image_url[:80])
    return image_url


def _fill_details(
    client: OpenAI, title: str, category: str, description: str = "",
) -> str:
    """Use GPT to extract a short visual detail phrase from event data."""
    user_content = f"Event: {title}\nCategory: {category}"
    if description:
        user_content += f"\nDescription: {description[:300]}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": FILL_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.7,
        max_tokens=100,
    )

    return response.choices[0].message.content or title
