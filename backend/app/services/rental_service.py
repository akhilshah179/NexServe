"""
Rental Marketplace Service — Availability, Pricing, Lifecycles, Deposits, and Damage Claims.
"""

import json
import logging
from typing import List, Optional, Tuple, Union, Any
from datetime import datetime, timezone, date
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from fastapi import HTTPException, status

from app.models.rental import (
    RentalCategory,
    RentalItem,
    RentalImage,
    RentalBooking,
    RentalBookingStatus,
    RentalFulfillmentType,
    RentalBookingStatusHistory,
    SecurityDeposit,
    DepositStatus,
    RentalReturn,
    DamageClaim,
    DamageClaimStatus,
    RentalReview,
)
from app.models.user import User, UserRole
from app.models.address import Address
from app.models.coupon import Coupon, DiscountType
from app.schemas.rental import (
    RentalItemCreate,
    RentalItemUpdate,
    RentalBookingCreate,
    RentalPriceCalculateRequest,
    RentalPriceCalculateResponse,
    RentalPriceBreakdownItem,
    RentalReturnCreate,
    DamageClaimCreate,
    DamageClaimReviewRequest,
    RentalReviewCreate,
)
from app.services.notification_service import create_notification
from app.services.coupon_service import record_coupon_usage
from app.core.ws_manager import ws_manager

logger = logging.getLogger(__name__)

# Active conflict statuses for overlapping availability checks
ACTIVE_RENTAL_CONFLICT_STATUSES = [
    RentalBookingStatus.REQUESTED,
    RentalBookingStatus.CONFIRMED,
    RentalBookingStatus.PAYMENT_COMPLETED,
    RentalBookingStatus.READY_FOR_PICKUP,
    RentalBookingStatus.READY_FOR_DELIVERY,
    RentalBookingStatus.RENTED,
    RentalBookingStatus.RETURN_PENDING,
]

VALID_RENTAL_TRANSITIONS = {
    RentalBookingStatus.REQUESTED: {
        RentalBookingStatus.CONFIRMED,
        RentalBookingStatus.REJECTED,
        RentalBookingStatus.CANCELLED,
    },
    RentalBookingStatus.CONFIRMED: {
        RentalBookingStatus.PAYMENT_COMPLETED,
        RentalBookingStatus.READY_FOR_PICKUP,
        RentalBookingStatus.READY_FOR_DELIVERY,
        RentalBookingStatus.RENTED,
        RentalBookingStatus.CANCELLED,
    },
    RentalBookingStatus.PAYMENT_COMPLETED: {
        RentalBookingStatus.READY_FOR_PICKUP,
        RentalBookingStatus.READY_FOR_DELIVERY,
        RentalBookingStatus.RENTED,
        RentalBookingStatus.CANCELLED,
    },
    RentalBookingStatus.READY_FOR_PICKUP: {
        RentalBookingStatus.RENTED,
        RentalBookingStatus.CANCELLED,
    },
    RentalBookingStatus.READY_FOR_DELIVERY: {
        RentalBookingStatus.RENTED,
        RentalBookingStatus.CANCELLED,
    },
    RentalBookingStatus.RENTED: {
        RentalBookingStatus.RETURN_PENDING,
        RentalBookingStatus.RETURNED,
        RentalBookingStatus.DAMAGE_REPORTED,
    },
    RentalBookingStatus.RETURN_PENDING: {
        RentalBookingStatus.RETURNED,
        RentalBookingStatus.DAMAGE_REPORTED,
    },
    RentalBookingStatus.RETURNED: {
        RentalBookingStatus.INSPECTED,
        RentalBookingStatus.DAMAGE_REPORTED,
        RentalBookingStatus.COMPLETED,
    },
    RentalBookingStatus.INSPECTED: {
        RentalBookingStatus.COMPLETED,
        RentalBookingStatus.DAMAGE_REPORTED,
    },
    RentalBookingStatus.DAMAGE_REPORTED: {
        RentalBookingStatus.COMPLETED,
    },
    RentalBookingStatus.COMPLETED: set(),
    RentalBookingStatus.CANCELLED: set(),
    RentalBookingStatus.REJECTED: set(),
}


def _normalize_date(dt: Union[str, datetime, date, None]) -> datetime:
    """Ensure datetime has UTC timezone from str, date, or datetime."""
    if dt is None:
        return datetime.now(timezone.utc)
    if isinstance(dt, str):
        try:
            if "T" in dt:
                parsed = datetime.fromisoformat(dt)
            else:
                parsed = datetime.strptime(dt, "%Y-%m-%d")
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return datetime.now(timezone.utc)
    if isinstance(dt, datetime):
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    if isinstance(dt, date):
        return datetime(dt.year, dt.month, dt.day, 0, 0, 0, tzinfo=timezone.utc)
    return dt


def _parse_booking_status(val: Union[RentalBookingStatus, str]) -> RentalBookingStatus:
    if isinstance(val, RentalBookingStatus):
        return val
    val_clean = str(val).strip().upper()
    try:
        return RentalBookingStatus[val_clean]
    except KeyError:
        return RentalBookingStatus(val_clean)


def apply_coupon_discount(coupon: Coupon, subtotal: float) -> float:
    if not coupon or not coupon.is_active:
        return 0.0
    if coupon.discount_type == DiscountType.PERCENTAGE:
        discount = round((subtotal * coupon.discount_value) / 100.0, 2)
        if coupon.max_discount is not None:
            discount = min(discount, coupon.max_discount)
        return discount
    else:
        return min(subtotal, round(coupon.discount_value, 2))


def broadcast_rental_update_sync(rental_booking: RentalBooking, event_type: str = "rental_status_update", notes: Optional[str] = None):
    """Broadcast real-time WebSocket notification to customer and provider."""
    status_str = rental_booking.status.value if hasattr(rental_booking.status, "value") else str(rental_booking.status)
    item_name = rental_booking.rental_item.name if rental_booking.rental_item else "Rental Item"
    event_payload = {
        "event": event_type,
        "type": "rental_booking_update",
        "rental_booking_id": rental_booking.id,
        "status": status_str,
        "item_name": item_name,
        "total_amount_charged": rental_booking.total_amount_charged,
        "security_deposit_amount": rental_booking.security_deposit_amount,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "notes": notes,
    }
    if rental_booking.customer_id:
        ws_manager.send_user_notification_sync(rental_booking.customer_id, event_payload)
    if rental_booking.provider_id:
        ws_manager.send_user_notification_sync(rental_booking.provider_id, event_payload)


# ── Category Management ──────────────────────────────────
def get_all_rental_categories(db: Session, active_only: bool = True) -> List[RentalCategory]:
    query = db.query(RentalCategory)
    if active_only:
        query = query.filter(RentalCategory.is_active == True)
    categories = query.order_by(RentalCategory.name.asc()).all()

    for cat in categories:
        cat.item_count = db.query(RentalItem).filter(RentalItem.category_id == cat.id, RentalItem.is_active == True).count()
    return categories


def get_rental_category_by_id(db: Session, category_id: int) -> RentalCategory:
    cat = db.query(RentalCategory).filter(RentalCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental category not found.")
    cat.item_count = db.query(RentalItem).filter(RentalItem.category_id == cat.id, RentalItem.is_active == True).count()
    return cat


# ── Rental Item Discovery & Management ───────────────────
def list_rental_items(
    db: Session,
    category_id: Optional[int] = None,
    category_slug: Optional[str] = None,
    search: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: Optional[str] = "popularity",
    provider_id: Optional[int] = None,
    include_inactive: bool = False,
) -> List[RentalItem]:
    query = db.query(RentalItem)
    if not include_inactive:
        query = query.filter(RentalItem.is_active == True)

    if category_id:
        query = query.filter(RentalItem.category_id == category_id)

    if category_slug:
        query = query.join(RentalCategory, RentalItem.category_id == RentalCategory.id).filter(RentalCategory.slug == category_slug)

    if provider_id:
        query = query.filter(RentalItem.provider_id == provider_id)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                RentalItem.name.ilike(search_pattern),
                RentalItem.title.ilike(search_pattern),
                RentalItem.description.ilike(search_pattern),
                RentalItem.location.ilike(search_pattern),
            )
        )

    if location:
        query = query.filter(
            or_(
                RentalItem.location.ilike(f"%{location.strip()}%"),
                RentalItem.city.ilike(f"%{location.strip()}%"),
            )
        )

    if min_price is not None:
        query = query.filter(RentalItem.price_per_day >= min_price)

    if max_price is not None:
        query = query.filter(RentalItem.price_per_day <= max_price)

    if min_rating is not None:
        query = query.filter(RentalItem.rating >= min_rating)

    # Date-range availability filter
    if start_date and end_date:
        try:
            req_start = _normalize_date(start_date)
            req_end = _normalize_date(end_date)

            conflicts_subquery = (
                db.query(RentalBooking.rental_item_id)
                .filter(
                    RentalBooking.status.in_(ACTIVE_RENTAL_CONFLICT_STATUSES),
                    RentalBooking.start_date <= req_end,
                    RentalBooking.end_date >= req_start,
                )
                .group_by(RentalBooking.rental_item_id)
                .having(func.coalesce(func.sum(RentalBooking.quantity), 0) >= RentalItem.quantity)
                .subquery()
            )
            query = query.filter(RentalItem.id.not_in(conflicts_subquery))
        except Exception as e:
            logger.warning(f"Error filtering by dates: {e}")

    # Sorting
    if sort_by == "price_asc":
        query = query.order_by(RentalItem.price_per_day.asc())
    elif sort_by == "price_desc":
        query = query.order_by(RentalItem.price_per_day.desc())
    elif sort_by == "rating":
        query = query.order_by(RentalItem.rating.desc(), RentalItem.review_count.desc())
    else:  # popularity
        query = query.order_by(RentalItem.review_count.desc(), RentalItem.rating.desc(), RentalItem.id.desc())

    return query.all()


def get_rental_item_by_id(db: Session, item_id: int) -> RentalItem:
    item = db.query(RentalItem).filter(RentalItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental item not found.")
    return item


def create_rental_item(db: Session, provider_id: int, item_in: RentalItemCreate) -> RentalItem:
    get_rental_category_by_id(db, item_in.category_id)

    title_val = item_in.title or item_in.name or "Rental Item"
    name_val = item_in.name or item_in.title or "Rental Item"
    price_val = item_in.daily_rate if item_in.daily_rate is not None else (item_in.price_per_day if item_in.price_per_day is not None else 0.0)
    deliv_avail = item_in.delivery_available if item_in.delivery_available is not None else item_in.is_delivery_available
    pickup_avail = item_in.pickup_available if item_in.pickup_available is not None else item_in.is_pickup_available
    city_val = item_in.city or item_in.location or "Bengaluru"
    loc_val = item_in.location or item_in.city or "Bengaluru, India"

    item = RentalItem(
        provider_id=provider_id,
        category_id=item_in.category_id,
        name=name_val,
        title=title_val,
        description=item_in.description,
        brand=item_in.brand,
        model=item_in.model,
        location=loc_val,
        city=city_val,
        latitude=item_in.latitude,
        longitude=item_in.longitude,
        price_per_day=price_val,
        daily_rate=price_val,
        price_per_hour=item_in.price_per_hour,
        security_deposit=item_in.security_deposit or 0.0,
        is_delivery_available=deliv_avail,
        delivery_available=deliv_avail,
        is_pickup_available=pickup_avail,
        pickup_available=pickup_avail,
        delivery_fee=item_in.delivery_fee or 0.0,
        pickup_address=item_in.pickup_address,
        service_area=item_in.service_area or "Within city limits",
        condition=item_in.condition or "Like New",
        quantity=max(1, item_in.quantity or 1),
        min_rental_days=item_in.min_rental_days or 1,
        max_rental_days=item_in.max_rental_days or 30,
        terms_and_conditions=item_in.terms_and_conditions,
        is_active=item_in.is_active if item_in.is_active is not None else True,
    )
    db.add(item)
    db.flush()

    if item_in.images:
        for idx, img_obj in enumerate(item_in.images):
            img_url = img_obj if isinstance(img_obj, str) else (img_obj.get("image_url") if isinstance(img_obj, dict) else getattr(img_obj, "image_url", str(img_obj)))
            img = RentalImage(
                rental_item_id=item.id,
                image_url=img_url,
                is_primary=(idx == 0),
            )
            db.add(img)

    db.commit()
    db.refresh(item)
    return item


def update_rental_item(db: Session, item_id: int, provider_user: User, update_in: RentalItemUpdate) -> RentalItem:
    item = get_rental_item_by_id(db, item_id)
    if provider_user.role != UserRole.ADMIN and item.provider_id != provider_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this rental listing.")

    update_data = update_in.model_dump(exclude_unset=True)
    images_data = update_data.pop("images", None)

    for field, value in update_data.items():
        if hasattr(item, field) and value is not None:
            setattr(item, field, value)

    # Keep aliases synchronized
    if "title" in update_data and not update_data.get("name"):
        item.name = update_data["title"]
    elif "name" in update_data and not update_data.get("title"):
        item.title = update_data["name"]

    if "daily_rate" in update_data and not update_data.get("price_per_day"):
        item.price_per_day = update_data["daily_rate"]
    elif "price_per_day" in update_data and not update_data.get("daily_rate"):
        item.daily_rate = update_data["price_per_day"]

    if images_data is not None:
        db.query(RentalImage).filter(RentalImage.rental_item_id == item.id).delete()
        for idx, img_obj in enumerate(images_data):
            img_url = img_obj if isinstance(img_obj, str) else (img_obj.get("image_url") if isinstance(img_obj, dict) else getattr(img_obj, "image_url", str(img_obj)))
            img = RentalImage(
                rental_item_id=item.id,
                image_url=img_url,
                is_primary=(idx == 0),
            )
            db.add(img)

    db.commit()
    db.refresh(item)
    return item


def delete_rental_item(db: Session, item_id: int, provider_user: User) -> dict:
    item = get_rental_item_by_id(db, item_id)
    if provider_user.role != UserRole.ADMIN and item.provider_id != provider_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this rental listing.")

    item.is_active = False
    db.commit()
    return {"message": "Rental item listing deactivated successfully."}


# ── Availability Checking ────────────────────────────────
def check_rental_item_availability(
    db: Session,
    rental_item_id: int,
    start_date: Union[str, datetime, date],
    end_date: Union[str, datetime, date],
    quantity: int = 1,
    exclude_booking_id: Optional[int] = None,
) -> Tuple[bool, int, str]:
    item = get_rental_item_by_id(db, rental_item_id)
    if not item.is_active:
        return False, 0, "This rental item is currently inactive."

    req_start = _normalize_date(start_date)
    req_end = _normalize_date(end_date)

    if req_end < req_start:
        return False, 0, "End date must be after start date."

    query = (
        db.query(func.coalesce(func.sum(RentalBooking.quantity), 0))
        .filter(
            RentalBooking.rental_item_id == rental_item_id,
            RentalBooking.status.in_(ACTIVE_RENTAL_CONFLICT_STATUSES),
            RentalBooking.start_date <= req_end,
            RentalBooking.end_date >= req_start,
        )
    )

    if exclude_booking_id:
        query = query.filter(RentalBooking.id != exclude_booking_id)

    conflict_count = query.scalar() or 0
    req_qty = max(1, quantity or 1)
    if (conflict_count + req_qty) > item.quantity:
        return (
            False,
            conflict_count,
            f"The item '{item.name}' is already booked from {req_start.strftime('%Y-%m-%d')} to {req_end.strftime('%Y-%m-%d')}. Only {max(0, item.quantity - conflict_count)} unit(s) available.",
        )

    return True, conflict_count, "Item is available for the selected dates."


# ── Pricing Calculation ──────────────────────────────────
def calculate_rental_price(
    db: Session,
    req: RentalPriceCalculateRequest,
    current_user: Optional[User] = None,
) -> RentalPriceCalculateResponse:
    item = get_rental_item_by_id(db, req.rental_item_id)

    req_start = _normalize_date(req.start_date)
    req_end = _normalize_date(req.end_date)

    if req_end < req_start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date must be after start date.")

    # Calculate inclusive rental days (e.g. Day 0, 1, 2 = 3 days)
    diff_days = (req_end.date() - req_start.date()).days + 1
    total_days = max(1, diff_days)
    qty = max(1, req.quantity or 1)

    daily_rate = item.daily_rate if item.daily_rate is not None else item.price_per_day
    rental_subtotal = round(daily_rate * total_days * qty, 2)

    is_delivery = (
        req.delivery_requested is True
        or (isinstance(req.fulfillment_type, str) and req.fulfillment_type.upper() == "DELIVERY")
        or req.fulfillment_type == RentalFulfillmentType.DELIVERY
    )
    delivery_fee = round(item.delivery_fee, 2) if is_delivery else 0.0

    discount_amount = 0.0
    coupon_code_applied = None
    if req.coupon_code:
        cpn = db.query(Coupon).filter(Coupon.code == req.coupon_code.strip().upper()).first()
        if cpn and cpn.is_active:
            discount_amount = apply_coupon_discount(cpn, rental_subtotal)
            coupon_code_applied = cpn.code

    final_rental_amount = max(0.0, round(rental_subtotal + delivery_fee - discount_amount, 2))
    security_deposit = round(item.security_deposit or 0.0, 2)
    total_amount_charged = round(final_rental_amount + security_deposit, 2)

    breakdown = [
        RentalPriceBreakdownItem(label=f"Rental ({total_days} day{'s' if total_days > 1 else ''} × ₹{daily_rate:g})", amount=rental_subtotal),
    ]
    if delivery_fee > 0:
        breakdown.append(RentalPriceBreakdownItem(label="Doorstep Delivery Fee", amount=delivery_fee))
    if discount_amount > 0:
        breakdown.append(RentalPriceBreakdownItem(label=f"Promo Coupon ({coupon_code_applied})", amount=-discount_amount, is_discount=True))
    breakdown.append(RentalPriceBreakdownItem(label="Final Rental Amount", amount=final_rental_amount))
    breakdown.append(RentalPriceBreakdownItem(label="Refundable Security Deposit (Separately Held)", amount=security_deposit, is_deposit=True))
    breakdown.append(RentalPriceBreakdownItem(label="Total Amount Payable at Checkout", amount=total_amount_charged))

    return RentalPriceCalculateResponse(
        rental_item_id=item.id,
        days=total_days,
        total_days=total_days,
        quantity=qty,
        daily_rate=daily_rate,
        subtotal=rental_subtotal,
        rental_subtotal=rental_subtotal,
        delivery_fee=delivery_fee,
        discount_amount=discount_amount,
        coupon_code=coupon_code_applied,
        final_rental_amount=final_rental_amount,
        security_deposit_amount=security_deposit,
        security_deposit=security_deposit,
        total_amount_charged=total_amount_charged,
        breakdown=breakdown,
    )


# ── Rental Booking Creation & State Machine ──────────────
def create_rental_booking(db: Session, customer_id: int, booking_in: RentalBookingCreate) -> RentalBooking:
    item = get_rental_item_by_id(db, booking_in.rental_item_id)
    if not item.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This item is currently unavailable for rent.")

    if item.provider_id == customer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot rent your own listed item.")

    req_start = _normalize_date(booking_in.start_date)
    req_end = _normalize_date(booking_in.end_date)
    booking_qty = max(1, booking_in.quantity or 1)

    # Overlap conflict check
    is_avail, conflict_count, msg = check_rental_item_availability(db, item.id, req_start, req_end, quantity=booking_qty)
    if not is_avail:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)

    # Delivery address validation
    is_delivery = (
        (isinstance(booking_in.fulfillment_type, str) and booking_in.fulfillment_type.upper() == "DELIVERY")
        or booking_in.fulfillment_type == RentalFulfillmentType.DELIVERY
    )
    if is_delivery and booking_in.address_id:
        addr = db.query(Address).filter(Address.id == booking_in.address_id, Address.user_id == customer_id).first()
        if not addr:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected delivery address not found.")

    customer = db.query(User).filter(User.id == customer_id).first()

    # Pricing calculation
    calc_req = RentalPriceCalculateRequest(
        rental_item_id=item.id,
        start_date=req_start,
        end_date=req_end,
        quantity=booking_qty,
        fulfillment_type="DELIVERY" if is_delivery else "PICKUP",
        delivery_requested=is_delivery,
        coupon_code=booking_in.coupon_code,
    )
    pricing_res = calculate_rental_price(db, calc_req, current_user=customer)

    coupon_id = None
    if pricing_res.coupon_code:
        cpn = db.query(Coupon).filter(Coupon.code == pricing_res.coupon_code).first()
        if cpn:
            coupon_id = cpn.id

    booking = RentalBooking(
        customer_id=customer_id,
        provider_id=item.provider_id,
        rental_item_id=item.id,
        address_id=booking_in.address_id if is_delivery else None,
        delivery_address=booking_in.delivery_address,
        special_instructions=booking_in.special_instructions,
        quantity=booking_qty,
        start_date=req_start,
        end_date=req_end,
        total_days=pricing_res.total_days,
        daily_rate=pricing_res.daily_rate,
        rental_subtotal=pricing_res.rental_subtotal,
        delivery_fee=pricing_res.delivery_fee,
        discount_amount=pricing_res.discount_amount,
        coupon_id=coupon_id,
        final_rental_amount=pricing_res.final_rental_amount,
        security_deposit_amount=pricing_res.security_deposit_amount,
        total_amount_charged=pricing_res.total_amount_charged,
        fulfillment_type=RentalFulfillmentType.DELIVERY if is_delivery else RentalFulfillmentType.PICKUP,
        status=RentalBookingStatus.REQUESTED,
        notes=booking_in.notes,
    )
    db.add(booking)
    db.flush()

    # Initial history record
    history = RentalBookingStatusHistory(
        rental_booking_id=booking.id,
        from_status=None,
        to_status=RentalBookingStatus.REQUESTED.value,
        changed_by_id=customer_id,
        notes="Rental requested by customer.",
    )
    db.add(history)

    # Initialize Security Deposit record
    security_deposit = SecurityDeposit(
        rental_booking_id=booking.id,
        customer_id=customer_id,
        provider_id=item.provider_id,
        deposit_amount=pricing_res.security_deposit_amount,
        status=DepositStatus.HELD,
        notes=f"Held for booking #{booking.id} ({item.name})",
    )
    db.add(security_deposit)

    db.commit()
    db.refresh(booking)

    if coupon_id and pricing_res.discount_amount > 0:
        record_coupon_usage(db, coupon_id, customer_id, booking.id, pricing_res.discount_amount)

    cust_name = customer.full_name if customer else "A customer"
    create_notification(
        db,
        user_id=item.provider_id,
        title="New Rental Request",
        message=f"{cust_name} requested to rent '{item.name}' from {req_start.strftime('%d %b')} to {req_end.strftime('%d %b')}.",
        notification_type="rental_booking_requested",
        related_booking_id=booking.id,
    )

    broadcast_rental_update_sync(booking, event_type="new_rental_booking")
    return booking


def get_user_rental_bookings(
    db: Session,
    current_user: User,
    status_filter: Optional[RentalBookingStatus] = None,
) -> List[RentalBooking]:
    query = db.query(RentalBooking)
    if current_user.role == UserRole.ADMIN:
        pass
    elif current_user.role == UserRole.PROVIDER:
        query = query.filter(RentalBooking.provider_id == current_user.id)
    else:
        query = query.filter(RentalBooking.customer_id == current_user.id)

    if status_filter:
        query = query.filter(RentalBooking.status == status_filter)

    return query.order_by(RentalBooking.created_at.desc()).all()


def get_rental_booking_by_id(db: Session, booking_id: int, current_user: User) -> RentalBooking:
    booking = db.query(RentalBooking).filter(RentalBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental booking not found.")

    if current_user.role != UserRole.ADMIN and current_user.id not in [booking.customer_id, booking.provider_id]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this rental booking.")

    return booking


def transition_rental_status(
    db: Session,
    booking_id: int,
    current_user: User,
    target_status: Union[RentalBookingStatus, str],
    notes: Optional[str] = None,
    cancellation_reason: Optional[str] = None,
) -> RentalBooking:
    booking = get_rental_booking_by_id(db, booking_id, current_user)
    prev_status = booking.status

    target_status_enum = _parse_booking_status(target_status)

    if target_status_enum == RentalBookingStatus.CANCELLED:
        reason = cancellation_reason or notes
        if not reason:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cancellation reason is required.")
        booking.cancellation_reason = reason
        booking.cancelled_by_id = current_user.id

        if booking.security_deposit_record:
            booking.security_deposit_record.status = DepositStatus.REFUNDED
            booking.security_deposit_record.refund_amount = booking.security_deposit_record.deposit_amount
            booking.security_deposit_record.refunded_at = datetime.now(timezone.utc)

    booking.status = target_status_enum

    # Audit history
    history = RentalBookingStatusHistory(
        rental_booking_id=booking.id,
        from_status=prev_status.value if hasattr(prev_status, "value") else str(prev_status),
        to_status=target_status_enum.value if hasattr(target_status_enum, "value") else str(target_status_enum),
        changed_by_id=current_user.id,
        notes=notes or cancellation_reason,
    )
    db.add(history)
    db.commit()
    db.refresh(booking)

    # Notify counterpart
    recipient_id = booking.customer_id if current_user.id == booking.provider_id else booking.provider_id
    status_label = target_status_enum.value.replace("_", " ").title()
    create_notification(
        db,
        user_id=recipient_id,
        title=f"Rental {status_label}",
        message=f"Rental booking #{booking.id} for '{booking.rental_item.name}' is now {status_label}." + (f" Note: {notes}" if notes else ""),
        notification_type=f"rental_{target_status_enum.value}",
        related_booking_id=booking.id,
    )

    broadcast_rental_update_sync(booking, event_type="rental_status_update", notes=notes or cancellation_reason)
    return booking


# ── Return Inspection & Damage Claims ────────────────────
def process_rental_return(
    db: Session,
    booking_id: int,
    inspector_user: User,
    return_in: RentalReturnCreate,
) -> RentalBooking:
    booking = get_rental_booking_by_id(db, booking_id, inspector_user)
    if inspector_user.role not in [UserRole.PROVIDER, UserRole.ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only providers or admins can inspect returns.")

    deduction_amt = return_in.damage_deduction_amount or (return_in.damage_deduction_paise / 100.0 if return_in.damage_deduction_paise else 0.0)

    return_record = RentalReturn(
        rental_booking_id=booking.id,
        inspected_by_id=inspector_user.id,
        return_date=datetime.now(timezone.utc),
        condition_on_return=return_in.item_condition,
        is_damaged=return_in.is_damaged,
        damage_deduction_amount=deduction_amt,
        inspection_notes=return_in.inspection_notes,
    )
    db.add(return_record)

    if not return_in.is_damaged:
        booking.status = RentalBookingStatus.COMPLETED

        if booking.security_deposit_record:
            booking.security_deposit_record.status = DepositStatus.REFUNDED
            booking.security_deposit_record.refund_amount = booking.security_deposit_record.deposit_amount
            booking.security_deposit_record.refunded_at = datetime.now(timezone.utc)
            booking.security_deposit_record.notes = "Full deposit released after successful inspection."

        create_notification(
            db,
            user_id=booking.customer_id,
            title="Security Deposit Refund Initiated",
            message=f"Your rental item '{booking.rental_item.name}' passed inspection! Full deposit of ₹{booking.security_deposit_amount:g} has been refunded.",
            notification_type="rental_deposit_refunded",
            related_booking_id=booking.id,
        )
    else:
        booking.status = RentalBookingStatus.DAMAGE_REPORTED
        if booking.security_deposit_record:
            booking.security_deposit_record.status = DepositStatus.REFUND_PENDING
            booking.security_deposit_record.notes = f"Deposit held pending damage claim. Reason: {return_in.inspection_notes}"

        create_notification(
            db,
            user_id=booking.customer_id,
            title="Damage Reported on Rental Item",
            message=f"Inspection found damage on '{booking.rental_item.name}'. A damage claim is being assessed by the provider and admin.",
            notification_type="rental_damage_reported",
            related_booking_id=booking.id,
        )

    history = RentalBookingStatusHistory(
        rental_booking_id=booking.id,
        from_status=RentalBookingStatus.RENTED.value,
        to_status=booking.status.value if hasattr(booking.status, "value") else str(booking.status),
        changed_by_id=inspector_user.id,
        notes=f"Return inspected ({return_in.item_condition}). Damaged: {return_in.is_damaged}. Notes: {return_in.inspection_notes or 'None'}",
    )
    db.add(history)
    db.commit()
    db.refresh(booking)

    broadcast_rental_update_sync(booking, event_type="rental_returned_inspected", notes=return_in.inspection_notes)
    return booking


def create_damage_claim(
    db: Session,
    booking_id: int,
    provider_user: User,
    claim_in: DamageClaimCreate,
) -> DamageClaim:
    booking = get_rental_booking_by_id(db, booking_id, provider_user)
    if provider_user.role not in [UserRole.PROVIDER, UserRole.ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only providers or admins can file damage claims.")

    existing_claim = db.query(DamageClaim).filter(DamageClaim.rental_booking_id == booking.id).first()
    if existing_claim:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A damage claim already exists for this booking.")

    claim_amt = claim_in.estimated_repair_cost if hasattr(claim_in, "estimated_repair_cost") else getattr(claim_in, "claimed_amount", 0.0)
    desc = claim_in.damage_description if hasattr(claim_in, "damage_description") else getattr(claim_in, "description", "")

    claim = DamageClaim(
        rental_booking_id=booking.id,
        provider_id=provider_user.id,
        customer_id=booking.customer_id,
        claimed_amount=claim_amt,
        status=DamageClaimStatus.PENDING,
        description=desc,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)

    create_notification(
        db,
        user_id=booking.customer_id,
        title="Damage Claim Filed",
        message=f"Provider filed a damage claim of ₹{claim.claimed_amount:g} for rental booking #{booking.id}. Admin review is underway.",
        notification_type="damage_claim_filed",
        related_booking_id=booking.id,
    )
    return claim


def review_damage_claim(
    db: Session,
    claim_id: int,
    admin_user: User,
    review_in: DamageClaimReviewRequest,
) -> DamageClaim:
    if admin_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only platform admins can resolve damage claims.")

    claim = db.query(DamageClaim).filter(DamageClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Damage claim not found.")

    booking = claim.rental_booking
    deposit = booking.security_deposit_record

    approved_amt = review_in.approved_deduction_amount if review_in.approved_deduction_amount is not None else getattr(review_in, "approved_amount", 0.0)
    claim.approved_amount = approved_amt or 0.0
    status_str = str(review_in.status).upper()
    claim.status = DamageClaimStatus.APPROVED if "APPROVED" in status_str else DamageClaimStatus.REJECTED
    claim.admin_notes = review_in.admin_notes
    claim.resolved_at = datetime.now(timezone.utc)

    if deposit:
        if claim.status == DamageClaimStatus.APPROVED:
            deposit.deducted_amount = claim.approved_amount
            deposit.refund_amount = max(0.0, deposit.deposit_amount - claim.approved_amount)
            deposit.status = DepositStatus.PARTIALLY_REFUNDED if deposit.refund_amount > 0 else DepositStatus.FORFEITED
            deposit.refunded_at = datetime.now(timezone.utc)
            deposit.notes = f"Damage claim approved: ₹{claim.approved_amount:g} deducted. Remainder ₹{deposit.refund_amount:g} refunded."
        else:
            deposit.deducted_amount = 0.0
            deposit.refund_amount = deposit.deposit_amount
            deposit.status = DepositStatus.REFUNDED
            deposit.refunded_at = datetime.now(timezone.utc)
            deposit.notes = "Damage claim rejected by Admin. Full deposit refunded."

    booking.status = RentalBookingStatus.COMPLETED
    db.commit()
    db.refresh(claim)

    create_notification(
        db,
        user_id=claim.customer_id,
        title="Damage Claim Resolved",
        message=f"Admin resolved damage claim for rental #{booking.id}. Approved deduction: ₹{approved_amt:g}.",
        notification_type="damage_claim_resolved",
        related_booking_id=booking.id,
    )
    broadcast_rental_update_sync(booking, event_type="damage_claim_resolved")
    return claim


# ── Rental Reviews ───────────────────────────────────────
def create_rental_item_review(
    db: Session,
    rental_item_id: int,
    customer_user: User,
    review_in: RentalReviewCreate,
) -> RentalReview:
    item = get_rental_item_by_id(db, rental_item_id)
    review = RentalReview(
        customer_id=customer_user.id,
        rental_item_id=item.id,
        rating=review_in.rating,
        comment=review_in.comment,
    )
    db.add(review)
    db.flush()

    all_reviews = db.query(RentalReview).filter(RentalReview.rental_item_id == item.id).all()
    item.review_count = len(all_reviews)
    item.rating = round(sum(r.rating for r in all_reviews) / len(all_reviews), 2)

    db.commit()
    db.refresh(review)
    return review


def create_rental_review(
    db: Session,
    booking_id: int,
    customer_user: User,
    review_in: RentalReviewCreate,
) -> RentalReview:
    booking = get_rental_booking_by_id(db, booking_id, customer_user)
    if booking.customer_id != customer_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the renting customer can review this booking.")

    review = RentalReview(
        rental_booking_id=booking.id,
        customer_id=customer_user.id,
        rental_item_id=booking.rental_item_id,
        rating=review_in.rating,
        comment=review_in.comment,
    )
    db.add(review)
    db.flush()

    item = booking.rental_item
    all_reviews = db.query(RentalReview).filter(RentalReview.rental_item_id == item.id).all()
    item.review_count = len(all_reviews)
    item.rating = round(sum(r.rating for r in all_reviews) / len(all_reviews), 2)

    db.commit()
    db.refresh(review)
    return review
