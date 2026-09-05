"""
Rental Marketplace SQLAlchemy Models.

Includes:
- RentalCategory
- RentalItem
- RentalImage
- RentalBooking (with RentalBookingStatus & RentalFulfillmentType)
- RentalBookingStatusHistory
- SecurityDeposit (with DepositStatus)
- RentalReturn
- DamageClaim (with DamageClaimStatus)
- RentalReview
"""

from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from app.database import Base, FlexibleEnum


class RentalBookingStatus(str, Enum):
    REQUESTED = "REQUESTED"
    CONFIRMED = "CONFIRMED"
    PAYMENT_COMPLETED = "PAYMENT_COMPLETED"
    READY_FOR_PICKUP = "READY_FOR_PICKUP"
    READY_FOR_DELIVERY = "READY_FOR_DELIVERY"
    RENTED = "RENTED"
    RETURN_PENDING = "RETURN_PENDING"
    RETURNED = "RETURNED"
    INSPECTED = "INSPECTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"
    DAMAGE_REPORTED = "DAMAGE_REPORTED"


class RentalFulfillmentType(str, Enum):
    PICKUP = "PICKUP"
    DELIVERY = "DELIVERY"


class DepositStatus(str, Enum):
    HELD = "HELD"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
    FORFEITED = "FORFEITED"


# Alias for consistency
SecurityDepositStatus = DepositStatus


class DamageClaimStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SETTLED = "SETTLED"



class RentalCategory(Base):
    __tablename__ = "rental_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    slug = Column(String, unique=True, nullable=True, index=True)
    description = Column(Text, nullable=True)
    icon_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    items = relationship("RentalItem", back_populates="category", cascade="all, delete-orphan")


class RentalItem(Base):
    __tablename__ = "rental_items"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("rental_categories.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String, nullable=False, index=True)
    title = Column(String, nullable=True, index=True)
    description = Column(Text, nullable=False)
    brand = Column(String, nullable=True)
    model = Column(String, nullable=True)
    location = Column(String, nullable=False, default="Bengaluru, India")
    city = Column(String, nullable=True, default="Bengaluru")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    price_per_day = Column(Float, nullable=False)
    daily_rate = Column(Float, nullable=True)
    price_per_hour = Column(Float, nullable=True)
    security_deposit = Column(Float, nullable=False, default=0.0)

    is_delivery_available = Column(Boolean, default=True, nullable=False)
    delivery_available = Column(Boolean, default=True, nullable=False)
    is_pickup_available = Column(Boolean, default=True, nullable=False)
    pickup_available = Column(Boolean, default=True, nullable=False)
    delivery_fee = Column(Float, default=0.0, nullable=False)
    pickup_address = Column(String, nullable=True)
    service_area = Column(String, nullable=True, default="Within city limits")

    min_rental_days = Column(Integer, default=1, nullable=False)
    max_rental_days = Column(Integer, default=30, nullable=False)
    terms_and_conditions = Column(Text, nullable=True)

    condition = Column(String, default="Like New", nullable=False)  # "Brand New", "Like New", "Good", "Fair"
    quantity = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    rating = Column(Float, default=5.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __init__(self, **kwargs):
        if "title" in kwargs and "name" not in kwargs:
            kwargs["name"] = kwargs["title"]
        elif "name" in kwargs and "title" not in kwargs:
            kwargs["title"] = kwargs["name"]
        if "daily_rate" in kwargs and "price_per_day" not in kwargs:
            kwargs["price_per_day"] = kwargs["daily_rate"]
        elif "price_per_day" in kwargs and "daily_rate" not in kwargs:
            kwargs["daily_rate"] = kwargs["price_per_day"]
        if "delivery_available" in kwargs and "is_delivery_available" not in kwargs:
            kwargs["is_delivery_available"] = kwargs["delivery_available"]
        elif "is_delivery_available" in kwargs and "delivery_available" not in kwargs:
            kwargs["delivery_available"] = kwargs["is_delivery_available"]
        if "pickup_available" in kwargs and "is_pickup_available" not in kwargs:
            kwargs["is_pickup_available"] = kwargs["pickup_available"]
        elif "is_pickup_available" in kwargs and "pickup_available" not in kwargs:
            kwargs["pickup_available"] = kwargs["is_pickup_available"]
        if "city" in kwargs and "location" not in kwargs:
            kwargs["location"] = kwargs["city"]
        elif "location" in kwargs and "city" not in kwargs:
            kwargs["city"] = kwargs["location"]
        super().__init__(**kwargs)

    # Relationships
    provider = relationship("User", foreign_keys=[provider_id])
    category = relationship("RentalCategory", back_populates="items")
    images = relationship("RentalImage", back_populates="rental_item", cascade="all, delete-orphan", order_by="RentalImage.is_primary.desc()")
    bookings = relationship("RentalBooking", back_populates="rental_item", cascade="all, delete-orphan")
    reviews = relationship("RentalReview", back_populates="rental_item", cascade="all, delete-orphan")


class RentalImage(Base):
    __tablename__ = "rental_images"

    id = Column(Integer, primary_key=True, index=True)
    rental_item_id = Column(Integer, ForeignKey("rental_items.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String, nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    rental_item = relationship("RentalItem", back_populates="images")


class RentalBooking(Base):
    __tablename__ = "rental_bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rental_item_id = Column(Integer, ForeignKey("rental_items.id", ondelete="CASCADE"), nullable=False, index=True)
    address_id = Column(Integer, ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True)
    delivery_address = Column(Text, nullable=True)
    special_instructions = Column(Text, nullable=True)
    quantity = Column(Integer, default=1, nullable=False)

    start_date = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date = Column(DateTime(timezone=True), nullable=False, index=True)
    total_days = Column(Integer, nullable=False, default=1)

    daily_rate = Column(Float, nullable=False)
    rental_subtotal = Column(Float, nullable=False)
    delivery_fee = Column(Float, default=0.0, nullable=False)
    discount_amount = Column(Float, default=0.0, nullable=False)
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True)

    final_rental_amount = Column(Float, nullable=False)
    security_deposit_amount = Column(Float, default=0.0, nullable=False)
    total_amount_charged = Column(Float, nullable=False)  # final_rental_amount + security_deposit_amount

    fulfillment_type = Column(FlexibleEnum(RentalFulfillmentType), default=RentalFulfillmentType.PICKUP, nullable=False)
    status = Column(FlexibleEnum(RentalBookingStatus), default=RentalBookingStatus.REQUESTED, nullable=False, index=True)

    notes = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    customer = relationship("User", foreign_keys=[customer_id])
    provider = relationship("User", foreign_keys=[provider_id])
    rental_item = relationship("RentalItem", back_populates="bookings")
    address = relationship("Address")
    coupon = relationship("Coupon")
    status_history = relationship("RentalBookingStatusHistory", back_populates="rental_booking", cascade="all, delete-orphan", order_by="RentalBookingStatusHistory.created_at.asc()")
    security_deposit_record = relationship("SecurityDeposit", back_populates="rental_booking", uselist=False, cascade="all, delete-orphan")
    rental_return = relationship("RentalReturn", back_populates="rental_booking", uselist=False, cascade="all, delete-orphan")
    damage_claim = relationship("DamageClaim", back_populates="rental_booking", uselist=False, cascade="all, delete-orphan")
    review = relationship("RentalReview", back_populates="rental_booking", uselist=False)

    @property
    def security_deposit(self):
        return self.security_deposit_record


class RentalBookingStatusHistory(Base):
    __tablename__ = "rental_booking_status_histories"

    id = Column(Integer, primary_key=True, index=True)
    rental_booking_id = Column(Integer, ForeignKey("rental_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    rental_booking = relationship("RentalBooking", back_populates="status_history")
    changed_by = relationship("User")


class SecurityDeposit(Base):
    __tablename__ = "security_deposits"

    id = Column(Integer, primary_key=True, index=True)
    rental_booking_id = Column(Integer, ForeignKey("rental_bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    deposit_amount = Column(Float, nullable=False)
    status = Column(FlexibleEnum(DepositStatus), default=DepositStatus.HELD, nullable=False, index=True)

    refund_amount = Column(Float, default=0.0, nullable=False)
    deducted_amount = Column(Float, default=0.0, nullable=False)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    rental_booking = relationship("RentalBooking", back_populates="security_deposit_record")
    customer = relationship("User", foreign_keys=[customer_id])
    provider = relationship("User", foreign_keys=[provider_id])

    @property
    def amount(self):
        return self.deposit_amount

    @amount.setter
    def amount(self, val):
        self.deposit_amount = val


class RentalReturn(Base):
    __tablename__ = "rental_returns"

    id = Column(Integer, primary_key=True, index=True)
    rental_booking_id = Column(Integer, ForeignKey("rental_bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    inspected_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    return_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    condition_on_return = Column(String, default="Good", nullable=False)  # "Good", "Normal Wear", "Damaged", "Inoperable"
    is_damaged = Column(Boolean, default=False, nullable=False)
    damage_deduction_amount = Column(Float, default=0.0, nullable=False)
    inspection_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    rental_booking = relationship("RentalBooking", back_populates="rental_return")
    inspected_by = relationship("User")

    @property
    def item_condition(self):
        return self.condition_on_return

    @item_condition.setter
    def item_condition(self, val):
        self.condition_on_return = val

    @property
    def returned_at(self):
        return self.return_date


class DamageClaim(Base):
    __tablename__ = "damage_claims"

    id = Column(Integer, primary_key=True, index=True)
    rental_booking_id = Column(Integer, ForeignKey("rental_bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    provider_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    claimed_amount = Column(Float, nullable=False)
    approved_amount = Column(Float, default=0.0, nullable=False)
    status = Column(FlexibleEnum(DamageClaimStatus), default=DamageClaimStatus.PENDING, nullable=False, index=True)

    description = Column(Text, nullable=False)
    photo_urls = Column(Text, nullable=True)  # JSON or comma-separated URLs
    admin_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    rental_booking = relationship("RentalBooking", back_populates="damage_claim")
    provider = relationship("User", foreign_keys=[provider_id])
    customer = relationship("User", foreign_keys=[customer_id])

    @property
    def damage_description(self):
        return self.description

    @damage_description.setter
    def damage_description(self, val):
        self.description = val

    @property
    def estimated_repair_cost(self):
        return self.claimed_amount

    @estimated_repair_cost.setter
    def estimated_repair_cost(self, val):
        self.claimed_amount = val

    @property
    def approved_deduction_amount(self):
        return self.approved_amount

    @approved_deduction_amount.setter
    def approved_deduction_amount(self, val):
        self.approved_amount = val

    @property
    def reviewed_at(self):
        return self.resolved_at


class RentalReview(Base):
    __tablename__ = "rental_reviews"

    id = Column(Integer, primary_key=True, index=True)
    rental_booking_id = Column(Integer, ForeignKey("rental_bookings.id", ondelete="CASCADE"), unique=True, nullable=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rental_item_id = Column(Integer, ForeignKey("rental_items.id", ondelete="CASCADE"), nullable=False, index=True)

    rating = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)

    provider_reply = Column(Text, nullable=True)
    provider_replied_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    rental_booking = relationship("RentalBooking", back_populates="review")
    customer = relationship("User", foreign_keys=[customer_id])
    rental_item = relationship("RentalItem", back_populates="reviews")

    @property
    def user_id(self):
        return self.customer_id

    @property
    def user(self):
        return self.customer

