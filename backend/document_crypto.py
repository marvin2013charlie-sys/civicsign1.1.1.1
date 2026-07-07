"""AES-256-GCM encryption for user documents stored in GridFS."""
import base64
import hashlib
import logging
import os
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger("civicsign.document_crypto")

_NONCE_BYTES = 12
_SCOPE_SALT = b"civicsign-doc-v1"


def _master_key() -> bytes:
    raw = (os.environ.get("DOCUMENT_ENCRYPTION_KEY") or "").strip()
    if raw:
        try:
            key = base64.urlsafe_b64decode(raw + "==")
        except Exception:
            key = base64.b64decode(raw)
        if len(key) != 32:
            raise RuntimeError("DOCUMENT_ENCRYPTION_KEY must decode to 32 bytes")
        return key
    # Dev fallback — derive from JWT secret so local installs work without extra env.
    jwt_secret = os.environ.get("JWT_SECRET", "")
    if not jwt_secret:
        raise RuntimeError("DOCUMENT_ENCRYPTION_KEY or JWT_SECRET must be set")
    return hashlib.sha256((jwt_secret + ":documents").encode()).digest()


def derive_scope_key(scope_type: str, scope_id: str) -> bytes:
    """Deterministic per-scope key so only holders of scope_id can decrypt."""
    material = f"{scope_type}:{scope_id}".encode("utf-8")
    return hashlib.sha256(_SCOPE_SALT + _master_key() + material).digest()


def encrypt_document(plaintext: bytes, scope_type: str, scope_id: str) -> bytes:
    if not plaintext:
        return b""
    key = derive_scope_key(scope_type, scope_id)
    nonce = os.urandom(_NONCE_BYTES)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, scope_id.encode("utf-8"))
    return nonce + ciphertext


def decrypt_document(blob: bytes, scope_type: str, scope_id: str) -> bytes:
    if not blob:
        return b""
    if len(blob) < _NONCE_BYTES + 16:
        raise ValueError("Ciphertext too short")
    key = derive_scope_key(scope_type, scope_id)
    nonce, ciphertext = blob[:_NONCE_BYTES], blob[_NONCE_BYTES:]
    return AESGCM(key).decrypt(nonce, ciphertext, scope_id.encode("utf-8"))


def encryption_metadata(scope_type: str, scope_id: str) -> dict:
    return {
        "encrypted": True,
        "enc_scope_type": scope_type,
        "enc_scope_id": scope_id,
        "enc_version": 1,
    }


def scope_from_metadata(metadata: Optional[dict]) -> tuple[Optional[str], Optional[str]]:
    if not metadata or not metadata.get("encrypted"):
        return None, None
    return metadata.get("enc_scope_type"), metadata.get("enc_scope_id")