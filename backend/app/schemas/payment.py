"""Request and response contracts for Razorpay checkout."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.payment import PaymentStatus


class PaymentOrderCreate(BaseModel):
    booking_id: int


class PaymentOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int
    currency: str
    key_id: str
    booking_id: int


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class RefundRequest(BaseModel):
    payment_id: int
    refund_amount_paise: Optional[int] = None
    reason: Optional[str] = "Customer request / cancellation refund"


class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    refund_id: Optional[str] = None
    receipt_number: Optional[str] = None
    amount_paise: int
    platform_commission_paise: int = 0
    cancellation_refund_paise: int = 0
    currency: str
    status: PaymentStatus
    created_at: datetime
    verified_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

