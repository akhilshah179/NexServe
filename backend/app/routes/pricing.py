"""
Dynamic Pricing API Endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.routes.dependencies import get_optional_current_user
from app.schemas.pricing import PricingCalculateRequest, PricingCalculateResponse
from app.services.pricing_service import calculate_dynamic_price

router = APIRouter(
    prefix="/pricing",
    tags=["Pricing Engine"],
)


@router.post("/calculate", response_model=PricingCalculateResponse)
def calculate_price(
    request: PricingCalculateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Calculate dynamic service pricing with transparent breakdown.
    Includes base price, duration scope, peak surcharge, emergency fee, distance, coupon, and referral credits.
    """
    return calculate_dynamic_price(db, request, current_user=current_user)
