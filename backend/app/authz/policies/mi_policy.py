from sqlalchemy import text
from app.authz.policies.base_policy import BaseProjectPolicy


class MiPolicy(BaseProjectPolicy):

    def __init__(self, role, project_id, db):
        self.role = role
        self.project_id = project_id
        self.db = db
        self.permissions = self._load_permissions()

    def _load_permissions(self):

        rows = self.db.execute(
            text("""
                SELECT column_name, can_view, can_edit
                FROM schema_mi.role_field_permissions
                WHERE dept_badge_id = :dept
                AND level_badge_id = :level
            """),
            {
                "dept": self.role.department_id,
                "level": self.role.level_id,
            },
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

    def can_create_site(self):
        return False

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
