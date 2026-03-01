from sqlalchemy import Column, Integer, Date, Numeric, Boolean
from app.core.database import Base

class RateCard(Base):
    __tablename__ = "rate_card"
    __table_args__ = {"schema": "schema_core"}

    id = Column(Integer, primary_key=True)
    job_id = Column(Integer, nullable=False)
    effective_date = Column(Date, nullable=False)
    unit_cost = Column(Numeric, nullable=False)
    is_active = Column(Boolean, default=True)
