def serialize_site(entry):
    s = entry["model"]
    status_badge = entry.get("status_badge")
    po_badge = entry.get("po_badge")
    invoice_badge = entry.get("invoice_badge")
    wcc_badge = entry.get("wcc_badge")
    financials = entry.get("financials", {})

    return {
        "id": s.id,
        "project_id": s.project_id,
        "ckt_id": s.ckt_id,
        "customer": s.customer,

        "permission_date": s.permission_date.isoformat() if s.permission_date else None,
        "receiving_date": s.receiving_date.isoformat() if s.receiving_date else None,
        "edd": s.edd.isoformat() if s.edd else None,
        "completion_date": s.completion_date.isoformat() if s.completion_date else None,

        # STATUS
        "status_badge_id": s.status_badge_id,
        "status_label": status_badge.description if status_badge else None,
        "status_color": status_badge.color if status_badge else None,

        # PO
        "po_status_badge_id": s.po_status_badge_id,
        "po_status": po_badge.description if po_badge else None,
        "po_status_color": po_badge.color if po_badge else None,

        # INVOICE
        "invoice_status_badge_id": s.invoice_status_badge_id,
        "invoice_status": invoice_badge.description if invoice_badge else None,
        "invoice_status_color": invoice_badge.color if invoice_badge else None,

        # WCC
        "wcc_badge_id": s.wcc,
        "wcc_status": wcc_badge.description if wcc_badge else None,
        "wcc_status_color": wcc_badge.color if wcc_badge else None,

        "height_m": s.height_m,
        "address": s.address,
        "city": s.city,
        "lc": s.lc,
        "progress": s.progress,
        "fe": s.fe,
        "po_no": s.po_no,
        "invoice_no": s.invoice_no,
        "paid": float(s.paid) if s.paid is not None else None,

        **financials
    }
