"""
Admin Dashboard API Endpoints — Approvals, Audit Logs, Moderation, and Analytics.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.routes.dependencies import require_admin
from app.models.user import User, UserRole, VerificationStatus
from app.models.service import Service, Category
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus
from app.models.review import Review
from app.models.contact import ContactMessage
from app.models.audit_log import AuditLog
from app.schemas.user import UserResponse, ProviderVerificationAction
from app.schemas.booking import BookingResponse
from app.schemas.review import ReviewResponse
from app.schemas.service import CategoryCreate, CategoryResponse
from app.schemas.contact import ContactResponse
from app.schemas.audit_log import AuditLogResponse
from app.services.provider_service import verify_provider

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


def log_admin_action(
    db: Session,
    admin_id: int,
    action: str,
    target_type: str,
    target_id: Optional[int] = None,
    details: Optional[str] = None,
) -> AuditLog:
    """Helper to record audit logs for admin actions."""
    audit = AuditLog(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(audit)
    db.commit()
    return audit


class AdminStats(BaseModel):
    total_users: int
    total_providers: int
    pending_providers: int
    total_customers: int
    total_services: int
    total_categories: int
    total_bookings: int
    pending_bookings: int
    completed_bookings: int
    total_revenue: float
    total_commission_paise: int
    avg_platform_rating: float
    active_locations_count: int
    total_messages: int
    unread_messages: int


class RoleUpdate(BaseModel):
    role: UserRole


class UserStatusUpdate(BaseModel):
    is_active: bool


@router.get("/stats", response_model=AdminStats)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get platform-wide statistics and metrics for admin dashboard."""
    total_users = db.query(User).count()
    total_providers = db.query(User).filter(User.role == UserRole.PROVIDER).count()
    pending_providers = db.query(User).filter(
        User.role == UserRole.PROVIDER,
        User.verification_status == VerificationStatus.PENDING,
    ).count()
    total_customers = db.query(User).filter(User.role == UserRole.CUSTOMER).count()
    total_services = db.query(Service).count()
    total_categories = db.query(Category).count()
    total_bookings = db.query(Booking).count()
    pending_bookings = db.query(Booking).filter(Booking.status == BookingStatus.PENDING).count()
    completed_bookings = db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED).count()

    total_revenue = db.query(func.coalesce(func.sum(Booking.total_amount), 0)).filter(
        Booking.status == BookingStatus.COMPLETED
    ).scalar()

    total_commission = db.query(func.coalesce(func.sum(Payment.platform_commission_paise), 0)).filter(
        Payment.status.in_([PaymentStatus.VERIFIED, PaymentStatus.CAPTURED])
    ).scalar()

    avg_rating = db.query(func.coalesce(func.avg(Review.rating), 4.8)).scalar()

    locations_count = db.query(func.count(func.distinct(User.location))).filter(User.location.isnot(None)).scalar()

    total_messages = db.query(ContactMessage).count()
    unread_messages = db.query(ContactMessage).filter(ContactMessage.is_read == False).count()

    return AdminStats(
        total_users=total_users,
        total_providers=total_providers,
        pending_providers=pending_providers,
        total_customers=total_customers,
        total_services=total_services,
        total_categories=total_categories,
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        completed_bookings=completed_bookings,
        total_revenue=float(total_revenue),
        total_commission_paise=int(total_commission),
        avg_platform_rating=round(float(avg_rating), 1),
        active_locations_count=int(locations_count or 0),
        total_messages=total_messages,
        unread_messages=unread_messages,
    )


@router.get("/providers/pending", response_model=List[UserResponse])
def list_pending_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List provider applications waiting for admin approval."""
    return (
        db.query(User)
        .filter(User.role == UserRole.PROVIDER, User.verification_status == VerificationStatus.PENDING)
        .order_by(User.created_at.desc())
        .all()
    )


@router.post("/providers/{provider_id}/approve", response_model=UserResponse)
def approve_provider_account(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Approve a provider application."""
    user = verify_provider(db, provider_id, ProviderVerificationAction(status=VerificationStatus.APPROVED))
    log_admin_action(db, current_user.id, "approve_provider", "provider", provider_id, f"Approved provider {user.full_name} ({user.email})")
    return user


@router.post("/providers/{provider_id}/reject", response_model=UserResponse)
def reject_provider_account(
    provider_id: int,
    action: ProviderVerificationAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Reject a provider application with explanation."""
    action.status = VerificationStatus.REJECTED
    user = verify_provider(db, provider_id, action)
    log_admin_action(db, current_user.id, "reject_provider", "provider", provider_id, f"Rejected provider {user.full_name}: {action.rejection_reason}")
    return user


@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    role: Optional[UserRole] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all platform users with optional role & search filters."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        s = f"%{search}%"
        query = query.filter((User.full_name.ilike(s)) | (User.email.ilike(s)) | (User.location.ilike(s)))
    return query.order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/status", response_model=UserResponse)
def toggle_user_active_status(
    user_id: int,
    status_update: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Activate or deactivate a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own admin account.")

    user.is_active = status_update.is_active
    db.commit()
    db.refresh(user)

    action_name = "activate_user" if user.is_active else "deactivate_user"
    log_admin_action(db, current_user.id, action_name, "user", user.id, f"Changed is_active to {user.is_active}")
    return user


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def moderate_delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete an inappropriate review (Moderation tool)."""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")

    provider_id = review.booking.provider_id
    db.delete(review)
    db.commit()

    # Recalculate provider rating
    from app.services.review_service import recalculate_provider_rating
    recalculate_provider_rating(db, provider_id)

    log_admin_action(db, current_user.id, "delete_review", "review", review_id, f"Deleted review #{review_id}")
    return None


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new service category."""
    existing = db.query(Category).filter(Category.name.ilike(cat_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists.")

    cat = Category(name=cat_in.name, description=cat_in.description, icon_url=cat_in.icon_url)
    db.add(cat)
    db.commit()
    db.refresh(cat)

    log_admin_action(db, current_user.id, "create_category", "category", cat.id, f"Created category {cat.name}")
    return cat


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Retrieve audit logs for all administrative actions."""
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()


@router.get("/bookings", response_model=List[BookingResponse])
def list_all_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all bookings (Admin only)."""
    return db.query(Booking).order_by(Booking.created_at.desc()).all()


@router.get("/messages", response_model=List[ContactResponse])
def list_all_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all contact messages (Admin only)."""
    return db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).all()
