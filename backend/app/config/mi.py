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
