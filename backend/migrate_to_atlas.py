"""Copy the CivicSign database from one MongoDB to another (e.g. local -> Atlas).

Pure-Python, self-contained: copies every collection including GridFS
(`fs.files` / `fs.chunks`) while preserving `_id`s, so envelope/template file
references stay valid. Safe to re-run — it upserts by `_id`.

Usage:
    # Source defaults to the current .env MONGO_URL/DB_NAME.
    .venv/bin/python migrate_to_atlas.py \
        --dest "mongodb+srv://USER:PASS@cluster.xxxx.mongodb.net/?retryWrites=true&w=majority" \
        --dest-db civicsign

    # Explicit source override:
    .venv/bin/python migrate_to_atlas.py --src "mongodb://localhost:27017" --src-db civicsign \
        --dest "<atlas-url>" --dest-db civicsign
"""
import argparse
import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne

load_dotenv(Path(__file__).parent / ".env")

BATCH = 500


async def copy_collection(src_db, dst_db, name):
    total = await src_db[name].count_documents({})
    if total == 0:
        print(f"  {name}: empty, skipped")
        return
    copied = 0
    ops = []
    async for doc in src_db[name].find({}):
        ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": doc}, upsert=True))
        if len(ops) >= BATCH:
            await dst_db[name].bulk_write(ops, ordered=False)
            copied += len(ops)
            ops = []
    if ops:
        await dst_db[name].bulk_write(ops, ordered=False)
        copied += len(ops)
    print(f"  {name}: {copied}/{total} copied")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    ap.add_argument("--src-db", default=os.environ.get("DB_NAME", "civicsign"))
    ap.add_argument("--dest", required=True, help="Destination MongoDB URL (Atlas mongodb+srv://...)")
    ap.add_argument("--dest-db", default=os.environ.get("DB_NAME", "civicsign"))
    args = ap.parse_args()

    src = AsyncIOMotorClient(args.src, serverSelectionTimeoutMS=8000)
    dst = AsyncIOMotorClient(args.dest, serverSelectionTimeoutMS=15000, retryWrites=True)
    src_db, dst_db = src[args.src_db], dst[args.dest_db]

    # Verify both endpoints before touching data.
    await src.admin.command("ping")
    await dst.admin.command("ping")
    print(f"source: {args.src_db}  ->  dest: {args.dest_db}")

    names = [c for c in await src_db.list_collection_names() if not c.startswith("system.")]
    # Copy GridFS chunks before files is fine (order-independent with upserts).
    for name in sorted(names):
        await copy_collection(src_db, dst_db, name)

    print("\nDone. Point backend/.env MONGO_URL at the destination and restart.")
    src.close()
    dst.close()


if __name__ == "__main__":
    asyncio.run(main())
