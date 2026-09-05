"""
Referral & Referral Reward Models.
"""

from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base, FlexibleEnum


class ReferralStatus(str, Enum):
    PENDING = "pending"      # Referred user registered but hasn't completed first service
    REWARDED = "rewarded"    # First service completed, reward credited
    EXPIRED = "expired"


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    referred_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    referral_code = Column(String, nullable=False, index=True)
    status = Column(FlexibleEnum(ReferralStatus), default=ReferralStatus.PENDING, nullable=False)
    reward_amount = Column(Float, default=100.0, nullable=False)  # ₹100 credit
    qualifying_booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    rewarded_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    referrer = relationship("User", foreign_keys=[referrer_id], back_populates="referrals_made")
    referred_user = relationship("User", foreign_keys=[referred_user_id], back_populates="referral_received")
    qualifying_booking = relationship("Booking")
