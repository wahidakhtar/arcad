from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, select, func
from sqlalchemy.orm import Session
import os

from app.api.routes.auth import router as auth_router
from app.api.routes.project import router as project_router
from app.api.routes.badge import router as badge_router
from app.api.routes.fe import router as fe_router
from app.api.routes.finance import router as finance_router
from app.api.routes.project_fields import router as project_fields_router
from app.api.routes.project_sites import router as project_sites_router
from app.api.routes.users import router as users_router
from app.api.routes.setup import router as setup_router

from app.core.database import engine, Base
from app.models.user import User

# force model imports
import app.models.project
import app.models.user
import app.models.badge
import app.models.rate_card
import app.models.mi
import app.models.fe
import app.models.entity_type
import app.models.badge_entity_map
import app.models.badge_transition


app = FastAPI()

# -----------------------
# Environment
# -----------------------

API_PREFIX = os.getenv("API_PREFIX", "")

# -----------------------
# CORS
# -----------------------

origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]

if not origins:
    origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# Routers
# -----------------------

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(project_router, prefix=API_PREFIX)
app.include_router(project_sites_router, prefix=API_PREFIX)
app.include_router(badge_router, prefix=API_PREFIX)
app.include_router(fe_router, prefix=API_PREFIX)
app.include_router(finance_router, prefix=API_PREFIX)
app.include_router(project_fields_router, prefix=API_PREFIX)
app.include_router(setup_router, prefix=API_PREFIX)
app.include_router(users_router, prefix=API_PREFIX)

# -----------------------
# Startup
# -----------------------

@app.on_event("startup")
def startup():

    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS schema_core"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS schema_mi"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS schema_ma"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS schema_mc"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS schema_md"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS schema_bb"))
        conn.commit()

    Base.metadata.create_all(bind=engine)

# -----------------------
# Root
# -----------------------

@app.get(f"{API_PREFIX}/")
def root():

    with Session(engine) as db:
        user_count = db.scalar(select(func.count()).select_from(User))

    return {
        "status": "arcad api running",
        "setup_required": user_count == 0
    }