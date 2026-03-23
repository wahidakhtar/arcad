from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routes.admin import router as admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.badges import router as badges_router
from app.api.routes.billing import router as billing_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.media import router as media_router
from app.api.routes.projects import router as projects_router
from app.api.routes.reports import router as reports_router
from app.api.routes.setup import router as setup_router
from app.api.routes.sites import router as sites_router
from app.api.routes.states import router as states_router
from app.api.routes.tickets import router as tickets_router
from app.api.routes.transactions import router as transactions_router
from app.api.routes.updates import router as updates_router
from app.api.routes.roles import router as roles_router
from app.api.routes.users import router as users_router
from app.core.config import get_settings
from app.core.database import engine, get_db
from app.core.errors import PermissionDenied
from app.models.hr import User
from app.services import acc_rules

_scheduler_log = logging.getLogger("arcad.scheduler")

import app.models.acc  # noqa: F401
import app.models.auth  # noqa: F401
import app.models.bb  # noqa: F401
import app.models.core  # noqa: F401
import app.models.ma  # noqa: F401
import app.models.mc  # noqa: F401
import app.models.md  # noqa: F401
import app.models.media  # noqa: F401
import app.models.mi  # noqa: F401
import app.models.ops  # noqa: F401
import app.models.updates  # noqa: F401

settings = get_settings()


async def _daily_expiry_loop() -> None:
    """Run expire_bb_pos once per day at midnight IST (UTC+5:30)."""
    IST_OFFSET = timedelta(hours=5, minutes=30)
    while True:
        now_ist = datetime.now(timezone.utc) + IST_OFFSET
        # Seconds until next midnight IST
        next_midnight = (now_ist + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        sleep_secs = (next_midnight - now_ist).total_seconds()
        _scheduler_log.info("expire_bb_pos: next run in %.0f seconds", sleep_secs)
        await asyncio.sleep(sleep_secs)
        try:
            db = next(get_db())
            expired = acc_rules.expire_bb_pos(db)
            _scheduler_log.info("expire_bb_pos: expired %d POs", expired)
        except Exception:
            _scheduler_log.exception("expire_bb_pos scheduler error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_daily_expiry_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="ARCAD", lifespan=lifespan)


@app.exception_handler(PermissionDenied)
async def permission_denied_handler(request: Request, exc: PermissionDenied) -> JSONResponse:
    return JSONResponse(status_code=403, content={"detail": str(exc)})

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(badges_router, prefix=settings.api_prefix)
app.include_router(setup_router, prefix=settings.api_prefix)
app.include_router(users_router, prefix=settings.api_prefix)
app.include_router(roles_router, prefix=settings.api_prefix)
app.include_router(projects_router, prefix=settings.api_prefix)
app.include_router(sites_router, prefix=settings.api_prefix)
app.include_router(states_router, prefix=settings.api_prefix)
app.include_router(transactions_router, prefix=settings.api_prefix)
app.include_router(billing_router, prefix=settings.api_prefix)
app.include_router(tickets_router, prefix=settings.api_prefix)
app.include_router(updates_router, prefix=settings.api_prefix)
app.include_router(media_router, prefix=settings.api_prefix)
app.include_router(reports_router, prefix=settings.api_prefix)
app.include_router(dashboard_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)


@app.get(f"{settings.api_prefix}/")
def root():
    with Session(engine) as db:
        user_count = db.scalar(select(func.count()).select_from(User)) or 0
    return {"status": "arcad api running", "setup_required": user_count == 0}
