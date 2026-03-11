from sqlalchemy import text
from app.authz.policies.base_policy import BaseProjectPolicy


class ProjectPolicy(BaseProjectPolicy):

    def __init__(self, role, project_id, db):
        self.role = role
        self.project_id = project_id
        self.db = db

        self.schema = self._resolve_schema()

        self.base_fields = self._load_base_fields()
        self.permissions = self._load_permissions()

    # --------------------------------------------------
    # PROJECT RESOLUTION
    # --------------------------------------------------

    def _resolve_schema(self):

        row = self.db.execute(
            text("""
                SELECT site_schema
                FROM schema_core.project
                WHERE id = :project_id
            """),
            {"project_id": self.project_id},
        ).fetchone()

        return row.site_schema if row else None

    # --------------------------------------------------
    # BASE FIELDS
    # --------------------------------------------------

    def _load_base_fields(self):

        if not self.schema:
            return set()

        rows = self.db.execute(
            text(f"""
                SELECT column_name
                FROM {self.schema}.project_base_fields
            """)
        ).fetchall()

        return {r.column_name for r in rows}

    # --------------------------------------------------
    # FIELD PERMISSIONS
    # --------------------------------------------------

    def _load_permissions(self):

        if not self.schema:
            return {}

        rows = self.db.execute(
            text(f"""
                SELECT
                    rfp.column_name,
                    ps.can_view,
                    ps.can_edit
                FROM {self.schema}.role_field_permissions rfp
                JOIN schema_core.permission_state ps
                  ON ps.id = rfp.permission_state_id
                WHERE rfp.role_id = :role_id
            """),
            {"role_id": self.role.role_id},
        ).fetchall()

        permissions = {
            r.column_name: {
                "view": r.can_view,
                "edit": r.can_edit,
            }
            for r in rows
        }

        # ensure base fields always have view permission
        for field in self.base_fields:
            if field not in permissions:
                permissions[field] = {"view": True, "edit": False}

        return permissions

    # --------------------------------------------------
    # SITE PERMISSIONS
    # --------------------------------------------------

    def can_open_detail(self):
        return any(p["view"] for p in self.permissions.values())

    def can_edit_site(self):
        return any(p["edit"] for p in self.permissions.values())

    # --------------------------------------------------
    # OPERATION PERMISSIONS
    # --------------------------------------------------

    def _has_operation(self, op_key: str):

        return op_key in getattr(self.role, "permissions", set())

    def can_add_site(self):
        return self._has_operation("add_site")

    def can_create_site(self):
        return self.can_add_site()

    def can_request_finance(self):
        return self._has_operation("request_payment")

    def can_view_finance(self):
        return self._has_operation("view_finance")

    def can_execute_finance(self):
        return self._has_operation("edit_finance")

    # --------------------------------------------------
    # RESPONSE FILTERING
    # --------------------------------------------------

    def filter_site_response(self, data):

        if isinstance(data, list):
            return [self._filter_one(d) for d in data]

        return self._filter_one(data)

    def _filter_one(self, site):

        result = {}

        for k, v in site.items():

            if k == "id":
                result[k] = v
                continue

            if self.permissions.get(k, {}).get("view", False):
                result[k] = v

        return result