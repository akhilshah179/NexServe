"""
Review Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.user import UserResponse


class ReviewCreate(BaseModel):
    booking_id: int
    rating: float = Field(..., ge=1.0, le=5.0)
    comment: Optional[str] = None


class ProviderReplyCreate(BaseModel):
    reply: str


class ReviewResponse(BaseModel):
    id: int
    booking_id: int
    customer_id: int
    service_id: int
    rating: float
    comment: Optional[str] = None
    provider_reply: Optional[str] = None
    provider_replied_at: Optional[datetime] = None
    created_at: datetime
    customer: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

