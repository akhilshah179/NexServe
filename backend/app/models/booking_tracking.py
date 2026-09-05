"""
Booking Status History & Photo Attachments Models.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class BookingStatusHistory(Base):
    __tablename__ = "booking_status_history"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="status_history")
    changed_by = relationship("User", foreign_keys=[changed_by_id])


class BookingAttachment(Base):
    __tablename__ = "booking_attachments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True, index=True)
    file_url = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    mime_type = Column(String, nullable=False, default="image/jpeg")
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="attachments")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
