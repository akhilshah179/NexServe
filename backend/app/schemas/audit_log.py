"""
Audit Log Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserResponse


class AuditLogResponse(BaseModel):
    id: int
    admin_id: Optional[int] = None
    action: str
    target_type: str
    target_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime
    admin: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
