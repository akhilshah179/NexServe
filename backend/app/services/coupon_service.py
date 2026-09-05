"""
Coupon Management & Validation Business Logic.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.coupon import Coupon, CouponUsage, DiscountType
from app.schemas.coupon import CouponCreate


def validate_coupon_logic(
    db: Session,
    code: str,
    booking_amount: float,
    category_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Validates coupon against business rules and calculates discount.
    """
    clean_code = code.strip().upper()
    coupon = db.query(Coupon).filter(Coupon.code == clean_code).first()

    if not coupon:
        return {"valid": False, "discount_amount": 0.0, "description": "Invalid coupon code.", "message": "Coupon does not exist."}

    if not coupon.is_active:
        return {"valid": False, "discount_amount": 0.0, "description": "Inactive coupon.", "message": "This coupon is currently inactive."}

    now = datetime.now(timezone.utc)
    if coupon.start_date:
        start_dt = coupon.start_date if coupon.start_date.tzinfo else coupon.start_date.replace(tzinfo=timezone.utc)
        if start_dt > now:
            return {"valid": False, "discount_amount": 0.0, "description": "Upcoming coupon.", "message": "This coupon is not active yet."}

    if coupon.end_date:
        end_dt = coupon.end_date if coupon.end_date.tzinfo else coupon.end_date.replace(tzinfo=timezone.utc)
        if end_dt < now:
            return {"valid": False, "discount_amount": 0.0, "description": "Expired coupon.", "message": "This coupon has expired."}

    if booking_amount < coupon.min_booking_amount:
        return {
            "valid": False,
            "discount_amount": 0.0,
            "description": f"Min spend ₹{coupon.min_booking_amount} required.",
            "message": f"Minimum booking amount of ₹{coupon.min_booking_amount} required for this coupon.",
        }

    if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
        return {"valid": False, "discount_amount": 0.0, "description": "Usage limit reached.", "message": "Coupon global usage limit reached."}

    if user_id:
        user_uses = db.query(CouponUsage).filter(CouponUsage.coupon_id == coupon.id, CouponUsage.user_id == user_id).count()
        if user_uses >= coupon.per_user_limit:
            return {
                "valid": False,
                "discount_amount": 0.0,
                "description": "Per-user limit reached.",
                "message": f"You have already used this coupon {user_uses} time(s).",
            }

    if coupon.category_id is not None and category_id is not None:
        if coupon.category_id != category_id:
            return {
                "valid": False,
                "discount_amount": 0.0,
                "description": "Category restricted.",
                "message": "This coupon is not applicable to the selected service category.",
            }

    # Calculate discount amount
    if coupon.discount_type == DiscountType.PERCENTAGE:
        discount = round((booking_amount * coupon.discount_value) / 100.0, 2)
        if coupon.max_discount is not None:
            discount = min(discount, coupon.max_discount)
    else:
        discount = min(booking_amount, round(coupon.discount_value, 2))

    return {
        "valid": True,
        "coupon_id": coupon.id,
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "discount_amount": discount,
        "description": coupon.description or f"{coupon.discount_value}% off up to ₹{coupon.max_discount or 'unlimited'}",
        "message": f"Coupon {coupon.code} applied successfully!",
    }


def get_available_coupons(db: Session, category_id: Optional[int] = None) -> List[Coupon]:
    """Retrieve all active publicly redeemable coupons."""
    query = db.query(Coupon).filter(Coupon.is_active == True)
    if category_id:
        query = query.filter((Coupon.category_id == category_id) | (Coupon.category_id == None))
    return query.order_by(Coupon.discount_value.desc()).all()


def record_coupon_usage(db: Session, coupon_id: int, user_id: int, booking_id: int, discount_applied: float):
    """Log coupon redemption in the database."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if coupon:
        coupon.used_count += 1
        usage = CouponUsage(
            coupon_id=coupon_id,
            user_id=user_id,
            booking_id=booking_id,
            discount_applied=discount_applied,
        )
        db.add(usage)
        db.commit()


def seed_default_coupons(db: Session):
    """Seed initial promo coupons for customer onboarding."""
    default_coupons = [
        {
            "code": "WELCOME50",
            "description": "Flat 50% OFF on your first booking up to ₹250",
            "discount_type": DiscountType.PERCENTAGE,
            "discount_value": 50.0,
            "min_booking_amount": 299.0,
            "max_discount": 250.0,
            "per_user_limit": 1,
            "is_active": True,
        },
        {
            "code": "CLEAN20",
            "description": "20% OFF on all Home Cleaning and sanitization packages",
            "discount_type": DiscountType.PERCENTAGE,
            "discount_value": 20.0,
            "min_booking_amount": 499.0,
            "max_discount": 300.0,
            "per_user_limit": 3,
            "is_active": True,
        },
        {
            "code": "NEX100",
            "description": "Flat ₹100 instant discount on bookings above ₹599",
            "discount_type": DiscountType.FIXED,
            "discount_value": 100.0,
            "min_booking_amount": 599.0,
            "max_discount": 100.0,
            "per_user_limit": 2,
            "is_active": True,
        },
        {
            "code": "FESTIVE15",
            "description": "15% OFF across all verified doorstep services",
            "discount_type": DiscountType.PERCENTAGE,
            "discount_value": 15.0,
            "min_booking_amount": 399.0,
            "max_discount": 200.0,
            "per_user_limit": 5,
            "is_active": True,
        },
    ]

    for c in default_coupons:
        existing = db.query(Coupon).filter(Coupon.code == c["code"]).first()
        if not existing:
            coupon = Coupon(
                code=c["code"],
                description=c["description"],
                discount_type=c["discount_type"],
                discount_value=c["discount_value"],
                min_booking_amount=c["min_booking_amount"],
                max_discount=c["max_discount"],
                per_user_limit=c["per_user_limit"],
                is_active=c["is_active"],
            )
            db.add(coupon)
    db.commit()
