"""
Category & Service Pydantic Schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserResponse


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceCreate(BaseModel):
    title: str
    description: str
    price: float
    duration_minutes: int = 60
    category_id: int


class ServiceResponse(BaseModel):
    id: int
    title: str
    description: str
    price: float
    duration_minutes: int
    category_id: int
    provider_id: int
    is_active: bool
    rating: float
    review_count: int
    created_at: datetime
    category: Optional[CategoryResponse] = None
    provider: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class CategoryWithServicesResponse(CategoryResponse):
    services: list[ServiceResponse] = []

