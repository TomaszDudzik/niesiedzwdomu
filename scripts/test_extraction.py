"""
Quick test script: extract events from a single URL.
Usage: python scripts/test_extraction.py <url>

Useful for validating LLM extraction on a new source before adding it to the pipeline.
"""

from __future__ import annotations

import json
import sys
import os
from pathlib import Path

# Fix Windows console encoding for Polish characters
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Ensure project root is on sys.path so `backend` package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.scraping.fetcher import fetch_page
from backend.scraping.cleaner import clean_html
from backend.extraction.llm import extract_events
from backend.processing.normalizer import normalize
from backend.processing.validator import validate
from backend.processing.scorer import compute_score


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_extraction.py <url> [--playwright] [--pre-filtered]")
        sys.exit(1)

    url = sys.argv[1]
    method = "playwright" if "--playwright" in sys.argv else "requests"
    pre_filtered = "--pre-filtered" in sys.argv

    print(f"\n1. Fetching {url} via {method}...")
    result = fetch_page(url, method)
    print(f"   HTTP {result.status_code}, {len(result.html)} chars")

    print("\n2. Cleaning HTML...")
    cleaned = clean_html(result.html)
    print(f"   Cleaned text: {len(cleaned)} chars")
    print(f"   Preview: {cleaned[:300]}...")

    print("\n3. Extracting events via LLM...")
    events = extract_events(cleaned, url, pre_filtered=pre_filtered)
    print(f"   Found {len(events)} event(s)")

    for i, event in enumerate(events):
        print(f"\n{'='*60}")
        print(f"Event {i + 1}: {event.title}")
        print(f"{'='*60}")

        # Normalize
        normalized = normalize(event, source_url=url)

        # Validate
        errors = validate(normalized)
        score = compute_score(normalized, errors)

        print(f"  Confidence: {score}")
        print(f"  Validation errors: {len(errors)}")
        for err in errors:
            print(f"    [{err.severity}] {err.field}: {err.message}")

        print(f"\n  Normalized JSON:")
        # Print clean subset of fields
        display = {k: v for k, v in normalized.items()
                   if k not in ("extracted_data", "validation_errors") and v is not None}
        print(json.dumps(display, indent=2, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
