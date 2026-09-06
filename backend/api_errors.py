"""Safe API errors that remain readable by the configured frontend origins."""
import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from security_utils import get_cors_origins, security_headers

logger = logging.getLogger("civicsign.api")


async def unhandled_api_error(request: Request, exc: Exception) -> JSONResponse:
    # ServerErrorMiddleware sits outside CORSMiddleware, so unhandled errors
    # otherwise lose CORS headers and appear as an opaque browser Network Error.
    logger.error("Unhandled API error on %s %s", request.method, request.url.path,
                 exc_info=(type(exc), exc, exc.__traceback__))
    headers = {**security_headers(), "Vary": "Origin"}
    origin = request.headers.get("origin")
    if origin and origin in get_cors_origins():
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "The server could not complete this request. Please try again or contact support."},
        headers=headers,
    )
