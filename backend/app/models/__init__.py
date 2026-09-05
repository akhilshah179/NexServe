"""
Models package — imports all SQLAlchemy models for Base metadata registration.
"""

from app.models.user import User, UserRole, VerificationStatus, UserBookingMode
from app.models.address import Address
from app.models.service import Category, Service
from app.models.booking import Booking, BookingStatus, BookingMode
from app.models.booking_tracking import BookingStatusHistory, BookingAttachment
from app.models.coupon import Coupon, CouponUsage, DiscountType
from app.models.referral import Referral, ReferralStatus
from app.models.recommendation import RecommendationInteraction
from app.models.payment import Payment, PaymentStatus
from app.models.review import Review
from app.models.contact import ContactMessage
from app.models.notification import Notification
from app.models.chat import ChatMessage
from app.models.audit_log import AuditLog
from app.models.availability import Availability
from app.models.complaint import Complaint, ComplaintStatus

from app.models.rental import (
    RentalCategory,
    RentalItem,
    RentalImage,
    RentalBooking,
    RentalBookingStatus,
    RentalFulfillmentType,
    RentalBookingStatusHistory,
    SecurityDeposit,
    DepositStatus,
    RentalReturn,
    DamageClaim,
    DamageClaimStatus,
    RentalReview,
)

__all__ = [
    "User",
    "UserRole",
    "VerificationStatus",
    "UserBookingMode",
    "Address",
    "Category",
    "Service",
    "Booking",
    "BookingStatus",
    "BookingMode",
    "BookingStatusHistory",
    "BookingAttachment",
    "Coupon",
    "CouponUsage",
    "DiscountType",
    "Referral",
    "ReferralStatus",
    "RecommendationInteraction",
    "Payment",
    "PaymentStatus",
    "Review",
    "ContactMessage",
    "Notification",
    "ChatMessage",
    "AuditLog",
    "Availability",
    "Complaint",
    "ComplaintStatus",
    "RentalCategory",
    "RentalItem",
    "RentalImage",
    "RentalBooking",
    "RentalBookingStatus",
    "RentalFulfillmentType",
    "RentalBookingStatusHistory",
    "SecurityDeposit",
    "DepositStatus",
    "RentalReturn",
    "DamageClaim",
    "DamageClaimStatus",
    "RentalReview",
]
