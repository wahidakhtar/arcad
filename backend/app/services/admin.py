from __future__ import annotations

from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.core import Badge, Job, JobBucket, RoleTag, Tag, TransitionType
from app.models.hr import Role
from app.schemas.admin import BadgeTransitionCreate, BadgeUpdate, JobUpdate, RoleTagUpdate, UIFieldReorder, UIFieldUpdate

_TRANSITION_PROJECTS = ["mi", "md", "ma", "mc"]
_ALL_PROJECTS = ["mi", "md", "ma", "mc", "bb"]


# ---------------------------------------------------------------------------
# Badges
# ---------------------------------------------------------------------------

def list_badges(db: Session) -> list[dict]:
    rows = db.execute(select(Badge).order_by(Badge.id)).scalars().all()
    return [
        {
            "id": row.id,
            "type": row.type,
            "key": row.key,
            "label": row.label,
            "color": row.color,
        }
        for row in rows
    ]


def update_badge(db: Session, badge_id: int, payload: BadgeUpdate) -> dict:
    row = db.get(Badge, badge_id)
    row.label = payload.label
    row.color = payload.color
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "type": row.type,
        "key": row.key,
        "label": row.label,
        "color": row.color,
    }


# ---------------------------------------------------------------------------
# Badge Transitions
# ---------------------------------------------------------------------------

def list_badge_transitions(db: Session) -> dict:
    transition_types = db.execute(select(TransitionType).order_by(TransitionType.id)).scalars().all()
    types_list = [{"id": t.id, "key": t.key, "label": t.label} for t in transition_types]

    result: dict = {"transition_types": types_list}
    for project in _TRANSITION_PROJECTS:
        rows = db.execute(text(
            f"""
            SELECT
                bt.id,
                bt.type_id,
                bt.from_id,
                fb.key  AS from_key,
                fb.label AS from_label,
                bt.to_id,
                tb.key  AS to_key,
                tb.label AS to_label
            FROM schema_{project}.badge_transitions bt
            JOIN schema_core.badges fb ON fb.id = bt.from_id
            JOIN schema_core.badges tb ON tb.id = bt.to_id
            ORDER BY bt.id
            """
        )).mappings().all()
        result[project] = [
            {
                "id": r["id"],
                "project": project,
                "type_id": r["type_id"],
                "from_id": r["from_id"],
                "from_key": r["from_key"],
                "from_label": r["from_label"],
                "to_id": r["to_id"],
                "to_key": r["to_key"],
                "to_label": r["to_label"],
            }
            for r in rows
        ]
    return result


def create_badge_transition(db: Session, payload: BadgeTransitionCreate) -> dict:
    result = db.execute(
        text(
            f"""
            INSERT INTO schema_{payload.project}.badge_transitions (type_id, from_id, to_id)
            VALUES (:type_id, :from_id, :to_id)
            RETURNING id, type_id, from_id, to_id
            """
        ),
        {"type_id": payload.type_id, "from_id": payload.from_id, "to_id": payload.to_id},
    ).mappings().one()
    db.commit()
    return {
        "id": result["id"],
        "project": payload.project,
        "type_id": result["type_id"],
        "from_id": result["from_id"],
        "to_id": result["to_id"],
    }


def delete_badge_transition(db: Session, project: str, transition_id: int) -> None:
    if project not in _TRANSITION_PROJECTS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid project")
    db.execute(
        text(f"DELETE FROM schema_{project}.badge_transitions WHERE id = :tid"),
        {"tid": transition_id},
    )
    db.commit()


# ---------------------------------------------------------------------------
# UI Fields
# ---------------------------------------------------------------------------

def list_ui_fields(db: Session) -> dict:
    result: dict = {}
    for project in _ALL_PROJECTS:
        rows = db.execute(text(
            f"""
            SELECT id, tag, label, type, list_view, form_view, bulk_view, section, perm_tag, "order"
            FROM schema_{project}.ui_fields
            ORDER BY "order" NULLS LAST, id
            """
        )).mappings().all()
        result[project] = [
            {
                "id": r["id"],
                "tag": r["tag"],
                "label": r["label"],
                "type": r["type"],
                "list_view": r["list_view"],
                "form_view": r["form_view"],
                "bulk_view": r["bulk_view"],
                "section": r["section"],
                "perm_tag": r["perm_tag"],
                "order": r["order"],
            }
            for r in rows
        ]
    return result


def update_ui_field(db: Session, project: str, field_id: int, payload: UIFieldUpdate) -> dict:
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        row = db.execute(
            text(
                f'SELECT id, tag, label, type, list_view, form_view, bulk_view, section, perm_tag, "order" '
                f"FROM schema_{project}.ui_fields WHERE id = :fid"
            ),
            {"fid": field_id},
        ).mappings().one()
        return dict(row)

    set_clause = ", ".join(f'"{k}" = :{k}' if k == "order" else f"{k} = :{k}" for k in updates)
    params = {**updates, "fid": field_id}
    row = db.execute(
        text(
            f"""
            UPDATE schema_{project}.ui_fields
            SET {set_clause}
            WHERE id = :fid
            RETURNING id, tag, label, type, list_view, form_view, bulk_view, section, perm_tag, "order"
            """
        ),
        params,
    ).mappings().one()
    db.commit()
    return dict(row)


def reorder_ui_fields(db: Session, project: str, payload: UIFieldReorder) -> None:
    for index, field_id in enumerate(payload.ids):
        db.execute(
            text(f'UPDATE schema_{project}.ui_fields SET "order" = :ord WHERE id = :fid'),
            {"ord": index, "fid": field_id},
        )
    db.commit()


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

def list_jobs(db: Session) -> list[dict]:
    rows = db.execute(
        select(Job, JobBucket.label.label("bucket_label"))
        .join(JobBucket, JobBucket.id == Job.job_bucket_id)
        .order_by(Job.id)
    ).all()
    return [
        {
            "id": row.Job.id,
            "job_key": row.Job.job_key,
            "bucket_key": row.Job.bucket_key,
            "label": row.Job.label,
            "scale_by": row.Job.scale_by,
            "bucket_label": row.bucket_label,
        }
        for row in rows
    ]


def update_job(db: Session, job_id: int, payload: JobUpdate) -> dict:
    row = db.get(Job, job_id)
    if payload.label is not None:
        row.label = payload.label
    if payload.scale_by is not None:
        row.scale_by = payload.scale_by
    db.commit()
    db.refresh(row)
    bucket = db.get(JobBucket, row.job_bucket_id)
    return {
        "id": row.id,
        "job_key": row.job_key,
        "bucket_key": row.bucket_key,
        "label": row.label,
        "scale_by": row.scale_by,
        "bucket_label": bucket.label if bucket else None,
    }


# ---------------------------------------------------------------------------
# Role Tags
# ---------------------------------------------------------------------------

def list_role_tags(db: Session) -> dict:
    roles = db.execute(select(Role).order_by(Role.id)).scalars().all()
    tags = db.execute(select(Tag).order_by(Tag.id)).scalars().all()
    role_tags = db.execute(select(RoleTag)).scalars().all()

    matrix = {
        f"{rt.role_id}:{rt.tag_id}": {"read": rt.read, "write": rt.write}
        for rt in role_tags
    }
    return {
        "roles": [
            {
                "id": r.id,
                "key": r.key,
                "label": r.label,
                "dept_key": r.dept_key,
                "level_key": r.level_key,
            }
            for r in roles
        ],
        "tags": [
            {
                "id": t.id,
                "tag": t.tag,
                "description": t.description,
            }
            for t in tags
        ],
        "matrix": matrix,
    }


def update_role_tag(db: Session, payload: RoleTagUpdate) -> dict:
    db.execute(
        text(
            """
            INSERT INTO schema_core.role_tags (role_id, tag_id, read, write)
            VALUES (:role_id, :tag_id, :read, :write)
            ON CONFLICT (role_id, tag_id) DO UPDATE SET read = EXCLUDED.read, write = EXCLUDED.write
            """
        ),
        {
            "role_id": payload.role_id,
            "tag_id": payload.tag_id,
            "read": payload.read,
            "write": payload.write,
        },
    )
    db.commit()
    return {
        "role_id": payload.role_id,
        "tag_id": payload.tag_id,
        "read": payload.read,
        "write": payload.write,
    }
