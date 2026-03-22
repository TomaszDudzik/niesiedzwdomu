"""
Pydantic models for the extraction pipeline.
These define the shape of data flowing through each stage.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ExtractedEvent(BaseModel):
    """Schema returned by the LLM or rule-based extractor.
    Also serves as the JSON schema for OpenAI structured outputs."""

    title: str
    subtitle: str | None = None
    description_short: str | None = None
    description_long: str | None = None
    start_at: str | None = None            # ISO 8601
    end_at: str | None = None              # ISO 8601
    date_text_raw: str | None = None       # original date string from page
    is_recurring: bool = False
    recurrence_text: str | None = None
    age_min: int | None = None
    age_max: int | None = None
    price_from: float | None = None
    price_to: float | None = None
    currency: str = "PLN"
    is_free: bool | None = None
    price_text_raw: str | None = None
    venue_name: str | None = None
    venue_address: str | None = None
    district: str | None = None
    city: str = "Kraków"
    organizer_name: str | None = None
    image_url: str | None = None
    detail_url: str | None = None          # link to full event page
    categories: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    registration_url: str | None = None
    source_url: str | None = None
    extraction_notes: str | None = None
    field_confidence: dict[str, float | None] = Field(default_factory=dict)
    overall_confidence: float = 0.0


class ExtractionResult(BaseModel):
    """Wrapper for LLM output — may contain multiple events from one page."""
    events: list[ExtractedEvent]


class ValidationError(BaseModel):
    field: str
    rule: str
    severity: str   # 'error' | 'warning'
    message: str


class DuplicateCandidate(BaseModel):
    event_id: str
    similarity: float
    match_type: str  # 'exact_url' | 'fingerprint' | 'fuzzy'
