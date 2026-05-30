"""Generate small 256px JPEG thumbnails for every image already on local disk.

The Enquiries list renders 20 thumbnails at 32×32px, but the underlying files
are full-resolution uploads (often 500 KB – 5 MB each). Loading the list was
fetching 50-200 MB of pixel data per page; the browser would freeze before
rendering finished.

This script scans LOCAL_UPLOADS_DIR, decodes every supported image, and writes
a thumbnail to {LOCAL_UPLOADS_DIR}/thumbs/{same-uuid}.jpg. Nginx serves the
thumbs directory directly, so the list view loads ~5 KB per row instead of
~1 MB.

USAGE on EC2:
    cd /opt/fabrictrack
    source backend/venv/bin/activate
    python generate_thumbnails.py            # generate everything missing
    python generate_thumbnails.py --force    # regenerate even existing thumbs
    python generate_thumbnails.py --check    # just count missing thumbs

Notes
-----
* Idempotent. Existing thumbs are skipped unless --force is passed.
* Safe to re-run. Interrupting mid-way leaves partial progress on disk.
* New uploads automatically get thumbs in /api/upload, so this script only
  needs to run once to backfill existing files.
"""

import os
import sys
import argparse
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / "backend" / ".env")

LOCAL_UPLOADS_DIR = os.environ.get("LOCAL_UPLOADS_DIR")
if not LOCAL_UPLOADS_DIR:
    sys.exit("LOCAL_UPLOADS_DIR not set in backend/.env.")

THUMBS_DIR = os.path.join(LOCAL_UPLOADS_DIR, "thumbs")
SUPPORTED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".tif"}


def _make_thumb(src: str, dst: str) -> tuple[bool, int]:
    """Generate a 256px JPEG thumbnail. Returns (ok, output_size_bytes)."""
    from PIL import Image
    with Image.open(src) as img:
        img.thumbnail((256, 256), Image.LANCZOS)
        if img.mode != "RGB":
            img = img.convert("RGB")
        img.save(dst, format="JPEG", quality=70, optimize=True, progressive=True)
    return True, os.path.getsize(dst)


def main(force: bool, check_only: bool) -> None:
    os.makedirs(THUMBS_DIR, exist_ok=True)

    # Only files directly under LOCAL_UPLOADS_DIR (skip the thumbs/ subdir).
    candidates = []
    for name in os.listdir(LOCAL_UPLOADS_DIR):
        full = os.path.join(LOCAL_UPLOADS_DIR, name)
        if not os.path.isfile(full):
            continue
        ext = os.path.splitext(name)[1].lower()
        if ext not in SUPPORTED_EXT:
            continue
        candidates.append((name, full))

    print(f"Found {len(candidates)} source images in {LOCAL_UPLOADS_DIR}.")

    if check_only:
        missing = 0
        for name, _ in candidates:
            base = os.path.splitext(name)[0]
            if not os.path.exists(os.path.join(THUMBS_DIR, f"{base}.jpg")):
                missing += 1
        print(f"Thumbs missing: {missing}")
        return

    made, skipped, failed, total_bytes = 0, 0, 0, 0
    for i, (name, src) in enumerate(candidates, 1):
        base = os.path.splitext(name)[0]
        dst = os.path.join(THUMBS_DIR, f"{base}.jpg")
        if not force and os.path.exists(dst):
            skipped += 1
            continue
        try:
            ok, sz = _make_thumb(src, dst)
            if ok:
                made += 1
                total_bytes += sz
                if made % 50 == 0:
                    print(f"  [{i:>4}/{len(candidates)}] generated {made} thumbs so far ({total_bytes//1024} KB total)")
        except Exception as e:
            failed += 1
            print(f"  FAIL {name}: {e}")
            try:
                os.remove(dst)
            except FileNotFoundError:
                pass

    print(f"\nDone. Generated: {made}, skipped: {skipped}, failed: {failed}")
    if made:
        avg = total_bytes // made
        print(f"Total thumb size: {total_bytes//1024} KB  (avg {avg/1024:.1f} KB/thumb)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="Regenerate even if a thumb already exists.")
    ap.add_argument("--check", action="store_true", help="Just count how many source images lack a thumb.")
    args = ap.parse_args()
    main(force=args.force, check_only=args.check)
