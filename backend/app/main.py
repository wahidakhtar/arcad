from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
import os

from app.api.routes.auth import router as auth_router
from app.api.routes.project import router as project_router
from app.api.routes.mi import router as mi_router
from app.api.routes.badge import router as badge_router
from app.api.routes.fe import router as fe_router
from app.api.routes.finance import router as finance_router

from app.core.database import engine, Base
from app.core.security import get_password_hash
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
import app.models.rate_card
import app.models.badge_transition
import app.models.rate_card


app = FastAPI()

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

app.include_router(auth_router)
app.include_router(project_router)
app.include_router(mi_router)
app.include_router(badge_router)
app.include_router(fe_router)
app.include_router(finance_router)


@app.on_event("startup")
def startup():
    # ensure schemas
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS schema_core"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS schema_mi"))
        conn.commit()

    # create tables
    Base.metadata.create_all(bind=engine)

    # seed admin user
    with Session(engine) as db:
        existing_admin = db.query(User).filter(User.email == "admin@arcad.com").first()

        if not existing_admin:
            admin = User(
                name="Admin",
                email="admin@arcad.com",
                password_hash=get_password_hash("admin123")
            )
            db.add(admin)
            db.commit()


@app.get("/")
def root():
    return {"status": "arcad api running"}
