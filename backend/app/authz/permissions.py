def can_open_site_detail(role_set):
    if role_set.department_code == "mgmt":
        return True
    if role_set.department_code == "ops":
        return role_set.level_code in {"l2", "l3"}
    return False


def can_edit_site(role_set):
    if role_set.department_code == "mgmt":
        return True
    if role_set.department_code == "ops":
        return role_set.level_code in {"l2", "l3"}
    return False


def can_create_site(role_set):
    return (
        role_set.department_code == "ops"
        and role_set.level_code == "l3"
    )


def can_assign_fe(role_set):
    return (
        role_set.department_code == "ops"
        and role_set.level_code in {"l2", "l3"}
    )


def can_request_finance(role_set):
    return (
        role_set.department_code == "ops"
        and role_set.level_code in {"l2", "l3"}
    )


def can_view_finance(role_set):
    if role_set.department_code in {"acc", "mgmt"}:
        return True
    if role_set.department_code == "ops":
        return role_set.level_code in {"l2", "l3"}
    return False


def can_modify_finance(role_set):
    return role_set.department_code in {"acc", "mgmt"}
