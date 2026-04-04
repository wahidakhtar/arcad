from __future__ import annotations

PROJECT_KEY = "ma"

fields = [
    "receiving_date", "ckt_id", "customer", "address", "state_id", "lc", "height",
    "permission_date", "status", "followup_date", "mpaint", "mnbr", "arr", "ep", "ec",
    "audit_date", "wcc_status", "report_status", "budget", "cost", "paid", "balance",
    "po_number", "po_status", "invoice_number", "invoice_status",
]
form_fields = ["receiving_date", "ckt_id", "customer", "address", "state_id", "height"]
bulk_columns = ["ckt_id", "customer", "address", "state_id", "height"]
budget_params = {"bucket_key": "bma"}
system_status_triggers = {
    "permission_date:set": {"status_key": "wip"},
    "status_key:hold": {"clear": ["permission_date"]},
    "status_key:cancel": {"clear": ["permission_date"]},
    "audit_date:set": {"status_key": "comp", "lock_all_except": ["audit_date", "wcc_status_id", "report_status_id", "report_submission_date"]},
    "audit_date:clear": {"status_key": "p_wait", "clear": ["permission_date", "wcc_status_id", "report_status_id", "report_submission_date"]},
}
field_lock_rules = {
    "permission_date": {"status_key": ["p_wait"]},
}
generate_options = ["FSR", "Report"]
photo_sequence = [
    "FE in safety gear",
    "Foundation snap",
    "Full tower snap",
    "Top platform snap",
    "Earthing snap",
]


def apply_ma_rules(site, payload: dict, db) -> dict:
    from fastapi import HTTPException
    from app.models.core import Badge
    from sqlalchemy import select

    all_badges = db.execute(select(Badge)).scalars().all()
    status_by_key = {b.key: b.id for b in all_badges if b.type == "status"}
    doc_by_key = {b.key: b.id for b in all_badges if b.type == "doc_status"}
    by_id = {b.id: b.key for b in all_badges}
    current_status_key = by_id.get(site.status_id, "")

    # VALIDATION
    # 1. permission_date requires p_wait and height
    if "permission_date" in payload and payload["permission_date"] is not None:
        if current_status_key != "p_wait":
            raise HTTPException(status_code=400, detail="Permission date can only be set when status is Permission Wait")
        height = payload.get("height") if "height" in payload else getattr(site, "height", None)
        if height is None:
            raise HTTPException(status_code=400, detail="Height must be set before entering permission date")

    # 2. audit_date requires wip status
    if "audit_date" in payload and payload["audit_date"] is not None:
        existing_audit_date = getattr(site, "audit_date", None)
        if current_status_key != "wip" and existing_audit_date is None:
            raise HTTPException(status_code=400, detail="Audit date can only be set when status is WIP")

    # 3. If comp, restrict allowed fields
    if current_status_key == "comp":
        allowed_when_comp = {
            "audit_date",
            "wcc_status_id",
            "report_status_id",
            "report_submission_date",
            "mpaint",
            "mnbr",
            "arr",
            "ep",
            "ec",
        }
        for key in payload:
            if key not in allowed_when_comp:
                raise HTTPException(status_code=400, detail=f"Field '{key}' cannot be changed when site is complete")

    # 4. wcc_status_id / report_status_id require audit_date
    for badge_key in ("wcc_status_id", "report_status_id"):
        if badge_key in payload:
            has_audit = site.audit_date is not None or (
                "audit_date" in payload and payload["audit_date"] is not None
            )
            if not has_audit:
                label = "WCC status" if badge_key == "wcc_status_id" else "Report status"
                raise HTTPException(status_code=400, detail=f"{label} cannot be set before audit date")

    # SIDE EFFECTS
    # 6. Status → hold, cancel, or p_iss: clear permission_date
    if "status_id" in payload and by_id.get(payload["status_id"], "") in ("hold", "cancel", "p_iss"):
        payload["permission_date"] = None

    # 7. permission_date cleared: revert status to p_wait
    if "permission_date" in payload and payload["permission_date"] is None:
        if by_id.get(payload.get("status_id"), "") not in ("hold", "cancel", "p_iss"):
            payload["status_id"] = status_by_key["p_wait"]

    # 8. permission_date set: set status to wip
    if "permission_date" in payload and payload["permission_date"] is not None:
        payload["status_id"] = status_by_key["wip"]

    # 9. audit_date set: set status to comp, default doc statuses to pend
    if "audit_date" in payload and payload["audit_date"] is not None:
        payload["status_id"] = status_by_key["comp"]
        if site.wcc_status_id is None and "wcc_status_id" not in payload:
            payload["wcc_status_id"] = doc_by_key["pend"]
        if site.report_status_id is None and "report_status_id" not in payload:
            payload["report_status_id"] = doc_by_key["pend"]

    # 10. audit_date cleared: revert status, clear related fields
    if "audit_date" in payload and payload["audit_date"] is None:
        payload["status_id"] = status_by_key["p_wait"]
        payload["permission_date"] = None
        payload["wcc_status_id"] = None
        payload["report_status_id"] = None
        payload["report_submission_date"] = None

    # 11. report_submission_date set: auto-advance report_status from gen → subm
    if "report_submission_date" in payload and payload["report_submission_date"] is not None:
        current_report_key = by_id.get(site.report_status_id, "")
        if current_report_key == "gen" and "report_status_id" not in payload:
            payload["report_status_id"] = doc_by_key["subm"]

    return payload
