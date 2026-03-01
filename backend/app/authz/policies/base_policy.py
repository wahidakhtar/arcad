class BaseProjectPolicy:
    def __init__(self, role_set):
        self.role = role_set

    # Default deny
    def can_open_detail(self):
        return False

    def can_edit_site(self):
        return False

    def can_create_site(self):
        return False

    def can_view_finance(self):
        return False

    def can_modify_finance(self):
        return False

    def filter_site_response(self, data):
        return data
