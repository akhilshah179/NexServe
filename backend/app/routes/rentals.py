"""
Rental Marketplace API Endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.rental import (
    RentalCategoryResponse,
    RentalItemCreate,
    RentalItemUpdate,
    RentalItemResponse,
    RentalAvailabilityCheckRequest,
    RentalAvailabilityCheckResponse,
    RentalPriceCalculateRequest,
    RentalPriceCalculateResponse,
    RentalBookingCreate,
    RentalBookingResponse,
    RentalBookingStatusUpdate,
    RentalBookingCancelRequest,
    RentalReturnCreate,
    DamageClaimCreate,
    DamageClaimReviewRequest,
    DamageClaimResponse,
    RentalReviewCreate,
    RentalReviewResponse,
)
from app.services.rental_service import (
    get_all_rental_categories,
    get_rental_category_by_id,
    list_rental_items,
    get_rental_item_by_id,
    create_rental_item,
    update_rental_item,
    delete_rental_item,
    check_rental_item_availability,
    calculate_rental_price,
    create_rental_booking,
    get_user_rental_bookings,
    get_rental_booking_by_id,
    transition_rental_status,
    process_rental_return,
    create_damage_claim,
    review_damage_claim,
    create_rental_review,
    create_rental_item_review,
)
from app.routes.dependencies import get_current_user, get_optional_current_user, require_provider, require_admin
from app.models.user import User, UserRole
from app.models.rental import RentalBookingStatus, DamageClaim

router = APIRouter(
    prefix="/rentals",
    tags=["Rentals"],
)


# ── Category Endpoints ────────────────────────────────────
@router.get("/categories", response_model=List[RentalCategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """List all active rental marketplace categories."""
    return get_all_rental_categories(db)


@router.get("/categories/{category_id}", response_model=RentalCategoryResponse)
def get_single_category(category_id: int, db: Session = Depends(get_db)):
    """Get single rental category with item count."""
    return get_rental_category_by_id(db, category_id)


# ── Item Discovery Endpoints ──────────────────────────────
@router.get("/items", response_model=List[RentalItemResponse])
def search_rental_items(
    category_id: Optional[int] = Query(None),
    category_slug: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD availability filter"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD availability filter"),
    sort_by: Optional[str] = Query("popularity", enum=["popularity", "price_asc", "price_desc", "rating"]),
    db: Session = Depends(get_db),
):
    """Browse and filter active rental catalog items."""
    return list_rental_items(
        db,
        category_id=category_id,
        category_slug=category_slug,
        search=search,
        location=location,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
    )


@router.get("/items/my", response_model=List[RentalItemResponse])
def get_my_rental_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get rental items listed by the authenticated provider."""
    return list_rental_items(db, provider_id=current_user.id, include_inactive=True)


@router.get("/items/{item_id}", response_model=RentalItemResponse)
def get_single_rental_item(item_id: int, db: Session = Depends(get_db)):
    """Get complete details, images, and owner information for a rental item."""
    return get_rental_item_by_id(db, item_id)


# ── Provider Item Management ──────────────────────────────
@router.post("/items", response_model=RentalItemResponse, status_code=status.HTTP_200_OK)
def create_new_rental_item(
    item_in: RentalItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new physical item listing for rent (Provider/Admin)."""
    return create_rental_item(db, provider_id=current_user.id, item_in=item_in)


@router.put("/items/{item_id}", response_model=RentalItemResponse)
def update_existing_rental_item(
    item_id: int,
    update_in: RentalItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing rental listing."""
    return update_rental_item(db, item_id=item_id, provider_user=current_user, update_in=update_in)


@router.delete("/items/{item_id}")
def delete_or_deactivate_rental_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a rental listing."""
    return delete_rental_item(db, item_id=item_id, provider_user=current_user)


# ── Availability & Pricing ────────────────────────────────
@router.post("/items/{item_id}/availability", response_model=RentalAvailabilityCheckResponse)
def check_item_availability_endpoint(
    item_id: int,
    check_in: RentalAvailabilityCheckRequest,
    db: Session = Depends(get_db),
):
    """Check whether a specific rental item is available for the given start and end dates."""
    is_avail, count, msg = check_rental_item_availability(
        db,
        rental_item_id=item_id,
        start_date=check_in.start_date,
        end_date=check_in.end_date,
        quantity=check_in.quantity or 1,
    )
    return RentalAvailabilityCheckResponse(
        is_available=is_avail,
        rental_item_id=item_id,
        start_date=check_in.start_date,
        end_date=check_in.end_date,
        conflicting_bookings_count=count,
        message=msg,
    )


@router.post("/availability", response_model=RentalAvailabilityCheckResponse)
def check_availability(
    check_in: RentalAvailabilityCheckRequest,
    db: Session = Depends(get_db),
):
    """Check whether a rental item is available for the given start and end dates."""
    if not check_in.rental_item_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="rental_item_id is required.")
    is_avail, count, msg = check_rental_item_availability(
        db,
        rental_item_id=check_in.rental_item_id,
        start_date=check_in.start_date,
        end_date=check_in.end_date,
        quantity=check_in.quantity or 1,
    )
    return RentalAvailabilityCheckResponse(
        is_available=is_avail,
        rental_item_id=check_in.rental_item_id,
        start_date=check_in.start_date,
        end_date=check_in.end_date,
        conflicting_bookings_count=count,
        message=msg,
    )


@router.post("/items/{item_id}/calculate-price", response_model=RentalPriceCalculateResponse)
def get_item_rental_pricing(
    item_id: int,
    price_in: RentalPriceCalculateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Calculate rental cost breakdown for a specific item."""
    price_in.rental_item_id = item_id
    return calculate_rental_price(db, price_in, current_user=current_user)


@router.post("/calculate-price", response_model=RentalPriceCalculateResponse)
def get_rental_pricing(
    price_in: RentalPriceCalculateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Calculate rental cost breakdown with delivery and separate security deposit."""
    return calculate_rental_price(db, price_in, current_user=current_user)


# ── Booking Endpoints ─────────────────────────────────────
@router.post("/bookings", response_model=RentalBookingResponse, status_code=status.HTTP_200_OK)
def book_rental_item(
    booking_in: RentalBookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new date-range rental booking."""
    return create_rental_booking(db, customer_id=current_user.id, booking_in=booking_in)


@router.get("/bookings/my", response_model=List[RentalBookingResponse])
def list_my_rental_bookings(
    status_filter: Optional[RentalBookingStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List rental bookings for current customer, provider, or admin."""
    return get_user_rental_bookings(db, current_user=current_user, status_filter=status_filter)


@router.get("/bookings/me", response_model=List[RentalBookingResponse])
def list_me_rental_bookings(
    status_filter: Optional[RentalBookingStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List rental bookings for current authenticated customer."""
    return get_user_rental_bookings(db, current_user=current_user, status_filter=status_filter)


@router.get("/bookings/provider", response_model=List[RentalBookingResponse])
def list_provider_rental_bookings(
    status_filter: Optional[RentalBookingStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_provider),
):
    """List rental bookings for authenticated provider."""
    return get_user_rental_bookings(db, current_user=current_user, status_filter=status_filter)


@router.get("/bookings/{booking_id}", response_model=RentalBookingResponse)
def get_single_rental_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single rental booking with audit trail, deposit record, and return status."""
    return get_rental_booking_by_id(db, booking_id=booking_id, current_user=current_user)


# ── Status Updates & Lifecycle Actions ────────────────────
@router.patch("/bookings/{booking_id}/status", response_model=RentalBookingResponse)
def patch_rental_status(
    booking_id: int,
    status_in: RentalBookingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transition rental booking status."""
    return transition_rental_status(
        db,
        booking_id=booking_id,
        current_user=current_user,
        target_status=status_in.status,
        notes=status_in.notes,
        cancellation_reason=status_in.cancellation_reason,
    )


@router.post("/bookings/{booking_id}/confirm", response_model=RentalBookingResponse)
def confirm_rental(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provider approves/confirms the rental booking request."""
    return transition_rental_status(db, booking_id, current_user, RentalBookingStatus.CONFIRMED, notes="Provider approved rental request.")


@router.post("/bookings/{booking_id}/ready", response_model=RentalBookingResponse)
def mark_rental_ready(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provider marks item as ready for pickup or dispatch."""
    booking = get_rental_booking_by_id(db, booking_id, current_user)
    target = (
        RentalBookingStatus.READY_FOR_DELIVERY
        if booking.fulfillment_type == "delivery"
        else RentalBookingStatus.READY_FOR_PICKUP
    )
    return transition_rental_status(db, booking_id, current_user, target, notes="Item prepared and ready for handover.")


@router.post("/bookings/{booking_id}/handover", response_model=RentalBookingResponse)
def mark_rental_handed_over(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provider marks item handed over to customer (Status -> RENTED)."""
    return transition_rental_status(db, booking_id, current_user, RentalBookingStatus.RENTED, notes="Item handed over to customer.")


@router.post("/bookings/{booking_id}/request-return", response_model=RentalBookingResponse)
def request_rental_return(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Customer initiates return at the end of the rental period."""
    return transition_rental_status(db, booking_id, current_user, RentalBookingStatus.RETURN_PENDING, notes="Customer initiated return.")


@router.post("/bookings/{booking_id}/return", response_model=RentalBookingResponse)
def return_and_inspect_rental(
    booking_id: int,
    return_in: RentalReturnCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provider/Admin records return inspection (Triggers deposit refund if undamaged)."""
    return process_rental_return(db, booking_id=booking_id, inspector_user=current_user, return_in=return_in)


@router.post("/bookings/{booking_id}/damage-claim", response_model=DamageClaimResponse)
def file_damage_claim(
    booking_id: int,
    claim_in: DamageClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provider files a damage claim for an item returned with damages."""
    return create_damage_claim(db, booking_id=booking_id, provider_user=current_user, claim_in=claim_in)


@router.post("/bookings/{booking_id}/cancel", response_model=RentalBookingResponse)
def cancel_rental(
    booking_id: int,
    cancel_in: RentalBookingCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel rental booking with mandatory reason."""
    return transition_rental_status(
        db,
        booking_id,
        current_user,
        RentalBookingStatus.CANCELLED,
        cancellation_reason=cancel_in.cancellation_reason,
    )


# ── Reviews Endpoints ─────────────────────────────────────
@router.post("/items/{item_id}/reviews", response_model=RentalReviewResponse)
def review_rental_item_directly(
    item_id: int,
    review_in: RentalReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Customer submits review directly for a rental item."""
    return create_rental_item_review(db, rental_item_id=item_id, customer_user=current_user, review_in=review_in)


@router.post("/bookings/{booking_id}/review", response_model=RentalReviewResponse)
def review_rental_booking(
    booking_id: int,
    review_in: RentalReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Customer submits review for completed rental."""
    return create_rental_review(db, booking_id=booking_id, customer_user=current_user, review_in=review_in)


# ── Damage Claims & Governance ────────────────────────────
@router.get("/damage-claims", response_model=List[DamageClaimResponse])
def list_damage_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List damage claims (Admin lists all, Provider lists theirs, Customer lists theirs)."""
    query = db.query(DamageClaim)
    if current_user.role == UserRole.PROVIDER:
        query = query.filter(DamageClaim.provider_id == current_user.id)
    elif current_user.role == UserRole.CUSTOMER:
        query = query.filter(DamageClaim.customer_id == current_user.id)
    return query.order_by(DamageClaim.created_at.desc()).all()


@router.patch("/damage-claims/{claim_id}", response_model=DamageClaimResponse)
def patch_damage_claim_review(
    claim_id: int,
    review_in: DamageClaimReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin resolves damage claim and approves deposit deduction / refund."""
    return review_damage_claim(db, claim_id=claim_id, admin_user=current_user, review_in=review_in)


@router.post("/admin/damage-claims/{claim_id}/resolve", response_model=DamageClaimResponse)
def resolve_claim(
    claim_id: int,
    review_in: DamageClaimReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin resolves damage claim and approves deposit deduction / refund."""
    return review_damage_claim(db, claim_id=claim_id, admin_user=current_user, review_in=review_in)
