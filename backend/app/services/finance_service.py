from sqlalchemy.orm import Session
from app.models.fe import Finance, FinanceStateEnum
from app.domain.site_resolver import validate_site_exists


def create_finance_entry(
    db: Session,
    project_id: int,
    site_id: int,
    fe_id: int | None,
    type,
    state,
    amount,
    approval,
    execution_date=None
):
    validate_site_exists(db, project_id, site_id)

    if state == FinanceStateEnum.executed and not execution_date:
        raise ValueError("execution_date required when state is executed")

    entry = Finance(
        project_id=project_id,
        site_id=site_id,
        fe_id=fe_id,
        type=type,
        state=state,
        amount=amount,
        approval=approval,
        execution_date=execution_date
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


def update_finance_state(db: Session, finance_id: int, new_state, execution_date=None):
    entry = db.query(Finance).filter(Finance.id == finance_id).first()

    if not entry:
        raise ValueError("Finance entry not found")

    if entry.state == FinanceStateEnum.executed:
        raise ValueError("Executed finance entries are immutable")

    if new_state == FinanceStateEnum.executed and not execution_date:
        raise ValueError("execution_date required for execution")

    entry.state = new_state
    entry.execution_date = execution_date

    db.commit()
    db.refresh(entry)

    return entry
