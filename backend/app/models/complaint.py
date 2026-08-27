"""
Complaint Model for Customer Disputes & Admin Management.
"""

from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base


class ComplaintStatus(str, Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, index=True)
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(SQLEnum(ComplaintStatus), default=ComplaintStatus.OPEN, nullable=False, index=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id], backref="complaints_filed")
    provider = relationship("User", foreign_keys=[provider_id], backref="complaints_received")
    booking = relationship("Booking", backref="complaints")
