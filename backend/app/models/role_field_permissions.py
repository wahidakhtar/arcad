from sqlalchemy import Column, Integer, Boolean, String, ForeignKey
from app.core.database import Base


class RoleFieldPermission(Base):
    __tablename__ = "role_field_permissions"
    __table_args__ = {"schema": "schema_core"}

    id = Column(Integer, primary_key=True, index=True)

    dept_badge_id = Column(Integer, ForeignKey("schema_core.badge.id"), nullable=False)
    level_badge_id = Column(Integer, ForeignKey("schema_core.badge.id"), nullable=False)

    column_name = Column(String(100), nullable=False)

    can_view = Column(Boolean, nullable=False, default=False)
    can_edit = Column(Boolean, nullable=False, default=False)
