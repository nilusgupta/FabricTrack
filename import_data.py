#!/usr/bin/env python3
"""
FabricTrack Data Import Script
Imports exported JSON data into MongoDB Atlas (or any MongoDB instance)

Usage on EC2:
  cd /opt/fabrictrack
  source backend/venv/bin/activate
  python3 import_data.py
"""
import asyncio
import json
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

# Atlas connection string
MONGO_URL = os.environ.get("MONGO_URL", "mongodb+srv://nilesh_emergent:Yukti16%40@tracker.gz9bhr.mongodb.net/?appName=Tracker")
DB_NAME = os.environ.get("DB_NAME", "fabrictrack")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_export")

# Collections to import (in order to handle dependencies)
COLLECTIONS = [
    "counters",
    "users",
    "departments",
    "stages",
    "customers",
    "fabric_types",
    "enquiries",
    "enquiry_history",
    "files",
    "notifications",
]

async def import_all():
    print(f"Connecting to MongoDB: {MONGO_URL[:50]}...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Test connection
    try:
        await client.admin.command("ping")
        print("Connected to MongoDB Atlas successfully!\n")
    except Exception as e:
        print(f"ERROR: Cannot connect to MongoDB: {e}")
        sys.exit(1)
    
    total_imported = 0
    
    for coll_name in COLLECTIONS:
        filepath = os.path.join(DATA_DIR, f"{coll_name}.json")
        if not os.path.exists(filepath):
            print(f"  SKIP {coll_name} (file not found)")
            continue
        
        with open(filepath, "r") as f:
            docs = json.load(f)
        
        if not docs:
            print(f"  SKIP {coll_name} (empty)")
            continue
        
        # Check if collection already has data
        existing_count = await db[coll_name].count_documents({})
        if existing_count > 0:
            print(f"  SKIP {coll_name} ({existing_count} docs already exist - won't overwrite)")
            continue
        
        # Insert documents
        try:
            # Remove _id to let MongoDB generate new ones (avoids conflicts)
            for doc in docs:
                if "_id" in doc:
                    del doc["_id"]
            
            result = await db[coll_name].insert_many(docs)
            print(f"  OK   {coll_name}: {len(result.inserted_ids)} documents imported")
            total_imported += len(result.inserted_ids)
        except Exception as e:
            print(f"  ERR  {coll_name}: {e}")
    
    print(f"\n{'='*50}")
    print(f"Import complete! {total_imported} total documents imported to '{DB_NAME}'")
    print(f"{'='*50}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(import_all())
