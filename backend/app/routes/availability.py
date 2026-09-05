"""
Provider Availability & Slot Generation API Endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.availability import Availability
from app.schemas.availability import (
    AvailabilityResponse,
    AvailabilityCreate,
    BlockDateRequest,
    TimeSlot,
    ProviderSlotsResponse,
)
from app.routes.dependencies import get_current_user, require_provider
from app.services.availability_service import generate_provider_slots

router = APIRouter(
    prefix="/availability",
    tags=["Availability"],
)


@router.get("/providers/{provider_id}", response_model=List[AvailabilityResponse])
def get_provider_availability(provider_id: int, db: Session = Depends(get_db)):
    """Get weekly working hours and blocked dates for a provider."""
    return db.query(Availability).filter(Availability.provider_id == provider_id).all()


@router.get("/providers/{provider_id}/slots", response_model=List[TimeSlot])
def get_available_slots(
    provider_id: int,
    target_date: str = Query(..., description="Target date in YYYY-MM-DD format"),
    service_id: Optional[int] = Query(None, description="Optional service ID to calculate duration-based slots"),
    duration_minutes: Optional[int] = Query(None, description="Optional service duration in minutes"),
    db: Session = Depends(get_db),
):
    """
    Generate dynamic time slots for a given provider on a target date,
    respecting working hours, lunch break (13:00-14:00), service duration,
    and overlapping active bookings.
    """
    res = generate_provider_slots(
        db=db,
        provider_id=provider_id,
        target_date_str=target_date,
        service_id=service_id,
        custom_duration_minutes=duration_minutes,
    )
    return res.slots


@router.get("/providers/{provider_id}/slot-details", response_model=ProviderSlotsResponse)
def get_available_slot_details(
    provider_id: int,
    target_date: str = Query(..., description="Target date in YYYY-MM-DD format"),
    service_id: Optional[int] = Query(None, description="Optional service ID to calculate duration-based slots"),
    duration_minutes: Optional[int] = Query(None, description="Optional service duration in minutes"),
    db: Session = Depends(get_db),
):
    """
    Detailed slot response with working day status and diagnostic message.
    """
    return generate_provider_slots(
        db=db,
        provider_id=provider_id,
        target_date_str=target_date,
        service_id=service_id,
        custom_duration_minutes=duration_minutes,
    )


@router.post("/me/block-date", response_model=AvailabilityResponse, status_code=status.HTTP_201_CREATED)
def block_date(
    request: BlockDateRequest,
    current_user: User = Depends(require_provider),
    db: Session = Depends(get_db),
):
    """Block a specific calendar date for the authenticated provider."""
    existing = db.query(Availability).filter(
        Availability.provider_id == current_user.id,
        Availability.blocked_date == request.date
    ).first()

    if existing:
        return existing

    new_blocked = Availability(
        provider_id=current_user.id,
        blocked_date=request.date,
        is_available=False,
    )
    db.add(new_blocked)
    db.commit()
    db.refresh(new_blocked)
    return new_blocked
