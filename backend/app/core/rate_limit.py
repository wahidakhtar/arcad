from __future__ import annotations

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.redis import get_redis

_log = logging.getLogger("arcad.rate_limit")

_LOGIN_LIMIT = 5      # per minute per IP
_WRITE_LIMIT  = 60    # per minute per user per resource
_WINDOW       = 60    # seconds


def _check(key: str, limit: int) -> bool:
    """Increment counter; return True if within limit, False if exceeded."""
    r = get_redis()
    if r is None:
        return True  # fail open when Redis unavailable
    try:
        count = r.incr(key)
        if count == 1:
            r.expire(key, _WINDOW)
        return count <= limit
    except Exception:
        return True


def _resource(path: str, api_prefix: str) -> str:
    """Extract first path component after the API prefix."""
    stripped = path.removeprefix(api_prefix).lstrip("/")
    return stripped.split("/")[0] or "root"


async def rate_limit_middleware(request: Request, call_next):
    from app.core.config import get_settings
    from app.core.security import decode_token

    prefix = get_settings().api_prefix
    path   = request.url.path
    method = request.method

    # ── Login: limit by IP ────────────────────────────────────────────────────
    if path == f"{prefix}/auth/login" and method == "POST":
        ip  = request.client.host if request.client else "unknown"
        key = f"rate:login:{ip}"
        if not _check(key, _LOGIN_LIMIT):
            _log.warning("Login rate limit hit — ip=%s", ip)
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many login attempts. Try again in 1 minute."},
            )

    # ── Write endpoints: limit by user + resource ─────────────────────────────
    elif method in ("POST", "PATCH", "DELETE"):
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            try:
                payload  = decode_token(auth[7:])
                user_id  = payload.get("sub", "anon")
                resource = _resource(path, prefix)
                key      = f"rate:{user_id}:{resource}"
                if not _check(key, _WRITE_LIMIT):
                    _log.warning("Write rate limit hit — user=%s resource=%s", user_id, resource)
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Rate limit exceeded. Try again in 1 minute."},
                    )
            except Exception:
                pass  # invalid token handled by auth layer

    return await call_next(request)
