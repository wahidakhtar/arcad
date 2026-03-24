from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any


class _JSONFormatter(logging.Formatter):
    """Emit one JSON object per log record."""

    _STRUCTURED_KEYS = ("user_id", "action", "route", "status")

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level":     record.levelname,
            "logger":    record.name,
            "message":   record.getMessage(),
        }
        for key in self._STRUCTURED_KEYS:
            val = getattr(record, key, None)
            if val is not None:
                entry[key] = val
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry)


def configure_logging() -> None:
    """Install JSON formatter on the root logger. Call once at startup."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JSONFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def log_event(
    logger: logging.Logger,
    *,
    user_id: int | str | None,
    action: str,
    route: str,
    status: str,
    **extra: Any,
) -> None:
    """Emit a structured event log entry."""
    logger.info(
        "%s %s",
        action,
        status,
        extra={
            "user_id": user_id,
            "action":  action,
            "route":   route,
            "status":  status,
            **extra,
        },
    )
