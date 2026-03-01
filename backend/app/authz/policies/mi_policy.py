from app.authz.policies.base_policy import BaseProjectPolicy


class MiPolicy(BaseProjectPolicy):

    # ---- Core Access ----

    def can_open_detail(self):
        if self.role.department_code == "mgmt":
            return True
        if self.role.department_code == "ops":
            return self.role.level_code in {"l2", "l3"}
        return False

    def can_edit_site(self):
        if self.role.department_code == "mgmt":
            return True
        if self.role.department_code == "ops":
            return self.role.level_code in {"l2", "l3"}
        return False

    def can_create_site(self):
        return (
            self.role.department_code == "ops"
            and self.role.level_code == "l3"
        )

    # ---- Finance ----

    def can_view_finance(self):
        if self.role.department_code in {"acc", "mgmt"}:
            return True
        if self.role.department_code == "ops":
            return self.role.level_code in {"l2", "l3"}
        return False

    def can_modify_finance(self):
        return self.role.department_code in {"acc", "mgmt"}

    # ---- Toggles ----

    def can_toggle_status(self):
        if self.role.department_code == "mgmt":
            return True
        if self.role.department_code == "ops":
            return self.role.level_code in {"l2", "l3"}
        return False

    def can_toggle_wcc(self):
        if self.role.department_code == "ops":
            return True
        if self.role.department_code in {"acc", "mgmt"}:
            return True
        return False

    def can_toggle_po(self):
        return self.can_view_finance()

    def can_toggle_invoice(self):
        return self.can_view_finance()

    # ---- UI Capability Map ----

    def ui_capabilities(self):
        return {
            "view_finance": self.can_view_finance(),
            "toggle_status": self.can_toggle_status(),
            "toggle_wcc": self.can_toggle_wcc(),
            "toggle_po": self.can_toggle_po(),
            "toggle_invoice": self.can_toggle_invoice(),
            "can_open_detail": self.can_open_detail(),
            "can_create_site": self.can_create_site(),
        }

    # ---- Response Filtering ----

    def filter_site_response(self, data):
        if self.can_view_finance():
            return data

        finance_fields = [
            "budget",
            "paid",
            "balance",
            "po_status_badge_id",
            "invoice_status_badge_id",
        ]

        if isinstance(data, list):
            for item in data:
                for field in finance_fields:
                    item.pop(field, None)
        else:
            for field in finance_fields:
                data.pop(field, None)

        return data
