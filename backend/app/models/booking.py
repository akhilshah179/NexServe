"""
Booking Model & Status Enum.
"""

from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base, FlexibleEnum


class BookingStatus(str, Enum):
    PENDING = "pending"
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    PROVIDER_ON_THE_WAY = "provider_on_the_way"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class BookingMode(str, Enum):
    INSTANT_BOOKING = "instant_booking"
    REQUEST_BOOKING = "request_booking"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    address_id = Column(Integer, ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    booking_date = Column(DateTime(timezone=True), nullable=False)
    time_slot = Column(String, nullable=False, default="10:00 AM - 11:00 AM")
    status = Column(FlexibleEnum(BookingStatus), default=BookingStatus.PENDING, nullable=False, index=True)
    booking_mode = Column(FlexibleEnum(BookingMode), default=BookingMode.INSTANT_BOOKING, nullable=False)
    total_amount = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)

    # Dynamic Pricing & Discount Fields
    base_price = Column(Float, nullable=True)
    discount_amount = Column(Float, default=0.0, nullable=False)
    referral_discount = Column(Float, default=0.0, nullable=False)
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True)
    pricing_breakdown = Column(Text, nullable=True)  # JSON string of pricing details

    # Cancellation & Emergency fields
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_emergency = Column(Boolean, default=False, nullable=False)
    emergency_surcharge = Column(Float, default=0.0, nullable=False)
    rescheduled_from_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], back_populates="bookings_as_customer")
    provider = relationship("User", foreign_keys=[provider_id], back_populates="bookings_as_provider")
    service = relationship("Service", back_populates="bookings")
    address = relationship("Address", back_populates="bookings")
    review = relationship("Review", back_populates="booking", uselist=False)
    chat_messages = relationship("ChatMessage", back_populates="booking", cascade="all, delete-orphan")
    status_history = relationship("BookingStatusHistory", back_populates="booking", cascade="all, delete-orphan", order_by="BookingStatusHistory.created_at.asc()")
    attachments = relationship("BookingAttachment", back_populates="booking", cascade="all, delete-orphan")
    coupon = relationship("Coupon")
