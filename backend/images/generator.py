"""
Image generation for events using OpenAI.

Two-step approach:
  1. GPT-4o-mini creates a specific scene description from the event data
  2. DALL-E 3 generates the image from that scene

This produces unique, event-specific images instead of generic category illustrations.
"""

from __future__ import annotations

import logging

from openai import OpenAI

from backend.config import config

logger = logging.getLogger(__name__)

SCENE_SYSTEM_PROMPT = """\
You are a visual scene designer for a family events website in Kraków, Poland.

Given an event title and description, create a short (2-3 sentences) visual scene description for an illustrator. Focus on:
- What specific activity or moment to depict (derived from the event content)
- The setting/environment (indoor/outdoor, what kind of space)
- The mood and atmosphere

Rules:
- Be SPECIFIC to this particular event — no generic scenes
- Focus on the unique aspect that makes this event different from others
- Include Kraków elements if relevant (architecture, parks, landmarks)
- Describe people doing the activity, not standing around
- No text, logos, or branding in the scene
- Suitable for families — warm, inviting, not childish\
"""

DALLE_STYLE = (
    "Modern editorial illustration style, slightly textured, warm color palette. "
    "No text or letters anywhere in the image. "
    "Clean composition suitable for a website card thumbnail. "
    "16:9 aspect ratio. Soft natural lighting."
)


def generate_event_image(
    title: str,
    category: str = "inne",
    description: str = "",
    size: str = "1792x1024",
    quality: str = "standard",
) -> str:
    """Generate a unique image for an event using GPT + DALL-E 3.

    Step 1: GPT creates a specific scene description from event data
    Step 2: DALL-E generates the image from that scene

    Cost: ~$0.08-0.09 per image ($0.00 for GPT-4o-mini + $0.08 for DALL-E)
    """
    client = OpenAI(api_key=config.openai_api_key)

    # Step 1: Generate scene description with GPT
    scene = _create_scene_description(client, title, category, description)
    logger.info(f"Scene for '{title}': {scene}")

    # Step 2: Generate image with DALL-E
    dalle_prompt = f"{scene}\n\nStyle: {DALLE_STYLE}"

    logger.info(f"Generating image for: {title}")
    response = client.images.generate(
        model="dall-e-3",
        prompt=dalle_prompt,
        n=1,
        size=size,
        quality=quality,
    )

    image_url = response.data[0].url
    logger.info(f"Image generated: {image_url[:80]}...")
    return image_url


def _create_scene_description(
    client: OpenAI, title: str, category: str, description: str,
) -> str:
    """Use GPT to create a specific visual scene from event data."""
    user_content = f"Event: {title}\nCategory: {category}"
    if description:
        user_content += f"\nDescription: {description[:300]}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SCENE_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.7,
        max_tokens=150,
    )

    return response.choices[0].message.content or f"A family event scene: {title}"
