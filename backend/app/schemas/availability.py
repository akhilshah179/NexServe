"""
Pydantic Schemas for Provider Availability & Slot Generation.
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class AvailabilityBase(BaseModel):
    day_of_week: Optional[int] = None  # 0=Monday, 6=Sunday
    start_time: str = "09:00"
    end_time: str = "18:00"
    is_available: bool = True
    break_start: Optional[str] = "13:00"
    break_end: Optional[str] = "14:00"
    blocked_date: Optional[str] = None


class AvailabilityCreate(AvailabilityBase):
    pass


class AvailabilityResponse(AvailabilityBase):
    id: int
    provider_id: int

    model_config = ConfigDict(from_attributes=True)


class BlockDateRequest(BaseModel):
    date: str  # YYYY-MM-DD


class TimeSlot(BaseModel):
    time: str  # e.g., "10:00 AM"
    available: bool
    reason: Optional[str] = None
