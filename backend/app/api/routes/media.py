from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.auth import UserContext, get_current_user, permission_required
from app.core.database import get_db
from app.services import media as media_service

router = APIRouter(prefix="/media", tags=["media"])


@router.get("", dependencies=[Depends(permission_required("site", "read"))])
def list_media(site_id: int = Query(...), db: Session = Depends(get_db)):
    return media_service.list_media(db, site_id)


@router.post("/upload", dependencies=[Depends(permission_required("site", "write"))])
async def upload_media(
    project_key: str = Form(...),
    site_id: int = Form(...),
    caption: Optional[str] = Form(default=None),
    sequence_order: Optional[int] = Form(default=None),
    file: UploadFile = File(...),
    user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = await file.read()
    return media_service.save_media(db, project_key, site_id, user.user_id, file.filename, content, caption, sequence_order)
