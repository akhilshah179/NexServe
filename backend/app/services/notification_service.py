"""
Notification Service — In-app notifications & pluggable Email/SMS/WhatsApp dispatchers.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.notification import Notification
from app.models.user import User
from app.core.config import settings


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    related_booking_id: Optional[int] = None,
) -> Notification:
    """
    Creates an in-app notification record and dispatches external channels
    (Email, SMS, WhatsApp) if enabled via server environment variables.
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        is_read=False,
        related_booking_id=related_booking_id,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    # Pluggable channel dispatchers
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        _dispatch_external_channels(user, title, message)

    return notification


def _dispatch_external_channels(user: User, title: str, message: str) -> None:
    """Dispatches external notifications if environment flags are active."""
    # Email dispatch interface
    if getattr(settings, "ENABLE_EMAIL_NOTIFICATIONS", False):
        print(f"[NOTIFICATION EMAIL] To: {user.email} | Subject: {title} | Body: {message}")

    # SMS dispatch interface
    if getattr(settings, "ENABLE_SMS_NOTIFICATIONS", False) and user.phone_number:
        print(f"[NOTIFICATION SMS] To: {user.phone_number} | Text: {title}: {message}")

    # WhatsApp dispatch interface
    if getattr(settings, "ENABLE_WHATSAPP_NOTIFICATIONS", False) and user.phone_number:
        print(f"[NOTIFICATION WHATSAPP] To: {user.phone_number} | Msg: {title} - {message}")


def get_user_notifications(db: Session, user_id: int) -> List[Notification]:
    """Retrieve all notifications for user ordered by newest first."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


def get_unread_count(db: Session, user_id: int) -> int:
    """Get count of unread notifications for badge."""
    return db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).count()


def mark_notification_read(db: Session, notification_id: int, user_id: int) -> Notification:
    """Mark single notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


def mark_all_notifications_read(db: Session, user_id: int) -> None:
    """Mark all notifications as read for user."""
    db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()
