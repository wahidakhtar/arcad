from __future__ import annotations

import json
import logging
from typing import Any

from app.core.redis import get_redis

_log = logging.getLogger("arcad.cache")

ME_TTL = 60
PROJECTS_TTL = 60


# ─── Key builders ─────────────────────────────────────────────────────────────

def session_key(token_hash: str) -> str:
    return f"session:{token_hash}"


def me_key(user_id: int) -> str:
    return f"user:{user_id}:me"


def projects_key(user_id: int) -> str:
    return f"user:{user_id}:projects"


# ─── Generic get / set / delete ───────────────────────────────────────────────

def cache_get(key: str) -> Any | None:
    r = get_redis()
    if r is None:
        return None
    try:
        raw = r.get(key)
        return json.loads(raw) if raw is not None else None
    except Exception:
        _log.debug("cache_get failed for %s", key)
        return None


def cache_set(key: str, value: Any, ttl: int) -> None:
    r = get_redis()
    if r is None:
        return
    try:
        r.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        _log.debug("cache_set failed for %s", key)


def cache_delete(*keys: str) -> None:
    r = get_redis()
    if r is None:
        return
    try:
        r.delete(*keys)
    except Exception:
        _log.debug("cache_delete failed")


# ─── Compound helpers ─────────────────────────────────────────────────────────

def invalidate_user(user_id: int) -> None:
    """Evict all per-user response caches."""
    cache_delete(me_key(user_id), projects_key(user_id))
