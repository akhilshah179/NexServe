"""
User & Auth Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole, VerificationStatus, UserBookingMode


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token passed from Google Identity Services
    role: Optional[UserRole] = UserRole.CUSTOMER  # Target role if new user creation
    referral_code: Optional[str] = None  # Referral code applied during registration


class UserCreate(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    full_name: str
    phone_number: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    referral_code: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    profile_image: Optional[str] = None


class ProviderProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_radius_km: Optional[float] = None
    working_hours: Optional[str] = None
    portfolio_photos: Optional[List[str]] = None
    emergency_available: Optional[bool] = None
    experience_years: Optional[int] = None
    hourly_rate: Optional[float] = None
    booking_mode: Optional[UserBookingMode] = None


class ProviderVerificationAction(BaseModel):
    status: VerificationStatus  # APPROVED or REJECTED
    rejection_reason: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    google_id: Optional[str] = None
    email: EmailStr
    full_name: str
    profile_image: Optional[str] = None
    phone_number: Optional[str] = None
    role: UserRole
    is_active: bool

    # Referral Attributes
    referral_code: Optional[str] = None
    referral_credits: float = 0.0

    # Provider Metadata & Verification
    booking_mode: UserBookingMode = UserBookingMode.INSTANT_BOOKING
    verification_status: VerificationStatus = VerificationStatus.APPROVED
    rejection_reason: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_radius_km: Optional[float] = 15.0
    working_hours: Optional[str] = "Mon-Sat: 09:00 AM - 07:00 PM"
    portfolio_photos: Optional[str] = None
    emergency_available: bool = False
    rating: Optional[float] = 4.8
    review_count: Optional[int] = 12
    experience_years: Optional[int] = 3
    hourly_rate: Optional[float] = 49.99

    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None
