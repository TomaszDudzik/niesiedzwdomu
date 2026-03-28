"""
Geocode venue addresses using OpenStreetMap Nominatim (free, no API key needed).
"""

from __future__ import annotations

import logging
import time

import requests

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "rodzic-w-tarapatach/1.0"

# Cache to avoid re-geocoding the same address within a session
_cache: dict[str, tuple[float, float] | None] = {}


def geocode(address: str, city: str = "Kraków") -> tuple[float, float] | None:
    """Geocode an address to (lat, lng) using Nominatim.

    Returns None if the address cannot be geocoded.
    Respects Nominatim's 1 request/second rate limit.
    """
    if not address:
        return None

    # Add city if not already in the address
    full_address = address if city.lower() in address.lower() else f"{address}, {city}"

    if full_address in _cache:
        return _cache[full_address]

    try:
        # Rate limit: 1 req/sec for Nominatim
        time.sleep(1.1)

        resp = requests.get(
            NOMINATIM_URL,
            params={
                "q": full_address,
                "format": "json",
                "limit": 1,
                "countrycodes": "pl",
            },
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        resp.raise_for_status()
        results = resp.json()

        if results:
            lat = float(results[0]["lat"])
            lng = float(results[0]["lon"])
            logger.info("Geocoded '%s' -> (%s, %s)", full_address, lat, lng)
            _cache[full_address] = (lat, lng)
            return (lat, lng)

        logger.warning("No geocoding results for: %s", full_address)
        _cache[full_address] = None
        return None

    except Exception as e:
        logger.warning("Geocoding failed for '%s': %s", full_address, e)
        _cache[full_address] = None
        return None
