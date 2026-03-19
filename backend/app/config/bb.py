PROJECT_KEY = "bb"

fields = [
    "receiving_date", "ckt_id", "customer", "address", "city", "lc", "status",
    "provider_id", "username", "password", "last_recharge_date", "next_recharge_date",
    "active_po_number", "po_status", "active_invoice_number", "active_invoice_status", "next_invoice_date",
]
form_fields = ["receiving_date", "ckt_id", "customer", "address", "city", "lc"]
bulk_columns: list[str] = []
budget_params = {}
system_status_triggers = {
    "ticket:create": {"status_key": "down"},
    "ticket:close": {"status_key": "live"},
    "termination:create": {"status_key": "term"},
}
field_lock_rules = {}
generate_options: list[str] = []
photo_sequence: list[str] = []
