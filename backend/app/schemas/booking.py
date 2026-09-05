"""
Booking Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, AliasChoices
from app.models.booking import BookingStatus, BookingMode
from app.schemas.user import UserResponse
from app.schemas.service import ServiceResponse
from app.schemas.address import AddressResponse
from app.schemas.booking_tracking import BookingStatusHistoryResponse, BookingAttachmentResponse


class BookingCreate(BaseModel):
    service_id: int
    provider_id: Optional[int] = None
    booking_date: datetime
    time_slot: str = "10:00 AM - 11:00 AM"
    address_id: Optional[int] = None
    notes: Optional[str] = None
    is_emergency: Optional[bool] = False
    coupon_code: Optional[str] = None
    apply_referral_credits: Optional[bool] = Field(
        default=False,
        validation_alias=AliasChoices("apply_referral_credits", "use_referral_credit"),
    )
    attachment_ids: Optional[List[int]] = []
    attachment_urls: Optional[List[str]] = []

    model_config = ConfigDict(populate_by_name=True)


class BookingStatusUpdate(BaseModel):
    status: BookingStatus
    notes: Optional[str] = None
    cancellation_reason: Optional[str] = None


class BookingCancelRequest(BaseModel):
    cancellation_reason: str


class BookingRescheduleRequest(BaseModel):
    new_booking_date: datetime
    new_time_slot: str = "10:00 AM - 11:00 AM"


class BookingResponse(BaseModel):
    id: int
    customer_id: int
    service_id: int
    provider_id: int
    address_id: Optional[int] = None
    booking_date: datetime
    time_slot: str
    status: BookingStatus
    booking_mode: BookingMode = BookingMode.INSTANT_BOOKING
    total_amount: float
    base_price: Optional[float] = None
    discount_amount: float = 0.0
    referral_discount: float = 0.0
    coupon_id: Optional[int] = None
    pricing_breakdown: Optional[str] = None
    notes: Optional[str] = None

    cancellation_reason: Optional[str] = None
    cancelled_by_id: Optional[int] = None
    is_emergency: bool = False
    emergency_surcharge: float = 0.0
    rescheduled_from_date: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime

    customer: Optional[UserResponse] = None
    provider: Optional[UserResponse] = None
    service: Optional[ServiceResponse] = None
    address: Optional[AddressResponse] = None
    status_history: List[BookingStatusHistoryResponse] = []
    attachments: List[BookingAttachmentResponse] = []

    model_config = ConfigDict(from_attributes=True)
