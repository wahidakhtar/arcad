from __future__ import annotations

import logging
from datetime import date
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.acc import Invoice, PO
from app.models.core import Badge, Project
from app.services.common import get_site_model, get_subproject_model

logger = logging.getLogger(__name__)

PLACEHOLDER_PROJECTS = {"mi", "md", "ma", "mc", "bb"}
SUBPROJECT_PROJECTS = {"mi", "md", "ma", "mc"}


def _pending_doc_badge_id(db: Session) -> int:
    badge = db.execute(
        select(Badge).where(Badge.type == "doc_status", Badge.key == "pend")
    ).scalar_one_or_none()
    if badge is None:
        raise ValueError("doc_status badge with key='pend' not found in schema_core.badges")
    return badge.id


def create_site_po_if_needed(
    db: Session,
    project_key: str,
    project_id: int,
    site_id: int,
    subproject_id: int,
) -> None:
    if project_key not in PLACEHOLDER_PROJECTS:
        return
    try:
        subproject_model = get_subproject_model(project_key)
        subproject = db.get(subproject_model, subproject_id)
        if subproject is None or not getattr(subproject, "bucket", False):
            return

        if project_key == "bb":
            existing = db.execute(
                select(PO).where(PO.project_id == project_id, PO.site_id == site_id)
            ).scalar_one_or_none()
            if existing is not None:
                return

        pending_id = _pending_doc_badge_id(db)
        po = PO(
            project_id=project_id,
            site_id=site_id,
            subproject_id=None,
            entity_id=None,
            po_no=None,
            po_date=date.today(),
            period_from=None,
            period_to=None,
            po_status_id=pending_id,
            version=1,
        )
        db.add(po)
        db.flush()
    except Exception:
        logger.warning(
            "create_site_po_if_needed failed project=%s site_id=%s subproject_id=%s",
            project_key,
            site_id,
            subproject_id,
            exc_info=True,
        )


def create_subproject_po(
    db: Session,
    project_key: str,
    project_id: int,
    subproject_id: int,
) -> None:
    if project_key not in SUBPROJECT_PROJECTS:
        return
    try:
        pending_id = _pending_doc_badge_id(db)
        po = PO(
            project_id=project_id,
            site_id=None,
            subproject_id=subproject_id,
            entity_id=None,
            po_no=None,
            po_date=date.today(),
            period_from=None,
            period_to=None,
            po_status_id=pending_id,
            version=1,
        )
        db.add(po)
        db.flush()
    except Exception:
        logger.warning(
            "create_subproject_po failed project=%s subproject_id=%s",
            project_key,
            subproject_id,
            exc_info=True,
        )


def maybe_create_site_invoice(
    db: Session,
    project_key: str,
    project_id: int,
    site_id: int,
    subproject_id: int,
) -> None:
    """When a site in a bucket subproject reaches comp, create an invoice linked to its PO."""
    if project_key not in SUBPROJECT_PROJECTS:
        return
    try:
        subproject_model = get_subproject_model(project_key)
        subproject = db.get(subproject_model, subproject_id)
        if subproject is None or not getattr(subproject, "bucket", False):
            return

        po = db.execute(
            select(PO).where(PO.project_id == project_id, PO.site_id == site_id)
        ).scalar_one_or_none()
        if po is None:
            logger.warning(
                "maybe_create_site_invoice no PO found project=%s site_id=%s",
                project_key,
                site_id,
            )
            return

        existing_invoice = db.execute(
            select(Invoice).where(Invoice.po_id == po.id)
        ).scalar_one_or_none()
        if existing_invoice is not None:
            return

        pending_id = _pending_doc_badge_id(db)
        invoice = Invoice(
            po_id=po.id,
            invoice_no=None,
            submission_date=None,
            settlement_date=None,
            invoice_status_id=pending_id,
            version=1,
        )
        db.add(invoice)
        db.flush()
    except Exception:
        logger.warning(
            "maybe_create_site_invoice failed project=%s site_id=%s",
            project_key,
            site_id,
            exc_info=True,
        )


def maybe_create_subproject_invoice(
    db: Session,
    project_key: str,
    project_id: int,
    subproject_id: int,
) -> None:
    """When all sites in a subproject reach terminal state, create an invoice linked to the subproject PO."""
    try:
        site_model = get_site_model(project_key)
        sites = db.execute(
            select(site_model).where(site_model.subproject_id == subproject_id)
        ).scalars().all()
        if not sites:
            return

        if project_key == "bb":
            terminal_keys = {"live", "term"}
        else:
            terminal_keys = {"comp", "cancel"}

        terminal_badges = db.execute(
            select(Badge).where(Badge.type == "status", Badge.key.in_(terminal_keys))
        ).scalars().all()
        terminal_ids = {b.id for b in terminal_badges}

        if not all(site.status_id in terminal_ids for site in sites):
            return

        po = db.execute(
            select(PO).where(
                PO.project_id == project_id,
                PO.site_id.is_(None),
                PO.subproject_id == subproject_id,
            )
        ).scalar_one_or_none()
        if po is None:
            logger.warning(
                "maybe_create_subproject_invoice no PO found project=%s subproject_id=%s",
                project_key,
                subproject_id,
            )
            return

        existing_invoice = db.execute(
            select(Invoice).where(Invoice.po_id == po.id)
        ).scalar_one_or_none()
        if existing_invoice is not None:
            return

        pending_id = _pending_doc_badge_id(db)
        invoice = Invoice(
            po_id=po.id,
            invoice_no=None,
            submission_date=None,
            settlement_date=None,
            invoice_status_id=pending_id,
            version=1,
        )
        db.add(invoice)
        db.flush()
    except Exception:
        logger.warning(
            "maybe_create_subproject_invoice failed project=%s subproject_id=%s",
            project_key,
            subproject_id,
            exc_info=True,
        )
