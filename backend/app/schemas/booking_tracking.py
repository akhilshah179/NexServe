"""
Booking Tracking, Status History, and Attachments Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class BookingStatusHistoryResponse(BaseModel):
    id: int
    booking_id: int
    from_status: Optional[str] = None
    to_status: str
    changed_by_id: Optional[int] = None
    changed_by_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookingAttachmentResponse(BaseModel):
    id: int
    booking_id: Optional[int] = None
    file_url: str
    file_name: str
    file_size: int
    mime_type: str
    uploaded_by_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookingAttachmentUploadResponse(BaseModel):
    attachments: List[BookingAttachmentResponse] = []
