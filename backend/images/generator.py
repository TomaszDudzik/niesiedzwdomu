"""
Image generation for events using OpenAI.

Categories with a base image (e.g. warsztaty.png) use GPT-4o image generation
to create a new version of the scene with event-specific items added.
Other categories use DALL-E 3 to generate from scratch.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path

from openai import OpenAI
from PIL import Image

from backend.config import config

logger = logging.getLogger(__name__)

# Directory containing base images
BASES_DIR = Path(__file__).parent

# ── Base scenes per category ────────────────────────────────────────
# Used only for categories WITHOUT a base image (full generation).

CATEGORY_SCENES: dict[str, str] = {
    "spektakl": (
        "A natural, realistic theater scene with a large stage as the main focus, "
        "viewed from the audience perspective at a slight eye-level angle (matching the reference image). "
        "The stage fills most of the frame, with rich red velvet curtains and warm theatrical lighting. "
        "Soft, diffused spotlights shine from above, creating gentle highlights and shadows on the stage floor. "
        "On the stage, a small number of clearly visible, well-defined elements are placed as the main focal point: {details}. "
        "These objects are sharp, detailed, and visually prominent, arranged neatly in the center with space around them. "
        "At the very bottom edge of the frame, a single row of seated children is visible from behind, softly out of focus. "
        "They remain unchanged and are not the focus of the image. "
        "No faces, no readable text, no logos. "
        "No clutter or excessive props — only a few key elements on stage. "
        "Calm, magical, theatrical atmosphere. "
        "Realistic photography style, warm tones, soft lighting, 16:9 composition."
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
        "A natural, realistic indoor sports scene with a large gym floor as the main focus, "
        "viewed from a slightly low eye-level perspective facing the center of the court (matching the reference image). "
        "The polished wooden floor fills most of the frame, with subtle court markings and soft reflections. "
        "In the background, dark empty bleachers are visible, softly lit and slightly out of focus. "
        "Bright overhead sports lights shine from above, creating clear highlights and gentle shadows on the floor. "

        "At the center of the court, a small number of clearly visible, well-defined sports-related elements are placed as the main focal point: {details}. "
        "These objects are sharp, realistic, and properly scaled, arranged neatly in the center with space around them. "

        "The elements should feel naturally placed on the court, as if prepared for an activity or training session. "

        "No people, no faces, no text, no logos. "
        "No clutter or excessive equipment — only a few key elements. "
        "Clean, energetic, modern sports atmosphere. "
        "Realistic photography style, neutral tones with slight cool lighting, 16:9 composition."
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

    # Build the prompt based on category
    event_info = f"Event: {title}"
    if description:
        event_info += f"\nDescription: {description[:300]}"

    if category == "spektakl":
        prompt = (
            f"On this theater stage, create a scene related to this event:\n\n"
            f"{event_info}\n\n"
            f"Place props, set pieces, and decorations on the stage that represent the performance. "
            f"Include colorful elements like puppets, scenery backdrops, or theatrical props. "
            f"The stage should look ready for a children's show — vibrant and magical. "
            f"Match the existing theatrical lighting (warm spotlights, red curtains). "
            f"No people, no faces, no text. "
            f"Realistic photography style."
        )
    elif category == "sport":
        prompt = (
            f"On this indoor sports court, create a scene related to this event:\n\n"
            f"{event_info}\n\n"
            f"Place a focused set of sports-related objects on the gym floor. "
            f"Use a realistic mix of larger and smaller items such as balls, cones, mats, rackets, bibs, or training props. "
            f"Arrange them naturally in the center of the court, with enough space around them so they stay clearly visible. "
            f"Keep the dark bleachers in the background unchanged and slightly out of focus. "
            f"Match the existing cool indoor sports lighting, floor reflections, and perspective. "
            f"No people, no hands, no faces, no text, no logos. "
            f"Realistic photography style."
        )
    else:
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

    # Ensure mask matches base image dimensions
    base_img = Image.open(base_path).convert("RGBA")
    mask_img = Image.open(mask_path).convert("RGBA")
    if mask_img.size != base_img.size:
        logger.info("Resizing mask from %s to %s", mask_img.size, base_img.size)
        mask_img = mask_img.resize(base_img.size, Image.LANCZOS)

    base_buf = io.BytesIO()
    base_img.save(base_buf, format="PNG")
    base_buf.seek(0)

    mask_buf = io.BytesIO()
    mask_img.save(mask_buf, format="PNG")
    mask_buf.seek(0)

    response = client.images.edit(
        model="gpt-image-1",
        image=("image.png", base_buf, "image/png"),
        mask=("mask.png", mask_buf, "image/png"),
        prompt=prompt,
        n=1,
        size="1536x1024",
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


# ── Place image generation ──────────────────────────────────────────

PLACE_STYLE = (
    "Watercolor illustration style, soft and warm. "
    "No people, no faces, no text, no logos. "
    "Clean composition with a clear focal point. "
    "Soft natural lighting, warm inviting tones. "
    "Suitable as a website thumbnail for a family-friendly place."
)

PLACE_SCENE_PROMPT = """\
You are a visual scene designer for a family places guide in Kraków, Poland.

Given a place name and description, create a short (2-3 sentences) visual scene \
description for an illustrator. Focus on:
- The most iconic or recognizable visual element of this place
- The setting, architecture, or landscape
- The atmosphere and mood

Rules:
- Be SPECIFIC to this place — capture what makes it unique
- Focus on the building, landscape, or key visual feature
- No people, no faces
- Include Kraków architectural elements if relevant
- Output ONLY the scene description, nothing else
"""


def generate_place_image(
    title: str,
    description_short: str = "",
    description_long: str = "",
    size: str = "1792x1024",
    quality: str = "standard",
) -> str:
    """Generate an illustration for a place using DALL-E 3."""
    client = OpenAI(api_key=config.openai_api_key)

    # Build context for GPT
    user_content = f"Place: {title}"
    if description_short:
        user_content += f"\nShort: {description_short}"
    if description_long:
        user_content += f"\nDetails: {description_long[:300]}"

    # Step 1: GPT creates a scene description
    scene_resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": PLACE_SCENE_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.7,
        max_tokens=150,
    )
    scene = scene_resp.choices[0].message.content or f"A family-friendly place: {title}"
    logger.info("Place scene for '%s': %s", title, scene)

    # Step 2: Generate with DALL-E 3
    dalle_prompt = f"{scene}\n\nStyle: {PLACE_STYLE}"
    logger.info("Generating place image for: %s", title)

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
            logger.warning("Place prompt rejected, retrying with fallback")
            response = client.images.generate(
                model="dall-e-3",
                prompt=f"A warm watercolor illustration of a family-friendly attraction in Kraków. {PLACE_STYLE}",
                n=1,
                size=size,
                quality=quality,
            )
        else:
            raise

    image_url = response.data[0].url
    logger.info("Place image generated: %s...", image_url[:80])
    return image_url
