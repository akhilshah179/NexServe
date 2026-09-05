"""
Booking Business Logic, State Machine, Real-Time Tracking, and Double Booking Prevention.
"""

import json
import asyncio
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.booking import Booking, BookingStatus, BookingMode
from app.models.user import UserRole, User, UserBookingMode
from app.models.address import Address
from app.models.booking_tracking import BookingStatusHistory, BookingAttachment
from app.schemas.booking import BookingCreate, BookingCancelRequest, BookingRescheduleRequest
from app.schemas.pricing import PricingCalculateRequest
from app.services.service_service import get_service_by_id
from app.services.notification_service import create_notification
from app.services.pricing_service import calculate_dynamic_price
from app.services.coupon_service import record_coupon_usage
from app.services.referral_service import check_and_reward_referral_on_booking_complete
from app.services.recommendation_service import track_user_interaction
from app.core.ws_manager import ws_manager

# Enforce valid state transitions for booking state machine
VALID_TRANSITIONS = {
    BookingStatus.PENDING: {
        BookingStatus.CONFIRMED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
    },
    BookingStatus.REQUESTED: {
        BookingStatus.CONFIRMED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
    },
    BookingStatus.CONFIRMED: {
        BookingStatus.PROVIDER_ON_THE_WAY,
        BookingStatus.IN_PROGRESS,
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
    },
    BookingStatus.PROVIDER_ON_THE_WAY: {
        BookingStatus.IN_PROGRESS,
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
    },
    BookingStatus.IN_PROGRESS: {
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
    },
    BookingStatus.REJECTED: set(),
    BookingStatus.COMPLETED: set(),
    BookingStatus.CANCELLED: set(),
}


from app.schemas.booking import BookingResponse

def serialize_booking_for_ws(booking: Booking) -> dict:
    """Safely serialize booking SQLAlchemy model to JSON-compatible dict."""
    try:
        return BookingResponse.model_validate(booking).model_dump(mode="json")
    except Exception as e:
        return {
            "id": booking.id,
            "customer_id": booking.customer_id,
            "provider_id": booking.provider_id,
            "service_id": booking.service_id,
            "status": booking.status.value if hasattr(booking.status, "value") else str(booking.status),
            "booking_date": booking.booking_date.isoformat() if hasattr(booking.booking_date, "isoformat") else str(booking.booking_date),
            "time_slot": booking.time_slot,
            "total_amount": booking.total_amount,
            "notes": booking.notes,
            "service": {"title": booking.service.title, "name": booking.service.title} if booking.service else None,
            "customer": {"full_name": booking.customer.full_name, "email": booking.customer.email, "phone_number": getattr(booking.customer, "phone_number", None)} if booking.customer else None,
            "provider": {"full_name": booking.provider.full_name, "email": booking.provider.email, "phone": getattr(booking.provider, "phone_number", None)} if booking.provider else None,
        }


def broadcast_booking_update_sync(
    booking: Booking,
    event_type: str = "status_update",
    notes: Optional[str] = None,
    target_user_id: Optional[int] = None,
):
    """Utility to schedule thread-safe WebSocket broadcast to targeted users and booking room."""
    booking_dict = serialize_booking_for_ws(booking)
    status_str = booking.status.value if hasattr(booking.status, "value") else str(booking.status)
    event_payload = {
        "event": event_type,
        "type": "booking_update",
        "booking": booking_dict,
        "booking_id": booking.id,
        "status": status_str,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "notes": notes,
        "total_amount": booking.total_amount,
        "provider_name": booking.provider.full_name if booking.provider else "Provider",
        "customer_name": booking.customer.full_name if booking.customer else "Customer",
    }

    # Broadcast to listeners of the specific booking room
    ws_manager.broadcast_booking_sync(booking.id, event_payload)

    # If specific target user specified, send only to them
    if target_user_id:
        ws_manager.send_user_notification_sync(target_user_id, event_payload)
    else:
        # Otherwise send targeted updates to customer and provider
        if booking.customer_id:
            ws_manager.send_user_notification_sync(booking.customer_id, event_payload)
        if booking.provider_id:
            ws_manager.send_user_notification_sync(booking.provider_id, event_payload)



def create_booking(db: Session, customer_id: int, booking_in: BookingCreate) -> Booking:
    """
    Create a new service booking with dynamic pricing, coupon application,
    instant/request mode handling, double-booking check, and photo attachments.
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

    customer = db.query(User).filter(User.id == customer_id).first()

    provider_id = booking_in.provider_id or service.provider_id
    provider = db.query(User).filter(User.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service provider not found.")

    selected_addr = None
    if booking_in.address_id:
        selected_addr = db.query(Address).filter(Address.id == booking_in.address_id, Address.user_id == customer_id).first()
        if not selected_addr:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected address was not found.")

    # Double-booking prevention check: same provider, same date, same time_slot
    target_date_val = booking_in.booking_date.date() if isinstance(booking_in.booking_date, datetime) else booking_in.booking_date
    target_date_str = target_date_val.strftime("%Y-%m-%d")

    active_conflict_statuses = [
        BookingStatus.PENDING,
        BookingStatus.REQUESTED,
        BookingStatus.CONFIRMED,
        BookingStatus.PROVIDER_ON_THE_WAY,
        BookingStatus.IN_PROGRESS,
    ]
    all_provider_bookings = (
        db.query(Booking)
        .filter(
            Booking.provider_id == provider.id,
            Booking.status.in_(active_conflict_statuses),
        )
        .all()
    )
    for b in all_provider_bookings:
        if b.booking_date and b.time_slot == booking_in.time_slot:
            b_date_str = b.booking_date.strftime("%Y-%m-%d") if isinstance(b.booking_date, datetime) else str(b.booking_date)[:10]
            if b_date_str == target_date_str:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"The time slot '{booking_in.time_slot}' is already booked for this provider on {target_date_str}. Please select another slot.",
                )

    # ── Dynamic Pricing Calculation ──
    price_req = PricingCalculateRequest(
        service_id=service.id,
        provider_id=provider.id,
        booking_date=target_date_str,
        time_slot=booking_in.time_slot,
        is_emergency=bool(booking_in.is_emergency),
        coupon_code=booking_in.coupon_code,
        apply_referral_credits=bool(booking_in.apply_referral_credits),
        user_latitude=selected_addr.latitude if selected_addr else None,
        user_longitude=selected_addr.longitude if selected_addr else None,
    )
    pricing_res = calculate_dynamic_price(db, price_req, current_user=customer)

    # Deduct referral credits if used
    if pricing_res.referral_discount > 0 and customer:
        customer.referral_credits = max(0.0, getattr(customer, "referral_credits", 0.0) - pricing_res.referral_discount)

    # Determine Booking Mode & Initial Status
    prov_mode = getattr(provider, "booking_mode", UserBookingMode.INSTANT_BOOKING)
    if prov_mode == UserBookingMode.REQUEST_BOOKING:
        initial_status = BookingStatus.REQUESTED
        booking_mode_enum = BookingMode.REQUEST_BOOKING
    else:
        initial_status = BookingStatus.PENDING
        booking_mode_enum = BookingMode.INSTANT_BOOKING

    booking = Booking(
        customer_id=customer_id,
        service_id=service.id,
        provider_id=provider.id,
        address_id=booking_in.address_id,
        booking_date=booking_in.booking_date,
        time_slot=booking_in.time_slot,
        status=initial_status,
        booking_mode=booking_mode_enum,
        total_amount=pricing_res.final_total,
        base_price=pricing_res.base_price,
        discount_amount=pricing_res.discount_amount,
        referral_discount=pricing_res.referral_discount,
        pricing_breakdown=json.dumps([b.model_dump() for b in pricing_res.breakdown]),
        notes=booking_in.notes,
        is_emergency=bool(booking_in.is_emergency),
        emergency_surcharge=pricing_res.emergency_surcharge,
    )
    db.add(booking)
    db.flush()

    # Log initial status in history
    history = BookingStatusHistory(
        booking_id=booking.id,
        from_status=None,
        to_status=initial_status.value,
        changed_by_id=customer_id,
        notes="Booking created by customer." if initial_status == BookingStatus.PENDING else "Booking requested by customer (awaiting provider acceptance).",
    )
    db.add(history)

    # Attach photo attachments if provided
    if booking_in.attachment_urls:
        for url in booking_in.attachment_urls:
            att = BookingAttachment(
                booking_id=booking.id,
                file_url=url,
                file_name=url.split("/")[-1],
                file_size=1024,
                mime_type="image/jpeg",
                uploaded_by_id=customer_id,
            )
            db.add(att)

    if booking_in.attachment_ids:
        db.query(BookingAttachment).filter(
            BookingAttachment.id.in_(booking_in.attachment_ids),
            BookingAttachment.uploaded_by_id == customer_id,
        ).update({"booking_id": booking.id}, synchronize_session=False)

    db.commit()
    db.refresh(booking)

    # Record coupon usage if coupon applied
    if pricing_res.coupon_code and pricing_res.discount_amount > 0:
        from app.models.coupon import Coupon
        cpn = db.query(Coupon).filter(Coupon.code == pricing_res.coupon_code).first()
        if cpn:
            record_coupon_usage(db, cpn.id, customer_id, booking.id, pricing_res.discount_amount)

    # Log Recommendation Interaction
    track_user_interaction(db, customer_id, service.id, "book", service.category_id)

    # Trigger notification to provider
    cust_name = customer.full_name if customer else "A customer"
    msg_title = "New Booking Request" if initial_status == BookingStatus.REQUESTED else "New Booking Placed"
    create_notification(
        db,
        user_id=provider.id,
        title=msg_title,
        message=f"{cust_name} { 'requested' if initial_status == BookingStatus.REQUESTED else 'booked' } '{service.title}' for {target_date_str} ({booking_in.time_slot}).",
        notification_type="booking_created",
        related_booking_id=booking.id,
    )

    # Live WebSocket Broadcast
    broadcast_booking_update_sync(booking, event_type="booking_created")

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
    notes: Optional[str] = None,
    cancellation_reason: Optional[str] = None,
) -> Booking:
    """Enforces state machine transitions, audit history logging, and live WebSocket broadcast."""
    booking = get_booking_by_id(db, booking_id, current_user)
    prev_status = booking.status

    # State machine transition check
    allowed = VALID_TRANSITIONS.get(booking.status, set())
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition booking from '{booking.status.value}' to '{target_status.value}'. Allowed transitions: {[s.value for s in allowed]}.",
        )

    # Permission restrictions
    provider_only_statuses = [
        BookingStatus.CONFIRMED,
        BookingStatus.PROVIDER_ON_THE_WAY,
        BookingStatus.IN_PROGRESS,
        BookingStatus.REJECTED,
        BookingStatus.COMPLETED,
    ]
    if target_status in provider_only_statuses:
        if current_user.role not in [UserRole.PROVIDER, UserRole.ADMIN]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only providers or admins can update booking status to this state.")

    if target_status == BookingStatus.CANCELLED:
        reason = cancellation_reason or notes
        if not reason:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cancellation reason is required.")
        booking.cancellation_reason = reason
        booking.cancelled_by_id = current_user.id

    booking.status = target_status

    # Record Status History Audit Trail
    history = BookingStatusHistory(
        booking_id=booking.id,
        from_status=prev_status.value if hasattr(prev_status, "value") else str(prev_status),
        to_status=target_status.value if hasattr(target_status, "value") else str(target_status),
        changed_by_id=current_user.id,
        notes=notes or cancellation_reason,
    )
    db.add(history)
    db.commit()
    db.refresh(booking)

    # Check referral reward release if completed
    if target_status == BookingStatus.COMPLETED:
        check_and_reward_referral_on_booking_complete(db, booking)

    # Notify counterpart
    recipient_id = booking.customer_id if current_user.id == booking.provider_id else booking.provider_id
    prov_name = booking.provider.full_name if booking.provider else "Your provider"
    cust_name = booking.customer.full_name if booking.customer else "Customer"

    if target_status == BookingStatus.PROVIDER_ON_THE_WAY:
        notif_title = "Provider On The Way"
        notif_msg = f"{prov_name} is on the way to your location 🚗"
    elif target_status == BookingStatus.CONFIRMED:
        notif_title = "Booking Confirmed"
        notif_msg = f"Your booking #{booking.id} has been confirmed by {prov_name}."
    elif target_status == BookingStatus.IN_PROGRESS:
        notif_title = "Service In Progress"
        notif_msg = f"{prov_name} has started working on your service (Booking #{booking.id}) 🛠️"
    elif target_status == BookingStatus.COMPLETED:
        notif_title = "Service Completed"
        notif_msg = f"Service for booking #{booking.id} has been completed successfully! ⭐"
    elif target_status == BookingStatus.REJECTED:
        notif_title = "Booking Request Declined"
        notif_msg = f"Your booking request #{booking.id} could not be accepted." + (f" Note: {notes}" if notes else "")
    elif target_status == BookingStatus.CANCELLED:
        notif_title = "Booking Cancelled"
        notif_msg = f"Booking #{booking.id} was cancelled by {current_user.full_name}." + (f" Reason: {cancellation_reason or notes}" if (cancellation_reason or notes) else "")
    else:
        status_label = target_status.value.replace("_", " ").title()
        notif_title = f"Booking {status_label}"
        notif_msg = f"Booking #{booking.id} status updated to {status_label}." + (f" Note: {notes or cancellation_reason}" if (notes or cancellation_reason) else "")

    create_notification(
        db,
        user_id=recipient_id,
        title=notif_title,
        message=notif_msg,
        notification_type=f"booking_{target_status.value}",
        related_booking_id=booking.id,
    )

    # Broadcast Live WebSocket Event
    broadcast_booking_update_sync(booking, event_type="status_update", notes=notes or cancellation_reason)

    return booking


def reschedule_booking(db: Session, booking_id: int, current_user: User, reschedule_in: BookingRescheduleRequest) -> Booking:
    """Reschedule a booking to a new date and time slot."""
    booking = get_booking_by_id(db, booking_id, current_user)

    if booking.status not in [BookingStatus.PENDING, BookingStatus.REQUESTED, BookingStatus.CONFIRMED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending, requested or confirmed bookings can be rescheduled.")

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
            Booking.status.in_([
                BookingStatus.PENDING,
                BookingStatus.REQUESTED,
                BookingStatus.CONFIRMED,
                BookingStatus.PROVIDER_ON_THE_WAY,
                BookingStatus.IN_PROGRESS,
            ]),
        )
        .first()
    )

    if conflict:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The requested new time slot is unavailable.")

    prev_status = booking.status
    booking.rescheduled_from_date = booking.booking_date
    booking.booking_date = new_date
    booking.time_slot = reschedule_in.new_time_slot
    booking.status = BookingStatus.PENDING  # Reset to pending for provider re-confirmation

    history = BookingStatusHistory(
        booking_id=booking.id,
        from_status=prev_status.value,
        to_status=BookingStatus.PENDING.value,
        changed_by_id=current_user.id,
        notes=f"Rescheduled to {new_date.date()} ({reschedule_in.new_time_slot})",
    )
    db.add(history)
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

    broadcast_booking_update_sync(booking, event_type="booking_rescheduled", notes=f"Rescheduled to {new_date.date()} ({reschedule_in.new_time_slot})")

    return booking
