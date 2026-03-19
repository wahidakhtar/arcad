PROJECT_KEY = "ma"

fields = [
    "receiving_date", "ckt_id", "customer", "address", "state_id", "lc", "height",
    "permission_date", "status", "followup_date", "mpaint", "mnbr", "arr", "ep", "ec",
    "audit_date", "fsr_status", "report_status", "budget", "cost", "paid", "balance",
    "po_number", "po_status", "invoice_number", "invoice_status",
]
form_fields = ["receiving_date", "ckt_id", "customer", "address", "state_id", "height"]
bulk_columns = ["ckt_id", "customer", "address", "state_id", "height"]
budget_params = {"bucket_key": "bma"}
system_status_triggers = {
    "permission_date:set": {"status_key": "wip"},
    "status_key:hold": {"clear": ["permission_date"]},
    "status_key:cancel": {"clear": ["permission_date"]},
    "audit_date:set": {"status_key": "comp", "lock_all_except": ["audit_date", "fsr_status_id", "report_status_id"]},
    "audit_date:clear": {"status_key": "p_wait", "clear": ["permission_date", "fsr_status_id", "report_status_id"]},
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
