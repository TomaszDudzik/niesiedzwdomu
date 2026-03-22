"""
Per-source scrapers.

Each scraper is a Python module with a `scrape(html, base_url) -> list[dict]` function.
The dict should match the ExtractedEvent fields.

Register scrapers in registry.py by mapping source name to scraper module.
If no scraper is registered, falls back to LLM extraction.
"""
