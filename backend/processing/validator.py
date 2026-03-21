"""
Validate normalized event data: syntactic, business, and temporal rules.
Returns a list of ValidationError objects.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.config import config
from backend.models import ValidationError


def validate(event: dict) -> list[ValidationError]:
    """Run all validation rules against a normalized event dict."""
    errors: list[ValidationError] = []

    # --- Syntactic ---
    if not event.get("title") or len(event["title"]) < 5:
        errors.append(ValidationError(
            field="title", rule="min_length",
            severity="error", message="Title is missing or too short (< 5 chars)",
        ))

    if event.get("title") and len(event["title"]) > 200:
        errors.append(ValidationError(
            field="title", rule="max_length",
            severity="warning", message="Title exceeds 200 chars",
        ))

    # --- Temporal ---
    now = datetime.now(timezone.utc)

    if event.get("start_at"):
        try:
            start = datetime.fromisoformat(event["start_at"])
            if start < now - timedelta(days=30):
                errors.append(ValidationError(
                    field="start_at", rule="past_event",
                    severity="error", message="Event start_at is more than 30 days in the past",
                ))
            if start > now + timedelta(days=365):
                errors.append(ValidationError(
                    field="start_at", rule="far_future",
                    severity="warning", message="Event start_at is more than 1 year away",
                ))
        except ValueError:
            errors.append(ValidationError(
                field="start_at", rule="invalid_date",
                severity="error", message="start_at is not a valid ISO datetime",
            ))
    else:
        errors.append(ValidationError(
            field="start_at", rule="required",
            severity="error", message="start_at is missing",
        ))

    if event.get("start_at") and event.get("end_at"):
        try:
            start = datetime.fromisoformat(event["start_at"])
            end = datetime.fromisoformat(event["end_at"])
            if end < start:
                errors.append(ValidationError(
                    field="end_at", rule="before_start",
                    severity="error", message="end_at is before start_at",
                ))
            if (end - start).days > 14:
                errors.append(ValidationError(
                    field="end_at", rule="too_long",
                    severity="warning", message="Event spans more than 14 days",
                ))
        except ValueError:
            pass

    # --- Price ---
    price_from = event.get("price_from")
    price_to = event.get("price_to")

    if price_from is not None and price_to is not None and price_from > price_to:
        errors.append(ValidationError(
            field="price_from", rule="price_range",
            severity="error", message="price_from > price_to",
        ))

    if price_from is not None and price_from > 500:
        errors.append(ValidationError(
            field="price_from", rule="high_price",
            severity="warning", message="Price exceeds 500 PLN — verify",
        ))

    if event.get("is_free") and price_from is not None and price_from > 0:
        errors.append(ValidationError(
            field="is_free", rule="free_but_priced",
            severity="error", message="is_free=true but price_from > 0",
        ))

    # --- Age ---
    age_min = event.get("age_min")
    age_max = event.get("age_max")

    if age_min is not None and age_max is not None and age_min > age_max:
        errors.append(ValidationError(
            field="age_min", rule="age_range",
            severity="error", message="age_min > age_max",
        ))

    # --- Location ---
    if event.get("city") and event["city"] != "Kraków":
        errors.append(ValidationError(
            field="city", rule="not_krakow",
            severity="error", message="Event is not in Kraków",
        ))

    if not event.get("venue_name") and not event.get("venue_address"):
        errors.append(ValidationError(
            field="venue_name", rule="no_location",
            severity="warning", message="No venue name or address provided",
        ))

    # --- Categories ---
    for cat in event.get("categories", []):
        if cat not in config.allowed_categories:
            errors.append(ValidationError(
                field="categories", rule="invalid_category",
                severity="warning", message=f"Unknown category: {cat}",
            ))

    return errors
