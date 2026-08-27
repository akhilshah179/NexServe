"""
Customer Address Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AddressCreate(BaseModel):
    label: str = "Home"
    full_address: str
    city: str = "Bengaluru"
    postal_code: str = "560001"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool = False


class AddressUpdate(BaseModel):
    label: Optional[str] = None
    full_address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: Optional[bool] = None


class AddressResponse(BaseModel):
    id: int
    user_id: int
    label: str
    full_address: str
    city: str
    postal_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
