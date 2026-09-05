"""
Recommendation Interaction & Personalization Models.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class RecommendationInteraction(Base):
    __tablename__ = "recommendation_interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    interaction_type = Column(String, nullable=False)  # 'view', 'search', 'book', 'favorite'
    weight = Column(Float, default=1.0, nullable=False)  # view=1.0, search=2.0, book=5.0
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User")
    service = relationship("Service")
    category = relationship("Category")


Index("idx_user_service_interaction", RecommendationInteraction.user_id, RecommendationInteraction.service_id)
