from __future__ import annotations

import json
import logging
from typing import Any

from app.core.redis import get_redis

_log = logging.getLogger("arcad.cache")

ME_TTL = 60
PROJECTS_TTL = 60
BADGES_TTL = 3600           # 1 hour — bust on badge write
GLOBAL_PROJECTS_TTL = 3600  # 1 hour — bust on project write
STATES_TTL = 86400 * 7      # 7 days — states never change
TRANSITIONS_TTL = 3600      # 1 hour — bust on transition write
DASHBOARD_SUMMARY_TTL = 300 # 5 minutes — TTL-based only


# ─── Key builders ─────────────────────────────────────────────────────────────

def session_key(token_hash: str) -> str:
    return f"session:{token_hash}"


def me_key(user_id: int) -> str:
    return f"user:{user_id}:me"


def projects_key(user_id: int) -> str:
    return f"user:{user_id}:projects"


def global_badges_key() -> str:
    return "global:badges"


def global_projects_key() -> str:
    return "global:projects"


def global_states_key() -> str:
    return "global:states"


def global_transitions_key(project_key: str) -> str:
    return f"global:transitions:{project_key}"


def dashboard_summary_key(user_id: int, project_key: str | None, range_key: str,
                          start: str | None, end: str | None) -> str:
    return f"dashboard:summary:{user_id}:{project_key or 'all'}:{range_key}:{start or ''}:{end or ''}"


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
