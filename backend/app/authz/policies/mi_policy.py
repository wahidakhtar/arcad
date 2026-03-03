from app.authz.policies.base_policy import BaseProjectPolicy
from app.models.role_field_permissions import RoleFieldPermission


class MiPolicy(BaseProjectPolicy):

    def __init__(self, role, project_id, db):
        self.role = role
        self.project_id = project_id
        self.db = db
        self.permissions = self._load_permissions()

    # ---------------------------------
    # Load Field Permissions From DB
    # ---------------------------------

    def _load_permissions(self):
        rows = (
            self.db.query(RoleFieldPermission)
            .filter(
                RoleFieldPermission.dept_badge_id == self.role.department_badge_id,
                RoleFieldPermission.level_badge_id == self.role.level_badge_id,
            )
            .all()
        )

        return {
            r.column_name: {
                "view": r.can_view,
                "edit": r.can_edit,
            }
            for r in rows
        }

    # ---------------------------------
    # Core Access
    # ---------------------------------

    def can_open_detail(self):
        return any(p["view"] for p in self.permissions.values())

    def can_edit_site(self):
        return any(p["edit"] for p in self.permissions.values())

    def can_create_site(self):
        return False  # configure later via DB if needed

    # ---------------------------------
    # FE / Finance (derive from fields if needed)
    # ---------------------------------

    def can_assign_fe(self):
        return False

    def can_view_finance(self):
        return False

    def can_request_finance(self):
        return False

    def can_execute_finance(self):
        return False

    # ---------------------------------
    # Status Toggles
    # ---------------------------------

    def can_toggle_status(self):
        return self.permissions.get("status_badge_id", {}).get("edit", False)

    def can_toggle_wcc(self):
        return self.permissions.get("wcc", {}).get("edit", False)

    def can_toggle_po(self):
        return self.permissions.get("po_status_badge_id", {}).get("edit", False)

    def can_toggle_invoice(self):
        return self.permissions.get("invoice_status_badge_id", {}).get("edit", False)

    # ---------------------------------
    # Response Filtering
    # ---------------------------------

    def filter_site_response(self, data):
        if isinstance(data, list):
            return [self._filter_one(d) for d in data]
        return self._filter_one(data)

    def _filter_one(self, site):
        return {
            k: v
            for k, v in site.items()
            if self.permissions.get(k, {}).get("view", False)
        }

    # ---------------------------------
    # UI Capability Map
    # ---------------------------------

    def ui_capabilities(self):
        return {
            "can_open_detail": self.can_open_detail(),
            "can_create_site": self.can_create_site(),
            "can_assign_fe": self.can_assign_fe(),
            "can_view_finance": self.can_view_finance(),
            "can_request_finance": self.can_request_finance(),
            "can_execute_finance": self.can_execute_finance(),
            "toggle_status": self.can_toggle_status(),
            "toggle_wcc": self.can_toggle_wcc(),
            "toggle_po": self.can_toggle_po(),
            "toggle_invoice": self.can_toggle_invoice(),
        }
