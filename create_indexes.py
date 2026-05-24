"""
One-shot script to add MongoDB indexes that will speed up FabricTrack's
hot queries. Safe to run multiple times — `create_index` is idempotent
(re-creates with same name = no-op).

USAGE on your EC2 box:
    cd /opt/fabrictrack
    source venv/bin/activate                      # or however you activate
    python create_indexes.py

The script connects to MONGO_URL from backend/.env (same one the app uses).

REVERT (if ever needed):
    python create_indexes.py --drop
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / "backend" / ".env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# (collection, index_spec, name, options)
# Hot queries this targets — see comments next to each
INDEXES = [
    # ENQUIRIES — most queried collection
    # 1. find_one({"id": ...}) — every GET /enquiries/<id>, PUT /enquiries/<id>, etc.
    ("enquiries", [("id", 1)], "id_idx", {"unique": True}),

    # 2. list endpoint sorts by created_at desc + filters by status/department
    #    .find({"status": "open"}).sort("created_at", -1)  — Enquiries page load
    ("enquiries", [("status", 1), ("created_at", -1)], "status_created_idx", {}),

    # 3. .find({"department": ...}) — Dept filter, also reports
    ("enquiries", [("department", 1), ("created_at", -1)], "dept_created_idx", {}),

    # 4. Search by customer (regex used; index helps when prefix-anchored)
    ("enquiries", [("customer_name", 1)], "customer_idx", {}),

    # ENQUIRY HISTORY — exploding fast as users do their work
    # Every enquiry detail page does a find by enquiry_id
    ("enquiry_history", [("enquiry_id", 1), ("changed_at", -1)], "enq_changed_idx", {}),

    # USERS — login + assignment lookups
    ("users", [("email", 1)], "email_idx", {"unique": True}),
    ("users", [("_id", 1), ("is_active", 1)], "id_active_idx", {}),

    # STAGES / DEPARTMENTS / CUSTOMERS / FABRIC TYPES — small but find_one by id
    ("stages", [("id", 1)], "id_idx", {"unique": True}),
    ("departments", [("name", 1)], "name_idx", {"unique": True}),
    ("customers", [("name", 1)], "name_idx", {}),
    ("fabric_types", [("name", 1)], "name_idx", {}),

    # FILES — looked up by storage_path on every image GET
    ("files", [("storage_path", 1), ("is_deleted", 1)], "storage_deleted_idx", {}),

    # WEBAUTHN — biometric login lookup
    ("webauthn_credentials", [("user_id", 1)], "user_idx", {}),
    ("webauthn_credentials", [("credential_id", 1)], "credential_idx", {}),
]


async def create_all():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    print(f"Connected to {DB_NAME}\n")
    for coll, spec, name, opts in INDEXES:
        try:
            result = await db[coll].create_index(spec, name=name, background=True, **opts)
            print(f"  [OK]   {coll:25s} -> {name:30s} {spec}")
        except Exception as e:
            print(f"  [SKIP] {coll:25s} -> {name:30s} ({type(e).__name__}: {e})")
    print("\nDone. Verifying...\n")
    for coll, _, name, _ in INDEXES:
        indexes = await db[coll].list_indexes().to_list(50)
        names = [i["name"] for i in indexes]
        ok = "✓" if name in names else "✗"
        print(f"  {ok} {coll}.{name}")
    client.close()


async def drop_all():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    print("Dropping indexes created by this script...\n")
    for coll, _, name, _ in INDEXES:
        try:
            await db[coll].drop_index(name)
            print(f"  [OK]   {coll}.{name}")
        except Exception as e:
            print(f"  [SKIP] {coll}.{name} ({e})")
    client.close()


if __name__ == "__main__":
    if "--drop" in sys.argv:
        asyncio.run(drop_all())
    else:
        asyncio.run(create_all())
