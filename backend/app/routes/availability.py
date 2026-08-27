"""
Provider Availability & Slot Generation API Endpoints.
"""

from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.availability import Availability
from app.models.booking import Booking, BookingStatus
from app.schemas.availability import (
    AvailabilityResponse,
    AvailabilityCreate,
    BlockDateRequest,
    TimeSlot,
)
from app.routes.dependencies import get_current_user, require_provider

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
    db: Session = Depends(get_db),
):
    """
    Generate hourly time slots for a given provider on a target date,
    filtering out breaks, blocked dates, and existing confirmed/pending bookings.
    """
    try:
        parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Check if the date is blocked
    blocked = db.query(Availability).filter(
        Availability.provider_id == provider_id,
        Availability.blocked_date == target_date
    ).first()

    if blocked:
        return []

    # Get provider weekday setting or defaults (9:00 to 18:00)
    day_num = parsed_date.weekday()
    avail = db.query(Availability).filter(
        Availability.provider_id == provider_id,
        Availability.day_of_week == day_num,
    ).first()

    if avail and not avail.is_available:
        return []

    start_hour = 9
    end_hour = 18
    break_start_hour = 13
    break_end_hour = 14

    if avail:
        try:
            start_hour = int(avail.start_time.split(":")[0])
            end_hour = int(avail.end_time.split(":")[0])
            if avail.break_start:
                break_start_hour = int(avail.break_start.split(":")[0])
            if avail.break_end:
                break_end_hour = int(avail.break_end.split(":")[0])
        except Exception:
            pass

    # Query existing bookings on this date for provider
    existing_bookings = db.query(Booking).filter(
        Booking.provider_id == provider_id,
        Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS])
    ).all()

    booked_slots = set()
    for b in existing_bookings:
        if b.booking_date:
            b_date = b.booking_date.strftime("%Y-%m-%d") if isinstance(b.booking_date, datetime) else str(b.booking_date)[:10]
            if b_date == target_date:
                booked_slots.add(b.time_slot.strip())

    slots = []
    for h in range(start_hour, end_hour):
        if break_start_hour <= h < break_end_hour:
            continue
        
        slot_start_time = datetime.strptime(f"{h:02d}:00", "%H:%M")
        slot_end_time = datetime.strptime(f"{(h+1):02d}:00", "%H:%M")
        slot_str = f"{slot_start_time.strftime('%I:%M %p')} - {slot_end_time.strftime('%I:%M %p')}"

        is_booked = slot_str in booked_slots
        slots.append(TimeSlot(
            time=slot_str,
            available=not is_booked,
            reason="Already Booked" if is_booked else None
        ))

    return slots


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
