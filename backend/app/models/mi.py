from sqlalchemy import Column, Integer, Text, Date, Numeric, Boolean, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base

class Mi(Base):
    __tablename__ = "site"
    __table_args__ = (
        UniqueConstraint("project_id", "ckt_id", name="uq_project_ckt"),
        {"schema": "schema_mi"},
    )

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("schema_core.project.id"))

    ckt_id = Column(Text, nullable=False)
    customer = Column(Text)

    permission_date = Column(Date)
    receiving_date = Column(Date)
    edd = Column(Date)

    status_badge_id = Column(Integer, ForeignKey("schema_core.badge.id"))

    po_status_badge_id = Column(Integer, ForeignKey("schema_core.badge.id"))
    invoice_status_badge_id = Column(Integer, ForeignKey("schema_core.badge.id"))
    wcc = Column(Integer, ForeignKey("schema_core.badge.id"))

    height_m = Column(Numeric)
    address = Column(Text)
    city = Column(Text)
    lc = Column(Text)

    completion_date = Column(Date)

    po_no = Column(Text)
    invoice_no = Column(Text)
    progress = Column(Text)
    fe = Column(Text)

    paid = Column(Numeric, default=0)

    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
