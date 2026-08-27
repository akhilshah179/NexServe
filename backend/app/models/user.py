"""
User Model & Role Enum with Provider Attributes.
"""

from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, Enum):
    CUSTOMER = "customer"
    PROVIDER = "provider"
    ADMIN = "admin"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String, nullable=False)
    profile_image = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Provider Specific Metadata & Verification
    verification_status = Column(SQLEnum(VerificationStatus), default=VerificationStatus.APPROVED, nullable=False)
    rejection_reason = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    service_radius_km = Column(Float, default=15.0, nullable=False)
    working_hours = Column(Text, default="Mon-Sat: 09:00 AM - 07:00 PM", nullable=True)
    portfolio_photos = Column(Text, nullable=True)  # JSON string array of URLs
    emergency_available = Column(Boolean, default=False, nullable=False)
    rating = Column(Float, default=4.8, nullable=False)
    review_count = Column(Integer, default=12, nullable=False)
    experience_years = Column(Integer, default=3, nullable=False)
    hourly_rate = Column(Float, default=49.99, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    services = relationship("Service", back_populates="provider", cascade="all, delete-orphan")
    bookings_as_customer = relationship("Booking", foreign_keys="Booking.customer_id", back_populates="customer")
    bookings_as_provider = relationship("Booking", foreign_keys="Booking.provider_id", back_populates="provider")
    reviews = relationship("Review", back_populates="customer")
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

