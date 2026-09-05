"""
Pricing Calculation Pydantic Schemas.
"""

from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, AliasChoices


class PricingCalculateRequest(BaseModel):
    service_id: int
    provider_id: Optional[int] = None
    booking_date: Optional[str] = None  # YYYY-MM-DD
    time_slot: Optional[str] = None
    is_emergency: bool = False
    coupon_code: Optional[str] = None
    apply_referral_credits: bool = Field(
        default=False,
        validation_alias=AliasChoices("apply_referral_credits", "use_referral_credit"),
    )
    user_latitude: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("user_latitude", "customer_lat"),
    )
    user_longitude: Optional[float] = Field(
        default=None,
        validation_alias=AliasChoices("user_longitude", "customer_lng"),
    )

    model_config = ConfigDict(populate_by_name=True)


class PricingBreakdownItem(BaseModel):
    name: str
    amount: float
    description: Optional[str] = None
    is_discount: bool = False


class PricingCalculateResponse(BaseModel):
    base_price: float
    duration_minutes: int
    emergency_surcharge: float = 0.0
    peak_surcharge: float = 0.0
    distance_surcharge: float = 0.0
    discount_amount: float = 0.0
    referral_discount: float = 0.0
    coupon_code: Optional[str] = None
    coupon_description: Optional[str] = None
    subtotal: float
    final_total: float
    breakdown: List[PricingBreakdownItem] = []

    model_config = ConfigDict(from_attributes=True)
