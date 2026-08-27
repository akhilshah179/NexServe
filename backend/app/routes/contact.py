"""
Contact Form API Endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.contact import ContactCreate, ContactResponse
from app.models.contact import ContactMessage
from app.routes.dependencies import require_role
from app.models.user import User, UserRole

router = APIRouter(
    prefix="/contact",
    tags=["Contact"],
)


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def submit_contact_message(
    contact_in: ContactCreate,
    db: Session = Depends(get_db),
):
    """Submit a contact form message (public endpoint)."""
    message = ContactMessage(
        name=contact_in.name,
        email=contact_in.email,
        subject=contact_in.subject,
        message=contact_in.message,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("", response_model=List[ContactResponse])
def list_contact_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """List all contact messages (Admin only)."""
    return db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()


@router.patch("/{message_id}/read", response_model=ContactResponse)
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Mark a contact message as read (Admin only)."""
    message = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not message:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Message not found")
    message.is_read = True
    db.commit()
    db.refresh(message)
    return message
