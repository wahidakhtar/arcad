from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.fe import Finance
from app.domain.finance.finance_engine import compute_financials


# --------------------------------------------------
# RESOLVE PROJECT
# --------------------------------------------------

def resolve_project(project_code: str, db):

    project = db.execute(
        text("""
        SELECT id, code, site_schema
        FROM schema_core.project
        WHERE LOWER(code) = LOWER(:code)
        """),
        {"code": project_code}
    ).mappings().first()
    
    return project

# --------------------------------------------------
# RESOLVE PROJECT
# --------------------------------------------------

def resolve_project(project_code: str, db: Session):

    project = db.execute(
        text("""
        SELECT id, code, site_schema
        FROM schema_core.project
        WHERE LOWER(code) = LOWER(:code)
        """),
        {"code": project_code}
    ).mappings().first()

    return project


# --------------------------------------------------
# REQUEST PAYMENT
# --------------------------------------------------

def request_payment(project, payload, db: Session):

    entry = Finance(
        project_id=project["id"],
        site_id=payload.site_id,
        fe_id=payload.fe_id,
        type=payload.type,
        state="requested",
        amount=payload.amount,
        approval=payload.approval,
        execution_date=None
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


# --------------------------------------------------
# UPDATE FINANCE STATE
# --------------------------------------------------

def update_finance_state(finance_id, state, db: Session):

    entry = db.query(Finance).filter(Finance.id == finance_id).first()

    if not entry:
        return None

    entry.state = state

    db.commit()
    db.refresh(entry)

    return entry


# --------------------------------------------------
# GET SITE FINANCE
# --------------------------------------------------

def get_site_finance(project, site_id, db: Session):

    site = db.execute(
        text(f"""
        SELECT *
        FROM {project['site_schema']}.site
        WHERE id = :site_id
        """),
        {"site_id": site_id}
    ).mappings().first()

    if not site:
        return {
            "summary": {},
            "transactions": []
        }

    summary = compute_financials(
        project["code"],
        site,
        project["id"],
        db
    )

    rows = db.execute(
        text("""
        SELECT
            f.id,
            f.fe_id,
            u.name AS fe_name,
            f.amount,
            f.state,
            f.type,
            f.approval
        FROM schema_core.finance f
        LEFT JOIN schema_core.user u
            ON u.id = f.fe_id
        WHERE f.project_id = :project_id
        AND f.site_id = :site_id
        ORDER BY f.id
        """),
        {
            "project_id": project["id"],
            "site_id": site_id
        }
    ).mappings().all()

    transactions = [
        {
            "id": r["id"],
            "fe_id": r["fe_id"],
            "fe_name": r["fe_name"],
            "amount": float(r["amount"]),
            "state": r["state"],
            "type": r["type"],
            "approval": r["approval"]
        }
        for r in rows
    ]

    return {
        "summary": summary,
        "transactions": transactions
    }


# --------------------------------------------------
# RATE CARD
# --------------------------------------------------

def get_rate_card_list(db: Session):

    rows = db.execute(
        text("""
        SELECT
            j.job_name,
            r.effective_date,
            r.unit_cost
        FROM schema_core.rate_card r
        JOIN schema_core.job_master j
            ON j.id = r.job_id
        WHERE r.is_active = TRUE
        ORDER BY j.job_name
        """)
    ).mappings().all()

    return rows


# --------------------------------------------------
# FINANCE REQUEST LIST
# --------------------------------------------------

def get_finance_requests(db: Session):

    rows = db.execute(
        text("""
        SELECT
            f.id,
            f.project_id,
            f.site_id,
            f.type,
            f.state,
            f.amount,
            f.approval,
            f.execution_date,
            u.name AS fe_name
        FROM schema_core.finance f
        LEFT JOIN schema_core.user u
            ON u.id = f.fe_id
        WHERE f.state = 'requested'
        ORDER BY f.id DESC
        """)
    ).mappings().all()

    return rows


# --------------------------------------------------
# PO / INVOICE
# --------------------------------------------------

def get_po_invoice_list(db: Session):

    rows = db.execute(
        text("""
        SELECT
            id,
            po_number,
            invoice_number,
            amount,
            state
        FROM schema_core.po_invoice
        ORDER BY id DESC
        """)
    ).mappings().all()

    return rows


def update_po_invoice_state(po_id, state, db: Session):

    db.execute(
        text("""
        UPDATE schema_core.po_invoice
        SET state = :state
        WHERE id = :id
        """),
        {"state": state, "id": po_id}
    )

    db.commit()

    row = db.execute(
        text("""
        SELECT id, po_number, invoice_number, amount, state
        FROM schema_core.po_invoice
        WHERE id = :id
        """),
        {"id": po_id}
    ).mappings().first()

    return row

    return project


# --------------------------------------------------
# REQUEST PAYMENT
# --------------------------------------------------

def request_payment(project, payload, db):

    entry = Finance(
        project_id=project["id"],
        site_id=payload.site_id,
        fe_id=payload.fe_id,
        type=payload.type,
        state="requested",
        amount=payload.amount,
        approval=payload.approval,
        execution_date=None
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


# --------------------------------------------------
# UPDATE FINANCE STATE
# --------------------------------------------------

def update_finance_state(finance_id, state, db):

    entry = db.query(Finance).filter(Finance.id == finance_id).first()

    if not entry:
        return None

    entry.state = state

    db.commit()
    db.refresh(entry)

    return entry


# --------------------------------------------------
# GET SITE FINANCE
# --------------------------------------------------

def get_site_finance(project, site_id, db):

    site = db.execute(
        text(f"""
        SELECT *
        FROM {project['site_schema']}.site
        WHERE id = :site_id
        """),
        {"site_id": site_id}
    ).mappings().first()

    if not site:
        return {
            "summary": {},
            "transactions": []
        }

    summary = compute_financials(
        project["code"],
        site,
        project["id"],
        db
    )

    rows = db.execute(
        text("""
        SELECT
            f.id,
            f.fe_id,
            u.name AS fe_name,
            f.amount,
            f.state,
            f.type,
            f.approval
        FROM schema_core.finance f
        LEFT JOIN schema_core.user u
            ON u.id = f.fe_id
        WHERE f.project_id = :project_id
        AND f.site_id = :site_id
        ORDER BY f.id
        """),
        {
            "project_id": project["id"],
            "site_id": site_id
        }
    ).mappings().all()

    transactions = [
        {
            "id": r["id"],
            "fe_id": r["fe_id"],
            "fe_name": r["fe_name"],
            "amount": float(r["amount"]),
            "state": r["state"],
            "type": r["type"],
            "approval": r["approval"]
        }
        for r in rows
    ]

    return {
        "summary": summary,
        "transactions": transactions
    }


# --------------------------------------------------
# PO / INVOICE
# --------------------------------------------------

def get_po_invoice_list(db):

    rows = db.execute(
        text("""
        SELECT
            id,
            po_number,
            invoice_number,
            amount,
            state
        FROM schema_core.po_invoice
        ORDER BY id DESC
        """)
    ).mappings().all()

    return rows


def update_po_invoice_state(po_id, state, db):

    db.execute(
        text("""
        UPDATE schema_core.po_invoice
        SET state = :state
        WHERE id = :id
        """),
        {"state": state, "id": po_id}
    )

    db.commit()

    row = db.execute(
        text("""
        SELECT id, po_number, invoice_number, amount, state
        FROM schema_core.po_invoice
        WHERE id = :id
        """),
        {"id": po_id}
    ).mappings().first()

    return row