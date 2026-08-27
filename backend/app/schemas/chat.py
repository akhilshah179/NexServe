"""
Booking Chat Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserResponse


class ChatMessageCreate(BaseModel):
    content: str
    image_url: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: int
    booking_id: int
    sender_id: int
    recipient_id: int
    content: str
    image_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    sender: Optional[UserResponse] = None
    recipient: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
