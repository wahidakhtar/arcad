from __future__ import annotations

PROJECT_KEY = "mi"

fields = [
    "receiving_date", "ckt_id", "customer", "address", "city", "lc", "height",
    "permission_date", "edd", "status", "followup_date", "completion_date",
    "wcc_status", "budget", "cost", "paid", "balance", "po_number", "po_status",
    "invoice_number", "invoice_status",
]
form_fields = ["receiving_date", "ckt_id", "customer", "address", "city", "height"]
bulk_columns = ["ckt_id", "customer", "address", "city", "height"]
budget_params = {"bucket_key": "bmi"}
system_status_triggers = {
    "permission_date:set": {"status_key": "wip"},
    "status_key:hold": {"clear": ["permission_date"]},
    "status_key:cancel": {"clear": ["permission_date"]},
    "completion_date:set": {"status_key": "comp", "lock_all_except": ["completion_date", "wcc_status_id"]},
    "completion_date:clear": {"status_key": "p_wait", "clear": ["permission_date", "edd", "wcc_status_id"]},
}
field_lock_rules = {
    "permission_date": {"status_key": ["p_wait"]},
    "completion_date": {"status_key": ["wip"], "requires": ["height"]},
}
generate_options = ["WCC"]
photo_sequence: list[str] = []


def apply_mi_rules(site, payload: dict, db) -> dict:
    from datetime import timedelta
    from fastapi import HTTPException
    from app.models.core import Badge
    from sqlalchemy import select

    all_badges = db.execute(select(Badge)).scalars().all()
    status_by_key = {b.key: b.id for b in all_badges if b.type == "status"}
    doc_by_key = {b.key: b.id for b in all_badges if b.type == "doc_status"}
    by_id = {b.id: b.key for b in all_badges}
    current_status_key = by_id.get(site.status_id, "")

    # VALIDATION
    # 1. completion_date requires wip status
    if "completion_date" in payload and payload["completion_date"] is not None:
        if current_status_key != "wip":
            raise HTTPException(status_code=400, detail="Completion date can only be set when status is WIP")

    # 2. permission_date requires p_wait status and height
    if "permission_date" in payload and payload["permission_date"] is not None:
        if current_status_key != "p_wait":
            raise HTTPException(status_code=400, detail="Permission date can only be set when status is Permission Wait")
        height = payload.get("height") if "height" in payload else getattr(site, "height", None)
        if height is None:
            raise HTTPException(status_code=400, detail="Height must be set before entering permission date")

    # 3. If already comp, only certain fields allowed
    if current_status_key == "comp":
        allowed_when_comp = {"completion_date", "wcc_status_id"}
        for key in payload:
            if key not in allowed_when_comp:
                raise HTTPException(status_code=400, detail=f"Field '{key}' cannot be changed when site is complete")

    # 4. wcc_status_id requires completion_date
    if "wcc_status_id" in payload:
        has_completion = site.completion_date is not None or (
            "completion_date" in payload and payload["completion_date"] is not None
        )
        if not has_completion:
            raise HTTPException(status_code=400, detail="WCC status cannot be set before completion date")

    # SIDE EFFECTS
    # 5. Status → hold or cancel: clear permission_date
    if "status_id" in payload and by_id.get(payload["status_id"], "") in ("hold", "cancel"):
        payload["permission_date"] = None

    # 6. permission_date being set: set status to wip and compute EDD
    if "permission_date" in payload and payload["permission_date"] is not None:
        payload["status_id"] = status_by_key["wip"]
        height = payload.get("height") if "height" in payload else getattr(site, "height", None)
        if height is not None:
            payload["edd"] = payload["permission_date"] + timedelta(days=15 if float(height) <= 15 else 21)

    # 7. completion_date being set: set status to comp, default wcc_status to pend
    if "completion_date" in payload and payload["completion_date"] is not None:
        payload["status_id"] = status_by_key["comp"]
        if site.wcc_status_id is None and "wcc_status_id" not in payload:
            payload["wcc_status_id"] = doc_by_key["pend"]

    # 8. completion_date being cleared: revert status, clear related fields
    if "completion_date" in payload and payload["completion_date"] is None:
        payload["status_id"] = status_by_key["p_wait"]
        payload["permission_date"] = None
        payload["edd"] = None
        payload["wcc_status_id"] = None

    return payload
