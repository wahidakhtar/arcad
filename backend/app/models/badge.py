from sqlalchemy import Column, Integer, Text
from app.core.database import Base

class Badge(Base):
    __tablename__ = "badge"
    __table_args__ = {"schema": "schema_core"}

    id = Column(Integer, primary_key=True)
    badge_type = Column(Text, nullable=False)
    badge_key = Column(Text, nullable=False)
    description = Column(Text)
    color = Column(Text)
