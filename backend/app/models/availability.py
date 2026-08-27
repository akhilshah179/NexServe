"""
Availability Model for Provider Schedules and Blocked Dates.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Availability(Base):
    __tablename__ = "availabilities"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=True)  # 0=Monday, 6=Sunday
    start_time = Column(String, nullable=False, default="09:00")
    end_time = Column(String, nullable=False, default="18:00")
    is_available = Column(Boolean, default=True, nullable=False)
    break_start = Column(String, nullable=True, default="13:00")
    break_end = Column(String, nullable=True, default="14:00")
    blocked_date = Column(String, nullable=True, index=True)  # YYYY-MM-DD format for specific blocked days
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    provider = relationship("User", backref="availabilities")
