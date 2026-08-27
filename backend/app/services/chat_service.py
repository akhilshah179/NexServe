"""
Booking Chat Service — Access control & chat message exchange.
"""

from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.chat import ChatMessage
from app.models.booking import Booking
from app.models.user import User, UserRole
from app.schemas.chat import ChatMessageCreate


def get_booking_messages(db: Session, booking_id: int, current_user: User) -> List[ChatMessage]:
    """
    Retrieve chat history for a booking.
    STRICT AUTHORIZATION: User must be customer, provider, or admin of the booking.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if current_user.role != UserRole.ADMIN and current_user.id not in [booking.customer_id, booking.provider_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view messages for this booking.",
        )

    # Mark incoming messages as read
    db.query(ChatMessage).filter(
        ChatMessage.booking_id == booking_id,
        ChatMessage.recipient_id == current_user.id,
        ChatMessage.is_read == False,
    ).update({"is_read": True})
    db.commit()

    return (
        db.query(ChatMessage)
        .filter(ChatMessage.booking_id == booking_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )


def send_chat_message(db: Session, booking_id: int, current_user: User, msg_in: ChatMessageCreate) -> ChatMessage:
    """
    Send a message within a booking chat room.
    STRICT AUTHORIZATION: User must be customer or provider of the booking.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    if current_user.id not in [booking.customer_id, booking.provider_id] and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to send messages for this booking.",
        )

    recipient_id = booking.provider_id if current_user.id == booking.customer_id else booking.customer_id

    message = ChatMessage(
        booking_id=booking_id,
        sender_id=current_user.id,
        recipient_id=recipient_id,
        content=msg_in.content,
        image_url=msg_in.image_url,
        is_read=False,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    # Send in-app notification to recipient
    from app.services.notification_service import create_notification
    create_notification(
        db,
        user_id=recipient_id,
        title="New Chat Message",
        message=f"{current_user.full_name}: {msg_in.content[:50]}...",
        notification_type="chat_message",
        related_booking_id=booking_id,
    )

    return message
