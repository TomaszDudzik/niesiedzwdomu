"""
Image generation for events using OpenAI.

Each category has a fixed base scene (e.g. spektakl = stage with audience).
GPT-4o-mini fills in event-specific details into that scene template.
DALL-E 3 generates the final image.
"""

from __future__ import annotations

import logging

from openai import OpenAI

from backend.config import config

logger = logging.getLogger(__name__)

# ── Base scenes per category ────────────────────────────────────────
# Each defines the fixed composition — GPT fills in the specifics.

CATEGORY_SCENES: dict[str, str] = {
    "spektakl": (
        "A warm theater stage seen from the audience perspective. "
        "Rows of children and parents sit in soft red seats, watching the performance. "
        "On stage: {details}. "
        "Warm spotlight illuminates the stage, the audience is in soft shadow."
    ),
    "warsztaty": (
        "A bright workshop table seen from above at an angle. "
        "Children's hands are busy working on {details}. "
        "Materials, tools, and colorful creations are spread across the table. "
        "A cozy indoor space with natural light from a window."
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
    "No text or letters anywhere in the image. "
    "Clean composition suitable for a website card thumbnail. "
    "16:9 aspect ratio. Soft natural lighting. "
    "Hand-painted illustration, slightly cartoonish but detailed. "
    "Storybook style, soft shading, warm tones, high detail, inviting and cheerful."
)

FILL_SYSTEM_PROMPT = """\
You are a visual scene designer. You will receive an event title, category, and description.

Your job: write a SHORT phrase (10-20 words) describing what SPECIFICALLY happens \
in this event — the concrete visual element that makes it unique.

Examples:
- "Świnka Peppa na scenie" → "colorful Peppa Pig puppet characters acting out a farm adventure"
- "Warsztaty ceramiczne" → "clay pottery pieces being shaped on small wheels, glazes in bright colors"
- "Koncert kołysanek" → "a guitarist and singer performing gentle lullabies with soft instruments"
- "Bieg rodzinny w Parku Jordana" → "families running together on a park trail, wearing race bibs"
- "Wystawa dinozaurów" → "life-size dinosaur models and fossils, children measuring against a T-Rex leg"

Rules:
- Be VISUAL and SPECIFIC — describe what an illustrator should draw
- Focus on the KEY element that makes this event different
- No generic descriptions like "people having fun" or "families enjoying"
- No text, logos, or branding elements
- Output ONLY the short phrase, nothing else\
"""


def generate_event_image(
    title: str,
    category: str = "inne",
    description: str = "",
    size: str = "1792x1024",
    quality: str = "standard",
) -> str:
    """Generate an image using category base scene + event-specific details.

    Step 1: GPT creates a short visual detail phrase from event data
    Step 2: Detail is inserted into the category's base scene template
    Step 3: DALL-E generates the image

    Cost: ~$0.08-0.09 per image
    """
    client = OpenAI(api_key=config.openai_api_key)

    # Step 1: Get event-specific visual details from GPT
    details = _fill_details(client, title, category, description)
    logger.info("Details for '%s': %s", title, details)

    # Step 2: Build scene from category template + details
    template = CATEGORY_SCENES.get(category, CATEGORY_SCENES["inne"])
    scene = template.format(details=details)
    logger.info("Scene for '%s': %s", title, scene)

    # Step 3: Generate image with DALL-E
    dalle_prompt = f"{scene}\n\nStyle: {DALLE_STYLE}"

    logger.info("Generating image for: %s", title)
    response = client.images.generate(
        model="dall-e-3",
        prompt=dalle_prompt,
        n=1,
        size=size,
        quality=quality,
    )

    image_url = response.data[0].url
    logger.info("Image generated: %s...", image_url[:80])
    return image_url


def _fill_details(
    client: OpenAI, title: str, category: str, description: str,
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
        max_tokens=60,
    )

    return response.choices[0].message.content or title
