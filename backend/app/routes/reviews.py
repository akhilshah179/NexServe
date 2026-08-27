"""
Reviews API Endpoints — Submissions, Provider Replies, Verified Ratings.
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.review import ReviewCreate, ProviderReplyCreate, ReviewResponse
from app.routes.dependencies import get_current_user, require_provider
from app.services.review_service import (
    create_booking_review,
    reply_to_review,
    get_provider_reviews,
)

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"],
)


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def submit_review(
    review_in: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a review for a completed booking."""
    return create_booking_review(db, current_user.id, review_in)


@router.post("/{review_id}/reply", response_model=ReviewResponse)
def add_provider_reply(
    review_id: int,
    reply_in: ProviderReplyCreate,
    current_user: User = Depends(require_provider),
    db: Session = Depends(get_db),
):
    """Provider posts a reply to a review."""
    return reply_to_review(db, review_id, current_user.id, reply_in)


@router.get("/provider/{provider_id}", response_model=List[ReviewResponse])
def list_provider_reviews(
    provider_id: int,
    db: Session = Depends(get_db),
):
    """Get all verified customer reviews for a specific provider."""
    return get_provider_reviews(db, provider_id)
