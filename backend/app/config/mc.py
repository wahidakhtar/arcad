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
    "cm_date:set": {"status_key": "comp", "lock_all_except": ["cm_date", "wcc_status_id", "report_status_id"]},
    "cm_date:clear": {"status_key": "p_wait", "clear": ["permission_date", "wcc_status_id", "report_status_id"]},
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
