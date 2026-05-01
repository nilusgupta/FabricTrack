#!/usr/bin/env python3
"""
FabricTrack Data Import Script
Imports JSON dump (created by export_data.py) into MongoDB Atlas.
Preserves _id and ObjectId references so cross-collection links survive.

Usage on EC2:
  cd /opt/fabrictrack
  source backend/venv/bin/activate
  python3 import_data.py [--wipe]

Flags:
  --wipe    drop each target collection before insert (DESTRUCTIVE)
"""
import os
import sys
from pymongo import MongoClient
from bson import json_util

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "fabrictrack")
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_export")

if not MONGO_URL:
    # Fall back to backend/.env
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env")
    if os.path.exists(env_path):
        for line in open(env_path):
            line = line.strip()
            if line.startswith("MONGO_URL"):
                MONGO_URL = line.split("=", 1)[1].strip().strip('"').strip("'")
            if line.startswith("DB_NAME"):
                DB_NAME = line.split("=", 1)[1].strip().strip('"').strip("'")

if not MONGO_URL:
    print("ERROR: MONGO_URL not set. Export it or put in backend/.env")
    sys.exit(1)

WIPE = "--wipe" in sys.argv

# Order matters for sanity (parents before children) - though all data is denormalized so order doesn't strictly matter
ORDER = [
    "counters", "users", "departments", "stages", "customers", "fabric_types",
    "enquiries", "enquiry_history", "files", "notifications", "webauthn_credentials",
    "login_attempts",
]

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Test connection
try:
    client.admin.command("ping")
    print(f"Connected to {MONGO_URL[:60]}... DB={DB_NAME}\n")
except Exception as e:
    print(f"ERROR: cannot connect: {e}")
    sys.exit(1)

if not os.path.isdir(DATA_DIR):
    print(f"ERROR: {DATA_DIR} not found. Place exported JSON files there.")
    sys.exit(1)

# Collect: ordered known collections first, then any extra files in folder
known = set(ORDER)
files_in_dir = [f[:-5] for f in os.listdir(DATA_DIR) if f.endswith(".json")]
extras = [c for c in files_in_dir if c not in known]
collections_to_import = ORDER + extras

total = 0
for coll_name in collections_to_import:
    path = os.path.join(DATA_DIR, f"{coll_name}.json")
    if not os.path.exists(path):
        continue

    with open(path, "r") as f:
        docs = json_util.loads(f.read())

    if not docs:
        print(f"  SKIP {coll_name} (empty file)")
        continue

    coll = db[coll_name]

    if WIPE:
        coll.drop()
        print(f"  WIPE {coll_name}")
    else:
        existing = coll.count_documents({})
        if existing > 0:
            print(f"  SKIP {coll_name} ({existing} docs already exist; use --wipe to overwrite)")
            continue

    try:
        result = coll.insert_many(docs, ordered=False)
        print(f"  OK   {coll_name}: {len(result.inserted_ids)} documents")
        total += len(result.inserted_ids)
    except Exception as e:
        print(f"  ERR  {coll_name}: {e}")

print(f"\nImport complete: {total} documents into '{DB_NAME}'")
client.close()
