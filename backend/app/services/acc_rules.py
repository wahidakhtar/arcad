from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.acc import Invoice, PO
from app.models.core import Badge, Project
from app.services.common import get_site_model, get_subproject_model

logger = logging.getLogger(__name__)

PLACEHOLDER_PROJECTS = {"mi", "md", "ma", "mc"}
SUBPROJECT_PROJECTS = {"mi", "md", "ma", "mc"}


def _get_badge_id(db: Session, badge_type: str, key: str) -> int:
    badge = db.execute(
        select(Badge).where(Badge.type == badge_type, Badge.key == key)
    ).scalar_one_or_none()
    if badge is None:
        raise ValueError(f"Badge type={badge_type!r} key={key!r} not found in schema_core.badges")
    return badge.id


def _pending_doc_badge_id(db: Session) -> int:
    return _get_badge_id(db, "doc_status", "pend")


# ---------------------------------------------------------------------------
# BB billing
# ---------------------------------------------------------------------------

def _bb_project_id(db: Session) -> int:
    project = db.execute(
        select(Project).where(Project.key == "bb")
    ).scalar_one_or_none()
    if project is None:
        raise ValueError("Project with key='bb' not found")
    return project.id


def _is_bb_site_terminated(db: Session, site_id: int) -> bool:
    from app.models.bb import Termination
    return db.get(Termination, site_id) is not None


def create_bb_site_po(db: Session, site_id: int) -> None:
    """Create a pending PO for a new BB site. No-op if site is already terminated or PO exists."""
    try:
        if _is_bb_site_terminated(db, site_id):
            logger.info("create_bb_site_po skipped — site %s is terminated", site_id)
            return

        project_id = _bb_project_id(db)
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
            valid_from=None,
            valid_to=None,
            po_status_id=pending_id,
            version=1,
        )
        db.add(po)
        db.flush()
        logger.info("create_bb_site_po created po for site_id=%s", site_id)
    except Exception:
        logger.warning("create_bb_site_po failed site_id=%s", site_id, exc_info=True)


def activate_bb_po(db: Session, po_id: int, valid_from: date, valid_to: date) -> PO:
    """
    Activate a BB PO: set valid_from/valid_to/status=active.
    Auto-creates 4 quarterly invoice placeholders unless site is terminated.
    """
    po = db.get(PO, po_id)
    if po is None:
        raise ValueError(f"PO id={po_id} not found")

    active_id = _get_badge_id(db, "doc_status", "act")
    po.valid_from = valid_from
    po.valid_to = valid_to
    po.po_status_id = active_id
    db.flush()

    if po.site_id is not None and _is_bb_site_terminated(db, po.site_id):
        logger.info("activate_bb_po skipping invoice creation — site %s is terminated", po.site_id)
        return po

    pending_id = _pending_doc_badge_id(db)
    periods = [
        (valid_from,                  valid_from + timedelta(days=89)),
        (valid_from + timedelta(days=90), valid_from + timedelta(days=179)),
        (valid_from + timedelta(days=180), valid_from + timedelta(days=269)),
        (valid_from + timedelta(days=270), valid_to),
    ]
    for period_from, period_to in periods:
        invoice = Invoice(
            po_id=po.id,
            invoice_no=None,
            period_from=period_from,
            period_to=period_to,
            submission_date=None,
            settlement_date=None,
            invoice_status_id=pending_id,
            version=1,
        )
        db.add(invoice)

    db.flush()
    logger.info("activate_bb_po activated po_id=%s created 4 invoices", po_id)
    return po


def expire_bb_pos(db: Session) -> int:
    """
    Expire all BB POs where valid_to < today and status is not already
    expired (po_status:po_exp) and not pending (doc_status:pend).
    Returns number of POs expired.
    """
    try:
        project_id = _bb_project_id(db)
        exp_id = _get_badge_id(db, "po_status", "po_exp")
        pend_id = _get_badge_id(db, "doc_status", "pend")
        today = date.today()

        pos = db.execute(
            select(PO).where(
                PO.project_id == project_id,
                PO.valid_to < today,
                PO.po_status_id != exp_id,
                PO.po_status_id != pend_id,
            )
        ).scalars().all()

        for po in pos:
            po.po_status_id = exp_id

        if pos:
            db.commit()
            logger.info("expire_bb_pos expired %d POs", len(pos))

        return len(pos)
    except Exception:
        logger.warning("expire_bb_pos failed", exc_info=True)
        db.rollback()
        return 0


# ---------------------------------------------------------------------------
# General PO / invoice helpers (non-BB projects)
# ---------------------------------------------------------------------------

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
            valid_from=None,
            valid_to=None,
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
            valid_from=None,
            valid_to=None,
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
            period_from=None,
            period_to=None,
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
            period_from=None,
            period_to=None,
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
