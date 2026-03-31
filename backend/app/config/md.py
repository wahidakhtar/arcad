from __future__ import annotations

PROJECT_KEY = "md"

fields = [
    "receiving_date", "ckt_id", "customer", "address", "state_id", "lc", "height",
    "permission_date", "status", "followup_date", "visit_date", "outcome",
    "dismantle_date", "wcc_status", "scrap_value", "budget", "cost", "paid",
    "balance", "po_number", "po_status", "invoice_number", "invoice_status",
]
form_fields = ["receiving_date", "ckt_id", "customer", "address", "state_id", "height"]
bulk_columns = ["ckt_id", "customer", "address", "state_id", "height"]
budget_params = {"default_bucket": "bmd", "visit_bucket": "bmdv"}
system_status_triggers = {
    "permission_date:set": {"status_key": "wip"},
    "status_key:hold": {"clear": ["permission_date"]},
    "status_key:cancel": {"clear": ["permission_date"]},
    "dismantle_date:set": {"status_key": "comp", "lock_all_except": ["dismantle_date", "wcc_status_id"]},
    "dismantle_date:clear": {"status_key": "p_wait", "clear": ["permission_date", "wcc_status_id"]},
    "outcome:Asset Tx": {"status_key": "comp", "lock_all_except": ["wcc_status_id"]},
}
field_lock_rules = {
    "permission_date": {"status_key": ["p_wait"]},
    "dismantle_date": {"requires": ["outcome"], "allowed_values": {"outcome": ["Dismantle"]}},
    "outcome": {"requires": ["visit_date"]},
    "wcc_status_id": {"requires_field": "dismantle_date"},
}
generate_options = ["WCC", "Tx Copy"]
photo_sequence: list[str] = []


def apply_md_rules(site, payload: dict, db) -> dict:
    from fastapi import HTTPException
    from app.models.core import Badge
    from app.models.md import MDOutcome
    from sqlalchemy import select

    all_badges = db.execute(select(Badge)).scalars().all()
    status_by_key = {b.key: b.id for b in all_badges if b.type == "status"}
    doc_by_key = {b.key: b.id for b in all_badges if b.type == "doc_status"}
    by_id = {b.id: b.key for b in all_badges}
    current_status_key = by_id.get(site.status_id, "")

    outcomes = db.execute(select(MDOutcome)).scalars().all()
    outcome_label_by_id = {row.id: row.label for row in outcomes}

    def outcome_label(value):
        if value is None:
            return None
        if isinstance(value, int):
            return outcome_label_by_id.get(value)
        text_value = str(value).strip()
        if text_value.isdigit():
            return outcome_label_by_id.get(int(text_value))
        return text_value or None

    current_outcome_label = outcome_label(getattr(site, "outcome_id", None))

    # VALIDATION
    # 1. permission_date requires p_wait and height
    if "permission_date" in payload and payload["permission_date"] is not None:
        if current_status_key != "p_wait":
            raise HTTPException(status_code=400, detail="Permission date can only be set when status is Permission Wait")
        height = payload.get("height") if "height" in payload else getattr(site, "height", None)
        if height is None:
            raise HTTPException(status_code=400, detail="Height must be set before entering permission date")

    # 2. visit_date and outcome must exist together
    if "visit_date" in payload or "outcome_id" in payload:
        next_visit_date = payload.get("visit_date", site.visit_date)
        next_outcome = outcome_label(payload.get("outcome_id", getattr(site, "outcome_id", None)))
        if bool(next_visit_date) != bool(next_outcome):
            raise HTTPException(status_code=400, detail="Visit date and outcome must be entered together")

    # 3. dismantle_date (first time) requires scrap_value
    if "dismantle_date" in payload and payload["dismantle_date"] is not None and site.dismantle_date is None:
        if "scrap_value" not in payload or payload["scrap_value"] is None:
            raise HTTPException(status_code=400, detail="scrap_value is required when setting dismantle date")

    # 4. dismantle_date requires outcome == Dismantle
    if "dismantle_date" in payload and payload["dismantle_date"] is not None:
        if outcome_label(payload.get("outcome_id", getattr(site, "outcome_id", None))) != "Dismantle":
            raise HTTPException(status_code=400, detail="Dismantle date can only be set when outcome is Dismantle")

    # 5. If comp, restrict allowed fields by path
    if current_status_key == "comp":
        if site.dismantle_date is not None:
            allowed = {"dismantle_date", "wcc_status_id"}
        elif current_outcome_label == "Asset Tx":
            allowed = {"wcc_status_id"}
        else:
            allowed = set()
        for key in payload:
            if key not in allowed:
                raise HTTPException(status_code=400, detail=f"Field '{key}' cannot be changed when site is complete")

    # 6. wcc_status_id requires Asset Tx or dismantle flow
    if "wcc_status_id" in payload:
        next_outcome_label = outcome_label(payload.get("outcome_id", getattr(site, "outcome_id", None)))
        next_dismantle_date = payload.get("dismantle_date", site.dismantle_date)
        if next_outcome_label != "Asset Tx" and next_dismantle_date is None:
            raise HTTPException(status_code=400, detail="WCC status can only be set after Dismantle or when outcome is Asset Tx")

    # SIDE EFFECTS
    # 8. Status → hold or cancel: clear permission_date
    if "status_id" in payload and by_id.get(payload["status_id"], "") in ("hold", "cancel"):
        payload["permission_date"] = None

    # 9. permission_date cleared: revert status to p_wait
    if "permission_date" in payload and payload["permission_date"] is None:
        if by_id.get(payload.get("status_id"), "") not in ("hold", "cancel"):
            payload["status_id"] = status_by_key["p_wait"]

    # 10. permission_date set: set status to wip
    if "permission_date" in payload and payload["permission_date"] is not None:
        payload["status_id"] = status_by_key["wip"]

    # 11. dismantle_date set: set status to comp, default wcc_status to pend
    if "dismantle_date" in payload and payload["dismantle_date"] is not None:
        payload["status_id"] = status_by_key["comp"]
        if site.wcc_status_id is None and "wcc_status_id" not in payload:
            payload["wcc_status_id"] = doc_by_key["pend"]

    # 12. outcome == Asset Tx: set status to comp, default wcc_status to pend
    if "outcome_id" in payload and outcome_label(payload["outcome_id"]) == "Asset Tx":
        payload["status_id"] = status_by_key["comp"]
        if site.wcc_status_id is None and "wcc_status_id" not in payload:
            payload["wcc_status_id"] = doc_by_key["pend"]

    # 13. dismantle_date cleared: revert status, clear related fields
    if "dismantle_date" in payload and payload["dismantle_date"] is None:
        payload["status_id"] = status_by_key["p_wait"]
        payload["permission_date"] = None
        payload["wcc_status_id"] = None

    return payload
