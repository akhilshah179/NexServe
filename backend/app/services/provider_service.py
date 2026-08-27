"""
Provider Service — Onboarding, verification, and location-based matching.
"""

import json
import math
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, UserRole, VerificationStatus
from app.schemas.user import ProviderProfileUpdate, ProviderVerificationAction


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_approved_providers(
    db: Session,
    category_id: Optional[int] = None,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    emergency_only: bool = False,
) -> List[User]:
    """
    Public discovery of service providers.
    STRICT REQUIREMENT: Only return providers with verification_status == APPROVED and is_active == True.
    If lat/lng provided, filter by provider.service_radius_km.
    """
    query = db.query(User).filter(
        User.role == UserRole.PROVIDER,
        User.is_active == True,
        User.verification_status == VerificationStatus.APPROVED,
    )

    if emergency_only:
        query = query.filter(User.emergency_available == True)

    if category_id:
        from app.models.service import Service
        query = query.join(User.services).filter(Service.category_id == category_id, Service.is_active == True)

    providers = query.distinct().all()

    # Location distance filtering if coordinates supplied
    if lat is not None and lng is not None:
        filtered = []
        for p in providers:
            if p.latitude is not None and p.longitude is not None:
                dist = calculate_haversine_distance(lat, lng, p.latitude, p.longitude)
                if dist <= p.service_radius_km:
                    filtered.append(p)
            elif city and p.location and city.lower() in p.location.lower():
                filtered.append(p)
            elif p.latitude is None and p.longitude is None:
                # Default fallback if provider location is text-only
                filtered.append(p)
        return filtered

    if city:
        return [p for p in providers if p.location and city.lower() in p.location.lower()]

    return providers


def update_provider_profile(db: Session, provider_id: int, profile_in: ProviderProfileUpdate) -> User:
    """Update provider onboarding details."""
    provider = db.query(User).filter(User.id == provider_id, User.role == UserRole.PROVIDER).first()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider profile not found.")

    data = profile_in.model_dump(exclude_unset=True)

    if "portfolio_photos" in data and isinstance(data["portfolio_photos"], list):
        data["portfolio_photos"] = json.dumps(data["portfolio_photos"])

    for field, value in data.items():
        setattr(provider, field, value)

    # When provider submits profile updates, if status was REJECTED, reset to PENDING for re-review
    if provider.verification_status == VerificationStatus.REJECTED:
        provider.verification_status = VerificationStatus.PENDING
        provider.rejection_reason = None

    db.commit()
    db.refresh(provider)
    return provider


def verify_provider(db: Session, provider_id: int, action: ProviderVerificationAction) -> User:
    """Admin action to approve or reject provider application."""
    provider = db.query(User).filter(User.id == provider_id, User.role == UserRole.PROVIDER).first()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found.")

    provider.verification_status = action.status
    if action.status == VerificationStatus.REJECTED:
        provider.rejection_reason = action.rejection_reason
    else:
        provider.rejection_reason = None

    db.commit()
    db.refresh(provider)

    # Create notification for provider
    from app.services.notification_service import create_notification
    title = "Verification Approved!" if action.status == VerificationStatus.APPROVED else "Verification Update"
    msg = (
        "Congratulations! Your provider profile has been approved. You can now receive service bookings."
        if action.status == VerificationStatus.APPROVED
        else f"Your provider application was not approved: {action.rejection_reason or 'Contact support for details.'}"
    )
    create_notification(db, user_id=provider.id, title=title, message=msg, notification_type="verification")

    return provider
