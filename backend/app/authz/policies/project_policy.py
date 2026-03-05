from sqlalchemy import text
from app.authz.policies.base_policy import BaseProjectPolicy


class ProjectPolicy(BaseProjectPolicy):

    def __init__(self, role, project_id, db):
        self.role = role
        self.project_id = project_id
        self.db = db
        self.permissions = self._load_permissions()

    def _load_permissions(self):

        project = self.db.execute(
            text("""
                SELECT site_schema
                FROM schema_core.project
                WHERE id = :project_id
            """),
            {"project_id": self.project_id},
        ).fetchone()

        schema = project.site_schema

        rows = self.db.execute(
            text(f"""
                SELECT
                    rfp.column_name,
                    ps.can_view,
                    ps.can_edit
                FROM {schema}.role_field_permissions rfp
                JOIN schema_core.permission_state ps
                  ON ps.id = rfp.permission_state_id
                WHERE rfp.role_id = :role_id
            """),
            {"role_id": self.role.role_id},
        ).fetchall()

        return {
            r.column_name: {
                "view": r.can_view,
                "edit": r.can_edit,
            }
            for r in rows
        }

    def can_open_detail(self):
        return any(p["view"] for p in self.permissions.values())

    def can_edit_site(self):
        return any(p["edit"] for p in self.permissions.values())

    def can_add_site(self):
        row = self.db.execute(
            text("""
                SELECT 1
                FROM schema_core.operation_permission
                WHERE role_id = :role_id
                AND op_key = 'add_site'
            """),
            {"role_id": self.role.role_id},
        ).fetchone()

        return row is not None

    # backward compatibility
    def can_create_site(self):
        return self.can_add_site()

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
