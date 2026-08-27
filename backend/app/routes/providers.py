"""
Provider API Endpoints — Public Search, Profile Setup, Verification.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, ProviderProfileUpdate, ProviderVerificationAction
from app.routes.dependencies import get_current_user, require_admin, require_provider
from app.services.provider_service import (
    get_approved_providers,
    update_provider_profile,
    verify_provider,
)

router = APIRouter(
    prefix="/providers",
    tags=["Providers"],
)


@router.get("/public", response_model=List[UserResponse])
def search_public_providers(
    category_id: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    emergency_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    Publicly list approved service providers matching optional category and radius/city location filters.
    Unapproved providers are NEVER returned publicly.
    """
    return get_approved_providers(
        db,
        category_id=category_id,
        city=city,
        lat=lat,
        lng=lng,
        emergency_only=emergency_only,
    )


@router.get("/{provider_id}", response_model=UserResponse)
def get_provider_by_id(provider_id: int, db: Session = Depends(get_db)):
    """Get detailed profile for a specific provider by ID."""
    provider = db.query(User).filter(User.id == provider_id, User.role == UserRole.PROVIDER).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider



@router.put("/me/profile", response_model=UserResponse)
def update_my_provider_profile(
    profile_in: ProviderProfileUpdate,
    current_user: User = Depends(require_provider),
    db: Session = Depends(get_db),
):
    """Update authenticated provider's onboarding details, working hours, portfolio, and service radius."""
    return update_provider_profile(db, current_user.id, profile_in)


@router.post("/{provider_id}/verify", response_model=UserResponse)
def admin_verify_provider(
    provider_id: int,
    action: ProviderVerificationAction,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint to approve or reject provider application."""
    return verify_provider(db, provider_id, action)
