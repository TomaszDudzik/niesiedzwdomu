#!/usr/bin/env python3
"""
Assign a randomly chosen image to one camp by camp_id.

Flow:
- find ALL source images whose filename starts with camp_id under PHOTOS_DIR
- convert each to a cover-*.webp / thumb-*.webp pair (skipped if already done)
- pick one pair randomly
- upload that pair to Supabase Storage
- update target row in public.camps

Usage:
  python scripts/assign_camp_image.py --id <camp_row_id> --camp-id CAMP-000123
"""

import argparse
import io
import json
import os
import random
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image
from supabase import create_client

SCRIPT_DIR = Path(__file__).resolve().parent
NEXTJS_ROOT = SCRIPT_DIR.parent

PHOTOS_DIR = Path(r"C:\Users\dudzi\OneDrive\NieSiedzWDomu\photos\dzieci\kolonie")
BUCKET = "event-library"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".avif"}


def _load_env() -> None:
    for name in (".env.local", ".env"):
        p = NEXTJS_ROOT / name
        if p.exists():
            load_dotenv(p, override=False)


def _is_generated(name: str) -> bool:
    lowered = name.lower()
    return bool(re.search(r"-(cover|thumb)(?:-\d+)?\.webp$", lowered))


def _find_source_images(camp_id: str) -> list[Path]:
    needle = camp_id.strip().lower()
    candidates: list[Path] = []

    for p in PHOTOS_DIR.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in IMAGE_EXTS:
            continue
        if _is_generated(p.name):
            continue
        if p.stem.lower().startswith(needle):
            candidates.append(p)

    candidates.sort(key=lambda p: p.name)
    return candidates


def _resize_to_webp(src: Path, width: int, quality: int) -> bytes:
    with Image.open(src) as img:
        if img.width > width:
            ratio = width / img.width
            img = img.resize((width, int(img.height * ratio)), Image.LANCZOS)

        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="WEBP", quality=quality)
        return buf.getvalue()


def _ensure_webp_pair(source: Path) -> tuple[Path, Path]:
    stem = source.stem
    cover_local = source.parent / f"{stem}-cover.webp"
    thumb_local = source.parent / f"{stem}-thumb.webp"

    if not cover_local.exists():
        cover_local.write_bytes(_resize_to_webp(source, width=1400, quality=78))
    if not thumb_local.exists():
        thumb_local.write_bytes(_resize_to_webp(source, width=480, quality=70))

    return cover_local, thumb_local


def _main() -> int:
    parser = argparse.ArgumentParser(description="Assign image to camp by camp_id")
    parser.add_argument("--id", required=True, help="UUID row id in camps table")
    parser.add_argument("--camp-id", required=True, help="Human camp id like CAMP-000123")
    args = parser.parse_args()

    _load_env()

    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not supabase_key:
        print(json.dumps({"ok": False, "error": "Missing Supabase env"}), file=sys.stderr)
        return 1

    sources = _find_source_images(args.camp_id)
    if not sources:
        print(json.dumps({"ok": False, "error": f"No source images found for {args.camp_id}"}), file=sys.stderr)
        return 1

    client = create_client(supabase_url, supabase_key)

    pairs: list[tuple[Path, Path]] = []
    for src in sources:
        cover_local, thumb_local = _ensure_webp_pair(src)
        pairs.append((cover_local, thumb_local))

    chosen_cover, chosen_thumb = random.choice(pairs)

    storage_dir = chosen_cover.parent.relative_to(PHOTOS_DIR).as_posix()
    if storage_dir == ".":
        storage_dir = ""

    cover_name = chosen_cover.name
    thumb_name = chosen_thumb.name
    set_id = chosen_cover.stem.removesuffix("-cover")

    cover_bytes = chosen_cover.read_bytes()
    thumb_bytes = chosen_thumb.read_bytes()

    cover_path = f"dzieci/kolonie/{storage_dir}/{cover_name}" if storage_dir else f"dzieci/kolonie/{cover_name}"
    thumb_path = f"dzieci/kolonie/{storage_dir}/{thumb_name}" if storage_dir else f"dzieci/kolonie/{thumb_name}"

    client.storage.from_(BUCKET).upload(
        cover_path,
        cover_bytes,
        {"content-type": "image/webp", "upsert": "true"},
    )
    client.storage.from_(BUCKET).upload(
        thumb_path,
        thumb_bytes,
        {"content-type": "image/webp", "upsert": "true"},
    )

    cover_url = client.storage.from_(BUCKET).get_public_url(cover_path)
    thumb_url = client.storage.from_(BUCKET).get_public_url(thumb_path)

    update = {
        "image_cover": cover_url,
        "image_thumb": thumb_url,
        "image_set": set_id,
        "status": "draft",
    }
    response = client.table("camps").update(update).eq("id", args.id).execute()

    if response is None:
        print(json.dumps({"ok": False, "error": "Failed to update camp"}), file=sys.stderr)
        return 1

    print(json.dumps({
        "ok": True,
        "id": args.id,
        "camp_id": args.camp_id,
        "image_cover": cover_url,
        "image_thumb": thumb_url,
        "image_set": set_id,
        "source": chosen_cover.name,
        "total_images": len(sources),
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())