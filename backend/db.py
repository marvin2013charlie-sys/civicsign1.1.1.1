"""Shared MongoDB connection + GridFS helpers for CivicSign."""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from bson import ObjectId

from document_crypto import (
    encrypt_document,
    decrypt_document,
    encryption_metadata,
    scope_from_metadata,
)

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
logger = logging.getLogger("civicsign.db")


async def ping() -> bool:
    """Return True if the database is reachable (used by health checks)."""
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False


async def _read_gridfs_bytes(file_id: str) -> tuple[bytes, dict]:
    try:
        grid_out = await fs.open_download_stream(ObjectId(file_id))
    except Exception as exc:
        raise FileNotFoundError(f"GridFS file not found: {file_id}") from exc
    data = await grid_out.read()
    metadata = grid_out.metadata or {}
    return data, metadata


async def upload_file(data: bytes, filename: str, content_type: str = "application/pdf") -> str:
    """Store non-document assets (avatars, branding) without envelope encryption."""
    file_id = await fs.upload_from_stream(
        filename, data, metadata={"content_type": content_type}
    )
    return str(file_id)


async def download_file(file_id: str) -> bytes:
    """Download plain (non-encrypted) GridFS objects."""
    data, _ = await _read_gridfs_bytes(file_id)
    return data


async def upload_document_file(
    data: bytes,
    filename: str,
    scope_type: str,
    scope_id: str,
    content_type: str = "application/pdf",
) -> str:
    """Encrypt and store a user document (envelope, template, temp merge)."""
    ciphertext = encrypt_document(data, scope_type, scope_id)
    meta = {
        "content_type": content_type,
        **encryption_metadata(scope_type, scope_id),
    }
    file_id = await fs.upload_from_stream(filename, ciphertext, metadata=meta)
    return str(file_id)


async def download_document_file(
    file_id: str,
    scope_type: str,
    scope_id: str,
) -> bytes:
    """Decrypt a document; transparently handles legacy unencrypted files."""
    raw, metadata = await _read_gridfs_bytes(file_id)
    meta_type, meta_id = scope_from_metadata(metadata)
    if metadata.get("encrypted"):
        if meta_type != scope_type or meta_id != scope_id:
            raise PermissionError("Document encryption scope mismatch")
        return decrypt_document(raw, scope_type, scope_id)
    # Legacy plaintext PDFs (pre-encryption deploy)
    return raw


async def delete_file(file_id: str) -> bool:
    try:
        await fs.delete(ObjectId(file_id))
        return True
    except Exception as exc:
        logger.warning(f"[db] failed to delete GridFS file {file_id}: {exc}")
        return False