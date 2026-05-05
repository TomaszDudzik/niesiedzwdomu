#!/usr/bin/env python3
"""
Merge camps from Supabase and CSV files in data/kolonie/,
deduplicate, then write new/sync rows to camps_new.json.

Usage:
    python scripts/build_camps_dataframe.py [--output camps_merged.csv]
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

CAMPS_DIR = Path(r"C:\Users\dudzi\OneDrive\NieSiedzWDomu\data\dzieci\kolonie")

DEDUP_KEYS = ["title", "date_start", "organizer"]
CSV_SEP = "~"

# Maps any alias/Polish column name → canonical field name used throughout the pipeline
COLUMN_ALIASES: dict[str, str] = {
    # organizer
    "organizator": "organizer",
    # category_lvl_1 (type/kind of camp)
    "main_category": "category_lvl_1",
    "camp_type": "category_lvl_1",
    "typ": "category_lvl_1",
    "typ_oferty": "category_lvl_1",
    "rodzaj": "category_lvl_1",
    "type": "category_lvl_1",
    "type_id": "category_lvl_1",
    # category_lvl_2
    "category": "category_lvl_2",
    "kategoria": "category_lvl_2",
    "kategoria_obozu": "category_lvl_2",
    "camp_subtype": "category_lvl_2",
    "podtyp": "category_lvl_2",
    # category_lvl_3
    "subcategory": "category_lvl_3",
    "podkategoria": "category_lvl_3",
    "sub_category": "category_lvl_3",
    "dyscyplina": "category_lvl_3",
    # dates
    "termin_od": "date_start",
    "data od": "date_start",
    "od": "date_start",
    "termin_do": "date_end",
    "data do": "date_end",
    "do": "date_end",
    # age
    "wiek_od": "age_min",
    "wiek od": "age_min",
    "wiek_do": "age_max",
    "wiek do": "age_max",
    # price
    "cena": "price_from",
    "cena_od": "price_from",
    "cena_za_tydzien": "price_from",
    "cena od": "price_from",
    "cena_do": "price_to",
    "cena do": "price_to",
    # booleans
    "wyzywienie": "meals_included",
    "jedzenie": "meals_included",
    "transport": "transport_included",
    "dojazd": "transport_included",
    "dowoz": "transport_included",
    "dowóz": "transport_included",
    # address
    "ulica": "street",
    "adres": "street",
    "address": "street",
    "miasto": "city",
    "dzielnica": "district",
    "kod": "postcode",
    "kod pocztowy": "postcode",
    # urls
    "url": "source_url",
    "link": "source_url",
    "link_zrodlowy": "source_url",
    "facebook": "facebook_url",
    "fb": "facebook_url",
    # title / description
    "tytul": "title",
    "tytuł": "title",
    "nazwa": "title",
    "nazwa turnusu": "title",
    "tematyka": "description_short",
    "temat": "description_short",
    "program": "description_short",
    "krotki opis": "description_short",
    "krótki opis": "description_short",
}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename alias/Polish column headers to canonical field names."""
    rename_map = {}
    for col in df.columns:
        canonical = COLUMN_ALIASES.get(col.strip().lower())
        if canonical and canonical not in df.columns:
            rename_map[col] = canonical
    return df.rename(columns=rename_map)


PREFER_CSV_COLUMNS = {
    "title",
    "description_short",
    "description_long",
    "date_start",
    "date_end",
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
    "meals_included",
    "transport_included",
    "category_lvl_1",
    "category_lvl_2",
    "category_lvl_3",
    "image_prompt",
}

CAMP_COLUMNS = [
    "camp_id",
    "title",
    "description_short",
    "description_long",
    "date_start",
    "date_end",
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
    "meals_included",
    "transport_included",
    "category_lvl_1",
    "category_lvl_2",
    "category_lvl_3",
    "image_prompt",
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
    for name in (".env.local", ".env"):
        p = NEXTJS_ROOT / name
        if p.exists():
            load_dotenv(p, override=False)


def _load_camps_from_supabase() -> pd.DataFrame:
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not supabase_key:
        sys.exit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")

    client = create_client(supabase_url, supabase_key)
    rows: list[dict] = []
    page_size = 1000
    offset = 0

    while True:
        response = (
            client.table("camps")
            .select("*")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = response.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    df = pd.DataFrame(rows)
    return _normalize_columns(df)


def _load_csv_files() -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    for csv_path in sorted(CAMPS_DIR.glob("*.csv")):
        df = pd.read_csv(csv_path, sep=CSV_SEP, dtype=str, on_bad_lines="skip")
        df = _normalize_columns(df)
        frames.append(df)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def main() -> None:
    parser = argparse.ArgumentParser(description="Build merged camps dataframe.")
    parser.add_argument("--output", default="camps_merged.csv", help="Output CSV path (default: camps_merged.csv)")
    args = parser.parse_args()

    _load_env()

    print("Loading camps from Supabase (public.camps) ...")
    df_sql = _load_camps_from_supabase()
    df_sql["status"] = "exist"
    print(f"  Supabase rows: {len(df_sql)}")

    print(f"Loading CSVs from {CAMPS_DIR} ...")
    df_csv = _load_csv_files()
    df_csv["status"] = "new"
    print(f"  CSV rows: {len(df_csv)}")

    df = pd.concat([df_sql, df_csv], ignore_index=True)
    print(f"Combined: {len(df)} rows")

    dedup_cols = [c for c in DEDUP_KEYS if c in df.columns]
    df = _merge_duplicates(df, dedup_cols)

    existing_ids = df["camp_id"].dropna().astype(str).str.extract(r"CAMP-(\d+)")[0].dropna().astype(int) if "camp_id" in df.columns else pd.Series(dtype=int)
    next_id = existing_ids.max() + 1 if not existing_ids.empty else 1
    if "camp_id" not in df.columns:
        df["camp_id"] = None
    df["camp_id"] = df["camp_id"].astype(object)
    missing_mask = df["camp_id"].isna() | (df["camp_id"] == "")
    new_ids = [f"CAMP-{next_id + i:06d}" for i in range(missing_mask.sum())]
    df.loc[missing_mask, "camp_id"] = new_ids
    sync_count = int((df["status"] == "sync").sum()) if "status" in df.columns else 0
    print(f"After dedup on {dedup_cols}: {len(df)} rows, {missing_mask.sum()} new camp_ids assigned (starting CAMP-{next_id:06d}), {sync_count} rows marked for sync")

    if "image_prompt" in df.columns:
        df["image_prompt"] = (
            df["camp_id"].fillna("").astype(str) + " " +
            df["title"].fillna("").astype(str) + " " +
            df["image_prompt"].fillna("").astype(str)
        ).str.strip()

    out_path = Path(args.output)
    df.to_csv(out_path, index=False, sep=CSV_SEP)
    print(f"Saved -> {out_path}  ({len(df)} rows)")

    new_df = df[df["status"].isin(["new", "sync"])].copy()
    new_df["status"] = "draft"
    new_df = new_df.where(pd.notna(new_df), None)
    json_path = out_path.with_name("camps_new.json")
    new_df.to_json(json_path, orient="records", force_ascii=False)
    print(f"New camps -> {json_path}  ({len(new_df)} rows)")


if __name__ == "__main__":
    main()
