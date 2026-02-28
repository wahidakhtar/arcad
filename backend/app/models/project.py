from sqlalchemy import Column, Integer, Text, Boolean, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base

class Project(Base):
    __tablename__ = "project"
    __table_args__ = {"schema": "schema_core"}

    id = Column(Integer, primary_key=True, index=True)
    code = Column(Text, nullable=False, unique=True)
    name = Column(Text, nullable=False)

    # NEW: which schema contains the site's table
    site_schema = Column(Text, nullable=False)

    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
