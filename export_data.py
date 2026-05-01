#!/usr/bin/env python3
"""
FabricTrack Data Export Script
Run on the Emergent preview environment to dump all collections to JSON.
Preserves _id, ObjectId references, and dates via bson.json_util.

Usage:
  cd /app
  python3 export_data.py
Creates: /app/data_export/<collection>.json
"""
import os
import sys
from pymongo import MongoClient
from bson import json_util

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_export")

os.makedirs(OUT_DIR, exist_ok=True)

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

print(f"Source: {MONGO_URL}  DB: {DB_NAME}")
total = 0
for coll_name in db.list_collection_names():
    docs = list(db[coll_name].find({}))
    if not docs:
        print(f"  SKIP {coll_name} (empty)")
        continue
    out_path = os.path.join(OUT_DIR, f"{coll_name}.json")
    with open(out_path, "w") as f:
        # json_util encodes ObjectId, datetime, etc as Extended JSON
        f.write(json_util.dumps(docs, indent=2))
    print(f"  OK   {coll_name}: {len(docs)} documents -> {out_path}")
    total += len(docs)

print(f"\nExport complete: {total} documents in {OUT_DIR}")
client.close()
