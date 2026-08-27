"""
Notifications API Endpoints — Notification Center & Read Status.
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.routes.dependencies import get_current_user
from app.services.notification_service import (
    get_user_notifications,
    get_unread_count,
    mark_notification_read,
    mark_all_notifications_read,
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all notifications for authenticated user."""
    return get_user_notifications(db, current_user.id)


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_notification_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get unread notification count for badge."""
    return {"unread_count": get_unread_count(db, current_user.id)}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark single notification as read."""
    return mark_notification_read(db, notification_id, current_user.id)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all user notifications as read."""
    mark_all_notifications_read(db, current_user.id)
    return None
