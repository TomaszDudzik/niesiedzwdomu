"""CLI entry-point.

    # Test extraction (no DB writes)
    python -m backend.ingest.cli test-url "https://example.com" --adapter biletyna

    # Run adapter and store to DB as draft
    python -m backend.ingest.cli run --adapter biletyna

    # Run and publish directly
    python -m backend.ingest.cli run --adapter biletyna --publish

    # Run all registered adapters
    python -m backend.ingest.cli run --all
"""

from __future__ import annotations

import argparse
import io
import logging
import sys


def _setup_io() -> None:
    """Force UTF-8 on Windows so Polish characters don't crash."""
    if sys.stdout.encoding != "utf-8":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


def _setup_logging(verbose: bool = False) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    logging.basicConfig(level=logging.DEBUG if verbose else logging.INFO, handlers=[handler])


def _get_adapter(name: str):
    from backend.ingest.registry import get_adapter, list_adapters, load_adapters
    load_adapters()
    cls = get_adapter(name)
    if cls is None:
        avail = ", ".join(list_adapters()) or "(none)"
        print(f"Unknown adapter: {name!r}. Available: {avail}", file=sys.stderr)
        sys.exit(1)
    return cls()


# ── commands ────────────────────────────────────────────────────────

def cmd_test_url(args: argparse.Namespace) -> None:
    """Crawl + extract, print results. No DB writes."""
    from backend.ingest.pipeline import export_json, print_events, run_pipeline
    from backend.ingest.registry import load_adapters
    load_adapters()

    if args.adapter:
        adapter = _get_adapter(args.adapter)
        events = adapter.run(args.url)
    else:
        events = run_pipeline([args.url])

    print_events(events)

    if args.out:
        export_json(events, args.out)


def cmd_run(args: argparse.Namespace) -> None:
    """Run adapter(s), flatten multi-date events, store to DB."""
    from backend.ingest.pipeline import print_events
    from backend.ingest.registry import list_adapters, load_adapters
    from backend.ingest.store import flatten_events, store_events

    load_adapters()

    all_events = []

    if args.all:
        adapter_names = list_adapters()
        if not adapter_names:
            print("No adapters registered.", file=sys.stderr)
            sys.exit(1)
        for name in adapter_names:
            adapter = _get_adapter(name)
            events = adapter.run()
            all_events.extend(events)
    elif args.adapter:
        adapter = _get_adapter(args.adapter)
        events = adapter.run()
        all_events.extend(events)
    else:
        print("Specify --adapter <name> or --all", file=sys.stderr)
        sys.exit(1)

    # Flatten multi-date events into individual rows
    flat = flatten_events(all_events)

    if args.dry_run:
        print_events(flat)
        print(f"\n[dry-run] Would store {len(flat)} row(s) to DB.")
        return

    # Store to DB
    counts = store_events(flat, publish=args.publish)

    print(f"\nDone: {counts['created']} created, {counts['updated']} updated, "
          f"{counts['skipped']} skipped, {counts['errors']} errors")


def main() -> None:
    _setup_io()

    parser = argparse.ArgumentParser(prog="python -m backend.ingest.cli", description="Event ingest engine")
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    # test-url
    p = sub.add_parser("test-url", help="Crawl a URL and extract events (no DB)")
    p.add_argument("url", help="Listing page URL")
    p.add_argument("-a", "--adapter", help="Use a named adapter (e.g. biletyna)")
    p.add_argument("-o", "--out", help="Export JSON to file")

    # run
    p = sub.add_parser("run", help="Run adapter(s) and store to DB")
    p.add_argument("-a", "--adapter", help="Run a specific adapter")
    p.add_argument("--all", action="store_true", help="Run all registered adapters")
    p.add_argument("--publish", action="store_true", help="Set status=published (default: draft)")
    p.add_argument("--dry-run", action="store_true", help="Print events without writing to DB")

    args = parser.parse_args()
    _setup_logging(args.verbose)

    {"test-url": cmd_test_url, "run": cmd_run}[args.command](args)


if __name__ == "__main__":
    main()
