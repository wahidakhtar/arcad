from __future__ import annotations

import logging
from threading import Lock

import redis as _redis

from app.core.config import get_settings

_log = logging.getLogger("arcad.redis")

_UNSET = object()
_client: object = _UNSET  # redis.Redis | None
_client_lock = Lock()


def get_redis() -> _redis.Redis | None:  # type: ignore[type-arg]
    """Return shared Redis client, or None if Redis is unavailable."""
    global _client
    if _client is not _UNSET:
        return _client  # type: ignore[return-value]

    with _client_lock:
        if _client is not _UNSET:
            return _client  # type: ignore[return-value]
        try:
            settings = get_settings()
            r = _redis.Redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            r.ping()
            _client = r
            _log.info("Redis connected at %s", settings.redis_url)
        except Exception as exc:
            _log.warning("Redis unavailable (%s) — caching and rate limiting disabled", exc)
            _client = None
    return _client  # type: ignore[return-value]
