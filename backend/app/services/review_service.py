"""
Review Service — Ratings, verified reviews, and rating recalculation.
"""

from typing import List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.review import Review
from app.models.booking import Booking, BookingStatus
from app.models.user import User, UserRole
from app.models.service import Service
from app.schemas.review import ReviewCreate, ProviderReplyCreate


def create_booking_review(db: Session, customer_id: int, review_in: ReviewCreate) -> Review:
    """
    Create a review for a booking.
    Enforces constraints:
    1. Booking must exist and belong to customer_id.
    2. Booking status MUST be COMPLETED.
    3. Exactly ONE review per booking (booking_id unique).
    """
    booking = db.query(Booking).filter(Booking.id == review_in.booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if booking.customer_id != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only review your own bookings.")

    if booking.status != BookingStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reviews can only be submitted for COMPLETED bookings.",
        )

    existing = db.query(Review).filter(Review.booking_id == review_in.booking_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A review has already been submitted for this booking.",
        )

    review = Review(
        booking_id=booking.id,
        customer_id=customer_id,
        service_id=booking.service_id,
        rating=float(review_in.rating),
        comment=review_in.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    # Recalculate provider and service ratings
    recalculate_provider_rating(db, booking.provider_id)
    recalculate_service_rating(db, booking.service_id)

    return review


def reply_to_review(db: Session, review_id: int, provider_id: int, reply_in: ProviderReplyCreate) -> Review:
    """Allow provider of the booking to post a reply to a customer review."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")

    if review.booking.provider_id != provider_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the service provider can reply to this review.")

    review.provider_reply = reply_in.reply
    review.provider_replied_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(review)
    return review


def get_provider_reviews(db: Session, provider_id: int) -> List[Review]:
    """Get all verified customer reviews for a specific provider."""
    return (
        db.query(Review)
        .join(Review.booking)
        .filter(Booking.provider_id == provider_id)
        .order_by(Review.created_at.desc())
        .all()
    )


def recalculate_provider_rating(db: Session, provider_id: int) -> None:
    """Recalculates average rating and review_count for a provider."""
    stats = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .join(Review.booking)
        .filter(Booking.provider_id == provider_id)
        .first()
    )

    avg_rating, total_count = stats
    provider = db.query(User).filter(User.id == provider_id).first()
    if provider:
        provider.rating = round(float(avg_rating), 1) if avg_rating else 5.0
        provider.review_count = int(total_count) if total_count else 0
        db.commit()


def recalculate_service_rating(db: Session, service_id: int) -> None:
    """Recalculates average rating and review_count for a service."""
    stats = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.service_id == service_id)
        .first()
    )

    avg_rating, total_count = stats
    service = db.query(Service).filter(Service.id == service_id).first()
    if service:
        service.rating = round(float(avg_rating), 1) if avg_rating else 5.0
        service.review_count = int(total_count) if total_count else 0
        db.commit()
