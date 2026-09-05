"""
Smart Recommendations API Endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.routes.dependencies import get_optional_current_user, get_current_user
from app.schemas.recommendation import (
    RecommendationFeedResponse,
    RecommendationTrackRequest,
)
from app.services.recommendation_service import (
    get_recommendation_feed,
    track_user_interaction,
)

router = APIRouter(
    prefix="/recommendations",
    tags=["Smart Recommendations"],
)


@router.get("", response_model=RecommendationFeedResponse)
def fetch_recommendations(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Retrieve structured personalized recommendation feeds:
    1. 'Recommended For You'
    2. 'Based On Your Previous Bookings'
    3. 'Book Again'
    4. 'Popular Near You'
    """
    return get_recommendation_feed(db, current_user=current_user)


@router.post("/track", status_code=status.HTTP_200_OK)
def log_recommendation_interaction(
    req: RecommendationTrackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Track customer interaction (view, click, search) to refine future recommendations.
    """
    track_user_interaction(
        db=db,
        user_id=current_user.id,
        service_id=req.service_id,
        interaction_type=req.interaction_type,
        category_id=req.category_id,
    )
    return {"status": "success", "message": "Interaction logged"}
