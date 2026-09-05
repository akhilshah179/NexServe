"""
Recommendation Feed Pydantic Schemas.
"""

from typing import List, Optional
from pydantic import BaseModel
from app.schemas.service import ServiceResponse


class RecommendationSection(BaseModel):
    title: str
    subtitle: str
    icon: str
    type: str  # 'recommended_for_you', 'book_again', 'popular_near_you', 'previous_categories'
    services: List[ServiceResponse] = []


class RecommendationFeedResponse(BaseModel):
    sections: List[RecommendationSection] = []


class RecommendationTrackRequest(BaseModel):
    service_id: int
    category_id: Optional[int] = None
    interaction_type: str = "view"  # 'view', 'search', 'book'
