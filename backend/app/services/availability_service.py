"""
Availability & Dynamic Time Slot Generation Service for NexServe.

Handles:
1. Weekly provider working hours and break periods
2. Dynamic slot generation tailored to exact service duration
3. Precise time-range overlap collision detection against existing bookings
4. Holidays, blocked calendar dates, and past slot filtering
"""

import logging
from typing import List, Optional, Tuple
from datetime import datetime, date, time, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User, UserRole
from app.models.service import Service
from app.models.availability import Availability
from app.models.booking import Booking, BookingStatus
from app.schemas.availability import TimeSlot, ProviderSlotsResponse

logger = logging.getLogger(__name__)


def parse_time_string(t_str: str) -> time:
    """Parse time string like '09:00', '9:00', '09:00 AM', '1:00 PM' to datetime.time."""
    t_str = t_str.strip()
    for fmt in ["%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p", "%I %p"]:
        try:
            return datetime.strptime(t_str, fmt).time()
        except ValueError:
            pass
    return time(9, 0)


def parse_slot_range(slot_str: str) -> Tuple[time, time]:
    """Parse a time slot string like '09:00 AM - 10:00 AM' into start and end time objects."""
    parts = slot_str.split("-")
    if len(parts) == 2:
        return parse_time_string(parts[0]), parse_time_string(parts[1])
    # Fallback to 1-hour slot from single time
    t_start = parse_time_string(parts[0])
    t_end = (datetime.combine(date.today(), t_start) + timedelta(hours=1)).time()
    return t_start, t_end


def is_time_overlapping(start1: time, end1: time, start2: time, end2: time) -> bool:
    """Check if two time intervals [start1, end1) and [start2, end2) overlap."""
    d = date.today()
    dt_s1 = datetime.combine(d, start1)
    dt_e1 = datetime.combine(d, end1)
    dt_s2 = datetime.combine(d, start2)
    dt_e2 = datetime.combine(d, end2)
    return max(dt_s1, dt_s2) < min(dt_e1, dt_e2)


def seed_default_provider_availability(db: Session):
    """Seed standard weekly working schedules (Mon-Sat 09:00-18:00, Break 13:00-14:00) for all providers."""
    providers = db.query(User).filter(User.role == UserRole.PROVIDER).all()
    for p in providers:
        existing_count = db.query(Availability).filter(Availability.provider_id == p.id).count()
        if existing_count == 0:
            # Create Monday (0) to Saturday (5)
            for day in range(6):
                avail = Availability(
                    provider_id=p.id,
                    day_of_week=day,
                    start_time="09:00",
                    end_time="18:00",
                    is_available=True,
                    break_start="13:00",
                    break_end="14:00",
                )
                db.add(avail)
            # Sunday (6): Unavailable by default unless emergency
            sunday_avail = Availability(
                provider_id=p.id,
                day_of_week=6,
                start_time="10:00",
                end_time="16:00",
                is_available=bool(p.emergency_available),
                break_start="13:00",
                break_end="14:00",
            )
            db.add(sunday_avail)
    db.commit()


def generate_provider_slots(
    db: Session,
    provider_id: int,
    target_date_str: str,
    service_id: Optional[int] = None,
    custom_duration_minutes: Optional[int] = None,
) -> ProviderSlotsResponse:
    """
    Generate dynamic, collision-checked time slots for a provider on a specific date.
    """
    # 1. Parse date strictly
    if isinstance(target_date_str, date):
        parsed_date = target_date_str
        date_str = parsed_date.strftime("%Y-%m-%d")
    else:
        date_str = str(target_date_str)
        try:
            parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return ProviderSlotsResponse(
                date=date_str,
                provider_id=provider_id,
                service_id=service_id,
                is_working_day=False,
                message="Invalid date format. Use YYYY-MM-DD.",
                slots=[],
            )

    # 2. Check if provider exists
    provider = db.query(User).filter(User.id == provider_id, User.role == UserRole.PROVIDER).first()
    if not provider:
        return ProviderSlotsResponse(
            date=date_str,
            provider_id=provider_id,
            service_id=service_id,
            is_working_day=False,
            message="Service provider not found.",
            slots=[],
        )

    # 3. Determine service duration
    duration = custom_duration_minutes or 60
    if service_id:
        svc = db.query(Service).filter(Service.id == service_id).first()
        if svc and svc.duration_minutes and svc.duration_minutes > 0:
            duration = svc.duration_minutes

    # 4. Check if date is blocked (holiday / vacation)
    blocked = db.query(Availability).filter(
        Availability.provider_id == provider_id,
        Availability.blocked_date == date_str,
    ).first()

    if blocked:
        return ProviderSlotsResponse(
            date=date_str,
            provider_id=provider_id,
            service_id=service_id,
            duration_minutes=duration,
            is_working_day=False,
            message="Provider has blocked this date (Vacation / Leave).",
            slots=[],
        )

    # 5. Check weekly working schedule for this day_of_week
    day_num = parsed_date.weekday()  # 0=Monday, 6=Sunday
    avail = db.query(Availability).filter(
        Availability.provider_id == provider_id,
        Availability.day_of_week == day_num,
    ).first()

    if avail and not avail.is_available:
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return ProviderSlotsResponse(
            date=date_str,
            provider_id=provider_id,
            service_id=service_id,
            duration_minutes=duration,
            is_working_day=False,
            message=f"Provider is off on {day_names[day_num]}s.",
            slots=[],
        )

    # Default working hours: 09:00 - 18:00
    work_start = parse_time_string(avail.start_time if avail and avail.start_time else "09:00")
    work_end = parse_time_string(avail.end_time if avail and avail.end_time else "18:00")
    break_start = parse_time_string(avail.break_start) if avail and avail.break_start else parse_time_string("13:00")
    break_end = parse_time_string(avail.break_end) if avail and avail.break_end else parse_time_string("14:00")

    # 6. Query existing active bookings for this provider on this date
    # Format target_date string match across both SQLite and Postgres
    existing_bookings = (
        db.query(Booking)
        .filter(
            Booking.provider_id == provider_id,
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

    booked_ranges = []
    for b in existing_bookings:
        if b.booking_date:
            b_date = b.booking_date.strftime("%Y-%m-%d") if isinstance(b.booking_date, datetime) else str(b.booking_date)[:10]
            if b_date == date_str and b.time_slot:
                b_start, b_end = parse_slot_range(b.time_slot)
                booked_ranges.append((b_start, b_end))

    # 7. Generate candidate slots stepping by service duration (or 60 mins if duration >= 60)
    step_minutes = 60 if duration >= 60 else duration
    if step_minutes <= 0:
        step_minutes = 60

    slots: List[TimeSlot] = []
    curr_dt = datetime.combine(parsed_date, work_start)
    end_dt = datetime.combine(parsed_date, work_end)

    now_utc = datetime.now(timezone.utc)
    # Check if target date is in the past
    is_today = (parsed_date == now_utc.date())
    is_past_date = (parsed_date < now_utc.date())

    while curr_dt + timedelta(minutes=duration) <= end_dt:
        slot_start_time = curr_dt.time()
        slot_end_time = (curr_dt + timedelta(minutes=duration)).time()

        slot_start_dt = curr_dt
        slot_end_dt = curr_dt + timedelta(minutes=duration)

        slot_label = f"{slot_start_time.strftime('%I:%M %p')} - {slot_end_time.strftime('%I:%M %p')}"
        start_24h = slot_start_time.strftime("%H:%M")
        end_24h = slot_end_time.strftime("%H:%M")

        # Check conditions
        is_available = True
        reason = None

        if is_past_date:
            is_available = False
            reason = "Past Date"
        elif is_today and curr_dt < (datetime.now() + timedelta(minutes=30)):
            is_available = False
            reason = "Past Time Slot"
        # Check lunch break overlap
        elif is_time_overlapping(slot_start_time, slot_end_time, break_start, break_end):
            is_available = False
            reason = "Lunch / Break Time"
        else:
            # Check existing booking collision
            for b_s, b_e in booked_ranges:
                if is_time_overlapping(slot_start_time, slot_end_time, b_s, b_e):
                    is_available = False
                    reason = "Already Booked"
                    break

        slots.append(
            TimeSlot(
                time=slot_label,
                start_time=start_24h,
                end_time=end_24h,
                available=is_available,
                reason=reason,
            )
        )

        curr_dt += timedelta(minutes=step_minutes)

    return ProviderSlotsResponse(
        date=date_str,
        provider_id=provider_id,
        service_id=service_id,
        duration_minutes=duration,
        is_working_day=True,
        message="Slots generated successfully.",
        slots=slots,
    )
