from app.authz.policies.base_policy import BaseProjectPolicy


class MiPolicy(BaseProjectPolicy):

    # -----------------------------
    # Core Access
    # -----------------------------

    def can_open_detail(self):
        if self.role.department_code == "ops":
            return self.role.level_code in {"l2", "l3"}
        if self.role.department_code == "acc":
            return True
        if self.role.department_code == "mgmt":
            return True
        return False

    def can_edit_site(self):
        if self.role.department_code == "ops":
            return self.role.level_code in {"l2", "l3"}
        return False

    def can_create_site(self):
        return (
            self.role.department_code == "ops"
            and self.role.level_code == "l3"
        )

    # -----------------------------
    # FE Assignment
    # -----------------------------

    def can_assign_fe(self):
        return (
            self.role.department_code == "ops"
            and self.role.level_code in {"l2", "l3"}
        )

    # -----------------------------
    # Finance Permissions
    # -----------------------------

    def can_view_finance(self):
        if self.role.department_code == "ops":
            return self.role.level_code in {"l2", "l3"}
        if self.role.department_code == "acc":
            return True
        if self.role.department_code == "mgmt":
            return True  # read-only
        return False

    def can_request_finance(self):
        return (
            self.role.department_code == "ops"
            and self.role.level_code in {"l2", "l3"}
        )

    def can_execute_finance(self):
        return self.role.department_code == "acc"

    # -----------------------------
    # Status / Document Toggles
    # -----------------------------

    def can_toggle_status(self):
        if self.role.department_code == "ops":
            return self.role.level_code in {"l2", "l3"}
        return False

    def can_toggle_wcc(self):
        if self.role.department_code == "ops":
            return self.role.level_code in {"l2", "l3"}
        if self.role.department_code == "acc":
            return True
        return False

    def can_toggle_po(self):
        return self.can_view_finance()

    def can_toggle_invoice(self):
        return self.can_view_finance()

    # -----------------------------
    # UI Capability Map
    # -----------------------------

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
