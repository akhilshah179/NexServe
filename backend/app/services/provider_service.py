"""
Provider Service — Onboarding, verification, and location-based matching.
"""

import json
import math
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, UserRole, VerificationStatus
from app.schemas.user import ProviderProfileUpdate, ProviderVerificationAction, ProviderApplyRequest


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
        (User.role == UserRole.PROVIDER) | (User.is_provider == True),
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
    provider = db.query(User).filter(
        User.id == provider_id,
        (User.role == UserRole.PROVIDER) | (User.is_provider == True)
    ).first()
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


def apply_to_become_provider(db: Session, user_id: int, apply_in: ProviderApplyRequest) -> User:
    """
    Allow an existing customer to onboard/apply as a service provider.
    Preserves all existing customer bookings, reviews, profile, and referral data.
    Does NOT create a duplicate user.
    Sets verification_status to PENDING and is_provider to True.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    data = apply_in.model_dump(exclude_unset=True)
    if "portfolio_photos" in data and isinstance(data["portfolio_photos"], list):
        data["portfolio_photos"] = json.dumps(data["portfolio_photos"])

    for field, value in data.items():
        setattr(user, field, value)

    user.is_provider = True
    user.verification_status = VerificationStatus.PENDING
    user.rejection_reason = None

    db.commit()
    db.refresh(user)

    from app.services.notification_service import create_notification
    create_notification(
        db,
        user_id=user.id,
        title="Provider Application Submitted",
        message="Your application to offer services on NexServe has been received. Our team will review your profile shortly.",
        notification_type="provider_application_submitted",
    )

    return user


def suspend_provider(db: Session, provider_id: int, reason: Optional[str] = None) -> User:
    """
    Admin action to suspend a provider's access.
    STRICT REQUIREMENT: Suspending provider access must NOT delete or destroy the customer
    account, historical bookings, or reviews.
    Only provider-specific capabilities (listing services, accepting bookings) are restricted.
    """
    provider = db.query(User).filter(User.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found.")

    provider.verification_status = VerificationStatus.SUSPENDED
    provider.rejection_reason = reason or "Provider account has been suspended by an administrator."

    # Deactivate provider's active services from public catalog
    from app.models.service import Service
    from app.models.rental import RentalItem
    db.query(Service).filter(Service.provider_id == provider_id).update({"is_active": False})
    db.query(RentalItem).filter(RentalItem.provider_id == provider_id).update({"is_active": False})

    db.commit()
    db.refresh(provider)

    from app.services.notification_service import create_notification
    create_notification(
        db,
        user_id=provider.id,
        title="Provider Access Suspended",
        message=f"Your provider privileges on NexServe have been suspended: {provider.rejection_reason}. Your customer account remains active.",
        notification_type="provider_suspended",
    )

    return provider


def unsuspend_provider(db: Session, provider_id: int) -> User:
    """Reactivate a suspended provider."""
    provider = db.query(User).filter(User.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found.")

    provider.verification_status = VerificationStatus.APPROVED
    provider.rejection_reason = None

    from app.models.service import Service
    from app.models.rental import RentalItem
    db.query(Service).filter(Service.provider_id == provider_id).update({"is_active": True})
    db.query(RentalItem).filter(RentalItem.provider_id == provider_id).update({"is_active": True})

    db.commit()
    db.refresh(provider)

    from app.services.notification_service import create_notification
    create_notification(
        db,
        user_id=provider.id,
        title="Provider Access Restored",
        message="Your provider account on NexServe has been restored and your services are live again.",
        notification_type="provider_restored",
    )

    return provider


def verify_provider(db: Session, provider_id: int, action: ProviderVerificationAction) -> User:
    """Admin action to approve, reject, or suspend provider application."""
    provider = db.query(User).filter(User.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found.")

    if action.status == VerificationStatus.SUSPENDED:
        return suspend_provider(db, provider_id, action.rejection_reason)
    elif action.status == VerificationStatus.APPROVED and provider.verification_status == VerificationStatus.SUSPENDED:
        return unsuspend_provider(db, provider_id)

    provider.verification_status = action.status
    if action.status == VerificationStatus.APPROVED:
        provider.is_provider = True
        provider.rejection_reason = None
        # Activate services if any
        from app.models.service import Service
        from app.models.rental import RentalItem
        db.query(Service).filter(Service.provider_id == provider_id).update({"is_active": True})
        db.query(RentalItem).filter(RentalItem.provider_id == provider_id).update({"is_active": True})
    elif action.status == VerificationStatus.REJECTED:
        provider.rejection_reason = action.rejection_reason
    else:
        provider.rejection_reason = None

    db.commit()
    db.refresh(provider)

    from app.services.notification_service import create_notification
    title = "Verification Approved!" if action.status == VerificationStatus.APPROVED else "Verification Update"
    msg = (
        "Congratulations! Your provider profile has been approved. You can now offer services and accept bookings."
        if action.status == VerificationStatus.APPROVED
        else f"Your provider application status: {action.status.value}. {action.rejection_reason or ''}"
    )
    create_notification(db, user_id=provider.id, title=title, message=msg, notification_type="verification")

    return provider
