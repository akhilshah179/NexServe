"""
Dynamic Pricing Engine for NexServe.

Calculates deterministic, transparent, and explainable pricing breakdowns:
Base Price + Peak/Weekend Surcharge + Emergency Fee + Distance Tier - Coupon - Referral Credits = Final Total.
"""

import math
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.service import Service
from app.models.user import User
from app.models.coupon import Coupon
from app.schemas.pricing import PricingCalculateRequest, PricingCalculateResponse, PricingBreakdownItem
from app.services.coupon_service import validate_coupon_logic


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def is_peak_slot(booking_date_str: Optional[str], time_slot: Optional[str]) -> bool:
    """Determine if the selected date/slot falls under peak hours or weekend."""
    if not booking_date_str:
        return False
    try:
        dt = datetime.strptime(booking_date_str.split("T")[0], "%Y-%m-%d")
        # Weekend (Saturday = 5, Sunday = 6)
        if dt.weekday() in [5, 6]:
            return True
    except Exception:
        pass

    # Peak evening slots
    if time_slot and any(peak in time_slot.upper() for peak in ["06:00 PM", "07:00 PM", "08:00 PM"]):
        return True

    return False


def calculate_dynamic_price(
    db: Session,
    request: PricingCalculateRequest,
    current_user: Optional[User] = None,
) -> PricingCalculateResponse:
    """
    Computes exact, explainable price breakdown for any booking target.
    """
    service = db.query(Service).filter(Service.id == request.service_id).first()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    provider = None
    if request.provider_id:
        provider = db.query(User).filter(User.id == request.provider_id).first()
    elif service.provider_id:
        provider = db.query(User).filter(User.id == service.provider_id).first()

    base_price = round(service.price, 2)
    duration_minutes = service.duration_minutes or 60
    breakdown: List[PricingBreakdownItem] = [
        PricingBreakdownItem(
            name="Base Service Charge",
            amount=base_price,
            description=f"Standard fixed rate for {duration_minutes} mins.",
            is_discount=False,
        )
    ]

    # 1. Peak / Weekend Demand Surcharge (10% of base)
    peak_surcharge = 0.0
    if is_peak_slot(request.booking_date, request.time_slot):
        peak_surcharge = round(base_price * 0.10, 2)
        breakdown.append(
            PricingBreakdownItem(
                name="Peak Hours / Weekend Surcharge",
                amount=peak_surcharge,
                description="10% high-demand slot allocation.",
                is_discount=False,
            )
        )

    # 2. Emergency 24/7 Rapid Dispatch Surcharge (Fixed ₹150.00)
    emergency_surcharge = 0.0
    if request.is_emergency:
        emergency_surcharge = 150.0
        breakdown.append(
            PricingBreakdownItem(
                name="24/7 Urgent Emergency Dispatch",
                amount=emergency_surcharge,
                description="Fixed priority technician dispatch surcharge (₹150.00).",
                is_discount=False,
            )
        )

    # 3. Distance / Travel Surcharge (if > 5km distance from provider)
    distance_surcharge = 0.0
    if (
        request.user_latitude is not None
        and request.user_longitude is not None
        and provider
        and provider.latitude is not None
        and provider.longitude is not None
    ):
        dist = haversine_distance_km(
            request.user_latitude, request.user_longitude, provider.latitude, provider.longitude
        )
        if dist > 5.0:
            extra_km = dist - 5.0
            distance_surcharge = min(300.0, round(extra_km * 15.0, 2))  # ₹15/km above 5km, capped at ₹300
            breakdown.append(
                PricingBreakdownItem(
                    name=f"Travel Allowance ({round(dist, 1)} km)",
                    amount=distance_surcharge,
                    description="Standard travel charge for distances over 5 km.",
                    is_discount=False,
                )
            )

    subtotal = round(base_price + peak_surcharge + emergency_surcharge + distance_surcharge, 2)

    # 4. Coupon Discount
    discount_amount = 0.0
    coupon_desc = None
    if request.coupon_code:
        coupon_res = validate_coupon_logic(
            db=db,
            code=request.coupon_code,
            booking_amount=subtotal,
            category_id=service.category_id,
            user_id=current_user.id if current_user else None,
        )
        if coupon_res["valid"]:
            discount_amount = coupon_res["discount_amount"]
            coupon_desc = coupon_res["description"]
            breakdown.append(
                PricingBreakdownItem(
                    name=f"Coupon ({request.coupon_code.upper()})",
                    amount=-discount_amount,
                    description=coupon_desc,
                    is_discount=True,
                )
            )

    subtotal_after_coupon = max(0.0, round(subtotal - discount_amount, 2))

    # 5. Referral Credits
    referral_discount = 0.0
    if request.apply_referral_credits and current_user and getattr(current_user, "referral_credits", 0) > 0:
        available_credits = current_user.referral_credits
        # Can cover up to 50% of the remaining amount or available credits
        max_usable = min(available_credits, subtotal_after_coupon * 0.50)
        referral_discount = round(max_usable, 2)
        if referral_discount > 0:
            breakdown.append(
                PricingBreakdownItem(
                    name="Referral Reward Balance",
                    amount=-referral_discount,
                    description=f"Redeemed from ₹{round(available_credits, 2)} referral credit balance.",
                    is_discount=True,
                )
            )

    final_total = max(1.0, round(subtotal_after_coupon - referral_discount, 2))

    return PricingCalculateResponse(
        base_price=base_price,
        duration_minutes=duration_minutes,
        emergency_surcharge=emergency_surcharge,
        peak_surcharge=peak_surcharge,
        distance_surcharge=distance_surcharge,
        discount_amount=discount_amount,
        referral_discount=referral_discount,
        coupon_code=request.coupon_code.upper() if (request.coupon_code and discount_amount > 0) else None,
        coupon_description=coupon_desc,
        subtotal=subtotal,
        final_total=final_total,
        breakdown=breakdown,
    )
