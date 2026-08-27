"""
Booking Business Logic, State Machine, and Double Booking Prevention.
"""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.booking import Booking, BookingStatus
from app.models.user import UserRole, User
from app.models.address import Address
from app.schemas.booking import BookingCreate, BookingCancelRequest, BookingRescheduleRequest
from app.services.service_service import get_service_by_id
from app.services.notification_service import create_notification

# Enforce valid state transitions for booking state machine
VALID_TRANSITIONS = {
    BookingStatus.PENDING: {BookingStatus.CONFIRMED, BookingStatus.REJECTED, BookingStatus.CANCELLED},
    BookingStatus.CONFIRMED: {BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.CANCELLED},
    BookingStatus.IN_PROGRESS: {BookingStatus.COMPLETED, BookingStatus.CANCELLED},
    BookingStatus.REJECTED: set(),
    BookingStatus.COMPLETED: set(),
    BookingStatus.CANCELLED: set(),
}


def create_booking(db: Session, customer_id: int, booking_in: BookingCreate) -> Booking:
    """
    Create a new service booking for a customer.
    Validates:
    - Service is active
    - Booking date is not in the past
    - Address exists (if provided)
    - Slot is free (prevents double-booking)
    """
    b_date_val = booking_in.booking_date.date() if isinstance(booking_in.booking_date, datetime) else booking_in.booking_date
    now_utc_date = datetime.now(timezone.utc).date()
    now_local_date = datetime.now().date()
    earliest_allowed = min(now_utc_date, now_local_date)
    if b_date_val < earliest_allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create a booking for a past date.",
        )



    service = get_service_by_id(db, booking_in.service_id)
    if not service.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This service is currently inactive.",
        )

    if booking_in.address_id:
        addr = db.query(Address).filter(Address.id == booking_in.address_id, Address.user_id == customer_id).first()
        if not addr:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected address was not found.")

    # Double-booking prevention check: same provider, same date, same time_slot
    target_date_str = booking_in.booking_date.strftime("%Y-%m-%d")
    existing_conflict = (
        db.query(Booking)
        .filter(
            Booking.provider_id == service.provider_id,
            func.date(Booking.booking_date) == target_date_str,
            Booking.time_slot == booking_in.time_slot,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]),
        )

        .first()
    )

    if existing_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"The time slot '{booking_in.time_slot}' is already booked for this provider on {target_date_str}. Please select another slot.",

        )

    # Calculate total amount & emergency surcharge if applicable
    emergency_surcharge = 0.0
    if booking_in.is_emergency:
        emergency_surcharge = round(service.price * 0.20, 2)  # 20% surcharge for emergency urgent service

    total_amount = round(service.price + emergency_surcharge, 2)

    booking = Booking(
        customer_id=customer_id,
        service_id=service.id,
        provider_id=service.provider_id,
        address_id=booking_in.address_id,
        booking_date=booking_in.booking_date,
        time_slot=booking_in.time_slot,
        status=BookingStatus.PENDING,
        total_amount=total_amount,
        notes=booking_in.notes,
        is_emergency=bool(booking_in.is_emergency),
        emergency_surcharge=emergency_surcharge,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Trigger notification to provider
    cust = db.query(User).filter(User.id == customer_id).first()
    cust_name = cust.full_name if cust else "A customer"
    create_notification(
        db,
        user_id=service.provider_id,
        title="New Booking Received",
        message=f"{cust_name} booked '{service.title}' for {target_date_str} ({booking_in.time_slot}).",

        notification_type="booking_created",
        related_booking_id=booking.id,
    )

    return booking


def get_user_bookings(db: Session, current_user: User, status_filter: Optional[BookingStatus] = None) -> List[Booking]:
    """Retrieve bookings based on user role (Customer vs Provider vs Admin)."""
    query = db.query(Booking)
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.PROVIDER:
        query = query.filter(Booking.provider_id == current_user.id)
    else:
        query = query.filter(Booking.customer_id == current_user.id)

    if status_filter:
        query = query.filter(Booking.status == status_filter)

    return query.order_by(Booking.created_at.desc()).all()


def get_booking_by_id(db: Session, booking_id: int, current_user: User) -> Booking:
    """Retrieve single booking verifying access permission."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if current_user.role != UserRole.ADMIN and current_user.id not in [booking.customer_id, booking.provider_id]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this booking.")

    return booking


def transition_booking_status(
    db: Session,
    booking_id: int,
    current_user: User,
    target_status: BookingStatus,
    cancellation_reason: Optional[str] = None,
) -> Booking:
    """Enforces state machine transitions for booking lifecycle."""
    booking = get_booking_by_id(db, booking_id, current_user)

    # State machine transition check
    allowed = VALID_TRANSITIONS.get(booking.status, set())
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition booking from '{booking.status.value}' to '{target_status.value}'. Allowed transitions: {[s.value for s in allowed]}.",
        )

    # Permission restrictions
    if target_status in [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.REJECTED, BookingStatus.COMPLETED]:
        if current_user.role not in [UserRole.PROVIDER, UserRole.ADMIN]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only providers or admins can update booking status to this state.")

    if target_status == BookingStatus.CANCELLED:
        if not cancellation_reason:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cancellation reason is required.")
        booking.cancellation_reason = cancellation_reason
        booking.cancelled_by_id = current_user.id

    booking.status = target_status
    db.commit()
    db.refresh(booking)

    # Notify counterpart
    recipient_id = booking.customer_id if current_user.id == booking.provider_id else booking.provider_id
    create_notification(
        db,
        user_id=recipient_id,
        title=f"Booking {target_status.value.capitalize()}",
        message=f"Booking #{booking.id} status changed to {target_status.value}." + (f" Reason: {cancellation_reason}" if cancellation_reason else ""),
        notification_type=f"booking_{target_status.value}",
        related_booking_id=booking.id,
    )

    return booking


def reschedule_booking(db: Session, booking_id: int, current_user: User, reschedule_in: BookingRescheduleRequest) -> Booking:
    """Reschedule a booking to a new date and time slot."""
    booking = get_booking_by_id(db, booking_id, current_user)

    if booking.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending or confirmed bookings can be rescheduled.")

    new_date = reschedule_in.new_booking_date.replace(tzinfo=None) if reschedule_in.new_booking_date.tzinfo else reschedule_in.new_booking_date
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None).replace(hour=0, minute=0, second=0, microsecond=0)
    if new_date < now_naive:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reschedule to a past date.")


    # Conflict check
    conflict = (
        db.query(Booking)
        .filter(
            Booking.provider_id == booking.provider_id,
            Booking.id != booking.id,
            func.date(Booking.booking_date) == new_date.strftime("%Y-%m-%d"),

            Booking.time_slot == reschedule_in.new_time_slot,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
        .first()
    )

    if conflict:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The requested new time slot is unavailable.")

    booking.rescheduled_from_date = booking.booking_date
    booking.booking_date = new_date
    booking.time_slot = reschedule_in.new_time_slot
    booking.status = BookingStatus.PENDING  # Reset to pending for provider re-confirmation
    db.commit()
    db.refresh(booking)

    recipient_id = booking.customer_id if current_user.id == booking.provider_id else booking.provider_id
    create_notification(
        db,
        user_id=recipient_id,
        title="Booking Rescheduled",
        message=f"Booking #{booking.id} rescheduled to {new_date.date()} ({reschedule_in.new_time_slot}).",
        notification_type="booking_rescheduled",
        related_booking_id=booking.id,
    )

    return booking
