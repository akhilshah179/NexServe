"""
Smart Service Recommendation Engine for NexServe.

Generates 4 personalized, data-driven feeds:
1. "Recommended For You"
2. "Based On Your Previous Bookings"
3. "Book Again"
4. "Popular Near You"
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.service import Service, Category
from app.models.booking import Booking, BookingStatus
from app.models.recommendation import RecommendationInteraction
from app.models.user import User
from app.schemas.recommendation import RecommendationSection, RecommendationFeedResponse
from app.schemas.service import ServiceResponse

logger = logging.getLogger(__name__)


def track_user_interaction(
    db: Session,
    user_id: int,
    service_id: int,
    interaction_type: str = "view",
    category_id: Optional[int] = None,
):
    """Log customer interactions (views, search clicks, booking intent) for recommendation personalization."""
    if not category_id:
        svc = db.query(Service).filter(Service.id == service_id).first()
        if svc:
            category_id = svc.category_id

    if not category_id:
        return

    weights = {"view": 1.0, "search": 2.0, "favorite": 3.0, "book": 5.0}
    weight = weights.get(interaction_type, 1.0)

    interaction = RecommendationInteraction(
        user_id=user_id,
        service_id=service_id,
        category_id=category_id,
        interaction_type=interaction_type,
        weight=weight,
    )
    db.add(interaction)
    db.commit()


def get_popular_services(db: Session, limit: int = 6) -> List[Service]:
    """Retrieve top-rated, most-reviewed active services."""
    return (
        db.query(Service)
        .filter(Service.is_active == True)
        .order_by(Service.rating.desc(), Service.review_count.desc())
        .limit(limit)
        .all()
    )


def get_recommendation_feed(
    db: Session,
    current_user: Optional[User] = None,
) -> RecommendationFeedResponse:
    """
    Generate structured, personalized recommendation sections.
    """
    sections: List[RecommendationSection] = []

    # 1. Popular Near You (Always available for all users)
    popular_services = get_popular_services(db, limit=6)
    if popular_services:
        sections.append(
            RecommendationSection(
                title="Popular Near You",
                subtitle="Most booked and highly rated services in your location",
                icon="🔥",
                type="popular_near_you",
                services=[ServiceResponse.model_validate(s) for s in popular_services],
            )
        )

    if not current_user:
        # Fallback for anonymous users: Category highlights
        return RecommendationFeedResponse(sections=sections)

    # 2. Book Again (Previously completed bookings)
    user_completed_bookings = (
        db.query(Booking)
        .filter(
            Booking.customer_id == current_user.id,
            Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CONFIRMED]),
        )
        .order_by(Booking.created_at.desc())
        .all()
    )

    booked_service_ids = []
    book_again_services = []
    seen_ids = set()

    for b in user_completed_bookings:
        if b.service and b.service.id not in seen_ids and b.service.is_active:
            seen_ids.add(b.service.id)
            booked_service_ids.append(b.service.id)
            book_again_services.append(b.service)

    if book_again_services:
        sections.insert(
            0,
            RecommendationSection(
                title="Book Again",
                subtitle="Quick 1-click rebooking for services you've previously used",
                icon="🔁",
                type="book_again",
                services=[ServiceResponse.model_validate(s) for s in book_again_services[:4]],
            ),
        )

    # 3. Based on Previous Bookings (Services from categories user has booked before)
    if booked_service_ids:
        booked_categories = (
            db.query(Service.category_id)
            .filter(Service.id.in_(booked_service_ids))
            .distinct()
            .all()
        )
        category_ids = [c[0] for c in booked_categories if c[0]]

        if category_ids:
            related_services = (
                db.query(Service)
                .filter(
                    Service.category_id.in_(category_ids),
                    Service.id.notin_(booked_service_ids),
                    Service.is_active == True,
                )
                .order_by(Service.rating.desc())
                .limit(6)
                .all()
            )

            if related_services:
                sections.append(
                    RecommendationSection(
                        title="Based On Your Previous Bookings",
                        subtitle="More great services in categories you frequently use",
                        icon="✨",
                        type="previous_categories",
                        services=[ServiceResponse.model_validate(s) for s in related_services],
                    )
                )

    # 4. Recommended For You (Interaction weighted scoring)
    interactions = (
        db.query(
            RecommendationInteraction.category_id,
            func.sum(RecommendationInteraction.weight).label("total_weight"),
        )
        .filter(RecommendationInteraction.user_id == current_user.id)
        .group_by(RecommendationInteraction.category_id)
        .order_by(func.sum(RecommendationInteraction.weight).desc())
        .limit(3)
        .all()
    )

    if interactions:
        top_cat_ids = [i[0] for i in interactions if i[0]]
        personalized_services = (
            db.query(Service)
            .filter(
                Service.category_id.in_(top_cat_ids),
                Service.id.notin_(seen_ids),
                Service.is_active == True,
            )
            .order_by(Service.rating.desc())
            .limit(6)
            .all()
        )
        if personalized_services:
            sections.insert(
                1,
                RecommendationSection(
                    title="Recommended For You",
                    subtitle="Curated based on your recent searches and interests",
                    icon="🎯",
                    type="recommended_for_you",
                    services=[ServiceResponse.model_validate(s) for s in personalized_services],
                ),
            )

    return RecommendationFeedResponse(sections=sections)
