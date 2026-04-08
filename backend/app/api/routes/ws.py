from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.database import SessionLocal
from app.core.security import decode_token
from app.core.ws_manager import manager
from app.models.hr import User

router = APIRouter(tags=["ws"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    # Validate token and confirm user active with a short-lived DB session
    # (NOT Depends(get_db) — that would hold a connection open for the entire WS lifetime)
    # Token arrives via httpOnly cookie — browsers include cookies on same-origin WS connections.
    token = websocket.cookies.get("access_token", "")
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
        with SessionLocal() as db:
            user = db.get(User, user_id)
            if user is None or not user.active:
                raise ValueError("Inactive or missing user")
    except Exception:
        # Must accept before sending a close frame
        await websocket.accept()
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
