#!/usr/bin/env python3
"""
Assign random cover/thumb photo paths to events in a merged CSV.

Reads the output of build_events_dataframe.py (events_merged.csv by default),
resolves a photo folder based on type/category taxonomy, picks random cover-*.webp
and thumb-*.webp files, then overwrites the file with the two new columns.

Usage:
    python scripts/assign_photos.py [--input events_merged.csv] [--output events_merged.csv]
"""

import argparse
import random
from pathlib import Path

import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
NEXTJS_ROOT = SCRIPT_DIR.parent

PHOTOS_DIR = Path(r"C:\Users\dudzi\OneDrive\NieSiedzWDomu\photos\dzieci\wydarzenia")
CSV_SEP = "~"


def _photos_in(folder: Path) -> tuple[list[Path], list[Path]]:
    return sorted(folder.glob("cover-*.webp")), sorted(folder.glob("thumb-*.webp"))


def _resolve_photo_folder(t1: str, t2: str, c1: str, c2: str) -> Path:
    candidates = [
        PHOTOS_DIR / t1 / t2 / c1 / c2,
        PHOTOS_DIR / t1 / t2 / c1,
        PHOTOS_DIR / t1 / t2,
        PHOTOS_DIR / t1,
        PHOTOS_DIR,
    ]
    for folder in candidates:
        if folder.is_dir():
            covers, thumbs = _photos_in(folder)
            if covers and thumbs:
                return folder
    return PHOTOS_DIR


def assign_photos(df: pd.DataFrame) -> pd.DataFrame:
    cover_urls: list[str] = []
    thumb_urls: list[str] = []

    for _, row in df.iterrows():
        def _val(col: str) -> str:
            return str(row.get(col) or "").strip()

        folder = _resolve_photo_folder(
            _val("type_lvl_1"), _val("type_lvl_2"),
            _val("category_lvl_1"), _val("category_lvl_2"),
        )
        covers, thumbs = _photos_in(folder)

        def _storage(p: Path | None) -> str:
            return p.relative_to(PHOTOS_DIR).as_posix() if p else ""

        cover_urls.append(_storage(random.choice(covers) if covers else None))
        thumb_urls.append(_storage(random.choice(thumbs) if thumbs else None))

    df = df.copy()
    df["cover_image_url"] = cover_urls
    df["thumb_image_url"] = thumb_urls
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Assign random cover/thumb photos to events CSV.")
    parser.add_argument("--input", default="events_merged.csv", help="Input CSV (default: events_merged.csv)")
    parser.add_argument("--output", default=None, help="Output CSV (default: same as input)")
    args = parser.parse_args()

    in_path = Path(args.input)
    out_path = Path(args.output) if args.output else in_path

    if not in_path.exists():
        raise FileNotFoundError(f"Input file not found: {in_path}")

    print(f"Reading {in_path} ...")
    df = pd.read_csv(in_path, sep=CSV_SEP, dtype=str, on_bad_lines="skip")
    print(f"  {len(df)} rows")

    print("Assigning random cover/thumb photos ...")
    df = assign_photos(df)

    df.to_csv(out_path, index=False, sep=CSV_SEP)
    print(f"Saved -> {out_path}  ({len(df)} rows)")


if __name__ == "__main__":
    main()
