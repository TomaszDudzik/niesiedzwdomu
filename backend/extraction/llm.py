"""
LLM-based event extractor using OpenAI.
Uses gpt-4o-mini by default (cheap & fast), falls back to gpt-4o on failure.

Uses response_format=json_object (not strict json_schema) because our schema
includes field_confidence with dynamic keys, which strict mode doesn't support.
The system prompt enforces the exact shape; Pydantic validates the output.
"""

from __future__ import annotations

import json
import logging

from openai import OpenAI

from backend.config import config
from backend.models import ExtractedEvent, ExtractionResult
from backend.extraction.prompts import get_system_prompt, make_user_prompt

logger = logging.getLogger(__name__)


def extract_events(
    cleaned_text: str,
    source_url: str,
    pre_filtered: bool = False,
    extraction_instructions: str | None = None,
) -> list[ExtractedEvent]:
    """Extract structured events from cleaned page text using OpenAI.

    Args:
        pre_filtered: If True, source is already kids/family-only.
        extraction_instructions: Custom per-source instructions appended to prompt.
    """
    client = OpenAI(api_key=config.openai_api_key)
    system_prompt = get_system_prompt(
        pre_filtered=pre_filtered,
        extraction_instructions=extraction_instructions,
    )
    user_prompt = make_user_prompt(cleaned_text, source_url)

    # Try primary model first, fallback on failure
    for model in [config.openai_model, config.openai_model_fallback]:
        try:
            return _call_openai(client, model, system_prompt, user_prompt)
        except Exception as e:
            logger.warning(f"Extraction failed with {model}: {e}")
            if model == config.openai_model_fallback:
                raise

    return []  # unreachable, but makes type checker happy


def _call_openai(
    client: OpenAI, model: str, system_prompt: str, user_prompt: str,
) -> list[ExtractedEvent]:
    """Single OpenAI API call with JSON output mode."""
    logger.info(f"Calling OpenAI {model} for extraction")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=8192,
    )

    content = response.choices[0].message.content
    if not content:
        logger.error("Empty response from OpenAI")
        return []

    raw = json.loads(content)

    # Handle both {"events": [...]} and [...] formats
    if isinstance(raw, list):
        raw = {"events": raw}
    elif "events" not in raw:
        # Single event returned as top-level object
        raw = {"events": [raw]}

    result = ExtractionResult.model_validate(raw)

    logger.info(f"Extracted {len(result.events)} events")
    return result.events
