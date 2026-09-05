"""
Coupons & Promo Codes API Endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.coupon import Coupon
from app.routes.dependencies import get_current_user, get_optional_current_user, require_admin
from app.schemas.coupon import (
    CouponCreate,
    CouponResponse,
    CouponValidateRequest,
    CouponValidateResponse,
)
from app.services.coupon_service import (
    validate_coupon_logic,
    get_available_coupons,
)

router = APIRouter(
    prefix="/coupons",
    tags=["Coupons & Discounts"],
)


@router.post("/validate", response_model=CouponValidateResponse)
def validate_coupon_endpoint(
    req: CouponValidateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Validate a coupon code against booking cart amount and category.
    """
    user_id = current_user.id if current_user else None
    res = validate_coupon_logic(
        db=db,
        code=req.code,
        booking_amount=req.booking_amount,
        category_id=req.category_id,
        user_id=user_id,
    )

    if not res["valid"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res["message"])

    final_amount = max(0.0, round(req.booking_amount - res["discount_amount"], 2))

    return CouponValidateResponse(
        valid=True,
        code=res["code"],
        discount_type=res["discount_type"],
        discount_value=res["discount_value"],
        discount_amount=res["discount_amount"],
        final_amount=final_amount,
        message=res["message"],
    )


@router.get("/available", response_model=List[CouponResponse])
def list_available_coupons(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    db: Session = Depends(get_db),
):
    """
    List all active public promotional coupons for customers.
    """
    return get_available_coupons(db, category_id=category_id)


@router.post("", response_model=CouponResponse, status_code=status.HTTP_201_CREATED)
def create_new_coupon(
    coupon_in: CouponCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Create a new promotional coupon (Admin only).
    """
    code_clean = coupon_in.code.strip().upper()
    existing = db.query(Coupon).filter(Coupon.code == code_clean).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Coupon code already exists.")

    coupon = Coupon(
        code=code_clean,
        description=coupon_in.description,
        discount_type=coupon_in.discount_type,
        discount_value=coupon_in.discount_value,
        min_booking_amount=coupon_in.min_booking_amount,
        max_discount=coupon_in.max_discount,
        start_date=coupon_in.start_date,
        end_date=coupon_in.end_date,
        usage_limit=coupon_in.usage_limit,
        per_user_limit=coupon_in.per_user_limit,
        category_id=coupon_in.category_id,
        is_active=coupon_in.is_active,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon
