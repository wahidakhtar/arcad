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
from app.api.routes.admin_schema import router as admin_schema_router
from app.api.routes.error_log import router as error_log_router
from app.api.routes.ws import router as ws_router
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
from app.api.routes.subcons import router as subcons_router
from app.api.routes.tickets import router as tickets_router
from app.api.routes.transactions import router as transactions_router
from app.api.routes.updates import router as updates_router
from app.api.routes.roles import router as roles_router
from app.api.routes.me import router as me_router
from app.api.routes.users import router as users_router
from app.core.config import get_settings
from app.core.database import engine, get_db
from app.core.errors import PermissionDenied
from app.core.logging import configure_logging
from app.core.rate_limit import rate_limit_middleware
from app.models.hr import User
from app.services import acc_rules
from app.services import backup as backup_service

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
configure_logging()


async def _daily_expiry_loop() -> None:
    """Run BB rollover jobs once per day at midnight IST (UTC+5:30)."""
    IST_OFFSET = timedelta(hours=5, minutes=30)
    while True:
        now_ist = datetime.now(timezone.utc) + IST_OFFSET
        # Seconds until next midnight IST
        next_midnight = (now_ist + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        sleep_secs = (next_midnight - now_ist).total_seconds()
        _scheduler_log.info("bb_rollover: next run in %.0f seconds", sleep_secs)
        await asyncio.sleep(sleep_secs)
        try:
            db = next(get_db())
            result = acc_rules.run_bb_daily_rollover(db)
            _scheduler_log.info(
                "bb_rollover: invoice_placeholders=%d po_placeholders=%d expired_pos=%d",
                result["invoice_placeholders"],
                result["po_placeholders"],
                result["expired_pos"],
            )
        except Exception:
            _scheduler_log.exception("bb_rollover scheduler error")


async def _daily_backup_loop() -> None:
    """Run backup every day at 18:00 IST (12:30 UTC)."""
    IST_OFFSET = timedelta(hours=5, minutes=30)
    TARGET_HOUR_IST = 18
    while True:
        now_ist = datetime.now(timezone.utc) + IST_OFFSET
        next_run = now_ist.replace(hour=TARGET_HOUR_IST, minute=0, second=0, microsecond=0)
        if next_run <= now_ist:
            next_run += timedelta(days=1)
        sleep_secs = (next_run - now_ist).total_seconds()
        _scheduler_log.info("backup: next run in %.0f seconds", sleep_secs)
        await asyncio.sleep(sleep_secs)
        try:
            db = next(get_db())
            result = backup_service.run_backup(db)
            _scheduler_log.info(
                "backup: done restore=%s (%s KB) excel=%s (%s KB) deleted=%d",
                result["restore_file"], result["restore_size_kb"],
                result["excel_file"], result["excel_size_kb"],
                result["deleted_old"],
            )
        except Exception:
            _scheduler_log.exception("backup scheduler error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import os
    tasks = [asyncio.create_task(_daily_expiry_loop())]
    # Only the active slot should run the backup to avoid backing up the test DB
    if os.environ.get("APP_SLOT") == os.environ.get("ACTIVE_SLOT"):
        tasks.append(asyncio.create_task(_daily_backup_loop()))
        _scheduler_log.info("backup loop started (slot=%s)", os.environ.get("APP_SLOT"))
    else:
        _scheduler_log.info("backup loop skipped (slot=%s is not active)", os.environ.get("APP_SLOT"))
    yield
    for task in tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="ARCAD", lifespan=lifespan)
app.middleware("http")(rate_limit_middleware)


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
app.include_router(me_router, prefix=settings.api_prefix)
app.include_router(badges_router, prefix=settings.api_prefix)
app.include_router(setup_router, prefix=settings.api_prefix)
app.include_router(users_router, prefix=settings.api_prefix)
app.include_router(roles_router, prefix=settings.api_prefix)
app.include_router(projects_router, prefix=settings.api_prefix)
app.include_router(subcons_router, prefix=settings.api_prefix)
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
app.include_router(admin_schema_router, prefix=settings.api_prefix)
app.include_router(error_log_router, prefix=settings.api_prefix)
app.include_router(ws_router, prefix=settings.api_prefix)


@app.get(f"{settings.api_prefix}/")
def root():
    with Session(engine) as db:
        user_count = db.scalar(select(func.count()).select_from(User)) or 0
    return {"status": "arcad api running", "setup_required": user_count == 0}
