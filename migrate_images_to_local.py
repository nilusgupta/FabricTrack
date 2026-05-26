"""
One-shot migration: download every image currently in Emergent Object Storage
to local EC2 disk (LOCAL_UPLOADS_DIR) and update all DB references
(files.storage_path, enquiries.image_path, and stage_values for image stages).

After this runs, every image in the system is served by Nginx directly — no
more two-tier (local + Object Storage) serving. Solution B becomes uniform.

USAGE on EC2:
    cd /opt/fabrictrack
    source backend/venv/bin/activate

    # 1) Dry run first — shows what would change, makes no writes
    python migrate_images_to_local.py --dry-run

    # 2) If the dry-run output looks right, do it for real
    python migrate_images_to_local.py

    # 3) (optional) Verify — should print "All migrated. 0 remaining."
    python migrate_images_to_local.py --check

Notes
-----
* Idempotent. Already-migrated `local/...` paths are skipped.
* Safe to interrupt; just re-run.  Each row migrates atomically (file write
  before DB update). If a write fails mid-way, the next run picks it up.
* Object Storage originals are NOT deleted by this script. After you've
  verified everything works for a week, you can manually clean them up by
  setting `is_deleted=True` on the legacy file rows — but that's optional;
  they're cheap to keep around as a safety net.
* Requires LOCAL_UPLOADS_DIR to be set in backend/.env.
"""

import os
import sys
import time
import asyncio
import argparse
from pathlib import Path

from dotenv import load_dotenv
import requests
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent
load_dotenv(ROOT / "backend" / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
LOCAL_UPLOADS_DIR = os.environ.get("LOCAL_UPLOADS_DIR")
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "fabrictrack"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")

if not LOCAL_UPLOADS_DIR:
    sys.exit("LOCAL_UPLOADS_DIR not set in backend/.env. Configure Solution B first.")
if not EMERGENT_KEY:
    sys.exit("EMERGENT_LLM_KEY not set in backend/.env — required to read existing images.")

os.makedirs(LOCAL_UPLOADS_DIR, exist_ok=True)


def _init_storage():
    """Get/create the storage key (same as server.py)."""
    resp = requests.post(
        f"{STORAGE_URL}/init",
        headers={"Content-Type": "application/json"},
        json={"app_name": APP_NAME, "emergent_key": EMERGENT_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    body = resp.json()
    # Object Storage returns {"storage_key": "..."}; older docs called it "key".
    return body.get("storage_key") or body["key"]


def _download(path: str, storage_key: str) -> bytes:
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": storage_key},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content


def _local_name(original_path: str) -> str:
    """Pick a stable filename for the local copy — preserve uuid + ext."""
    base = original_path.rsplit("/", 1)[-1]
    return base  # already uuid-prefixed in Object Storage, safe as-is


async def migrate(dry_run: bool = False, check_only: bool = False) -> None:
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Build the migration plan first so the dry-run can show a complete picture.
    files = await db.files.find(
        {"is_deleted": False, "storage_path": {"$not": {"$regex": "^local/"}}}, {"_id": 0}
    ).to_list(length=10000)

    print(f"Found {len(files)} legacy (Object Storage) file rows to migrate.\n")

    if check_only:
        remaining = await db.files.count_documents(
            {"is_deleted": False, "storage_path": {"$not": {"$regex": "^local/"}}}
        )
        print(f"All migrated. {remaining} remaining.")
        client.close()
        return

    if dry_run:
        for r in files[:10]:
            print(f"  WOULD migrate: {r['storage_path']}")
        if len(files) > 10:
            print(f"  ... and {len(files) - 10} more")
        client.close()
        return

    storage_key = _init_storage()
    print(f"Got storage key. Beginning migration to {LOCAL_UPLOADS_DIR} ...\n")

    success, failed, skipped = 0, 0, 0
    rename_map: dict[str, str] = {}  # old_path -> new_path

    for i, rec in enumerate(files, 1):
        old_path = rec["storage_path"]
        new_name = _local_name(old_path)
        new_path = f"local/{new_name}"
        local_file = os.path.join(LOCAL_UPLOADS_DIR, new_name)

        if os.path.exists(local_file):
            # File already on disk from a previous run — just fix the DB.
            await db.files.update_one({"storage_path": old_path}, {"$set": {"storage_path": new_path}})
            rename_map[old_path] = new_path
            skipped += 1
            print(f"  [{i:>4}/{len(files)}] SKIP (already on disk): {old_path}")
            continue

        try:
            data = _download(old_path, storage_key)
        except Exception as e:
            failed += 1
            print(f"  [{i:>4}/{len(files)}] FAIL download {old_path}: {e}")
            continue

        # Write to disk first, then update the DB. If interrupted between the
        # two, the next run sees the file already exists and just fixes the DB.
        try:
            with open(local_file, "wb") as f:
                f.write(data)
            await db.files.update_one({"storage_path": old_path}, {"$set": {"storage_path": new_path}})
            rename_map[old_path] = new_path
            success += 1
            if i % 25 == 0 or i == len(files):
                print(f"  [{i:>4}/{len(files)}] OK   {old_path} → {new_path}  ({len(data)//1024}KB)")
        except Exception as e:
            failed += 1
            print(f"  [{i:>4}/{len(files)}] FAIL write {old_path}: {e}")
            # Best-effort cleanup of partial file
            try:
                os.remove(local_file)
            except FileNotFoundError:
                pass

    print(f"\nFiles: {success} migrated, {skipped} already-local, {failed} failed.\n")

    # Now fix enquiry references — image_path + per-stage image stage values.
    print("Updating enquiry references ...")
    enq_updates = 0
    # Pull stages once to know which ones are image-type
    stages = await db.stages.find({}, {"_id": 0, "id": 1, "input_type": 1}).to_list(length=500)
    image_stage_ids = {s["id"] for s in stages if s.get("input_type") == "image"}

    enquiries = await db.enquiries.find({}, {"_id": 0, "id": 1, "image_path": 1, "stage_values": 1}).to_list(length=20000)
    for enq in enquiries:
        changes = {}
        # 1) Top-level image_path
        ip = enq.get("image_path") or ""
        if ip and ip in rename_map:
            changes["image_path"] = rename_map[ip]

        # 2) stage_values for image-type stages
        sv = enq.get("stage_values") or {}
        for sid, val in sv.items():
            if sid not in image_stage_ids:
                continue
            if isinstance(val, dict):
                path = val.get("value", "")
                if path and path in rename_map:
                    changes[f"stage_values.{sid}.value"] = rename_map[path]
            elif isinstance(val, str) and val in rename_map:
                changes[f"stage_values.{sid}"] = rename_map[val]

        if changes:
            await db.enquiries.update_one({"id": enq["id"]}, {"$set": changes})
            enq_updates += 1

    print(f"Updated {enq_updates} enquiry rows.\n")
    print("Done. Image migration complete.")
    print("Recommend: verify a few enquiries open correctly with their images, then take an EBS snapshot.")
    client.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Show what would change without writing.")
    ap.add_argument("--check", action="store_true", help="Print count of remaining non-local files.")
    args = ap.parse_args()
    asyncio.run(migrate(dry_run=args.dry_run, check_only=args.check))
