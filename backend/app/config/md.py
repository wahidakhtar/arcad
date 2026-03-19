PROJECT_KEY = "md"

fields = [
    "receiving_date", "ckt_id", "customer", "address", "state_id", "lc", "height",
    "permission_date", "status", "followup_date", "visit_date", "outcome",
    "dismantle_date", "doc_status", "scrap_value", "budget", "cost", "paid",
    "balance", "po_number", "po_status", "invoice_number", "invoice_status",
]
form_fields = ["receiving_date", "ckt_id", "customer", "address", "state_id", "height"]
bulk_columns = ["ckt_id", "customer", "address", "state_id", "height"]
budget_params = {"default_bucket": "bmd", "visit_bucket": "bmdv"}
system_status_triggers = {
    "permission_date:set": {"status_key": "wip"},
    "status_key:hold": {"clear": ["permission_date"]},
    "status_key:cancel": {"clear": ["permission_date"]},
    "dismantle_date:set": {"status_key": "comp", "lock_all_except": ["doc_status_id"]},
    "outcome:Asset Tx": {"status_key": "comp", "lock_all_except": ["doc_status_id"]},
}
field_lock_rules = {
    "permission_date": {"status_key": ["p_wait"]},
    "dismantle_date": {"requires": ["outcome"], "allowed_values": {"outcome": ["Dismantle"]}},
    "outcome": {"requires": ["visit_date"]},
}
generate_options = ["WCC", "Tx Copy"]
photo_sequence: list[str] = []
