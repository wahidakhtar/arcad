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

        self.detail_fields = self._compute_detail_fields()
        self.table_fields = self._compute_table_fields()

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
                    rfp.show_in_table,
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
                "table": bool(r.show_in_table),
            }
            for r in rows
        }

        # base fields are always visible in both views
        for field in self.base_fields:
            permissions.setdefault(
                field,
                {"view": True, "edit": False, "table": True},
            )

        return permissions

    # --------------------------------------------------
    # FIELD SETS
    # --------------------------------------------------

    def _compute_detail_fields(self):

        return {
            col for col, perm in self.permissions.items()
            if perm["view"]
        }

    def _compute_table_fields(self):

        table_fields = set(self.base_fields)

        for col, perm in self.permissions.items():
            if perm.get("table"):
                table_fields.add(col)

        return table_fields

    # --------------------------------------------------
    # SITE PERMISSIONS
    # --------------------------------------------------

    def can_open_detail(self):
        return bool(self.detail_fields)

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

    def filter_table_response(self, data):

        if isinstance(data, list):
            return [self._filter_one(d, self.table_fields) for d in data]

        return self._filter_one(data, self.table_fields)

    def filter_detail_response(self, data):

        if isinstance(data, list):
            return [self._filter_one(d, self.detail_fields) for d in data]

        return self._filter_one(data, self.detail_fields)

    # backward compatibility (existing routes)
    def filter_site_response(self, data):
        return self.filter_detail_response(data)

    def _filter_one(self, site, allowed_fields):

        result = {}

        for k, v in site.items():

            if k == "id":
                result[k] = v
                continue

            if k in allowed_fields:
                result[k] = v

        return result