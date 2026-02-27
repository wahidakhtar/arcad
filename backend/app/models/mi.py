from sqlalchemy import Column, Integer, Text, Date, Numeric, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class Mi(Base):
    __tablename__ = "site"
    __table_args__ = {"schema": "schema_mi"}

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("schema_core.project.id"))

    ckt_id = Column(Text, nullable=False)
    customer = Column(Text)

    permission_date = Column(Date)
    status_badge_id = Column(Integer, ForeignKey("schema_core.badge.id"))
    receiving_date = Column(Date)
    edd = Column(Date)

    height_m = Column(Numeric)
    address = Column(Text)
    city = Column(Text)
    lc = Column(Text)

    completion_date = Column(Date)
    wcc = Column(Boolean, default=False)

    po_no = Column(Text)
    invoice_no = Column(Text)
    progress = Column(Text)
    fe = Column(Text)

    paid = Column(Numeric, default=0)

    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
