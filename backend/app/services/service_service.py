"""
Service & Category Business Logic.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.service import Category, Service
from app.schemas.service import CategoryCreate, ServiceCreate


from sqlalchemy.orm import selectinload

def get_categories(db: Session, include_services: bool = False) -> List[Category]:
    """List all categories, optionally with their services eagerly loaded."""
    if include_services:
        return db.query(Category).options(selectinload(Category.services).selectinload(Service.provider)).all()
    return db.query(Category).all()



def create_category(db: Session, category_in: CategoryCreate) -> Category:
    """Create a new service category."""
    existing = db.query(Category).filter(Category.name.ilike(category_in.name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists.",
        )
    category = Category(
        name=category_in.name,
        description=category_in.description,
        icon_url=category_in.icon_url,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def get_services(
    db: Session,
    category_id: Optional[int] = None,
    provider_id: Optional[int] = None,
    search: Optional[str] = None,
) -> List[Service]:
    """Retrieve services with optional filtering."""
    query = db.query(Service).filter(Service.is_active == True)
    if category_id:
        query = query.filter(Service.category_id == category_id)
    if provider_id:
        query = query.filter(Service.provider_id == provider_id)
    if search:
        query = query.filter(
            Service.title.ilike(f"%{search}%") | Service.description.ilike(f"%{search}%")
        )
    return query.all()


def get_service_by_id(db: Session, service_id: int) -> Service:
    """Retrieve a single service by ID or raise HTTP 404."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )
    return service


def create_service(db: Session, service_in: ServiceCreate, provider_id: int) -> Service:
    """Create a new service offered by a provider."""
    category = db.query(Category).filter(Category.id == service_in.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specified Category not found",
        )
    service = Service(
        title=service_in.title,
        description=service_in.description,
        price=service_in.price,
        duration_minutes=service_in.duration_minutes,
        category_id=service_in.category_id,
        provider_id=provider_id,
        is_active=True,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service
