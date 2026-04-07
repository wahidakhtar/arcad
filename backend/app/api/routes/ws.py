from __future__ import annotations

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.core.ws_manager import manager
from app.models.hr import User

router = APIRouter(tags=["ws"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default=""),
    db: Session = Depends(get_db),
) -> None:
    # Validate token and confirm user is still active
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
        user = db.get(User, user_id)
        if user is None or not user.active:
            raise ValueError("Inactive or missing user")
    except Exception:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket)
    try:
        while True:
            # Discard incoming messages — connection is receive-only from server perspective.
            # Client may send "ping" keep-alives; we just drain them.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
