"""
Chat API Endpoints — Booking-Specific Messaging.
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse
from app.routes.dependencies import get_current_user
from app.services.chat_service import get_booking_messages, send_chat_message

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


@router.get("/bookings/{booking_id}", response_model=List[ChatMessageResponse])
def fetch_messages(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve chat history for a specific booking."""
    return get_booking_messages(db, booking_id, current_user)


@router.post("/bookings/{booking_id}", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def post_message(
    booking_id: int,
    msg_in: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message to the other party in a booking."""
    return send_chat_message(db, booking_id, current_user, msg_in)
