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

        # normalize codes once at creation
        self.project_code = (project_code or "").strip().lower()
        self.department_id = department_id
        self.department_code = (department_code or "").strip().lower()
        self.level_id = level_id
        self.level_code = (level_code or "").strip().lower()


class UserRole:
    def __init__(self, role_sets: list[RoleSet]):
        self.role_sets = role_sets or []

    def get_for_project(self, project_code: str) -> RoleSet | None:

        if not project_code:
            return None

        code = project_code.strip().lower()

        for rs in self.role_sets:
            if rs.project_code == code:
                return rs

        return None

    def all_projects(self):
        return [r.project_code for r in self.role_sets]

    def has_project(self, project_code: str) -> bool:
        return self.get_for_project(project_code) is not None