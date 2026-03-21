"""
Confidence scoring: combines LLM field_confidence with validation penalties.
"""

from __future__ import annotations

from backend.models import ValidationError

# Weight per field — higher weight = more impact on overall score
FIELD_WEIGHTS: dict[str, float] = {
    "title": 3.0,
    "start_at": 3.0,
    "venue_name": 2.0,
    "description_short": 1.0,
    "age_min": 1.0,
    "price_from": 1.0,
    "district": 1.0,
    "categories": 1.0,
    "organizer_name": 0.5,
}

ERROR_PENALTY = 0.15
WARNING_PENALTY = 0.05


def compute_score(event: dict, validation_errors: list[ValidationError]) -> float:
    """Compute final confidence score (0.0–1.0)."""
    field_conf = event.get("field_confidence", {})

    weighted_sum = 0.0
    weight_total = 0.0

    for field, weight in FIELD_WEIGHTS.items():
        # Use LLM's field confidence if available,
        # 0.5 if field has a value but no confidence,
        # 0.0 if field is missing
        if field in field_conf and field_conf[field] is not None:
            conf = field_conf[field]
        elif event.get(field) is not None:
            conf = 0.5
        else:
            conf = 0.0

        weighted_sum += conf * weight
        weight_total += weight

    base_score = weighted_sum / weight_total if weight_total > 0 else 0.0

    # Apply penalties for validation errors
    n_errors = sum(1 for e in validation_errors if e.severity == "error")
    n_warnings = sum(1 for e in validation_errors if e.severity == "warning")
    penalty = n_errors * ERROR_PENALTY + n_warnings * WARNING_PENALTY

    final = max(0.0, min(1.0, base_score - penalty))
    return round(final, 2)
