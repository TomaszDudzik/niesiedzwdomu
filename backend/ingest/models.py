"""Event data model — the single output type for the entire pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class ShowDate:
    """A single date/time for an event (one event can have many)."""
    date: str = ""          # e.g. "26.04.2026"
    time: str = ""          # e.g. "10:00"
    venue_name: str = ""    # e.g. "NCK, Nowohuckie Centrum Kultury - Scena NCK"
    city: str = ""          # e.g. "Kraków"
    price: str = ""         # e.g. "51,65 zł"
    tickets_available: str = ""  # e.g. "356"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class EventData:
    source: str = ""
    listing_url: str = ""
    detail_url: str = ""
    title: str = ""
    description_short: str = ""
    description_long: str = ""
    start_at_raw: str = ""
    end_at_raw: str = ""
    venue_name: str = ""
    venue_address: str = ""
    city: str = ""
    price: str = ""
    currency: str = "PLN"
    image_url: str = ""
    categories: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    contact_email: str = ""
    contact_phone: str = ""
    dates: list[ShowDate] = field(default_factory=list)
    confidence: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
