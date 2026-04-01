from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import delete, select
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


def set_bb_site_live_if_needed(db: Session, site_id: int) -> None:
    from app.models.bb import BBSite

    site = db.get(BBSite, site_id)
    if site is None:
        return
    down_id = _get_badge_id(db, "status", "down")
    live_id = _get_badge_id(db, "status", "live")
    if site.status_id != down_id:
        return
    site.status_id = live_id
    if hasattr(site, "version"):
        site.version = (site.version or 0) + 1
    db.flush()


def create_bb_site_po(db: Session, site_id: int) -> None:
    """Create a pending PO for a new BB site. No-op if site is already terminated or PO exists."""
    try:
        if _is_bb_site_terminated(db, site_id):
            logger.info("create_bb_site_po skipped — site %s is terminated", site_id)
            return

        project_id = _bb_project_id(db)
        pending_id = _pending_doc_badge_id(db)
        existing = db.execute(
            select(PO).where(PO.project_id == project_id, PO.site_id == site_id, PO.po_status_id == pending_id)
        ).scalar_one_or_none()
        if existing is not None:
            return

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


def _bb_pending_po(db: Session, site_id: int) -> PO | None:
    project_id = _bb_project_id(db)
    pending_id = _pending_doc_badge_id(db)
    return db.execute(
        select(PO)
        .where(PO.project_id == project_id, PO.site_id == site_id, PO.po_status_id == pending_id)
        .order_by(PO.id.desc())
    ).scalars().first()


def _bb_has_invoice_placeholder(db: Session, po_id: int) -> bool:
    return db.execute(
        select(Invoice).where(Invoice.po_id == po_id, Invoice.invoice_no.is_(None), Invoice.invoice_date.is_(None))
    ).scalar_one_or_none() is not None


def _bb_latest_invoice(db: Session, po_id: int) -> Invoice | None:
    invoices = db.execute(select(Invoice).where(Invoice.po_id == po_id).order_by(Invoice.id.asc())).scalars().all()
    if not invoices:
        return None
    return max(invoices, key=lambda invoice: (invoice.period_to or invoice.period_from or date.min, invoice.id))


def ensure_bb_invoice_placeholder(db: Session, po: PO, *, as_of: date | None = None) -> Invoice | None:
    if po.site_id is None or po.valid_from is None or po.valid_to is None:
        return None
    if _is_bb_site_terminated(db, po.site_id):
        return None
    if _bb_has_invoice_placeholder(db, po.id):
        return None

    as_of = as_of or date.today()
    pending_id = _pending_doc_badge_id(db)
    latest = _bb_latest_invoice(db, po.id)
    next_period_from = po.valid_from if latest is None else ((latest.period_to or latest.period_from) + timedelta(days=1) if (latest.period_to or latest.period_from) else None)
    if next_period_from is None or next_period_from > po.valid_to or as_of < next_period_from:
        return None

    invoice = Invoice(
        po_id=po.id,
        invoice_no=None,
        invoice_date=None,
        period_from=next_period_from,
        period_to=None,
        submission_date=None,
        settlement_date=None,
        invoice_status_id=pending_id,
        version=1,
    )
    db.add(invoice)
    db.flush()
    return invoice


def sync_bb_po_activation(db: Session, po: PO) -> PO:
    if po.site_id is None:
        return po
    po.po_status_id = _get_badge_id(db, "doc_status", "act")
    db.flush()
    ensure_bb_invoice_placeholder(db, po, as_of=po.valid_from)
    return po


def activate_bb_po(db: Session, po_id: int, valid_from: date, valid_to: date) -> PO:
    po = db.get(PO, po_id)
    if po is None:
        raise ValueError(f"PO id={po_id} not found")
    po.valid_from = valid_from
    po.valid_to = valid_to
    return sync_bb_po_activation(db, po)


def create_bb_recharge_request(db: Session, transaction_id: int, site_id: int, amount, validity: int, months: bool) -> None:
    from app.models.bb import Recharge, RechargeRequest

    recharge = Recharge(
        site_id=site_id,
        date=None,
        amount=amount,
        validity=validity,
        months=months,
        next_recharge_date=None,
    )
    db.add(recharge)
    db.flush()
    row = RechargeRequest(
        transaction_id=transaction_id,
        site_id=site_id,
        validity=validity,
        months=months,
        recharge_id=recharge.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.flush()


def clear_bb_recharge_request(db: Session, transaction_id: int) -> None:
    from app.models.bb import Recharge, RechargeRequest

    request_row = db.execute(select(RechargeRequest).where(RechargeRequest.transaction_id == transaction_id)).scalar_one_or_none()
    if request_row is None:
        return

    recharge_id = request_row.recharge_id
    db.execute(delete(RechargeRequest).where(RechargeRequest.id == request_row.id))
    if recharge_id is not None:
        db.execute(delete(Recharge).where(Recharge.id == recharge_id, Recharge.date.is_(None)))


def sync_bb_recharge_for_executed_transaction(db: Session, tx) -> None:
    from app.models.bb import Recharge, RechargeRequest

    request_row = db.execute(select(RechargeRequest).where(RechargeRequest.transaction_id == tx.id)).scalar_one_or_none()
    if request_row is None:
        return
    if tx.execution_date is None:
        return
    if _is_bb_site_terminated(db, request_row.site_id):
        return

    if request_row.months:
        month = tx.execution_date.month - 1 + request_row.validity
        year = tx.execution_date.year + month // 12
        month = month % 12 + 1
        day = min(tx.execution_date.day, __import__("calendar").monthrange(year, month)[1])
        next_recharge_date = date(year, month, day)
    else:
        next_recharge_date = tx.execution_date + timedelta(days=request_row.validity)

    recharge = db.get(Recharge, request_row.recharge_id) if request_row.recharge_id is not None else None
    if recharge is None:
        recharge = Recharge(
            site_id=request_row.site_id,
            date=None,
            amount=tx.amount,
            validity=request_row.validity,
            months=request_row.months,
            next_recharge_date=None,
        )
        db.add(recharge)
        db.flush()
        request_row.recharge_id = recharge.id

    recharge.amount = tx.amount
    recharge.date = tx.execution_date
    recharge.validity = request_row.validity
    recharge.months = request_row.months
    recharge.next_recharge_date = next_recharge_date
    set_bb_site_live_if_needed(db, request_row.site_id)


def ensure_bb_placeholder_invoices(db: Session, *, as_of: date | None = None) -> int:
    project_id = _bb_project_id(db)
    as_of = as_of or date.today()
    created = 0
    pos = db.execute(
        select(PO).where(PO.project_id == project_id, PO.site_id.is_not(None), PO.valid_from.is_not(None), PO.valid_to.is_not(None))
    ).scalars().all()
    for po in pos:
        if ensure_bb_invoice_placeholder(db, po, as_of=as_of) is not None:
            created += 1
    return created


def ensure_bb_placeholder_pos(db: Session, *, as_of: date | None = None) -> int:
    from app.models.bb import BBSite

    project_id = _bb_project_id(db)
    as_of = as_of or date.today()
    created = 0
    sites = db.execute(select(BBSite)).scalars().all()
    pending_id = _pending_doc_badge_id(db)
    for site in sites:
        if _is_bb_site_terminated(db, site.id):
            continue
        has_pending = db.execute(
            select(PO).where(PO.project_id == project_id, PO.site_id == site.id, PO.po_status_id == pending_id)
        ).scalar_one_or_none()
        if has_pending is not None:
            continue
        latest = db.execute(
            select(PO).where(PO.project_id == project_id, PO.site_id == site.id).order_by(PO.valid_to.desc().nullslast(), PO.id.desc())
        ).scalars().first()
        if latest is None or latest.valid_to is None or as_of <= latest.valid_to:
            continue
        create_bb_site_po(db, site.id)
        created += 1
    return created


def run_bb_daily_rollover(db: Session) -> dict[str, int]:
    placeholders = ensure_bb_placeholder_invoices(db)
    future_pos = ensure_bb_placeholder_pos(db)
    expired = expire_bb_pos(db)
    if placeholders or future_pos:
        db.commit()
    return {"invoice_placeholders": placeholders, "po_placeholders": future_pos, "expired_pos": expired}


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
