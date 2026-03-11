from sqlalchemy import Column, Integer, Text
from app.core.database import Base


class Project(Base):
    __tablename__ = "project"
    __table_args__ = {"schema": "schema_core"}

    id = Column(Integer, primary_key=True)

    code = Column(Text, nullable=False, unique=True)

    name = Column(Text, nullable=False)

    site_schema = Column(Text, nullable=False)

    badge_id = Column(Integer, nullable=False)