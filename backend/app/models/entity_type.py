from sqlalchemy import Column, Integer, Text, Boolean
from app.core.database import Base

class EntityType(Base):
    __tablename__ = "entity_type"
    __table_args__ = {"schema": "schema_core"}

    id = Column(Integer, primary_key=True)
    code = Column(Text, unique=True, nullable=False)
    allow_multiple_badges = Column(Boolean, default=True)
