from sqlalchemy.orm import Session
from app.domain.mi import queries as mi_queries
from app.domain.mi import serializer as mi_serializer
from app.domain.mi import commands as mi_commands
from app.domain.finance.mi_finance import compute_financials

def get_mi_sites(project_id: int, db: Session):
    entries = mi_queries.fetch_sites(project_id, db)

    result = []
    for e in entries:
        site = e["model"]
        e["financials"] = compute_financials(site, db)
        result.append(mi_serializer.serialize_site(e))

    return result


def create_mi_site(payload, db: Session):
    result = mi_commands.create_site_command(payload, db)
    if "duplicate" in result:
        raise ValueError({
            "message": "CKT ID already exists in this project",
            "existing_site": result["duplicate"]
        })
    return result["created"]
