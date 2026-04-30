#!/usr/bin/env python3
"""
Proces:
- prompt chagpt
- recznie wrzucamy do folderu
- skrypt sciaga dane z supabase
- bierze dane z csv
- append wszsytko
- dedup ale fuzzy musi byc jakis i dodaje status nowe
- dodaje kolumny z cover i thumb image url, losowo wybierając z folderów zgodnie z typem/kategorią
- zapisuje do csv ale tylko nowe
- admin czyta csv i wrzuca do supabase
- check i published


Merge events from Supabase and CSV files in data/wydarzenia/,
deduplicate, then assign randomly chosen cover/thumb photo paths.

Usage:
    python scripts/build_events_dataframe.py [--output events_merged.csv]

Supabase (public.events) is the primary data source; CSVs are appended to it.
Deduplication runs on: title, date_start, time_start, organizer_id.

Photo selection:
    Path is resolved from the four type/category columns as
    photos/{type_lvl_1}/{type_lvl_2}/{category_lvl_1}/{category_lvl_2}
    falling back up the tree until cover-*.webp and thumb-*.webp files are found.
    The output paths are relative to the photos root (= Supabase Storage paths).
"""

import argparse
import os
import random
import sys
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

SCRIPT_DIR = Path(__file__).resolve().parent
NEXTJS_ROOT = SCRIPT_DIR.parent
PROJECT_ROOT = NEXTJS_ROOT.parent

PHOTOS_DIR = Path(r"C:\Users\dudzi\OneDrive\NieSiedzWDomu\photos\dzieci\wydarzenia")
EVENTS_DIR = Path(r"C:\Users\dudzi\OneDrive\NieSiedzWDomu\data\dzieci\wydarzenia")

DEDUP_KEYS = ["title", "date_start", "time_start", "organizer_id"]
CSV_SEP = "~"
EVENT_COLUMNS = [
    "title",
    "description_short",
    "description_long",
    "date_start",
    "date_end",
    "time_start",
    "time_end",
    "age_min",
    "age_max",
    "district",
    "street",
    "city",
    "postcode",
    "source_url",
    "facebook_url",
    "organizer_id",
    "price_from",
    "price_to",
    "is_free",
    "type_lvl_1",
    "type_lvl_2",
    "category_lvl_1",
    "category_lvl_2",
]


def _load_env() -> None:
    # Load both files (if present): .env.local first, then .env.
    # This avoids missing DATABASE_URL when .env.local exists but doesn't define it.
    for name in (".env.local", ".env"):
        p = NEXTJS_ROOT / name
        if p.exists():
            load_dotenv(p, override=False)


def _load_events_from_supabase() -> pd.DataFrame:
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not supabase_key:
        sys.exit(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file"
        )

    client = create_client(supabase_url, supabase_key)
    rows: list[dict] = []
    page_size = 1000
    offset = 0

    while True:
        response = (
            client.table("events")
            .select(",".join(EVENT_COLUMNS))
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = response.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    return pd.DataFrame(rows)


def _load_csv_files() -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    for csv_path in sorted(EVENTS_DIR.glob("*.csv")):
        df = pd.read_csv(csv_path, sep=CSV_SEP, dtype=str, on_bad_lines="skip")
        frames.append(df)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


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


def _assign_photos(df: pd.DataFrame) -> pd.DataFrame:
    cover_urls: list[str] = []
    thumb_urls: list[str] = []

    for _, row in df.iterrows():
        def _val(col: str) -> str:
            return str(row.get(col) or "").strip()

        folder = _resolve_photo_folder(_val("type_lvl_1"), _val("type_lvl_2"),
                                       _val("category_lvl_1"), _val("category_lvl_2"))
        covers, thumbs = _photos_in(folder)

        def _storage(p: Path | None) -> str:
            return p.relative_to(PHOTOS_DIR).as_posix() if p else ""

        cover_urls.append(_storage(random.choice(covers) if covers else None))
        thumb_urls.append(_storage(random.choice(thumbs) if thumbs else None))

    df = df.copy()
    df["cover_image_url"] = cover_urls
    df["thumb_image_url"] = thumb_urls
    return df


def _add_midjourney_prompt(df: pd.DataFrame) -> pd.DataFrame:
    def _text(row: pd.Series, col: str) -> str:
        value = row.get(col, "")
        if pd.isna(value):
            return ""
        return str(value).strip()

    def _build_prompt(row: pd.Series) -> str:
        title = _text(row, "title")
        description_short = _text(row, "description_short")
        description_long = _text(row, "description_long")
        category_lvl_1 = _text(row, "category_lvl_1")
        category_lvl_2 = _text(row, "category_lvl_2")
        type_lvl_1 = _text(row, "type_lvl_1")

        return (
            f"{title}, {description_short}, {description_long}, "
            "scene representing the event in a visually clear and engaging way, "
            "focus on main activity and audience, emotional storytelling moment, "
            "natural interactions between people, "
            f"environment reflecting {category_lvl_1} and {category_lvl_2}, "
            f"atmosphere appropriate for {type_lvl_1}, candid lifestyle photography, "
            "soft warm lighting, pastel tones, shallow depth of field, realistic details, "
            "50mm lens, cinematic composition, high detail, gentle mood, authentic atmosphere "
            "--ar 1:1 --style raw --v 6 --s 150 --q 1 --no text, watermark, logo, distorted hands, deformed faces"
        )

    df = df.copy()
    df["midjourney_prompt"] = df.apply(_build_prompt, axis=1)
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Build merged events dataframe with photo paths.")
    parser.add_argument("--output", default="events_merged.csv", help="Output CSV path (default: events_merged.csv)")
    args = parser.parse_args()

    _load_env()

    print("Loading events from Supabase (public.events) ...")
    df_sql = _load_events_from_supabase()
    df_sql["status"] = "exist"
    print(f"  Supabase rows: {len(df_sql)}")

    print(f"Loading CSVs from {EVENTS_DIR} ...")
    df_csv = _load_csv_files()
    df_csv["status"] = "new"
    print(f"  CSV rows: {len(df_csv)}")

    df = pd.concat([df_sql, df_csv], ignore_index=True)
    print(f"Combined: {len(df)} rows")

    dedup_cols = [c for c in DEDUP_KEYS if c in df.columns]
    # Sort so 'exist' rows come first, ensuring they win over 'new' during dedup
    df = df.sort_values("status", key=lambda s: s.map({"exist": 0, "new": 1}))
    df = df.drop_duplicates(subset=dedup_cols, keep="first")
    print(f"After dedup on {dedup_cols}: {len(df)} rows")

    print("Building Midjourney prompts ...")
    df = _add_midjourney_prompt(df)

    df.to_excel("events_merged_with_prompts.xlsx", index=False, engine="openpyxl")

    print("Assigning random cover/thumb photos ...")
    df = _assign_photos(df)

    out_path = Path(args.output)
    df.to_csv(out_path, index=False, sep=CSV_SEP)
    print(f"Saved -> {out_path}  ({len(df)} rows)")


if __name__ == "__main__":
    main()
