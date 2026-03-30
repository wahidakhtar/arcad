from __future__ import annotations

from importlib import import_module
from datetime import date
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.bb import BBSite, BBSubproject, Recharge, Termination
from app.models.core import Badge, Project, Recipient
from app.models.ma import MASite, MASubproject, MAUIField
from app.models.mc import MCSite, MCSubproject, MCUIField
from app.models.md import MDSite, MDSubproject, MDUIField
from app.models.mi import MISite, MISubproject, MIUIField

SITE_MODELS = {
    "mi": {"site": MISite, "subproject": MISubproject, "ui_field": MIUIField},
    "md": {"site": MDSite, "subproject": MDSubproject, "ui_field": MDUIField},
    "ma": {"site": MASite, "subproject": MASubproject, "ui_field": MAUIField},
    "mc": {"site": MCSite, "subproject": MCSubproject, "ui_field": MCUIField},
    "bb": {"site": BBSite, "subproject": BBSubproject, "recharge": Recharge, "termination": Termination, "ui_field": None},
}


def get_project(db: Session, project_key: str) -> Project:
    project = db.execute(select(Project).where(Project.key == project_key)).scalar_one()
    return project


def get_site_model(project_key: str):
    return SITE_MODELS[project_key]["site"]


def get_subproject_model(project_key: str):
    return SITE_MODELS[project_key]["subproject"]


def get_ui_field_model(project_key: str):
    return SITE_MODELS[project_key].get("ui_field")


def get_project_config(project_key: str):
    return import_module(f"app.config.{project_key}")


def model_to_dict(instance: Any) -> dict[str, Any]:
    return {column.name: getattr(instance, column.name) for column in instance.__table__.columns}


def ensure_media_dir(media_root: str, project_key: str, site_id: int) -> Path:
    path = Path(media_root) / project_key / str(site_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def badge_map(db: Session) -> dict[int, Badge]:
    return {badge.id: badge for badge in db.execute(select(Badge)).scalars()}


def get_recipient_type_id(db: Session, key: str) -> int | None:
    row = db.execute(select(Recipient.id).where(Recipient.key == key)).scalar_one_or_none()
    return row


def format_subproject_label(batch_date: date | None, bucket: bool | None, fallback_id: int | None = None) -> str:
    if bucket:
        return "Bucket"
    if batch_date is not None:
        return batch_date.strftime("%B %Y")
    if fallback_id is not None:
        return f"Batch {fallback_id}"
    return "Unscheduled"
