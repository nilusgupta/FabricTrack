#!/usr/bin/env python3
"""
One-time script to recompress all existing image files in the `files` collection.
- Downloads each image via the same storage layer the app uses (local or Emergent).
- Resizes to max 1600px on longest side, JPEG quality 82 (or PNG for transparent).
- Keeps the SAME storage_path so no references in enquiries / stage_values break.
- Updates `content_type` and `size` in the files collection.
- Skips files that are already small or non-images.
- Idempotent: safe to re-run.

Usage on EC2 (or anywhere with backend/.env):
    cd /opt/fabrictrack
    source backend/venv/bin/activate
    python3 recompress_images.py             # dry-run (reports savings, no writes)
    python3 recompress_images.py --apply     # actually write back

Optionally limit to N files for a smoke test:
    python3 recompress_images.py --apply --limit 10
"""
import os
import sys
import argparse
from io import BytesIO

# Make backend modules importable
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from dotenv import load_dotenv
load_dotenv(".env")

from pymongo import MongoClient
from PIL import Image

# Re-use server.py's storage helpers
from server import get_object, put_object  # noqa: E402

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "fabrictrack")

MAX_DIM = 1600
JPEG_QUALITY = 82
MIN_BYTES_TO_BOTHER = 80 * 1024  # skip files already <80KB


def compress(data: bytes, content_type: str):
    """Return (new_bytes, new_content_type) or (None, None) if no improvement."""
    if not content_type.startswith("image/"):
        return None, None
    try:
        img = Image.open(BytesIO(data))
    except Exception:
        return None, None

    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    if max(img.size) > MAX_DIM:
        img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)

    out = BytesIO()
    if has_alpha:
        # Keep PNG (preserves transparency)
        img.save(out, format="PNG", optimize=True)
        new_ct = "image/png"
    else:
        if img.mode != "RGB":
            img = img.convert("RGB")
        img.save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        new_ct = "image/jpeg"

    new_bytes = out.getvalue()
    if len(new_bytes) >= len(data):
        return None, None  # compression didn't help
    return new_bytes, new_ct


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Actually write changes (default: dry-run)")
    parser.add_argument("--limit", type=int, default=0, help="Process at most N files (0 = all)")
    args = parser.parse_args()

    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    cursor = db.files.find({"is_deleted": {"$ne": True}})
    if args.limit:
        cursor = cursor.limit(args.limit)
    files = list(cursor)
    print(f"Mode: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Total files to scan: {len(files)}\n")

    total_orig = total_new = 0
    saved_count = skipped_count = error_count = 0

    for i, f in enumerate(files, 1):
        path = f.get("storage_path", "")
        ct = f.get("content_type", "")
        size = f.get("size", 0)
        if not path or not ct.startswith("image/"):
            skipped_count += 1
            continue
        if size and size < MIN_BYTES_TO_BOTHER:
            skipped_count += 1
            continue

        try:
            data, real_ct = get_object(path)
        except Exception as e:
            print(f"  [{i}/{len(files)}] FAIL get {path}: {e}")
            error_count += 1
            continue

        orig_len = len(data)
        new_bytes, new_ct = compress(data, ct or real_ct)
        if not new_bytes:
            skipped_count += 1
            continue

        savings = orig_len - len(new_bytes)
        total_orig += orig_len
        total_new += len(new_bytes)
        saved_count += 1
        pct = 100 * savings / orig_len
        print(f"  [{i}/{len(files)}] {path}: {orig_len/1024:.0f} KB -> {len(new_bytes)/1024:.0f} KB ({pct:.0f}% saved)")

        if args.apply:
            try:
                put_object(path, new_bytes, new_ct)
                db.files.update_one(
                    {"_id": f["_id"]},
                    {"$set": {"content_type": new_ct, "size": len(new_bytes)}}
                )
            except Exception as e:
                print(f"     write failed: {e}")
                error_count += 1

    print(f"\n=== Summary ===")
    print(f"  Compressed:  {saved_count}")
    print(f"  Skipped:     {skipped_count}")
    print(f"  Errors:      {error_count}")
    if total_orig:
        print(f"  Total before: {total_orig/1024/1024:.1f} MB")
        print(f"  Total after:  {total_new/1024/1024:.1f} MB")
        print(f"  Savings:      {(total_orig - total_new)/1024/1024:.1f} MB ({100*(total_orig-total_new)/total_orig:.0f}%)")
    if not args.apply:
        print("\n  Re-run with --apply to write changes.")


if __name__ == "__main__":
    main()
