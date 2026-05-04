#!/usr/bin/env python3
"""
Resize new local images and upload them to Supabase Storage.

Walks the folder tree under PHOTOS_DIR and uses the directory structure
directly as the storage path. For each new image creates two variants:
  cover-<name>.webp  — 1400px wide, quality 78
  thumb-<name>.webp  —  480px wide, quality 70

After a successful upload the local cover/thumb files are kept on disk
while the original input file is deleted so the script stays incremental.

Usage:
    python scripts/upload_images.py                          # all folders
    python scripts/upload_images.py kolonie/sportowe/rolki   # specific subfolder
"""

import argparse
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image
from supabase import create_client

SCRIPT_DIR = Path(__file__).resolve().parent
NEXTJS_ROOT = SCRIPT_DIR.parent

PHOTOS_DIR = Path(r"C:\Users\dudzi\OneDrive\NieSiedzWDomu\photos\dzieci\wydarzenia")

BUCKET = "event-library"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".avif"}
PRESETS = [
    {"suffix": "cover", "width": 1400, "quality": 78},
    {"suffix": "thumb", "width": 480,  "quality": 70},
]

_GENERATED_RE = re.compile(r"^.+-(cover|thumb)-\d+\.webp$", re.IGNORECASE)


def _load_env() -> None:
    for name in (".env.local", ".env"):
        p = NEXTJS_ROOT / name
        if p.exists():
            load_dotenv(p, override=False)


def _is_generated(name: str) -> bool:
    return bool(_GENERATED_RE.match(name))


def _normalize_subfolder(raw: str) -> str:
    normalized = raw.replace("\\", "/").strip("/")
    return re.sub(r"^(photos|photo)/", "", normalized, flags=re.IGNORECASE)


def _resize_to_webp(src: Path, width: int, quality: int) -> bytes:
    with Image.open(src) as img:
        if img.width > width:
            ratio = width / img.width
            new_size = (width, int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        import io
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="WEBP", quality=quality)
        return buf.getvalue()


def _upload(client, storage_path: str, data: bytes) -> None:
    client.storage.from_(BUCKET).upload(
        storage_path,
        data,
        {"content-type": "image/webp", "upsert": "true"},
    )


def _ensure_bucket(client) -> None:
    buckets = client.storage.list_buckets()
    if not any(b.name == BUCKET for b in buckets):
        client.storage.create_bucket(BUCKET, {"public": True})
        print(f"Created bucket: {BUCKET}")


def _process_image(client, local_path: Path, storage_dir: str, index: int) -> None:
    base = local_path.stem[:12]
    for preset in PRESETS:
        data = _resize_to_webp(local_path, preset["width"], preset["quality"])
        out_name = f"{base}-{preset['suffix']}-{index:03d}.webp"
        out_local = local_path.parent / out_name
        out_local.write_bytes(data)
        print(f"  Saved locally:  {out_name}")

        storage_path = f"{storage_dir}/{out_name}" if storage_dir else out_name
        _upload(client, storage_path, data)
        print(f"  Uploaded:       {storage_path}")

    local_path.unlink()
    print(f"  Deleted original: {local_path.name}")


def _walk(client, directory: Path) -> int:
    entries = sorted(directory.iterdir(), key=lambda p: p.name)
    images = [
        p for p in entries
        if p.is_file()
        and p.suffix.lower() in IMAGE_EXTS
        and not _is_generated(p.name)
    ]

    if images:
        storage_dir = directory.relative_to(PHOTOS_DIR).as_posix()
        if storage_dir == ".":
            storage_dir = ""
        print(f"\n{storage_dir or '(root)'} ({len(images)} new images)")

        counters: dict[str, int] = {}
        processed = 0
        for img in images:
            event_id = img.stem[:12]
            counters[event_id] = counters.get(event_id, 0) + 1
            index = counters[event_id]
            if (img.parent / f"{event_id}-cover-{index:03d}.webp").exists():
                print(f" Skipping {img.name} (already processed)")
                continue
            print(f" Processing {img.name}")
            _process_image(client, img, storage_dir, index)
            processed += 1
        return processed

    total = 0
    for entry in entries:
        if entry.is_dir():
            total += _walk(client, entry)
    return total


def main() -> None:
    parser = argparse.ArgumentParser(description="Resize and upload event images to Supabase Storage.")
    parser.add_argument("subfolder", nargs="?", default="", help="Optional subfolder to scan")
    args = parser.parse_args()

    _load_env()

    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url:
        sys.exit("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in environment")
    if not supabase_key:
        sys.exit("Missing SUPABASE_SERVICE_ROLE_KEY in environment")

    client = create_client(supabase_url, supabase_key)

    subfolder = _normalize_subfolder(args.subfolder)
    scan_dir = PHOTOS_DIR / subfolder if subfolder else PHOTOS_DIR

    if not scan_dir.is_dir():
        sys.exit(f"Directory not found: {scan_dir}")

    _ensure_bucket(client)
    print(f"Scanning: {scan_dir}")
    total = _walk(client, scan_dir)
    print(f"\nDone. Processed {total} images.")


if __name__ == "__main__":
    main()
