from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.routes.fe import router as fe_router
from app.api.routes.finance import router as finance_router

from app.api.routes.auth import router as auth_router
from app.api.routes.project import router as project_router
from app.api.routes.mi import router as mi_router
from app.api.routes.badge import router as badge_router

from app.core.database import engine, Base

# force model imports
import app.models.project
import app.models.user
import app.models.badge
import app.models.mi
import app.models.fe


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
def create_tables():
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS schema_core"))
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS schema_mi"))
        conn.commit()

    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"status": "arcad api running"}
