"""
FastAPI Dependencies — Auth verification & User retrieval.
"""

from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole, VerificationStatus
from app.services.auth_service import get_user_by_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_optional_current_user(
    token: str = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    """Optionally validate token and return User, or None if anonymous."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            return None
        user_id = int(payload["sub"])
        user = get_user_by_id(db, user_id)
        return user if (user and user.is_active) else None
    except Exception:
        return None


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate bearer token and return authenticated User model."""
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = int(payload["sub"])
    user = get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def require_role(allowed_roles: List[UserRole]):
    """Dependency factory enforcing specific user roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{current_user.role.value}' is not authorized to access this resource",
            )
        return current_user
    return role_checker


require_admin = require_role([UserRole.ADMIN])


def require_provider(current_user: User = Depends(get_current_user)) -> User:
    """
    Enforce provider capability.
    Admin always has access.
    Provider accounts must be APPROVED and active.
    Pending, rejected, or suspended providers cannot perform provider operations.
    """
    if current_user.role == UserRole.ADMIN:
        return current_user

    has_provider = (current_user.role == UserRole.PROVIDER or getattr(current_user, "is_provider", False))
    if not has_provider:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Provider account required for this action",
        )

    if current_user.verification_status == VerificationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Provider account is pending verification and cannot perform this action",
        )
    if current_user.verification_status == VerificationStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Provider account has been rejected",
        )
    if current_user.verification_status == VerificationStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Provider account is suspended",
        )
    if current_user.verification_status != VerificationStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Provider account verification status is '{current_user.verification_status.value}'",
        )

    return current_user


def require_customer(current_user: User = Depends(get_current_user)) -> User:
    """
    Every active user has customer capabilities to book services and rentals.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )
    return current_user

