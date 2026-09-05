"""
Coupon & Coupon Usage Models.
"""

from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base, FlexibleEnum


class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    discount_type = Column(FlexibleEnum(DiscountType), default=DiscountType.PERCENTAGE, nullable=False)
    discount_value = Column(Float, nullable=False)  # e.g., 20.0 for 20% or 100.0 for ₹100
    min_booking_amount = Column(Float, default=0.0, nullable=False)
    max_discount = Column(Float, nullable=True)  # Max cap for percentage discounts
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    usage_limit = Column(Integer, nullable=True)  # Max global uses (None for unlimited)
    used_count = Column(Integer, default=0, nullable=False)
    per_user_limit = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    usages = relationship("CouponUsage", back_populates="coupon", cascade="all, delete-orphan")
    category = relationship("Category")


class CouponUsage(Base):
    __tablename__ = "coupon_usages"

    id = Column(Integer, primary_key=True, index=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True, index=True)
    discount_applied = Column(Float, nullable=False)
    used_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    coupon = relationship("Coupon", back_populates="usages")
    user = relationship("User")
    booking = relationship("Booking")
