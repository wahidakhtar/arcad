from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.api.auth import permission_required
from app.core.database import get_db
from app.services import reports as report_service

router = APIRouter(prefix="/reports", tags=["reports"])

TEMPLATE_MAP = {"wcc": "wcc.html", "tx_copy": "tx_copy.html", "fsr": "fsr.html", "report": "report.html"}


@router.get("/generate", response_class=HTMLResponse, dependencies=[Depends(permission_required("site", "read"))])
def generate_report(site_id: int = Query(...), type: str = Query(...), db: Session = Depends(get_db)):
    template_name = TEMPLATE_MAP.get(type)
    if template_name is None:
        raise HTTPException(status_code=400, detail="Unsupported report type")
    return report_service.render_report(template_name, {"site_id": site_id, "report_type": type})
