from sqlalchemy import Column, Integer, ForeignKey, Text
from app.core.database import Base

class BadgeEntityMap(Base):
    __tablename__ = "badge_entity_map"
    __table_args__ = {"schema": "schema_core"}

    id = Column(Integer, primary_key=True)
    entity_type_id = Column(Integer, ForeignKey("schema_core.entity_type.id"), nullable=False)
    badge_id = Column(Integer, ForeignKey("schema_core.badge.id"), nullable=False)
    code = Column(Text)
