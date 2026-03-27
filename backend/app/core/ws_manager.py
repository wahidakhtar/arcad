from __future__ import annotations

import json
import logging
from typing import List

from fastapi import WebSocket

_log = logging.getLogger("arcad.ws")


class ConnectionManager:
    def __init__(self) -> None:
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)
        _log.info("ws: client connected (total=%d)", len(self.active))

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)
        _log.info("ws: client disconnected (total=%d)", len(self.active))

    async def broadcast(self, payload: dict) -> None:
        if not self.active:
            return
        data = json.dumps(payload)
        dead: List[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()
