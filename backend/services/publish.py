"""
Publish service: routing decisions and expiration logic.
"""

from __future__ import annotations

from backend.config import config
from backend.models import ValidationError


def route_event(
    score: float,
    validation_errors: list[ValidationError],
    has_duplicates: bool,
    source_total_pushed: int,
) -> str:
    """Decide where a newly extracted event should go.
    Returns one of: 'published', 'review', 'rejected'.
    """
    has_errors = any(e.severity == "error" for e in validation_errors)
    is_trusted_source = source_total_pushed >= config.new_source_trust_min

    # Always review if there are hard errors, duplicates, or untrusted source
    if has_errors or has_duplicates or not is_trusted_source:
        return "review"

    if score >= config.auto_publish_threshold:
        return "published"

    if score >= config.review_threshold:
        return "review"

    return "rejected"
