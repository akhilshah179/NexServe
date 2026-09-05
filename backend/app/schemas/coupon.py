"""
Coupon Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.coupon import DiscountType


class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: DiscountType = DiscountType.PERCENTAGE
    discount_value: float
    min_booking_amount: float = 0.0
    max_discount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    usage_limit: Optional[int] = None
    per_user_limit: int = 1
    category_id: Optional[int] = None
    is_active: bool = True


class CouponResponse(BaseModel):
    id: int
    code: str
    description: Optional[str] = None
    discount_type: DiscountType
    discount_value: float
    min_booking_amount: float
    max_discount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    usage_limit: Optional[int] = None
    used_count: int
    per_user_limit: int
    is_active: bool
    category_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CouponValidateRequest(BaseModel):
    code: str
    booking_amount: float
    category_id: Optional[int] = None
    service_id: Optional[int] = None


class CouponValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_type: DiscountType
    discount_value: float
    discount_amount: float
    final_amount: float
    message: str
