from sqlalchemy import Column, Integer, ForeignKey
from app.core.database import Base

class BadgeTransition(Base):
    __tablename__ = "badge_transition"
    __table_args__ = {"schema": "schema_core"}

    id = Column(Integer, primary_key=True)
    entity_type_id = Column(Integer, nullable=False)
    project_id = Column(Integer, nullable=False)
    from_badge_id = Column(Integer, ForeignKey("schema_core.badge.id"), nullable=False)
    to_badge_id = Column(Integer, ForeignKey("schema_core.badge.id"), nullable=False)
