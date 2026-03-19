from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

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
from app.api.routes.users import router as users_router
from app.core.config import get_settings
from app.core.database import engine
from app.models.hr import User

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
app = FastAPI(title="ARCAD")

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


@app.get(f"{settings.api_prefix}/")
def root():
    with Session(engine) as db:
        user_count = db.scalar(select(func.count()).select_from(User)) or 0
    return {"status": "arcad api running", "setup_required": user_count == 0}
