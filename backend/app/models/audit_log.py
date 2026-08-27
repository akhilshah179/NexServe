"""
Admin Audit Log Model.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String, nullable=False, index=True)  # approve_provider, reject_provider, update_user, cancel_booking, etc.
    target_type = Column(String, nullable=False)  # provider, user, booking, payment, review
    target_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    admin = relationship("User", foreign_keys=[admin_id])
