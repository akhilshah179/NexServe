"""
Categories & Services API Endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.service import CategoryCreate, CategoryResponse, ServiceCreate, ServiceResponse
from app.schemas.user import UserResponse
from app.services.service_service import (
    get_categories,
    create_category,
    get_services,
    get_service_by_id,
    create_service,
)
from app.routes.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.models.service import Service, Category

router = APIRouter(
    prefix="",
    tags=["Categories & Services"],
)


# ── Categories ───────────────────────────────────────────
@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """List all service categories."""
    return get_categories(db)


@router.get("/categories/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    """Get a single category by ID."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def add_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
):
    """Create a new service category (Admin only)."""
    return create_category(db, category_in)


# ── Services ─────────────────────────────────────────────
@router.get("/services", response_model=List[ServiceResponse])
def list_services(
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    provider_id: Optional[int] = Query(None, description="Filter by provider ID"),
    search: Optional[str] = Query(None, description="Search term for title/description"),
    db: Session = Depends(get_db),
):
    """Search and list active services."""
    return get_services(db, category_id=category_id, provider_id=provider_id, search=search)


@router.get("/services/{service_id}", response_model=ServiceResponse)
def get_service(service_id: int, db: Session = Depends(get_db)):
    """Get service details by ID."""
    return get_service_by_id(db, service_id)


@router.post("/services", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def add_service(
    service_in: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PROVIDER, UserRole.ADMIN])),
):
    """Create a new service offering (Provider or Admin)."""
    return create_service(db, service_in, provider_id=current_user.id)


# ── Providers by Category ────────────────────────────────
@router.get("/categories/{category_id}/providers", response_model=List[UserResponse])
def list_providers_by_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    """List all providers who offer services in a specific category."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Find unique providers who have active services in this category
    providers = (
        db.query(User)
        .join(Service, Service.provider_id == User.id)
        .filter(
            Service.category_id == category_id,
            Service.is_active == True,
            User.role == UserRole.PROVIDER,
            User.is_active == True,
        )
        .distinct()
        .all()
    )
    return providers
