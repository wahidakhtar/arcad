from sqlalchemy import Column, Integer, Boolean, String
from app.core.database import Base


class RoleFieldPermission(Base):
    __tablename__ = "role_field_permissions"
    __table_args__ = {}

    id = Column(Integer, primary_key=True)

    column_name = Column(String, nullable=False)

    dept_badge_id = Column(Integer, nullable=False)
    level_badge_id = Column(Integer, nullable=False)

    can_view = Column(Boolean, nullable=False, default=False)
    can_edit = Column(Boolean, nullable=False, default=False)
