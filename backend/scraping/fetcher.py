"""
Page fetcher: downloads HTML via requests or Playwright.
"""

from __future__ import annotations

import logging
import random
from dataclasses import dataclass

import requests

from backend.config import config

logger = logging.getLogger(__name__)


@dataclass
class FetchResult:
    url: str
    html: str
    status_code: int


def fetch_page(url: str, method: str = "requests") -> FetchResult:
    """Fetch a single page. Falls back to Playwright when method='playwright'."""
    if method == "playwright":
        return _fetch_playwright(url)
    return _fetch_requests(url)


def _fetch_requests(url: str) -> FetchResult:
    ua = random.choice(config.user_agents)
    headers = {"User-Agent": ua, "Accept-Language": "pl,en;q=0.5"}

    for attempt in range(1 + config.max_retries):
        try:
            # verify=False as fallback for Windows SSL cert issues
            # Safe for scraping public pages — not handling sensitive data
            resp = requests.get(url, headers=headers, timeout=config.fetch_timeout, verify=True)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding  # handle Polish chars
            return FetchResult(url=url, html=resp.text, status_code=resp.status_code)
        except requests.exceptions.SSLError:
            logger.warning(f"SSL error for {url}, retrying without verification")
            resp = requests.get(url, headers=headers, timeout=config.fetch_timeout, verify=False)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding
            return FetchResult(url=url, html=resp.text, status_code=resp.status_code)
        except requests.RequestException as e:
            if attempt < config.max_retries:
                logger.warning(f"Fetch attempt {attempt + 1} failed for {url}: {e}")
                continue
            raise


def _fetch_playwright(url: str) -> FetchResult:
    """Fetch using Playwright for JS-rendered pages."""
    # Import lazily — Playwright is heavy and not needed for static pages
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(user_agent=random.choice(config.user_agents))
        try:
            response = page.goto(url, wait_until="networkidle", timeout=config.fetch_timeout * 1000)
            html = page.content()
            status = response.status if response else 0
            return FetchResult(url=url, html=html, status_code=status)
        finally:
            browser.close()
