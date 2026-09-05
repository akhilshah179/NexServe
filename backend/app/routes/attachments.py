"""
Booking Attachments & Customer Photo Upload API Endpoints.
"""

import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.booking_tracking import BookingAttachment
from app.routes.dependencies import get_current_user
from app.schemas.booking_tracking import (
    BookingAttachmentResponse,
    BookingAttachmentUploadResponse,
)

router = APIRouter(
    prefix="/attachments",
    tags=["Booking Attachments"],
)

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "bookings")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/upload", response_model=BookingAttachmentUploadResponse)
async def upload_booking_photos(
    files: List[UploadFile] = File(...),
    booking_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload photos before or after booking (e.g. AC issue, plumbing leakage, room area).
    Validates file formats, file sizes, and generates secure stored URLs.
    """
    if len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 photos allowed per upload batch.",
        )

    saved_attachments: List[BookingAttachment] = []

    for file in files:
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type '{file.content_type}'. Only JPEG, PNG, and WebP are allowed.",
            )

        # Generate secure random filename
        ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        destination_path = os.path.join(UPLOAD_DIR, unique_name)

        # Read content and check size
        content = await file.read()
        file_size = len(content)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{file.filename}' exceeds maximum allowed size of 5MB.",
            )

        with open(destination_path, "wb") as f:
            f.write(content)

        file_url = f"/uploads/bookings/{unique_name}"

        attachment = BookingAttachment(
            booking_id=booking_id,
            file_url=file_url,
            file_name=file.filename or unique_name,
            file_size=file_size,
            mime_type=file.content_type or "image/jpeg",
            uploaded_by_id=current_user.id,
        )
        db.add(attachment)
        saved_attachments.append(attachment)

    db.commit()
    for a in saved_attachments:
        db.refresh(a)

    return BookingAttachmentUploadResponse(
        attachments=[BookingAttachmentResponse.model_validate(a) for a in saved_attachments]
    )
