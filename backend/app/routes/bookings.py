"""
Bookings API Endpoints — Lifecycle & Real-Time State Transitions.
"""

from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    BookingStatusUpdate,
    BookingCancelRequest,
    BookingRescheduleRequest,
)
from app.services.booking_service import (
    create_booking,
    get_user_bookings,
    get_booking_by_id,
    transition_booking_status,
    reschedule_booking,
)
from app.routes.dependencies import get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingStatus

router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"],
)


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def book_service(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a service booking (Authenticated customer)."""
    return create_booking(db, customer_id=current_user.id, booking_in=booking_in)


@router.get("/my", response_model=List[BookingResponse])
def list_my_bookings(
    status_filter: Optional[BookingStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve bookings for current customer, provider, or admin."""
    return get_user_bookings(db, current_user, status_filter=status_filter)


@router.get("/{booking_id}", response_model=BookingResponse)
def get_single_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single booking details with tracking history and attachments."""
    return get_booking_by_id(db, booking_id, current_user)


@router.post("/{booking_id}/confirm", response_model=BookingResponse)
def confirm_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provider confirms/accepts pending/requested booking."""
    return transition_booking_status(db, booking_id, current_user, BookingStatus.CONFIRMED, notes="Provider accepted the booking.")


@router.post("/{booking_id}/on-the-way", response_model=BookingResponse)
def provider_on_the_way(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provider marks status as 'On The Way'."""
    return transition_booking_status(db, booking_id, current_user, BookingStatus.PROVIDER_ON_THE_WAY, notes="Provider is on the way to the location.")


@router.post("/{booking_id}/start", response_model=BookingResponse)
def start_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provider starts job (Status -> IN_PROGRESS)."""
    return transition_booking_status(db, booking_id, current_user, BookingStatus.IN_PROGRESS, notes="Service work has begun.")


@router.post("/{booking_id}/complete", response_model=BookingResponse)
def complete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provider completes confirmed booking (Status -> COMPLETED)."""
    return transition_booking_status(db, booking_id, current_user, BookingStatus.COMPLETED, notes="Service completed successfully.")


@router.post("/{booking_id}/reject", response_model=BookingResponse)
def reject_booking(
    booking_id: int,
    reason: Optional[str] = Query(None, description="Reason for rejection"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provider rejects request/pending booking."""
    return transition_booking_status(
        db,
        booking_id,
        current_user,
        BookingStatus.REJECTED,
        notes=reason or "Provider is unavailable at the requested time.",
    )


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    cancel_in: BookingCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel booking with mandatory cancellation reason."""
    return transition_booking_status(
        db,
        booking_id,
        current_user,
        BookingStatus.CANCELLED,
        cancellation_reason=cancel_in.cancellation_reason,
    )


@router.post("/{booking_id}/reschedule", response_model=BookingResponse)
def reschedule_user_booking(
    booking_id: int,
    reschedule_in: BookingRescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reschedule booking to new date and time slot."""
    return reschedule_booking(db, booking_id, current_user, reschedule_in)


@router.patch("/{booking_id}/status", response_model=BookingResponse)
def patch_booking_status(
    booking_id: int,
    status_update: BookingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generic status transition endpoint."""
    return transition_booking_status(
        db,
        booking_id,
        current_user,
        status_update.status,
        notes=status_update.notes or status_update.cancellation_reason,
        cancellation_reason=status_update.cancellation_reason,
    )


@router.get("/provider/{provider_id}/slots")
def get_booked_slots(
    provider_id: int,
    booking_date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    """Get already-booked time slots for a provider on a specific date."""
    try:
        target_date = date.fromisoformat(booking_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    booked = (
        db.query(Booking.time_slot)
        .filter(
            Booking.provider_id == provider_id,
            func.date(Booking.booking_date) == target_date,
            Booking.status.in_([
                BookingStatus.PENDING,
                BookingStatus.REQUESTED,
                BookingStatus.CONFIRMED,
                BookingStatus.PROVIDER_ON_THE_WAY,
                BookingStatus.IN_PROGRESS,
            ]),
        )
        .all()
    )
    return {"booked_slots": [row[0] for row in booked]}
