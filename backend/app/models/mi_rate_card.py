from sqlalchemy import Column, Integer, Text, Date, Numeric
from app.core.database import Base

class MiRateCard(Base):
    __tablename__ = "rate_card"
    __table_args__ = {"schema": "schema_mi"}

    id = Column(Integer, primary_key=True)
    job = Column(Text, nullable=False)
    effective_date = Column(Date, nullable=False)
    unit_cost = Column(Numeric, nullable=False)
