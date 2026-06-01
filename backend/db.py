"""Shared MongoDB connection + GridFS helpers for CIVICSIGN."""
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
fs = AsyncIOMotorGridFSBucket(db)


async def upload_file(data: bytes, filename: str, content_type: str = "application/pdf") -> str:
    file_id = await fs.upload_from_stream(
        filename, data, metadata={"content_type": content_type}
    )
    return str(file_id)


async def download_file(file_id: str) -> bytes:
    grid_out = await fs.open_download_stream(ObjectId(file_id))
    return await grid_out.read()


async def delete_file(file_id: str) -> None:
    try:
        await fs.delete(ObjectId(file_id))
    except Exception:
        pass
