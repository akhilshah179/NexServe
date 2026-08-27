"""
Booking Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.booking import BookingStatus
from app.schemas.user import UserResponse
from app.schemas.service import ServiceResponse
from app.schemas.address import AddressResponse


class BookingCreate(BaseModel):
    service_id: int
    booking_date: datetime
    time_slot: str = "10:00 AM - 11:00 AM"
    address_id: Optional[int] = None
    notes: Optional[str] = None
    is_emergency: Optional[bool] = False


class BookingStatusUpdate(BaseModel):
    status: BookingStatus
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
    total_amount: float
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

    model_config = ConfigDict(from_attributes=True)

