"""Thin fetch wrapper: retry with backoff, polite delay, logging."""

from __future__ import annotations

import logging
import random
import time

import requests

from backend.config import config

logger = logging.getLogger(__name__)

_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pl,en;q=0.5",
}

# Minimum seconds between consecutive requests to the same domain
POLITE_DELAY = 1.0


def fetch(url: str, *, retries: int = 2, timeout: int | None = None) -> str:
    """Fetch *url* and return decoded HTML.

    Raises ``requests.RequestException`` after all retries fail.
    """
    timeout = timeout or config.fetch_timeout
    headers = {**_HEADERS, "User-Agent": random.choice(config.user_agents)}

    last_err: Exception | None = None
    for attempt in range(1 + retries):
        try:
            resp = requests.get(url, headers=headers, timeout=timeout, verify=True)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding
            return resp.text
        except requests.exceptions.SSLError:
            logger.warning("SSL error for %s – retrying without verify", url)
            resp = requests.get(url, headers=headers, timeout=timeout, verify=False)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding
            return resp.text
        except requests.RequestException as exc:
            last_err = exc
            if attempt < retries:
                wait = 2 ** attempt + random.random()
                logger.warning("Attempt %d failed for %s: %s – retry in %.1fs", attempt + 1, url, exc, wait)
                time.sleep(wait)

    raise last_err  # type: ignore[misc]


def polite_sleep() -> None:
    """Call between requests to be polite to the target server."""
    time.sleep(POLITE_DELAY)
