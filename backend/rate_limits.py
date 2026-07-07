"""Shared SlowAPI rate limiter — must be a single instance bound to the FastAPI app."""
from slowapi import Limiter
from slowapi.util import get_remote_address

from security_utils import is_dev_mode

limiter = Limiter(key_func=get_remote_address)


def auth_limit(production: str, development: str = "200/hour") -> str:
    """Relaxed limits in DEV_MODE so local testing isn't blocked after a few tries."""
    return development if is_dev_mode() else production


def poll_limit(production: str = "120/minute", development: str = "600/minute") -> str:
    """Higher limits for 2s UI polling — avoids spurious 429s after ~30 requests/min."""
    return development if is_dev_mode() else production