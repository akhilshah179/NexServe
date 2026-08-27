"""Razorpay payment records kept independently from bookings for auditability."""

from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String
from app.database import Base


class PaymentStatus(str, Enum):
    CREATED = "created"
    VERIFIED = "verified"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    razorpay_order_id = Column(String, unique=True, nullable=False, index=True)
    razorpay_payment_id = Column(String, unique=True, nullable=True, index=True)
    razorpay_signature = Column(String, nullable=True)
    refund_id = Column(String, nullable=True)
    receipt_number = Column(String, nullable=True)
    amount_paise = Column(Integer, nullable=False)
    platform_commission_paise = Column(Integer, default=0, nullable=False)
    cancellation_refund_paise = Column(Integer, default=0, nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.CREATED)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    verified_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

