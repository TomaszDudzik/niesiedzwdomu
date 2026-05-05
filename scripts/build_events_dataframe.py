#!/usr/bin/env python3
"""
Proces:
- prompt chagpt + musimy dodac aby zrobil kolumne z juz promptem dla midjurney
- recznie wrzucamy do folderu
- skrypt sciaga dane z supabase
- bierze dane z csv
- append wszsytko
- dedup ale fuzzy musi byc jakis i dodaje status nowe i dodajemy EVENT-000001 itd
- 
- dodaje kolumny z cover i thumb image url, losowo wybierając z folderów zgodnie z typem/kategorią
- zapisuje do csv ale tylko nowe
- admin czyta csv i wrzuca do supabase
- check i published


Merge events from Supabase and CSV files in data/wydarzenia/,
deduplicate, then assign randomly chosen cover/thumb photo paths.

Usage:
    python scripts/build_events_dataframe.py [--output events_merged.csv]

Supabase (public.events) is the primary data source; CSVs are appended to it.
Deduplication runs on: title, date_start, time_start, organizer.

Photo selection:
    Path is resolved from the four type/category columns as
    photos/{type_lvl_1}/{type_lvl_2}/{category_lvl_1}/{category_lvl_2}
    falling back up the tree until cover-*.webp and thumb-*.webp files are found.
    The output paths are relative to the photos root (= Supabase Storage paths).
"""

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

SCRIPT_DIR = Path(__file__).resolve().parent
NEXTJS_ROOT = SCRIPT_DIR.parent
PROJECT_ROOT = NEXTJS_ROOT.parent

EVENTS_DIR = Path(r"C:\Users\dudzi\OneDrive\NieSiedzWDomu\data\dzieci\wydarzenia")

DEDUP_KEYS = ["title", "date_start", "time_start", "organizer"]
CSV_SEP = "~"
PREFER_CSV_COLUMNS = {
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
    "organizer",
    "price_from",
    "price_to",
    "is_free",
    "type_lvl_1",
    "type_lvl_2",
    "category_lvl_1",
    "category_lvl_2",
    "category_lvl_3",
    "image_prompt",
}
EVENT_COLUMNS = [
    "event_id",
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
    "organizer",
    "price_from",
    "price_to",
    "is_free",
    "type_lvl_1",
    "type_lvl_2",
    "category_lvl_1",
    "category_lvl_2",
]


def _has_value(value: object) -> bool:
    if value is None:
        return False
    if pd.isna(value):
        return False
    if isinstance(value, str):
        normalized = value.strip()
        return normalized not in {"", "None", "nan", "NaN"}
    return True


def _build_dedup_key(row: pd.Series, columns: list[str]) -> str:
    parts: list[str] = []
    for column in columns:
        value = row.get(column)
        if not _has_value(value):
            parts.append("")
        else:
            parts.append(str(value).strip().lower())
    return "||".join(parts)


def _merge_duplicates(df: pd.DataFrame, dedup_cols: list[str]) -> pd.DataFrame:
    if df.empty or not dedup_cols:
        return df.reset_index(drop=True)

    working = df.copy()
    working["_dedup_key"] = working.apply(lambda row: _build_dedup_key(row, dedup_cols), axis=1)

    merged_rows: list[dict[str, object]] = []
    for _, group in working.groupby("_dedup_key", sort=False, dropna=False):
        exist_rows = group[group["status"] == "exist"]
        csv_rows = group[group["status"] == "new"]

        if not exist_rows.empty:
            base = exist_rows.iloc[0].copy()
        else:
            base = group.iloc[0].copy()

        if not csv_rows.empty:
            csv_source = csv_rows.iloc[0]
            for column in working.columns:
                if column == "_dedup_key":
                    continue

                csv_value = csv_source.get(column)
                base_value = base.get(column)
                if not _has_value(csv_value):
                    continue

                if column in PREFER_CSV_COLUMNS or not _has_value(base_value):
                    base[column] = csv_value

            base["status"] = "sync" if not exist_rows.empty else "new"

        merged_rows.append(base.drop(labels=["_dedup_key"], errors="ignore").to_dict())

    return pd.DataFrame(merged_rows).reset_index(drop=True)


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
    df = _merge_duplicates(df, dedup_cols)

    existing_ids = df["event_id"].dropna().str.extract(r"EVENT-(\d+)")[0].dropna().astype(int)
    next_id = existing_ids.max() + 1 if not existing_ids.empty else 1
    missing_mask = df["event_id"].isna() | (df["event_id"] == "")
    new_ids = [f"EVENT-{next_id + i:06d}" for i in range(missing_mask.sum())]
    df.loc[missing_mask, "event_id"] = new_ids
    sync_count = int((df["status"] == "sync").sum()) if "status" in df.columns else 0
    print(f"After dedup on {dedup_cols}: {len(df)} rows, {missing_mask.sum()} new event_ids assigned (starting EVENT-{next_id:06d}), {sync_count} rows marked for sync")

    if "image_prompt" in df.columns:
        df["image_prompt"] = (
            df["event_id"].fillna("").astype(str) + " " +
            df["title"].fillna("").astype(str) + " " +
            df["image_prompt"].fillna("").astype(str)
        ).str.strip()

    out_path = Path(args.output)
    df.to_excel(out_path.with_suffix(".xlsx"), index=False, engine="openpyxl")
    df.to_csv(out_path, index=False, sep=CSV_SEP)
    print(f"Saved -> {out_path}  ({len(df)} rows)")

    new_df = df[df["status"].isin(["new", "sync"])].copy()
    new_df["status"] = "draft"
    new_df = new_df.where(pd.notna(new_df), None)
    json_path = out_path.with_name("events_new.json")
    new_df.to_json(json_path, orient="records", force_ascii=False)
    print(f"New events -> {json_path}  ({len(new_df)} rows)")


if __name__ == "__main__":
    main()
