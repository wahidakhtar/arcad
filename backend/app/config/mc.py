from __future__ import annotations

PROJECT_KEY = "mc"

fields = [
    "receiving_date", "ckt_id", "customer", "address", "state_id", "lc", "height",
    "audit_date", "permission_date", "status", "followup_date", "mpaint", "mnbr",
    "arr", "ep", "ec", "cm_date", "wcc_status", "report_status", "budget", "cost",
    "paid", "balance", "po_number", "po_status", "invoice_number", "invoice_status",
]
form_fields = [
    "receiving_date", "ckt_id", "customer", "address", "state_id", "height", "lc",
    "audit_date", "mpaint", "mnbr", "arr", "ep", "ec",
]
bulk_columns = form_fields[1:]
budget_params = {"bucket_key": "bmc", "job_boolean_map": {"mpaint": "mpaint", "mnbr": "mnbr", "ep": "ep", "ec": "ec", "arr": "arr"}}
system_status_triggers = {
    "permission_date:set": {"status_key": "wip"},
    "status_key:hold": {"clear": ["permission_date"]},
    "status_key:cancel": {"clear": ["permission_date"]},
    "cm_date:set": {"status_key": "comp", "lock_all_except": ["cm_date", "wcc_status_id", "report_status_id", "report_submission_date"]},
    "cm_date:clear": {"status_key": "p_wait", "clear": ["permission_date", "wcc_status_id", "report_status_id", "report_submission_date"]},
}
field_lock_rules = {
    "permission_date": {"status_key": ["p_wait"]},
}
generate_options = ["WCC", "Report"]
photo_sequence = [
    "FE in safety gear",
    "Foundation snap",
    "Full tower snap",
    "Top platform snap",
    "Earthing snap",
]


def apply_mc_rules(site, payload: dict, db) -> dict:
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

    # 2. cm_date requires wip status
    if "cm_date" in payload and payload["cm_date"] is not None:
        if current_status_key != "wip":
            raise HTTPException(status_code=400, detail="CM date can only be set when status is WIP")

    # 3. If comp, restrict allowed fields
    if current_status_key == "comp":
        allowed_when_comp = {"cm_date", "wcc_status_id", "report_status_id", "report_submission_date"}
        for key in payload:
            if key not in allowed_when_comp:
                raise HTTPException(status_code=400, detail=f"Field '{key}' cannot be changed when site is complete")

    # 4. wcc_status_id requires cm_date
    if "wcc_status_id" in payload:
        has_cm = site.cm_date is not None or (
            "cm_date" in payload and payload["cm_date"] is not None
        )
        if not has_cm:
            raise HTTPException(status_code=400, detail="WCC status cannot be set before CM date")

    # 5. report_status_id requires cm_date
    if "report_status_id" in payload:
        has_cm = site.cm_date is not None or (
            "cm_date" in payload and payload["cm_date"] is not None
        )
        if not has_cm:
            raise HTTPException(status_code=400, detail="Report status cannot be set before CM date")

    # SIDE EFFECTS
    # 6. Status → hold or cancel: clear permission_date
    if "status_id" in payload and by_id.get(payload["status_id"], "") in ("hold", "cancel"):
        payload["permission_date"] = None

    # 7. permission_date cleared: revert status to p_wait
    if "permission_date" in payload and payload["permission_date"] is None:
        if by_id.get(payload.get("status_id"), "") not in ("hold", "cancel"):
            payload["status_id"] = status_by_key["p_wait"]

    # 8. permission_date set: set status to wip
    if "permission_date" in payload and payload["permission_date"] is not None:
        payload["status_id"] = status_by_key["wip"]

    # 9. cm_date set: set status to comp, default doc statuses to pend
    if "cm_date" in payload and payload["cm_date"] is not None:
        payload["status_id"] = status_by_key["comp"]
        if site.wcc_status_id is None and "wcc_status_id" not in payload:
            payload["wcc_status_id"] = doc_by_key["pend"]
        if site.report_status_id is None and "report_status_id" not in payload:
            payload["report_status_id"] = doc_by_key["pend"]

    # 10. cm_date cleared: revert status, clear related fields
    if "cm_date" in payload and payload["cm_date"] is None:
        payload["status_id"] = status_by_key["p_wait"]
        payload["permission_date"] = None
        payload["wcc_status_id"] = None
        payload["report_status_id"] = None
        payload["report_submission_date"] = None

    # 11. report_submission_date set: auto-advance report_status from gen → subm
    if "report_submission_date" in payload and payload["report_submission_date"] is not None:
        current_report_key = by_id.get(site.report_status_id, "")
        if current_report_key == "gen" and "report_status_id" not in payload:
            payload["report_status_id"] = doc_by_key["shr"]

    return payload
