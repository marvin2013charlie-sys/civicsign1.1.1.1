"""Shared MongoDB connection + GridFS helpers for CivicSign."""
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']

# Works transparently for both a local `mongodb://` URL and a hosted
# `mongodb+srv://` MongoDB Atlas cluster. Atlas needs TLS + SRV (dnspython),
# both already handled by the driver. These options give fast failure on a
# bad/unreachable cluster and enable safe retryable writes.
client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=8000,
    connectTimeoutMS=8000,
    retryWrites=True,
    appname="civicsign",
)
db = client[os.environ['DB_NAME']]
fs = AsyncIOMotorGridFSBucket(db)


async def ping() -> bool:
    """Return True if the database is reachable (used by health checks)."""
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False


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
