from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.database import get_db
from app.authz.resolver import resolve_user_role


def get_role(
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_role, permissions = resolve_user_role(user.id, db)

    # attach permissions to the role object
    user_role.permissions = set(permissions)

    return user_role