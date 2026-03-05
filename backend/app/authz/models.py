class RoleSet:
    def __init__(
        self,
        role_id: int,
        project_id: int,
        project_code: str,
        department_id: int,
        department_code: str,
        level_id: int,
        level_code: str,
    ):
        self.role_id = role_id
        self.project_id = project_id
        self.project_code = project_code
        self.department_id = department_id
        self.department_code = department_code
        self.level_id = level_id
        self.level_code = level_code


class UserRole:
    def __init__(self, role_sets: list[RoleSet]):
        self.role_sets = role_sets

    def get_for_project(self, project_code: str) -> RoleSet | None:
        for rs in self.role_sets:
            if rs.project_code == project_code:
                return rs
        return None
