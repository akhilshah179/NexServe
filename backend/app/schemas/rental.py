"""
Pydantic Schemas for Rental Marketplace.
"""

from datetime import datetime, date
from typing import Optional, List, Union, Any, Dict
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.models.rental import (
    RentalBookingStatus,
    RentalFulfillmentType,
    DepositStatus,
    DamageClaimStatus,
)
from app.schemas.user import UserResponse
from app.schemas.address import AddressResponse


# ── Rental Category Schemas ──────────────────────────────
# ── Rental Category Schemas ──────────────────────────────
class RentalCategoryBase(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    is_active: bool = True


class RentalCategoryCreate(RentalCategoryBase):
    pass


class RentalCategoryResponse(RentalCategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    item_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# ── Rental Image Schemas ─────────────────────────────────
class RentalImageBase(BaseModel):
    image_url: str
    is_primary: bool = False


class RentalImageCreate(RentalImageBase):
    pass


class RentalImageResponse(RentalImageBase):
    id: int
    rental_item_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Rental Review Schemas (Defined early for nested references) ──
class RentalReviewBase(BaseModel):
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class RentalReviewCreate(BaseModel):
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class RentalReviewResponse(BaseModel):
    id: int
    rental_item_id: Optional[int] = None
    rental_booking_id: Optional[int] = None
    customer_id: Optional[int] = None
    user_id: Optional[int] = None
    rating: float
    comment: Optional[str] = None
    provider_reply: Optional[str] = None
    provider_replied_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    customer: Optional[UserResponse] = None
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_user(self) -> "RentalReviewResponse":
        if self.user_id is None and self.customer_id is not None:
            self.user_id = self.customer_id
        if self.customer_id is None and self.user_id is not None:
            self.customer_id = self.user_id
        if self.user is None and self.customer is not None:
            self.user = self.customer
        if self.customer is None and self.user is not None:
            self.customer = self.user
        return self


# ── Rental Item Schemas ──────────────────────────────────
class RentalItemBase(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: str
    category_id: int
    brand: Optional[str] = None
    model: Optional[str] = None
    location: Optional[str] = "Bengaluru, India"
    city: Optional[str] = "Bengaluru"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    price_per_day: Optional[float] = None
    daily_rate: Optional[float] = None
    price_per_hour: Optional[float] = None
    security_deposit: float = 0.0

    is_delivery_available: bool = True
    delivery_available: bool = True
    is_pickup_available: bool = True
    pickup_available: bool = True
    delivery_fee: float = 0.0
    pickup_address: Optional[str] = None
    service_area: Optional[str] = "Within city limits"
    min_rental_days: int = 1
    max_rental_days: int = 30
    terms_and_conditions: Optional[str] = None

    condition: str = "Like New"
    quantity: int = 1
    is_active: bool = True


class RentalItemCreate(RentalItemBase):
    images: Optional[List[Any]] = []


class RentalItemUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    price_per_day: Optional[float] = None
    daily_rate: Optional[float] = None
    price_per_hour: Optional[float] = None
    security_deposit: Optional[float] = None
    is_delivery_available: Optional[bool] = None
    delivery_available: Optional[bool] = None
    is_pickup_available: Optional[bool] = None
    pickup_available: Optional[bool] = None
    delivery_fee: Optional[float] = None
    pickup_address: Optional[str] = None
    service_area: Optional[str] = None
    min_rental_days: Optional[int] = None
    max_rental_days: Optional[int] = None
    terms_and_conditions: Optional[str] = None
    condition: Optional[str] = None
    quantity: Optional[int] = None
    is_active: Optional[bool] = None
    images: Optional[List[Any]] = None


class RentalItemResponse(BaseModel):
    id: int
    provider_id: int
    category_id: int
    name: str
    title: Optional[str] = None
    description: str
    brand: Optional[str] = None
    model: Optional[str] = None
    location: str
    city: Optional[str] = None
    price_per_day: float
    daily_rate: Optional[float] = None
    security_deposit: float
    is_delivery_available: bool
    delivery_available: Optional[bool] = None
    is_pickup_available: bool
    pickup_available: Optional[bool] = None
    delivery_fee: float
    pickup_address: Optional[str] = None
    min_rental_days: Optional[int] = 1
    max_rental_days: Optional[int] = 30
    terms_and_conditions: Optional[str] = None
    condition: str
    quantity: int
    is_active: bool
    rating: float
    review_count: int
    created_at: datetime
    updated_at: datetime

    category: Optional[RentalCategoryResponse] = None
    provider: Optional[UserResponse] = None
    images: List[RentalImageResponse] = []
    reviews: List[RentalReviewResponse] = []

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_missing_aliases(self) -> "RentalItemResponse":
        if not self.title and self.name:
            self.title = self.name
        if self.daily_rate is None and self.price_per_day is not None:
            self.daily_rate = self.price_per_day
        if self.delivery_available is None and self.is_delivery_available is not None:
            self.delivery_available = self.is_delivery_available
        if self.pickup_available is None and self.is_pickup_available is not None:
            self.pickup_available = self.is_pickup_available
        if not self.city and self.location:
            self.city = self.location
        return self


# ── Availability Check Schemas ───────────────────────────
class RentalAvailabilityCheckRequest(BaseModel):
    rental_item_id: Optional[int] = None
    start_date: Union[datetime, date, str]
    end_date: Union[datetime, date, str]
    quantity: Optional[int] = 1


class RentalAvailabilityCheckResponse(BaseModel):
    is_available: bool
    rental_item_id: Optional[int] = None
    start_date: Union[datetime, date, str]
    end_date: Union[datetime, date, str]
    conflicting_bookings_count: int = 0
    message: str


# ── Rental Price Calculation Schemas ─────────────────────
class RentalPriceBreakdownItem(BaseModel):
    label: str
    amount: float
    is_discount: bool = False
    is_deposit: bool = False


class RentalPriceCalculateRequest(BaseModel):
    rental_item_id: Optional[int] = None
    start_date: Union[datetime, date, str]
    end_date: Union[datetime, date, str]
    quantity: Optional[int] = 1
    fulfillment_type: Optional[str] = "PICKUP"
    delivery_requested: Optional[bool] = False
    coupon_code: Optional[str] = None


class RentalPriceCalculateResponse(BaseModel):
    rental_item_id: int
    days: int
    total_days: Optional[int] = None
    quantity: int = 1
    daily_rate: float
    subtotal: float
    rental_subtotal: Optional[float] = None
    delivery_fee: float
    discount_amount: float
    coupon_code: Optional[str] = None
    final_rental_amount: float
    security_deposit_amount: float
    security_deposit: Optional[float] = None
    total_amount_charged: float
    breakdown: Optional[List[RentalPriceBreakdownItem]] = []


# ── Rental Booking Schemas ───────────────────────────────
class RentalBookingCreate(BaseModel):
    rental_item_id: int
    start_date: Union[datetime, date, str]
    end_date: Union[datetime, date, str]
    quantity: Optional[int] = 1
    fulfillment_type: Optional[str] = "PICKUP"
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None
    address_id: Optional[int] = None
    coupon_code: Optional[str] = None
    notes: Optional[str] = None


class RentalBookingStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None


class RentalBookingCancelRequest(BaseModel):
    cancellation_reason: str


class RentalBookingStatusHistoryResponse(BaseModel):
    id: int
    from_status: Optional[str] = None
    to_status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SecurityDepositResponse(BaseModel):
    id: int
    rental_booking_id: int
    deposit_amount: Optional[float] = None
    amount: Optional[float] = None
    status: Any
    refund_amount: Optional[float] = 0.0
    deducted_amount: Optional[float] = 0.0
    deduction_amount: Optional[float] = 0.0
    notes: Optional[str] = None
    created_at: datetime
    refunded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_deposit_aliases(self) -> "SecurityDepositResponse":
        if self.amount is None and self.deposit_amount is not None:
            self.amount = self.deposit_amount
        if self.deposit_amount is None and self.amount is not None:
            self.deposit_amount = self.amount
        if self.deduction_amount is None and self.deducted_amount is not None:
            self.deduction_amount = self.deducted_amount
        return self


class RentalReturnResponse(BaseModel):
    id: int
    rental_booking_id: int
    inspected_by_id: Optional[int] = None
    condition_on_return: Optional[str] = None
    item_condition: Optional[str] = None
    is_damaged: bool = False
    damage_deduction_amount: float = 0.0
    inspection_notes: Optional[str] = None
    return_date: Optional[datetime] = None
    returned_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_return_aliases(self) -> "RentalReturnResponse":
        if not self.item_condition and self.condition_on_return:
            self.item_condition = self.condition_on_return
        if not self.condition_on_return and self.item_condition:
            self.condition_on_return = self.item_condition
        if not self.returned_at and self.return_date:
            self.returned_at = self.return_date
        return self


class RentalBookingResponse(BaseModel):
    id: int
    customer_id: int
    provider_id: int
    rental_item_id: int
    address_id: Optional[int] = None
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None
    quantity: int = 1

    start_date: Any
    end_date: Any
    total_days: int

    daily_rate: float
    rental_subtotal: float
    delivery_fee: float
    discount_amount: float
    final_rental_amount: float
    security_deposit_amount: float
    total_amount_charged: float

    fulfillment_type: Any
    status: Any

    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    rental_item: Optional[RentalItemResponse] = None
    customer: Optional[UserResponse] = None
    provider: Optional[UserResponse] = None
    address: Optional[AddressResponse] = None
    security_deposit: Optional[SecurityDepositResponse] = None
    security_deposit_record: Optional[SecurityDepositResponse] = None
    rental_return: Optional[RentalReturnResponse] = None
    status_history: List[RentalBookingStatusHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ── Return & Damage Claim Schemas ────────────────────────
class RentalReturnCreate(BaseModel):
    item_condition: str = "EXCELLENT"  # EXCELLENT, GOOD, FAIR, DAMAGED
    is_damaged: bool = False
    damage_deduction_paise: Optional[int] = 0
    damage_deduction_amount: Optional[float] = 0.0
    inspection_notes: Optional[str] = None


class DamageClaimCreate(BaseModel):
    damage_description: str
    estimated_repair_cost: float


class DamageClaimReviewRequest(BaseModel):
    status: str  # APPROVED or REJECTED
    approved_deduction_amount: Optional[float] = 0.0
    admin_notes: Optional[str] = None


class DamageClaimResponse(BaseModel):
    id: int
    rental_booking_id: int
    provider_id: Optional[int] = None
    customer_id: Optional[int] = None
    claimed_amount: Optional[float] = None
    estimated_repair_cost: Optional[float] = None
    approved_amount: Optional[float] = None
    approved_deduction_amount: Optional[float] = None
    status: Any
    description: Optional[str] = None
    damage_description: Optional[str] = None
    photo_urls: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

