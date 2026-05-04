#!/usr/bin/env python3
"""Copy text from one browser page into another on a fixed interval.

Example:
    python scripts/sync_browser_text.py \
        --source-url http://localhost:3000/admin/wydarzenia \
        --source-first-tile \
        --chat-url https://chatgpt.com/c/69f8e906-0278-83eb-bbb0-d88f185018ec \
        --connect-over-cdp

By default it launches a persistent Chromium profile so login sessions can be
reused between runs. It can also attach to already-open tabs via CDP.
The script copies only when the source text changes (unless --always-copy).
"""

from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from playwright.async_api import (
    Browser,
    BrowserContext,
    Error as PlaywrightError,
    Page,
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)

DEFAULT_CHAT_SELECTOR = "textarea, div[contenteditable='true'][role='textbox'], div[contenteditable='true']"
DEFAULT_INTERVAL_SECONDS = 120
DEFAULT_PROFILE_DIR = ".playwright-browser-sync"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Copy text from a source page into a target page every N seconds."
    )
    parser.add_argument("--source-url", required=True, help="URL with the source text.")
    parser.add_argument(
        "--source-selector",
        default="",
        help="CSS selector pointing to the source element.",
    )
    parser.add_argument(
        "--source-first-tile",
        action="store_true",
        help="Read text from the first visible tile/card-like element in main content.",
    )
    parser.add_argument(
        "--source-mode",
        choices=("auto", "text", "value"),
        default="auto",
        help="How to read the source element: auto, text, or value.",
    )
    parser.add_argument(
        "--chat-url",
        default="https://chatgpt.com/",
        help="Target URL that receives the copied text.",
    )
    parser.add_argument(
        "--chat-selector",
        default=DEFAULT_CHAT_SELECTOR,
        help="CSS selector for the target input area.",
    )
    parser.add_argument(
        "--interval-seconds",
        type=int,
        default=DEFAULT_INTERVAL_SECONDS,
        help=f"Polling interval in seconds (default: {DEFAULT_INTERVAL_SECONDS}).",
    )
    parser.add_argument(
        "--profile-dir",
        default=DEFAULT_PROFILE_DIR,
        help="Path to the persistent browser profile directory.",
    )
    parser.add_argument(
        "--connect-over-cdp",
        action="store_true",
        help="Attach to already-open Chromium/Chrome/Edge tabs via CDP.",
    )
    parser.add_argument(
        "--cdp-url",
        default="http://127.0.0.1:9222",
        help="CDP endpoint used when --connect-over-cdp is enabled.",
    )
    parser.add_argument(
        "--timeout-ms",
        type=int,
        default=30000,
        help="Timeout for waiting on selectors, in milliseconds.",
    )
    parser.add_argument(
        "--send",
        action="store_true",
        help="Press Enter after inserting text into the target field.",
    )
    parser.add_argument(
        "--start-immediately",
        action="store_true",
        help="Skip the manual confirmation step after opening both pages.",
    )
    parser.add_argument(
        "--always-copy",
        action="store_true",
        help="Copy on every interval, even if the source text is unchanged.",
    )
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="Allow empty source text to be pushed into the target field.",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run the browser in headless mode.",
    )
    return parser


async def read_source_text(page: Page, selector: str, mode: str, timeout_ms: int) -> str:
    locator = page.locator(selector).first
    await locator.wait_for(state="visible", timeout=timeout_ms)

    if mode == "value":
        return (await locator.input_value()).strip()

    if mode == "text":
        return (await locator.inner_text()).strip()

    meta = await locator.evaluate(
        """(element) => ({
            tagName: element.tagName.toLowerCase(),
            isContentEditable: element.isContentEditable
        })"""
    )

    if meta["tagName"] in {"input", "textarea"}:
        return (await locator.input_value()).strip()

    if meta["isContentEditable"]:
        text = await locator.evaluate("(element) => element.innerText || element.textContent || ''")
        return text.strip()

    return (await locator.inner_text()).strip()


async def read_first_tile_text(page: Page, timeout_ms: int) -> str:
    await page.wait_for_selector("main", state="visible", timeout=timeout_ms)
    text = await page.evaluate(
        """() => {
            const selectors = [
                'main [data-testid*="tile"]',
                'main [class*="tile"]',
                'main [class*="card"]',
                'main article',
                'main li',
                'main [role="article"]'
            ];

            const isVisible = (el) => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
            };

            for (const selector of selectors) {
                const elements = Array.from(document.querySelectorAll(selector));
                for (const el of elements) {
                    if (!isVisible(el)) {
                        continue;
                    }
                    const value = (el.innerText || el.textContent || '').trim();
                    if (value.length >= 20) {
                        return value;
                    }
                }
            }

            return '';
        }"""
    )
    return (text or "").strip()


async def write_target_text(page: Page, selector: str, text: str, timeout_ms: int, send: bool) -> None:
    locator = page.locator(selector).first
    await locator.wait_for(state="visible", timeout=timeout_ms)
    await locator.click()

    meta = await locator.evaluate(
        """(element) => ({
            tagName: element.tagName.toLowerCase(),
            isContentEditable: element.isContentEditable
        })"""
    )

    if meta["tagName"] in {"input", "textarea"}:
        await locator.fill(text)
    else:
        await page.keyboard.press("Control+A")
        await page.keyboard.insert_text(text)

    if send:
        await page.keyboard.press("Enter")


async def wait_for_user_confirmation() -> None:
    prompt = (
        "Zaloguj sie w otwartych kartach, ustaw poprawne widoki i nacisnij Enter, "
        "aby uruchomic kopiowanie co 2 minuty...\n"
    )
    await asyncio.to_thread(input, prompt)


def _url_matches(open_url: str, wanted_url: str) -> bool:
    open_norm = (open_url or "").strip().rstrip("/")
    wanted_norm = (wanted_url or "").strip().rstrip("/")
    return bool(open_norm) and bool(wanted_norm) and open_norm.startswith(wanted_norm)


async def _find_page_by_url(contexts: list[BrowserContext], wanted_url: str) -> Page | None:
    for context in contexts:
        for page in context.pages:
            if _url_matches(page.url, wanted_url):
                return page
    return None


async def _resolve_pages_with_cdp(browser: Browser, args: argparse.Namespace) -> tuple[Page, Page]:
    source_page = await _find_page_by_url(browser.contexts, args.source_url)
    target_page = await _find_page_by_url(browser.contexts, args.chat_url)

    if source_page is None or target_page is None:
        missing = []
        if source_page is None:
            missing.append(f"source: {args.source_url}")
        if target_page is None:
            missing.append(f"target: {args.chat_url}")
        missing_str = ", ".join(missing)
        raise RuntimeError(
            "Nie znaleziono otwartych kart dla URL: "
            f"{missing_str}. Upewnij sie, ze przegladarka jest uruchomiona z --remote-debugging-port=9222."
        )

    await source_page.bring_to_front()
    await target_page.bring_to_front()
    return source_page, target_page


async def run(args: argparse.Namespace) -> None:
    async with async_playwright() as playwright:
        browser: Browser | None = None
        context: BrowserContext | None = None

        if args.connect_over_cdp:
            try:
                browser = await playwright.chromium.connect_over_cdp(args.cdp_url)
            except PlaywrightError as exc:
                raise SystemExit(
                    "Brak polaczenia CDP. Uruchom Chrome/Edge z --remote-debugging-port=9222 i otworz docelowe karty.\n"
                    f"Szczegoly: {exc}"
                ) from exc
            source_page, target_page = await _resolve_pages_with_cdp(browser, args)
        else:
            profile_dir = Path(args.profile_dir).expanduser().resolve()
            profile_dir.mkdir(parents=True, exist_ok=True)
            context = await playwright.chromium.launch_persistent_context(
                user_data_dir=str(profile_dir),
                headless=args.headless,
            )
            source_page = await context.new_page()
            target_page = await context.new_page()
            await source_page.goto(args.source_url, wait_until="domcontentloaded")
            await target_page.goto(args.chat_url, wait_until="domcontentloaded")

        if not args.start_immediately:
            await wait_for_user_confirmation()

        print("Start synchronizacji. Zatrzymanie: Ctrl+C")
        last_copied_text: str | None = None

        try:
            while True:
                try:
                    if args.source_first_tile:
                        source_text = await read_first_tile_text(source_page, args.timeout_ms)
                    else:
                        source_text = await read_source_text(
                            source_page,
                            args.source_selector,
                            args.source_mode,
                            args.timeout_ms,
                        )
                    text_changed = source_text != last_copied_text

                    if not source_text and not args.allow_empty:
                        print("Pomijam cykl: zrodlo jest puste.")
                    elif text_changed or args.always_copy:
                        await write_target_text(
                            target_page,
                            args.chat_selector,
                            source_text,
                            args.timeout_ms,
                            args.send,
                        )
                        last_copied_text = source_text
                        print(f"Skopiowano {len(source_text)} znakow do strony docelowej.")
                    else:
                        print("Pomijam cykl: brak zmian w zrodle.")
                except PlaywrightTimeoutError as exc:
                    print(f"Timeout przy odczycie/zapisie elementu: {exc}")
                except Exception as exc:  # pragma: no cover - defensive logging for browser UI failures
                    print(f"Blad synchronizacji: {exc}")

                await asyncio.sleep(args.interval_seconds)
        finally:
            if context is not None:
                await context.close()
            if browser is not None:
                await browser.close()


def main() -> None:
    args = build_parser().parse_args()
    if args.interval_seconds < 1:
        raise SystemExit("--interval-seconds musi byc >= 1")
    if not args.source_first_tile and not args.source_selector:
        raise SystemExit("Podaj --source-selector lub uzyj --source-first-tile")
    asyncio.run(run(args))


if __name__ == "__main__":
    main()